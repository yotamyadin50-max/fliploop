// Unload safety net (fix round R2). An IndexedDB write that starts in `pagehide` does not
// finish (measured: PNG encode plus a transaction, the page is gone first). localStorage is
// the only synchronous store, so on `pagehide` and on `visibilitychange: hidden` the pending
// work is also put there as one record per project. Boot applies the records to IndexedDB
// before the first screen and deletes them.
//
// Two tabs (Gatekeeper note G-01). A record is also taken in by any tab that is still open,
// the moment it appears (a `storage` event, app.js): a second tab that draws next then draws
// on top of the closed tab's last stroke instead of saving over it. If the stored project
// has moved on anyway (another tab saved first), the record is applied frame by frame: a
// frame nobody stored since the closed tab's version goes in; a frame somebody did store
// since is never written over, and what the closed tab had is then kept as a copy of its own
// in the Gallery. A record is only ever dropped when its content is already stored.
// Each tab keeps its own record per project (the key ends with a tab id), so a save in one
// tab can no longer delete what another tab left behind.
import * as db from "./db.js";
import { thumbFromBlob, copyTitle, newProjectRecord } from "./projects.js";
import { announceSaved } from "./channel.js";
import { emit } from "../lib/bus.js";
import { uuid, makeCanvas } from "../lib/util.js";

const PREFIX = "fliploop-rescue:";
const LOCK = "fliploop-rescue"; // Web Locks name: one tab at a time applies records
const MAX_CHARS = 4 * 1024 * 1024; // one 480x360 frame is a few tens of KB
const MAX_FRAMES = 30; // more than this is a canvas size change being written, not drawing
const FIELDS = ["title", "kind", "lessonId", "challengeWeek", "width", "height", "fps", "playMode", "onion", "createdAt", "schemaVersion", "touched"];
const USER_FIELDS = ["title", "width", "height", "fps", "playMode", "onion"]; // what a person can change on a project

const TAB = uuid();
const ownKey = (projectId) => `${PREFIX}${projectId}:${TAB}`;

/** Any rescue record: this tab's, another tab's, or one in the older key form without a tab id. */
export const isRescueKey = (key) => typeof key === "string" && key.startsWith(PREFIX);

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
 * write that is running right now (it may or may not commit). projectDirty = the title, the
 * settings, the frame order or a deletion is part of the unsaved work. Returns the record's
 * time, or null when nothing was written (nothing to rescue, too big, or storage blocked).
 */
export function writeRescue(doc, { frames, stroke = null, base = null, inflight = null, projectDirty = true }) {
  const key = ownKey(doc.project.id);
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
      v: 1, at, base, inflight, projectDirty, projectId: doc.project.id, project,
      frameOrder: doc.frames.map((f) => f.id), frames: out, deleted: [...doc.deletedIds],
    }));
    return at;
  } catch {
    return null; // quota or blocked storage: the normal save is still running
  }
}

/** Removes this tab's own record for the project. Another tab's record is never touched here. */
export function clearRescue(projectId) {
  try {
    localStorage.removeItem(ownKey(projectId));
  } catch { /* storage blocked: there is no record either */ }
}

