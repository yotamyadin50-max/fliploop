// Project file and backup (plan 3.4, 8): JSON with the project record and frames as PNG
// data URLs, schemaVersion 1. Built from IndexedDB, or from memory when saving fails (W3).
import * as db from "./db.js";
import { uuid, blobToDataURL, dataURLToBlob, downloadBlob, safeFileName, dateISO } from "../lib/util.js";
import { t } from "../lib/i18n.js";
import { copyTitle, thumbFromBlob, MAX_FRAMES, TITLE_MAX } from "./projects.js";
import { updateSettings } from "./settings.js";

const PROJECT_FIELDS = ["id", "title", "kind", "lessonId", "challengeWeek", "width", "height", "fps", "playMode", "onion", "frameOrder", "createdAt", "updatedAt", "schemaVersion"];

function pickProject(p) {
  const out = {};
  for (const k of PROJECT_FIELDS) if (p[k] !== undefined) out[k] = p[k];
  return out;
}

export async function projectToJson(projectId) {
  const project = await db.getProject(projectId);
  const frames = await db.getFrames(projectId);
  const byId = new Map(frames.map((f) => [f.id, f]));
  const outFrames = [];
  for (const fid of project.frameOrder) {
    const f = byId.get(fid);
    outFrames.push({
      id: fid,
      hold: f?.hold || 1,
      lessonRole: f?.lessonRole || "free",
      locked: !!f?.locked,
      png: f?.imageBlob ? await blobToDataURL(f.imageBlob) : null,
    });
  }
  return { project: pickProject(project), frames: outFrames };
}

/** From the Editor's live canvases: needs no IndexedDB at all (the W3 path). */
export function docToJson(doc) {
  return {
    project: pickProject({ ...doc.project, frameOrder: doc.frames.map((f) => f.id), updatedAt: Date.now() }),
    frames: doc.frames.map((f) => ({
      id: f.id, hold: f.hold, lessonRole: f.lessonRole, locked: f.locked, png: f.canvas.toDataURL("image/png"),
    })),
  };
}

function fileBlob(obj) {
  return new Blob([JSON.stringify(obj)], { type: "application/json" });
}

export function projectFileName(title) {
  return `${safeFileName(title)}.fliploop.json`;
}

export async function downloadProjectFile(projectId) {
  const entry = await projectToJson(projectId);
  const name = projectFileName(entry.project.title);
  downloadBlob(fileBlob({ format: "fliploop-project", schemaVersion: 1, ...entry }), name);
  return name;
}

export function downloadDocFile(doc) {
  const entry = docToJson(doc);
  const name = projectFileName(entry.project.title);
  downloadBlob(fileBlob({ format: "fliploop-project", schemaVersion: 1, ...entry }), name);
  return name;
}

/** Full backup of every project. Returns the file name, or null when there is nothing to back up. */
export async function downloadBackup() {
  const projects = await db.getAllProjects();
  if (!projects.length) return null;
  const entries = [];
  for (const p of projects) entries.push(await projectToJson(p.id));
  const name = t("backup.file", { date: dateISO() });
  downloadBlob(fileBlob({ format: "fliploop-backup", schemaVersion: 1, projects: entries }), name);
  await updateSettings({ lastBackupAt: Date.now(), w1DismissedAt: null });
  return name;
}

export class ImportError extends Error {
  constructor(code) {
    super(code);
    this.code = code; // "invalid" | "newer" | "tooBig"
  }
}

const isInt = (v) => Number.isInteger(v);

