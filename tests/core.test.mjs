// node --test tests/   (pure, DOM-free modules)
import { test } from "node:test";
import assert from "node:assert/strict";
import { inflateSync, deflateSync } from "node:zlib";

import { playSequence, gifDelaysCs, cycleDurationMs, cyclesForMinimum } from "../site/js/core/timing.js";
import { weekInfo } from "../site/js/core/challenge.js";
import { UndoLedger, budgetFor, BUDGET_LOW_MEMORY } from "../site/js/core/undo-ledger.js";
import { floodFill, countChangedPixels } from "../site/js/core/fill.js";
import { PaletteBuilder, GifWriter, lzwEncode } from "../site/js/gif/encoder.js";
import { buildPdf, pdfTextString } from "../site/js/pdf/writer.js";
import { PAPERS, cardList, sheetCount, cardSlot, pagePixels, imageRect, GRID } from "../site/js/print/geometry.js";
import { THEMES } from "../site/js/data/themes.js";
import { STRINGS } from "../site/js/data/strings.js";
import { LESSON_COPY } from "../site/js/data/lesson-copy.js";
import { decodeGif } from "./helpers/gif-decode.mjs";

test("ping-pong plays 1..N..2 without repeating end frames", () => {
  assert.deepEqual(playSequence(4, "loop"), [0, 1, 2, 3]);
  assert.deepEqual(playSequence(4, "pingpong"), [0, 1, 2, 3, 2, 1]);
  assert.deepEqual(playSequence(2, "pingpong"), [0, 1]);
});

test("GIF delays carry the centisecond remainder (24 fps: 4, 4, 5)", () => {
  const d = gifDelaysCs(Array(6).fill(1), 24);
  assert.deepEqual(d.slice(0, 3), [4, 4, 5]);
  assert.equal(d.reduce((a, b) => a + b), 25);
  const d120 = gifDelaysCs(Array(120).fill(1), 24);
  assert.equal(d120.reduce((a, b) => a + b), 500); // 120 frames / 24 fps = 5 s exactly
  assert.deepEqual(gifDelaysCs([1, 3, 1], 12), [8, 25, 9]); // hold x3 at 12 fps = 250 ms
  assert.deepEqual(gifDelaysCs([1, 1], 6), [17, 16]);
});

test("cycle length and minimum video cycles", () => {
  assert.equal(cycleDurationMs([1, 1, 1, 1, 1, 1], 6), 1000);
  assert.equal(cyclesForMinimum(1000, 3000), 3);
  assert.equal(cyclesForMinimum(20000, 3000), 1);
  assert.equal(cyclesForMinimum(1250, 3000), 3);
});

test("challenge week math matches the plan's worked check", () => {
  const w = weekInfo(new Date(2026, 8, 28)); // 2026-09-28
  assert.equal(w.days, 267);
  assert.equal(w.weekIndex, 38);
  assert.equal(w.weekLabel, 39);
  assert.equal(w.daysLeft, 6);
  assert.equal(THEMES[w.themeIndex], "חללית ממריאה");
  assert.equal(weekInfo(new Date(2026, 0, 4)).daysLeft, 7); // Sunday
  assert.equal(weekInfo(new Date(2026, 0, 10)).daysLeft, 1); // Saturday: last day
  const before = weekInfo(new Date(2025, 11, 30));
  assert.equal(before.hasWeekNumber, false);
  assert.ok(before.themeIndex >= 0 && before.themeIndex < 52);
  // Daylight saving change weeks (Israel: late March, late October) never shift the index.
  assert.equal(weekInfo(new Date(2026, 2, 29, 1)).days - weekInfo(new Date(2026, 2, 28, 23)).days, 1);
});

