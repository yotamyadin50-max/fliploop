// Export overlay (plan 3): GIF, Video, Print sheet, Project file, in that order.
// States: idle, encoding/recording (Editor locked, Cancel only), done, error, cancelled.
import { h, clear, richText } from "../lib/dom.js";
import { t } from "../lib/i18n.js";
import { downloadBlob, safeFileName, makeCanvas, formatFileSize } from "../lib/util.js";
import { iconEl } from "../ui/icons.js";
import { toast, announce } from "../ui/toast.js";
import { encodeGif, ExportCancelled } from "./gif-export.js";
import { recordVideo, canRecordVideo, pickVideoType, extensionFor, VideoError, planVideo } from "./video-export.js";
import { downloadDocFile } from "../store/project-file.js";

export function openExportOverlay(ed, { onClose }) {
  const doc = ed.doc;
  const title = doc.project.title;
  let busy = null; // AbortController while encoding or recording
  let halfSize = false;
  let resultUrl = null;

  const dialog = h("dialog", { class: "sheet sheet--dialog export", "aria-labelledby": "export-h2" });
  const closeBtn = h("button", { class: "icon-btn sheet__close", type: "button", "aria-label": t("export.close.aria"), onclick: () => close() }, iconEl("close"));
  const content = h("div", { class: "export__content" });
  dialog.append(h("div", { class: "sheet__header" }, h("h2", { id: "export-h2", class: "sheet__title export__h2" }, t("export.h2")), closeBtn), content);
  dialog.addEventListener("cancel", (e) => { e.preventDefault(); if (busy) busy.abort(); else close(); });
  document.body.append(dialog);
  dialog.showModal();
  ed.section.classList.add("is-exporting");

  let closed = false;
  function close({ fromRoute = false } = {}) {
    if (closed) return;
    closed = true;
    busy?.abort();
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    dialog.close();
    dialog.remove();
    ed.section.classList.remove("is-exporting");
    onClose(fromRoute);
  }

  function setBusy(on) {
    closeBtn.hidden = on;
  }

  // ---------- idle: the four cards ----------
  function renderIdle() {
    setBusy(false);
    clear(content);
    const { width: w, height: hh } = doc;
    const sizeName = "gif-size-" + Math.random().toString(36).slice(2, 6);
    const radio = (half, label) => h("label", { class: "radio" },
      h("input", { type: "radio", name: sizeName, checked: half === halfSize, onchange: () => { halfSize = half; } }),
      h("span", {}, richText(label)));
    const gifCard = card("gif", t("export.gif.h3"), t("export.gif.line"),
      h("fieldset", { class: "radio-group" }, h("legend", { class: "radio-group__legend" }, t("export.gif.size.label")),
        radio(false, t("export.gif.size.full", { w, h: hh })),
        radio(true, t("export.gif.size.half", { w: Math.round(w / 2), h: Math.round(hh / 2) }))),
      h("button", { class: "btn btn--primary", type: "button", onclick: runGif }, iconEl("gif"), t("export.gif.action")));
    const videoOk = canRecordVideo();
    const videoCard = card("video", t("export.video.h3"), videoOk ? t("export.video.line") : t("export.video.disabled"), null,
      h("button", { class: "btn btn--secondary", type: "button", disabled: !videoOk, onclick: runVideo }, iconEl("video"), t("export.video.action")));
    if (!videoOk) videoCard.classList.add("export-card--disabled");
    const printCard = card("print", t("export.print.h3"), t("export.print.line"), null,
      h("a", { class: "btn btn--secondary", href: `#/print/${doc.project.id}` }, iconEl("print"), t("export.print.action")));
    const projectCard = card("file", t("export.project.h3"), t("export.project.line"), null,
      h("button", { class: "btn btn--secondary", type: "button", onclick: runProject }, iconEl("download"), t("export.project.action")));
    content.append(h("div", { class: "export__cards" }, gifCard, videoCard, printCard, projectCard));
  }

  function card(iconName, heading, line, extra, action) {
    return h("section", { class: "export-card" },
      h("div", { class: "export-card__head" }, iconEl(iconName, { size: 32, cls: "export-card__icon" }), h("h3", { class: "export-card__h3" }, heading)),
      h("p", { class: "export-card__line muted" }, line), extra, action);
  }

  // ---------- progress ----------
  function progressView(labelFn, { recordingCanvas = null, notes = [] } = {}) {
    setBusy(true);
    clear(content);
    const fill = h("span", { class: "progress__fill" });
    const bar = h("div", { class: "progress film", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": "0" }, fill);
    const label = h("p", { class: "progress__label" });
    const cancel = h("button", { class: "btn btn--tertiary", type: "button", onclick: () => busy?.abort() }, t("export.cancel"));
    const screen = recordingCanvas ? h("div", { class: "projector" }, recordingCanvas) : null;
    content.append(h("div", { class: "export__progress" }, screen, ...notes.map((n) => h("p", { class: "muted small" }, n)), bar, label, cancel));
    cancel.focus();
    return (a, b) => {
      const pct = b ? Math.round((a / b) * 100) : 0;
      fill.style.width = `${pct}%`;
      bar.setAttribute("aria-valuenow", String(pct));
      const [visible, aria] = labelFn(a, b);
      label.replaceChildren(richText(visible));
      bar.setAttribute("aria-valuetext", aria);
    };
  }

  const exportFrames = () => doc.frames.map((f) => ({ canvas: f.canvas, hold: f.hold }));

  async function runGif() {
    busy = new AbortController();
    const update = progressView((n, total) => [t("export.progress.gif", { n, total }), t("export.progress.gif.aria", { n, total })]);
    try {
      const blob = await encodeGif({ frames: exportFrames(), fps: doc.project.fps, playMode: doc.project.playMode, half: halfSize, onProgress: update, signal: busy.signal });
      busy = null;
      renderDone(blob, t("export.done.gif"), `${safeFileName(title)}.gif`, "gif");
    } catch (err) {
      busy = null;
      if (err instanceof ExportCancelled) return cancelled();
      console.error(err);
      renderError(t("export.error.gif"), runGif);
    }
  }

  async function runVideo() {
    const type = pickVideoType();
    busy = new AbortController();
    const canvas = makeCanvas(doc.width, doc.height);
    canvas.className = "projector__canvas";
    const plan = planVideo(exportFrames(), doc.project.fps, doc.project.playMode);
    const total = Math.round(plan.totalMs / 1000);
    const update = progressView((s) => [t("export.progress.video", { s, total }), t("export.progress.video.aria", { s, total })], {
      recordingCanvas: canvas,
      notes: [t("export.video.realtime"), t("export.video.format", { ext: extensionFor(type).toUpperCase() })],
    });
    update(0, total);
    try {
      const res = await recordVideo({ frames: exportFrames(), fps: doc.project.fps, playMode: doc.project.playMode, canvas, onProgress: update, signal: busy.signal });
      busy = null;
      renderDone(res.blob, t("export.done.video", { ext: res.ext.toUpperCase() }), `${safeFileName(title)}.${res.ext}`, "video");
    } catch (err) {
      busy = null;
      if (err instanceof ExportCancelled) return cancelled();
      if (err instanceof VideoError && err.code === "empty") return renderError(t("export.error.videoEmpty"), null, { gifInstead: true });
      if (err instanceof VideoError && err.code === "hidden") return renderError(t("export.error.videoHidden"), runVideo);
      console.error(err);
      renderError(t("export.error.video"), runVideo);
    }
  }

  function runProject() {
    try {
      const name = downloadDocFile(doc);
      toast(t("export.done.project", { filename: name }));
    } catch (err) {
      console.error(err);
      renderError(t("export.error.project"), runProject);
    }
  }

  function cancelled() {
    toast(t("export.cancelled"));
    renderIdle();
  }

  function renderDone(blob, heading, filename, kind) {
    setBusy(false);
    clear(content);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    resultUrl = URL.createObjectURL(blob);
    const preview = kind === "gif"
      ? h("img", { class: "export__preview", src: resultUrl, alt: heading })
      : h("video", { class: "export__preview", src: resultUrl, controls: true, loop: true, muted: true, playsinline: true });
    const file = new File([blob], filename, { type: blob.type });
    const canShare = !!navigator.canShare && (() => { try { return navigator.canShare({ files: [file] }); } catch { return false; } })();
    const download = h("button", { class: "btn btn--primary", type: "button", onclick: () => downloadBlob(blob, filename) }, iconEl("download"), t("export.done.download"));
    content.append(h("div", { class: "export__done", dataset: { kind, size: String(blob.size), type: blob.type } },
      h("p", { class: "export__done-title" }, heading),
      h("p", { class: "muted num" }, t("export.done.size", { size: formatFileSize(blob.size) })),
      preview,
      h("div", { class: "row-actions" },
        download,
        canShare ? h("button", { class: "btn btn--secondary", type: "button", onclick: () => navigator.share({ files: [file], text: t("export.share.text") }).catch(() => {}) }, iconEl("share"), t("export.done.share")) : null)));
    announce(heading);
    download.focus();
    ed.lastExport = { blob, filename, kind };
  }

  function renderError(message, retry, { gifInstead = false } = {}) {
    setBusy(false);
    clear(content);
    content.append(h("div", { class: "export__error", role: "alert" },
      iconEl("warn", { size: 32 }),
      h("p", {}, message),
      h("div", { class: "row-actions" },
        gifInstead ? h("button", { class: "btn btn--primary", type: "button", onclick: runGif }, iconEl("gif"), t("export.error.videoEmpty.action")) : null,
        retry ? h("button", { class: "btn btn--secondary", type: "button", onclick: retry }, t("export.error.retry")) : null)));
  }

  renderIdle();
  return { close, runGif, runVideo };
}
