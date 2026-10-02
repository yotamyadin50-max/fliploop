// Pointer input and the drawing tools (plan 2, Tool rules). Pointer Events cover mouse,
// touch and pen. Pressure scales 0.5x to 1.5x for pen only (pressure > 0); mouse and touch
// are fixed at 1.0x. Touch is ignored while a pen is active; a second touch cancels the
// stroke. Strokes use midpoint-quadratic smoothing.
import { floodFill, hexToRgb } from "../core/fill.js";

export const WIDTHS = { s: 2, m: 5, l: 10 }; // pencil
// The eraser has its own sizes (fix round R10): a bucket fill paints areas that a 10 px
// eraser cannot realistically clear. Keys 1, 2, 3 pick s, m, l for both tools.
export const ERASER_WIDTHS = { s: 8, m: 20, l: 40 };
const PEN_GRACE_MS = 600;

export class DrawingInput {
  /** Line width in canvas pixels for a tool ("eraser" or anything else = pencil) and a size key. */
  static widthPx(tool, key) {
    return (tool === "eraser" ? ERASER_WIDTHS : WIDTHS)[key];
  }

  /**
   * host: { canvas, getFrame, getTool, getColor, getWidthPx, undo, canEdit(frame),
   *         onBlocked(frame), onChange(frame), onStrokeEnd(frame), onTapWhilePlaying(), isPlaying(),
   *         onCancel(frame) }
   */
  constructor(host) {
    this.host = host;
    this.el = host.canvas;
    this.active = null; // current gesture
    this.penActiveUntil = 0;
    this.onDown = this.onDown.bind(this);
    this.onMove = this.onMove.bind(this);
    this.onUp = this.onUp.bind(this);
    this.onCancel = this.onCancel.bind(this);
    this.onPenGone = this.onPenGone.bind(this);
    this.el.addEventListener("pointerdown", this.onDown);
    this.el.addEventListener("pointermove", this.onMove);
    this.el.addEventListener("pointerup", this.onUp);
    this.el.addEventListener("pointercancel", this.onCancel);
    this.el.addEventListener("lostpointercapture", this.onUp);
    this.el.addEventListener("contextmenu", (e) => e.preventDefault());
    // A pen press that was never captured (locked frame, undo busy) can end anywhere on the page.
    addEventListener("pointerup", this.onPenGone, true);
    addEventListener("pointercancel", this.onPenGone, true);
  }

  destroy() {
    this.el.removeEventListener("pointerdown", this.onDown);
    this.el.removeEventListener("pointermove", this.onMove);
    this.el.removeEventListener("pointerup", this.onUp);
    this.el.removeEventListener("pointercancel", this.onCancel);
    this.el.removeEventListener("lostpointercapture", this.onUp);
    removeEventListener("pointerup", this.onPenGone, true);
    removeEventListener("pointercancel", this.onPenGone, true);
  }

  toCanvas(e) {
    const r = this.el.getBoundingClientRect();
    return [((e.clientX - r.left) * this.el.width) / r.width, ((e.clientY - r.top) * this.el.height) / r.height];
  }

  pressureFactor(e) {
    return e.pointerType === "pen" && e.pressure > 0 ? 0.5 + Math.min(1, e.pressure) : 1;
  }

  /** The pen left (lifted or cancelled, anywhere): finger input returns after the grace time. */
  onPenGone(e) {
    if (e.pointerType === "pen") this.penActiveUntil = Date.now() + PEN_GRACE_MS;
  }

