// Home art direction (Part B): the light table seen from above, a steel peg bar, a
// flipbook proportioned like the printed 100x60 mm card, the waving character in 8 frames
// at 12 fps, a soft flip shadow that crosses the page on every second page turn, and a
// pencil. All code-drawn SVG.
import { characterStrokes, HOME_FRAMES } from "../data/character.js";
import { strokeToPath } from "../lib/raster.js";

const BOOK_W = 180, BOOK_H = 108, STAPLE = 36;
// The flip shadow (fix round R37, DS-02): a 40-unit band, soft on both edges. It was a
// 144-unit veil with a hard leading edge that sat on the page 78% of the time.
const BAND = 40, SWEEP_MS = 45;

function characterFrame(frame, prev, i) {
  // Tuft lags the head by one frame (follow-through).
  const lag = (prev.squash - frame.squash) * 52;
  const T = (x, y) => [STAPLE + (BOOK_W - STAPLE) / 2 + x * 0.88, BOOK_H - 6 + y * 0.88];
  const strokes = characterStrokes({ ...frame, tuftLag: lag }, T, 0.88);
  const paths = strokes.map((s) => {
    const d = strokeToPath(s);
    const op = s.cheek ? ' opacity=".6"' : "";
    return `<path d="${d}" stroke="${s.c}" stroke-width="${s.w}"${op}/>`;
  }).join("");
  return `<g class="flip__frame" data-frame="${i}"${i === 3 ? "" : ' style="visibility:hidden"'}>${paths}</g>`;
}

export function lightTableSvg({ withPencil = true, still = false } = {}) {
  const frames = HOME_FRAMES.map((f, i) => characterFrame(f, HOME_FRAMES[(i + 7) % 8], i)).join("");
  const edges = [5, 4, 3, 2, 1].map((k) => `<rect x="${k * 1.5}" y="${k * 1.5}" width="${BOOK_W}" height="${BOOK_H}" rx="3" fill="${k % 2 ? "#FFFFFF" : "#F6F3EC"}" stroke="#C9C4B8" stroke-width=".75"/>`).join("");
  return `<svg class="light-table" viewBox="0 0 343 240" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="lt-glow" cx="50%" cy="48%" r="62%">
      <stop offset="0" stop-color="#FFFDF7"/><stop offset=".55" stop-color="#FBF6EA"/><stop offset="1" stop-color="#EFE8D8"/>
    </radialGradient>
    <filter id="lt-grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/>
      <feColorMatrix values="0 0 0 0 0.12  0 0 0 0 0.11  0 0 0 0 0.1  0 0 0 .03 0"/>
      <feComposite in2="SourceGraphic" operator="in"/>
    </filter>
    <linearGradient id="lt-flip" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="#1F1E1B" stop-opacity="0"/><stop offset=".5" stop-color="#1F1E1B" stop-opacity=".14"/><stop offset="1" stop-color="#1F1E1B" stop-opacity="0"/>
    </linearGradient>
    <clipPath id="lt-page"><rect x="${STAPLE}" y="0" width="${BOOK_W - STAPLE}" height="${BOOK_H}" rx="3"/></clipPath>
  </defs>
  <rect x=".5" y=".5" width="342" height="239" rx="16" fill="url(#lt-glow)" stroke="#C9C4B8"/>
  <rect x=".5" y=".5" width="342" height="239" rx="16" filter="url(#lt-grain)" fill="#FFFFFF"/>
  <g class="peg-bar">
    <rect x="40" y="14" width="263" height="12" rx="6" fill="#9A958B" stroke="#6F6A61" stroke-width="1.5"/>
    <circle cx="96" cy="20" r="3.5" fill="#D6D2C8" stroke="#6F6A61" stroke-width="1"/>
    <rect x="160" y="16.5" width="23" height="7" rx="3.5" fill="#D6D2C8" stroke="#6F6A61" stroke-width="1"/>
    <circle cx="247" cy="20" r="3.5" fill="#D6D2C8" stroke="#6F6A61" stroke-width="1"/>
  </g>
  <g transform="translate(81.5 72) rotate(-4 90 54)">
    ${edges}
    <rect x="0" y="0" width="${BOOK_W}" height="${BOOK_H}" rx="3" fill="#FFFFFF" stroke="#C9C4B8" stroke-width=".75"/>
    <rect x="0" y="0" width="${STAPLE}" height="${BOOK_H}" rx="3" fill="#F1EEE8"/>
    <circle cx="18" cy="22" r="2" fill="#1F1E1B"/><circle cx="18" cy="86" r="2" fill="#1F1E1B"/>
    <g class="flip" fill="none" stroke-linecap="round" stroke-linejoin="round">${frames}</g>
    <g clip-path="url(#lt-page)"><rect class="flip__shadow" x="${BOOK_W}" y="0" width="${BAND}" height="${BOOK_H}" fill="url(#lt-flip)" opacity="0"/></g>
  </g>
  ${withPencil ? `<g transform="translate(262 196) rotate(20)">
    <polygon points="0,-5 58,-5 58,5 0,5" fill="#F4B63F" stroke="#1F1E1B" stroke-width="1.5" stroke-linejoin="round"/>
    <line x1="0" y1="0" x2="58" y2="0" stroke="#E3A21F" stroke-width="1"/>
    <polygon points="58,-5 70,0 58,5" fill="#EBD9B8" stroke="#1F1E1B" stroke-width="1.5" stroke-linejoin="round"/>
    <polygon points="66.5,-1.4 70,0 66.5,1.4" fill="#1F1E1B"/>
    <rect x="-7" y="-5" width="7" height="10" rx="1.5" fill="#E8619A" stroke="#1F1E1B" stroke-width="1.5"/>
  </g>` : ""}
</svg>`;
}

