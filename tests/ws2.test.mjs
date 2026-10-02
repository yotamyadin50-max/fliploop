// node --test "tests/*.test.mjs"   (WS2 of the 2026-10 fix round: fill, undo bookkeeping)
import { test } from "node:test";
import assert from "node:assert/strict";

import { floodFill, hexToRgb, FILL_TOLERANCE, FILL_TOLERANCE_PAINT } from "../site/js/core/fill.js";
import { sameBytes } from "../site/js/core/undo-ledger.js";
import { SHADE_ROWS, SWATCHES } from "../site/js/editor/panels.js";

const ALL = [...new Set([...SWATCHES, ...SHADE_ROWS.flatMap((r) => r.cells)])];

function buffer(w, h) {
  return new Uint8ClampedArray(w * h * 4);
}
function put(data, w, x, y, rgb, a = 255) {
  const i = (y * w + x) * 4;
  data[i] = rgb[0]; data[i + 1] = rgb[1]; data[i + 2] = rgb[2]; data[i + 3] = a;
}
function get(data, w, x, y) {
  const i = (y * w + x) * 4;
  return [data[i], data[i + 1], data[i + 2], data[i + 3]];
}

test("fill: the tolerance follows the clicked pixel (32 on paper, 4 on paint)", () => {
  assert.equal(FILL_TOLERANCE, 32);
  assert.equal(FILL_TOLERANCE_PAINT, 4);
  const w = 8, h = 1;
  // Paint: 5 apart stops the fill, 4 apart does not.
  const d = buffer(w, h);
  for (let x = 0; x < 4; x++) put(d, w, x, 0, [100, 100, 100]);
  for (let x = 4; x < 6; x++) put(d, w, x, 0, [104, 100, 100]);
  for (let x = 6; x < 8; x++) put(d, w, x, 0, [105, 100, 100]);
  floodFill(d, w, h, 0, 0, [0, 200, 0]);
  assert.deepEqual(get(d, w, 5, 0), [0, 200, 0, 255], "4 apart is the same paint");
  assert.deepEqual(get(d, w, 6, 0), [105, 100, 100, 255], "5 apart is another paint");
  // Paper: a faint fringe (alpha 32, dark) is swallowed, a stronger one stops the fill.
  const p = buffer(w, h);
  put(p, w, 3, 0, [31, 30, 27], 32);
  put(p, w, 4, 0, [31, 30, 27], 255);
  put(p, w, 5, 0, [31, 30, 27], 255);
  floodFill(p, w, h, 0, 0, [245, 197, 24]);
  assert.deepEqual(get(p, w, 3, 0), [245, 197, 24, 255]);
  assert.deepEqual(get(p, w, 4, 0), [31, 30, 27, 255]);
  assert.equal(get(p, w, 7, 0)[3], 0, "the far side of the line stays paper");
});

test("fill: no leak between any two of the 72 colours (all 2,556 pairs, both directions)", () => {
  assert.equal(ALL.length, 72);
  const w = 6, h = 3;
  let pairs = 0;
  const other = [1, 2, 3]; // a fill colour that is none of the palette colours
  for (let a = 0; a < ALL.length; a++) {
    for (let b = a + 1; b < ALL.length; b++) {
      pairs++;
      const A = hexToRgb(ALL[a]), B = hexToRgb(ALL[b]);
      for (const [from, to, startX] of [[A, B, 0], [B, A, 5]]) {
        const d = buffer(w, h);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) put(d, w, x, y, x < 3 ? A : B);
        const rect = floodFill(d, w, h, startX, 1, other);
        assert.ok(rect, `${ALL[a]} / ${ALL[b]}`);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const mine = startX === 0 ? x < 3 : x >= 3;
          assert.deepEqual(get(d, w, x, y).slice(0, 3), mine ? other : to, `${ALL[a]} / ${ALL[b]} from ${from} at ${x},${y}`);
        }
      }
    }
  }
  assert.equal(pairs, 2556);
});

