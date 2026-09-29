// The Editor's in-memory document: the project record plus one bitmap canvas per frame.
import * as db from "../store/db.js";
import { uuid, makeCanvas, ctx2d } from "../lib/util.js";
import { MAX_FRAMES } from "../store/projects.js";

export class FrameState {
  constructor({ id = uuid(), width, height, hold = 1, lessonRole = "free", locked = false }) {
    this.id = id;
    this.canvas = makeCanvas(width, height);
    this.ctx = ctx2d(this.canvas);
    this.hold = hold;
    this.lessonRole = lessonRole;
    this.locked = locked;
    this.version = 0; // bumps on every pixel change
    this.savedVersion = -1; // version last written to IndexedDB
    this.metaDirty = true; // hold/role changed since last save
  }

  get dirty() {
    return this.version !== this.savedVersion || this.metaDirty;
  }

  touch() {
    this.version++;
  }
}

export class Doc {
  constructor(project, frames) {
    this.project = project;
    this.frames = frames;
    this.deletedIds = new Set();
    this.projectDirty = false;
  }

  static async load(projectId) {
    const project = await db.getProject(projectId);
    if (!project) return null;
    const records = await db.getFrames(projectId);
    const byId = new Map(records.map((r) => [r.id, r]));
    const frames = [];
    for (const fid of project.frameOrder) {
      const r = byId.get(fid);
      const f = new FrameState({ id: fid, width: project.width, height: project.height, hold: r?.hold || 1, lessonRole: r?.lessonRole || "free", locked: !!r?.locked });
      if (r?.imageBlob) {
        try {
          const bmp = await createImageBitmap(r.imageBlob);
          f.ctx.drawImage(bmp, 0, 0);
          bmp.close?.();
        } catch (err) {
          console.warn("A frame image could not be decoded", fid, err);
        }
      }
      f.savedVersion = f.version;
      f.metaDirty = false;
      frames.push(f);
    }
    if (!frames.length) frames.push(new FrameState({ width: project.width, height: project.height }));
    return new Doc(project, frames);
  }

  get width() { return this.project.width; }
  get height() { return this.project.height; }
  get count() { return this.frames.length; }
  get isLesson() { return this.project.kind === "lesson"; }

  indexOf(id) {
    return this.frames.findIndex((f) => f.id === id);
  }

  canAdd() {
    return this.frames.length < MAX_FRAMES && !this.isLesson;
  }

  /** Inserts a frame after `index` (blank, or a copy of `copyFrom`). */
  insertFrame(index, copyFrom = null) {
    const f = new FrameState({ width: this.width, height: this.height, hold: copyFrom ? copyFrom.hold : 1 });
    if (copyFrom) {
      f.ctx.drawImage(copyFrom.canvas, 0, 0);
      f.touch();
    }
    this.frames.splice(index + 1, 0, f);
    this.deletedIds.delete(f.id);
    this.projectDirty = true;
    return f;
  }

  removeFrame(index) {
    const [f] = this.frames.splice(index, 1);
    this.deletedIds.add(f.id);
    this.projectDirty = true;
    return f;
  }

  restoreFrame(frame, index) {
    this.frames.splice(index, 0, frame);
    this.deletedIds.delete(frame.id);
    frame.metaDirty = true;
    frame.savedVersion = -1;
    this.projectDirty = true;
  }

  moveFrame(from, to) {
    const [f] = this.frames.splice(from, 1);
    this.frames.splice(to, 0, f);
    this.projectDirty = true;
  }

  /** Canvas size change: drawings stay centred; edges crop or pad (plan 2). */
  resize(width, height) {
    for (const f of this.frames) {
      const old = f.canvas;
      const next = makeCanvas(width, height);
      const g = ctx2d(next);
      g.drawImage(old, Math.round((width - old.width) / 2), Math.round((height - old.height) / 2));
      f.canvas = next;
      f.ctx = g;
      f.touch();
    }
    this.project.width = width;
    this.project.height = height;
    this.projectDirty = true;
  }

  hasContent() {
    return this.frames.some((f) => frameHasInk(f));
  }
}

/** True when a frame has any visible pixel (sampled every 4th pixel for speed). */
export function frameHasInk(frame) {
  const d = frame.ctx.getImageData(0, 0, frame.canvas.width, frame.canvas.height).data;
  for (let i = 3; i < d.length; i += 16) if (d[i] > 8) return true;
  return false;
}
