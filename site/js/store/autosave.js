// Autosave (plan d, fix round R1, R2, R3): 250 ms after the last change, immediately after
// frame operations, at least every 2 s while changes keep coming. Only dirty frames are
// written, in one transaction with the project record. A failed save raises W3 and retries
// every 10 s until one succeeds.
//
// The status is honest: from the moment anything changes (or a stroke is under way) it is
// "saving", and it becomes "saved" only when the transaction has committed and nothing is
// left to write.
//
// Unload: an async write started in `pagehide` does not finish, so on `pagehide` and on
// `visibilitychange: hidden` the pending work also goes into localStorage, synchronously
// (store/rescue.js). Boot applies that record, and so does any other tab that is open when
// it appears. A successful save that leaves nothing pending deletes it.
//
// Two tabs: every write names the stored version this tab last read or wrote. If a newer
// one is stored, nothing is written, the saver stops (`conflict`) and the Editor asks the
// user. After each save the other tabs are told (store/channel.js).
import * as db from "./db.js";
import { canvasToBlob, makeCanvas } from "../lib/util.js";
import { thumbFromBlob } from "./projects.js";
import { checkNearlyFull, requestPersistOnce } from "./storage.js";
import { frameHasInk } from "../editor/doc.js";
import { getSettings } from "./settings.js";
import { writeRescue, clearRescue } from "./rescue.js";
import { announceSaved } from "./channel.js";

const STROKE_DELAY = 250;
const MAX_INTERVAL = 2000;
const RETRY_INTERVAL = 10000;
const TICK = 250;

export class Autosaver {
  /**
   * activeStroke(): the gesture in progress ({ frame, before: ImageData }) or null. A frame
   * is never encoded in the middle of a stroke: it is written as it was before the stroke.
   * onConflict(): another tab stored a newer version; this tab can no longer save.
   */
  constructor(doc, { onStatus, onSaved, onConflict, activeStroke } = {}) {
    this.doc = doc;
    this.onStatus = onStatus || (() => {});
    this.onSaved = onSaved || (() => {});
    this.onConflict = onConflict || (() => {});
    this.activeStroke = activeStroke || (() => null);
    this.timer = null;
    this.saving = null;
    this.again = false;
    this.failed = false;
    this.conflict = false; // a newer version is stored: no further writes from this document
    this.rewriteAll = false; // the stored project is gone: the next write stores every frame
    this.pendingSince = null; // time of the oldest change no write has picked up yet
    this.lastAttemptAt = Date.now();
    this.baseUpdatedAt = doc.project.updatedAt; // the stored version this tab last read or wrote
    this.inflightUpdatedAt = null;
    this.rescues = []; // times of the rescue records written since this tab's last own save
    this.writing = new Set(); // frames inside the write that is running
    this.writingProject = false; // that write also carries a project change (title, settings, order, a deletion)
    this.state = "saved";
    this.interval = setInterval(() => this.tick(), TICK);
    this.onHidden = () => { if (document.visibilityState === "hidden") this.leaving(); };
    this.onPageHide = () => this.leaving();
    document.addEventListener("visibilitychange", this.onHidden);
    addEventListener("pagehide", this.onPageHide);
  }

  get isDirty() {
    return this.doc.projectDirty || this.doc.deletedIds.size > 0 || this.doc.frames.some((f) => f.dirty);
  }

  /** Nothing left to write: no pending change, no write in flight or waiting, and the last write succeeded. */
  get isClean() {
    return !this.isDirty && !this.saving && !this.failed && !this.conflict && this.timer === null;
  }

  /** Reports the status when it changed: "failed" | "saving" | "saved". */
  refresh(info = {}) {
    const state = this.failed || this.conflict ? "failed"
      : this.isDirty || this.saving || this.timer !== null || this.activeStroke() ? "saving" : "saved";
    if (state === this.state && !info.error && !info.recovered) return;
    this.state = state;
    this.onStatus(state, info);
  }

