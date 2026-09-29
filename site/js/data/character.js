// The waving character (Home flipbook and lesson 12), as stroke data in unit space.
// Unit space: body bottom at y = 0, x = 0 centre, head r = 20 (a 40 px head, 52 px pear body).
import { LAMP, stroke, dot } from "./shapes.js";

const rad = (d) => (d * Math.PI) / 180;

/** Home frames: arm angle (degrees above horizontal), body squash, blink, tuft lag (plan B Home 4). */
export const HOME_FRAMES = [20, 45, 70, 95, 95, 70, 45, 20].map((arm, i) => ({
  arm,
  squash: i === 3 || i === 4 ? 0.98 : 1,
  blink: i === 5,
}));

function bodyOutline(squash) {
  const right = [];
  const n = 24;
  const h = 52 * squash;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const y = -h + h * t;
    const half = 10 + 10 * Math.sin((Math.PI / 2) * Math.min(1, t * 1.2));
    right.push([half, y]);
  }
  const bottom = [];
  for (let i = 1; i < 8; i++) bottom.push([20 - (40 * i) / 8, 2 * Math.sin((Math.PI * i) / 8)]);
  const left = right.slice().reverse().map(([x, y]) => [-x, y]);
  return right.concat(bottom, left);
}

/**
 * Character strokes for one pose. opts: arm (deg above horizontal), squash, blink, tuftLag (px).
 * transform(x, y) maps unit space into the target space; scale sets stroke widths.
 */
export function characterStrokes({ arm, squash = 1, blink = false, tuftLag = 0, withArm = true }, transform, scale = 1) {
  const T = ([x, y]) => transform(x, y);
  const w = 3 * scale;
  const bodyH = 52 * squash;
  const headY = -bodyH - 18;
  const out = [];
  out.push(stroke(bodyOutline(squash).map(T), { w, closed: true }));
  const head = [];
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    head.push(T([Math.cos(a) * 20, headY + Math.sin(a) * 20]));
  }
  out.push(stroke(head, { w, closed: true }));
  // three-hair tuft, lagging the head by one frame
  const ty = headY - 20 + tuftLag;
  out.push(stroke([[-4, ty + 1], [-7, ty - 7], [-10, ty - 10]].map(T), { w }));
  out.push(stroke([[0, ty], [1, ty - 9], [0, ty - 13]].map(T), { w }));
  out.push(stroke([[4, ty + 1], [8, ty - 6], [11, ty - 9]].map(T), { w }));
  // eyes
  if (blink) {
    out.push(stroke([[-10, headY - 3], [-4, headY - 3]].map(T), { w: 2 * scale }));
    out.push(stroke([[4, headY - 3], [10, headY - 3]].map(T), { w: 2 * scale }));
  } else {
    const [ex1, ey1] = T([-7, headY - 3]);
    const [ex2, ey2] = T([7, headY - 3]);
    out.push(dot(ex1, ey1, 4.5 * scale));
    out.push(dot(ex2, ey2, 4.5 * scale));
  }
  // smile
  const smile = [];
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI * (0.15 + 0.7 * (i / 8));
    smile.push(T([Math.cos(a) * -8, headY + 3 + Math.sin(a) * 6]));
  }
  out.push(stroke(smile, { w: 2.5 * scale }));
  // cheeks (Lamp at 60% on Home; drawn as a flag so the SVG can set opacity)
  const [c1x, c1y] = T([-13, headY + 4]);
  const [c2x, c2y] = T([13, headY + 4]);
  out.push({ ...dot(c1x, c1y, 5 * scale, LAMP), cheek: true });
  out.push({ ...dot(c2x, c2y, 5 * scale, LAMP), cheek: true });
  // resting arm (character's right, screen left)
  const shoulderY = -bodyH + 12;
  out.push(stroke([[-12, shoulderY], [-20, shoulderY + 14], [-23, shoulderY + 26]].map(T), { w }));
  return withArm ? out.concat(armStrokes(arm, squash, transform, scale)) : out;
}

/** Only the waving arm (lesson 12 key frames and the user's blank-frame target). */
export function armStrokes(arm, squash, transform, scale = 1) {
  const T = ([x, y]) => transform(x, y);
  // The spec's 20..95 degree wave is mapped onto an upper arm that rises outward and a
  // forearm that bends further up, so at 95 the hand is raised beside the head, never across it.
  const upper = arm * 0.6;
  const fore = upper + 28;
  const shoulder = [18, -52 * squash + 10];
  const elbow = [shoulder[0] + Math.cos(rad(upper)) * 22, shoulder[1] - Math.sin(rad(upper)) * 22];
  const hand = [elbow[0] + Math.cos(rad(fore)) * 20, elbow[1] - Math.sin(rad(fore)) * 20];
  const handPts = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    handPts.push(T([hand[0] + Math.cos(a) * 4, hand[1] + Math.sin(a) * 4]));
  }
  return [
    stroke([[12, shoulder[1] + 3], shoulder, elbow, hand].map(T), { w: 3 * scale }),
    stroke(handPts, { w: 2.5 * scale, closed: true }),
  ];
}