/** A PNG data URL as a Blob, decoded here (no fetch of a data: URL, so no CSP dependency). */
export function pngToBlob(dataUrl) {
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

const holdOf = (f) => (Number.isInteger(f?.hold) ? f.hold : 1);

function sameValue(a, b) {
  if (a === b) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((k) => sameValue(a[k], b[k]));
}

/**
 * What a record may write, decided without touching anything (unit-tested).
 * storedFrames: Map of frame id -> stored frame record.
 *
 * { mode: "whole" }: the stored project is the version the closed tab knew (the one it had
 * loaded, or its own write that was in flight). Everything in the record goes in.
 *
 * { mode: "merge", apply, compare, missing, project }: another tab saved since. Per frame:
 * - apply: stored at or before the version the closed tab knew (frame `rev`, store/db.js),
 *   so nobody changed it since. The rescued frame goes in.
 * - compare: stored since, or with no `rev` (written by an older build, so nothing is known):
 *   never written over. It is fine only if it already holds the rescued pixels.
 * - missing: not part of the stored project (added by the closed tab, or deleted since).
 * - project: the closed tab had an unsaved title, setting, frame order or deletion that the
 *   stored project does not have.
 */
export function planRescue(rec, stored, storedFrames) {
  if (stored.updatedAt === rec.base || (rec.inflight != null && stored.updatedAt === rec.inflight)) return { mode: "whole" };
  const sameSize = (rec.project.width ?? stored.width) === stored.width && (rec.project.height ?? stored.height) === stored.height;
  const known = (rev) => typeof rev === "number" && ((typeof rec.base === "number" && rev <= rec.base) || rev === rec.inflight);
  const plan = { mode: "merge", apply: [], compare: [], missing: [], project: false };
  for (const f of rec.frames) {
    const s = storedFrames.get(f.id);
    if (!s || !stored.frameOrder.includes(f.id)) plan.missing.push(f);
    else if (sameSize && known(s.rev)) plan.apply.push(f);
    else plan.compare.push(f);
  }
  if (rec.projectDirty !== false) {
    plan.project = USER_FIELDS.some((k) => rec.project[k] !== undefined && !sameValue(rec.project[k], stored[k]))
      || !sameValue(rec.frameOrder, stored.frameOrder)
      || rec.deleted.some((id) => storedFrames.has(id));
  }
  return plan;
}

const toRecord = (f, projectId) => ({
  id: f.id, projectId, imageBlob: pngToBlob(f.png), hold: holdOf(f), lessonRole: f.lessonRole || "free", locked: !!f.locked,
});

/** The stored project is the version the record was made from: all of the record goes in. */
async function writeWhole(rec, stored) {
  const records = rec.frames.map((f) => toRecord(f, stored.id));
  const project = { ...stored };
  for (const k of FIELDS) if (rec.project[k] !== undefined) project[k] = rec.project[k];
  project.frameOrder = rec.frameOrder;
  project.updatedAt = Math.max(rec.at, stored.updatedAt + 1);
  const first = records.find((r) => r.id === rec.frameOrder[0]);
  if (first) project.thumbBlob = await thumbFromBlob(first.imageBlob, project.width, project.height);
  await db.saveProject(project, records, rec.deleted, { expectedUpdatedAt: stored.updatedAt });
  return project.updatedAt;
}

/** A newer project is stored: only frames nobody changed since go in; the rest of it stays as stored. */
async function writeFrames(rec, stored, frames) {
  const records = frames.map((f) => toRecord(f, stored.id));
  // Later than `rec.at + 1`: a tab that wrote the record and is still alive must see this as
  // another tab's version (Autosaver.write), not as its own record coming back.
  const project = { ...stored, updatedAt: Math.max(Date.now(), stored.updatedAt + 1, rec.at + 2) };
  if (rec.project.touched === true) project.touched = true;
  const first = records.find((r) => r.id === stored.frameOrder[0]);
  if (first) project.thumbBlob = await thumbFromBlob(first.imageBlob, project.width, project.height);
  await db.saveProject(project, records, [], { expectedUpdatedAt: stored.updatedAt });
  return project.updatedAt;
}

async function pixelsOf(blob) {
  try {
    const bmp = await createImageBitmap(blob);
    const c = makeCanvas(bmp.width, bmp.height);
    const g = c.getContext("2d", { willReadFrequently: true });
    g.drawImage(bmp, 0, 0);
    bmp.close?.();
    return g.getImageData(0, 0, c.width, c.height);
  } catch {
    return null;
  }
}

/** True when the stored frame already shows exactly what the record holds for it. */
async function alreadyStored(f, s) {
  if (holdOf(f) !== holdOf(s)) return false;
  const mine = await pixelsOf(pngToBlob(f.png));
  if (!mine) return true; // an image that does not decode holds nothing to keep
  if (!s.imageBlob) return mine.data.every((v) => v === 0); // a stored frame with no image is a blank page
  const theirs = await pixelsOf(s.imageBlob);
  if (!theirs || theirs.width !== mine.width || theirs.height !== mine.height) return false;
  const a = mine.data, b = theirs.data;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * What the closed tab had, as a free project of its own with the "(עותק)" title: its frames
 * in its order, the rescued ones as it drew them, the others as they are stored now.
 */
async function saveCopy(rec, stored, storedFrames) {
  const p = rec.project;
  const width = p.width ?? stored.width, height = p.height ?? stored.height;
  const sameSize = width === stored.width && height === stored.height;
  const rescued = new Map(rec.frames.map((f) => [f.id, f]));
  const project = newProjectRecord({
    title: copyTitle(p.title ?? stored.title), width, height,
    fps: p.fps ?? stored.fps, playMode: p.playMode ?? stored.playMode, onion: { ...(p.onion ?? stored.onion) },
  });
  const records = [];
  for (const fid of rec.frameOrder) {
    const f = rescued.get(fid);
    const s = sameSize ? storedFrames.get(fid) : null; // a frame of another size cannot sit in this project
    if (!f && !s) continue;
    records.push({
      id: uuid(), projectId: project.id, imageBlob: f ? pngToBlob(f.png) : s.imageBlob || null,
      hold: holdOf(f || s), lessonRole: "free", locked: false,
    });
  }
  if (!records.length) return;
  project.frameOrder = records.map((r) => r.id);
  project.thumbBlob = await thumbFromBlob(records[0].imageBlob, width, height);
  await db.saveProject(project, records);
}

/**
 * Applies one record. Resolves { updatedAt, copy, keep }: the stored project's new version
 * when something was written into it, whether a copy was made, and whether the record must
 * stay for another try. A stored frame that another tab saved since is never overwritten.
 */
async function applyOne(rec) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const stored = await db.getProject(rec.projectId);
    if (!stored) return {}; // deleted since: there is no project to put it into
    const storedFrames = new Map((await db.getFrames(rec.projectId)).map((f) => [f.id, f]));
    const plan = planRescue(rec, stored, storedFrames);
    try {
      if (plan.mode === "whole") return { updatedAt: await writeWhole(rec, stored) };
      const kept = [...plan.missing];
      for (const f of plan.compare) if (!(await alreadyStored(f, storedFrames.get(f.id)))) kept.push(f);
      const updatedAt = plan.apply.length ? await writeFrames(rec, stored, plan.apply) : null;
      const copy = kept.length > 0 || plan.project;
      if (copy) await saveCopy(rec, stored, storedFrames);
      return { updatedAt, copy };
    } catch (err) {
      if (!err?.conflict) throw err;
      // Another tab saved in this very moment: its version stays, and the record is looked at again.
    }
  }
  return { keep: true };
}

