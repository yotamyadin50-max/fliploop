// Lesson example player: a small light table with a 4:3 paper canvas over a 48px mini
// strip without edge print. Loops at the lesson fps; reduced motion starts paused with
// step buttons.
import { h } from "../lib/dom.js";
import { t } from "../lib/i18n.js";
import { makeCanvas, reducedMotion } from "../lib/util.js";
import { drawStrokes } from "../lib/raster.js";
import { iconEl } from "../ui/icons.js";

export class MiniPlayer {
  constructor(frames, { fps, width = 480, height = 360, label }) {
    this.frames = frames.map((f) => {
      const c = makeCanvas(width, height);
      drawStrokes(c.getContext("2d"), f.strokes);
      return { canvas: c, hold: f.hold || 1 };
    });
    this.fps = fps;
    this.i = 0;
    this.canvas = h("canvas", { class: "mini__canvas", width, height, role: "img", "aria-label": label });
    this.cells = this.frames.map((f, i) => {
      const th = h("canvas", { class: "mini__cell", width: 96, height: 72, "aria-hidden": "true" });
      const g = th.getContext("2d");
      g.fillStyle = "#FFF";
      g.fillRect(0, 0, 96, 72);
      g.drawImage(f.canvas, 0, 0, 96, 72);
      return th;
    });
    this.strip = h("div", { class: "mini__strip film", dir: "ltr", "aria-hidden": "true" }, this.cells);
    this.toggleBtn = h("button", { class: "btn btn--secondary btn--compact", type: "button", onclick: () => this.toggle() });
    const prev = h("button", { class: "icon-btn", type: "button", "aria-label": t("lesson.example.prev"), onclick: () => this.step(-1) }, iconEl("stepPrev"));
    const next = h("button", { class: "icon-btn", type: "button", "aria-label": t("lesson.example.next"), onclick: () => this.step(1) }, iconEl("stepNext"));
    this.controls = h("div", { class: "mini__controls", dir: "ltr" }, prev, this.toggleBtn, next);
    this.el = h("div", { class: "mini" }, h("div", { class: "mini__table" }, this.canvas), this.strip, this.controls);
    this.show(0);
    this.playing = false;
    if (!reducedMotion()) this.play();
    else this.renderToggle();
  }

  show(i) {
    this.i = (i + this.frames.length) % this.frames.length;
    const g = this.canvas.getContext("2d");
    g.fillStyle = "#FFFFFF";
    g.fillRect(0, 0, this.canvas.width, this.canvas.height);
    g.drawImage(this.frames[this.i].canvas, 0, 0);
    this.cells.forEach((c, k) => c.classList.toggle("is-current", k === this.i));
    const cell = this.cells[this.i];
    const strip = this.strip;
    const target = cell.offsetLeft - strip.clientWidth / 2 + cell.offsetWidth / 2;
    if (strip.scrollWidth > strip.clientWidth) strip.scrollLeft = target;
  }

  step(d) {
    this.pause();
    this.show(this.i + d);
  }

  play() {
    this.playing = true;
    let last = performance.now();
    let left = (this.frames[this.i].hold * 1000) / this.fps;
    const tick = (now) => {
      if (!this.playing) return;
      left -= now - last;
      last = now;
      while (left <= 0) {
        this.show(this.i + 1);
        left += (this.frames[this.i].hold * 1000) / this.fps;
      }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
    this.renderToggle();
  }

  pause() {
    this.playing = false;
    cancelAnimationFrame(this.raf);
    this.renderToggle();
  }

  toggle() {
    if (this.playing) this.pause();
    else this.play();
  }

  renderToggle() {
    this.toggleBtn.replaceChildren(iconEl(this.playing ? "stop" : "play", { size: 20 }), h("span", { dir: "rtl" }, t(this.playing ? "lesson.example.stop" : "lesson.example.play")));
  }

  destroy() {
    this.pause();
  }
}
