// Lesson exercises, Gallery starters and weekly challenge projects.
import { createProject, findLessonProject, findChallengeProject } from "./projects.js";
import { getAllProjects } from "./db.js";
import { getLesson, lessonText, exampleFrames } from "../data/lessons.js";
import { t } from "../lib/i18n.js";

/** Creates or returns the single lesson project for lesson n (prepared strokes baked in). */
export async function openLessonProject(n) {
  const existing = await findLessonProject(n);
  if (existing) return existing;
  const lesson = getLesson(n);
  return createProject(
    {
      kind: "lesson",
      lessonId: n,
      title: t("lesson.projectTitle", { n, lessonName: lessonText(n).title }),
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
