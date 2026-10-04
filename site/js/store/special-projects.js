// Lesson exercises, Gallery starters and weekly challenge projects.
import { createProject, findLessonProject, findChallengeProject } from "./projects.js";
import { getAllProjects, saveProject } from "./db.js";
import { getLesson, lessonText, exampleFrames } from "../data/lessons.js";
import { t } from "../lib/i18n.js";

const lessonTitle = (n, lessonName = lessonText(n).title) => t("lesson.projectTitle", { n, lessonName });

// Lessons whose name changed after projects had been made under the old one (string keys).
const NAMES_BEFORE = { 1: ["lesson.1.nameBefore"] };

/**
 * Launch: a lesson project that still carries the default title of an earlier lesson name
 * gets today's default title. A title somebody typed is never touched (it does not match),
 * and `updatedAt` stays, so the Gallery order and a backup's "already here" check stay too.
 * Returns how many were renamed.
 */
export async function renameOldLessonTitles() {
  let renamed = 0;
  for (const p of await getAllProjects()) {
    const before = p.kind === "lesson" ? NAMES_BEFORE[p.lessonId] : null;
    if (!before?.some((key) => p.title === lessonTitle(p.lessonId, t(key)))) continue;
    try {
      await saveProject({ ...p, title: lessonTitle(p.lessonId) }, [], [], { expectedUpdatedAt: p.updatedAt });
      renamed++;
    } catch (err) {
      if (!err?.conflict) throw err; // it changed in another tab this very moment: the next launch looks again
    }
  }
  return renamed;
}

/** Creates or returns the single lesson project for lesson n (prepared strokes baked in). */
export async function openLessonProject(n) {
  const existing = await findLessonProject(n);
  if (existing) return existing;
  const lesson = getLesson(n);
  return createProject(
    {
      kind: "lesson",
      lessonId: n,
      title: lessonTitle(n),
      fps: lesson.fps,
      playMode: lesson.playMode,
    },
    lesson.frames.map((f) => ({
      strokes: f.strokes,
      hold: 1,
      lessonRole: f.role === "key" ? "key" : "blank",
      locked: f.role === "key",
    })),
  );
}

/** Starter: a free project built from the lesson's example stroke data (never a user's attempt). */
export async function createStarterProject(starter) {
  const lesson = getLesson(starter.lesson);
  // Repeat titles get a number: "כדור", "כדור 2", "כדור 3" (G-04).
  const label = t(starter.labelKey);
  const taken = new Set((await getAllProjects()).filter((p) => p.touched !== false).map((p) => p.title));
  let title = label;
  for (let n = 2; taken.has(title); n++) title = t("gallery.starter.numbered", { starter: label, n });
  return createProject(
    { kind: "free", title, fps: lesson.fps, playMode: lesson.playMode },
    exampleFrames(lesson).map((f) => ({ strokes: f.strokes, hold: f.hold || 1 })),
  );
}

export async function openChallengeProject(weekIndex, theme) {
  const existing = await findChallengeProject(weekIndex);
  if (existing) return existing;
  return createProject({ kind: "challenge", challengeWeek: weekIndex, title: t("challenge.projectTitle", { theme }) });
}
