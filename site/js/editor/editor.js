// Editor screen (plan 2): top bar, canvas, tools, film strip, playback bar, lesson mode,
// autosave, warnings W2 W3 W4 W5, coach marks, and the export overlay route.
import { h, clear } from "../lib/dom.js";
import { t } from "../lib/i18n.js";
import { on } from "../lib/bus.js";
import { isDesktop, truncate } from "../lib/util.js";
import { iconEl } from "../ui/icons.js";
import { toast, announce } from "../ui/toast.js";
import { openSheet, confirmDialog } from "../ui/dialog.js";
import { showCoach } from "../ui/coach.js";
import { Doc, frameHasInk } from "./doc.js";
import { Stage } from "./stage.js";
import { FilmStrip } from "./strip.js";
import { Player } from "./playback.js";
import { syncGhost, restoreIndex } from "../core/frame-order.js";
import { MAX_FRAMES } from "../store/projects.js";
import { UndoManager } from "./undo.js";
import { DrawingInput, WIDTHS } from "./drawing.js";
import { LessonMode } from "./lesson-mode.js";
import { colorPanel, onionPanel, sizePanel, clearButton, moveButton, widthPanel, frameMenu, colorName, isBaseColor } from "./panels.js";
import { Autosaver } from "../store/autosave.js";
import { getSettings, updateSettings, getProgress, updateProgress, rememberColor } from "../store/settings.js";
import { isFull, checkNearlyFull } from "../store/storage.js";
import { downloadDocFile } from "../store/project-file.js";
import { duplicateProject, TITLE_MAX, nextDefaultTitle } from "../store/projects.js";
import { showW2b } from "../ui/warnings.js";
import { closeAllSheets } from "../ui/dialog.js";
import { openDb } from "../store/db.js";
import { onPeerMessage } from "../store/channel.js";
import { holdUnsaved, releaseUnsaved } from "../store/rescue.js";

let w5ShownThisSession = false;
const VIEW_KEY = "fliploop-view:"; // sessionStorage, per project: the frame, tool and colour to come back to

