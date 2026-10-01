// Unload safety net (fix round R2). An IndexedDB write that starts in `pagehide` does not
// finish (measured: PNG encode plus a transaction, the page is gone first). localStorage is
// the only synchronous store, so on `pagehide` and on `visibilitychange: hidden` the pending
// work is also put there as one record per project. Boot applies the records to IndexedDB
// before the first screen and deletes them.
import * as db from "./db.js";
import { thumbFromBlob } from "./projects.js";

const PREFIX = "fliploop-rescue:";
const MAX_CHARS = 4 * 1024 * 1024; // one 480x360 frame is a few tens of KB
const MAX_FRAMES = 30; // more than this is a canvas size change being written, not drawing
const FIELDS = ["title", "kind", "lessonId", "challengeWeek", "width", "height", "fps", "playMode", "onion", "createdAt", "schemaVersion", "touched"];

/** PNG data URL of a frame. A frame with a stroke in progress is taken as it was before the stroke. */
function frameDataUrl(frame, stroke) {
  if (stroke && stroke.frame === frame && stroke.before) {
    const c = document.createElement("canvas");
    c.width = stroke.before.width;
    c.height = stroke.before.height;
    c.getContext("2d").putImageData(stroke.before, 0, 0);
    return c.toDataURL("image/png");
  }
  return frame.canvas.toDataURL("image/png");
}

/**
 * Writes the rescue record for `doc`, synchronously. frames = the frames with unsaved work.
 * base = the stored `updatedAt` this tab last read or wrote; inflight = the `updatedAt` of a
 * write that is running right now (it may or may not commit). Returns the record's time, or
 * null when nothing was written (nothing to rescue, too big, or storage blocked).
 */
export function writeRescue(doc, { frames, stroke = null, base = null, inflight = null }) {
  const key = PREFIX + doc.project.id;
  try {
    if (frames.length > MAX_FRAMES) return null;
    const out = [];
    let size = 0;
    for (const f of frames) {
      const png = frameDataUrl(f, stroke);
      size += png.length;
      if (size > MAX_CHARS) return null;
      out.push({ id: f.id, hold: f.hold, lessonRole: f.lessonRole, locked: f.locked, png });
    }
    const project = {};
    for (const k of FIELDS) if (doc.project[k] !== undefined) project[k] = doc.project[k];
    const at = Date.now();
    localStorage.setItem(key, JSON.stringify({
      v: 1, at, base, inflight, projectId: doc.project.id, project,
      frameOrder: doc.frames.map((f) => f.id), frames: out, deleted: [...doc.deletedIds],
    }));
    return at;
  } catch {
    return null; // quota or blocked storage: the normal save is still running
  }
}

export function clearRescue(projectId) {
  try {
    localStorage.removeItem(PREFIX + projectId);
  } catch { /* storage blocked: there is no record either */ }
}

function pngToBlob(dataUrl) {
  const bin = atob(dataUrl.slice(dataUrl.indexOf(",") + 1));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: "image/png" });
}

function valid(rec) {
  return !!rec && rec.v === 1 && typeof rec.projectId === "string" && typeof rec.at === "number"
    && Array.isArray(rec.frames) && Array.isArray(rec.frameOrder) && rec.frameOrder.length > 0
    && Array.isArray(rec.deleted) && !!rec.project && typeof rec.project === "object"
    && rec.frames.every((f) => f && typeof f.id === "string" && typeof f.png === "string" && f.png.startsWith("data:image/png;base64,"));
}

/**
 * Applies one record. Only when the stored project is the version this tab knew (the one it
 * had loaded, or its own write that was in flight): a project another tab saved since then
 * is newer and is never overwritten.
 */
async function applyOne(rec) {
  const stored = await db.getProject(rec.projectId);
  if (!stored) return false;
  if (stored.updatedAt !== rec.base && stored.updatedAt !== rec.inflight) return false;
  const records = rec.frames.map((f) => ({
    id: f.id, projectId: stored.id, imageBlob: pngToBlob(f.png),
    hold: Number.isInteger(f.hold) ? f.hold : 1, lessonRole: f.lessonRole || "free", locked: !!f.locked,
  }));
  const project = { ...stored };
  for (const k of FIELDS) if (rec.project[k] !== undefined) project[k] = rec.project[k];
  project.frameOrder = rec.frameOrder;
  project.updatedAt = Math.max(rec.at, stored.updatedAt + 1);
  const first = records.find((r) => r.id === rec.frameOrder[0]);
  if (first) project.thumbBlob = await thumbFromBlob(first.imageBlob, project.width, project.height);
  await db.saveProject(project, records, rec.deleted);
  return true;
}

/** Boot: applies every rescue record, then deletes it. Returns how many were applied. */
export async function applyRescues() {
  const keys = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) keys.push(k);
    }
  } catch {
    return 0;
  }
  let applied = 0;
  for (const key of keys) {
    let rec = null;
    try { rec = JSON.parse(localStorage.getItem(key)); } catch { /* damaged record: dropped below */ }
    let keep = false;
    if (valid(rec)) {
      try {
        if (await applyOne(rec)) applied++;
      } catch (err) {
        // Storage refused the write: keep the record, the next launch tries again.
        keep = true;
        if (err && typeof err === "object") err.handled = true;
        console.warn("A rescue record could not be applied yet", err);
      }
    }
    if (!keep) try { localStorage.removeItem(key); } catch { /* nothing to do */ }
  }
  return applied;
}

// ---------- a document whose save was still failing when its Editor closed (S7) ----------
let unsaved = null;

export function holdUnsaved(doc) {
  unsaved = doc;
}

export function heldUnsaved() {
  return unsaved;
}

export function releaseUnsaved(doc = unsaved) {
  if (unsaved === doc) unsaved = null;
}
