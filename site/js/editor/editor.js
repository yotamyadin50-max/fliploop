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
import { UndoManager } from "./undo.js";
import { DrawingInput, WIDTHS } from "./drawing.js";
import { LessonMode } from "./lesson-mode.js";
import { colorPanel, onionPanel, sizePanel, clearButton, moveButton, widthPanel, frameMenu, colorName, isBaseColor } from "./panels.js";
import { Autosaver } from "../store/autosave.js";
import { getSettings, updateSettings, getProgress, updateProgress, rememberColor } from "../store/settings.js";
import { isFull, checkNearlyFull } from "../store/storage.js";
import { downloadDocFile } from "../store/project-file.js";
import { duplicateProject, TITLE_MAX, nextDefaultTitle } from "../store/projects.js";
import { lessonText } from "../data/lessons.js";
import { showW2b } from "../ui/warnings.js";

let w5ShownThisSession = false;

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
  }

  // ---------- lifecycle ----------
  async mount({ id, overlay }) {
    this.projectId = id;
    this.renderLoading();
    let doc = null;
    try {
      doc = await Doc.load(id);
    } catch (err) {
      console.error("Editor load failed", err);
    }
    if (this.disposed) return;
    if (!doc) {
      this.renderNotFound();
      this.router.setTitle(t("meta.title.notFound"));
      return;
    }
    this.doc = doc;
    this.fallbackTitle = await nextDefaultTitle(id);
    if (this.disposed) return;
    this.build();
    this.router.setTitle(doc.project.title);
    if (overlay === "export") this.openExport();
    this.startCoach();
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
    this.player?.stop();
    this.exportCtl?.close({ fromRoute: true });
    this.coach?.close();
    this.cleanups.forEach((fn) => fn());
    this.input?.destroy();
    await this.autosaver?.dispose();
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
      openMenu: (i, el) => this.openFrameMenu(i, el),
      add: () => this.addFrame(),
      reorder: (a, b) => this.reorder(a, b),
      canReorder: () => !this.doc.isLesson,
      isPlaying: () => this.player?.playing,
      frameState: (i) => ({ done: this.lessonMode ? this.lessonMode.done.get(i) : true }),
      hint: (text) => toast(text),
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
    this.status = h("button", { class: "save-status", type: "button", onclick: () => this.w3?.querySelector("button")?.focus() });
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
      getWidthPx: () => WIDTHS[this.tool === "eraser" ? this.eraserWidth : this.pencilWidth],
      undo: this.undo,
      canEdit: (f) => !f.locked,
      onBlocked: () => this.lessonMode?.onBlocked(),
      onChange: () => this.stage.queue(() => this.frame),
      onStrokeEnd: (f) => this.afterEdit(f),
      isPlaying: () => this.player.playing,
      onTapWhilePlaying: () => this.player.stop(),
    });

    this.autosaver = new Autosaver(doc, {
      onStatus: (s, info) => this.onSaveStatus(s, info),
      onSaved: () => this.afterSave(),
    });

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
    this.panel.append(
      h("div", { class: "panel-group" }, h("h3", { class: "panel-title" }, t("colors.title")), colorPanel(this, { context: "panel" })),
      onionPanel(this),
      sizePanel(this),
      clearButton(this));
  }

  buildPlaybar() {
    const doc = this.doc;
    this.playBtn = h("button", { class: "play-btn", type: "button", onclick: () => this.togglePlay() });
    this.playLabel = h("span", { class: "play-label", dir: "rtl" });
    const prev = h("button", { class: "icon-btn film__btn", type: "button", "aria-label": t("play.prev"), title: t("play.prev.tooltip"), onclick: () => this.step(-1) }, iconEl("stepPrev"));
    const next = h("button", { class: "icon-btn film__btn", type: "button", "aria-label": t("play.next"), title: t("play.next.tooltip"), onclick: () => this.step(1) }, iconEl("stepNext"));
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
  }

  step(d) {
    if (this.player.playing) this.player.stop();
    const n = this.doc.count;
    this.select(Math.max(0, Math.min(n - 1, this.cur + d)));
  }

  async addFrame() {
    if (this.player.playing) this.player.stop();
    if (!this.doc.canAdd()) return;
    if (await isFull()) return showW2b(this.doc);
    this.insertAt(this.cur, null);
  }

  insertAt(index, copyFrom) {
    const f = this.doc.insertFrame(index, copyFrom);
    this.strip.render();
    const cell = this.strip.cells[index + 1];
    cell?.classList.add("is-new");
    this.select(index + 1);
    this.autosaver.frameOp();
    announce(t("toast.frameAdded.aria", { n: index + 2 }));
    this.checkLowMemory();
    this.advanceCoach("added");
    return f;
  }

  async duplicateFrame(i) {
    if (!this.doc.canAdd()) return;
    if (await isFull()) return showW2b(this.doc);
    this.insertAt(i, this.doc.frames[i]);
    toast(t("toast.frameDuplicated", { n: i + 1 }));
  }

  async insertBlank(i) {
    if (!this.doc.canAdd()) return;
    if (await isFull()) return showW2b(this.doc);
    this.insertAt(i, null);
  }

  deleteFrame(i) {
    if (this.doc.count <= 1 || this.doc.isLesson) return;
    const frame = this.doc.removeFrame(i);
    this.strip.render();
    this.select(Math.min(i, this.doc.count - 1));
    this.autosaver.frameOp();
    let restored = false;
    toast(t("toast.frameDeleted", { n: i + 1 }), {
      timerMs: 5000,
      action: { label: t("common.undo"), onClick: () => {
        restored = true;
        this.doc.restoreFrame(frame, i);
        this.strip.render();
        this.select(i);
        this.autosaver.frameOp();
      } },
    });
    setTimeout(() => { if (!restored) this.undo.dropFrame(frame.id); }, 5500);
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
    this.strip.render();
    this.select(this.doc.indexOf(currentId), { instantScroll: true });
    announce(t("strip.reorder.done.aria", { from: from + 1, to: to + 1 }));
    this.autosaver.frameOp();
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
      body: h("div", { class: "more-sheet" }, moveButton(this, { onDone: () => s.close() }), onionPanel(this), sizePanel(this), clearButton(this)),
      anchor,
      owner: this,
    });
    this.moreSheet = s;
  }

  setOnion(patch) {
    this.doc.project.onion = { ...this.doc.project.onion, ...patch };
    this.doc.projectDirty = true;
    this.stage.renderOnion(this.doc.frames, this.cur, this.doc.project.onion);
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
    if (w === this.doc.width && hgt === this.doc.height) return;
    this.moreSheet?.close();
    if (this.doc.hasContent()) {
      const ok = await confirmDialog({
        owner: this,
        title: t("confirm.resize.title"), body: t("confirm.resize.body"),
        confirmLabel: t("confirm.resize.ok"), cancelLabel: t("confirm.resize.cancel"),
      });
      if (!ok || this.disposed) { if (!this.disposed) this.renderPanel(); return; }
    }
    this.doc.resize(w, hgt);
    this.stage.setSize(w, hgt);
    this.undo.clear();
    this.strip.render();
    this.select(this.cur);
    this.fitStage();
    this.renderPanel();
    this.lessonMode?.recomputeAll();
    toast(t(w === hgt ? "toast.canvasResized.square" : "toast.canvasResized.wide"));
    this.autosaver.frameOp();
  }

  clearFrame() {
    if (this.disposed) return; // a stale sheet must never write (Critic F1)
    this.moreSheet?.close();
    const f = this.frame;
    if (f.locked) return this.lessonMode?.onBlocked();
    if (!frameHasInk(f)) return;
    const before = this.undo.begin(f);
    f.ctx.clearRect(0, 0, f.canvas.width, f.canvas.height);
    f.touch();
    this.undo.commit(f, { x: 0, y: 0, w: f.canvas.width, h: f.canvas.height }, before);
    this.afterEdit(f);
    toast(t("toast.frameCleared"), { action: { label: t("common.undo"), onClick: () => this.doUndo(f) } });
  }

  async doUndo(frame = this.frame) {
    if (this.player.playing || !(await this.undo.undo(frame))) return;
    this.afterEdit(frame);
  }

  async doRedo(frame = this.frame) {
    if (this.player.playing || !(await this.undo.redo(frame))) return;
    this.afterEdit(frame);
  }

  refreshUndoButtons() {
    if (!this.toolKeys) return;
    const id = this.frame?.id;
    const canU = !!id && this.undo.canUndo(id);
    const canR = !!id && this.undo.canRedo(id);
    this.toolKeys.undo.disabled = !canU;
    this.toolKeys.redo.disabled = !canR;
    this.toolKeys.undo.setAttribute("aria-label", t(canU ? "tool.undo.aria" : "tool.undo.disabled.aria"));
    this.toolKeys.redo.setAttribute("aria-label", t(canR ? "tool.redo.aria" : "tool.redo.disabled.aria"));
    this.toolKeys.undo.title = t(canU ? "tool.undo.tooltip" : "tool.undo.disabled.tooltip");
    this.toolKeys.redo.title = t(canR ? "tool.redo.tooltip" : "tool.redo.disabled.tooltip");
  }

  /** After any pixel change on a frame: redraw, thumbnails, onion, lesson progress, save. */
  afterEdit(frame) {
    const i = this.doc.frames.indexOf(frame);
    if (i === this.cur) this.stage.show(frame);
    else if (Math.abs(i - this.cur) <= 2) this.stage.renderOnion(this.doc.frames, this.cur, this.doc.project.onion);
    this.strip.updateCell(i);
    this.lessonMode?.afterStroke(i);
    this.refreshUndoButtons();
    this.autosaver.strokeEnded();
    this.advanceCoach("stroke");
  }

  // ---------- playback ----------
  togglePlay() {
    if (this.doc.count < 2 && !this.player.playing) return;
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
    this.advanceCoach("start");
  }

  advanceCoach(event) {
    if (!this.doc || this.doc.isLesson || this.disposed) return;
    const s = getSettings();
    const show = (target, text, flag, placement = "above") => {
      this.coach?.close();
      this.coachFlag = flag;
      // Coaches 2 and 3 point down from over the canvas: never over the strip or the tool row.
      const clearOf = target === this.stage.el ? null : () => (isDesktop() ? [this.frames, this.playbar] : [this.tools, this.frames, this.playbar]);
      this.coach = showCoach(target, text, { placement, clearOf, onClose: (byUser) => { if (byUser) updateSettings({ [flag]: true }); } });
    };
    const hasInk = (i) => this.doc.frames[i] && frameHasInk(this.doc.frames[i]);
    if (!s.coach1Seen) {
      if (event === "start" && !hasInk(0)) return show(this.stage.el, t("coach.1"), "coach1Seen", "above");
      if (event === "stroke" && hasInk(0)) {
        updateSettings({ coach1Seen: true });
        this.coach?.close();
        this.coach = null;
        if (!s.coach2Seen && this.doc.count === 1) show(this.strip.addBtn, t("coach.2"), "coach2Seen");
      }
      return;
    }
    if (!s.coach2Seen) {
      if ((event === "start" || event === "stroke") && this.doc.count === 1 && hasInk(0)) return show(this.strip.addBtn, t("coach.2"), "coach2Seen");
      if (event === "added") { this.coach?.close(); }
      if (event === "stroke" && this.doc.count >= 2 && hasInk(1)) {
        updateSettings({ coach2Seen: true });
        if (!s.coach3Seen) show(this.playBtn, t("coach.3"), "coach3Seen");
      }
      return;
    }
    if (!s.coach3Seen) {
      if (event === "start" && this.doc.count >= 2 && hasInk(1)) return show(this.playBtn, t("coach.3"), "coach3Seen");
      if (event === "play") {
        updateSettings({ coach3Seen: true });
        this.coach?.close();
        this.coach = null;
      }
    }
  }

  // ---------- saving and warnings ----------
  setTitle(value) {
    const v = truncate(value, TITLE_MAX);
    const title = v.trim() || this.fallbackTitle;
    this.doc.project.title = title;
    this.doc.projectDirty = true;
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
    const [ic, key] = map[state];
    this.status.className = `save-status save-status--${state}`;
    this.status.replaceChildren(iconEl(ic, { size: 18 }), h("span", {}, t(key)));
    this.status.disabled = state !== "failed";
    if (state === "failed") this.status.setAttribute("aria-label", t("editor.status.failed.aria"));
    else this.status.removeAttribute("aria-label");
  }

  onSaveStatus(state, info = {}) {
    this.setStatus(state);
    if (state === "failed") this.w3.hidden = false;
    if (state === "saved" && info.recovered) {
      this.w3.hidden = true;
      toast(t("w3.recovered"));
    }
  }

  afterSave() {
    const p = this.doc.project;
    if (p.kind === "challenge" && !getProgress().challengeWeeks.includes(p.challengeWeek)) {
      const nonEmpty = this.doc.frames.filter((f) => frameHasInk(f)).length;
      if (nonEmpty >= 2) updateProgress((pr) => { pr.challengeWeeks.push(p.challengeWeek); });
    }
  }

  downloadFromMemory() {
    const name = downloadDocFile(this.doc);
    toast(t("export.done.project", { filename: name }));
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
    if (this.player.playing) this.player.stop();
    const { openExportOverlay } = await import("../export/overlay.js");
    if (this.disposed || this.exportCtl) return;
    await this.autosaver.saveNow();
    this.exportCtl = openExportOverlay(this, {
      onClose: (fromRoute) => {
        this.exportCtl = null;
        this.router.setTitle(this.doc.project.title);
        if (!fromRoute) this.router.closeOverlay(`#/editor/${this.doc.project.id}`);
      },
    });
    this.router.setTitle(t("meta.title.export"));
  }

  // ---------- keyboard ----------
  onKey(e) {
    if (!this.doc || document.querySelector("dialog[open]")) return;
    const tag = e.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.target.isContentEditable) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.code === "KeyZ") {
      e.preventDefault();
      return e.shiftKey ? this.doRedo() : this.doUndo();
    }
    if (mod && e.code === "KeyY") { e.preventDefault(); return this.doRedo(); }
    if (mod || e.altKey) return;
    switch (e.code) {
      case "Space":
        if (tag === "BUTTON" || tag === "A") return; // let the focused control handle it
        e.preventDefault();
        return this.togglePlay();
      case "KeyB": return this.setTool("pencil");
      case "KeyE": return this.setTool("eraser");
      case "KeyG": return this.setTool("fill");
      case "KeyV": return this.setTool("move");
      case "Digit1": case "Digit2": case "Digit3": {
        const k = { Digit1: "s", Digit2: "m", Digit3: "l" }[e.code];
        return this.setWidth(this.tool === "eraser" ? "eraser" : "pencil", k);
      }
      case "KeyO": return this.setOnion({ enabled: !this.doc.project.onion.enabled });
      case "KeyN": return this.addFrame();
      case "KeyD": return this.duplicateFrame(this.cur);
      case "ArrowRight": e.preventDefault(); return this.step(1);
      case "ArrowLeft": e.preventDefault(); return this.step(-1);
      default:
    }
  }
}

export function lessonTitleFor(n) {
  return lessonText(n).title;
}
