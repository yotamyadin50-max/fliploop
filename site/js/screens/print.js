// Print preview (plan 4, Rulings 2 and 3): Download PDF (primary, in-house writer), Print
// (window.print + @page), Download PNG (300 dpi, one file per sheet, plus per-sheet buttons).
import { h, clear } from "../lib/dom.js";
import { t, tp } from "../lib/i18n.js";
import { downloadBlob, safeFileName, canvasToBlob, sleep, yieldToMain } from "../lib/util.js";
import { iconEl } from "../ui/icons.js";
import { toast } from "../ui/toast.js";
import { Doc } from "../editor/doc.js";
import { cardList, sheetCount, PAPERS } from "../print/geometry.js";
import { renderSheet, canvasRgb, deflate, hasCompressionStream } from "../print/render.js";
import { buildPdf } from "../pdf/writer.js";
import { getSettings, updateSettings } from "../store/settings.js";
import { screenHeader } from "./common.js";

const PREVIEW_DPI = 72;

export class PrintScreen {
  constructor(section, router) {
    this.section = section;
    this.router = router;
    this.urls = [];
  }

  async mount({ id }) {
    this.id = id;
    this.router.setTitle(t("meta.title.print"));
    clear(this.section);
    this.section.append(this.topbar(null), h("p", { class: "muted pad" }, t("common.loading")));
    const doc = await Doc.load(id).catch(() => null);
    if (this.disposed) return;
    if (!doc) return this.renderNotFound();
    this.doc = doc;
    this.paper = getSettings().printPaper === "Letter" ? "Letter" : "A4";
    this.pingpong = false;
    await document.fonts?.ready;
    this.render();
  }

  unmount() {
    this.disposed = true;
    this.urls.forEach((u) => URL.revokeObjectURL(u));
    document.getElementById("print-page-style")?.remove();
    document.getElementById("print-root")?.remove();
  }

  // Same Global Element header as Lessons/Challenge/Gallery/Settings: labelled Back + wordmark.
  topbar(doc) {
    return doc
      ? screenHeader(`#/editor/${this.id}`, "common.back.editor", "common.back.editor.aria", { title: doc.project.title })
      : screenHeader(`#/editor/${this.id}`, "common.back.editor", "common.back.editor");
  }

  renderNotFound() {
    clear(this.section);
    this.router.setTitle(t("meta.title.notFound"));
    // The project is missing, so Back must not lead to another not-found Editor.
    this.section.append(screenHeader("#/gallery", "common.back.gallery", "common.back.gallery.aria"), h("div", { class: "not-found" }, h("div", { class: "card card--center" },
      h("h1", { class: "h2" }, t("notFound.title")), h("p", {}, t("notFound.body")),
      h("div", { class: "row-actions" },
        h("a", { class: "btn btn--secondary", href: "#/gallery" }, t("notFound.gallery")),
        h("a", { class: "btn btn--primary", href: "#/new" }, iconEl("pencil"), t("notFound.new"))))));
  }

  get cards() {
    return cardList(this.doc.frames.map((f) => f.hold), { pingpongReturn: this.pingpong && this.doc.project.playMode === "pingpong" });
  }

  sheetArgs(sheet, dpi, forScreen = false) {
    const cards = this.cards;
    return { frames: this.doc.frames, cards, sheet, sheetTotal: sheetCount(cards.length), paperId: this.paper, dpi, title: this.doc.project.title, forScreen };
  }

