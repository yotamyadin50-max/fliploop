// Playback and the Play choreography (Part B). t = 0 at the press:
//   0     Play presses, icon becomes Stop; onion fades (180); tools dim to 40% (160)   [CSS]
//   60    canvas backlight warms (240)                                                 [CSS]
//   120   strip glides so the current frame is centred (240, emphasized-decelerate)    [JS]
//   120   projector gate scales 1.15 to 1 and fades in; cells outside dim to 55%        [CSS]
//   360   playback starts. 6 and 12 fps: intermittent pull-down, one cell in 0.4 of a
//         period, then rest in the gate. 24 fps: continuous 1728 px/s. Holds rest the
//         film hold x period; ping-pong reverses it.
// First Play ever: lamp-catch dips at 360 and 480 ms (amber .45 to .28, 40 ms each), edge
// print lights left to right.
// Stop (280 ms): film halts with the showing frame in the gate and it becomes current.
// Reduced motion: no glide, pull-down or flicker; the strip stays still and the Lamp
// outline steps cell to cell.
import { playSequence, frameDurationMs } from "../core/timing.js";
import { easing, reducedMotion } from "../lib/util.js";
import { CELL } from "./strip.js";

/** Playback itself begins this long after the Play press. Lesson mode times its one full pass
 *  from the same number (contract K12), so it is exported, not copied. */
export const PLAY_LEAD_MS = 360;
const GLIDE_AT = 120;
const GLIDE_MS = 240;

export class Player {
  constructor(ed) {
    this.ed = ed; // { doc, stage, strip, root, setCurrent(i), onStart(), onStop(i), onFirstPlay() }
    this.playing = false;
    this.timers = [];
    this.raf = 0;
  }

  toggle() {
    if (this.playing) this.stop();
    else this.start();
  }

  start() {
    const { doc, strip, root } = this.ed;
    if (this.playing || doc.count < 2) return false;
    this.playing = true;
    this.reduced = reducedMotion();
    this.seq = playSequence(doc.count, doc.project.playMode);
    const fps = doc.project.fps;
    this.period = 1000 / fps;
    this.continuous = fps >= 24;
    this.starts = [];
    let acc = 0;
    for (const i of this.seq) {
      this.starts.push(acc);
      acc += frameDurationMs(doc.frames[i].hold, fps);
    }
    this.cycle = acc;
    const current = this.ed.currentIndex();
    this.startK = Math.max(0, this.seq.indexOf(current));
    this.shown = current;
    root.classList.add("is-playing");
    strip.el.classList.add("is-playing");
    strip.gateLabel.textContent = `${current + 1}/${doc.count}`;
    if (this.reduced) strip.markShowing(current);
    this.ed.onStart();
    if (!this.reduced) this.later(GLIDE_AT, () => this.glideTo(current));
    if (this.ed.isFirstPlay()) this.firstPlayFlourish();
    this.later(PLAY_LEAD_MS, () => {
      if (!this.reduced) strip.scroller.scrollLeft = current * CELL;
      this.base = strip.scroller.scrollLeft;
      this.t0 = performance.now();
      this.loop();
    });
    return true;
  }

  later(ms, fn) {
    this.timers.push(setTimeout(fn, ms));
  }

  glideTo(index) {
    const sc = this.ed.strip.scroller;
    const from = sc.scrollLeft;
    const to = index * CELL;
    if (Math.abs(to - from) < 1) return;
    const t0 = performance.now();
    const step = (now) => {
      if (!this.playing || this.t0 !== undefined) return;
      const p = Math.min(1, (now - t0) / GLIDE_MS);
      sc.scrollLeft = from + (to - from) * easing.emphasizedDecelerate(p);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  firstPlayFlourish() {
    const { root, strip } = this.ed;
    if (this.reduced) return this.later(360, () => this.ed.onFirstPlay()); // the line only: no flicker
    // The lamp catches: the amber glow drops for 40 ms, twice. "glow-catch" switches the
    // glow's transition off for that moment, so each dip is a clean step down and back.
    const dip = (at) => {
      this.later(at, () => root.classList.add("glow-dip"));
      this.later(at + 40, () => root.classList.remove("glow-dip"));
    };
    this.later(340, () => root.classList.add("glow-catch"));
    dip(360);
    dip(480);
    this.later(540, () => root.classList.remove("glow-catch"));
    this.later(360, () => {
      const r = strip.scroller.getBoundingClientRect();
      const edges = strip.cells
        .map((c) => c.querySelector(".cell__edge"))
        .filter((e) => { const b = e.getBoundingClientRect(); return b.right > r.left && b.left < r.right; })
        .sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
      edges.forEach((e, i) => this.later(i * 20, () => e.classList.add("is-lit")));
      this.later(edges.length * 20 + 120, () => edges.forEach((e) => e.classList.remove("is-lit")));
      this.ed.onFirstPlay();
    });
  }

  indexAt(e) {
    // binary search over cumulative starts
    let lo = 0, hi = this.starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.starts[mid] <= e) lo = mid; else hi = mid - 1;
    }
    return lo;
  }

  loop() {
    const tick = (now) => {
      if (!this.playing) return;
      const elapsed = now - this.t0 + this.starts[this.startK];
      const e = elapsed % this.cycle;
      const k = this.indexAt(e);
      const frameIndex = this.seq[k];
      if (frameIndex !== this.shown) {
        this.shown = frameIndex;
        this.ed.stage.show(this.ed.doc.frames[frameIndex]);
        this.ed.strip.gateLabel.textContent = `${frameIndex + 1}/${this.ed.doc.count}`;
        if (this.reduced) this.ed.strip.markShowing(frameIndex);
        this.ed.onFrameShown?.(frameIndex, elapsed);
      }
      if (!this.reduced) this.moveFilm(k, e - this.starts[k]);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  /** Film position in cells for sequence entry k, `local` ms into it. */
  filmPosition(k, local) {
    const n = this.seq.length;
    const cur = this.seq[k];
    const dur = this.starts[k + 1] !== undefined ? this.starts[k + 1] - this.starts[k] : this.cycle - this.starts[k];
    if (this.continuous) {
      const next = this.seq[(k + 1) % n];
      if (Math.abs(next - cur) !== 1) return cur; // loop wrap: the film jumps back
      const moveStart = dur - this.period;
      const p = local <= moveStart ? 0 : (local - moveStart) / this.period;
      return cur + (next - cur) * Math.min(1, p);
    }
    const prev = this.seq[(k - 1 + n) % n];
    if (Math.abs(prev - cur) !== 1) return cur;
    const pull = 0.4 * this.period;
    if (local >= pull) return cur;
    return prev + (cur - prev) * easing.standardDecelerate(local / pull);
  }

  moveFilm(k, local) {
    const pos = this.filmPosition(k, local);
    this.filmPos = pos;
    this.ed.strip.track.style.transform = `translateX(${-(pos * CELL - this.base)}px)`;
  }

  stop() {
    if (!this.playing) return;
    this.playing = false;
    for (const id of this.timers) clearTimeout(id);
    this.timers = [];
    cancelAnimationFrame(this.raf);
    this.t0 = undefined;
    const { strip, root } = this.ed;
    const showing = this.shown;
    strip.track.style.transform = "";
    strip.markShowing(null);
    strip.scroller.scrollLeft = showing * CELL;
    root.classList.remove("is-playing", "glow-dip", "glow-catch");
    strip.el.classList.remove("is-playing");
    this.ed.onStop(showing);
  }
}
