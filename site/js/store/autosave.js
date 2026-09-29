// Autosave (plan d): 2 s after the last stroke, immediately after frame operations, at
// least every 10 s while dirty, and on visibilitychange hidden / pagehide. Only dirty
// frames are written, in one transaction with the project record. A failed save raises
// W3 and retries every 10 s until one succeeds.
import * as db from "./db.js";
import { canvasToBlob } from "../lib/util.js";
import { thumbFromBlob } from "./projects.js";
import { checkNearlyFull, requestPersistOnce } from "./storage.js";
import { frameHasInk } from "../editor/doc.js";
import { getSettings } from "./settings.js";

const STROKE_DELAY = 2000;
const MAX_INTERVAL = 10000;
const RETRY_INTERVAL = 10000;

export class Autosaver {
  constructor(doc, { onStatus, onSaved } = {}) {
    this.doc = doc;
    this.onStatus = onStatus || (() => {});
    this.onSaved = onSaved || (() => {});
    this.timer = null;
    this.saving = null;
    this.again = false;
    this.failed = false;
    this.lastSaveAt = Date.now();
    this.interval = setInterval(() => this.tick(), 1000);
    this.onHidden = () => { if (document.visibilityState === "hidden") this.saveNow(); };
    this.onPageHide = () => this.saveNow();
    document.addEventListener("visibilitychange", this.onHidden);
    addEventListener("pagehide", this.onPageHide);
  }

  get isDirty() {
    return this.doc.projectDirty || this.doc.deletedIds.size > 0 || this.doc.frames.some((f) => f.dirty);
  }

  strokeEnded() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.saveNow(), STROKE_DELAY);
  }

  frameOp() {
    this.doc.projectDirty = true;
    this.saveNow();
  }

  tick() {
    const wait = this.failed ? RETRY_INTERVAL : MAX_INTERVAL;
    if (this.isDirty && !this.saving && Date.now() - this.lastSaveAt >= wait) this.saveNow();
  }

  saveNow() {
    clearTimeout(this.timer);
    if (this.saving) {
      this.again = true;
      return this.saving;
    }
    if (!this.isDirty) return Promise.resolve(true);
    this.saving = this.write().finally(() => {
      this.saving = null;
      if (this.again) {
        this.again = false;
        this.saveNow();
      }
    });
    return this.saving;
  }

  async write() {
    const doc = this.doc;
    this.onStatus("saving");
    try {
      const snapshot = doc.frames.filter((f) => f.dirty).map((f) => ({ f, version: f.version }));
      const records = [];
      for (const { f } of snapshot) {
        records.push({
          id: f.id, projectId: doc.project.id, imageBlob: await canvasToBlob(f.canvas),
          hold: f.hold, lessonRole: f.lessonRole, locked: f.locked,
        });
      }
      const deleted = [...doc.deletedIds];
      const project = {
        ...doc.project,
        frameOrder: doc.frames.map((f) => f.id),
        updatedAt: Date.now(),
        thumbBlob: await thumbFromBlob(doc.frames[0].canvas, doc.width, doc.height),
      };
      await db.saveProject(project, records, deleted);
      doc.project.updatedAt = project.updatedAt;
      doc.project.frameOrder = project.frameOrder;
      for (const { f, version } of snapshot) {
        f.savedVersion = version;
        f.metaDirty = false;
      }
      for (const id of deleted) doc.deletedIds.delete(id);
      doc.projectDirty = false;
      this.lastSaveAt = Date.now();
      const wasFailed = this.failed;
      this.failed = false;
      this.onStatus(this.isDirty ? "saving" : "saved", { recovered: wasFailed });
      this.onSaved();
      if (!getSettings().persistRequested && doc.frames.some((f) => frameHasInk(f))) requestPersistOnce();
      checkNearlyFull();
      return true;
    } catch (err) {
      console.error("Autosave failed", err);
      this.failed = true;
      this.lastSaveAt = Date.now();
      this.onStatus("failed", { error: err });
      return false;
    }
  }

  async dispose() {
    clearInterval(this.interval);
    clearTimeout(this.timer);
    document.removeEventListener("visibilitychange", this.onHidden);
    removeEventListener("pagehide", this.onPageHide);
    await this.saveNow();
  }
}
