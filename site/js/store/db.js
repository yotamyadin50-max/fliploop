// IndexedDB database `fliploop` v1 (plan c): stores projects, frames (index projectId), meta.
// Blobs are stored directly; if this browser refuses Blobs in IndexedDB (older Safari),
// they are stored as { buf: ArrayBuffer, type } and turned back into Blobs on read.
//
// Fix round 2026-10 (R3, R4):
// - Every error thrown from here carries `err.storage === true` (contract K1). Unless a caller
//   sets `err.handled = true` (it shows its own message), the bus event "storage-error" fires
//   once for it and the app shell shows one toast.
// - open() gets 3 s to answer; a connection the browser closed is reopened once; this version
//   closes its connection when a newer version asks for the database.
// - A project write can name the stored `updatedAt` it expects; a newer stored version makes
//   the transaction abort with `err.conflict` (never a silent overwrite).
import { emit } from "../lib/bus.js";

const DB_NAME = "fliploop";
const VERSION = 1;
const OPEN_TIMEOUT = 3000;
const RETRY_AFTER = 10000; // after a failed open, later calls fail at once for this long
let dbPromise = null;
let blobMode = "blob";
let state = "unknown"; // "ok" once an open succeeded, "blocked" after one failed
let lastFailure = null; // { at, name, message }

function promisify(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Marks an error as a storage failure and reports it once, unless a caller handles it first. */
function storageError(err) {
  const e = err && typeof err === "object" ? err : new Error(String(err || "storage error"));
  if (e.storage) return e;
  try { e.storage = true; } catch { /* a frozen error object: reported below anyway */ }
  // Deferred, so every `catch` on the way up runs first and can set `handled`.
  setTimeout(() => reportStorageError(e), 0);
  return e;
}

/**
 * Fires "storage-error" for this error, once. force: report it even though a lower layer
 * marked it handled (an action's own catch decides that the user must be told).
 */
export function reportStorageError(e, { force = false } = {}) {
  if (!e || e.reported || (e.handled && !force)) return;
  e.reported = true;
  emit("storage-error", e);
}

/** "ok" | "blocked" | "unknown" (before the first open settled). */
export function storageState() {
  return state;
}

/** Opens (or returns) the connection. retry: try again even right after a failed open. */
export function openDb({ retry = false } = {}) {
  if (dbPromise) return dbPromise;
  if (!retry && lastFailure && Date.now() - lastFailure.at < RETRY_AFTER) {
    const again = new Error(lastFailure.message);
    again.name = lastFailure.name;
    return Promise.reject(storageError(again));
  }
  const attempt = new Promise((resolve, reject) => {
    let settled = false;
    const fail = (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(err || new Error("IndexedDB open failed"));
    };
    // A request that never answers (seen as a browser fault) must not leave a blank page.
    const timer = setTimeout(() => {
      const err = new Error("IndexedDB open timed out");
      err.name = "TimeoutError";
      fail(err);
    }, OPEN_TIMEOUT);
    let req;
    try {
      if (!globalThis.indexedDB) throw new Error("IndexedDB is not available");
      req = indexedDB.open(DB_NAME, VERSION);
    } catch (err) {
      fail(err);
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("projects")) db.createObjectStore("projects", { keyPath: "id" });
      if (!db.objectStoreNames.contains("frames")) {
        const frames = db.createObjectStore("frames", { keyPath: "id" });
        frames.createIndex("projectId", "projectId", { unique: false });
      }
      if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta");
    };
    req.onsuccess = () => {
      if (settled) { req.result.close(); return; } // answered after the timeout: do not leak it
      settled = true;
      clearTimeout(timer);
      resolve(req.result);
    };
    req.onerror = () => fail(req.error);
    // "blocked" (another tab still holds an older version open) is not an error by itself:
    // success follows as soon as that tab closes its connection; the timeout covers one that never does.
  }).then(async (db) => {
    // A newer version of the app wants to upgrade the database: let it, and reopen on demand.
    db.onversionchange = () => { db.close(); if (dbPromise === attempt) dbPromise = null; };
    // The browser dropped the connection (Safari after backgrounding, site data cleared).
    db.onclose = () => { if (dbPromise === attempt) dbPromise = null; };
    await detectBlobMode(db);
    state = "ok";
    lastFailure = null;
    return db;
  }, (err) => {
    if (dbPromise === attempt) dbPromise = null;
    state = "blocked";
    lastFailure = { at: Date.now(), name: err?.name || "Error", message: err?.message || String(err) };
    throw storageError(err);
  });
  dbPromise = attempt;
  return attempt;
}

async function detectBlobMode(db) {
  try {
    await runTx(db, ["meta"], "readwrite", (tx) => tx.objectStore("meta").put(new Blob(["x"]), "__blobProbe"));
    const back = await runTx(db, ["meta"], "readonly", (tx) => promisify(tx.objectStore("meta").get("__blobProbe")));
    blobMode = back instanceof Blob ? "blob" : "buffer";
  } catch {
    blobMode = "buffer";
  }
}

