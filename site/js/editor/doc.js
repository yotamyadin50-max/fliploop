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
      // A copy of an unedited, cropped frame can get its sides back too (see resizeFrame).
      if (copyFrom.cut && copyFrom.cut.version === copyFrom.version) f.cut = { ...copyFrom.cut, version: f.version };
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
    // A frame deleted before a canvas size change comes back at the size the project has now.
    resizeFrame(frame, this.width, this.height);
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

  /**
   * Canvas size change: drawings stay centred; edges crop or pad (plan 2).
   * What a crop cuts off is kept in memory, per frame, until the Editor is left (fix round R9):
   * changing back restores every frame that was not edited in between, pixel for pixel.
   * Nothing of that is saved; a reload shows the cropped frames.
   */
  resize(width, height) {
    for (const f of this.frames) resizeFrame(f, width, height);
    this.project.width = width;
    this.project.height = height;
    this.projectDirty = true;
  }

  hasContent() {
    return this.frames.some((f) => frameHasInk(f));
  }
}

/**
 * Gives one frame a new canvas of width x height with its drawing centred.
 * frame.cut = { width, height, version, pieces }: the pixels the last size change cut off,
 * in the coordinates of that earlier size. It is valid while frame.version still equals
 * cut.version, that is, while nothing was drawn, erased, moved or undone since.
 */
function resizeFrame(f, width, height) {
  const old = f.canvas;
  const ow = old.width, oh = old.height;
  if (ow === width && oh === height) return;
  const dx = Math.round((width - ow) / 2), dy = Math.round((height - oh) / 2);
  const next = makeCanvas(width, height);
  const g = ctx2d(next);
  g.drawImage(old, dx, dy);
  // Going back to the size the cut pieces came from, with no edit in between: put them back.
  const back = f.cut && f.cut.width === width && f.cut.height === height && f.cut.version === f.version ? f.cut : null;
  if (back) for (const piece of back.pieces) g.putImageData(piece.data, piece.x, piece.y);
  // The part of the old canvas that stays is [kx0, kx1) x [ky0, ky1); everything else is cut.
  const kx0 = Math.max(0, -dx), kx1 = Math.min(ow, width - dx);
  const ky0 = Math.max(0, -dy), ky1 = Math.min(oh, height - dy);
  const pieces = [];
  const keep = (x, y, w, h) => {
    if (w <= 0 || h <= 0) return;
    const data = f.ctx.getImageData(x, y, w, h);
    for (let i = 3; i < data.data.length; i += 4) if (data.data[i]) { pieces.push({ x, y, data }); return; } // empty strips cost nothing
  };
  keep(0, 0, kx0, oh);
  keep(kx1, 0, ow - kx1, oh);
  keep(kx0, 0, kx1 - kx0, ky0);
  keep(kx0, ky1, kx1 - kx0, oh - ky1);
  f.canvas = next;
  f.ctx = g;
  f.touch();
  f.cut = pieces.length ? { width: ow, height: oh, version: f.version, pieces } : null;
}

/** True when a frame has any visible pixel (sampled every 4th pixel for speed). */
export function frameHasInk(frame) {
  const d = frame.ctx.getImageData(0, 0, frame.canvas.width, frame.canvas.height).data;
  for (let i = 3; i < d.length; i += 16) if (d[i] > 8) return true;
  return false;
}