test("undo ledger keeps 50 per frame and evicts non-current frames first", () => {
  let evictions = 0;
  const L = new UndoLedger({ budgetBytes: 1000, onEvict: () => evictions++ });
  L.setCurrent("a");
  for (let i = 0; i < 60; i++) L.push("a", { bytes: 1 });
  assert.equal(L.stepsFor("a").undo, 50);
  assert.equal(L.totalBytes, 50);
  for (let i = 0; i < 10; i++) L.push("b", { bytes: 90 });
  L.setCurrent("b");
  // Over budget: b is current, so a's oldest steps go.
  L.push("b", { bytes: 100 });
  assert.equal(L.stepsFor("b").undo, 11);
  assert.ok(L.totalBytes <= 1000 || L.stepsFor("a").undo === 0);
  assert.equal(evictions, 1, "W5 raised once");
  assert.ok(L.stepsFor("a").undo < 50);
  // The current frame is never evicted, even alone over budget.
  const M = new UndoLedger({ budgetBytes: 10 });
  M.setCurrent("x");
  for (let i = 0; i < 50; i++) M.push("x", { bytes: 5 });
  assert.equal(M.stepsFor("x").undo, 50);
  assert.equal(budgetFor(2), BUDGET_LOW_MEMORY);
});

test("undo/redo round trip and redo cleared by a new step", () => {
  const L = new UndoLedger();
  L.setCurrent("f");
  const a = { bytes: 10 }, b = { bytes: 20 };
  L.push("f", a); L.push("f", b);
  assert.equal(L.undo("f"), b);
  assert.equal(L.redo("f"), b);
  L.undo("f");
  L.push("f", { bytes: 5 });
  assert.equal(L.canRedo("f"), false);
  assert.equal(L.totalBytes, 15);
});

test("flood fill is contiguous, respects tolerance, and tucks under edges", () => {
  const w = 10, h = 10;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) { const i = (y * w + 5) * 4; data[i + 3] = 255; } // wall at x=5
  const rect = floodFill(data, w, h, 1, 1, [255, 0, 0]);
  assert.ok(rect);
  assert.equal(data[(0 * w + 0) * 4], 255); // filled left
  assert.equal(data[(0 * w + 9) * 4 + 3], 0); // right side untouched
  assert.equal(data[(3 * w + 5) * 4], 0); // wall pixel is opaque black: stays black on top
  assert.equal(floodFill(data, w, h, 1, 1, [255, 0, 0]), null); // same colour: no-op
});

test("changed pixel count ignores identical frames", () => {
  const a = new Uint8ClampedArray(400), b = new Uint8ClampedArray(400);
  assert.equal(countChangedPixels(a, b), 0);
  for (let i = 3; i < 400; i += 4) b[i] = 255;
  assert.equal(countChangedPixels(a, b), 100);
});

function makeFrame(w, h, fn) {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [r, g, b] = fn(x, y);
    const i = (y * w + x) * 4;
    px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255;
  }
  return px;
}

test("GIF: exact palette round-trips pixel-perfect with loop and delays", () => {
  const w = 48, h = 36;
  const frames = [0, 1, 2].map((k) => makeFrame(w, h, (x, y) => (x > 10 + k * 8 && x < 20 + k * 8 && y > 10 ? [31, 30, 27] : [255, 255, 255])));
  const pb = new PaletteBuilder();
  frames.forEach((f) => pb.addPixels(f));
  const pal = pb.build();
  assert.equal(pal.exact, true);
  const delays = gifDelaysCs([1, 1, 1], 24);
  const gw = new GifWriter(w, h, pal);
  frames.forEach((f, i) => gw.addFrame(pal.indexPixels(f), delays[i]));
  const bytes = gw.finish();
  const dec = decodeGif(bytes);
  assert.equal(dec.frames.length, 3);
  assert.equal(dec.loop, 0);
  assert.deepEqual(dec.frames.map((f) => f.delay), [4, 4, 5]);
  for (let k = 0; k < 3; k++) {
    for (let p = 0; p < w * h; p++) {
      assert.equal(dec.frames[k].rgb[p * 3], frames[k][p * 4]);
    }
  }
});

