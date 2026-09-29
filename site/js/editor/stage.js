// The canvas stack: paper (CSS) < onion ghosts < lesson guides < current frame.
// Backing stores stay at the project size (480x360 or 360x360); CSS scales them.
import { h } from "../lib/dom.js";
import { makeCanvas } from "../lib/util.js";
import { drawStrokes } from "../lib/raster.js";

const ONION_PREV = "#E0403A";
const ONION_NEXT = "#2F6BDB";

export class Stage {
  constructor(width, height) {
    this.onion = h("canvas", { class: "stage__layer stage__onion", "aria-hidden": "true" });
    this.guides = h("canvas", { class: "stage__layer stage__guides", "aria-hidden": "true" });
    this.display = h("canvas", { class: "stage__layer stage__display", role: "img" });
    this.lock = h("span", { class: "stage__lock", hidden: true });
    this.el = h("div", { class: "stage" }, this.onion, this.guides, this.display, this.lock);
    this.tint = makeCanvas(width, height);
    this.supportsFilter = "filter" in this.tint.getContext("2d");
    this.setSize(width, height);
    this.renderQueued = false;
  }

  setSize(width, height) {
    for (const c of [this.onion, this.guides, this.display, this.tint]) {
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
  }

  renderGuides(guides) {
    const g = this.guides.getContext("2d");
    g.clearRect(0, 0, this.guides.width, this.guides.height);
    if (guides?.length) drawStrokes(g, guides);
  }
}
