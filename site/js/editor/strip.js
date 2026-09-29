// The film strip (Part B signature detail): an LTR island of 16mm film, frame 1 at the
// left, "+" at the right, sprocket holes punched to the desk, edge-print numbers, and a
// half-viewport lead-in on both ends so any frame can sit in the centre gate (Ruling 6).
// Reorder: 300 ms long-press, then drag (a swipe still scrolls). Lifted cell: shadow-lift
// and scale 1.05, 2px Lamp insertion bar (Ruling 7).
import { h, clear } from "../lib/dom.js";
import { t, tp } from "../lib/i18n.js";
import { iconEl } from "../ui/icons.js";
import { reducedMotion } from "../lib/util.js";
import { MAX_FRAMES } from "../store/projects.js";

const CELL = 72;
const LONG_PRESS_MS = 300;
const MOVE_TOLERANCE = 8;

export class FilmStrip {
  constructor(host) {
    this.host = host; // { doc(), current(), select(i), openMenu(i, el), add(el), reorder(from, to), canReorder(), frameState(i) }
    this.cells = [];
    this.track = h("div", { class: "strip__track" });
    this.scroller = h("div", { class: "strip__scroller" }, this.track);
    this.gate = h("div", { class: "strip__gate", "aria-hidden": "true" }, h("span", { class: "strip__gate-label num" }));
    this.dim = h("div", { class: "strip__dim", "aria-hidden": "true" });
    this.insertBar = h("div", { class: "strip__insert", hidden: true, "aria-hidden": "true" });
    this.addBtn = h("button", { class: "cell cell--add", type: "button", onclick: () => this.host.add(this.addBtn) },
      h("span", { class: "cell__plus", "aria-hidden": "true" }, iconEl("plus")));
    this.counter = h("span", { class: "strip__counter" });
    this.lead = h("span", { class: "strip__lead", "aria-hidden": "true" });
    this.trail = h("span", { class: "strip__lead", "aria-hidden": "true" });
    new ResizeObserver(() => this.sizeLeadIn()).observe(this.scroller);
    this.el = h("div", { class: "strip film", dir: "ltr" }, this.scroller, this.dim, this.gate, this.insertBar);
    this.scroller.addEventListener("touchmove", (e) => { if (this.drag?.active) e.preventDefault(); }, { passive: false });
    this.hintShown = false;
  }

  get gateLabel() {
    return this.gate.firstChild;
  }

  /** Full rebuild (structure changed). */
  render() {
    const doc = this.host.doc();
    clear(this.track);
    this.cells = doc.frames.map((f, i) => this.makeCell(i));
    this.track.append(this.lead, ...this.cells, this.addBtn, this.counter, this.trail);
    this.sizeLeadIn();
    this.cells.forEach((_, i) => this.updateCell(i));
    this.refreshChrome();
  }

  makeCell(i) {
    const thumb = h("canvas", { class: "cell__thumb", width: 128, height: 96, "aria-hidden": "true" });
    const cell = h("button", { class: "cell", type: "button", title: this.host.canReorder() ? t("strip.reorder.hint") : null },
      thumb,
      h("span", { class: "cell__edge num", "aria-hidden": "true" }),
      h("span", { class: "cell__hold num", "aria-hidden": "true", hidden: true }),
      h("span", { class: "cell__lock", "aria-hidden": "true", hidden: true }, iconEl("lock", { size: 14 })),
    );
    cell._thumb = thumb;
    cell.addEventListener("pointerdown", (e) => this.pressStart(e, cell));
    cell.addEventListener("click", (e) => this.cellClick(e, cell));
    cell.addEventListener("keydown", (e) => this.cellKey(e, cell));
    return cell;
  }

  indexOfCell(cell) {
    return this.cells.indexOf(cell);
  }

  cellClick(e, cell) {
    if (this.suppressClick) { this.suppressClick = false; return; }
    const i = this.indexOfCell(cell);
    if (i === this.host.current()) this.host.openMenu(i, cell);
    else this.host.select(i);
  }

