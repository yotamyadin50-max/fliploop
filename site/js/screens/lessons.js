// Lessons path (plan 5) and Lesson detail (plan 6).
import { h, clear, richText } from "../lib/dom.js";
import { t } from "../lib/i18n.js";
import { dateDMY } from "../lib/util.js";
import { iconEl } from "../ui/icons.js";
import { screenHeader } from "./common.js";
import { MiniPlayer } from "./mini-player.js";
import { LESSONS, lessonText, exampleFrames, keyCount } from "../data/lessons.js";
import { LESSON_COPY } from "../data/lesson-copy.js";
import { getProgress } from "../store/settings.js";
import { findLessonProject } from "../store/projects.js";
import { openLessonProject } from "../store/special-projects.js";
import { isFull } from "../store/storage.js";
import { showW2b } from "../ui/warnings.js";

function credit() {
  // Same sentence as settings.about.credit; the English title sits in an LTR, lang="en" italic isolate.
  const text = LESSON_COPY["lessons.credit"];
  const title = "The Illusion of Life";
  const [before, after] = text.split(title);
  return h("p", { class: "credit muted small" }, before, h("i", { dir: "ltr", lang: "en" }, title), after);
}

export class LessonsScreen {
  constructor(section, router) {
    this.section = section;
    this.router = router;
  }

  mount() {
    this.router.setTitle(t("meta.title.lessons"));
    clear(this.section);
    const done = getProgress().lessonsDone;
    const doneCount = Object.keys(done).length;
    const nextUp = LESSONS.find((l) => !done[l.n])?.n;
    const stations = LESSONS.map((l) => {
      const name = lessonText(l.n).title;
      const isDone = !!done[l.n];
      let aria = t("lessons.station.aria", { n: l.n, lessonName: name });
      if (isDone) aria += t("lessons.station.done.aria");
      if (l.n === nextUp) aria += t("lessons.station.next.aria");
      return h("li", { class: "station" + (isDone ? " station--done" : "") + (l.n === nextUp ? " station--next" : "") },
        h("a", { class: "station__link", href: `#/lesson/${l.n}`, "aria-label": aria },
          h("span", { class: "station__circle" }, h("span", { class: "station__num num" }, t("lessons.station.number", { n: l.n })),
            isDone ? h("span", { class: "station__stamp" }, iconEl("stamp", { size: 26 })) : null),
          h("span", { class: "station__name" }, t("lessons.station.name", { lessonName: name })),
          l.n === nextUp ? h("span", { class: "pill pill--lamp" }, t("lessons.nextUp")) : null));
    });
    this.section.append(
      screenHeader("#/", "common.back.home", "common.back.home.aria"),
      h("div", { class: "page lessons" },
        h("h1", { class: "screen-h1", tabindex: "-1" }, t("lessons.h1")),
        h("p", { class: "muted" }, t("lessons.subtitle"), " · ", h("span", {}, richText(t("lessons.progress", { done: doneCount })))),
        h("p", { class: "lessons__intro" }, LESSON_COPY["lessons.intro"]),
        doneCount === 12 ? h("div", { class: "banner banner--glow" }, iconEl("stamp", { cls: "banner__icon" }),
          h("div", { class: "banner__text" }, h("strong", {}, t("lessons.allDone.title")), h("p", {}, t("lessons.allDone.body")))) : null,
        h("ol", { class: "path" }, stations),
        credit()));
  }

  unmount() {}
}

export class LessonScreen {
  constructor(section, router) {
    this.section = section;
    this.router = router;
  }

  async mount({ n }) {
    const lesson = LESSONS[n - 1];
    const text = lessonText(n);
    this.router.setTitle(t("meta.title.lesson", { lessonName: text.title }));
    clear(this.section);
    const k = keyCount(lesson);
    const exerciseLine = k === 0
      ? t("lesson.exercise.frames.base", { total: lesson.frames.length })
      : t("lesson.exercise.frames", { total: lesson.frames.length, k });
    this.player = new MiniPlayer(exampleFrames(lesson), { fps: lesson.fps, label: t("lesson.example.aria", { lessonName: text.title }) });
    const doneAt = getProgress().lessonsDone[n];
    this.cta = h("button", { class: "btn btn--primary btn--block", type: "button", onclick: () => this.start(n) }, iconEl("pencil"), t("lesson.cta.start"));
    const prev = n > 1 ? lessonText(n - 1).title : null;
    const next = n < 12 ? lessonText(n + 1).title : null;
    this.section.append(
      screenHeader("#/lessons", "common.back.lessons", "common.back.lessons.aria"),
      h("div", { class: "page lesson" },
        h("p", { class: "muted lesson__number" }, t("lesson.number", { n })),
        h("h1", { class: "screen-h1", tabindex: "-1" }, t("lesson.h1", { lessonName: text.title })),
        doneAt ? h("p", { class: "lesson__done" }, iconEl("stamp", { size: 20 }), h("span", { class: "num-mix" }, t("lesson.done.badge", { date: dateDMY(doneAt) }))) : null,
        h("section", { class: "lesson__section" }, h("h2", { class: "h2" }, t("lesson.what.h2")), h("p", {}, t("lesson.what.body", { explanation: text.explanation }))),
        h("section", { class: "lesson__section lesson__section--example" }, h("h2", { class: "h2" }, t("lesson.example.h2")), this.player.el, h("p", { class: "muted small" }, text.caption)),
        h("section", { class: "lesson__section" },
          h("h2", { class: "h2" }, t("lesson.exercise.h2")),
          h("p", { class: "lesson__goal" }, t("lesson.exercise.goal", { goal: text.goal })),
          h("p", { class: "lesson__frames muted" }, iconEl("lock", { size: 18 }), h("span", { class: "dashed-glyph", "aria-hidden": "true" }), h("span", {}, exerciseLine)),
          h("ol", { class: "steps" }, text.steps.map((s) => h("li", {}, s))),
          this.cta),
        h("nav", { class: "lesson__nav" },
          prev ? h("a", { class: "btn btn--tertiary", href: `#/lesson/${n - 1}` }, iconEl("arrowPrev", { cls: "icon--flip-rtl", size: 20 }), t("lesson.prev", { lessonName: prev })) : h("span"),
          next ? h("a", { class: "btn btn--tertiary", href: `#/lesson/${n + 1}` }, t("lesson.next", { lessonName: next }), iconEl("arrowNext", { cls: "icon--flip-rtl", size: 20 })) : h("span"))));
    const existing = await findLessonProject(n).catch(() => null);
    if (this.disposed) return;
    // The label says what the button will open: an exercise that exists, or a new one.
    const key = !existing ? "lesson.cta.start" : doneAt ? "lesson.cta.reopen" : "lesson.cta.resume";
    this.cta.replaceChildren(iconEl("pencil"), t(key));
  }

  async start(n) {
    this.cta.disabled = true;
    try {
      const existing = await findLessonProject(n);
      if (!existing && (await isFull())) { showW2b(); return; }
      const p = existing || (await openLessonProject(n));
      location.hash = `#/editor/${p.id}`;
    } catch (err) {
      // Storage failures are reported once, app-wide (contract K1); nothing more to do here.
      console.error("Lesson could not be opened", err);
    } finally {
      this.cta.disabled = false;
    }
  }

  unmount() {
    this.disposed = true;
    this.player?.destroy();
  }
}
