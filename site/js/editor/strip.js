// The film strip (Part B signature detail): an LTR island of 16mm film, frame 1 at the
// left, "+" at the right, sprocket holes punched to the desk, edge-print numbers, and a
// half-viewport lead-in on both ends so any frame can sit in the centre gate (Ruling 6).
// Reorder: 450 ms long-press, then drag (a swipe still scrolls). Lifted cell: shadow-lift
// and scale 1.05, 2px Lamp insertion bar (Ruling 7). A long press that never moves is a tap.
// The frame counter and the 100 / 119 / 120 notice are pinned in the top edge band, outside
// the scrolling track, so they read at any scroll position (fix round R25).
import { h, clear } from "../lib/dom.js";
import { t, tp } from "../lib/i18n.js";
import { iconEl } from "../ui/icons.js";
import { reducedMotion, clamp } from "../lib/util.js";
import { MAX_FRAMES } from "../store/projects.js";

const CELL = 72;
const LONG_PRESS_MS = 450;
const MOVE_TOLERANCE = 8;
const EDGE = 40; // px from either end of the strip where a held drag scrolls it
const TAP_DELAY = 60; // a long press acts as a tap after the browser's own click has passed

export class FilmStrip {
  constructor(host) {
    this.host = host; // { doc(), current(), select(i), stop(), openMenu(i, el), add(el), reorder(from, to), canReorder(), isPlaying(), frameState(i), hint(text) }
    this.cells = [];
    this.track = h("div", { class: "strip__track" });
    this.scroller = h("div", { class: "strip__scroller" }, this.track);
    this.gate = h("div", { class: "strip__gate", "aria-hidden": "true" }, h("span", { class: "strip__gate-label num" }));
    this.dim = h("div", { class: "strip__dim", "aria-hidden": "true" });
    this.insertBar = h("div", { class: "strip__insert", hidden: true, "aria-hidden": "true" });
    this.addBtn = h("button", { class: "cell cell--add", type: "button", onclick: () => this.host.add(this.addBtn) },
      h("span", { class: "cell__plus", "aria-hidden": "true" }, iconEl("plus")));
    this.count = h("span", { class: "strip__count num", role: "img" });
    this.notice = h("span", { class: "strip__w4", dir: "rtl", hidden: true });
    this.counter = h("div", { class: "strip__counter", dir: "rtl" }, this.count, this.notice);
    this.lead = h("span", { class: "strip__lead", "aria-hidden": "true" });
    this.trail = h("span", { class: "strip__lead", "aria-hidden": "true" });
    new ResizeObserver(() => this.sizeLeadIn()).observe(this.scroller);
    this.el = h("div", { class: "strip film", dir: "ltr" }, this.scroller, this.dim, this.gate, this.insertBar, this.counter);
    this.scroller.addEventListener("touchmove", (e) => { if (this.drag?.active) e.preventDefault(); }, { passive: false });
    this.scroller.addEventListener("wheel", (e) => this.wheel(e), { passive: false });
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
    this.track.append(this.lead, ...this.cells, this.addBtn, this.trail);
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
    cell.addEventListener("click", () => this.cellClick(cell));
    cell.addEventListener("keydown", (e) => this.cellKey(e, cell));
    return cell;
  }

  indexOfCell(cell) {
    return this.cells.indexOf(cell);
  }

  cellClick(cell) {
    if (this.suppressClick) { this.suppressClick = false; return; }
    this.tap(cell);
  }

  /** A tap on a frame: during Play it stops on that frame; the current frame opens its menu. */
  tap(cell) {
    const i = this.indexOfCell(cell);
    if (i < 0) return;
    if (this.host.isPlaying()) {
      this.host.stop();
      this.host.select(i);
    } else if (i === this.host.current()) this.host.openMenu(i, cell);
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
    drawThumb(cell._thumb, f.canvas);
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
    const locked = doc.isLesson;
    const warn = n >= 100 && !locked;
    const full = n >= MAX_FRAMES;
    this.count.textContent = t("strip.counter", { n });
    this.count.setAttribute("aria-label", tp("strip.counter.aria", n));
    this.counter.classList.toggle("strip__counter--warn", warn);
    this.notice.hidden = !warn;
    this.notice.textContent = !warn ? "" : full ? t("w4.max") : tp("w4.remaining", MAX_FRAMES - n);
    // Lesson mode: fixed frame count, the goal strip's "3/6 צוירו" carries progress (Critic F5).
    this.counter.hidden = locked;
    this.addBtn.disabled = locked;
    this.addBtn.hidden = locked;
    // At 120 the "+" stays tappable, so the tap can say why nothing is added (R25).
    this.addBtn.setAttribute("aria-disabled", String(full));
    this.addBtn.setAttribute("aria-label", full ? t("w4.add.disabled") : t("strip.add.aria"));
    this.addBtn.title = full ? t("w4.add.disabled") : t("strip.add.tooltip");
  }