/** A box outline of `line` with half-covered soft pixels on both sides of each edge. */
function softBox(w, h, line) {
  const d = buffer(w, h);
  const x0 = 4, x1 = w - 5, y0 = 4, y1 = h - 5;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = Math.min(Math.abs(x - x0), Math.abs(x - x1)), dy = Math.min(Math.abs(y - y0), Math.abs(y - y1));
    const inX = x >= x0 - 2 && x <= x1 + 2, inY = y >= y0 - 2 && y <= y1 + 2;
    const dist = Math.min(inY ? dx : 99, inX ? dy : 99);
    if (dist <= 1) put(d, w, x, y, line, 255);
    else if (dist === 2) put(d, w, x, y, line, 128);
  }
  return d;
}
const countColour = (d, rgb) => { let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3] === 255 && d[i] === rgb[0] && d[i + 1] === rgb[1] && d[i + 2] === rgb[2]) n++; return n; };

test("fill: the outline survives a refill for every colour that used to leak into ink", () => {
  const ink = hexToRgb("#1F1E1B");
  const w = 40, h = 30;
  for (const dark of ["#35322D", "#00300F", "#003634", "#270E00"]) {
    const d = softBox(w, h, ink);
    const outline = countColour(d, ink);
    floodFill(d, w, h, 20, 15, hexToRgb(dark));
    assert.equal(countColour(d, ink), outline, `${dark} first fill`);
    floodFill(d, w, h, 20, 15, hexToRgb("#F5C518"));
    assert.equal(countColour(d, ink), outline, `${dark} then yellow: the outline is still ink`);
    assert.equal(countColour(d, hexToRgb(dark)), 0, `${dark} is fully replaced`);
    assert.equal(get(d, w, 0, 0)[3], 0, "outside stays paper");
  }
});

test("fill: a refill re-tints the rim, no old colour is left in it", () => {
  const ink = hexToRgb("#1F1E1B"), yellow = hexToRgb("#F5C518"), blue = hexToRgb("#2F6BDB"), red = hexToRgb("#E23B2E"), green = hexToRgb("#2E9E4F");
  const w = 40, h = 30;
  const mix = (a, b) => a.map((v, k) => Math.round(v * 128 / 255 + b[k] * (1 - 128 / 255)));
  const d = softBox(w, h, ink);
  floodFill(d, w, h, 20, 15, yellow);
  assert.deepEqual(get(d, w, 6, 15).slice(0, 3), mix(ink, yellow), "first fill tucks under the soft edge");
  floodFill(d, w, h, 20, 15, blue);
  const rim = get(d, w, 6, 15);
  for (let k = 0; k < 3; k++) assert.ok(Math.abs(rim[k] - mix(ink, blue)[k]) <= 2, `rim channel ${k}: ${rim} vs ${mix(ink, blue)}`);
  // Three colours in a row: the rim only ever holds ink and the last colour.
  floodFill(d, w, h, 20, 15, red);
  floodFill(d, w, h, 20, 15, green);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [r, g, b, a] = get(d, w, x, y);
    if (a !== 255) continue;
    assert.ok(!(r > g + 25 && r > b + 25), `red-tinted pixel left at ${x},${y}: ${[r, g, b]}`);
  }
  const rim3 = get(d, w, 6, 15);
  for (let k = 0; k < 3; k++) assert.ok(Math.abs(rim3[k] - mix(ink, green)[k]) <= 4, `after three refills: ${rim3} vs ${mix(ink, green)}`);
});

