// Lesson mode inside the Editor (plan 2, Lesson mode; Ruling 5; fix round R14 to R17).
// Done rule: every blank frame holds 50+ pixels of ink ADDED to its own prepared drawing
// (re-derived from lessons.js; removed ink never counts), and lesson 9 also needs one hold
// changed. When Play is pressed with the rule met, the animation plays one full cycle,
// stops by itself and the stamp sheet opens. Stop before that opens it too. The sheet only
// ever opens at the moment the stamp is first earned.
import { h, richText } from "../lib/dom.js";
import { t, tp } from "../lib/i18n.js";
import { on } from "../lib/bus.js";
import { getLesson, lessonText, hasGuides, STARTERS } from "../data/lessons.js";
import { drawStrokes } from "../lib/raster.js";
import { countAddedInk, DONE_PIXELS, lessonOffset, shiftStrokes } from "../core/lesson-diff.js";
import { makeCanvas, ctx2d, isDesktop } from "../lib/util.js";
import { getProgress, updateProgress } from "../store/settings.js";
import { openSheet } from "../ui/dialog.js";
import { toast, announce } from "../ui/toast.js";
import { iconEl } from "../ui/icons.js";
import { PLAY_LEAD_MS } from "./playback.js"; // the lead-in of the Play choreography, one constant (K12)

export class LessonMode {
  constructor(ed) {
    this.ed = ed;
    this.n = ed.doc.project.lessonId;
    this.lesson = getLesson(this.n);
    this.text = lessonText(this.n);
    this.hintsOn = false;
    this.nudged = false;
    this.armed = false; // Play was pressed with the rule met and no stamp yet
    this.autoStop = 0;
    this.done = new Map(); // frame index -> boolean
    this.prepared = [];
    this.preparedKey = "";
    this.build();
    this.recomputeAll();
    // R17: open on the first blank that is not done yet. Queued here, it runs once the Editor
    // has finished building and has applied a resume view, and then does nothing if a frame
    // other than the first is already selected.
    queueMicrotask(() => this.openOnFirstBlank());
  }

  /** Where the 480x360 lesson space sits in this document (a project made square is cropped). */
  offset() {
    return lessonOffset(this.ed.doc.width, this.ed.doc.height);
  }

  /** Prepared rasters at the document's current size, rebuilt if that size changed. */
  preparedFor(i) {
    const { width, height } = this.ed.doc;
    const key = `${width}x${height}`;
    if (key !== this.preparedKey) {
      this.preparedKey = key;
      this.prepared = this.lesson.frames.map((f) => this.rasterPrepared(f));
    }
    return this.prepared[i];
  }

  rasterPrepared(frameSpec) {
    const { width, height } = this.ed.doc;
    const g = ctx2d(makeCanvas(width, height));
    this.paintStrokes(g, frameSpec.strokes, width, height);
    return g.getImageData(0, 0, width, height).data;
  }

  paintStrokes(g, strokes, width, height) {
    const { dx, dy } = lessonOffset(width, height);
    g.save();
    g.translate(dx, dy);
    drawStrokes(g, strokes);
    g.restore();
  }

  /** Draws this lesson's prepared strokes for frame `index` onto the frame (contract K5):
   *  "ניקוי הפריים" in a lesson returns a frame to its prepared drawing, not to empty (R16). */
  paintPrepared(frame, index = this.ed.doc.frames.indexOf(frame)) {
    const spec = this.lesson.frames[index];
    if (!frame || !spec?.strokes.length) return;
    this.paintStrokes(frame.ctx, spec.strokes, frame.canvas.width, frame.canvas.height);
  }

  build() {
    this.goalText = h("span", { class: "goal__text" });
    // role="img": the short "3/6 צוירו" is a glyph for the full sentence in its label.
    this.progress = h("span", { class: "goal__progress", role: "img" });
    this.hintSwitch = hasGuides(this.lesson)
      ? h("button", { class: "switch", type: "button", role: "switch", "aria-checked": "false", onclick: () => this.toggleHints() },
        h("span", { class: "switch__track", "aria-hidden": "true" }, h("span", { class: "switch__thumb" })),
        h("span", { class: "switch__label" }, t("lessonMode.hints")))
      : null;
    // The lesson's numbered steps stay reachable during the exercise (Critic F3): a
    // "התרגיל" button under 1280px, an always-visible card beside the canvas at 1280+.
    this.stepsBtn = h("button", { class: "goal__steps", type: "button", "aria-haspopup": "dialog", onclick: () => this.openSteps() },
      iconEl("book", { size: 18 }), h("span", {}, t("lesson.exercise.h2")));
    this.el = h("div", { class: this.hintSwitch ? "goal-strip goal-strip--hints" : "goal-strip" },
      h("span", { class: "chip chip--ink" }, t("lessonMode.chip", { n: this.n })),
      this.goalText, this.progress, this.stepsBtn, this.hintSwitch);
    this.stepsCard = h("aside", { class: "lesson-steps", "aria-labelledby": "h3-lesson-steps" },
      h("h3", { id: "h3-lesson-steps", class: "panel-title" }, t("lesson.exercise.h2")),
      this.stepsList());
    this.updateGoal();
  }

