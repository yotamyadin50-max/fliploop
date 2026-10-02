// Contiguous flood fill on raw RGBA pixels (plan: current frame only).
//
// The tolerance depends on what was clicked (fix round 2026-10, R8):
//   - bare paper or a soft edge (the clicked pixel is not fully opaque): 32 per channel, so the
//     faint anti-aliased fringe of a line is swallowed and the fill reaches the line;
//   - opaque paint: 4 per channel. The closest two palette colours are 9 apart, so a fill
//     can never cross from one colour into its neighbour (the old flat 32 leaked on 36 pairs).
//
// Edges:
//   - on paper, a 1px ring around the filled area is composited *behind* the existing
//     pixels, so the fill tucks under anti-aliased line edges instead of leaving a pale halo;
//   - on paint, the rim pixels are already opaque mixes of the line and the old colour. Each
//     one is un-mixed (how much of the old colour is in it, judged against the line colour
//     next to it) and that share is replaced by the new colour, so no old tint stays behind.

export const FILL_TOLERANCE = 32;
export const FILL_TOLERANCE_PAINT = 4;

const RIM_WINDOW = 2; // how far to look for the line colour next to a rim pixel
const RIM_RESIDUAL_MAX = 10; // a rim pixel must sit this close to the line between old colour and line colour
const RIM_MIN_TINT = 6; // how much old colour (in colour levels) a rim pixel must hold to be re-tinted

function matches(data, i, target, tol) {
  return (
    Math.abs(data[i] - target[0]) <= tol &&
    Math.abs(data[i + 1] - target[1]) <= tol &&
    Math.abs(data[i + 2] - target[2]) <= tol &&
    Math.abs(data[i + 3] - target[3]) <= tol
  );
}

/**
 * Fills in place. Returns the changed rectangle {x, y, w, h}, or null when nothing changed.
 * color is [r, g, b] (opaque). `tolerance` overrides the automatic choice (tests only).
 */
export function floodFill(data, width, height, startX, startY, color, tolerance = null) {
  const sx = Math.floor(startX);
  const sy = Math.floor(startY);
  if (!(sx >= 0 && sy >= 0 && sx < width && sy < height)) return null; // also refuses NaN
  const si = (sy * width + sx) * 4;
  const target = [data[si], data[si + 1], data[si + 2], data[si + 3]];
  if (target[3] === 255 && target[0] === color[0] && target[1] === color[1] && target[2] === color[2]) return null;
  const onPaint = target[3] === 255;
  const tol = tolerance ?? (onPaint ? FILL_TOLERANCE_PAINT : FILL_TOLERANCE);

  const mask = new Uint8Array(width * height); // 1 = filled
  const stack = [sx, sy];
  let minX = sx, maxX = sx, minY = sy, maxY = sy;

  while (stack.length) {
    const y = stack.pop();
    let x = stack.pop();
    let p = y * width + x;
    while (x >= 0 && !mask[p] && matches(data, p * 4, target, tol)) { x--; p--; }
    x++; p++;
    let upOpen = false, downOpen = false;
    while (x < width && !mask[p] && matches(data, p * 4, target, tol)) {
      mask[p] = 1;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (y > 0) {
        const up = p - width;
        const ok = !mask[up] && matches(data, up * 4, target, tol);
        if (ok && !upOpen) { stack.push(x, y - 1); upOpen = true; } else if (!ok) upOpen = false;
      }
      if (y < height - 1) {
        const dn = p + width;
        const ok = !mask[dn] && matches(data, dn * 4, target, tol);
        if (ok && !downOpen) { stack.push(x, y + 1); downOpen = true; } else if (!ok) downOpen = false;
      }
      x++; p++;
    }
  }

  const [r, g, b] = color;
  // Edge pass first (it reads original pixels), then paint the mask.
  const x0 = Math.max(0, minX - 1), x1 = Math.min(width - 1, maxX + 1);
  const y0 = Math.max(0, minY - 1), y1 = Math.min(height - 1, maxY + 1);
  const writes = []; // [byteIndex, r, g, b, a] quintuples, applied after every read is done
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const p = y * width + x;
      if (mask[p]) continue;
      const left = x > 0, right = x < width - 1, up = y > 0, down = y < height - 1;
      const side = (left && mask[p - 1]) || (right && mask[p + 1]) || (up && mask[p - width]) || (down && mask[p + width]);
      const i = p * 4;
      const a8 = data[i + 3];
      if (!onPaint) {
        // Paper: tuck the fill under the soft edge pixel.
        if (!side || a8 === 255) continue;
        const a = a8 / 255;
        writes.push(i, Math.round(data[i] * a + r * (1 - a)), Math.round(data[i + 1] * a + g * (1 - a)), Math.round(data[i + 2] * a + b * (1 - a)), 255);
        continue;
      }
      // Paint: rim pixels touch the area by a side or by a corner (a soft diagonal edge has both).
      const corner = side ||
        (up && ((left && mask[p - width - 1]) || (right && mask[p - width + 1]))) ||
        (down && ((left && mask[p + width - 1]) || (right && mask[p + width + 1])));
      if (!corner || a8 === 0) continue; // bare paper beside the paint: the fill never grows into it
      if (a8 < 255) {
        // The same paint with a soft or partly erased edge: new colour, same softness.
        const slack = a8 >= 128 ? 6 : a8 >= 32 ? 14 : 40;
        if (Math.abs(data[i] - target[0]) <= slack && Math.abs(data[i + 1] - target[1]) <= slack && Math.abs(data[i + 2] - target[2]) <= slack) {
          writes.push(i, r, g, b, a8);
        }
        continue;
      }
      const share = oldColourShare(data, mask, width, height, x, y, target, tol);
      if (share <= 0) continue;
      writes.push(i,
        clamp8(data[i] + share * (r - target[0])),
        clamp8(data[i + 1] + share * (g - target[1])),
        clamp8(data[i + 2] + share * (b - target[2])), 255);
    }
  }
  for (let k = 0; k < writes.length; k += 5) {
    const i = writes[k];
    data[i] = writes[k + 1]; data[i + 1] = writes[k + 2]; data[i + 2] = writes[k + 3]; data[i + 3] = writes[k + 4];
  }
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const p = y * width + x;
      if (!mask[p]) continue;
      const i = p * 4;
      data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
    }
  }
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

