// Undo steps as dirty-rectangle patches (plan c): each step keeps only the changed
// rectangle, before and after. Raw pixels are compressed to PNG right after the step, so
// the 64 MB (or 32 MB) budget holds 50 steps per frame across a 120-frame project.
import { UndoLedger, budgetFor, sameBytes } from "../core/undo-ledger.js";
import { makeCanvas, canvasToBlob } from "../lib/util.js";

async function toPng(imageData) {
  const c = makeCanvas(imageData.width, imageData.height);
  c.getContext("2d").putImageData(imageData, 0, 0);
  return canvasToBlob(c);
}

/** Runs after the browser has had a chance to paint: nothing here is needed for the next frame. */
const whenIdle = (fn) => (typeof requestIdleCallback === "function" ? requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 200));

export class UndoManager {
  constructor({ onEvict, onChange } = {}) {
    this.ledger = new UndoLedger({ budgetBytes: budgetFor(navigator.deviceMemory), onEvict });
    this.onChange = onChange || (() => {});
    this.queue = Promise.resolve();
    this.pending = 0;
    this.toCompress = [];
    this.compressing = false;
  }

  get busy() {
    return this.pending > 0;
  }

  setCurrent(frameId) {
    this.ledger.setCurrent(frameId);
  }

  /** Full-frame snapshot taken when a step begins; cropped to the changed rect at commit. */
  begin(frame) {
    return frame.ctx.getImageData(0, 0, frame.canvas.width, frame.canvas.height);
  }

  /**
   * Records a step for `frame`. rect = changed area; beforeFull = snapshot from begin();
   * afterFull = the full frame after the change, when the caller already holds it (fill).
   * Returns false, and records nothing, when no pixel in the rectangle changed: a gesture
   * that did nothing is not an undo step (T-11).
   */
  commit(frame, rect, beforeFull, afterFull = null) {
    const r = clipRect(rect, frame.canvas.width, frame.canvas.height);
    if (!r) return false;
    const before = cropImageData(beforeFull, r);
    const after = afterFull ? cropImageData(afterFull, r) : frame.ctx.getImageData(r.x, r.y, r.w, r.h);
    if (sameBytes(before.data, after.data)) return false;
    const entry = { rect: r, before, after, bytes: before.data.length + after.data.length };
    this.ledger.push(frame.id, entry);
    this.onChange();
    this.compressLater(entry);
    return true;
  }

  /** Raw pixels become PNG off the input path (T-14): the step is usable either way. */
  compressLater(entry) {
    this.toCompress.push(entry);
    if (this.compressing) return;
    this.compressing = true;
    const next = () => {
      const e = this.toCompress.shift();
      if (!e) { this.compressing = false; return; }
      if (e.released) return next();
      Promise.all([toPng(e.before), toPng(e.after)]).then(([b, a]) => {
        if (e.released) return;
        e.before = b;
        e.after = a;
        this.ledger.resize(e, b.size + a.size);
      }).catch(() => { /* keep raw pixels */ }).finally(() => whenIdle(next));
    };
    whenIdle(next);
  }

  canUndo(frameId) { return this.ledger.canUndo(frameId); }
  canRedo(frameId) { return this.ledger.canRedo(frameId); }

  undo(frame) {
    const entry = this.ledger.undo(frame.id);
    return entry ? this.apply(frame, entry, "before") : Promise.resolve(false);
  }

  redo(frame) {
    const entry = this.ledger.redo(frame.id);
    return entry ? this.apply(frame, entry, "after") : Promise.resolve(false);
  }

  apply(frame, entry, side) {
    this.pending++;
    const run = async () => {
      const { x, y, w, h } = entry.rect;
      const data = entry[side];
      if (data instanceof Blob) {
        const bmp = await createImageBitmap(data);
        frame.ctx.clearRect(x, y, w, h);
        frame.ctx.drawImage(bmp, x, y);
        bmp.close?.();
      } else {
        frame.ctx.putImageData(data, x, y);
      }
      frame.touch();
      return true;
    };
    const p = this.queue.then(run).finally(() => { this.pending--; this.onChange(); });
    this.queue = p.catch(() => {});
    return p;
  }

  dropFrame(frameId) {
    this.ledger.dropFrame(frameId);
  }

  clear() {
    this.ledger.clear();
    this.onChange();
  }

  stats() {
    return { totalBytes: this.ledger.totalBytes, budget: this.ledger.budgetBytes, evicted: this.ledger.evictedCount };
  }
}

export function clipRect(r, W, H) {
  const x = Math.max(0, Math.floor(r.x));
  const y = Math.max(0, Math.floor(r.y));
  const x2 = Math.min(W, Math.ceil(r.x + r.w));
  const y2 = Math.min(H, Math.ceil(r.y + r.h));
  if (x2 <= x || y2 <= y) return null;
  return { x, y, w: x2 - x, h: y2 - y };
}

function cropImageData(full, r) {
  const out = new ImageData(r.w, r.h);
  const src = full.data, dst = out.data, W = full.width;
  for (let row = 0; row < r.h; row++) {
    const s = ((r.y + row) * W + r.x) * 4;
    dst.set(src.subarray(s, s + r.w * 4), row * r.w * 4);
  }
  return out;
}
