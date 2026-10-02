// The canvas stack: paper (CSS) < onion ghosts < lesson guides < current frame < onion ghosts
// that the current frame's own opaque paint would hide (fix round R12).
// Backing stores stay at the project size (480x360 or 360x360); CSS scales them.
import { h } from "../lib/dom.js";
import { makeCanvas } from "../lib/util.js";
import { drawStrokes } from "../lib/raster.js";

const ONION_PREV = "#E0403A";
const ONION_NEXT = "#2F6BDB";
const OPAQUE = 250; // alpha from which the current frame hides what is under it
const SAME = 12; // per-channel distance under which two pixels count as the same colour

export class Stage {
  constructor(width, height) {
    this.onion = h("canvas", { class: "stage__layer stage__onion", "aria-hidden": "true" });
    this.guides = h("canvas", { class: "stage__layer stage__guides", "aria-hidden": "true" });
    this.display = h("canvas", { class: "stage__layer stage__display", role: "img" });
    // Same class as the ghosts below (it fades with them during Play); never takes input.
    this.onionOver = h("canvas", { class: "stage__layer stage__onion stage__onion--over", "aria-hidden": "true", style: { pointerEvents: "none" } });
    this.lock = h("span", { class: "stage__lock", hidden: true });
    this.el = h("div", { class: "stage" }, this.onion, this.guides, this.display, this.onionOver, this.lock);
    this.tint = makeCanvas(width, height);
    this.supportsFilter = "filter" in this.tint.getContext("2d");
    this.setSize(width, height);
    this.renderQueued = false;
  }

  setSize(width, height) {
    for (const c of [this.onion, this.guides, this.display, this.onionOver, this.tint]) {
      c.width = width;
      c.height = height;
    }
    this.el.style.setProperty("--aspect", `${width} / ${height}`);
    this.el.classList.toggle("stage--square", width === height);
  }

  /** Shows a frame bitmap (instant swap, never crossfaded). */
  show(frame) {
    const g = this.display.getContext("2d");
    g.clearRect(0, 0, this.display.width, this.display.height);
    if (frame) g.drawImage(frame.canvas, 0, 0);
  }

  /** Coalesces redraws to one per animation frame while drawing. */
  queue(frameGetter) {
    if (this.renderQueued) return;
    this.renderQueued = true;
    requestAnimationFrame(() => {
      this.renderQueued = false;
      this.show(frameGetter());
    });
  }

  /** Tinted silhouettes: distance 1 at 0.30, distance 2 at 0.15 with a 0.4px blur. */
  renderOnion(frames, index, onion) {
    const g = this.onion.getContext("2d");
    g.clearRect(0, 0, this.onion.width, this.onion.height);
    const over = this.onionOver.getContext("2d");
    over.clearRect(0, 0, this.onionOver.width, this.onionOver.height);
    if (!onion.enabled) return;
    const layers = [];
    for (let d = onion.prev; d >= 1; d--) if (frames[index - d]) layers.push([frames[index - d], ONION_PREV, d]);
    for (let d = onion.next; d >= 1; d--) if (frames[index + d]) layers.push([frames[index + d], ONION_NEXT, d]);
    layers.sort((a, b) => b[2] - a[2]); // distance 2 underneath distance 1
    const t = this.tint.getContext("2d");
    for (const [frame, color, d] of layers) {
      t.globalCompositeOperation = "source-over";
      t.clearRect(0, 0, this.tint.width, this.tint.height);
      t.drawImage(frame.canvas, 0, 0);
      t.globalCompositeOperation = "source-in";
      t.fillStyle = color;
      t.fillRect(0, 0, this.tint.width, this.tint.height);
      g.save();
      g.globalAlpha = d === 1 ? 0.3 : 0.15;
      if (d === 2 && this.supportsFilter) g.filter = "blur(0.4px)";
      g.drawImage(this.tint, 0, 0);
      g.restore();
    }
    this.renderOnionOver(frames[index], layers);
  }

