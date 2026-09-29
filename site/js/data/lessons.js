// The 12 lessons (plan 6 table): prepared frames as stroke data, guides, and each example.
// Frame: { role: "key" | "blank", strokes: prepared content baked into the bitmap,
//          solution: what a finished blank holds (used by the example player and starters),
//          guides: dashed hints on the guide layer, never baked, never exported }.
// Canvas space is 480 x 360.
import { LESSON_COPY } from "./lesson-copy.js";
import {
  INK, RED, GREEN, circle, ellipse, line, poly, petal, rollingBall, jumper, figure,
} from "./shapes.js";
import { characterStrokes, armStrokes } from "./character.js";

const W = 480, H = 360;
const key = (strokes, extra = {}) => ({ role: "key", strokes, solution: [], guides: [], ...extra });
const blank = (solution, extra = {}) => ({ role: "blank", strokes: [], solution, guides: [], ...extra });
const dashed = (s) => ({ ...s, c: "#8A857B", w: 2, dash: true });

// ---------- 1. squash and stretch ----------
function bounceBall(y, rx, ry) {
  return [ellipse(240, y, rx, ry)];
}
const L1 = [
  [70, 30, 30], [120, 27, 33], [190, 25, 37], [262, 23, 41],
  [318, 40, 20], [262, 23, 41], [190, 25, 37], [120, 27, 33],
];

// ---------- 2 and 10. jumps ----------
const J2 = [
  { squat: 0, arms: 0 },
  { squat: 0.35, arms: -30 },
  { squat: 0.7, arms: -55 },
  { squat: 1, arms: -72 },
  { squat: 0.5, arms: 60 },
  { squat: 0, arms: 150 },
  { squat: 0, lift: 95, arms: 170, tuck: 0.6 },
  { squat: 0, lift: 55, arms: 120, tuck: 0.3 },
  { squat: 0, lift: 12, arms: 60 },
  { squat: 0.45, arms: 30 },
];
const jump = (p, x = 240) => jumper({ x, footY: 330, ...p }).strokes;

const J10_MILD = [
  { squat: 0, arms: 0 },
  { squat: 0.25, arms: -20 },
  { squat: 0.45, arms: -35 }, // mild crouch (frame 3 guide)
  { squat: 0.2, arms: 40 },
  { squat: 0, arms: 110 },
  { squat: 0, lift: 30, arms: 130, tuck: 0.2 }, // mild air (frame 6 guide)
  { squat: 0, lift: 8, arms: 70 },
  { squat: 0.2, arms: 20 },
];
const J10_BIG = { 2: { squat: 1, arms: -80 }, 5: { squat: 0, lift: 110, arms: 175, tuck: 0.7 } };

// ---------- 3 and 8. flower ----------
const POT = [
  poly([[190, 282], [290, 282], [276, 338], [204, 338]], { closed: true }),
  line(60, 340, 420, 340),
  line(240, 282, 240, 158),
];
function flowerHead(t, cx = 240, cy = 152) {
  const spread = 7 + 65 * t;
  const length = 38 + 14 * t;
  const width = 9 + 13 * t;
  const out = [];
  for (let i = 0; i < 5; i++) out.push(petal(cx, cy, 90 + (i - 2) * spread, length, width, { w: 4 }));
  if (t > 0.15) out.push(circle(cx, cy, 4 + 8 * t, { w: 4, n: 20 }));
  return out;
}
function leaf(angle) {
  return [petal(240, 232, angle, 46, 18, { c: GREEN, w: 4 })];
}
const L8_LEAF = [8, 20, 30, 20, 8, -4, -12, -4];

// ---------- 4. rolling balls ----------
const L4A = [60, 116, 166, 236, 288, 352];
const L4B = [60, 132, 204, 276, 348, 420];
const roll = (x, y) => rollingBall(x, y, 26, ((x - 60) / 26) * (180 / Math.PI));

