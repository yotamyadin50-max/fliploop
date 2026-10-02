// Project file and backup (plan 3.4, 8): JSON with the project record and frames as PNG
// data URLs, schemaVersion 1. Built from IndexedDB, or from memory when saving fails (W3).
//
// Fix round 2026-10 (R6, R7):
// - A backup also carries `progress` (lesson dates, challenge weeks); import merges it.
// - Imported frames always get new ids; a project id the router cannot open gets a new id.
// - Import keeps the file's `updatedAt`. Same id and same `updatedAt` = already here, skipped.
//   Same id, other `updatedAt` = imported as a copy. A lesson or challenge project that
//   clashes with an existing one becomes a free copy with the "(עותק)" suffix.
// - A frame image that does not decode, or is not the project's size, imports blank and is
//   counted. A project with no readable frame at all is not imported.
// - Bad entries in a backup are skipped and counted; the valid ones import.
// - A backup counts as dismissing W1 (the 7-day rule then applies).
import * as db from "./db.js";
import { uuid, blobToDataURL, downloadBlob, safeFileName, dateISO, truncate } from "../lib/util.js";
import { t } from "../lib/i18n.js";
import { emit } from "../lib/bus.js";
import { copyTitle, thumbFromBlob, listProjects, MAX_FRAMES, TITLE_MAX } from "./projects.js";
import { updateSettings, getProgress, updateProgress, cleanProgress, mergeProgress } from "./settings.js";
import { pngToBlob } from "./rescue.js";

const PROJECT_FIELDS = ["id", "title", "kind", "lessonId", "challengeWeek", "width", "height", "fps", "playMode", "onion", "frameOrder", "createdAt", "updatedAt", "schemaVersion"];
const ROUTABLE_ID = /^[\w-]+$/; // what the router's #/editor/{id} accepts
const ROLES = ["free", "key", "blank"];
// Before this fix round a project could pass the 120-frame cap by a frame or two (F6). Such a
// project must still come back from a backup, so import allows a little more than the Editor.
const MAX_IMPORT_FRAMES = MAX_FRAMES + 10;
const PNG_PREFIX = "data:image/png;base64,";

function pickProject(p) {
  const out = {};
  for (const k of PROJECT_FIELDS) if (p[k] !== undefined) out[k] = p[k];
  return out;
}