  cellKey(e, cell) {
    if (!e.altKey || !this.host.canReorder()) return;
    const i = this.indexOfCell(cell);
    const to = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : -1;
    if (to < 0 || to >= this.cells.length) return;
    e.preventDefault();
    this.host.reorder(i, to);
    this.cells[to]?.focus();
  }

  /** Thumbnail, badges, accessible name. */
  updateCell(i) {
    const cell = this.cells[i];
    if (!cell) return;
    const doc = this.host.doc();
    const f = doc.frames[i];
    const g = cell._thumb.getContext("2d");
    g.fillStyle = "#FFFFFF";
    g.fillRect(0, 0, cell._thumb.width, cell._thumb.height);
    const tw = cell._thumb.width, th = cell._thumb.height;
    const scale = Math.min(tw / f.canvas.width, th / f.canvas.height);
    const dw = f.canvas.width * scale, dh = f.canvas.height * scale;
    g.drawImage(f.canvas, (tw - dw) / 2, (th - dh) / 2, dw, dh);
    cell.querySelector(".cell__edge").textContent = String(i + 1);
    const hold = cell.querySelector(".cell__hold");
    hold.hidden = f.hold <= 1;
    hold.textContent = t("strip.hold.badge", { hold: f.hold });
    cell.querySelector(".cell__lock").hidden = !f.locked;
    const state = this.host.frameState?.(i) || {};
    cell.classList.toggle("cell--blank", f.lessonRole === "blank" && !state.done);
    cell.classList.toggle("is-current", i === this.host.current());
    let label = t("strip.frame.aria", { n: i + 1, total: doc.count });
    if (i === this.host.current()) label += t("strip.frame.current.aria");
    if (f.hold > 1) label += t("strip.frame.hold.aria", { hold: f.hold });
    if (f.locked) label += t("strip.frame.key.aria");
    else if (f.lessonRole === "blank" && !state.done) label += t("strip.frame.blank.aria");
    cell.setAttribute("aria-label", label);
    if (i === this.host.current()) cell.setAttribute("aria-current", "true");
    else cell.removeAttribute("aria-current");
  }

  updateAll() {
    this.cells.forEach((_, i) => this.updateCell(i));
    this.refreshChrome();
  }

  setCurrent(i, { scroll = true, instant = false } = {}) {
    this.cells.forEach((c, k) => {
      if (c.classList.contains("is-current") !== (k === i)) this.updateCell(k);
    });
    if (scroll) this.ensureVisible(i, instant);
  }

  /** Reduced-motion Play: the Lamp outline steps cell to cell; the strip jumps only when needed. */
  markShowing(i) {
    this.cells.forEach((c, k) => c.classList.toggle("is-showing", k === i));
    if (i !== null) this.ensureVisible(i, true);
  }

  /** Keeps a cell in view; centres it when it drifts out. */
  ensureVisible(i, instant = false) {
    const target = i * CELL;
    const left = this.scroller.scrollLeft;
    const half = this.scroller.clientWidth / 2;
    const visible = target >= left - half + CELL && target <= left + half - CELL;
    if (!visible) this.scroller.scrollTo({ left: target, behavior: instant || reducedMotion() ? "instant" : "smooth" });
  }

  centerOn(i, behavior = "instant") {
    this.scroller.scrollTo({ left: i * CELL, behavior });
  }

