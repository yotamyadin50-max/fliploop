// Pointer input and the drawing tools (plan 2, Tool rules). Pointer Events cover mouse,
// touch and pen. Pressure scales 0.5x to 1.5x for pen only (pressure > 0); mouse and touch
// are fixed at 1.0x. Touch is ignored while a pen is active; a second touch cancels the
// stroke. Strokes use midpoint-quadratic smoothing.
import { floodFill, hexToRgb } from "../core/fill.js";

export const WIDTHS = { s: 2, m: 5, l: 10 };
const PEN_GRACE_MS = 600;

export class DrawingInput {
  /**
   * host: { canvas, getFrame, getTool, getColor, getWidthPx, undo, canEdit(frame),
   *         onBlocked(frame), onChange(frame), onStrokeEnd(frame), onTapWhilePlaying(), isPlaying(),
   *         onMovePreview(dx, dy) }
   */
  constructor(host) {
    this.host = host;
    this.el = host.canvas;
    this.active = null; // current gesture
    this.penActiveUntil = 0;
    this.touchIds = new Set();
    this.onDown = this.onDown.bind(this);
    this.onMove = this.onMove.bind(this);
    this.onUp = this.onUp.bind(this);
    this.onCancel = this.onCancel.bind(this);
    this.el.addEventListener("pointerdown", this.onDown);
    this.el.addEventListener("pointermove", this.onMove);
    this.el.addEventListener("pointerup", this.onUp);
    this.el.addEventListener("pointercancel", this.onCancel);
    this.el.addEventListener("lostpointercapture", this.onUp);
    this.el.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  destroy() {
    this.el.removeEventListener("pointerdown", this.onDown);
    this.el.removeEventListener("pointermove", this.onMove);
    this.el.removeEventListener("pointerup", this.onUp);
    this.el.removeEventListener("pointercancel", this.onCancel);
    this.el.removeEventListener("lostpointercapture", this.onUp);
  }

  toCanvas(e) {
    const r = this.el.getBoundingClientRect();
    return [((e.clientX - r.left) * this.el.width) / r.width, ((e.clientY - r.top) * this.el.height) / r.height];
  }

  pressureFactor(e) {
    return e.pointerType === "pen" && e.pressure > 0 ? 0.5 + Math.min(1, e.pressure) : 1;
  }

  onDown(e) {
    const host = this.host;
    if (e.pointerType === "touch") this.touchIds.add(e.pointerId);
    if (host.isPlaying()) {
      e.preventDefault();
      host.onTapWhilePlaying();
      return;
    }
    if (e.pointerType === "pen") this.penActiveUntil = Infinity;
    if (e.pointerType === "touch" && Date.now() < this.penActiveUntil) return; // palm rejection
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (this.active) {
      // A second touch while drawing cancels the stroke (pinch, palm, two fingers).
      if (e.pointerType === "touch" && this.active.pointerType === "touch") this.cancelActive();
      return;
    }
    if (host.undo.busy) return;
    const frame = host.getFrame();
    if (!host.canEdit(frame)) {
      host.onBlocked(frame);
      return;
    }
    e.preventDefault();
    try { this.el.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
    const tool = host.getTool();
    const p = this.toCanvas(e);
    const g = { pointerId: e.pointerId, pointerType: e.pointerType, tool, frame, before: host.undo.begin(frame) };
    this.active = g;
    if (tool === "fill") {
      this.fillAt(g, p);
      this.active = null;
      return;
    }
    if (tool === "move") {
      g.start = p;
      g.snapshot = document.createElement("canvas");
      g.snapshot.width = frame.canvas.width;
      g.snapshot.height = frame.canvas.height;
      g.snapshot.getContext("2d").drawImage(frame.canvas, 0, 0);
      g.dx = 0; g.dy = 0;
      return;
    }
    g.pts = [p];
    g.widths = [host.getWidthPx() * this.pressureFactor(e)];
    g.bbox = { x0: p[0], y0: p[1], x1: p[0], y1: p[1] };
    g.maxW = g.widths[0];
    g.erase = tool === "eraser";
    g.color = host.getColor();
    this.dot(g, p, g.widths[0]);
    host.onChange(frame);
  }

  onMove(e) {
    const g = this.active;
    if (!g || e.pointerId !== g.pointerId) return;
    e.preventDefault();
    if (g.tool === "move") {
      const p = this.toCanvas(e);
      g.dx = Math.round(p[0] - g.start[0]);
      g.dy = Math.round(p[1] - g.start[1]);
      const c = g.frame.ctx;
      c.clearRect(0, 0, g.frame.canvas.width, g.frame.canvas.height);
      c.drawImage(g.snapshot, g.dx, g.dy);
      this.host.onChange(g.frame);
      return;
    }
    const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of events.length ? events : [e]) {
      const p = this.toCanvas(ev);
      const last = g.pts[g.pts.length - 1];
      if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 0.75) continue;
      g.pts.push(p);
      const w = this.host.getWidthPx() * this.pressureFactor(ev);
      g.widths.push(w);
      if (w > g.maxW) g.maxW = w;
      grow(g.bbox, p);
      this.segment(g, false);
    }
    this.host.onChange(g.frame);
  }