/** One tab at a time (Web Locks). Resolves null when the lock was not free within waitMs. */
async function withLock(fn, waitMs) {
  const locks = globalThis.navigator?.locks;
  if (!locks?.request) return fn(); // no Web Locks: a second pass finds the content stored and writes nothing
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), waitMs);
  try {
    return await locks.request(LOCK, { signal: ctl.signal }, () => {
      clearTimeout(timer);
      return fn();
    });
  } catch (err) {
    if (err?.name === "AbortError") return null; // the tab that holds the lock is applying them
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function applyAll() {
  const keys = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (isRescueKey(k)) keys.push(k);
    }
  } catch {
    return 0;
  }
  // This tab's own records stay: its saver is alive and will store that work itself.
  const found = keys.filter((key) => !key.endsWith(`:${TAB}`)).map((key) => {
    let raw = null, rec = null;
    try {
      raw = localStorage.getItem(key);
      rec = JSON.parse(raw);
    } catch { /* damaged record: dropped below */ }
    return { key, raw, rec: valid(rec) ? rec : null };
  });
  // Two tabs can each leave a record for one project: the older one first, the newer on top of it.
  found.sort((a, b) => (a.rec?.at ?? 0) - (b.rec?.at ?? 0));
  let applied = 0;
  for (const { key, raw, rec } of found) {
    let keep = false;
    if (rec) {
      try {
        const done = await applyOne(rec);
        keep = !!done.keep;
        if (done.updatedAt) {
          applied++;
          announceSaved(rec.projectId, done.updatedAt); // other tabs that have it open (R3)
          emit("project-rescued", { projectId: rec.projectId, updatedAt: done.updatedAt }); // this tab's Editor
        }
        if (done.updatedAt || done.copy) emit("projects-changed");
      } catch (err) {
        // Storage refused the write: keep the record, the next launch tries again.
        keep = true;
        if (err && typeof err === "object") err.handled = true;
        console.warn("A rescue record could not be applied yet", err);
      }
    }
    // A tab that is still alive may have written a newer record under the same key in the
    // meantime: that one stays, and its own `storage` event brings it here.
    if (!keep) try { if (localStorage.getItem(key) === raw) localStorage.removeItem(key); } catch { /* nothing to do */ }
  }
  return applied;
}

/**
 * Applies every rescue record, then deletes it: at boot before the first screen, and again
 * whenever another tab leaves one behind. Returns how many changed a stored project.
 * waitMs: how long to wait for a tab that is applying records right now.
 */
export async function applyRescues({ waitMs = 2000 } = {}) {
  return (await withLock(applyAll, waitMs)) ?? 0;
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