export async function projectToJson(projectId) {
  const project = await db.getProject(projectId);
  if (!project) throw new Error("project not found");
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

/** Downloads one stored project. Resolves { name, title } (file name and project title, contract K6). */
export async function downloadProjectFile(projectId) {
  const entry = await projectToJson(projectId);
  const name = projectFileName(entry.project.title);
  downloadBlob(fileBlob({ format: "fliploop-project", schemaVersion: 1, ...entry }), name);
  return { name, title: entry.project.title };
}

export function downloadDocFile(doc) {
  const entry = docToJson(doc);
  const name = projectFileName(entry.project.title);
  downloadBlob(fileBlob({ format: "fliploop-project", schemaVersion: 1, ...entry }), name);
  return name;
}

const hasStamps = (p) => Object.keys(p.lessonsDone).length > 0 || p.challengeWeeks.length > 0;

/**
 * Full backup: every project (untouched blank ones stay out) plus the stamps. Returns the
 * file name, or null when there is nothing to back up.
 */
export async function downloadBackup() {
  const projects = await listProjects();
  const progress = cleanProgress(getProgress());
  if (!projects.length && !hasStamps(progress)) return null;
  const entries = [];
  for (const p of projects) entries.push(await projectToJson(p.id));
  const name = t("backup.file", { date: dateISO() });
  downloadBlob(fileBlob({ format: "fliploop-backup", schemaVersion: 1, projects: entries, progress }), name);
  const now = Date.now();
  await updateSettings({ lastBackupAt: now, w1DismissedAt: now }); // R7: the backup is the dismissal
  return name;
}

export class ImportError extends Error {
  constructor(code, detail = {}) {
    super(code);
    this.code = code; // "invalid" | "newer" | "tooBig" | "unreadable"
    Object.assign(this, detail);
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
  if (!e.frames.length || e.frames.length > MAX_IMPORT_FRAMES) return false;
  for (const f of e.frames) {
    if (!f || typeof f !== "object") return false;
    if (!(isInt(f.hold) && f.hold >= 1 && f.hold <= 12)) return false;
    if (f.png !== null && !(typeof f.png === "string" && f.png.startsWith(PNG_PREFIX))) return false;
  }
  return true;
}

/**
 * Parses a project file or backup. Returns { entries, bad, progress, backup }: the valid
 * project entries, how many backup entries were skipped as not valid, and the backup's
 * stamps (or null). Throws ImportError("invalid" | "newer").
 */
export function parseImport(text) {
  let data;
  try { data = JSON.parse(text); } catch { throw new ImportError("invalid"); }
  if (!data || typeof data !== "object") throw new ImportError("invalid");
  const version = data.schemaVersion ?? data.project?.schemaVersion;
  if (typeof version === "number" && version > 1) throw new ImportError("newer");
  if (version !== 1) throw new ImportError("invalid");
  const backup = data.format === "fliploop-backup" && Array.isArray(data.projects);
  let list;
  if (backup) list = data.projects;
  else if (data.project && data.frames) list = [data];
  else throw new ImportError("invalid");
  const entries = list.filter(validEntry);
  const progress = backup && data.progress ? cleanProgress(data.progress) : null;
  if (!entries.length && !(progress && hasStamps(progress))) throw new ImportError("invalid");
  return { entries, bad: list.length - entries.length, progress, backup };
}

export function estimateImportBytes(entries) {
  let n = 0;
  for (const e of entries) for (const f of e.frames) n += f.png ? f.png.length * 0.75 : 0;
  return n;
}

/** Width and height from the PNG's own header (IHDR), read without decoding the image. */
function pngSize(dataUrl) {
  try {
    const head = atob(dataUrl.slice(PNG_PREFIX.length, PNG_PREFIX.length + 44)); // 33 bytes
    if (head.slice(0, 8) !== "\x89PNG\r\n\x1a\n" || head.slice(12, 16) !== "IHDR") return null;
    const u32 = (i) => ((head.charCodeAt(i) << 24) | (head.charCodeAt(i + 1) << 16) | (head.charCodeAt(i + 2) << 8) | head.charCodeAt(i + 3)) >>> 0;
    return { w: u32(16), h: u32(20) };
  } catch {
    return null;
  }
}

/** A frame image as a Blob, or null when it is damaged or not width x height. Never decodes an oversized image. */
async function readFrame(png, width, height) {
  const size = pngSize(png);
  if (!size || size.w !== width || size.h !== height) return null;
  try {
    const blob = pngToBlob(png);
    const bmp = await createImageBitmap(blob);
    const ok = bmp.width === width && bmp.height === height;
    bmp.close?.();
    return ok ? blob : null;
  } catch {
    return null;
  }
}

const validTime = (v, fallback) => (typeof v === "number" && Number.isFinite(v) && v > 0 && v <= Date.now() + 86400000 ? v : fallback);

/**
 * Saves parsed entries and merges the backup's stamps. Returns a summary:
 * { titles, total, same, copies, clashes, unreadable, blankFrames, lostFrames, stamps, stopped }
 * stopped: null | "quota" | "error" (the entries before it stay imported).
 */
export async function importEntries(entries, { progress = null } = {}) {
  const existing = await db.getAllProjects();
  const byId = new Map(existing.map((p) => [p.id, p]));
  const lessons = new Set(existing.filter((p) => p.kind === "lesson").map((p) => p.lessonId));
  const weeks = new Set(existing.filter((p) => p.kind === "challenge").map((p) => p.challengeWeek));
  const out = { titles: [], total: entries.length, same: 0, copies: 0, clashes: 0, unreadable: 0, blankFrames: 0, lostFrames: 0, stamps: false, stopped: null };
  const now = Date.now();
  for (const e of entries) {
    const src = e.project;
    const there = byId.get(src.id);
    if (there && there.updatedAt === src.updatedAt) { out.same++; continue; } // already here
    const copied = !!there;
    const clash = !copied && ((src.kind === "lesson" && lessons.has(src.lessonId)) || (src.kind === "challenge" && weeks.has(src.challengeWeek)));
    const asFree = copied || clash;
    const kind = asFree ? "free" : src.kind;
    const updatedAt = validTime(src.updatedAt, now);
    const project = {
      ...pickProject(src),
      id: copied || !ROUTABLE_ID.test(src.id) ? uuid() : src.id,
      title: truncate(asFree ? copyTitle(src.title) : src.title, TITLE_MAX) || t("common.newProject"),
      kind,
      onion: normalizeOnion(src.onion),
      schemaVersion: 1,
      updatedAt,
      createdAt: validTime(src.createdAt, updatedAt),
    };
    if (kind !== "lesson") delete project.lessonId;
    if (kind !== "challenge") delete project.challengeWeek;
    // Frames: always new ids (a file must never be able to write over another project's frames).
    const records = [];
    let withImage = 0, blank = 0;
    for (const f of e.frames) {
      let blob = null;
      if (f.png !== null) {
        withImage++;
        blob = await readFrame(f.png, project.width, project.height);
        if (!blob) blank++;
      }
      records.push({
        id: uuid(),
        projectId: project.id,
        imageBlob: blob,
        hold: f.hold,
        lessonRole: kind === "lesson" && ROLES.includes(f.lessonRole) ? f.lessonRole : "free",
        locked: kind === "lesson" ? !!f.locked : false,
      });
    }
    if (withImage > 0 && blank === withImage) { // not one frame of it can be read
      out.unreadable++;
      out.lostFrames += blank;
      continue;
    }
    project.frameOrder = records.map((r) => r.id);
    project.thumbBlob = records[0].imageBlob
      ? await thumbFromBlob(records[0].imageBlob, project.width, project.height)
      : null;
    try {
      await db.saveProject(project, records);
    } catch (err) {
      if (err && typeof err === "object") err.handled = true; // the caller reports the partial import
      out.stopped = err?.name === "QuotaExceededError" ? "quota" : "error";
      console.error("Import stopped", err);
      break;
    }
    byId.set(project.id, project);
    if (kind === "lesson") lessons.add(project.lessonId);
    if (kind === "challenge") weeks.add(project.challengeWeek);
    out.titles.push(project.title);
    out.blankFrames += blank;
    if (copied) out.copies++;
    else if (clash) out.clashes++;
  }
  if (progress && hasStamps(progress)) {
    const count = (p) => Object.keys(p.lessonsDone).length + p.challengeWeeks.length;
    const before = count(cleanProgress(getProgress()));
    await updateProgress((mine) => {
      const merged = mergeProgress(mine, progress);
      mine.lessonsDone = merged.lessonsDone;
      mine.challengeWeeks = merged.challengeWeeks;
    });
    out.stamps = count(cleanProgress(getProgress())) > before;
  }
  if (out.titles.length || out.stamps) emit("projects-changed");
  return out;
}

function normalizeOnion(o) {
  const c = (v) => (isInt(v) && v >= 0 && v <= 2 ? v : 1);
  return { enabled: o?.enabled !== false, prev: c(o?.prev), next: c(o?.next) };
}