  onUp(e) {
    const g = this.active;
    if (e.pointerType === "touch") this.touchIds.delete(e.pointerId);
    if (e.pointerType === "pen") this.penActiveUntil = Date.now() + PEN_GRACE_MS;
    if (!g || e.pointerId !== g.pointerId) return;
    this.active = null;
    const frame = g.frame;
    if (g.tool === "move") {
      if (g.dx || g.dy) {
        frame.touch();
        this.host.undo.commit(frame, { x: 0, y: 0, w: frame.canvas.width, h: frame.canvas.height }, g.before);
        this.host.onStrokeEnd(frame);
      }
      return;
    }
    this.segment(g, true);
    const pad = g.maxW / 2 + 2;
    frame.touch();
    this.host.undo.commit(frame, { x: g.bbox.x0 - pad, y: g.bbox.y0 - pad, w: g.bbox.x1 - g.bbox.x0 + pad * 2, h: g.bbox.y1 - g.bbox.y0 + pad * 2 }, g.before);
    this.host.onChange(frame);
    this.host.onStrokeEnd(frame);
  }

  onCancel(e) {
    if (e.pointerType === "touch") this.touchIds.delete(e.pointerId);
    if (this.active && e.pointerId === this.active.pointerId) this.cancelActive();
  }

  /** Restores the frame to how it was before the gesture began. */
  cancelActive() {
    const g = this.active;
    if (!g) return;
    this.active = null;
    g.frame.ctx.putImageData(g.before, 0, 0);
    this.host.onChange(g.frame);
  }

  setup(g) {
    const c = g.frame.ctx;
    c.save();
    c.lineCap = "round";
    c.lineJoin = "round";
    c.globalCompositeOperation = g.erase ? "destination-out" : "source-over";
    c.strokeStyle = g.erase ? "#000" : g.color;
    c.fillStyle = c.strokeStyle;
    return c;
  }

  dot(g, p, w) {
    const c = this.setup(g);
    c.beginPath();
    c.arc(p[0], p[1], w / 2, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  /** Draws the newest smoothed piece: from the previous midpoint, through the previous point. */
  segment(g, final) {
    const n = g.pts.length;
    if (n < 2) return;
    const c = this.setup(g);
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    if (final) {
      const a = n >= 3 ? mid(g.pts[n - 2], g.pts[n - 1]) : g.pts[0];
      c.lineWidth = g.widths[n - 1];
      c.beginPath();
      c.moveTo(a[0], a[1]);
      c.lineTo(g.pts[n - 1][0], g.pts[n - 1][1]);
      c.stroke();
    } else if (n === 2) {
      const m = mid(g.pts[0], g.pts[1]);
      c.lineWidth = g.widths[0];
      c.beginPath();
      c.moveTo(g.pts[0][0], g.pts[0][1]);
      c.lineTo(m[0], m[1]);
      c.stroke();
    } else {
      const a = mid(g.pts[n - 3], g.pts[n - 2]);
      const b = mid(g.pts[n - 2], g.pts[n - 1]);
      c.lineWidth = g.widths[n - 2];
      c.beginPath();
      c.moveTo(a[0], a[1]);
      c.quadraticCurveTo(g.pts[n - 2][0], g.pts[n - 2][1], b[0], b[1]);
      c.stroke();
    }
    c.restore();
  }

  fillAt(g, p) {
    const frame = g.frame;
    const { width, height } = frame.canvas;
    const img = frame.ctx.getImageData(0, 0, width, height);
    const rect = floodFill(img.data, width, height, p[0], p[1], hexToRgb(this.host.getColor()));
    if (!rect) return;
    frame.ctx.putImageData(img, 0, 0, rect.x, rect.y, rect.w, rect.h);
    frame.touch();
    this.host.undo.commit(frame, rect, g.before);
    this.host.onChange(frame);
    this.host.onStrokeEnd(frame);
  }
}

function grow(b, p) {
  if (p[0] < b.x0) b.x0 = p[0];
  if (p[1] < b.y0) b.y0 = p[1];
  if (p[0] > b.x1) b.x1 = p[0];
  if (p[1] > b.y1) b.y1 = p[1];
}