/** Runs fn inside one transaction; resolves when it commits (so a quota failure rejects). */
function runTx(db, stores, mode, fn) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(stores, mode);
    let result;
    Promise.resolve()
      .then(() => fn(tx))
      .then((r) => { result = r; })
      .catch((err) => { try { tx.abort(); } catch { /* already finished */ } reject(err); });
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error || new Error("transaction error"));
    tx.onabort = () => reject(tx.error || new Error("transaction aborted"));
  });
}

export async function tx(stores, mode, fn) {
  for (let attempt = 0; ; attempt++) {
    const pending = openDb();
    const db = await pending;
    try {
      return await runTx(db, stores, mode, fn);
    } catch (err) {
      if (err?.conflict) throw err; // not a storage failure: the caller decides
      // The connection was closed underneath us: open a new one and try once more.
      if (attempt === 0 && err?.name === "InvalidStateError") {
        if (dbPromise === pending) dbPromise = null;
        continue;
      }
      throw storageError(err);
    }
  }
}

async function packBlob(blob) {
  if (!blob || blobMode === "blob") return blob;
  return { buf: await blob.arrayBuffer(), type: blob.type };
}

function unpackBlob(v) {
  if (!v || v instanceof Blob) return v || null;
  if (v.buf) return new Blob([v.buf], { type: v.type || "image/png" });
  return null;
}

async function packProject(p) {
  return { ...p, thumbBlob: await packBlob(p.thumbBlob) };
}

function unpackProject(p) {
  return p ? { ...p, thumbBlob: unpackBlob(p.thumbBlob) } : null;
}

async function packFrame(f) {
  return { ...f, imageBlob: await packBlob(f.imageBlob) };
}

function unpackFrame(f) {
  return { ...f, imageBlob: unpackBlob(f.imageBlob) };
}

export async function getAllProjects() {
  const list = await tx(["projects"], "readonly", (t) => promisify(t.objectStore("projects").getAll()));
  return list.map(unpackProject);
}

export async function getProject(id) {
  const p = await tx(["projects"], "readonly", (t) => promisify(t.objectStore("projects").get(id)));
  return unpackProject(p);
}

export async function getFrames(projectId) {
  const list = await tx(["frames"], "readonly", (t) =>
    promisify(t.objectStore("frames").index("projectId").getAll(projectId)));
  return list.map(unpackFrame);
}

function conflict(kind, storedUpdatedAt = null) {
  const err = new Error(kind === "missing" ? "The project is no longer stored" : "A newer version of the project is stored");
  err.name = "ConflictError";
  err.conflict = kind; // "newer" | "missing"
  err.storedUpdatedAt = storedUpdatedAt;
  return err;
}

/**
 * Writes a project record plus changed frames, and deletes removed frames, in one transaction.
 * expectedUpdatedAt (two-tab rule, R3): the stored `updatedAt` the caller last read or wrote.
 * When the stored record is newer, or gone, nothing is written and the call rejects with
 * `err.conflict` ("newer" | "missing").
 * Every frame written gets `rev`, the project `updatedAt` of this write: it says which
 * version of the project last changed that frame (store/rescue.js reads it).
 */
export async function saveProject(project, framesToPut = [], frameIdsToDelete = [], { expectedUpdatedAt } = {}) {
  // Pack before opening the transaction: IndexedDB commits as soon as it goes idle.
  const packedProject = await packProject(project);
  const packedFrames = await Promise.all(framesToPut.map((f) => packFrame({ ...f, rev: project.updatedAt })));
  return tx(["projects", "frames"], "readwrite", async (t) => {
    const ps = t.objectStore("projects");
    if (expectedUpdatedAt !== undefined) {
      const stored = await promisify(ps.get(project.id));
      if (!stored) throw conflict("missing");
      if (stored.updatedAt > expectedUpdatedAt) throw conflict("newer", stored.updatedAt);
    }
    const fs = t.objectStore("frames");
    for (const f of packedFrames) fs.put(f);
    for (const id of frameIdsToDelete) fs.delete(id);
    ps.put(packedProject);
  });
}

/** Deletes a project and its frames in one transaction (no orphan frames, CODE-L6). */
export async function deleteProject(id) {
  await takeProject(id);
}

/** Deletes a project and returns what was stored ({ project, frames }), all in one transaction. */
export async function takeProject(id) {
  const taken = await tx(["projects", "frames"], "readwrite", async (t) => {
    const ps = t.objectStore("projects");
    const fs = t.objectStore("frames");
    const project = await promisify(ps.get(id));
    const frames = await promisify(fs.index("projectId").getAll(id));
    for (const f of frames) fs.delete(f.id);
    ps.delete(id);
    return { project, frames };
  });
  return { project: unpackProject(taken.project), frames: taken.frames.map(unpackFrame) };
}

export async function getMeta(key) {
  return tx(["meta"], "readonly", (t) => promisify(t.objectStore("meta").get(key)));
}

export async function setMeta(key, value) {
  return tx(["meta"], "readwrite", (t) => { t.objectStore("meta").put(value, key); });
}

/** Read, merge, write in one transaction: merge(stored) returns the value to store (two tabs, R3). */
export async function updateMeta(key, merge) {
  return tx(["meta"], "readwrite", async (t) => {
    const store = t.objectStore("meta");
    const next = merge(await promisify(store.get(key)));
    store.put(next, key);
    return next;
  });
}