  /** Counter, W4 notice, "+" state. */
  refreshChrome() {
    const doc = this.host.doc();
    const n = doc.count;
    clear(this.counter);
    const count = h("span", { class: "num" }, t("strip.counter", { n }));
    this.counter.append(count);
    this.counter.setAttribute("aria-label", t("strip.counter.aria", { n }));
    this.counter.classList.toggle("strip__counter--warn", n >= 100 && !doc.isLesson);
    if (n >= 100 && !doc.isLesson) {
      const msg = n >= MAX_FRAMES ? t("w4.max") : tp("w4.remaining", MAX_FRAMES - n);
      this.counter.append(h("span", { class: "strip__w4" }, msg));
    }
    const full = n >= MAX_FRAMES;
    const locked = doc.isLesson;
    this.addBtn.disabled = full || locked;
    this.addBtn.hidden = locked;
    // Lesson mode: fixed frame count, the goal strip's "3/6 צוירו" carries progress (Critic F5).
    this.counter.hidden = locked;
    const label = full ? t("w4.add.disabled") : t("strip.add.aria");
    this.addBtn.setAttribute("aria-label", label);
    this.addBtn.title = full ? t("w4.add.disabled") : t("strip.add.tooltip");
  }

  // ----- long-press reorder -----
  pressStart(e, cell) {
    if (!this.host.canReorder() || this.host.isPlaying()) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const start = { x: e.clientX, y: e.clientY };
    const id = e.pointerId;
    const drag = { cell, id, start, active: false, from: this.indexOfCell(cell) };
    this.drag = drag;
    const cancel = () => {
      clearTimeout(drag.timer);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      if (this.drag === drag) this.drag = null;
    };
    const move = (ev) => {
      if (ev.pointerId !== id) return;
      if (!drag.active) {
        if (Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > MOVE_TOLERANCE) cancel();
        return;
      }
      ev.preventDefault();
      this.dragMove(drag, ev.clientX);
    };
    const up = (ev) => {
      if (ev.pointerId !== id) return;
      if (drag.active) this.dragEnd(drag, ev.type === "pointercancel");
      cancel();
    };
    drag.timer = setTimeout(() => this.dragBegin(drag), LONG_PRESS_MS);
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  dragBegin(drag) {
    drag.active = true;
    this.suppressClick = true;
    try { drag.cell.setPointerCapture(drag.id); } catch { /* pointer already gone */ }
    drag.cell.classList.add("is-lifted");
    drag.to = drag.from;
    drag.originX = drag.start.x;
    this.insertBar.hidden = false;
    this.positionInsert(drag.from);
    navigator.vibrate?.(10);
    if (!this.hintShown) {
      this.hintShown = true;
      this.host.hint?.(t("strip.reorder.hint"));
    }
  }

  dragMove(drag, x) {
    if (!reducedMotion()) drag.cell.style.transform = `translateX(${x - drag.originX}px) scale(1.05)`;
    const r = this.scroller.getBoundingClientRect();
    const edge = 40;
    if (x < r.left + edge) this.scroller.scrollLeft -= 12;
    else if (x > r.right - edge) this.scroller.scrollLeft += 12;
    const trackX = x - r.left + this.scroller.scrollLeft - this.leadIn();
    let slot = Math.round(trackX / CELL);
    slot = Math.max(0, Math.min(this.cells.length, slot));
    const to = slot > drag.from ? slot - 1 : slot;
    drag.to = Math.max(0, Math.min(this.cells.length - 1, to));
    this.positionInsert(slot);
  }

  leadIn() {
    return this.leadPx || 0;
  }

  /** Half-viewport lead-in and tail so frame 1 and frame N can both sit in the centre gate. */
  sizeLeadIn() {
    const w = this.scroller.clientWidth;
    if (!w) return;
    this.leadPx = Math.max(0, w / 2 - CELL / 2);
    this.lead.style.width = `${this.leadPx}px`;
    this.trail.style.width = `${this.leadPx}px`;
  }

  positionInsert(slot) {
    const x = this.leadIn() + slot * CELL - this.scroller.scrollLeft;
    this.insertBar.style.transform = `translateX(${x - 1}px)`;
  }

  dragEnd(drag, cancelled) {
    drag.cell.classList.remove("is-lifted");
    drag.cell.style.transform = "";
    this.insertBar.hidden = true;
    setTimeout(() => { this.suppressClick = false; }, 50);
    if (!cancelled && drag.to !== drag.from) this.host.reorder(drag.from, drag.to);
  }
}

export { CELL };