  stepsList() {
    return h("ol", { class: "steps lesson-steps__list" }, this.text.steps.map((step) => h("li", {}, step)));
  }

  openSteps() {
    if (this.ed.player?.playing) return;
    openSheet({ title: t("lesson.exercise.h2"), anchor: this.stepsBtn, owner: this.ed, body: this.stepsList() });
  }

  isBlankIndex(i) {
    return this.ed.doc.frames[i]?.lessonRole === "blank";
  }

  frameDone(i) {
    const f = this.ed.doc.frames[i];
    if (!f || f.lessonRole !== "blank") return true;
    const data = f.ctx.getImageData(0, 0, f.canvas.width, f.canvas.height).data;
    const ref = this.preparedFor(i) || new Uint8ClampedArray(data.length);
    return countAddedInk(data, ref) >= DONE_PIXELS;
  }

  recomputeAll() {
    this.ed.doc.frames.forEach((_, i) => this.done.set(i, this.frameDone(i)));
    this.updateProgress();
  }

  afterStroke(i) {
    const was = this.done.get(i);
    const now = this.frameDone(i);
    this.done.set(i, now);
    if (was !== now) this.ed.strip.updateCell(i);
    this.updateProgress();
    if (!this.allBlanksDone()) { this.nudged = false; return; }
    if (this.nudged || this.isComplete()) return;
    this.nudged = true;
    this.nudge();
  }

  /** Names the step that is still missing: Play, or in lesson 9 a hold change first (R15). */
  nudge() {
    // owner (contract K3): an Editor instruction must not linger on the next screen.
    this.nudgeToast = toast(t(this.holdChanged() ? "lessonMode.nudgePlay" : "lessonMode.nudgeHold"), { id: "lesson-nudge", owner: this.ed });
  }

  blanks() {
    return this.ed.doc.frames.map((f, i) => i).filter((i) => this.isBlankIndex(i));
  }

  allBlanksDone() {
    return this.blanks().every((i) => this.done.get(i));
  }

  holdChanged() {
    return !this.lesson.holdsUnlocked || this.ed.doc.frames.some((f) => f.hold !== 1);
  }

  isComplete() {
    return !!getProgress().lessonsDone[this.n];
  }

  updateProgress() {
    const blanks = this.blanks();
    const total = blanks.length;
    const doneCount = blanks.filter((i) => this.done.get(i)).length;
    this.progress.replaceChildren(richText(t("lessonMode.progress", { done: doneCount, total })));
    this.progress.setAttribute("aria-label", tp("lessonMode.progress.aria", doneCount, { done: doneCount, total }));
  }

  /** Goal line, or the frame's hint while hints are on and a guide frame is current. */
  updateGoal() {
    const i = this.ed.currentIndex();
    const hint = this.hintsOn ? this.text.hints[i + 1] : null;
    this.goalText.textContent = hint || this.text.goal;
    const guides = this.hintsOn ? this.lesson.frames[i]?.guides : null;
    const { dx, dy } = this.offset();
    this.ed.stage.renderGuides(guides?.length ? shiftStrokes(guides, dx, dy) : null);
    if (hint) announce(hint);
  }

  toggleHints() {
    this.hintsOn = !this.hintsOn;
    this.hintSwitch.setAttribute("aria-checked", String(this.hintsOn));
    this.hintSwitch.setAttribute("aria-label", t(this.hintsOn ? "lessonMode.hints.on.aria" : "lessonMode.hints.off.aria"));
    this.updateGoal();
  }

  onFrameChange() {
    this.updateGoal();
  }

  onBlocked() {
    toast(t("lessonMode.keyFrame"), { id: "keyframe", owner: this.ed });
    const next = this.nextBlank(this.ed.currentIndex());
    if (next >= 0) {
      const cell = this.ed.strip.cells[next];
      this.ed.strip.ensureVisible(next);
      cell.classList.remove("is-pulsing");
      void cell.offsetWidth;
      cell.classList.add("is-pulsing");
    }
  }