  /**
   * Ghosts above the drawing (R12). The stack keeps the ghosts under the current frame, so a
   * bucket-filled background hid them all. Where the current frame's own opaque paint covers
   * a neighbour's mark, and the two differ there, that part of the ghost is drawn again on
   * top, same tint and opacity. A neighbour's own backdrop (the one colour most of its border
   * has, when the page was bucket-filled) is not a mark: ghosting it would wash every stroke
   * of the current frame red and blue. A line drawing of one colour gets nothing here: where
   * two frames have the same colour there is nothing to show.
   */
  renderOnionOver(current, layers) {
    if (!current || !layers.length) return;
    const W = this.onionOver.width, H = this.onionOver.height;
    if (current.canvas.width !== W || current.canvas.height !== H) return;
    const cur = current.ctx.getImageData(0, 0, W, H).data;
    let hides = false;
    for (let i = 3; i < cur.length; i += 4) if (cur[i] >= OPAQUE) { hides = true; break; }
    if (!hides) return; // nothing opaque on this frame: every ghost already shows from below
    const over = this.onionOver.getContext("2d");
    const t = this.tint.getContext("2d");
    for (const [frame, color, d] of layers) {
      if (frame.canvas.width !== W || frame.canvas.height !== H) continue;
      const nb = frame.ctx.getImageData(0, 0, W, H).data;
      const back = backdropOf(nb, W, H);
      const out = new ImageData(W, H);
      const o = out.data;
      const r = parseInt(color.slice(1, 3), 16), gg = parseInt(color.slice(3, 5), 16), b = parseInt(color.slice(5, 7), 16);
      let any = false;
      for (let i = 0; i < cur.length; i += 4) {
        if (cur[i + 3] < OPAQUE) continue; // not hidden here
        const a = nb[i + 3];
        if (a < 16) continue; // the neighbour has nothing here
        if (Math.abs(nb[i] - cur[i]) <= SAME && Math.abs(nb[i + 1] - cur[i + 1]) <= SAME && Math.abs(nb[i + 2] - cur[i + 2]) <= SAME) continue; // same colour
        if (back && a === 255 && Math.abs(nb[i] - back[0]) <= SAME && Math.abs(nb[i + 1] - back[1]) <= SAME && Math.abs(nb[i + 2] - back[2]) <= SAME) continue; // its backdrop
        o[i] = r; o[i + 1] = gg; o[i + 2] = b; o[i + 3] = a;
        any = true;
      }
      if (!any) continue;
      t.globalCompositeOperation = "source-over";
      t.putImageData(out, 0, 0);
      over.save();
      over.globalAlpha = d === 1 ? 0.3 : 0.15;
      if (d === 2 && this.supportsFilter) over.filter = "blur(0.4px)";
      over.drawImage(this.tint, 0, 0);
      over.restore();
    }
  }

  renderGuides(guides) {
    const g = this.guides.getContext("2d");
    g.clearRect(0, 0, this.guides.width, this.guides.height);
    if (guides?.length) drawStrokes(g, guides);
  }
}

/**
 * The backdrop of a frame: the opaque colour that more than half of its border pixels have
 * (a bucket-filled page), as [r, g, b]. null for a drawing on bare paper.
 */
export function backdropOf(data, W, H) {
  const counts = new Map();
  let total = 0;
  const add = (x, y) => {
    const i = (y * W + x) * 4;
    total++;
    if (data[i + 3] !== 255) return;
    const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    counts.set(key, (counts.get(key) || 0) + 1);
  };
  for (let x = 0; x < W; x++) { add(x, 0); add(x, H - 1); }
  for (let y = 1; y < H - 1; y++) { add(0, y); add(W - 1, y); }
  let best = -1, n = 0;
  for (const [key, c] of counts) if (c > n) { best = key; n = c; }
  return n * 2 > total ? [(best >> 16) & 255, (best >> 8) & 255, best & 255] : null;
}