test("GIF: median cut for many colours, large frame exercises LZW table resets", () => {
  const w = 480, h = 360;
  const frames = [0, 1].map((k) => makeFrame(w, h, (x, y) => [(x * 7 + k * 40) & 255, (y * 5) & 255, ((x ^ y) * 3) & 255]));
  const pb = new PaletteBuilder();
  frames.forEach((f) => pb.addPixels(f));
  const pal = pb.build();
  assert.equal(pal.exact, false);
  assert.ok(pal.rgb.length <= 256);
  assert.deepEqual(pal.rgb[0], [255, 255, 255]);
  const gw = new GifWriter(w, h, pal);
  frames.forEach((f) => gw.addFrame(pal.indexPixels(f), 8));
  const dec = decodeGif(gw.finish());
  assert.equal(dec.frames.length, 2);
  let err = 0;
  for (let p = 0; p < w * h; p += 97) err += Math.abs(dec.frames[0].rgb[p * 3] - frames[0][p * 4]);
  assert.ok(err / Math.ceil((w * h) / 97) < 24, "mean error small");
});

test("LZW handles a single pixel and a flat image", () => {
  const one = lzwEncode(new Uint8Array([0]), 2);
  assert.ok(one.length > 2);
  const flat = lzwEncode(new Uint8Array(100000), 2);
  assert.ok(flat.length < 2000);
});

function parsePdf(bytes) {
  const s = Buffer.from(bytes).toString("latin1");
  assert.ok(s.startsWith("%PDF-1.4"));
  assert.ok(s.trimEnd().endsWith("%%EOF"));
  const sx = Number(s.match(/startxref\n(\d+)\n%%EOF/)[1]);
  assert.equal(s.slice(sx, sx + 4), "xref");
  const [, first, count] = s.slice(sx).match(/xref\n(\d+) (\d+)\n/);
  const lines = s.slice(sx).split("\n").slice(2, 2 + Number(count));
  lines.slice(1).forEach((line, i) => {
    const off = Number(line.slice(0, 10));
    const num = Number(first) + i + 1;
    assert.equal(s.slice(off, off + `${num} 0 obj`.length), `${num} 0 obj`, `xref offset for obj ${num}`);
  });
  const pagesCount = Number(s.match(/\/Type \/Pages \/Kids \[[^\]]*\] \/Count (\d+)/)[1]);
  const boxes = [...s.matchAll(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/g)].map((m) => [Number(m[1]), Number(m[2])]);
  return { pagesCount, boxes, s };
}

test("PDF: byte-exact xref, page count, A4 and Letter media boxes, Flate image decodes", () => {
  const w = 62, h = 88;
  const rgb = new Uint8Array(w * h * 3).fill(255);
  const data = new Uint8Array(deflateSync(rgb));
  const img = { width: w, height: h, filter: "FlateDecode", data };
  const bytes = buildPdf({
    title: "שיעור 1: מתיחה וכיווץ · FlipLoop",
    pages: [
      { widthPt: PAPERS.A4.wPt, heightPt: PAPERS.A4.hPt, image: img },
      { widthPt: PAPERS.A4.wPt, heightPt: PAPERS.A4.hPt, image: img },
      { widthPt: PAPERS.Letter.wPt, heightPt: PAPERS.Letter.hPt, image: img },
    ],
  });
  const { pagesCount, boxes, s } = parsePdf(bytes);
  assert.equal(pagesCount, 3);
  assert.deepEqual(boxes[0], [595.28, 841.89]);
  assert.deepEqual(boxes[2], [612, 792]);
  const streamStart = s.indexOf("stream\n", s.indexOf("/Subtype /Image")) + 7;
  const inflated = inflateSync(Buffer.from(bytes.slice(streamStart, streamStart + data.length)));
  assert.equal(inflated.length, w * h * 3);
  assert.equal(pdfTextString("A"), "<FEFF0041>");
});

