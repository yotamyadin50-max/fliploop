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
    this.resumeWhenVisible = false;
    // A hidden tab gets no animation frames: pause there, and pick up again on return.
    this.onVisibility = () => {
      if (document.visibilityState !== "visible") {
        this.resumeWhenVisible = this.playing;
        if (this.playing) this.pause();
      } else if (this.resumeWhenVisible) {
        this.resumeWhenVisible = false;
        this.play();
      }
    };
    document.addEventListener("visibilitychange", this.onVisibility);
    if (!reducedMotion()) this.play();
    else this.renderToggle();
  }

  frameMs() {
    return (this.frames[this.i].hold * 1000) / this.fps;
  }

  show(i) {
    this.i = (i + this.frames.length) % this.frames.length;
    const g = this.canvas.getContext("2d");
    g.fillStyle = "#FFFFFF";
    g.fillRect(0, 0, this.canvas.width, this.canvas.height);
    g.drawImage(this.frames[this.i].canvas, 0, 0);
    this.cells.forEach((c, k) => c.classList.toggle("is-current", k === this.i));
    this.centerCell();
  }

  /** Keeps the current cell in the middle of the mini strip, measured inside the strip
   *  (offsetLeft is relative to the offset parent, which is not the strip). */
  centerCell() {
    const strip = this.strip;
    if (strip.scrollWidth <= strip.clientWidth) return;
    const s = strip.getBoundingClientRect();
    const c = this.cells[this.i].getBoundingClientRect();
    strip.scrollLeft += c.left - s.left - (s.width - c.width) / 2;
  }

  step(d) {
    this.resumeWhenVisible = false;
    this.pause();
    this.show(this.i + d);
  }

  play() {
    cancelAnimationFrame(this.raf);
    this.playing = true;
    let last = performance.now();
    let left = this.frameMs();
    const tick = (now) => {
      if (!this.playing) return;
      left -= now - last;
      last = now;
      if (left <= 0) {
        // At most one frame per tick. After a long gap (a frozen or background tab) the
        // missed frames are dropped, never replayed in a burst.
        this.show(this.i + 1);
        const dur = this.frameMs();
        left = left + dur > 0 ? left + dur : dur;
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
    this.resumeWhenVisible = false;
    if (this.playing) this.pause();
    else this.play();
  }

  renderToggle() {
    this.toggleBtn.replaceChildren(iconEl(this.playing ? "stop" : "play", { size: 20 }), h("span", { dir: "rtl" }, t(this.playing ? "lesson.example.stop" : "lesson.example.play")));
  }

  destroy() {
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.resumeWhenVisible = false;
    this.pause();
  }
}