  render() {
    const doc = this.doc;
    clear(this.section);
    const paperGroup = h("div", { class: "segmented", role: "radiogroup", "aria-label": t("print.paper.label") },
      ...["A4", "Letter"].map((p) => h("button", { class: "segmented__btn", type: "button", role: "radio", "aria-checked": String(this.paper === p),
        onclick: () => { this.paper = p; updateSettings({ printPaper: p }); this.render(); } }, t(p === "A4" ? "print.paper.a4" : "print.paper.letter"))));
    const options = h("section", { class: "card print-options", "aria-labelledby": "print-opts" },
      h("h2", { id: "print-opts", class: "h3" }, t("print.options.h2")),
      h("div", { class: "field" }, h("span", { class: "field__label" }, t("print.paper.label")), paperGroup),
      doc.project.playMode === "pingpong"
        ? h("label", { class: "check" }, h("input", { type: "checkbox", checked: this.pingpong, onchange: (e) => { this.pingpong = e.target.checked; this.render(); } }), h("span", {}, t("print.pingpong")))
        : null,
      h("p", { class: "print-summary num-mix" }, this.summaryText()),
      doc.frames.some((f) => f.hold > 1) ? h("p", { class: "muted small" }, t("print.holdNote")) : null);

    this.pdfBtn = h("button", { class: "btn btn--primary", type: "button", onclick: () => this.downloadPdf() }, iconEl("download"), t("print.action.pdf"));
    const actions = h("div", { class: "print-actions" },
      this.pdfBtn,
      h("div", { class: "print-actions__item" },
        h("button", { class: "btn btn--secondary", type: "button", onclick: () => this.print() }, iconEl("print"), t("print.action.print")),
        h("p", { class: "muted small" }, t("print.dialogTip"))),
      h("div", { class: "print-actions__item" },
        h("button", { class: "btn btn--secondary", type: "button", onclick: () => this.downloadAllPng() }, iconEl("download"), t("print.action.png")),
        h("p", { class: "muted small" }, t("print.multiDownloadTip"))));
    this.status = h("p", { class: "muted print-status", role: "status" });
    this.previews = h("div", { class: "sheets" });
    this.section.append(
      this.topbar(doc),
      h("div", { class: "page print-page" },
        h("h1", { class: "screen-h1" }, t("print.h1")),
        options, actions, this.status,
        h("section", { "aria-labelledby": "print-prev" },
          h("h2", { id: "print-prev", class: "h3" }, t("print.preview.h2")),
          h("div", { class: "legend muted small" },
            h("span", { class: "legend__staple" }, t("print.legend.staple")),
            h("span", { class: "legend__cut" }, t("print.legend.cut"))),
          this.previews)));
    this.renderPreviews();
  }

  summaryText() {
    const n = this.cards.length;
    const sheets = sheetCount(n);
    return t("print.summary", { cardsText: tp("print.summary.cards", n, { cards: n }), sheetsText: tp("print.summary.sheets", sheets, { sheets }) });
  }

  async renderPreviews() {
    const token = (this.renderToken = Symbol("render"));
    this.urls.forEach((u) => URL.revokeObjectURL(u));
    this.urls = [];
    const total = sheetCount(this.cards.length);
    for (let s = 0; s < total; s++) {
      if (this.renderToken !== token || this.disposed) return;
      this.status.textContent = t("print.preparing", { n: s + 1, total });
      const canvas = renderSheet(this.sheetArgs(s, PREVIEW_DPI, true));
      const url = URL.createObjectURL(await canvasToBlob(canvas));
      canvas.width = 0;
      this.urls.push(url);
      const onSheet = Math.min(8, this.cards.length - s * 8);
      const alt = t("print.preview.sheet.aria", { n: s + 1, total, cardsText: tp("print.summary.cards", onSheet, { cards: onSheet }) });
      this.previews.append(h("figure", { class: "sheet-preview" },
        h("img", { src: url, alt, class: `sheet-preview__img sheet-preview__img--${this.paper}` }),
        h("button", { class: "btn btn--secondary btn--compact", type: "button", "aria-label": t("print.action.pngSheet.aria", { n: s + 1 }), onclick: () => this.downloadPng(s) },
          iconEl("download", { size: 20 }), t("print.action.pngSheet", { n: s + 1 }))));
      await yieldToMain();
    }
    if (this.renderToken === token) this.status.textContent = "";
  }

  pngName(sheet) {
    return t("print.file.png", { title: safeFileName(this.doc.project.title), nn: String(sheet + 1).padStart(2, "0") });
  }

  async sheetPng(sheet) {
    const canvas = renderSheet(this.sheetArgs(sheet, 300));
    const blob = await canvasToBlob(canvas);
    canvas.width = 0;
    return blob;
  }

