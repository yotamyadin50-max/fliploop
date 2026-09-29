// Per-frame undo/redo bookkeeping under one global byte budget (plan c, Undo).
// Each frame keeps up to 50 steps. When the budget is exceeded, the oldest steps of
// non-current frames go first; the current frame's steps are never evicted.
// DOM-free: an entry is any object with a numeric `bytes` field.

export const MAX_STEPS = 50;
export const BUDGET_DEFAULT = 64 * 1024 * 1024;
export const BUDGET_LOW_MEMORY = 32 * 1024 * 1024;

export function budgetFor(deviceMemory) {
  return typeof deviceMemory === "number" && deviceMemory <= 2 ? BUDGET_LOW_MEMORY : BUDGET_DEFAULT;
}

export class UndoLedger {
  constructor({ budgetBytes = BUDGET_DEFAULT, maxSteps = MAX_STEPS, onEvict } = {}) {
    this.budgetBytes = budgetBytes;
    this.maxSteps = maxSteps;
    this.onEvict = onEvict;
    this.stacks = new Map(); // frameId -> { undo: [], redo: [] }
    this.currentFrameId = null;
    this.totalBytes = 0;
    this.seq = 0;
    this.evictedCount = 0;
  }

  stackFor(frameId) {
    let s = this.stacks.get(frameId);
    if (!s) {
      s = { undo: [], redo: [] };
      this.stacks.set(frameId, s);
    }
    return s;
  }

  setCurrent(frameId) {
    this.currentFrameId = frameId;
  }

  push(frameId, entry) {
    const s = this.stackFor(frameId);
    for (const e of s.redo) this.release(e);
    s.redo = [];
    entry.seq = ++this.seq;
    s.undo.push(entry);
    this.totalBytes += entry.bytes;
    while (s.undo.length > this.maxSteps) this.release(s.undo.shift());
    this.enforceBudget();
  }

  canUndo(frameId) {
    return (this.stacks.get(frameId)?.undo.length ?? 0) > 0;
  }

  canRedo(frameId) {
    return (this.stacks.get(frameId)?.redo.length ?? 0) > 0;
  }

  /** Moves the newest step to the redo stack and returns it (caller applies `before`). */
  undo(frameId) {
    const s = this.stacks.get(frameId);
    if (!s || !s.undo.length) return null;
    const entry = s.undo.pop();
    s.redo.push(entry);
    return entry;
  }

  redo(frameId) {
    const s = this.stacks.get(frameId);
    if (!s || !s.redo.length) return null;
    const entry = s.redo.pop();
    s.undo.push(entry);
    return entry;
  }

  /** Updates an entry's size, e.g. after raw pixels were compressed to PNG. */
  resize(entry, newBytes) {
    this.totalBytes += newBytes - entry.bytes;
    entry.bytes = newBytes;
  }

  dropFrame(frameId) {
    const s = this.stacks.get(frameId);
    if (!s) return;
    for (const e of s.undo) this.release(e);
    for (const e of s.redo) this.release(e);
    this.stacks.delete(frameId);
  }

  clear() {
    for (const id of [...this.stacks.keys()]) this.dropFrame(id);
  }

  stepsFor(frameId) {
    const s = this.stacks.get(frameId);
    return s ? { undo: s.undo.length, redo: s.redo.length } : { undo: 0, redo: 0 };
  }

  release(entry) {
    this.totalBytes -= entry.bytes;
    entry.released = true;
  }

  enforceBudget() {
    while (this.totalBytes > this.budgetBytes) {
      let victim = null;
      for (const [frameId, s] of this.stacks) {
        if (frameId === this.currentFrameId) continue;
        for (const list of [s.undo, s.redo]) {
          if (list.length && (!victim || list[0].seq < victim.list[0].seq)) victim = { list, frameId };
        }
      }
      if (!victim) return; // only the current frame holds steps: always kept
      this.release(victim.list.shift());
      this.evictedCount++;
      if (this.evictedCount === 1 && this.onEvict) this.onEvict();
    }
  }
}