function validEntry(e) {
  const p = e?.project;
  if (!p || typeof p !== "object" || !Array.isArray(e.frames)) return false;
  if (typeof p.id !== "string" || typeof p.title !== "string") return false;
  if (!["free", "lesson", "challenge"].includes(p.kind)) return false;
  if (p.kind === "lesson" && !(isInt(p.lessonId) && p.lessonId >= 1 && p.lessonId <= 12)) return false;
  if (p.kind === "challenge" && !isInt(p.challengeWeek)) return false;
  const size = `${p.width}x${p.height}`;
  if (size !== "480x360" && size !== "360x360") return false;
  if (![6, 12, 24].includes(p.fps)) return false;
  if (!["loop", "pingpong"].includes(p.playMode)) return false;
  if (!e.frames.length || e.frames.length > MAX_FRAMES) return false;
  for (const f of e.frames) {
    if (typeof f.id !== "string") return false;
    if (!(isInt(f.hold) && f.hold >= 1 && f.hold <= 12)) return false;
    if (f.png !== null && !(typeof f.png === "string" && f.png.startsWith("data:image/png;base64,"))) return false;
  }
  return true;
}

/** Parses a project file or backup. Throws ImportError("invalid" | "newer"). */
export function parseImport(text) {
  let data;
  try { data = JSON.parse(text); } catch { throw new ImportError("invalid"); }
  if (!data || typeof data !== "object") throw new ImportError("invalid");
  const version = data.schemaVersion ?? data.project?.schemaVersion;
  if (typeof version === "number" && version > 1) throw new ImportError("newer");
  if (version !== 1) throw new ImportError("invalid");
  let entries;
  if (data.format === "fliploop-backup" && Array.isArray(data.projects)) entries = data.projects;
  else if (data.project && data.frames) entries = [data];
  else throw new ImportError("invalid");
  if (!entries.length || !entries.every(validEntry)) throw new ImportError("invalid");
  return entries;
}

export function estimateImportBytes(entries) {
  let n = 0;
  for (const e of entries) for (const f of e.frames) n += f.png ? f.png.length * 0.75 : 0;
  return n;
}

/**
 * Saves parsed entries. An id that already exists imports as a copy with a new id; a copy
 * of a lesson or challenge project becomes a free project (one lesson project per lesson).
 * Returns [{ title, copied }].
 */
export async function importEntries(entries) {
  const existing = await db.getAllProjects();
  const ids = new Set(existing.map((p) => p.id));
  const results = [];
  for (const e of entries) {
    const src = e.project;
    const copied = ids.has(src.id);
    const clash =
      (src.kind === "lesson" && existing.some((p) => p.kind === "lesson" && p.lessonId === src.lessonId)) ||
      (src.kind === "challenge" && existing.some((p) => p.kind === "challenge" && p.challengeWeek === src.challengeWeek));
    const asFree = copied || clash;
    const project = {
      ...pickProject(src),
      id: copied ? uuid() : src.id,
      title: (copied ? copyTitle(src.title) : src.title).slice(0, TITLE_MAX) || t("common.newProject"),
      onion: normalizeOnion(src.onion),
      schemaVersion: 1,
      updatedAt: Date.now(),
      createdAt: src.createdAt || Date.now(),
    };
    if (asFree && project.kind !== "free") {
      project.kind = "free";
      delete project.lessonId;
      delete project.challengeWeek;
    }
    const records = [];
    for (const f of e.frames) {
      records.push({
        id: copied ? uuid() : f.id,
        projectId: project.id,
        imageBlob: f.png ? await dataURLToBlob(f.png) : null,
        hold: f.hold,
        lessonRole: project.kind === "lesson" ? f.lessonRole || "free" : "free",
        locked: project.kind === "lesson" ? !!f.locked : false,
      });
    }
    project.frameOrder = records.map((r) => r.id);
    project.thumbBlob = records[0].imageBlob
      ? await thumbFromBlob(records[0].imageBlob, project.width, project.height)
      : null;
    await db.saveProject(project, records);
    ids.add(project.id);
    results.push({ title: project.title, copied });
  }
  return results;
}

function normalizeOnion(o) {
  const c = (v) => (isInt(v) && v >= 0 && v <= 2 ? v : 1);
  return { enabled: o?.enabled !== false, prev: c(o?.prev), next: c(o?.next) };
}