const clamp8 = (v) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));

/**
 * How much of the old fill colour (`target`) an opaque rim pixel holds, 0..1.
 * The pixel is read as a mix: share * old colour + (1 - share) * line colour. The line colour is
 * taken from the nearby pixel (outside the filled area) that explains the mix best: the rim
 * pixel must lie on the straight line between the old colour and that pixel's colour. 0 means
 * "not a mix with the old colour" (pure line, another paint, or nothing convincing nearby).
 */
function oldColourShare(data, mask, width, height, x, y, target, tol) {
  const i = (y * width + x) * 4;
  const v0 = data[i] - target[0], v1 = data[i + 1] - target[1], v2 = data[i + 2] - target[2];
  // Same colour as the area but not part of it (it only touches by a corner): another area.
  if (Math.abs(v0) <= tol && Math.abs(v1) <= tol && Math.abs(v2) <= tol) return 0;
  let best = -1, bestResidual = Infinity, bestLength = 0;
  for (let wy = -RIM_WINDOW; wy <= RIM_WINDOW; wy++) {
    const qy = y + wy;
    if (qy < 0 || qy >= height) continue;
    for (let wx = -RIM_WINDOW; wx <= RIM_WINDOW; wx++) {
      const qx = x + wx;
      if (qx < 0 || qx >= width || (!wx && !wy)) continue;
      const q = qy * width + qx;
      if (mask[q]) continue;
      const j = q * 4;
      if (data[j + 3] < 96) continue; // too faint for its colour to be trusted
      const u0 = data[j] - target[0], u1 = data[j + 1] - target[1], u2 = data[j + 2] - target[2];
      const length = u0 * u0 + u1 * u1 + u2 * u2;
      if (!length) continue;
      const a = (v0 * u0 + v1 * u1 + v2 * u2) / length; // share of the line colour in the rim pixel
      if (a <= 0 || a >= 1) continue; // not between the old colour and this candidate
      // The old colour must really show in the pixel: at least RIM_MIN_TINT levels away from the
      // candidate. Less than that is a pure line pixel plus rounding noise, and stays as it is.
      if ((1 - a) * Math.sqrt(length) < RIM_MIN_TINT) continue;
      const residual = Math.max(Math.abs(v0 - a * u0), Math.abs(v1 - a * u1), Math.abs(v2 - a * u2));
      if (residual > RIM_RESIDUAL_MAX) continue;
      // Best fit wins; among equal fits the purest line colour (farthest from the old colour).
      if (residual < bestResidual - 1.5 || (residual <= bestResidual + 1.5 && length > bestLength)) {
        best = a;
        bestResidual = Math.min(bestResidual, residual);
        bestLength = length;
      }
    }
  }
  return best < 0 ? 0 : 1 - best;
}

/** Counts pixels whose alpha differs meaningfully between two same-size RGBA buffers. */
export function countChangedPixels(a, b, threshold = 40) {
  let n = 0;
  for (let i = 0; i < a.length; i += 4) {
    const d =
      Math.abs(a[i + 3] - b[i + 3]) > threshold ||
      (a[i + 3] > 0 && b[i + 3] > 0 &&
        (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2])) > threshold * 3);
    if (d) n++;
  }
  return n;
}

export function hexToRgb(hex) {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}
