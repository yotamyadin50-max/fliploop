// Project records: create, list, duplicate, rename, delete (with a 5 s undo), lesson and
// challenge lookups. The Editor's in-memory document lives in editor/doc.js.
//
// Fix round 2026-10 (R5): a project made with no ink carries `touched: false` until its first
// save with ink, a second frame or a rename. Untouched projects are invisible (Gallery, Home
// "המשך", W1, backup, the default-title count) and are removed at launch once they are a day
// old. Records without the field count as touched.
import * as db from "./db.js";
import { uuid, makeCanvas, ctx2d, canvasToBlob, truncate } from "../lib/util.js";
import { t } from "../lib/i18n.js";
import { emit } from "../lib/bus.js";
import { drawStrokes } from "../lib/raster.js";
import { announceSaved } from "./channel.js";

export const MAX_FRAMES = 120;
export const TITLE_MAX = 40;
const UNTOUCHED_TTL = 24 * 3600 * 1000;

const isTouched = (p) => p.touched !== false;

/** "האנימציה שלי {n}": n = free projects (other than excludeId) + 1, raised until unique. */
export function defaultTitle(projects = [], excludeId = null) {
  const others = projects.filter((p) => p.id !== excludeId);
  const taken = new Set(others.map((p) => p.title));
  let n = others.filter((p) => p.kind === "free").length + 1;
  while (taken.has(t("common.defaultTitle", { n }))) n++;
  return t("common.defaultTitle", { n });
}

export async function nextDefaultTitle(excludeId = null) {
  let all = [];
  try {
    all = await db.getAllProjects();
  } catch (err) {
    if (err && typeof err === "object") err.handled = true; // only a title suggestion
  }
  return defaultTitle(all.filter(isTouched), excludeId);
}

export function copyTitle(title) {
  const suffix = t("common.copySuffix", { title: "" });
  return t("common.copySuffix", { title: truncate(title, TITLE_MAX - [...suffix].length) });
}

export function newProjectRecord(fields = {}) {
  const now = Date.now();
  return {
    id: uuid(),
    title: defaultTitle(),
    kind: "free",
    width: 480,
    height: 360,
    fps: 12,
    playMode: "loop",
    onion: { enabled: true, prev: 1, next: 1 },
    frameOrder: [],
    thumbBlob: null,
    createdAt: now,
    updatedAt: now,
    schemaVersion: 1,
    ...fields,
  };
}

/** Creates and saves a project. frames: [{ strokes?, blob?, hold, lessonRole, locked }]. */
export async function createProject(fields, frames = [{}]) {
  const empty = frames.every((f) => !f.blob && !f.strokes?.length);
  // "אנימציה חדשה" tapped again before anything was drawn: the same blank page, not one more project.
  if (empty && !fields.title && (fields.kind ?? "free") === "free") {
    const again = await reuseUntouched();
    if (again) return again;
  }
  const project = newProjectRecord(fields.title ? fields : { ...fields, title: await nextDefaultTitle() });
  if (empty) project.touched = false;
  const records = [];
  for (const f of frames) {
    const id = uuid();
    let blob = f.blob || null;
    if (!blob && f.strokes?.length) blob = await rasterizeToBlob(f.strokes, project.width, project.height);
    records.push({
      id,
      projectId: project.id,
      imageBlob: blob,
      hold: f.hold || 1,
      lessonRole: f.lessonRole || "free",
      locked: !!f.locked,
    });
  }
  project.frameOrder = records.map((r) => r.id);
  project.thumbBlob = await thumbFromBlob(records[0]?.imageBlob, project.width, project.height);
  await db.saveProject(project, records);
  return project;
}

/**
 * The blank free project nobody has drawn in yet, or null. Its title follows the current
 * count. `updatedAt` is left alone on purpose: the same blank page may be open in another
 * tab, and a newer `updatedAt` would make that tab's first save look like a conflict.
 */
async function reuseUntouched() {
  const all = await db.getAllProjects();
  const blank = all.find((p) => p.touched === false && p.kind === "free" && p.frameOrder.length === 1);
  if (!blank) return null;
  const title = defaultTitle(all.filter(isTouched), blank.id);
  if (title === blank.title) return blank;
  const project = { ...blank, title };
  try {
    await db.saveProject(project, [], [], { expectedUpdatedAt: blank.updatedAt });
  } catch (err) {
    if (err?.conflict) return null; // it changed in another tab this very moment: make a new one
    throw err;
  }
  return project;
}

