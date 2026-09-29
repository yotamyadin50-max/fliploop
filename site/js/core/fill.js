// Contiguous flood fill on raw RGBA pixels (plan: current frame only, tolerance 32).
// A 1px ring around the filled area is composited *behind* the existing pixels, so the
// fill tucks under anti-aliased line edges instead of leaving a pale halo.

export const FILL_TOLERANCE = 32;

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
 * color is [r, g, b] (opaque).
 */
export function floodFill(data, width, height, startX, startY, color, tolerance = FILL_TOLERANCE) {
  const sx = Math.floor(startX);
  const sy = Math.floor(startY);
  if (sx < 0 || sy < 0 || sx >= width || sy >= height) return null;
  const si = (sy * width + sx) * 4;
  const target = [data[si], data[si + 1], data[si + 2], data[si + 3]];
  if (target[3] === 255 && target[0] === color[0] && target[1] === color[1] && target[2] === color[2]) return null;

  const mask = new Uint8Array(width * height); // 1 = filled
  const stack = [sx, sy];
  let minX = sx, maxX = sx, minY = sy, maxY = sy;

  while (stack.length) {
    const y = stack.pop();
    let x = stack.pop();
    let p = y * width + x;
    while (x >= 0 && !mask[p] && matches(data, p * 4, target, tolerance)) { x--; p--; }
    x++; p++;
    let upOpen = false, downOpen = false;
    while (x < width && !mask[p] && matches(data, p * 4, target, tolerance)) {
      mask[p] = 1;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (y > 0) {
        const up = p - width;
        const ok = !mask[up] && matches(data, up * 4, target, tolerance);
        if (ok && !upOpen) { stack.push(x, y - 1); upOpen = true; } else if (!ok) upOpen = false;
      }
      if (y < height - 1) {
        const dn = p + width;
        const ok = !mask[dn] && matches(data, dn * 4, target, tolerance);
        if (ok && !downOpen) { stack.push(x, y + 1); downOpen = true; } else if (!ok) downOpen = false;
      }
      x++; p++;
    }
  }

  const [r, g, b] = color;
  // Ring pass first (reads original pixels), then paint the mask.
  const x0 = Math.max(0, minX - 1), x1 = Math.min(width - 1, maxX + 1);
  const y0 = Math.max(0, minY - 1), y1 = Math.min(height - 1, maxY + 1);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const p = y * width + x;
      if (mask[p]) continue;
      const touches =
        (x > 0 && mask[p - 1]) || (x < width - 1 && mask[p + 1]) ||
        (y > 0 && mask[p - width]) || (y < height - 1 && mask[p + width]);
      if (!touches) continue;
      const i = p * 4;
      const a = data[i + 3] / 255;
      data[i] = Math.round(data[i] * a + r * (1 - a));
      data[i + 1] = Math.round(data[i + 1] * a + g * (1 - a));
      data[i + 2] = Math.round(data[i + 2] * a + b * (1 - a));
      data[i + 3] = 255;
    }
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