  nextBlank(from) {
    const blanks = this.blanks();
    const undone = blanks.filter((i) => !this.done.get(i));
    const pool = undone.length ? undone : blanks;
    return pool.find((i) => i > from) ?? pool[0] ?? -1;
  }

  openOnFirstBlank() {
    const ed = this.ed;
    if (ed.disposed || !ed.input || ed.cur !== 0) return;
    const first = this.blanks().find((i) => !this.done.get(i));
    if (first > 0) ed.select(first, { instantScroll: true });
  }

  onPlayStart() {
    clearTimeout(this.autoStop);
    this.nudgeToast?.close(); // Play was pressed: "press Play" has done its job
    this.nudgeToast = null;
    const ready = this.allBlanksDone();
    this.armed = !this.isComplete() && ready && this.holdChanged();
    if (this.armed) {
      const player = this.ed.player;
      // One full pass, plus half a frame so the film comes to rest on the frame it started from.
      const pass = PLAY_LEAD_MS + player.cycle + 500 / this.ed.doc.project.fps;
      this.autoStop = setTimeout(() => { if (player.playing) player.stop(); }, pass);
    } else if (ready && !this.isComplete()) {
      this.nudge(); // lesson 9, no hold changed yet: Play must never do nothing without a word
    }
  }

  /** Playback stopped (by itself after one cycle, by Stop, or because the Editor is closing). */
  async onPlayStop() {
    clearTimeout(this.autoStop);
    if (!this.armed) return;
    // A speed or loop-mode change stops and restarts the player in one go: the pass goes on.
    await null;
    if (this.ed.player.playing) return;
    this.armed = false;
    if (this.isComplete()) return;
    const before = unlockedStarters();
    await updateProgress((p) => { p.lessonsDone[this.n] = new Date().toISOString(); });
    // The child left while it played (or opened Export, which stops the player): the stamp is
    // recorded and a toast says so; no sheet opens over another screen or under the overlay (J2).
    if (this.ed.disposed || /\/export$/.test(location.hash)) return this.tellAfterLeaving();
    const after = unlockedStarters();
    this.showCompletion(STARTERS.find((s) => after.includes(s.id) && !before.includes(s.id)));
  }

  /** One plain toast, once the next screen is up. */
  tellAfterLeaving() {
    let told = false;
    const tell = () => {
      if (told) return;
      told = true;
      off();
      clearTimeout(timer);
      toast(t("lessonDone.toast", { n: this.n }));
    };
    const off = on("route", tell);
    const timer = setTimeout(tell, 3000);
  }

  showCompletion(newStarter) {
    const n = this.n;
    const name = this.text.title;
    const body = h("div", { class: "done-sheet" },
      h("div", { class: "stamp stamp--drop", role: "img", "aria-label": t("lessonDone.stamp.aria", { n, lessonName: name }) },
        h("span", { class: "stamp__num num" }, String(n)),
        h("span", { class: "stamp__check" }, iconEl("stamp", { size: 28 }))),
      h("p", { class: "done-sheet__lesson" }, t("lessonDone.body", { n, lessonName: name })),
      h("p", { class: "done-sheet__line" }, this.text.done),
      newStarter ? h("p", { class: "done-sheet__unlock" }, t("lessonDone.unlock", { starter: t(newStarter.labelKey) })) : null,
    );
    const actions = h("div", { class: "done-sheet__actions" },
      n < 12
        ? h("a", { class: "btn btn--primary btn--sheet", href: `#/lesson/${n + 1}`, onclick: () => s.close() }, t("lessonDone.next"))
        : h("a", { class: "btn btn--primary btn--sheet", href: "#/lessons", onclick: () => s.close() }, t("lessonDone.last")),
      h("button", { class: "btn btn--secondary btn--sheet", type: "button", onclick: () => s.close() }, t("lessonDone.keepDrawing")),
      h("button", { class: "btn btn--tertiary", type: "button", onclick: () => { s.close(); this.ed.makeMine(); } }, t("lessonDone.makeMine")),
      h("p", { class: "muted small" }, t("lessonDone.makeMine.hint")),
    );
    body.append(actions);
    // Phone: bottom sheet. From 1024px: a centred 480px dialog, like rename and delete (D-01).
    const s = openSheet({ title: t("lessonDone.title"), body, owner: this.ed, kind: isDesktop() ? "dialog" : "sheet" });
  }
}

export function unlockedStarters() {
  const done = getProgress().lessonsDone;
  return STARTERS.filter((s) => s.subjectLessons.some((n) => done[n])).map((s) => s.id);
}