  async downloadPng(sheet) {
    try {
      downloadBlob(await this.sheetPng(sheet), this.pngName(sheet));
      toast(tp("print.done.png", 1, { sheets: 1 }));
    } catch (err) {
      console.error(err);
      toast(t("print.error.png"));
    }
  }

  async downloadAllPng() {
    const total = sheetCount(this.cards.length);
    try {
      for (let s = 0; s < total; s++) {
        this.status.textContent = t("print.preparing", { n: s + 1, total });
        downloadBlob(await this.sheetPng(s), this.pngName(s));
        await sleep(350);
      }
      this.status.textContent = "";
      toast(tp("print.done.png", total, { sheets: total }));
    } catch (err) {
      console.error(err);
      this.status.textContent = "";
      toast(t("print.error.png"));
    }
  }

  /** Builds the PDF bytes (also used by tests through the page). */
  async buildPdfBytes({ forceJpeg = false } = {}) {
    const total = sheetCount(this.cards.length);
    const paper = PAPERS[this.paper];
    const pages = [];
    const flate = hasCompressionStream() && !forceJpeg;
    for (let s = 0; s < total; s++) {
      this.status.textContent = t("print.preparing", { n: s + 1, total });
      const canvas = renderSheet(this.sheetArgs(s, 300));
      let image;
      if (flate) {
        image = { width: canvas.width, height: canvas.height, filter: "FlateDecode", data: await deflate(canvasRgb(canvas)) };
      } else {
        const jpg = await canvasToBlob(canvas, "image/jpeg", 0.92);
        image = { width: canvas.width, height: canvas.height, filter: "DCTDecode", data: new Uint8Array(await jpg.arrayBuffer()) };
      }
      canvas.width = 0;
      pages.push({ widthPt: paper.wPt, heightPt: paper.hPt, image });
      await yieldToMain();
    }
    this.status.textContent = "";
    return { bytes: buildPdf({ pages, title: t("print.pdf.metaTitle", { title: this.doc.project.title }) }), sheets: total };
  }

  async downloadPdf() {
    this.pdfBtn.disabled = true;
    try {
      const { bytes, sheets } = await this.buildPdfBytes();
      const blob = new Blob([bytes], { type: "application/pdf" });
      this.lastPdf = blob;
      downloadBlob(blob, t("print.file.pdf", { title: safeFileName(this.doc.project.title) }));
      toast(tp("print.done.pdf", sheets, { sheets }));
    } catch (err) {
      console.error(err);
      this.status.textContent = "";
      toast(t("print.error.pdf"));
    } finally {
      this.pdfBtn.disabled = false;
    }
  }

  /** window.print() with @page sized to the chosen paper (Ruling 3 margins). */
  async print() {
    const total = sheetCount(this.cards.length);
    const paper = PAPERS[this.paper];
    const size = this.paper === "A4" ? "A4" : "letter";
    let style = document.getElementById("print-page-style");
    if (!style) {
      style = document.createElement("style");
      style.id = "print-page-style";
      document.head.append(style);
    }
    style.textContent = `@page { size: ${size}; margin: ${paper.marginYMm}mm ${paper.marginXMm}mm; }
      .print-sheet { width: ${paper.wMm - 2 * paper.marginXMm}mm; height: ${paper.hMm - 2 * paper.marginYMm}mm; }
      .print-sheet img { left: -${paper.marginXMm}mm; top: -${paper.marginYMm}mm; width: ${paper.wMm}mm; height: ${paper.hMm}mm; }`;
    document.getElementById("print-root")?.remove();
    const root = h("div", { id: "print-root", "aria-hidden": "true" });
    for (let s = 0; s < total; s++) {
      this.status.textContent = t("print.preparing", { n: s + 1, total });
      const url = URL.createObjectURL(await this.sheetPng(s));
      this.urls.push(url);
      root.append(h("div", { class: "print-sheet" }, h("img", { src: url, alt: "" })));
    }
    this.status.textContent = "";
    document.body.append(root);
    await Promise.all([...root.querySelectorAll("img")].map((img) => img.decode().catch(() => {})));
    window.print();
  }
}