  /** Something changed (a stroke ended, a title key, fps, mode, onion): save 250 ms after the last change. */
  strokeEnded() {
    this.pendingSince ??= Date.now();
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.timer = null; this.saveNow(); }, STROKE_DELAY);
    this.refresh();
  }

  frameOp() {
    this.doc.projectDirty = true;
    this.pendingSince ??= Date.now();
    this.saveNow();
  }

  tick() {
    if (this.saving || this.conflict) return;
    if (this.failed) {
      if (this.isDirty && Date.now() - this.lastAttemptAt >= RETRY_INTERVAL) this.saveNow();
      return;
    }
    // Changes that keep coming (each one restarts the 250 ms wait) are still written every 2 s.
    if (this.isDirty && this.pendingSince !== null && Date.now() - this.pendingSince >= MAX_INTERVAL) this.saveNow();
    else this.refresh(); // a cancelled stroke leaves nothing to save: the label goes back
  }

  saveNow() {
    clearTimeout(this.timer);
    this.timer = null;
    if (this.saving) {
      this.again = true;
      return this.saving;
    }
    if (this.conflict) {
      // Every further change says it again: from here nothing can be saved.
      if (this.isDirty) this.onConflict();
      this.refresh();
      return Promise.resolve(false);
    }
    if (!this.isDirty) {
      this.refresh();
      return Promise.resolve(!this.failed);
    }
    const run = this.write().then(({ ok, info, retry }) => {
      if (this.saving === run) this.saving = null;
      if ((this.again || retry) && !this.conflict) {
        this.again = false;
        this.saveNow();
      }
      this.again = false;
      this.refresh(info);
      if (ok) this.onSaved();
      if (this.conflict && info.conflict) this.onConflict();
      return ok;
    });
    this.saving = run;
    this.refresh();
    return run;
  }

  /** The canvas to encode for a frame: the frame itself, or its pre-stroke pixels while a stroke is open on it. */
  source(frame) {
    const stroke = this.activeStroke();
    if (!stroke || stroke.frame !== frame || !stroke.before) return frame.canvas;
    const c = makeCanvas(stroke.before.width, stroke.before.height);
    c.getContext("2d").putImageData(stroke.before, 0, 0);
    return c;
  }

  /** R5: a new project counts as the user's own from its first ink or its second frame (a rename sets it too). */
  markTouched() {
    const doc = this.doc;
    if (doc.project.touched !== false) return;
    if (doc.frames.length > 1 || doc.frames.some((f) => frameHasInk(f))) doc.project.touched = true;
  }

  /** One write. Never throws: resolves { ok, info, retry } for saveNow() to report. */
  async write() {
    const doc = this.doc;
    const pendingSince = this.pendingSince;
    this.pendingSince = null;
    this.markTouched();
    // The dirty flags are cleared at the moment the values are read (CODE-C2). A change made
    // while this write is running sets them again, so the follow-up write picks it up; they
    // are put back if this write fails.
    const projectWasDirty = doc.projectDirty;
    doc.projectDirty = false;
    const fields = { ...doc.project };
    const frameOrder = doc.frames.map((f) => f.id);
    const deleted = [...doc.deletedIds];
    const all = this.rewriteAll;
    const frames = doc.frames.filter((f) => all || f.dirty);
    const snapshot = [];
    this.writing = new Set(frames);
    this.writingProject = projectWasDirty || deleted.length > 0;
    try {
      const records = [];
      for (const f of frames) {
        // Version, hold and pixels are read in one go (toBlob copies the bitmap when it is
        // called), so a stroke that ends later leaves the frame dirty.
        const entry = { f, version: f.version, metaWasDirty: f.metaDirty };
        f.metaDirty = false;
        snapshot.push(entry);
        const record = { id: f.id, projectId: fields.id, hold: f.hold, lessonRole: f.lessonRole, locked: f.locked };
        record.imageBlob = await canvasToBlob(this.source(f));
        records.push(record);
      }
      const project = {
        ...fields,
        frameOrder,
        updatedAt: Math.max(Date.now(), (this.baseUpdatedAt || 0) + 1),
        thumbBlob: await thumbFromBlob(this.source(doc.frames[0]), doc.width, doc.height),
      };
      this.inflightUpdatedAt = project.updatedAt;
      await db.saveProject(project, records, deleted, all ? {} : { expectedUpdatedAt: this.baseUpdatedAt });
      this.inflightUpdatedAt = null;
      this.rewriteAll = false;
      this.baseUpdatedAt = project.updatedAt;
      doc.project.updatedAt = project.updatedAt;
      doc.project.frameOrder = frameOrder;
      for (const { f, version } of snapshot) f.savedVersion = version;
      for (const id of deleted) doc.deletedIds.delete(id);
      this.writing = new Set();
      this.writingProject = false;
      this.rescues = [];
      this.lastAttemptAt = Date.now();
      const wasFailed = this.failed;
      this.failed = false;
      if (this.isDirty) this.pendingSince ??= Date.now();
      else clearRescue(doc.project.id); // everything is in IndexedDB: the unload record is redundant
      announceSaved(doc.project.id, project.updatedAt);
      if (!getSettings().persistRequested && doc.frames.some((f) => frameHasInk(f))) requestPersistOnce();
      checkNearlyFull();
      return { ok: true, info: { recovered: wasFailed } };
    } catch (err) {
      if (projectWasDirty) doc.projectDirty = true;
      for (const { f, metaWasDirty } of snapshot) if (metaWasDirty) f.metaDirty = true;
      this.inflightUpdatedAt = null;
      this.writing = new Set();
      this.writingProject = false;
      this.pendingSince = pendingSince ?? Date.now();
      this.lastAttemptAt = Date.now();
      if (err?.conflict === "missing") {
        // The stored project is gone (deleted elsewhere, or cleaned up as never used) while it
        // is being drawn on here: the drawing wins, the next write stores all of it.
        this.rewriteAll = true;
        doc.projectDirty = true;
        return { ok: false, info: {}, retry: true };
      }
      if (err?.conflict === "newer") {
        if (this.adoptOwnRescue(err.storedUpdatedAt)) return { ok: false, info: {}, retry: true };
        this.conflict = true;
        return { ok: false, info: { conflict: true } };
      }
      console.error("Autosave failed", err);
      if (err && typeof err === "object") err.handled = true; // W3 is this failure's message
      this.failed = true;
      return { ok: false, info: { error: err } };
    }
  }

  /**
   * A stored version that is newer than this tab's is this tab's own rescue record when
   * another tab applied it (at its launch, or the moment the record appeared while this tab
   * was hidden): rescue.js stores it under the record's time, or one above. Everything in it
   * is already on this screen, so this tab goes on from that version. Returns false for any
   * other version.
   */
  adoptOwnRescue(updatedAt) {
    if (this.conflict || !this.rescues.some((at) => updatedAt >= at && updatedAt <= at + 1)) return false;
    if (updatedAt > this.baseUpdatedAt) this.baseUpdatedAt = updatedAt;
    return true;
  }

  /** `pagehide` or `visibilitychange: hidden`: the synchronous record first, then the normal save. */
  leaving() {
    if (this.conflict) return; // a newer version is stored and the dialog said so: what is here can be downloaded there
    this.rescue();
    this.saveNow();
  }

  /** Puts everything unsaved into the localStorage rescue record, synchronously. */
  rescue() {
    const doc = this.doc;
    if (!this.isDirty && !this.saving) return null;
    this.markTouched();
    const frames = doc.frames.filter((f) => f.dirty || this.writing.has(f));
    const at = writeRescue(doc, {
      frames, stroke: this.activeStroke(), base: this.baseUpdatedAt, inflight: this.inflightUpdatedAt,
      projectDirty: doc.projectDirty || doc.deletedIds.size > 0 || this.writingProject,
    });
    if (at !== null) this.rescues = [...this.rescues.slice(-15), at];
    return at;
  }

  /** Stops timers and listeners without saving (the document is being replaced or reloaded). */
  stop() {
    clearInterval(this.interval);
    clearTimeout(this.timer);
    this.timer = null;
    document.removeEventListener("visibilitychange", this.onHidden);
    removeEventListener("pagehide", this.onPageHide);
  }

  async dispose() {
    this.stop();
    await this.saveNow();
    if (this.again || (this.isDirty && !this.failed && !this.conflict)) await this.saveNow(); // a change that landed during that write
  }
}
