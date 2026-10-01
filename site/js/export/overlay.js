// Export overlay (plan 3): GIF, Video, Print sheet, Project file, in that order.
// States: idle, encoding/recording (Editor locked, Cancel only), done, error, cancelled.
import { h, clear, richText } from "../lib/dom.js";
import { t } from "../lib/i18n.js";
import { downloadBlob, safeFileName, makeCanvas, formatFileSize } from "../lib/util.js";
import { iconEl } from "../ui/icons.js";
import { toast, announce } from "../ui/toast.js";
import { encodeGif, ExportCancelled } from "./gif-export.js";
import { recordVideo, canRecordVideo, pickVideoType, extensionFor, VideoError, planVideo, warmUpVideoEncoder } from "./video-export.js";
import { downloadDocFile } from "../store/project-file.js";

const LONG_VIDEO_MS = 10000; // from here on the card says how long the recording takes

export function openExportOverlay(ed, { onClose }) {
  const doc = ed.doc;
  const title = doc.project.title;
  let busy = null; // AbortController while encoding or recording
  let halfSize = false;
  let resultUrl = null;
  let lastAction = null; // "gif" | "video": where focus goes back to after Cancel or "back"

  const dialog = h("dialog", { class: "sheet sheet--dialog export", "aria-labelledby": "export-h2" });
  const heading = h("h2", { id: "export-h2", class: "sheet__title export__h2", tabindex: "-1" }, t("export.h2"));
  const closeBtn = h("button", { class: "icon-btn sheet__close", type: "button", "aria-label": t("export.close.aria"), onclick: () => close() }, iconEl("close"));
  const content = h("div", { class: "export__content" });
  dialog.append(h("div", { class: "sheet__header" }, heading, closeBtn), content);
  dialog.addEventListener("cancel", (e) => { e.preventDefault(); if (busy) busy.abort(); else close(); });
  document.body.append(dialog);
  dialog.showModal();
  // Focus starts on the title, not on the close button: a screen reader hears where it is,
  // and a tap-open shows no focus ring (same rule as the sheets in ui/dialog.js).
  heading.focus({ preventScroll: true });
  ed.section.classList.add("is-exporting");
  // The encoder needs a few seconds before its first real recording (js/export/video-export.js):
  // spend them now, while the cards are being read.
  if (canRecordVideo()) warmUpVideoEncoder();

  let closed = false;
  function close({ fromRoute = false } = {}) {
    if (closed) return;
    closed = true;
    busy?.abort();
    releaseResult();
    dialog.close();
    dialog.remove();
    ed.section.classList.remove("is-exporting");
    onClose(fromRoute);
  }

  function releaseResult() {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    resultUrl = null;
    ed.lastExport = null;
  }

  function setBusy(on) {
    closeBtn.hidden = on;
  }

  // ---------- idle: the four cards ----------
  function renderIdle({ focus = null } = {}) {
    setBusy(false);
    clear(content);
    const { width: w, height: hh } = doc;
    const sizeName = "gif-size-" + Math.random().toString(36).slice(2, 6);
    const radio = (half, label) => h("label", { class: "radio" },
      h("input", { type: "radio", name: sizeName, checked: half === halfSize, onchange: () => { halfSize = half; } }),
      h("span", {}, richText(label)));
    const gifBtn = h("button", { class: "btn btn--primary", type: "button", onclick: () => runGif() }, t("export.gif.action"));
    const gifCard = card("gif", t("export.gif.h3"), t("export.gif.line"),
      h("fieldset", { class: "radio-group" }, h("legend", { class: "radio-group__legend" }, t("export.gif.size.label")),
        radio(false, t("export.gif.size.full", { w, h: hh })),
        radio(true, t("export.gif.size.half", { w: Math.round(w / 2), h: Math.round(hh / 2) }))),
      gifBtn);
    const videoOk = canRecordVideo();
    const videoBtn = h("button", { class: "btn btn--secondary", type: "button", disabled: !videoOk, onclick: () => runVideo() }, t("export.video.action"));
    const videoCard = card("video", t("export.video.h3"), videoOk ? t("export.video.line") : t("export.video.disabled"),
      videoOk ? videoLengthNote() : null, videoBtn);
    if (!videoOk) videoCard.classList.add("export-card--disabled");
    const printCard = card("print", t("export.print.h3"), t("export.print.line"), null,
      h("a", { class: "btn btn--secondary", href: `#/print/${doc.project.id}` }, t("export.print.action")));
    const projectCard = card("file", t("export.project.h3"), t("export.project.line"), null,
      h("button", { class: "btn btn--secondary", type: "button", onclick: runProject }, iconEl("download"), t("export.project.action")));
    content.append(h("div", { class: "export__cards" }, gifCard, videoCard, printCard, projectCard));
    if (focus === "gif") gifBtn.focus();
    else if (focus === "video" && videoOk) videoBtn.focus();
    else if (focus) heading.focus({ preventScroll: true });
  }

  function card(iconName, heading3, line, extra, action) {
    return h("section", { class: "export-card" },
      h("div", { class: "export-card__head" }, iconEl(iconName, { size: 32, cls: "export-card__icon" }), h("h3", { class: "export-card__h3" }, heading3)),
      h("p", { class: "export-card__line muted" }, line), extra, action);
  }

  /** A recording runs as long as the animation itself: say so before the click when that is long. */
  function videoLengthNote() {
    const plan = planVideo(exportFrames(), doc.project.fps, doc.project.playMode);
    if (plan.totalMs < LONG_VIDEO_MS) return null;
    const s = Math.round(plan.totalMs / 1000);
    const text = s < 60
      ? t("export.video.length.seconds", { s })
      : t("export.video.length.minutes", { time: `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` });
    return h("p", { class: "export-card__note" }, richText(text));
  }

  // ---------- progress ----------
  function progressView(labelFn, { recordingCanvas = null, notes = [] } = {}) {
    setBusy(true);
    clear(content);
    const fill = h("span", { class: "progress__fill" });
    const bar = h("div", { class: "progress film", role: "progressbar", "aria-label": t("export.progress.name"), "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": "0" }, fill);
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
    lastAction = "gif";
    const half = halfSize;
    busy = new AbortController();
    const update = progressView((n, total) => [t("export.progress.gif", { n, total }), t("export.progress.gif.aria", { n, total })]);
    try {
      const blob = await encodeGif({ frames: exportFrames(), fps: doc.project.fps, playMode: doc.project.playMode, half, onProgress: update, signal: busy.signal });
      busy = null;
      if (closed) return;
      renderDone(blob, t("export.done.gif"), t(half ? "export.file.gifHalf" : "export.file.gif", { title: safeFileName(title) }), "gif");
    } catch (err) {
      busy = null;
      if (closed) return;
      if (err instanceof ExportCancelled) return cancelled();
      console.error(err);
      renderError(t("export.error.gif"), () => runGif());
    }
  }

  /** attempt 1 is the automatic second try after a short or empty recording. */
  async function runVideo(attempt = 0) {
    lastAction = "video";
    const type = pickVideoType();
    busy = new AbortController();
    const canvas = makeCanvas(doc.width, doc.height);
    canvas.className = "projector__canvas";
    const frames = exportFrames();
    const plan = planVideo(frames, doc.project.fps, doc.project.playMode);
    const total = Math.round(plan.totalMs / 1000);
    let recording = false;
    const update = progressView((s) => (recording
      ? [t("export.progress.video", { s, total }), t("export.progress.video.aria", { s, total })]
      : [t("export.video.preparing"), t("export.video.preparing")]), {
      recordingCanvas: canvas,
      notes: [attempt ? t("export.video.retrying") : null, t("export.video.realtime"), t("export.video.format", { ext: extensionFor(type).toUpperCase() })].filter(Boolean),
    });
    update(0, total);
    try {
      const res = await recordVideo({
        frames, fps: doc.project.fps, playMode: doc.project.playMode, canvas, onProgress: update, signal: busy.signal,
        onPhase: (phase) => { recording = phase === "recording"; update(0, total); },
      });
      busy = null;
      if (closed) return;
      renderDone(res.blob, t("export.done.video", { ext: res.ext.toUpperCase() }), t("export.file.video", { title: safeFileName(title), ext: res.ext }), "video");
    } catch (err) {
      busy = null;
      if (closed) return;
      if (err instanceof ExportCancelled) return cancelled();
      if (err instanceof VideoError && (err.code === "empty" || err.code === "short")) {
        // The file is not what was recorded into it: one more try by itself, then say so.
        if (attempt === 0) return runVideo(1);
        return renderError(t(err.code === "empty" ? "export.error.videoEmpty" : "export.error.videoShort"), () => runVideo(), { gifInstead: true });
      }
      if (err instanceof VideoError && err.code === "hidden") return renderError(t("export.error.videoHidden"), () => runVideo());
      console.error(err);
      renderError(t("export.error.video"), () => runVideo());
    }
  }

  function runProject() {
    try {
      const name = downloadDocFile(doc);
      toast(t("export.done.project", { filename: name, title }));
    } catch (err) {
      console.error(err);
      renderError(t("export.error.project"), runProject);
    }
  }

  function cancelled() {
    toast(t("export.cancelled"));
    renderIdle({ focus: lastAction });
  }

  function renderDone(blob, heading3, filename, kind) {
    setBusy(false);
    clear(content);
    releaseResult();
    resultUrl = URL.createObjectURL(blob);
    const preview = kind === "gif"
      ? h("img", { class: "export__preview", src: resultUrl, alt: t("export.preview.alt") })
      : h("video", { class: "export__preview", src: resultUrl, controls: true, loop: true, muted: true, playsinline: true });
    const file = new File([blob], filename, { type: blob.type });
    const canShare = !!navigator.canShare && (() => { try { return navigator.canShare({ files: [file] }); } catch { return false; } })();
    const download = h("button", { class: "btn btn--primary", type: "button", onclick: () => downloadBlob(blob, filename) }, iconEl("download"), t("export.done.download"));
    const shareNote = h("p", { class: "export__note muted small", role: "status" });
    const share = async () => {
      shareNote.textContent = "";
      try {
        await navigator.share({ files: [file], text: t("export.share.text") });
      } catch (err) {
        if (err?.name !== "AbortError") shareNote.textContent = t("export.share.failed"); // AbortError: the user closed the share sheet
      }
    };
    content.append(h("div", { class: "export__done", dataset: { kind, size: String(blob.size), type: blob.type } },
      h("p", { class: "export__done-title" }, heading3),
      h("p", { class: "muted num" }, t("export.done.size", { size: formatFileSize(blob.size) })),
      preview,
      h("div", { class: "row-actions" },
        download,
        canShare ? h("button", { class: "btn btn--secondary", type: "button", onclick: share }, iconEl("share"), t("export.done.share")) : null),
      shareNote,
      h("button", { class: "btn btn--tertiary", type: "button", onclick: () => { releaseResult(); renderIdle({ focus: lastAction }); } }, t("export.done.back"))));
    announce(heading3);
    download.focus();
    ed.lastExport = { blob, filename, kind };
  }

  function renderError(message, retry, { gifInstead = false } = {}) {
    setBusy(false);
    clear(content);
    const actions = h("div", { class: "row-actions" },
      gifInstead ? h("button", { class: "btn btn--primary", type: "button", onclick: () => runGif() }, t("export.error.videoEmpty.action")) : null,
      retry ? h("button", { class: "btn btn--secondary", type: "button", onclick: retry }, t("export.error.retry")) : null);
    content.append(h("div", { class: "export__error", role: "alert" }, iconEl("warn", { size: 32 }), h("p", {}, message), actions));
    (actions.querySelector("button") || heading).focus({ preventScroll: true });
  }

  renderIdle();
  return { close, runGif, runVideo };
}