// ---------- 5. follow through (scarf) ----------
const RUN = [
  { hip: [100, 262], lean: 16, legs: [[40, -10], [-30, -70]], arms: [[-40, -10], [40, 90]] },
  { hip: [170, 256], lean: 16, legs: [[-5, -60], [10, 0]], arms: [[10, 50], [-10, 30]] },
  { hip: [240, 262], lean: 16, legs: [[-30, -70], [40, -10]], arms: [[40, 90], [-40, -10]] },
  { hip: [290, 258], lean: -6, legs: [[14, 4], [-8, -4]], arms: [[20, 40], [-5, 10]] },
  { hip: [292, 256], lean: -2, legs: [[6, 2], [-6, -2]], arms: [[8, 20], [-6, 6]] },
  { hip: [292, 256], lean: 0, legs: [[5, 0], [-5, 0]], arms: [[4, 12], [-6, 4]] },
  { hip: [292, 256], lean: 0, legs: [[5, 0], [-5, 0]], arms: [[3, 8], [-6, 3]] },
  { hip: [292, 256], lean: 0, legs: [[5, 0], [-5, 0]], arms: [[3, 8], [-6, 3]] },
];
const SCARF = [
  [182, -5], [176, 6], [182, -5], [158, -11], [112, -26], [58, -22], [-10, -16], [-78, -4],
];
function scarf(neck, base, curl) {
  const pts = [[neck[0], neck[1] + 4]];
  let [x, y] = pts[0];
  for (let i = 0; i < 6; i++) {
    const a = ((base + curl * i) * Math.PI) / 180;
    x += Math.cos(a) * 15;
    y -= Math.sin(a) * 15;
    pts.push([x, y]);
  }
  return [poly(pts, { c: RED, w: 7 })];
}

// ---------- 6. slow in, slow out ----------
const easeInOut = (t) => 0.5 - 0.5 * Math.cos(Math.PI * t);
const L6X = Array.from({ length: 9 }, (_, i) => 60 + 360 * easeInOut(i / 8));
const L6_LINE = line(40, 200, 440, 200);

// ---------- 7. arcs (apex at frame 5) ----------
const arcX = (i) => 60 + 45 * i;
const arcY = (x) => 300 - 220 * (1 - ((x - 240) / 180) ** 2);
const ARC_PATH = poly(Array.from({ length: 37 }, (_, i) => { const x = 60 + 10 * i; return [x, arcY(x)]; }));

// ---------- 9. timing ----------
const L9_FALL = [50, 62, 96, 150, 224, 314];

// ---------- 11. solid drawing: a band through both poles, turning about the vertical axis ----------
const BALL_R = 110;
function band(psiDeg) {
  const lambda = ((((psiDeg + 90) % 180) + 180) % 180) - 90; // the front half of the ring
  const s = Math.sin((lambda * Math.PI) / 180);
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const th = (i / 24) * Math.PI;
    pts.push([240 + BALL_R * Math.sin(th) * s, 180 - BALL_R * Math.cos(th)]);
  }
  return [poly(pts, { c: RED, w: 10 })];
}
const BALL11 = circle(240, 180, BALL_R, { n: 48 });
const psi = (i) => -67.5 + 45 * i; // K1 and K5 are half a turn (180 degrees) apart

// ---------- 12. appeal: the Home character ----------
const toCanvas12 = (x, y) => [240 + x * 2.6, 330 + y * 2.6];
const L12_ARM = [20, 45, 70, 95, 70, 45];
const body12 = () => characterStrokes({ arm: 0, withArm: false }, toCanvas12, 2.2);
const arm12 = (a) => armStrokes(a, 1, toCanvas12, 2.2);