  onDown(e) {
    const host = this.host;
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
    const p = this.toCanvas(e);
    if (!Number.isFinite(p[0]) || !Number.isFinite(p[1])) return; // canvas has no size yet
    e.preventDefault();
    try { this.el.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
    const tool = host.getTool();
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
      g.moved = false;
      return;
    }
    g.baseWidth = host.getWidthPx();
    g.pts = [p];
    g.widths = [g.baseWidth * this.pressureFactor(e)];
    g.bbox = { x0: p[0], y0: p[1], x1: p[0], y1: p[1] };
    g.maxW = g.widths[0];
    g.erase = tool === "eraser";
    g.color = host.getColor();
    // Constant width (mouse, touch, a pen that reports one pressure): the whole stroke is
    // redrawn as one path on every move, so soft edges are painted once. A pen whose pressure
    // changes switches to piece-by-piece drawing, each piece at its own width.
    g.uniform = true;
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
      if (g.dx || g.dy) g.moved = true;
      const c = g.frame.ctx;
      c.clearRect(0, 0, g.frame.canvas.width, g.frame.canvas.height);
      c.drawImage(g.snapshot, g.dx, g.dy);
      this.host.onChange(g.frame);
      return;
    }
    const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    const first = g.pts.length; // points from here on are new in this event
    for (const ev of events.length ? events : [e]) {
      const p = this.toCanvas(ev);
      const last = g.pts[g.pts.length - 1];
      if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 0.75) continue;
      const w = g.baseWidth * this.pressureFactor(ev);
      if (g.uniform && w !== g.widths[0]) {
        // The pressure changed: settle what this event added so far, then go on piece by piece.
        if (g.pts.length > first) this.redraw(g, Math.max(0, first - 2));
        g.uniform = false;
      }
      g.pts.push(p);
      g.widths.push(w);
      if (w > g.maxW) g.maxW = w;
      grow(g.bbox, p);
      if (!g.uniform) this.segment(g, false);
    }
    if (g.pts.length === first) return;
    // The old end of the stroke was a straight piece to the last point; it becomes a curve now.
    if (g.uniform) this.redraw(g, Math.max(0, first - 2));
    this.host.onChange(g.frame);
  }

  onUp(e) {
    const g = this.active;
    if (e.pointerType === "pen") this.penActiveUntil = Date.now() + PEN_GRACE_MS;
    if (!g || e.pointerId !== g.pointerId) return;
    this.active = null;
    const frame = g.frame;
    const whole = { x: 0, y: 0, w: frame.canvas.width, h: frame.canvas.height };
    if (g.tool === "move") {
      if (g.dx || g.dy) {
        // An empty frame moved is still an empty frame: no step, nothing to save.
        if (!this.host.undo.commit(frame, whole, g.before)) return;
        frame.touch();
        this.host.onStrokeEnd(frame);
      } else if (g.moved) {
        // Dragged away and back: nothing changed, but a save may have run in between.
        frame.ctx.putImageData(g.before, 0, 0);
        frame.touch();
        this.host.onChange(frame);
        this.host.onCancel?.(frame);
      }
      return;
    }
    if (!g.uniform) this.segment(g, true);
    const pad = g.maxW / 2 + 2;
    const rect = { x: g.bbox.x0 - pad, y: g.bbox.y0 - pad, w: g.bbox.x1 - g.bbox.x0 + pad * 2, h: g.bbox.y1 - g.bbox.y0 + pad * 2 };
    // A gesture that changed no pixel (eraser on paper, the same colour over itself) is not a step.
    if (!this.host.undo.commit(frame, rect, g.before)) return;
    frame.touch();
    this.host.onChange(frame);
    this.host.onStrokeEnd(frame);
  }

  onCancel(e) {
    if (e.pointerType === "pen") this.penActiveUntil = Date.now() + PEN_GRACE_MS;
    if (this.active && e.pointerId === this.active.pointerId) this.cancelActive();
  }

  /** Restores the frame to how it was before the gesture began. */
  cancelActive() {
    const g = this.active;
    if (!g) return;
    this.active = null;
    g.frame.ctx.putImageData(g.before, 0, 0);
    // An autosave may have stored the half-drawn frame under the unchanged version number;
    // marking the frame changed makes the next save write the restored pixels (CODE-C7).
    g.frame.touch();
    this.host.onChange(g.frame);
    this.host.onCancel?.(g.frame);
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

  /**
   * Constant-width strokes: puts back the pre-stroke pixels under the stroke and draws the whole
   * smoothed stroke as ONE path, up to the newest point. Stroking piece by piece painted the
   * half-covered edge pixels twice at every joint (beads on the 5 px line, T-12).
   */
  redraw(g, from = 0) {
    const pts = g.pts;
    const n = pts.length;
    const w = g.widths[0];
    const { width, height } = g.frame.canvas;
    const pad = w / 2 + 2;
    // Only the end of the stroke changes when points arrive: the area around the points from
    // `from` on. That rectangle gets its pre-stroke pixels back, and the stroke is drawn again
    // inside it only (clip), from every piece that reaches into it. The cost of a move then
    // depends on the new piece, not on the length of the stroke.
    let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
    for (let i = from; i < n; i++) {
      if (pts[i][0] < bx0) bx0 = pts[i][0];
      if (pts[i][0] > bx1) bx1 = pts[i][0];
      if (pts[i][1] < by0) by0 = pts[i][1];
      if (pts[i][1] > by1) by1 = pts[i][1];
    }
    const x = Math.max(0, Math.floor(bx0 - pad)), y = Math.max(0, Math.floor(by0 - pad));
    const x2 = Math.min(width, Math.ceil(bx1 + pad)), y2 = Math.min(height, Math.ceil(by1 + pad));
    if (x2 <= x || y2 <= y) return; // the new piece is off the canvas
    g.frame.ctx.putImageData(g.before, 0, 0, x, y, x2 - x, y2 - y);
    const c = this.setup(g);
    c.beginPath();
    c.rect(x, y, x2 - x, y2 - y);
    c.clip();
    if (n < 2) {
      c.beginPath();
      c.arc(pts[0][0], pts[0][1], w / 2, 0, Math.PI * 2);
      c.fill();
      c.restore();
      return;
    }
    // The stroke is a chain of pieces: piece i runs from the midpoint before point i, through
    // point i, to the midpoint after it (the two ends are straight). A piece is drawn when the
    // box of its three points, grown by half the width, touches the rectangle.
    const rx0 = x - pad, ry0 = y - pad, rx1 = x2 + pad, ry1 = y2 + pad;
    c.lineWidth = w;
    c.beginPath();
    let open = false; // the previous piece was drawn, so the path continues without a gap
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], p = pts[i], b = pts[Math.min(n - 1, i + 1)];
      const hit = Math.max(a[0], p[0], b[0]) >= rx0 && Math.min(a[0], p[0], b[0]) <= rx1 &&
        Math.max(a[1], p[1], b[1]) >= ry0 && Math.min(a[1], p[1], b[1]) <= ry1;
      if (!hit) { open = false; continue; }
      if (i === 0) {
        c.moveTo(p[0], p[1]);
        if (n === 2) c.lineTo(b[0], b[1]);
        else c.lineTo((p[0] + b[0]) / 2, (p[1] + b[1]) / 2);
      } else if (i === n - 1) {
        if (n > 2) {
          if (!open) c.moveTo((a[0] + p[0]) / 2, (a[1] + p[1]) / 2);
          c.lineTo(p[0], p[1]);
        }
      } else {
        if (!open) c.moveTo((a[0] + p[0]) / 2, (a[1] + p[1]) / 2);
        c.quadraticCurveTo(p[0], p[1], (p[0] + b[0]) / 2, (p[1] + b[1]) / 2);
      }
      open = true;
    }
    c.stroke();
    c.restore();
  }

  /** Pressure strokes: draws the newest smoothed piece, from the previous midpoint through the previous point. */
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
    // Work on a copy of the snapshot the gesture already took: one read of the frame, not two.
    const img = new ImageData(new Uint8ClampedArray(g.before.data), width, height);
    const rect = floodFill(img.data, width, height, p[0], p[1], hexToRgb(this.host.getColor()));
    if (!rect) return;
    frame.ctx.putImageData(img, 0, 0, rect.x, rect.y, rect.w, rect.h);
    if (!this.host.undo.commit(frame, rect, g.before, img)) return;
    frame.touch();
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
