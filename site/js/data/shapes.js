// Geometry generators that produce stroke data (no images anywhere).
// A stroke is { c: colour, w: width px, p: [[x, y], ...], closed?: true }.

export const INK = "#1F1E1B";
export const RED = "#E23B2E";
export const GREEN = "#2E9E4F";
export const LAMP = "#F4B63F";

const rad = (deg) => (deg * Math.PI) / 180;
const r1 = (v) => Math.round(v * 10) / 10;
const pt = (x, y) => [r1(x), r1(y)];

export function stroke(p, { c = INK, w = 5, closed = false } = {}) {
  return closed ? { c, w, p, closed: true } : { c, w, p };
}

export function ellipsePts(cx, cy, rx, ry, rotDeg = 0, n = 36) {
  const pts = [];
  const cr = Math.cos(rad(rotDeg)), sr = Math.sin(rad(rotDeg));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    pts.push(pt(cx + x * cr - y * sr, cy + x * sr + y * cr));
  }
  return pts;
}

export function ellipse(cx, cy, rx, ry, opts = {}) {
  return stroke(ellipsePts(cx, cy, rx, ry, opts.rot || 0, opts.n || 36), { ...opts, closed: true });
}

export function circle(cx, cy, r, opts = {}) {
  return ellipse(cx, cy, r, r, opts);
}

export function line(x0, y0, x1, y1, opts = {}) {
  return stroke([pt(x0, y0), pt(x1, y1)], opts);
}

export function poly(points, opts = {}) {
  return stroke(points.map(([x, y]) => pt(x, y)), opts);
}

export function dot(x, y, size, c = INK) {
  return { c, w: size, p: [pt(x, y)] };
}

/** Teardrop loop from a base point outward along angleDeg (0 = right, 90 = up). */
export function petal(bx, by, angleDeg, length, width, opts = {}) {
  const a = rad(angleDeg);
  const dx = Math.cos(a), dy = -Math.sin(a);
  const nx = -dy, ny = dx;
  const pts = [];
  const n = 18;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const along = length * t;
    const half = width * 0.5 * Math.sin(Math.PI * t) * (1 - 0.25 * t);
    pts.push(pt(bx + dx * along + nx * half, by + dy * along + ny * half));
  }
  for (let i = n - 1; i > 0; i--) {
    const t = i / n;
    const along = length * t;
    const half = width * 0.5 * Math.sin(Math.PI * t) * (1 - 0.25 * t);
    pts.push(pt(bx + dx * along - nx * half, by + dy * along - ny * half));
  }
  return stroke(pts, { ...opts, closed: true });
}

/** Ball with a diameter line, rotated to show rolling. */
export function rollingBall(cx, cy, r, turnDeg) {
  const a = rad(turnDeg);
  return [
    circle(cx, cy, r),
    line(cx - Math.cos(a) * r * 0.8, cy - Math.sin(a) * r * 0.8, cx + Math.cos(a) * r * 0.8, cy + Math.sin(a) * r * 0.8, { w: 4 }),
  ];
}

// ---------- stick figure ----------
const LEG = 38, TORSO = 56, UPPER_ARM = 28, LOWER_ARM = 26, HEAD_R = 16;

function limb(start, a1, l1, a2, l2) {
  // Angles in degrees from straight down; positive swings forward (+x, the facing side).
  const j = [start[0] + Math.sin(rad(a1)) * l1, start[1] + Math.cos(rad(a1)) * l1];
  const e = [j[0] + Math.sin(rad(a2)) * l2, j[1] + Math.cos(rad(a2)) * l2];
  return [start, j, e];
}

/**
 * General pose. hip [x, y]; lean degrees forward; legs [[thigh, shin], [thigh, shin]];
 * arms [[upper, lower], [upper, lower]]. Returns strokes plus the neck point.
 */
export function figure({ hip, lean = 0, legs, arms, c = INK, w = 5 }) {
  const shoulder = [hip[0] + Math.sin(rad(lean)) * TORSO, hip[1] - Math.cos(rad(lean)) * TORSO];
  const head = [shoulder[0] + Math.sin(rad(lean)) * (HEAD_R + 5), shoulder[1] - Math.cos(rad(lean)) * (HEAD_R + 5)];
  const out = [
    circle(head[0], head[1], HEAD_R, { c, w, n: 28 }),
    poly([hip, shoulder], { c, w }),
  ];
  for (const [t, s] of legs) out.push(poly(limb(hip, t, LEG, s, LEG), { c, w }));
  for (const [u, l] of arms) out.push(poly(limb(shoulder, u + lean, UPPER_ARM, l + lean, LOWER_ARM), { c, w }));
  return { strokes: out, neck: shoulder, head };
}

/** Standing/crouching figure with both feet on footY. squat 0..1, lift px above ground. */
export function jumper({ x, footY, squat = 0, lift = 0, arms = 0, tuck = 0 }) {
  const alpha = squat * 68 + tuck * 40;
  const hipY = footY - 2 * LEG * Math.cos(rad(squat * 68)) - lift;
  const legs = [
    [alpha, -alpha * (1 - tuck * 0.2) - tuck * 30],
    [alpha - 8, -alpha + 8 - tuck * 30],
  ];
  return figure({
    hip: [x, hipY],
    lean: squat * 32,
    legs,
    arms: [[arms, arms + 18], [arms - 12, arms + 6]],
  });
}

export const FIGURE_DIMS = { LEG, TORSO, HEAD_R };
