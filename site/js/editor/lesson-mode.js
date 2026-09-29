// Lesson mode inside the Editor (plan 2, Lesson mode; Ruling 5).
// Done rule: every frame the user must complete has 50+ pixels that differ from that
// frame's own prepared raster (re-derived from lessons.js), AND Play was pressed once.
// Lesson 9 also needs one hold changed.
import { h, richText } from "../lib/dom.js";
import { t } from "../lib/i18n.js";
import { getLesson, lessonText, hasGuides, STARTERS } from "../data/lessons.js";
import { drawStrokes } from "../lib/raster.js";
import { countChangedPixels } from "../core/fill.js";
import { makeCanvas, ctx2d } from "../lib/util.js";
import { getProgress, updateProgress } from "../store/settings.js";
import { openSheet } from "../ui/dialog.js";
import { toast, announce } from "../ui/toast.js";
import { iconEl } from "../ui/icons.js";

const DONE_PIXELS = 50;

export class LessonMode {
  constructor(ed) {
    this.ed = ed;
    this.n = ed.doc.project.lessonId;
    this.lesson = getLesson(this.n);
    this.text = lessonText(this.n);
    this.hintsOn = false;
    this.playedOnce = false;
    this.nudged = false;
    this.done = new Map(); // frame index -> boolean
    this.prepared = this.lesson.frames.map((f) => this.rasterPrepared(f));
    this.build();
    this.recomputeAll();
  }

  rasterPrepared(frameSpec) {
    const { width, height } = this.ed.doc;
    const c = makeCanvas(width, height);
    const g = ctx2d(c);
    drawStrokes(g, frameSpec.strokes);
    return g.getImageData(0, 0, width, height).data;
  }

  build() {
    this.goalText = h("span", { class: "goal__text" });
    this.progress = h("span", { class: "goal__progress" });
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
    const ref = this.prepared[i] || new Uint8ClampedArray(data.length);
    return countChangedPixels(data, ref) >= DONE_PIXELS;
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
    if (this.allBlanksDone() && !this.playedOnce && !this.nudged && !this.isComplete()) {
      this.nudged = true;
      toast(t("lessonMode.nudgePlay"));
    }
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
    const total = this.blanks().length;
    const doneCount = this.blanks().filter((i) => this.done.get(i)).length;
    this.progress.replaceChildren(richText(t("lessonMode.progress", { done: doneCount, total })));
    this.progress.setAttribute("aria-label", t("lessonMode.progress.aria", { done: doneCount, total }));
  }

  /** Goal line, or the frame's hint while hints are on and a guide frame is current. */
  updateGoal() {
    const i = this.ed.currentIndex();
    const hint = this.hintsOn ? this.text.hints[i + 1] : null;
    this.goalText.textContent = hint || this.text.goal;
    this.ed.stage.renderGuides(this.hintsOn ? this.lesson.frames[i]?.guides : null);
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
    toast(t("lessonMode.keyFrame"), { id: "keyframe" });
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

  onPlayStart() {
    this.playedOnce = true;
  }

  /** Called when playback stops: the completion sheet appears once the rule is met. */
  async onPlayStop() {
    if (!(this.playedOnce && this.allBlanksDone() && this.holdChanged())) return;
    const first = !this.isComplete();
    const before = unlockedStarters();
    if (first) await updateProgress((p) => { p.lessonsDone[this.n] = new Date().toISOString(); });
    const after = unlockedStarters();
    const newStarter = STARTERS.find((s) => after.includes(s.id) && !before.includes(s.id));
    if (first || !this.sheetShownOnce) this.showCompletion(newStarter);
  }

  showCompletion(newStarter) {
    this.sheetShownOnce = true;
    const n = this.n;
    const name = this.text.title;
    const body = h("div", { class: "done-sheet" },
      h("div", { class: "stamp stamp--drop", role: "img", "aria-label": t("lessonDone.stamp.aria", { n, lessonName: name }) },
        iconEl("stamp", { size: 40 }), h("span", { class: "stamp__num num" }, String(n))),
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
    const s = openSheet({ title: t("lessonDone.title"), body, owner: this.ed });
  }
}

export function unlockedStarters() {
  const done = getProgress().lessonsDone;
  return STARTERS.filter((s) => s.subjectLessons.some((n) => done[n])).map((s) => s.id);
}

