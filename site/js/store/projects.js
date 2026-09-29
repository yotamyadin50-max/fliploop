// Project records: create, list, duplicate, rename, delete (with a 5 s undo), lesson and
// challenge lookups. The Editor's in-memory document lives in editor/doc.js.
import * as db from "./db.js";
import { uuid, makeCanvas, ctx2d, canvasToBlob, truncate } from "../lib/util.js";
import { t } from "../lib/i18n.js";
import { drawStrokes } from "../lib/raster.js";

export const MAX_FRAMES = 120;
export const TITLE_MAX = 40;

/** "האנימציה שלי {n}": n = free projects (other than excludeId) + 1, raised until unique. */
export function defaultTitle(projects = [], excludeId = null) {
  const others = projects.filter((p) => p.id !== excludeId);
  const taken = new Set(others.map((p) => p.title));
  let n = others.filter((p) => p.kind === "free").length + 1;
  while (taken.has(t("common.defaultTitle", { n }))) n++;
  return t("common.defaultTitle", { n });
}

export async function nextDefaultTitle(excludeId = null) {
  return defaultTitle(await db.getAllProjects().catch(() => []), excludeId);
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
  const project = newProjectRecord(fields.title ? fields : { ...fields, title: await nextDefaultTitle() });
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

export async function listProjects() {
  const list = await db.getAllProjects();
  return list.sort((a, b) => b.updatedAt - a.updatedAt);
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
  return project;
}

export async function renameProject(id, title) {
  const p = await db.getProject(id);
  if (!p) return;
  p.title = truncate(title.trim(), TITLE_MAX);
  p.updatedAt = Date.now();
  await db.saveProject(p);
}

/** Deletes now, keeps the records in memory so the 5 s undo toast can put them back. */
export async function deleteProjectWithUndo(id) {
  const project = await db.getProject(id);
  const frames = await db.getFrames(id);
  await db.deleteProject(id);
  return async function undo() {
    await db.saveProject(project, frames);
  };
}

export async function frameCount(project) {
  return project.frameOrder.length;
}

/** Blank-frame count that holds at least 2 non-empty frames (challenge stamp rule). */
export async function countNonEmptyFrames(projectId, limit = 2) {
  const frames = await db.getFrames(projectId);
  let n = 0;
  for (const f of frames) {
    if (!f.imageBlob) continue;
    if (await blobHasInk(f.imageBlob)) n++;
    if (n >= limit) break;
  }
  return n;
}

async function blobHasInk(blob) {
  try {
    const bmp = await createImageBitmap(blob);
    const c = makeCanvas(bmp.width, bmp.height);
    const g = ctx2d(c);
    g.drawImage(bmp, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    for (let i = 3; i < d.length; i += 16) if (d[i] > 0) return true;
  } catch { /* unreadable frame counts as empty */ }
  return false;
}