test("fill on paint: a line drawn over a painted page gets a clean rim on the first fill", () => {
  // Page painted yellow, then a slanted ink line whose soft edge pixels are opaque mixes of ink
  // and yellow (area coverage, 8x8 samples per pixel), then one side is filled red.
  const ink = hexToRgb("#1F1E1B"), yellow = hexToRgb("#F5C518"), red = hexToRgb("#E23B2E");
  const w = 40, h = 30;
  for (const slope of [1, 0.4, 2.5]) {
    const d = buffer(w, h);
    const cov = new Float64Array(w * h);
    const side = new Int8Array(w * h); // -1 = the side that gets filled, 1 = the far side
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let n = 0;
      for (let sy = 0; sy < 8; sy++) for (let sx = 0; sx < 8; sx++) {
        const v = (x + (sx + 0.5) / 8) - slope * (y + (sy + 0.5) / 8) - 6;
        if (v >= 0 && v <= 5.3) n++;
      }
      const c = n / 64;
      cov[y * w + x] = c;
      side[y * w + x] = (x + 0.5) - slope * (y + 0.5) - 6 < 2.65 ? -1 : 1;
      put(d, w, x, y, ink.map((v, k) => Math.round(v * c + yellow[k] * (1 - c))));
    }
    const before = new Uint8ClampedArray(d);
    assert.ok(floodFill(d, w, h, 0, h - 1, red));
    let soft = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const p = y * w + x, c = cov[p];
      const now = get(d, w, x, y).slice(0, 3);
      if (side[p] === 1) { assert.deepEqual(now, [...before.subarray(p * 4, p * 4 + 3)], `far side untouched at ${x},${y}`); continue; }
      const want = ink.map((v, k) => Math.round(v * c + red[k] * (1 - c)));
      if (c > 0 && c < 1) soft++;
      for (let k = 0; k < 3; k++) assert.ok(Math.abs(now[k] - want[k]) <= 6, `slope ${slope} at ${x},${y} coverage ${c}: ${now} vs ${want}`);
    }
    assert.ok(soft > 20, "the test line has soft pixels");
  }
});

test("fill on paint: never grows into bare paper, soft edges stay soft, corner neighbours stay", () => {
  const blue = hexToRgb("#2F6BDB"), red = hexToRgb("#E23B2E");
  const w = 10, h = 10;
  const d = buffer(w, h);
  for (let y = 3; y <= 6; y++) for (let x = 3; x <= 6; x++) put(d, w, x, y, blue);
  for (let x = 3; x <= 6; x++) put(d, w, x, 2, blue, 128); // a soft top edge of the same paint
  put(d, w, 7, 7, blue); // another blob of the same colour, touching by a corner only
  floodFill(d, w, h, 4, 4, red);
  assert.deepEqual(get(d, w, 4, 4), [...red, 255]);
  assert.deepEqual(get(d, w, 4, 2), [...red, 128], "soft edge: new colour, same alpha");
  assert.equal(get(d, w, 2, 4)[3], 0, "paper to the left stays paper");
  assert.equal(get(d, w, 4, 7)[3], 0, "paper below stays paper");
  assert.deepEqual(get(d, w, 7, 7), [...blue, 255], "a corner neighbour of the same colour is another area");
});

test("fill: a start point that is not a number, or outside the canvas, changes nothing (CODE-L15)", () => {
  const d = buffer(4, 4);
  assert.equal(floodFill(d, 4, 4, NaN, 1, [1, 2, 3]), null);
  assert.equal(floodFill(d, 4, 4, 1, NaN, [1, 2, 3]), null);
  assert.equal(floodFill(d, 4, 4, -1, 1, [1, 2, 3]), null);
  assert.equal(floodFill(d, 4, 4, 4, 1, [1, 2, 3]), null);
  assert.equal(floodFill(d, 4, 4, Infinity, 1, [1, 2, 3]), null);
  assert.ok(d.every((v) => v === 0));
  assert.deepEqual(floodFill(d, 4, 4, 3.9, 3.9, [1, 2, 3]), { x: 0, y: 0, w: 4, h: 4 });
});

test("undo: a step is only worth keeping when the pixels changed (T-11)", () => {
  const a = new Uint8ClampedArray([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  assert.equal(sameBytes(a, new Uint8ClampedArray(a)), true);
  const b = new Uint8ClampedArray(a); b[11] = 13;
  assert.equal(sameBytes(a, b), false);
  const c = new Uint8ClampedArray(a); c[0] = 0;
  assert.equal(sameBytes(a, c), false);
  assert.equal(sameBytes(a, a.subarray(0, 8)), false, "different lengths differ");
  assert.equal(sameBytes(new Uint8ClampedArray(0), new Uint8ClampedArray(0)), true);
  // an offset view (as a cropped ImageData can be) still compares correctly
  const big = new Uint8ClampedArray(16); big.set(a, 3);
  assert.equal(sameBytes(a, big.subarray(3, 15)), true);
});