  /** A mouse wheel turns vertically; the strip runs sideways (audit F14). */
  wheel(e) {
    if (e.ctrlKey || this.drag?.active || this.host.isPlaying()) return;
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return; // already sideways: trackpad, Shift+wheel
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? this.scroller.clientWidth : 1;
    this.scroller.scrollLeft += e.deltaY * unit;
  }

  // ----- long-press reorder -----
  pressStart(e, cell) {
    if (!this.host.canReorder() || this.host.isPlaying()) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const mouse = e.pointerType === "mouse";
    if (this.drag) {
      // A second finger never starts a second drag. A mouse that presses again lost its
      // release outside the window: end that press first.
      if (!(mouse && this.drag.mouse)) return;
      this.drag.abort();
    }
    const start = { x: e.clientX, y: e.clientY };
    const id = e.pointerId;
    const drag = { cell, id, start, mouse, active: false, dragged: false, from: this.indexOfCell(cell) };
    this.drag = drag;
    const cancel = () => {
      clearTimeout(drag.timer);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      if (this.drag === drag) this.drag = null;
    };
    drag.abort = () => {
      if (drag.active) this.dragEnd(drag, true);
      cancel();
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
    // No snapping while a drag is active, and the scroll position is ours alone: a snapped
    // cell that moves would pull the strip along with it, and the drop slot is read from
    // the scroll position (audit F3). Only edgeScroll() changes drag.scroll.
    this.el.classList.add("is-dragging");
    drag.scroll = drag.scroll0 = this.scroller.scrollLeft;
    drag.x = drag.originX = drag.start.x;
    drag.to = drag.from;
    drag.cell.classList.add("is-lifted");
    this.insertBar.hidden = false;
    this.dragUpdate(drag);
    drag.edgeTimer = setInterval(() => this.edgeScroll(drag), 16);
    navigator.vibrate?.(10);
    if (!this.hintShown) {
      this.hintShown = true;
      this.host.hint?.(t("strip.reorder.hint"));
    }
  }

  dragMove(drag, x) {
    drag.x = x;
    if (Math.abs(x - drag.originX) > MOVE_TOLERANCE) drag.dragged = true;
    this.dragUpdate(drag);
  }

  /** Lifted cell under the pointer, drop slot under the pointer, strip where we left it. */
  dragUpdate(drag) {
    const sc = this.scroller;
    if (Math.abs(sc.scrollLeft - drag.scroll) > 0.5) sc.scrollLeft = drag.scroll;
    if (!reducedMotion()) drag.cell.style.transform = `translateX(${drag.x - drag.originX + drag.scroll - drag.scroll0}px) scale(1.05)`;
    const trackX = drag.x - sc.getBoundingClientRect().left + drag.scroll - this.leadIn();
    const slot = clamp(Math.round(trackX / CELL), 0, this.cells.length);
    drag.to = clamp(slot > drag.from ? slot - 1 : slot, 0, this.cells.length - 1);
    this.positionInsert(slot, drag.scroll);
  }

  /** Timer-driven, so holding still at an end keeps the strip moving. Faster the deeper in. */
  edgeScroll(drag) {
    if (!drag.dragged) return;
    const r = this.scroller.getBoundingClientRect();
    const depth = Math.max(r.left + EDGE - drag.x, drag.x - (r.right - EDGE));
    if (depth <= 0) return;
    const step = (4 + 12 * Math.min(1, depth / EDGE)) * (drag.x < r.left + EDGE ? -1 : 1);
    const max = this.scroller.scrollWidth - this.scroller.clientWidth;
    const next = clamp(drag.scroll + step, 0, max);
    if (next === drag.scroll) return;
    drag.scroll = next;
    this.dragUpdate(drag);
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

  positionInsert(slot, scroll = this.scroller.scrollLeft) {
    const x = this.leadIn() + slot * CELL - scroll;
    this.insertBar.style.transform = `translateX(${x - 1}px)`;
  }

  dragEnd(drag, cancelled) {
    clearInterval(drag.edgeTimer);
    this.el.classList.remove("is-dragging");
    drag.cell.classList.remove("is-lifted");
    drag.cell.style.transform = "";
    this.insertBar.hidden = true;
    setTimeout(() => { this.suppressClick = false; }, TAP_DELAY + 20);
    if (cancelled) return;
    // A slow press by a child must not be swallowed: with no movement it is a tap (R24).
    if (!drag.dragged) setTimeout(() => this.tap(drag.cell), TAP_DELAY);
    else if (drag.to !== drag.from) this.host.reorder(drag.from, drag.to);
  }
}

/** One fixed way to scale a frame into its thumbnail, whatever kind of canvas the frame is
 *  (a fresh copy and a canvas that was read back scaled differently, audit F15). */
function drawThumb(thumb, source) {
  const g = thumb.getContext("2d", { willReadFrequently: true });
  const tw = thumb.width, th = thumb.height;
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = "medium";
  g.fillStyle = "#FFFFFF";
  g.fillRect(0, 0, tw, th);
  const scale = Math.min(tw / source.width, th / source.height);
  const dw = source.width * scale, dh = source.height * scale;
  g.drawImage(source, (tw - dw) / 2, (th - dh) / 2, dw, dh);
}

export { CELL };