export class EditorScreen {
  constructor(section, router) {
    this.section = section;
    this.router = router;
    this.tool = "pencil";
    this.pencilWidth = "m";
    this.eraserWidth = "m";
    this.color = "#1F1E1B";
    this.cur = 0;
    this.cleanups = [];
    this.coach = null;
    // Only while a save is failing: the browser's own "leave this page?" prompt (S7).
    this.onBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ""; };
  }

  // ---------- lifecycle ----------
  async mount({ id, overlay }, view = null) {
    this.projectId = id;
    this.doc = null;
    this.renderLoading();
    let doc = null;
    let failed = null;
    try {
      doc = await Doc.load(id);
    } catch (err) {
      failed = err || new Error("load failed");
      if (typeof failed === "object") failed.handled = true; // this screen says so itself
      console.error("Editor load failed", err);
    }
    if (this.disposed) return;
    if (failed) {
      // A read that failed is not "no such project": nothing was deleted, and it can be tried again.
      this.renderLoadError({ id, overlay }, view);
      this.router.setTitle(t("editor.loadFailed.title"));
      return;
    }
    if (!doc) {
      this.renderNotFound();
      this.router.setTitle(t("meta.title.notFound"));
      return;
    }
    this.doc = doc;
    this.fallbackTitle = await nextDefaultTitle(id);
    if (this.disposed) return;
    view ??= this.storedView(); // no update-resume view: the place this tab last left the project at (F13)
    this.restoreView(view);
    this.build();
    if (view && Number.isInteger(view.cur) && view.cur > 0) this.select(Math.min(view.cur, doc.count - 1), { instantScroll: true });
    this.router.setTitle(doc.project.title);
    if (overlay === "export") this.openExport();
    this.startCoach();
  }

  /**
   * A press that came while the page transition still ran (app.js). The browser gave it to
   * the root element, so the canvas never saw it, and a stroke begun in the first 0.3 s after
   * arriving here was lost. A press inside the canvas ends the transition at once, and if the
   * canvas really is what lies under the pointer (no toast, tip or sheet), the stroke starts.
   * Not while the Export overlay is on its way in: that route's screen is the overlay.
   */
  earlyPointer(e, transition) {
    if (this.disposed || !this.doc || !this.input || !this.autosaver || this.exportOpening || this.exportCtl) return;
    const canvas = this.stage.display;
    const r = canvas.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX >= r.right || e.clientY < r.top || e.clientY >= r.bottom) return;
    transition.skipTransition();
    if (document.elementFromPoint(e.clientX, e.clientY) !== canvas) return;
    this.input.onDown(e); // captures the pointer: its moves and its release go to the canvas
    this.autosaver.refresh(); // what the canvas's own pointerdown listener does (build())
  }

  // ---------- automatic updates (js/pwa.js) ----------
  /** True while a page reload would lose or cut something short. */
  isBusy() {
    if (!this.autosaver || this.disposed) return false;
    return !!this.input.active || this.undo.busy || this.player.playing || !!this.strip.drag
      || !!this.exportCtl || /\/export$/.test(location.hash) || !this.autosaver.isClean;
  }

  /** Saves everything now. Resolves false if it could not be saved. */
  async flush() {
    const saver = this.autosaver;
    if (!saver) return true;
    for (let i = 0; i < 3 && !saver.isClean; i++) await saver.saveNow();
    return saver.isClean;
  }

  /** What a reload would otherwise reset: the frame on screen, the tool, the colour, the widths. */
  viewState() {
    if (!this.doc) return null;
    return { cur: this.cur, tool: this.tool, color: this.color, pencilWidth: this.pencilWidth, eraserWidth: this.eraserWidth };
  }

  restoreView(view) {
    if (!view) return;
    if (["pencil", "eraser", "fill", "move"].includes(view.tool)) this.tool = view.tool;
    if (/^#[0-9A-F]{6}$/i.test(view.color)) this.color = view.color.toUpperCase();
    if (view.pencilWidth in WIDTHS) this.pencilWidth = view.pencilWidth;
    if (view.eraserWidth in WIDTHS) this.eraserWidth = view.eraserWidth;
  }

  // ---------- WS1: view memory, two tabs, unsaved work (fix round 2026-10) ----------
  /** The view this tab last had on this project (sessionStorage), or null. */
  storedView() {
    try {
      const raw = sessionStorage.getItem(VIEW_KEY + this.projectId);
      const view = raw ? JSON.parse(raw) : null;
      return view && typeof view === "object" ? view : null;
    } catch {
      return null;
    }
  }

  /** Remembers the frame, tool and colour for a reload or a later visit in this tab (F13). */
  saveView() {
    const view = this.viewState();
    if (!view) return;
    try {
      sessionStorage.setItem(VIEW_KEY + this.projectId, JSON.stringify(view));
    } catch { /* storage blocked: the project simply opens on frame 1 */ }
  }

  /** Everything build() set up, taken down again. save: write what is unsaved first. */
  async teardown({ save }) {
    this.player?.stop();
    this.exportCtl?.close({ fromRoute: true });
    this.coach?.close();
    this.cleanups.forEach((fn) => fn());
    this.cleanups = [];
    this.input?.destroy();
    removeEventListener("beforeunload", this.onBeforeUnload);
    if (save) await this.autosaver?.dispose();
    else this.autosaver?.stop();
  }

  /** Loads the stored version again in place: same frame, tool and colour. Unsaved changes here are dropped. */
  async reloadDocument() {
    if (this.reloading || this.disposed || !this.doc) return;
    this.reloading = true;
    try {
      const view = this.viewState();
      this.conflictSheet?.close(undefined, { immediate: true });
      closeAllSheets();
      await this.teardown({ save: false });
      this.autosaver = null;
      if (!this.disposed) await this.mount({ id: this.projectId, overlay: null }, view);
    } finally {
      this.reloading = false;
    }
  }

  /** Another tab saved this project. With nothing unsaved here, take its version at once (R3). */
  onPeerSaved({ type, projectId, updatedAt }) {
    if (type !== "saved" || projectId !== this.projectId || this.disposed || !this.autosaver) return;
    if (!(updatedAt > this.autosaver.baseUpdatedAt)) return;
    const idle = this.autosaver.isClean && !this.input.active && !this.undo.busy && !this.strip.drag && !this.exportCtl;
    if (idle) this.reloadDocument();
    // Otherwise the next write finds the newer version, writes nothing, and showConflict() asks.
  }

  /** The two-tab dialog: load the newer version, or download what is here. Never a silent overwrite. */
  showConflict() {
    if (this.conflictSheet || this.disposed) return;
    const body = h("div", { class: "dialog__content" },
      h("p", {}, t("conflict.body")),
      h("div", { class: "dialog__actions" },
        h("button", { class: "btn btn--primary btn--sheet", type: "button", onclick: () => this.reloadDocument() }, t("conflict.reload")),
        h("button", { class: "btn btn--secondary btn--sheet", type: "button", onclick: () => this.downloadFromMemory() }, iconEl("download"), t("conflict.download"))));
    this.conflictSheet = openSheet({ title: t("conflict.title"), body, kind: "dialog", owner: this, onClose: () => { this.conflictSheet = null; } });
  }

  /** The Editor is closing while the save still fails (S7): keep the document, and say so on the next screen. */
  keepUnsaved() {
    const doc = this.doc;
    holdUnsaved(doc);
    if (!this.autosaver.conflict) this.autosaver.rescue(); // the next launch tries IndexedDB again
    const note = toast(t("w3.left"), {
      id: "unsaved", persistent: true, warn: true, icon: "warn",
      action: { label: t("w3.action"), onClick: () => {
        const name = downloadDocFile(doc);
        releaseUnsaved(doc);
        toast(t("export.done.project", { filename: name, title: doc.project.title }));
      } },
    });
    note.el?.querySelector(".toast__close-text")?.addEventListener("click", () => releaseUnsaved(doc));
  }

  renderLoadError(params, view) {
    clear(this.section);
    const retry = h("button", { class: "btn btn--primary", type: "button", onclick: async () => {
      retry.disabled = true;
      await openDb({ retry: true }).catch((err) => { if (err && typeof err === "object") err.handled = true; });
      if (!this.disposed) this.mount(params, view);
    } }, t("storage.readFailed.retry"));
    this.section.append(
      h("header", { class: "topbar" }, this.backLink()),
      h("div", { class: "not-found storage-error" },
        h("div", { class: "card card--center", role: "alert" },
          iconEl("warn", { size: 28 }),
          h("h1", { class: "h2" }, t("editor.loadFailed.title")),
          h("p", {}, t("storage.readFailed.body")),
          h("div", { class: "row-actions" }, retry))));
  }

  async update({ id, overlay }) {
    if (id !== this.projectId) return false; // different project: the router remounts
    if (!this.doc) return true;
    if (overlay === "export" && !this.exportCtl) this.openExport();
    if (overlay !== "export" && this.exportCtl) this.exportCtl.close({ fromRoute: true });
    return true;
  }

  async unmount() {
    this.disposed = true;
    this.saveView();
    await this.teardown({ save: true });
    if (this.autosaver && !this.autosaver.isClean) this.keepUnsaved();
  }

  // ---------- states ----------
  backLink() {
    const kind = this.doc?.project.kind;
    const [href, key] = kind === "lesson" ? [`#/lesson/${this.doc.project.lessonId}`, "common.back.lesson"]
      : kind === "challenge" ? ["#/challenge", "common.back.challenge"]
        : ["#/gallery", "common.back.gallery"];
    return h("a", { class: "back", href, "aria-label": t(`${key}.aria`) },
      iconEl("back", { cls: "icon--flip-rtl" }), h("span", {}, t(key)));
  }

  renderLoading() {
    clear(this.section);
    const cells = Array.from({ length: 8 }, () => h("span", { class: "skeleton-cell" }));
    this.section.append(
      h("header", { class: "topbar" }, this.backLink()),
      h("div", { class: "editor-loading", "aria-busy": "true" },
        h("p", { class: "muted" }, t("editor.loading")),
        h("div", { class: "film skeleton-strip", dir: "ltr", "aria-hidden": "true" }, cells)));
  }

  renderNotFound() {
    clear(this.section);
    this.section.append(
      h("header", { class: "topbar" }, this.backLink()),
      h("div", { class: "not-found" },
        h("div", { class: "card card--center" },
          h("h1", { class: "h2" }, t("notFound.title")),
          h("p", {}, t("notFound.body")),
          h("div", { class: "row-actions" },
            h("a", { class: "btn btn--secondary", href: "#/gallery" }, t("notFound.gallery")),
            h("a", { class: "btn btn--primary", href: "#/new" }, iconEl("pencil"), t("notFound.new"))))));
  }

  // ---------- build ----------
  build() {
    const doc = this.doc;
    clear(this.section);
    this.section.classList.add("editor");
    this.stage = new Stage(doc.width, doc.height);
    this.undo = new UndoManager({ onEvict: () => this.showW5(), onChange: () => this.refreshUndoButtons() });
    this.strip = new FilmStrip({
      doc: () => this.doc,
      current: () => this.cur,
      select: (i) => this.select(i),
      stop: () => this.player.stop(),
      openMenu: (i, el) => this.openFrameMenu(i, el),
      add: () => this.addFrame(),
      reorder: (a, b) => this.reorder(a, b),
      canReorder: () => !this.doc.isLesson,
      isPlaying: () => this.player?.playing,
      frameState: (i) => ({ done: this.lessonMode ? this.lessonMode.done.get(i) : true }),
      hint: (text) => toast(text, { owner: this }),
    });
    this.player = new Player({
      doc,
      stage: this.stage,
      strip: this.strip,
      root: this.section,
      currentIndex: () => this.cur,
      isFirstPlay: () => !getSettings().firstPlaySeen,
      onStart: () => this.onPlayStart(),
      onStop: (i) => this.onPlayStop(i),
      onFirstPlay: () => this.firstPlayLine(),
    });

    const title = h("input", {
      class: "topbar__title", type: "text", value: doc.project.title, maxlength: TITLE_MAX,
      "aria-label": t("editor.title.aria"), "aria-describedby": "title-hint", enterkeyhint: "done", autocomplete: "off",
    });
    title.addEventListener("input", () => this.setTitle(title.value));
    title.addEventListener("change", () => { if (!title.value.trim()) { title.value = this.fallbackTitle; this.setTitle(title.value); } });
    title.addEventListener("keydown", (e) => { if (e.key === "Enter") title.blur(); });
    this.titleInput = title;
    this.h1 = h("h1", { class: "sr-only" }, doc.project.title);
    // Plain status text (a live region), not a control: only the failed state holds a button.
    this.status = h("span", { class: "save-status", role: "status" });
    this.statusState = null;
    this.setStatus("saved");
    const exportBtn = h("a", { class: "btn btn--compact btn--secondary topbar__export", href: `#/editor/${doc.project.id}/export`, "aria-label": t("editor.export.aria") }, iconEl("export", { size: 20 }), h("span", { class: "topbar__export-label" }, t("editor.export")));
    this.topbar = h("header", { class: "topbar" }, this.backLink(), this.h1, title,
      h("span", { id: "title-hint", class: "sr-only" }, t("editor.title.hint")), this.status, exportBtn);

    this.w2 = h("div", { class: "w2-strip", hidden: true, role: "status" });
    this.w3 = h("div", { class: "w3-strip", hidden: true, role: "alert", "aria-describedby": "w3-retry" },
      h("span", { class: "w3-strip__text" }, t("w3.text")),
      h("span", { id: "w3-retry", class: "sr-only" }, t("w3.retry.aria")),
      h("button", { class: "btn btn--compact btn--on-error", type: "button", "aria-label": t("w3.action.aria"), onclick: () => this.downloadFromMemory() }, iconEl("download", { size: 20 }), t("w3.action")));

    if (doc.isLesson) this.lessonMode = null; // created after the stage exists (below)

    // Canvas region
    this.stage.display.setAttribute("aria-label", "");
    this.canvasRegion = h("section", { class: "editor__canvas", "aria-labelledby": "h2-canvas" },
      h("h2", { id: "h2-canvas", class: "sr-only" }, t("editor.h2.canvas")), this.stage.el);

    // Tools
    this.toolKeys = {};
    const key = (name, iconName, { cls = "", onClick, pressed = null } = {}) => {
      const label = t(`tool.${name}`);
      const b = h("button", { class: `tool-key ${cls}`, type: "button", title: t(`tool.${name}.tooltip`), onclick: onClick },
        iconEl(iconName, { cls: name === "undo" || name === "redo" ? "icon--flip-rtl" : "" }),
        label ? h("span", { class: "tool-key__label" }, label) : null);
      if (pressed !== null) b.setAttribute("aria-pressed", String(pressed));
      this.toolKeys[name] = b;
      return b;
    };
    const moveKey = h("button", { class: "tool-key tool-key--desktop", type: "button", title: t("more.move.tooltip"), "aria-pressed": "false", onclick: () => this.setTool("move") },
      iconEl("move"), h("span", { class: "tool-key__label" }, t("more.move")));
    this.toolKeys.move = moveKey;
    this.colorDot = h("span", { class: "color-dot", "aria-hidden": "true" });
    const colorKey = h("button", { class: "tool-key tool-key--phone", type: "button", onclick: (e) => this.openColors(e.currentTarget) },
      this.colorDot, h("span", { class: "tool-key__label" }, t("tool.color")));
    this.toolKeys.color = colorKey;
    this.tools = h("section", { class: "tools", "aria-labelledby": "h2-tools" },
      h("h2", { id: "h2-tools", class: "sr-only" }, t("editor.h2.tools")),
      h("div", { class: "tools__row" },
        key("pencil", "pencil", { onClick: (e) => this.toolTap("pencil", e.currentTarget), pressed: true }),
        key("eraser", "eraser", { onClick: (e) => this.toolTap("eraser", e.currentTarget), pressed: false }),
        key("fill", "fill", { onClick: () => this.setTool("fill"), pressed: false }),
        moveKey,
        colorKey,
        h("span", { class: "tools__gap", "aria-hidden": "true" }),
        key("undo", "undo", { onClick: () => this.doUndo() }),
        key("redo", "redo", { onClick: () => this.doRedo() }),
        key("more", "more", { cls: "tool-key--phone", onClick: (e) => this.openMore(e.currentTarget) })));

    // Desktop side panel
    this.panel = h("aside", { class: "panel" });
    this.renderPanel();

    // Strip + playback
    this.frames = h("section", { class: "frames", "aria-labelledby": "h2-frames" },
      h("h2", { id: "h2-frames", class: "sr-only" }, t("editor.h2.frames")), this.strip.el);
    this.playbar = this.buildPlaybar();

    this.body = h("div", { class: "editor__body" }, this.canvasRegion, this.tools, this.panel);
    this.section.append(this.topbar, this.w2, this.w3);
    if (doc.isLesson) {
      this.lessonMode = new LessonMode(this);
      this.section.append(this.lessonMode.el);
      this.section.classList.add("editor--lesson");
      this.body.insertBefore(this.lessonMode.stepsCard, this.panel);
    }
    this.section.append(this.body, this.frames, this.playbar);

    this.strip.render();
    this.select(0, { instantScroll: true });
    requestAnimationFrame(() => this.strip.centerOn(this.cur));

    this.input = new DrawingInput({
      canvas: this.stage.display,
      getFrame: () => this.frame,
      getTool: () => this.tool,
      getColor: () => this.color,
      getWidthPx: () => DrawingInput.widthPx(this.tool, this.tool === "eraser" ? this.eraserWidth : this.pencilWidth),
      undo: this.undo,
      canEdit: (f) => !f.locked,
      onBlocked: () => this.lessonMode?.onBlocked(),
      onChange: () => this.stage.queue(() => this.frame),
      onStrokeEnd: (f) => this.afterEdit(f),
      onCancel: () => this.autosaver?.strokeEnded(), // the restored frame was marked changed: save it again
      isPlaying: () => this.player.playing,
      onTapWhilePlaying: () => this.player.stop(),
    });

    this.autosaver = new Autosaver(doc, {
      onStatus: (s, info) => this.onSaveStatus(s, info),
      onSaved: () => this.afterSave(),
      onConflict: () => this.showConflict(),
      activeStroke: () => this.input?.active || null,
    });
    this.cleanups.push(onPeerMessage((msg) => this.onPeerSaved(msg)));
    // The frame, tool and colour survive a reload of this tab (F13).
    const keepView = () => { if (document.visibilityState === "hidden") this.saveView(); };
    const keepViewNow = () => this.saveView();
    document.addEventListener("visibilitychange", keepView);
    addEventListener("pagehide", keepViewNow);
    this.cleanups.push(() => { document.removeEventListener("visibilitychange", keepView); removeEventListener("pagehide", keepViewNow); });
    // "נשמר" means everything on the screen is stored (R1): the label follows a stroke from
    // its first pixel, and goes back by itself when a stroke is cancelled. DrawingInput's own
    // listeners were added first, so `input.active` is already up to date here.
    for (const type of ["pointerdown", "pointerup", "pointercancel", "lostpointercapture"]) {
      this.stage.display.addEventListener(type, () => this.autosaver.refresh());
    }

    const ro = new ResizeObserver(() => this.fitStage());
    ro.observe(this.canvasRegion);
    this.cleanups.push(() => ro.disconnect());
    const onKey = (e) => this.onKey(e);
    document.addEventListener("keydown", onKey);
    this.cleanups.push(() => document.removeEventListener("keydown", onKey));
    this.cleanups.push(on("w2", (e) => this.renderW2(e)));
    const mq = matchMedia("(min-width: 1024px)");
    const onMq = () => this.renderPanel();
    mq.addEventListener("change", onMq);
    this.cleanups.push(() => mq.removeEventListener("change", onMq));
    checkNearlyFull({ force: true });
    this.refreshColorKey();
    this.refreshToolKeys();
    this.checkLowMemory();
  }

  renderPanel() {
    clear(this.panel);
    if (!isDesktop()) return;
    // Lessons are drawn for 480x360: no canvas size control there (R9).
    this.panel.append(...[
      h("div", { class: "panel-group" }, h("h3", { class: "panel-title" }, t("colors.title")), colorPanel(this, { context: "panel" })),
      onionPanel(this),
      this.doc.isLesson ? null : sizePanel(this),
      clearButton(this)].filter(Boolean));
  }

  buildPlaybar() {
    const doc = this.doc;
    this.playBtn = h("button", { class: "play-btn", type: "button", onclick: () => this.togglePlay() });
    this.playLabel = h("span", { class: "play-label", dir: "rtl" });
    const prev = this.prevBtn = h("button", { class: "icon-btn film__btn", type: "button", "aria-label": t("play.prev"), title: t("play.prev.tooltip"), onclick: () => this.step(-1) }, iconEl("stepPrev"));
    const next = this.nextBtn = h("button", { class: "icon-btn film__btn", type: "button", "aria-label": t("play.next"), title: t("play.next.tooltip"), onclick: () => this.step(1) }, iconEl("stepNext"));
    this.fpsBtns = [6, 12, 24].map((fps) => h("button", {
      class: "fps-btn num", type: "button", "aria-pressed": String(doc.project.fps === fps), "aria-label": t("play.fps.option.aria", { fps }),
      onclick: () => this.setFps(fps),
    }, t("play.fps.option", { fps })));
    const fpsGroup = h("div", { class: "fps", role: "group", "aria-label": t("play.fps.label"), title: t("play.fps.tooltip") }, ...this.fpsBtns);
    this.modeBtn = h("button", { class: "mode-btn film__btn", type: "button", title: t("play.mode.tooltip"), onclick: () => this.toggleMode() });
    const bar = h("section", { class: "playbar film", dir: "ltr", "aria-labelledby": "h2-playback" },
      h("h2", { id: "h2-playback", class: "sr-only", dir: "rtl" }, t("editor.h2.playback")),
      prev, h("div", { class: "play-wrap" }, this.playBtn, this.playLabel), next, fpsGroup, this.modeBtn);
    this.refreshPlaybar();
    return bar;
  }

  refreshPlaybar() {
    const playing = this.player?.playing;
    const single = this.doc.count < 2;
    this.playBtn.replaceChildren(iconEl(playing ? "stop" : "play", { size: 26 }));
    this.playBtn.setAttribute("aria-label", t(playing ? "play.stop.aria" : "play.play.aria"));
    this.playBtn.title = single ? t("play.play.disabled") : t(playing ? "play.stop" : "play.play");
    this.playBtn.setAttribute("aria-disabled", String(single && !playing));
    this.playLabel.textContent = t(playing ? "play.stop" : "play.play");
    // At either end one step button has nowhere to go. aria-disabled, so a focused button
    // keeps focus while stepping. During Play both stay live: a step also stops playback.
    this.prevBtn.setAttribute("aria-disabled", String(!playing && this.cur <= 0));
    this.nextBtn.setAttribute("aria-disabled", String(!playing && this.cur >= this.doc.count - 1));
    const mode = this.doc.project.playMode;
    const modeText = t(mode === "pingpong" ? "play.mode.pingpong" : "play.mode.loop");
    this.modeBtn.replaceChildren(iconEl(mode === "pingpong" ? "pingpong" : "loop"), h("span", { class: "mode-btn__label", dir: "rtl" }, modeText));
    this.modeBtn.setAttribute("aria-label", t("play.mode.aria", { mode: modeText }));
    this.fpsBtns.forEach((b, i) => b.setAttribute("aria-pressed", String([6, 12, 24][i] === this.doc.project.fps)));
  }

  fitStage() {
    const cs = getComputedStyle(this.canvasRegion);
    const r = {
      width: this.canvasRegion.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight),
      height: this.canvasRegion.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - 8,
    };
    if (r.width <= 0 || r.height <= 0) return;
    const aspect = this.doc.width / this.doc.height;
    let w = Math.min(r.width, r.height * aspect);
    if (isDesktop()) {
      const steps = [2, 1.5, 1.25, 1].map((s) => s * this.doc.width).filter((sw) => sw <= w + 0.5);
      if (steps.length) w = steps[0];
    }
    // Phones and tablets: plain fit, no 240px floor. The floor only ever acted when the region
    // was height-bound, and then it pushed the stage over the tool row (landscape phones).
    this.stage.el.style.width = `${Math.floor(w)}px`;
    this.stage.el.style.height = `${Math.floor(w / aspect)}px`;
  }

  // ---------- frames ----------
  get frame() {
    return this.doc.frames[this.cur];
  }

  currentIndex() {
    return this.cur;
  }

  select(i, { instantScroll = false } = {}) {
    if (!this.doc.frames[i]) return;
    this.cur = i;
    this.undo.setCurrent(this.frame.id);
    this.stage.show(this.frame);
    this.stage.renderOnion(this.doc.frames, i, this.doc.project.onion);
    this.strip.setCurrent(i, { instant: instantScroll });
    this.stage.display.setAttribute("aria-label", t("editor.canvas.aria", { n: i + 1, total: this.doc.count }));
    this.stage.lock.hidden = !this.frame.locked;
    if (this.frame.locked) {
      this.stage.lock.replaceChildren(iconEl("lock", { size: 16 }));
      this.stage.lock.setAttribute("aria-label", t("lessonMode.lock.aria"));
      this.stage.lock.setAttribute("role", "img");
    }
    this.lessonMode?.onFrameChange();
    this.refreshUndoButtons();
    this.refreshPlaybar();
    this.advanceCoach("select");
  }

  step(d) {
    if (this.player.playing) this.player.stop();
    const n = this.doc.count;
    this.select(Math.max(0, Math.min(n - 1, this.cur + d)));
  }

  async addFrame() {
    if (this.player.playing) this.player.stop();
    if (!(await this.roomForFrame())) return;
    this.insertAt(this.cur, null);
  }

  insertAt(index, copyFrom) {
    const f = this.doc.insertFrame(index, copyFrom);
    this.rememberOrder();
    this.strip.render();
    const cell = this.strip.cells[index + 1];
    cell?.classList.add("is-new");
    this.select(index + 1);
    this.autosaver.frameOp();
    announce(t("toast.frameAdded.aria", { n: index + 2 }));
    this.checkLowMemory();
    return f;
  }

  /** Duplicates frame i. During Play it stops first and copies the frame it stopped on. */
  async duplicateFrame(i) {
    if (this.player.playing) {
      this.player.stop();
      i = this.cur;
    }
    if (!(await this.roomForFrame())) return;
    this.insertAt(i, this.doc.frames[i]);
    toast(t("toast.frameDuplicated", { n: i + 1 }), { owner: this });
  }

  async insertBlank(i) {
    if (this.player.playing) {
      this.player.stop();
      i = this.cur;
    }
    if (!(await this.roomForFrame())) return;
    this.insertAt(i, null);
  }

  deleteFrame(i) {
    if (this.doc.count <= 1 || this.doc.isLesson) return;
    if (this.player.playing) this.player.stop();
    this.rememberOrder();
    const frame = this.doc.removeFrame(i);
    const rec = { frame, restored: false, toastClosed: false, toast: null };
    // K4: Ctrl+Z brings the last deleted frame back for as long as no newer step exists.
    rec.restore = () => Promise.resolve(this.restoreFrame(rec, { viaUndo: true }));
    this.trash.set(frame.id, rec);
    this.frameRestore = rec.restore;
    this.strip.render();
    this.select(Math.min(i, this.doc.count - 1));
    this.autosaver.frameOp();
    rec.toast = toast(t("toast.frameDeleted", { n: i + 1 }), {
      timerMs: 5000,
      owner: this,
      announce: t("toast.frameDeleted.aria", { n: i + 1 }),
      returnFocus: () => this.strip.cells[this.cur],
      action: { label: t("common.undo"), onClick: () => this.restoreFrame(rec) },
      onClose: () => {
        rec.toastClosed = true;
        this.emptyTrash();
      },
    });
    this.emptyTrash();
  }

  setHold(i, hold) {
    const f = this.doc.frames[i];
    if (!f || f.hold === hold) return;
    f.hold = hold;
    f.metaDirty = true;
    this.strip.updateCell(i);
    this.autosaver.frameOp();
  }

  reorder(from, to) {
    const currentId = this.frame.id;
    this.doc.moveFrame(from, to);
    this.rememberOrder();
    this.strip.render();
    this.select(this.doc.indexOf(currentId), { instantScroll: true });
    announce(t("strip.reorder.done.aria", { from: from + 1, to: to + 1 }));
    this.autosaver.frameOp();
  }

  /** True when one more frame fits. At 120 frames it says why not (R25); a full disk opens W2b. */
  async roomForFrame() {
    if (!this.doc.canAdd()) {
      if (!this.doc.isLesson) toast(t("w4.add.disabled"), { id: "w4-max", owner: this });
      return false;
    }
    if (await isFull()) {
      showW2b(this.doc);
      return false;
    }
    return !this.disposed && this.doc.canAdd(); // a second fast press may have filled the film meanwhile
  }

  /** Deleted frames that can still come back: frame id to { frame, restore(), toast } (R22). */
  get trash() {
    return (this.deletedFrames ??= new Map());
  }

  /** Keeps the frame order with the restorable deleted frames in their old places (core/frame-order.js). */
  rememberOrder() {
    this.ghostOrder = syncGhost(this.ghostOrder || [], this.doc.frames.map((f) => f.id), this.trash);
  }

  /** Puts a deleted frame back next to the neighbour it had, never at a stored index (R22).
   *  Returns false when it was refused: the film already holds 120 frames. */
  restoreFrame(rec, { viaUndo = false } = {}) {
    if (this.disposed || rec.restored || !this.trash.has(rec.frame.id)) return false;
    if (this.doc.count >= MAX_FRAMES) {
      toast(t("toast.frameRestore.full"), { id: "restore-full", owner: this });
      if (viaUndo && !this.frameRestore) this.frameRestore = rec.restore; // still the last deleted frame
      return false;
    }
    if (this.player.playing) this.player.stop();
    const index = restoreIndex(this.ghostOrder || [], this.doc.frames.map((f) => f.id), rec.frame.id);
    rec.restored = true;
    this.trash.delete(rec.frame.id);
    if (this.frameRestore === rec.restore) this.frameRestore = null;
    this.doc.restoreFrame(rec.frame, index);
    this.rememberOrder();
    this.strip.render();
    this.select(index);
    this.autosaver.frameOp();
    rec.toast?.close();
    announce(t("toast.frameRestored.aria", { n: index + 1 }));
    return true;
  }

  /** Forgets deleted frames that nothing can bring back: toast closed, and not the Ctrl+Z frame. */
  emptyTrash() {
    for (const [id, rec] of this.trash) {
      if (!rec.toastClosed || this.frameRestore === rec.restore) continue;
      this.trash.delete(id);
      this.undo.dropFrame(id);
    }
  }

  closeCoach() {
    this.coach?.close();
    this.coach = this.coachKey = null;
  }

  openFrameMenu(i, anchor) {
    if (this.player.playing) return;
    const s = openSheet({
      title: t("frameMenu.title", { n: i + 1 }),
      body: frameMenu(this, i, { onDone: () => s.close() }),
      anchor,
      owner: this,
    });
  }

  // ---------- tools ----------
  toolTap(name, el) {
    if (this.tool === name) {
      const s = openSheet({
        title: t(name === "eraser" ? "tool.eraser.sheet" : "tool.pencil.sheet"),
        body: widthPanel(this, name, { onDone: () => s.close() }),
        anchor: el,
        side: isDesktop() ? this.tools : null, // K8: beside the tool rail, not over it
        owner: this,
      });
      return;
    }
    this.setTool(name);
  }

  setTool(name) {
    this.tool = name;
    this.refreshToolKeys();
  }

  setWidth(which, k) {
    if (which === "eraser") this.eraserWidth = k;
    else this.pencilWidth = k;
    this.refreshToolKeys();
  }

  refreshToolKeys() {
    for (const name of ["pencil", "eraser", "fill", "move"]) this.toolKeys[name]?.setAttribute("aria-pressed", String(this.tool === name));
    const wName = (k) => t(`tool.width.${k}`);
    this.toolKeys.pencil.setAttribute("aria-label", t("tool.pencil.aria", { width: wName(this.pencilWidth) }));
    this.toolKeys.eraser.setAttribute("aria-label", t("tool.eraser.aria", { width: wName(this.eraserWidth) }));
    this.toolKeys.fill.setAttribute("aria-label", t("tool.fill.aria"));
    const more = this.toolKeys.more;
    more.setAttribute("aria-label", t("tool.more.aria"));
    more.classList.toggle("is-move", this.tool === "move");
    more.replaceChildren(iconEl(this.tool === "move" ? "move" : "more"), h("span", { class: "tool-key__label" }, t("tool.more")));
    this.stage?.el.classList.toggle("stage--move", this.tool === "move");
  }

  /**
   * The slower follow-up of an edit (T-14): thumbnails, onion ghosts, lesson progress and coach
   * checks. afterEdit() queues it for after the next painted frame; anything that needs the
   * result at once (Space before Play) calls it directly.
   */
  flushEdits() {
    clearTimeout(this.editTimer);
    cancelAnimationFrame(this.editFrame);
    this.editTimer = null;
    const frames = this.editedFrames;
    this.editedFrames = null;
    if (!frames || this.disposed) return;
    let nearCurrent = false;
    for (const frame of frames) {
      const i = this.doc.frames.indexOf(frame);
      if (i < 0) continue; // deleted in the meantime
      if (Math.abs(i - this.cur) <= 2) nearCurrent = true;
      this.strip.updateCell(i);
      this.lessonMode?.afterStroke(i);
    }
    // The current frame counts too: its own opaque paint decides where ghosts go on top (R12).
    if (nearCurrent) this.stage.renderOnion(this.doc.frames, this.cur, this.doc.project.onion);
    this.advanceCoach("stroke");
  }

  /** Persisted, newest first, at most 7, never a base swatch (settings.recentColors). */
  get recentColors() {
    return getSettings().recentColors || [];
  }

  get shadesOpen() {
    return !!getSettings().shadesOpen;
  }

  setShadesOpen(open) {
    updateSettings({ shadesOpen: open });
  }

  /** Any non-base pick (a shade, a recent chip, "צבע אחר") is remembered in recentColors. */
  setColor(hex) {
    hex = hex.toUpperCase();
    this.color = hex;
    if (!isBaseColor(hex)) rememberColor(hex);
    if (this.tool === "eraser" || this.tool === "move") this.setTool("pencil");
    this.refreshColorKey();
  }

  refreshColorKey() {
    this.colorDot.style.setProperty("--swatch", this.color);
    const name = colorName(this.color);
    this.toolKeys.color.setAttribute("aria-label", t("tool.color.aria", { colorName: name }));
    this.toolKeys.color.title = t("tool.color.tooltip", { colorName: name });
  }

  openColors(anchor) {
    const body = colorPanel(this, { onPick: () => s.close() });
    const s = openSheet({ title: t("colors.title"), body, anchor, owner: this, className: this.shadesOpen ? "sheet--tall" : "" });
    body.afterOpen?.();
  }

  /** Desktop: the whole shade chart in a popover beside the side panel. It is a registered
   *  sheet, so the router's closeAllSheets() closes it on any route change (Back). */
  openShadesPopover(toggle, body, onClose) {
    return openSheet({
      title: t("colors.shades.title"), body, anchor: toggle, side: this.panel, className: "sheet--shades", owner: this,
      onClose,
    });
  }

  openMore(anchor) {
    const s = openSheet({
      title: t("more.title"),
      body: h("div", { class: "more-sheet" }, ...[moveButton(this, { onDone: () => s.close() }), onionPanel(this),
        this.doc.isLesson ? null : sizePanel(this), clearButton(this)].filter(Boolean)),
      anchor,
      owner: this,
    });
    this.moreSheet = s;
  }

  setOnion(patch) {
    this.doc.project.onion = { ...this.doc.project.onion, ...patch };
    this.doc.projectDirty = true;
    this.stage.renderOnion(this.doc.frames, this.cur, this.doc.project.onion);
    // Every onion control on screen (side panel, More sheet) follows the state, whoever changed it (the O key too).
    onionPanel.sync(document, this.doc.project.onion);
    this.autosaver.strokeEnded();
  }

  setFps(fps) {
    this.doc.project.fps = fps;
    this.doc.projectDirty = true;
    this.refreshPlaybar();
    this.autosaver.strokeEnded();
    if (this.player.playing) { this.player.stop(); this.player.start(); }
  }

  toggleMode() {
    this.doc.project.playMode = this.doc.project.playMode === "loop" ? "pingpong" : "loop";
    this.doc.projectDirty = true;
    this.refreshPlaybar();
    this.autosaver.strokeEnded();
    if (this.player.playing) { this.player.stop(); this.player.start(); }
  }

  async requestResize(w, hgt) {
    if (this.doc.isLesson) return; // lesson drawings and guides are made for 480x360 (R9)
    if (w === this.doc.width && hgt === this.doc.height) return;
    if (this.input?.active || this.player?.playing) return this.renderPanel();
    this.moreSheet?.close();
    if (this.doc.hasContent()) {
      // One body per direction, and both say that the steps back are gone (R9).
      const ok = await confirmDialog({
        owner: this,
        title: t("confirm.resize.title"), body: t(w === hgt ? "confirm.resize.body.square" : "confirm.resize.body.wide"),
        confirmLabel: t("confirm.resize.ok"), cancelLabel: t("confirm.resize.cancel"),
      });
      if (!ok || this.disposed) { if (!this.disposed) this.renderPanel(); return; }
    }
    // What a crop cuts off stays in memory until the Editor is left: changing back restores
    // every frame that was not edited in between (Doc.resize). Undo patches are in the old
    // coordinates, so they cannot survive.
    this.doc.resize(w, hgt);
    this.stage.setSize(w, hgt);
    this.undo.clear();
    this.frameRestore = null;
    this.strip.render();
    this.select(this.cur);
    this.fitStage();
    this.renderPanel();
    toast(t(w === hgt ? "toast.canvasResized.square" : "toast.canvasResized.wide"));
    this.autosaver.frameOp();
  }

  clearFrame() {
    if (this.disposed) return; // a stale sheet must never write (Critic F1)
    this.moreSheet?.close();
    if (this.input?.active || this.player?.playing) return;
    const f = this.frame;
    if (f.locked) return this.lessonMode?.onBlocked();
    const before = this.undo.begin(f);
    f.ctx.clearRect(0, 0, f.canvas.width, f.canvas.height);
    // In a lesson the frame goes back to its prepared drawing, not to empty (R16, contract K5).
    this.lessonMode?.paintPrepared?.(f, this.cur);
    // Nothing changed (already empty, or already the prepared drawing): no step, no toast.
    if (!this.undo.commit(f, { x: 0, y: 0, w: f.canvas.width, h: f.canvas.height }, before)) return;
    f.touch();
    this.afterEdit(f);
    toast(t("toast.frameCleared"), { owner: this, action: { label: t("common.undo"), onClick: () => this.doUndo(f) } });
  }

  /** No frame given (the key, the tool button): a just-deleted frame comes back first (contract K4). */
  async doUndo(frame = null) {
    if (this.disposed || this.input?.active || this.player.playing) return;
    if (!frame && this.frameRestore) {
      const restore = this.frameRestore;
      this.frameRestore = null;
      try { return await restore(); } finally { this.refreshUndoButtons(); }
    }
    frame = frame || this.frame;
    if (this.doc.frames.indexOf(frame) < 0 || !(await this.undo.undo(frame))) return;
    this.afterEdit(frame);
  }

  async doRedo(frame = this.frame) {
    if (this.disposed || this.input?.active || this.player.playing || !(await this.undo.redo(frame))) return;
    this.afterEdit(frame);
  }

  refreshUndoButtons() {
    if (!this.toolKeys) return;
    const id = this.frame?.id;
    const canU = !!this.frameRestore || (!!id && this.undo.canUndo(id));
    const canR = !!id && this.undo.canRedo(id);
    this.toolKeys.undo.disabled = !canU;
    this.toolKeys.redo.disabled = !canR;
    this.toolKeys.undo.setAttribute("aria-label", t(canU ? "tool.undo.aria" : "tool.undo.disabled.aria"));
    this.toolKeys.redo.setAttribute("aria-label", t(canR ? "tool.redo.aria" : "tool.redo.disabled.aria"));
    this.toolKeys.undo.title = t(canU ? "tool.undo.tooltip" : "tool.undo.disabled.tooltip");
    this.toolKeys.redo.title = t(canR ? "tool.redo.tooltip" : "tool.redo.disabled.tooltip");
  }

  /**
   * After any pixel change on a frame. At once: the canvas, the undo buttons, the save.
   * After the next painted frame (flushEdits): thumbnail, onion, lesson progress, coach (T-14).
   */
  afterEdit(frame) {
    if (this.frameRestore) {
      this.frameRestore = null; // a newer step exists: Ctrl+Z means this step now (contract K4)
      this.emptyTrash(); // and a deleted frame whose toast is gone can no longer come back
    }
    if (this.doc.frames.indexOf(frame) === this.cur) this.stage.show(frame);
    this.refreshUndoButtons();
    this.autosaver.strokeEnded();
    (this.editedFrames ||= new Set()).add(frame);
    if (this.editTimer) return;
    const run = () => this.flushEdits();
    this.editFrame = requestAnimationFrame(() => setTimeout(run, 0));
    this.editTimer = setTimeout(run, 150); // a hidden tab gets no animation frame
  }

  // ---------- playback ----------
  togglePlay() {
    if (this.doc.count < 2 && !this.player.playing) {
      // The reason is a hover tooltip only; a tap must hear it too (audit F12).
      toast(t("play.play.disabled"), { id: "play-disabled", owner: this });
      return;
    }
    this.playBtn.classList.remove("is-pressed");
    void this.playBtn.offsetWidth;
    this.playBtn.classList.add("is-pressed");
    this.player.toggle();
  }

  onPlayStart() {
    this.input.cancelActive();
    this.refreshPlaybar();
    this.stage.display.setAttribute("aria-label", t("editor.canvas.playing.aria"));
    announce(t("play.started.aria", { fps: this.doc.project.fps }));
    this.lessonMode?.onPlayStart();
    this.advanceCoach("play");
  }

  onPlayStop(i) {
    this.select(i);
    this.refreshPlaybar();
    announce(t("play.stopped.aria", { n: i + 1 }));
    this.lessonMode?.onPlayStop();
  }

  firstPlayLine() {
    updateSettings({ firstPlaySeen: true });
    showCoach(this.strip.gate, t("firstPlay.line"), { closable: false, timeoutMs: 2500, className: "coach--first-play" });
  }

  // ---------- coach marks (free and challenge projects, first session) ----------
  startCoach() {
    if (!this.doc || this.doc.isLesson) return;
    this.coachOn = true;
    this.advanceCoach("start");
  }

  /**
   * The tip follows what the child did, not frame 1 (R28). The facts: how many frames have
   * ink, how many frames there are, and whether the frame on screen is still empty.
   *   no ink anywhere                    tip 1 at the canvas
   *   ink, one frame                     tip 2 at "+"
   *   two or more frames, one with ink   tip 1's text at the canvas while the frame on screen
   *                                      is empty; on the drawn frame itself, tip 2 at "+"
   *   two or more frames with ink        tip 3 at Play
   * A stage that was reached, or closed with X, is never shown again (coach1Seen..coach3Seen).
   */
  advanceCoach(event) {
    if (!this.coachOn || !this.doc || this.disposed) return;
    const s = getSettings();
    if (s.coach1Seen && s.coach2Seen && s.coach3Seen) return this.closeCoach();
    if (event === "play") {
      if (!s.coach3Seen) updateSettings({ coach3Seen: true }); // Play was found: tip 3 has nothing left to say
      return this.closeCoach();
    }
    if (this.player.playing) return;
    let inked = 0;
    for (const f of this.doc.frames) if (frameHasInk(f) && ++inked === 2) break;
    const reached = {};
    let want = null;
    if (!inked) want = { key: "1", target: this.stage.el, text: t("coach.1"), flag: "coach1Seen" };
    else {
      if (!s.coach1Seen) reached.coach1Seen = true;
      if (inked === 2) {
        if (!s.coach2Seen) reached.coach2Seen = true;
        want = { key: "3", target: this.playBtn, text: t("coach.3"), flag: "coach3Seen" };
      } else if (this.doc.count > 1 && !frameHasInk(this.frame)) want = { key: "1b", target: this.stage.el, text: t("coach.1"), flag: "coach2Seen" };
      else want = { key: "2", target: this.strip.addBtn, text: t("coach.2"), flag: "coach2Seen" };
    }
    if (Object.keys(reached).length) updateSettings(reached);
    if ({ ...s, ...reached }[want.flag]) return this.closeCoach();
    if (this.coach && this.coachKey === want.key) return;
    this.closeCoach();
    const key = want.key;
    this.coachKey = key;
    // Tips 2 and 3 point down from over the canvas: never over the strip or the tool row.
    const clearOf = want.target === this.stage.el ? null : () => (isDesktop() ? [this.frames, this.playbar] : [this.tools, this.frames, this.playbar]);
    this.coach = showCoach(want.target, want.text, {
      clearOf,
      keepBelow: () => this.topbar,
      onClose: (byUser) => {
        if (this.coachKey === key) this.coach = this.coachKey = null;
        if (byUser) updateSettings({ [want.flag]: true });
      },
    });
  }

  // ---------- saving and warnings ----------
  setTitle(value) {
    const v = truncate(value, TITLE_MAX);
    const title = v.trim() || this.fallbackTitle;
    this.doc.project.title = title;
    this.doc.projectDirty = true;
    if (this.doc.project.touched === false) this.doc.project.touched = true; // a rename makes it the user's own (R5)
    this.h1.textContent = title;
    this.router.setTitle(title);
    this.autosaver.strokeEnded();
  }

  setStatus(state) {
    const map = {
      saving: ["hold", "editor.status.saving"],
      saved: ["check", "editor.status.saved"],
      failed: ["warn", "editor.status.failed"],
    };
    if (state === this.statusState) return; // same words: nothing for a screen reader to hear again
    this.statusState = state;
    const [ic, key] = map[state];
    this.status.className = `save-status save-status--${state}`;
    const content = [iconEl(ic, { size: 18 }), h("span", {}, t(key))];
    // A control only when there is something to act on: the failed state leads to the W3 strip.
    this.status.replaceChildren(...(state === "failed"
      ? [h("button", { class: "save-status__btn", type: "button", "aria-label": t("editor.status.failed.aria"), onclick: () => this.w3?.querySelector("button")?.focus() }, ...content)]
      : content));
  }

  onSaveStatus(state, info = {}) {
    if (this.disposed) return;
    this.setStatus(state);
    this.w3.hidden = state !== "failed";
    if (state === "failed") addEventListener("beforeunload", this.onBeforeUnload);
    else removeEventListener("beforeunload", this.onBeforeUnload);
    if (state !== "failed" && info.recovered) toast(t("w3.recovered"));
  }

  afterSave() {
    const p = this.doc.project;
    if (p.kind === "challenge" && !getProgress().challengeWeeks.includes(p.challengeWeek)) {
      const nonEmpty = this.doc.frames.filter((f) => frameHasInk(f)).length;
      if (nonEmpty >= 2) {
        updateProgress((pr) => { pr.challengeWeeks.push(p.challengeWeek); });
        toast(t("challenge.stamp.toast")); // once: the week is in the list from here on
      }
    }
  }

  downloadFromMemory() {
    const name = downloadDocFile(this.doc);
    toast(t("export.done.project", { filename: name, title: this.doc.project.title })); // K6: both, the string picks one
  }

  renderW2(e) {
    if (!this.w2) return;
    clear(this.w2);
    this.w2.hidden = !e;
    if (!e) return;
    this.w2.append(
      iconEl("warn", { size: 18 }),
      h("span", { class: "w2-strip__text" }, t("w2.text", { percent: Math.round(e.ratio * 100) })),
      h("a", { class: "w2-strip__action", href: "#/gallery", "aria-label": t("w2.action.aria") }, t("w2.action")));
  }

  showW5() {
    if (w5ShownThisSession) return;
    w5ShownThisSession = true;
    toast(t("w5.text"), { persistent: true, closeLabel: t("w5.close"), icon: "warn", warn: true, id: "w5" });
  }

  checkLowMemory() {
    const dm = navigator.deviceMemory;
    if (typeof dm === "number" && dm <= 2 && this.doc.count >= 60) this.showW5();
  }

  async makeMine() {
    await this.autosaver.saveNow();
    const copy = await duplicateProject(this.doc.project.id);
    if (!copy) return;
    toast(t("lessonDone.madeMine.toast", { title: copy.title }));
    location.hash = `#/editor/${copy.id}`;
  }

  // ---------- export overlay ----------
  async openExport() {
    // One opening at a time: the two awaits below leave room for a second call (Export, Back,
    // Export in quick succession), which would otherwise stack a second overlay.
    if (this.exportCtl || this.exportOpening) return;
    this.exportOpening = true;
    try {
      if (this.player.playing) this.player.stop();
      const { openExportOverlay } = await import("../export/overlay.js");
      if (this.disposed) return;
      await this.autosaver.saveNow();
      // The route may have moved on meanwhile: open only if it still asks for the overlay.
      if (this.disposed || this.exportCtl || !/\/export$/.test(location.hash)) return;
      this.exportCtl = openExportOverlay(this, {
        onClose: (fromRoute) => {
          this.exportCtl = null;
          this.router.setTitle(this.doc.project.title);
          if (!fromRoute) this.router.closeOverlay(`#/editor/${this.doc.project.id}`);
        },
      });
      this.router.setTitle(t("meta.title.export"));
    } finally {
      this.exportOpening = false;
    }
  }

  // ---------- keyboard ----------
  onKey(e) {
    if (!this.doc || document.querySelector("dialog[open]")) return;
    const tag = e.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.target.isContentEditable) return;
    const mod = e.ctrlKey || e.metaKey;
    // While a stroke is open no key changes anything: undo under the pen, a frame switch or a
    // tool change in the middle of a gesture all corrupted the step being drawn (T-04).
    const stroke = !!this.input?.active;
    if (mod && (e.code === "KeyZ" || e.code === "KeyY")) {
      e.preventDefault();
      if (stroke) return;
      return e.code === "KeyY" || e.shiftKey ? this.doRedo() : this.doUndo();
    }
    if (mod || e.altKey) return;
    if (e.code === "Space") {
      // Space is Play or Stop wherever the focus is (R11); Enter activates the focused control.
      // The key-up would click a focused button as well, so it is swallowed once.
      e.preventDefault();
      if (!this.spaceUp) {
        this.spaceUp = (ev) => { if (ev.code === "Space" && this.spaceDown) { this.spaceDown = false; ev.preventDefault(); } };
        document.addEventListener("keyup", this.spaceUp, true);
        this.cleanups.push(() => document.removeEventListener("keyup", this.spaceUp, true));
      }
      this.spaceDown = true;
      if (stroke || e.repeat) return;
      this.flushEdits(); // lesson progress of the last stroke is settled before Play
      return this.togglePlay();
    }
    if (e.code === "ArrowRight" || e.code === "ArrowLeft") {
      e.preventDefault();
      return stroke ? undefined : this.step(e.code === "ArrowRight" ? 1 : -1);
    }
    // Single-letter shortcuts can be switched off in Settings (R13, contract K2). Missing means on.
    if (stroke || getSettings().letterShortcuts === false) return;
    switch (e.code) {
      case "KeyB": return this.setTool("pencil");
      case "KeyE": return this.setTool("eraser");
      case "KeyG": return this.setTool("fill");
      case "KeyV": return this.setTool("move");
      case "Digit1": case "Digit2": case "Digit3": {
        const k = { Digit1: "s", Digit2: "m", Digit3: "l" }[e.code];
        return this.setWidth(this.tool === "eraser" ? "eraser" : "pencil", k);
      }
      case "KeyO": {
        const enabled = !this.doc.project.onion.enabled;
        this.setOnion({ enabled });
        return announce(t(enabled ? "onion.toggle.on.aria" : "onion.toggle.off.aria"));
      }
      case "KeyN": return this.addFrame();
      case "KeyD": return this.duplicateFrame(this.cur);
      default:
    }
  }
}