export const LESSONS = [
  {
    n: 1, fps: 12, playMode: "loop", subject: "ball",
    frames: L1.map(([y, rx, ry], i) => (i === 0 || i === 4 ? key(bounceBall(y, rx, ry)) : blank(bounceBall(y, rx, ry)))),
  },
  {
    n: 2, fps: 12, playMode: "loop", subject: "stick",
    frames: J2.map((p, i) => {
      if (i === 0 || i === 6 || i === 9) return key(jump(p));
      return blank(jump(p), i === 3 ? { guides: jump(p).map(dashed) } : {});
    }),
  },
  {
    n: 3, fps: 6, playMode: "loop", subject: "flower",
    frames: [0, 0.2, 0.4, 0.6, 0.8, 1].map((t, i) =>
      i === 0 || i === 5 ? key([...POT, ...flowerHead(t)]) : { ...blank(flowerHead(t)), strokes: POT }),
  },
  {
    n: 4, fps: 12, playMode: "loop", subject: "ball",
    frames: [
      ...L4A.map((x, i) => (i === 0 ? key(roll(x, 120)) : blank(roll(x, 120)))),
      ...L4B.map((x, i) => (i === 0 || i === 5 ? key(roll(x, 268)) : blank(roll(x, 268)))),
    ],
  },
  {
    n: 5, fps: 12, playMode: "loop", subject: "stick",
    frames: RUN.map((pose, i) => {
      const f = figure(pose);
      return { ...blank(scarf(f.neck, ...SCARF[i])), strokes: f.strokes };
    }),
  },
  {
    n: 6, fps: 12, playMode: "loop", subject: "ball",
    frames: L6X.map((x, i) => {
      const ball = [circle(x, 200, 20, { n: 28 })];
      if (i === 0 || i === 8) return key(ball);
      const ticks = L6X.slice(1, 8).map((tx) => line(tx, 184, tx, 216));
      return blank(ball, { guides: [L6_LINE, ...ticks, circle(L6X[i], 200, 4, { n: 12 })].map(dashed) });
    }),
  },
  {
    n: 7, fps: 12, playMode: "loop", subject: "ball",
    frames: Array.from({ length: 9 }, (_, i) => {
      const x = arcX(i);
      const ball = [circle(x, arcY(x), 20, { n: 28 })];
      if (i === 0 || i === 8) return key(ball);
      return blank(ball, { guides: [dashed(ARC_PATH)] });
    }),
  },
  {
    n: 8, fps: 12, playMode: "loop", subject: "flower",
    frames: L8_LEAF.map((a, i) => ({ ...blank(leaf(a)), strokes: [...POT, ...flowerHead(i / 7)] })),
  },
  {
    n: 9, fps: 12, playMode: "loop", subject: "ball", holdsUnlocked: true,
    frames: [
      ...L9_FALL.map((y) => key([circle(240, y, 26, { n: 28 })])),
      blank([ellipse(240, 322, 32, 18)]),
      blank([circle(240, 314, 26, { n: 28 })]),
    ],
    example: [
      ...L9_FALL.map((y) => ({ strokes: [circle(240, y, 26, { n: 28 })], hold: 1 })),
      { strokes: [ellipse(240, 324, 34, 16)], hold: 2 },
      { strokes: [circle(240, 314, 26, { n: 28 })], hold: 6 },
      ...L9_FALL.map((y) => ({ strokes: [circle(240, y, 26, { n: 28 })], hold: 1 })),
      { strokes: [circle(240, 230, 26, { n: 28 })], hold: 1 },
      { strokes: [circle(240, 290, 26, { n: 28 })], hold: 1 },
    ],
  },
  {
    n: 10, fps: 12, playMode: "loop", subject: "stick",
    frames: J10_MILD.map((p, i) => {
      if (i === 2 || i === 5) return blank(jump(J10_BIG[i]), { guides: jump(p).map(dashed) });
      return key(jump(p));
    }),
    example: [
      ...J10_MILD.map((p) => ({ strokes: jump(p), hold: 1 })),
      ...J10_MILD.map((p, i) => ({ strokes: jump(J10_BIG[i] || p), hold: 1 })),
    ],
  },
  {
    n: 11, fps: 12, playMode: "loop", subject: "ball",
    frames: Array.from({ length: 8 }, (_, i) =>
      i === 0 || i === 4 ? key([BALL11, ...band(psi(i))]) : { ...blank(band(psi(i))), strokes: [BALL11] }),
  },
  {
    n: 12, fps: 12, playMode: "loop", subject: "character",
    frames: L12_ARM.map((a, i) =>
      i === 0 || i === 3 ? key([...body12(), ...arm12(a)]) : { ...blank(arm12(a)), strokes: body12() }),
  },
];

export const LESSON_SIZE = { width: W, height: H };

/** The completed exercise as [{ strokes, hold }] (or the lesson's own two-part example). */
export function exampleFrames(lesson) {
  if (lesson.example) return lesson.example;
  return lesson.frames.map((f) => ({ strokes: [...f.strokes, ...f.solution], hold: 1 }));
}

export function getLesson(n) {
  return LESSONS[n - 1] || null;
}

export function lessonText(n) {
  const c = (k) => LESSON_COPY[`lesson.${n}.${k}`];
  const steps = [];
  for (let m = 1; c(`step.${m}`); m++) steps.push(c(`step.${m}`));
  const hints = {};
  for (let f = 1; f <= 12; f++) if (c(`hint.${f}`)) hints[f] = c(`hint.${f}`);
  return {
    title: c("title"), explanation: c("explanation"), caption: c("caption"),
    goal: c("goal"), steps, hints, done: c("done"),
  };
}

export function keyCount(lesson) {
  return lesson.frames.filter((f) => f.role === "key").length;
}

export function blankCount(lesson) {
  return lesson.frames.filter((f) => f.role === "blank").length;
}

export function hasGuides(lesson) {
  return lesson.frames.some((f) => f.guides.length);
}

/** Starters (plan 8): one canonical lesson per subject, so every user gets the same drawing. */
export const STARTERS = [
  { id: "ball", lesson: 1, subjectLessons: [1, 4, 6, 7, 9, 11], labelKey: "gallery.starter.ball" },
  { id: "flower", lesson: 3, subjectLessons: [3, 8], labelKey: "gallery.starter.flower" },
  { id: "stick", lesson: 2, subjectLessons: [2, 5, 10], labelKey: "gallery.starter.stick" },
  { id: "character", lesson: 12, subjectLessons: [12], labelKey: "gallery.starter.character" },
];