test("print geometry: 200 x 240 grid, holds expand, 120 frames = 15 sheets", () => {
  assert.equal(GRID.wMm, 200);
  assert.equal(GRID.hMm, 240);
  assert.equal(cardSlot(0, PAPERS.A4).xMm, 5);
  assert.equal(cardSlot(1, PAPERS.A4).xMm, 105);
  assert.equal(cardSlot(7, PAPERS.A4).yMm, 190);
  assert.ok(Math.abs(cardSlot(0, PAPERS.Letter).xMm - 7.95) < 1e-9);
  assert.deepEqual(pagePixels(PAPERS.A4, 300), { w: 2480, h: 3508 });
  const cards = cardList([1, 3, 1]);
  assert.deepEqual(cards.map((c) => c.frameIndex), [0, 1, 1, 1, 2]);
  assert.deepEqual(cards.map((c) => c.number), [1, 2, 3, 4, 5]);
  assert.equal(cardList([1, 1, 1, 1], { pingpongReturn: true }).length, 6);
  assert.equal(sheetCount(cardList(Array(120).fill(1)).length), 15);
  assert.deepEqual(imageRect(false), { xMm: 24, yMm: 3, wMm: 72, hMm: 54 });
  assert.equal(imageRect(true).xMm, 33);
});

test("copy: no em or en dashes, 52 themes within 16 chars", () => {
  const all = [...Object.values(STRINGS), ...Object.values(LESSON_COPY), ...THEMES].join("\n");
  assert.equal(/[–—]/.test(all), false);
  assert.equal(THEMES.length, 52);
  assert.ok(THEMES.every((t) => t.length <= 16));
});

import { LESSONS, keyCount, blankCount, lessonText, exampleFrames } from "../site/js/data/lessons.js";

test("lessons match the plan table and the copy's derived counts", () => {
  assert.equal(LESSONS.length, 12);
  const frames = [8, 10, 6, 12, 8, 9, 9, 8, 8, 8, 8, 6];
  const keys = [2, 3, 2, 3, 0, 2, 2, 0, 6, 6, 2, 2];
  const blanks = [6, 7, 4, 9, 8, 7, 7, 8, 2, 2, 6, 4];
  const fps = [12, 12, 6, 12, 12, 12, 12, 12, 12, 12, 12, 12];
  LESSONS.forEach((l, i) => {
    assert.equal(l.frames.length, frames[i], `lesson ${i + 1} frames`);
    assert.equal(keyCount(l), keys[i], `lesson ${i + 1} keys`);
    assert.equal(blankCount(l), blanks[i], `lesson ${i + 1} blanks`);
    assert.equal(l.fps, fps[i]);
    const text = lessonText(l.n);
    const guideFrames = l.frames.map((f, j) => (f.guides.length ? j + 1 : 0)).filter(Boolean);
    assert.deepEqual(Object.keys(text.hints).map(Number), guideFrames, `lesson ${i + 1} hints on guide frames`);
    assert.ok(text.title && text.explanation && text.goal && text.done && text.steps.length >= 4);
    l.frames.forEach((f) => { if (f.role === "blank") assert.ok(f.solution.length, "blank has a solution"); });
    assert.ok(exampleFrames(l).length >= l.frames.length);
  });
  // lesson 7: the top of the arc sits at frame 5
  const ys = LESSONS[6].frames.map((f) => Math.min(...[...f.strokes, ...f.solution][0].p.map((q) => q[1])));
  assert.equal(ys.indexOf(Math.min(...ys)), 4);
  // lesson 6: ticks tight at 2, 3, 7, 8 and widest around 5
  const xs = LESSONS[5].frames.map((f) => { const p = [...f.strokes, ...f.solution][0].p; return p.reduce((s, q) => s + q[0], 0) / p.length; });
  const gaps = xs.slice(1).map((x, j) => x - xs[j]);
  assert.ok(gaps[0] < gaps[3] && gaps[7] < gaps[4]);
});
