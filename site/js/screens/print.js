// Print preview (plan 4, Rulings 2 and 3): Download PDF (primary, in-house writer), Print
// (window.print + @page), Download PNG (300 dpi, one file per sheet, plus per-sheet buttons),
// and Share PDF where the device can share files.
import { h, clear } from "../lib/dom.js";
import { t, tp } from "../lib/i18n.js";
import { downloadBlob, safeFileName, canvasToBlob, sleep, yieldToMain } from "../lib/util.js";
import { iconEl } from "../ui/icons.js";
import { toast } from "../ui/toast.js";
import { openSheet } from "../ui/dialog.js";
import { busyWhile } from "../lib/busy.js";
import { Doc } from "../editor/doc.js";
import { cardList, sheetCount, PAPERS } from "../print/geometry.js";
import { renderSheet, canvasRgb, deflate, hasCompressionStream } from "../print/render.js";
import { withPngDensity } from "../print/png-density.js";
import { buildPdf } from "../pdf/writer.js";
import { getSettings, updateSettings } from "../store/settings.js";
import { screenHeader } from "./common.js";

const PREVIEW_DPI = 72;
// "להדפיס" decodes every 300 dpi sheet at once (about 35 MB each). Above this many sheets it
// asks first and recommends the PDF, which is built page by page (R47).
const MANY_SHEETS = 16;

function canSharePdf() {
  if (typeof navigator.share !== "function" || typeof navigator.canShare !== "function") return false;
  try {
    return navigator.canShare({ files: [new File([new Uint8Array(1)], "flipbook.pdf", { type: "application/pdf" })] });
  } catch {
    return false;
  }
}

export class PrintScreen {
  constructor(section, router) {
    this.section = section;
    this.router = router;
    this.urls = [];
    this.working = false; // one export job at a time (EX-05)
  }

  async mount({ id }, view = null) {
    this.id = id;
    this.router.setTitle(t("meta.title.print"));
    clear(this.section);
    this.section.append(this.topbar(null), h("p", { class: "muted pad" }, t("common.loading")));
    const doc = await Doc.load(id).catch(() => null);
    if (this.disposed) return;
    if (!doc) return this.renderNotFound();
    this.doc = doc;
    this.paper = getSettings().printPaper === "Letter" ? "Letter" : "A4";
    this.pingpong = !!view?.pingpong && doc.project.playMode === "pingpong";
    await document.fonts?.ready;
    if (this.disposed) return; // left while the fonts were loading
    this.render();
  }

  /** Carried across an update reload (js/pwa.js): the one option that is not a saved setting. */
  viewState() {
    return { pingpong: !!this.pingpong };
  }

