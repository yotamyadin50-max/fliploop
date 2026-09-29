// IndexedDB database `fliploop` v1 (plan c): stores projects, frames (index projectId), meta.
// Blobs are stored directly; if this browser refuses Blobs in IndexedDB (older Safari),
// they are stored as { buf: ArrayBuffer, type } and turned back into Blobs on read.

const DB_NAME = "fliploop";
const VERSION = 1;
let dbPromise = null;
let blobMode = "blob";

function promisify(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!("indexedDB" in globalThis)) {
      reject(new Error("IndexedDB is not available"));
      return;
    }
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("projects")) db.createObjectStore("projects", { keyPath: "id" });
      if (!db.objectStoreNames.contains("frames")) {
        const frames = db.createObjectStore("frames", { keyPath: "id" });
        frames.createIndex("projectId", "projectId", { unique: false });
      }
      if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error("IndexedDB open blocked"));
  }).then(async (db) => {
    await detectBlobMode(db);
    return db;
  });
  dbPromise.catch(() => { dbPromise = null; });
  return dbPromise;
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

export function getBlobMode() {
  return blobMode;
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
  const db = await openDb();
  return runTx(db, stores, mode, fn);
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

/** Writes a project record plus changed frames, and deletes removed frames, in one transaction. */
export async function saveProject(project, framesToPut = [], frameIdsToDelete = []) {
  // Pack before opening the transaction: IndexedDB commits as soon as it goes idle.
  const packedProject = await packProject(project);
  const packedFrames = await Promise.all(framesToPut.map(packFrame));
  return tx(["projects", "frames"], "readwrite", (t) => {
    const fs = t.objectStore("frames");
    for (const f of packedFrames) fs.put(f);
    for (const id of frameIdsToDelete) fs.delete(id);
    t.objectStore("projects").put(packedProject);
  });
}

export async function deleteProject(id) {
  const frameIds = await tx(["frames"], "readonly", (t) =>
    promisify(t.objectStore("frames").index("projectId").getAllKeys(id)));
  return tx(["projects", "frames"], "readwrite", (t) => {
    const fs = t.objectStore("frames");
    for (const fid of frameIds) fs.delete(fid);
    t.objectStore("projects").delete(id);
  });
}

export async function getMeta(key) {
  return tx(["meta"], "readonly", (t) => promisify(t.objectStore("meta").get(key)));
}

export async function setMeta(key, value) {
  return tx(["meta"], "readwrite", (t) => { t.objectStore("meta").put(value, key); });
}