/**
 * Flips the book at 12 fps; reduced motion keeps frame 4 still and flips one page per tap.
 * Returns { stop(), setPaused(bool), paused }: the loop can be paused and resumed (R37,
 * WCAG 2.2.2); a paused book rests on the frame it was showing.
 */
export function animateFlipbook(svg, { reduced }) {
  const frames = [...svg.querySelectorAll(".flip__frame")];
  const shadow = svg.querySelector(".flip__shadow");
  let i = 3;
  let turns = 0;
  const show = (next, sweep) => {
    frames[i].style.visibility = "hidden";
    i = next;
    frames[i].style.visibility = "visible";
    // Every second page turn, and 45 ms. A page turn lasts 5 screen frames at 60 Hz, so a sweep
    // on every turn is either one frame (a flash) or two (40% of the time). On every second
    // turn it is a real 3-frame sweep, and 45 ms ends before the fourth frame at 50 ms.
    if (sweep && shadow.animate && turns++ % 2 === 0) {
      shadow.animate(
        [{ transform: "translateX(0)", opacity: 1 }, { transform: `translateX(-${BOOK_W - STAPLE + BAND}px)`, opacity: 1 }],
        { duration: SWEEP_MS, easing: "linear" });
    }
  };
  if (reduced) {
    const tap = () => show((i + 1) % frames.length, false);
    svg.addEventListener("click", tap);
    return { stop: () => svg.removeEventListener("click", tap), setPaused() {}, paused: true };
  }
  let raf = 0, last = 0;
  const period = 1000 / 12;
  const tick = (now) => {
    if (now - last >= period) {
      last += period * Math.floor((now - last) / period);
      show((i + 1) % frames.length, true);
    }
    raf = requestAnimationFrame(tick);
  };
  const control = {
    paused: true,
    setPaused(paused) {
      if (paused === control.paused) return;
      control.paused = paused;
      cancelAnimationFrame(raf);
      if (paused) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    },
    stop: () => control.setPaused(true),
  };
  control.setPaused(false);
  return control;
}