  unmount() {
    this.disposed = true;
    this.urls.forEach((u) => URL.revokeObjectURL(u));
    this.urls = [];
    this.lastPdf = null;
    this.shareFile = null;
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

  /** Builds the screen once. Changing an option updates it in place (refresh), so focus stays put. */
  render() {
    const doc = this.doc;
    clear(this.section);
    // Same pressed-button pattern as every other segmented control in the app.
    this.paperBtns = new Map(["A4", "Letter"].map((p) => [p, h("button", { class: "segmented__btn", type: "button", dataset: { option: "1" }, onclick: () => this.setPaper(p) },
      t(p === "A4" ? "print.paper.a4" : "print.paper.letter"))]));
    this.pingpongBox = doc.project.playMode === "pingpong"
      ? h("input", { type: "checkbox", checked: this.pingpong, dataset: { option: "1" }, onchange: (e) => this.setPingpong(e.target) })
      : null;
    this.summary = h("p", { class: "print-summary num-mix" });
    const options = h("section", { class: "card print-options", "aria-labelledby": "print-opts" },
      h("h2", { id: "print-opts", class: "h3" }, t("print.options.h2")),
      h("div", { class: "field" }, h("span", { class: "field__label" }, t("print.paper.label")),
        h("div", { class: "segmented", role: "group", "aria-label": t("print.paper.label") }, ...this.paperBtns.values())),
      this.pingpongBox ? h("label", { class: "check" }, this.pingpongBox, h("span", {}, t("print.pingpong"))) : null,
      this.summary,
      doc.frames.some((f) => f.hold > 1) ? h("p", { class: "muted small" }, t("print.holdNote")) : null);

    const job = (cls, icon, label, fn) => h("button", { class: `btn ${cls}`, type: "button", dataset: { job: "1" }, onclick: () => this.run(fn) }, iconEl(icon), label);
    this.pngTip = h("p", { class: "muted small" }, t("print.multiDownloadTip"));
    const actions = h("div", { class: "print-actions" },
      job("btn--primary", "download", t("print.action.pdf"), () => this.downloadPdf()),
      h("div", { class: "print-actions__item" },
        job("btn--secondary", "print", t("print.action.print"), () => this.print()),
        h("p", { class: "muted small" }, t("print.dialogTip"))),
      h("div", { class: "print-actions__item" },
        job("btn--secondary", "download", t("print.action.png"), () => this.downloadAllPng()),
        this.pngTip),
      canSharePdf() ? job("btn--secondary", "share", t("print.action.sharePdf"), () => this.sharePdf()) : null);
    this.status = h("p", { class: "muted print-status", role: "status" });
    this.previews = h("div", { class: "sheets" });
    this.section.append(
      this.topbar(doc),
      h("div", { class: "page print-page" },
        h("h1", { class: "screen-h1", tabindex: "-1" }, t("print.h1")),
        options, actions, this.status,
        h("section", { "aria-labelledby": "print-prev" },
          h("h2", { id: "print-prev", class: "h3" }, t("print.preview.h2")),
          h("div", { class: "legend muted small" },
            h("span", { class: "legend__staple" }, t("print.legend.staple")),
            h("span", { class: "legend__cut" }, t("print.legend.cut"))),
          this.previews)));
    this.refresh();
  }

  /** Everything that depends on the options: pressed state, summary, the tip, the previews. */
  refresh() {
    for (const [p, btn] of this.paperBtns) btn.setAttribute("aria-pressed", String(this.paper === p));
    const total = sheetCount(this.cards.length);
    this.summary.textContent = this.summaryText();
    this.pngTip.hidden = total < 2; // one sheet is one download: nothing for the browser to ask
    this.shareFile = null;
    busyWhile(() => this.renderPreviews()).catch((err) => {
      if (this.disposed) return;
      console.error(err);
      this.status.textContent = "";
    });
  }

  setPaper(paper) {
    if (this.working || paper === this.paper) return;
    this.paper = paper;
    updateSettings({ printPaper: paper });
    this.refresh();
  }

  setPingpong(box) {
    if (this.working) {
      box.checked = this.pingpong; // a job is reading the options: put the box back
      return;
    }
    this.pingpong = box.checked;
    this.refresh();
  }

  /** Runs one export job. While it runs, every job button and option is off, so a second click does nothing. */
  async run(job) {
    if (this.working || this.disposed) return;
    this.setWorking(true);
    try {
      await busyWhile(job);
    } finally {
      if (!this.disposed) this.setWorking(false);
    }
  }

  // aria-disabled, not disabled: a disabled button would drop keyboard focus to the page body.
  setWorking(on) {
    this.working = on;
    for (const el of this.section.querySelectorAll("[data-job], [data-option]")) {
      if (on) el.setAttribute("aria-disabled", "true");
      else el.removeAttribute("aria-disabled");
    }
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
    clear(this.previews);
    const total = sheetCount(this.cards.length);
    for (let s = 0; s < total; s++) {
      if (this.renderToken !== token || this.disposed) return;
      this.status.textContent = t("print.preparing", { n: s + 1, total });
      const canvas = renderSheet(this.sheetArgs(s, PREVIEW_DPI, true));
      const blob = await canvasToBlob(canvas);
      canvas.width = 0;
      if (this.renderToken !== token || this.disposed) return;
      const url = URL.createObjectURL(blob);
      this.urls.push(url);
      const onSheet = Math.min(8, this.cards.length - s * 8);
      const alt = t("print.preview.sheet.aria", { n: s + 1, total, cardsText: tp("print.summary.cards", onSheet, { cards: onSheet }) });
      this.previews.append(h("figure", { class: "sheet-preview" },
        h("img", { src: url, alt, class: `sheet-preview__img sheet-preview__img--${this.paper}` }),
        h("button", { class: "btn btn--secondary btn--compact", type: "button", dataset: { job: "1" }, "aria-disabled": this.working ? "true" : null,
          "aria-label": t("print.action.pngSheet.aria", { n: s + 1 }), onclick: () => this.run(() => this.downloadPng(s)) },
          iconEl("download", { size: 20 }), t("print.action.pngSheet", { n: s + 1 }))));
      await yieldToMain();
    }
    if (this.renderToken === token) this.status.textContent = "";
  }

  /** Paper size and ping-pong are part of every file name, so two exports never share one (EX-08). */
  pdfName() {
    return t(this.pingpong ? "print.file.pdf.pingpong" : "print.file.pdf.paper", { title: safeFileName(this.doc.project.title), paper: this.paper });
  }

  pngName(sheet) {
    return t(this.pingpong ? "print.file.png.pingpong" : "print.file.png.paper",
      { title: safeFileName(this.doc.project.title), nn: String(sheet + 1).padStart(2, "0"), paper: this.paper });
  }

  async sheetPng(sheet) {
    const canvas = renderSheet(this.sheetArgs(sheet, 300));
    const blob = await canvasToBlob(canvas);
    canvas.width = 0;
    // With its 300 dpi written in, the sheet prints at its real size outside this app too.
    return new Blob([withPngDensity(new Uint8Array(await blob.arrayBuffer()))], { type: "image/png" });
  }

  async downloadPng(sheet) {
    try {
      downloadBlob(await this.sheetPng(sheet), this.pngName(sheet));
      toast(tp("print.done.png", 1, { sheets: 1 }));
    } catch (err) {
      if (this.disposed) return;
      console.error(err);
      toast(t("print.error.png"));
    }
  }

  async downloadAllPng() {
    const total = sheetCount(this.cards.length);
    try {
      for (let s = 0; s < total; s++) {
        if (this.disposed) return;
        this.status.textContent = t("print.preparing", { n: s + 1, total });
        downloadBlob(await this.sheetPng(s), this.pngName(s));
        await sleep(350);
      }
      this.status.textContent = "";
      toast(tp("print.done.png", total, { sheets: total }));
    } catch (err) {
      if (this.disposed) return;
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
      if (this.disposed) throw new Error("print screen closed");
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
    try {
      const name = this.pdfName();
      const { bytes, sheets } = await this.buildPdfBytes();
      const blob = new Blob([bytes], { type: "application/pdf" });
      this.lastPdf = blob;
      downloadBlob(blob, name);
      toast(tp("print.done.pdf", sheets, { sheets }));
    } catch (err) {
      if (this.disposed) return;
      console.error(err);
      this.status.textContent = "";
      toast(t("print.error.pdf"));
    }
  }

  /**
   * Hands the PDF to the device's share sheet (the likely way to a parent or a printer app
   * on a phone). A browser only shares right after a tap; a long build outlives that, so the
   * finished file is kept and the next tap shares it at once.
   */
  async sharePdf() {
    const variant = `${this.paper}|${this.pingpong}`;
    try {
      if (this.shareFile?.variant !== variant) {
        const name = this.pdfName();
        const { bytes } = await this.buildPdfBytes();
        this.shareFile = { variant, file: new File([bytes], name, { type: "application/pdf" }) };
        if (navigator.userActivation && !navigator.userActivation.isActive) {
          this.status.textContent = t("print.share.ready");
          return;
        }
      }
      await navigator.share({ files: [this.shareFile.file], title: this.doc.project.title });
      this.status.textContent = "";
    } catch (err) {
      if (this.disposed || err?.name === "AbortError") return; // AbortError: the user closed the share sheet
      console.error(err);
      this.status.textContent = "";
      toast(t("print.share.failed"));
    }
  }

  /** "להדפיס": many sheets ask first (R47); any failure is said out loud and leaves no stale status. */
  async print() {
    const total = sheetCount(this.cards.length);
    if (total > MANY_SHEETS) {
      const choice = await this.askManySheets(total);
      if (this.disposed || !choice) return;
      if (choice === "pdf") return this.downloadPdf();
    }
    try {
      await this.printSheets(total);
    } catch (err) {
      if (this.disposed) return;
      console.error(err);
      document.getElementById("print-root")?.remove();
      this.status.textContent = "";
      toast(t("print.error.print"));
    }
  }

  /** Resolves "pdf", "print", or null when the dialog is dismissed. */
  askManySheets(total) {
    return new Promise((resolve) => {
      let choice = null;
      const pick = (value) => { choice = value; sheet.close(); };
      const body = h("div", { class: "dialog__content" },
        h("p", {}, t("print.confirm.many.body")),
        h("div", { class: "dialog__actions" },
          h("button", { class: "btn btn--primary btn--sheet", type: "button", onclick: () => pick("pdf") }, t("print.action.pdf")),
          h("button", { class: "btn btn--secondary btn--sheet", type: "button", onclick: () => pick("print") }, t("print.confirm.many.print")),
          h("button", { class: "btn btn--tertiary", type: "button", onclick: () => pick(null) }, t("common.cancel"))));
      const sheet = openSheet({ title: t("print.confirm.many.title", { sheets: total }), body, kind: "dialog", owner: this, onClose: () => resolve(choice) });
    });
  }

  /** window.print() with @page sized to the chosen paper (Ruling 3 margins). */
  async printSheets(total) {
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
      if (this.disposed) return;
      this.status.textContent = t("print.preparing", { n: s + 1, total });
      const url = URL.createObjectURL(await this.sheetPng(s));
      this.urls.push(url);
      root.append(h("div", { class: "print-sheet" }, h("img", { src: url, alt: "" })));
    }
    if (this.disposed) return;
    this.status.textContent = "";
    document.body.append(root);
    await Promise.all([...root.querySelectorAll("img")].map((img) => img.decode().catch(() => {})));
    window.print();
  }
}