/** Launch: blank projects nobody drew in for a day are removed. Returns how many. */
export async function purgeUntouched(now = Date.now()) {
  const old = (await db.getAllProjects()).filter((p) => p.touched === false && now - (p.updatedAt || 0) > UNTOUCHED_TTL);
  for (const p of old) await db.deleteProject(p.id);
  return old.length;
}

export async function rasterizeToBlob(strokes, width, height, offsetX = 0) {
  const c = makeCanvas(width, height);
  const g = ctx2d(c);
  if (offsetX) g.translate(offsetX, 0);
  drawStrokes(g, strokes);
  return canvasToBlob(c);
}

/** 160x120 PNG thumbnail on white, from a frame blob (or a canvas). */
export async function thumbFromBlob(blobOrCanvas, width, height) {
  const tw = 160, th = Math.round((160 * height) / width);
  const c = makeCanvas(tw, th);
  const g = c.getContext("2d");
  g.fillStyle = "#FFFFFF";
  g.fillRect(0, 0, tw, th);
  if (blobOrCanvas instanceof Blob) {
    try {
      const bmp = await createImageBitmap(blobOrCanvas);
      g.drawImage(bmp, 0, 0, tw, th);
      bmp.close?.();
    } catch { /* blank thumbnail */ }
  } else if (blobOrCanvas) {
    g.drawImage(blobOrCanvas, 0, 0, tw, th);
  }
  return canvasToBlob(c);
}

/**
 * The user's projects, newest first, without untouched blank ones. A failed read rejects
 * (it is never turned into an empty list); every caller shows its own state for it, so the
 * error is marked handled here and the global storage toast stays quiet.
 */
export async function listProjects() {
  let list;
  try {
    list = await db.getAllProjects();
  } catch (err) {
    if (err && typeof err === "object") err.handled = true;
    throw err;
  }
  return list.filter(isTouched).sort((a, b) => b.updatedAt - a.updatedAt);
}

export const getProject = (id) => db.getProject(id);

export async function findLessonProject(n) {
  return (await db.getAllProjects()).find((p) => p.kind === "lesson" && p.lessonId === n) || null;
}

export async function findChallengeProject(weekIndex) {
  return (await db.getAllProjects()).find((p) => p.kind === "challenge" && p.challengeWeek === weekIndex) || null;
}

/** Duplicates as a free project with all frames unlocked (plan 8, Finding 4c). */
export async function duplicateProject(id) {
  const src = await db.getProject(id);
  if (!src) return null;
  const frames = await db.getFrames(id);
  const byId = new Map(frames.map((f) => [f.id, f]));
  const project = newProjectRecord({
    title: copyTitle(src.title),
    width: src.width, height: src.height, fps: src.fps, playMode: src.playMode,
    onion: { ...src.onion }, thumbBlob: src.thumbBlob,
  });
  const records = src.frameOrder.map((fid) => {
    const f = byId.get(fid) || {};
    return { id: uuid(), projectId: project.id, imageBlob: f.imageBlob || null, hold: f.hold || 1, lessonRole: "free", locked: false };
  });
  project.frameOrder = records.map((r) => r.id);
  await db.saveProject(project, records);
  emit("projects-changed");
  return project;
}

export async function renameProject(id, title) {
  const p = await db.getProject(id);
  if (!p) return;
  const stored = p.updatedAt;
  p.title = truncate(title.trim(), TITLE_MAX);
  p.updatedAt = Math.max(Date.now(), stored + 1);
  if (p.touched === false) p.touched = true;
  await db.saveProject(p);
  announceSaved(p.id, p.updatedAt); // a tab that has it open takes the new name (R3)
  emit("projects-changed");
}

/**
 * Deletes now (one transaction), keeps the records in memory so the 5 s undo toast can put
 * them back. undo() resolves { asCopy }: when a new project for the same lesson or challenge
 * was made in between, the old one comes back as a free copy (one lesson project per lesson).
 */
export async function deleteProjectWithUndo(id) {
  const { project, frames } = await db.takeProject(id);
  emit("projects-changed");
  return async function undo() {
    if (!project) return { asCopy: false };
    const all = await db.getAllProjects();
    const clash =
      (project.kind === "lesson" && all.some((p) => p.kind === "lesson" && p.lessonId === project.lessonId)) ||
      (project.kind === "challenge" && all.some((p) => p.kind === "challenge" && p.challengeWeek === project.challengeWeek));
    let restored = project;
    let records = frames;
    if (clash) {
      restored = { ...project, kind: "free", title: copyTitle(project.title) };
      delete restored.lessonId;
      delete restored.challengeWeek;
      records = frames.map((f) => ({ ...f, lessonRole: "free", locked: false }));
    }
    await db.saveProject(restored, records);
    emit("projects-changed");
    return { asCopy: clash };
  };
}
