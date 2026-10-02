// node --test "tests/*.test.mjs"   (WS5 of the 2026-10 fix round: exports, print, app shell)
import { test } from "node:test";
import assert from "node:assert/strict";
import { deflateSync } from "node:zlib";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { PaletteBuilder, GifWriter, lzwEncode } from "../site/js/gif/encoder.js";
import { withPngDensity, pngChunkTypes, PX_PER_METRE_300DPI } from "../site/js/print/png-density.js";
import { safeFileName } from "../site/js/lib/util.js";
import { scanMp4, recordingFault } from "../site/js/export/video-check.js";
import { planVideo } from "../site/js/export/video-export.js";
import { decodeGif } from "./helpers/gif-decode.mjs";

const site = join(dirname(fileURLToPath(import.meta.url)), "..", "site");
const read = (rel) => readFileSync(join(site, rel), "utf8");

// ---------- app shell: one policy in three places, fonts, absolute share image (R49, R50, R51) ----------

const metaCsp = (html) => html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/)?.[1];

test("CSP: index.html, 404.html and _headers carry the same policy", () => {
  const header = read("_headers").match(/^\s*Content-Security-Policy:\s*(.+?)\s*$/m)?.[1];
  assert.ok(header, "_headers has a Content-Security-Policy line");
  assert.ok(header.endsWith("; frame-ancestors 'none'"), "the header ends with frame-ancestors");
  const withoutFraming = header.replace(/; frame-ancestors 'none'$/, "");
  const index = metaCsp(read("index.html"));
  const notFound = metaCsp(read("404.html"));
  assert.equal(index, withoutFraming, "index.html <meta> equals the header minus frame-ancestors");
  assert.equal(notFound, withoutFraming, "404.html <meta> equals the header minus frame-ancestors");
  assert.equal(index.includes("frame-ancestors"), false, "a <meta> policy cannot carry frame-ancestors");
  assert.equal(/unsafe-eval/.test(header), false);
  assert.match(header, /script-src 'self' 'sha256-[A-Za-z0-9+/=]+';/, "scripts: own files plus one hash, no unsafe-inline");
  for (const part of ["img-src 'self' blob: data:", "media-src 'self' blob: data:", "https://fonts.googleapis.com", "font-src https://fonts.gstatic.com", "worker-src 'self'"]) {
    assert.ok(header.includes(part), `policy allows ${part}`);
  }
  assert.match(read("_headers"), /^\s*X-Frame-Options:\s*DENY\s*$/m);
});

test("CSP: the hash in the policy is the hash of the inline script in 404.html", () => {
  const html = read("404.html");
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  assert.equal(scripts.length, 1, "exactly one inline script");
  assert.equal(/[\r\n]/.test(scripts[0]), false, "one line: a line break would hash differently on Windows and Linux");
  const hash = `'sha256-${createHash("sha256").update(scripts[0], "utf8").digest("base64")}'`;
  for (const file of ["404.html", "index.html", "_headers"]) assert.ok(read(file).includes(hash), `${file} lists ${hash}`);
  assert.equal(/<script(?![^>]*\bsrc=)[^>]*>/.test(read("index.html")), false, "index.html has no inline script");
  assert.ok(html.includes("data-fliploop-404"), "the marker the service worker looks for");
  assert.equal(/(?:href|src)="(?!\.\/"|assets\/favicon\.svg")[^"]*"/.test(html.replace(/<meta[^>]*>/g, "")), false, "404.html depends on no other file path");
});

test("index.html: fonts are preloaded, not render-blocking; share image and canonical are absolute", () => {
  const html = read("index.html");
  const font = /https:\/\/fonts\.googleapis\.com\/css2[^"]+/;
  const preload = html.match(new RegExp(`<link rel="preload" as="style" href="(${font.source})" crossorigin>`))?.[1];
  assert.ok(preload, "the Google Fonts CSS is a preload");
  const blocking = html.replace(/<noscript>[\s\S]*?<\/noscript>/g, "").match(new RegExp(`<link rel="stylesheet" href="${font.source}"`));
  assert.equal(blocking, null, "no parser-inserted stylesheet link to the fonts host outside <noscript>");
  const noscript = html.match(new RegExp(`<noscript><link rel="stylesheet" href="(${font.source})" crossorigin></noscript>`))?.[1];
  assert.equal(noscript, preload, "the no-JS fallback loads the same URL");
  assert.match(html, /<script type="module" src="js\/fonts\.js\?v=\d+"><\/script>/);
  // tools/build-sw-manifest.mjs takes the first fonts href it finds: it must be the preload.
  assert.equal(html.match(/<link[^>]+href="(https:\/\/fonts\.googleapis\.com\/css2[^"]+)"/)[1], preload);
  assert.match(html, /<meta property="og:image" content="https:\/\/fliploop-app\.netlify\.app\/assets\/og-image\.png">/);
  assert.match(html, /<link rel="canonical" href="https:\/\/fliploop-app\.netlify\.app\/">/);
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (/^https:\/\//.test(m[1])) continue;
    assert.equal(m[1].startsWith("/"), false, `${m[1]} is relative, so the app also runs under a subpath`);
  }
});

// ---------- GIF (EX-04 = CODE-C15) ----------

test("GIF: exactly 256 colours and no white still gives a valid 256-entry file", () => {
  const w = 32, h = 16; // 512 pixels, every one of 256 colours twice, none of them white
  const px = new Uint8ClampedArray(w * h * 4);
  for (let p = 0; p < w * h; p++) {
    const c = p % 256;
    px.set([c, (c * 7) & 255, (c * 13 + 5) & 255, 255], p * 4);
  }
  const colours = new Set();
  for (let p = 0; p < w * h; p++) colours.add((px[p * 4] << 16) | (px[p * 4 + 1] << 8) | px[p * 4 + 2]);
  assert.equal(colours.size, 256);
  assert.equal(colours.has(0xffffff), false);

  const pb = new PaletteBuilder();
  pb.addPixels(px);
  const pal = pb.build();
  assert.ok(pal.rgb.length <= 256, `palette has ${pal.rgb.length} entries`);
  assert.ok(pal.bits <= 8, `table size field needs ${pal.bits} bits`);
  assert.deepEqual(pal.rgb[0], [255, 255, 255]);
  const indices = pal.indexPixels(px);
  assert.ok(indices.every((i) => i < pal.rgb.length));

  const gw = new GifWriter(w, h, pal);
  gw.addFrame(indices, 8);
  const bytes = gw.finish();
  assert.equal(bytes[10], 0xf7, "header declares a 256-entry global table");
  const dec = decodeGif(bytes);
  assert.equal(dec.paletteSize, 256);
  assert.equal(dec.frames.length, 1);
  let worst = 0;
  for (let p = 0; p < w * h; p++) for (let k = 0; k < 3; k++) worst = Math.max(worst, Math.abs(dec.frames[0].rgb[p * 3 + k] - px[p * 4 + k]));
  assert.ok(worst <= 40, `largest channel error ${worst}`);
});

test("GIF: 255 colours plus white, and 256 colours with white, stay exact", () => {
  for (const withWhite of [false, true]) {
    const count = withWhite ? 256 : 255;
    const px = new Uint8ClampedArray(count * 4);
    for (let c = 0; c < count; c++) px.set(c === 0 && withWhite ? [255, 255, 255, 255] : [c, 3, 200, 255], c * 4);
    const pb = new PaletteBuilder();
    pb.addPixels(px);
    const pal = pb.build();
    assert.equal(pal.exact, true);
    assert.equal(pal.rgb.length, 256);
  }
});

// Strict GIF LZW reader: every code, the end code included, must be readable at the width a
// decoder is at when it reaches it. Returns the decoded indices.
function lzwDecodeStrict(sub, minCode) {
  const data = [];
  for (let p = 0; sub[p]; p += sub[p] + 1) for (let i = 1; i <= sub[p]; i++) data.push(sub[p + i]);
  const clear = 1 << minCode, eoi = clear + 1;
  let size = minCode + 1, next = eoi + 1, bit = 0, prev = null;
  const dict = new Map();
  const entry = (code) => (code < clear ? [code] : dict.get(code));
  const out = [];
  for (;;) {
    if (bit + size > data.length * 8) throw new Error(`code at bit ${bit} needs ${size} bits, only ${data.length * 8 - bit} left`);
    let code = 0;
    for (let i = 0; i < size; i++, bit++) if (data[bit >> 3] & (1 << (bit & 7))) code |= 1 << i;
    if (code === clear) { dict.clear(); size = minCode + 1; next = eoi + 1; prev = null; continue; }
    if (code === eoi) return out;
    let cur = entry(code);
    if (!cur) {
      if (code !== next || !prev) throw new Error(`bad code ${code}`);
      cur = prev.concat(prev[0]);
    }
    out.push(...cur);
    if (prev && next < 4096) dict.set(next++, prev.concat(cur[0]));
    if (next === 1 << size && size < 12) size++;
    prev = cur;
  }
}

test("LZW: the end code is written at the width the decoder reads it at", () => {
  let seed = 12345;
  const rand = (n) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
  let streams = 0;
  for (const minCode of [2, 3, 4, 8]) {
    for (let run = 0; run < 1500; run++) {
      const n = 1 + rand(700);
      const spread = 1 + rand(1 << minCode);
      const indices = Uint8Array.from({ length: n }, () => rand(spread));
      const decoded = lzwDecodeStrict(lzwEncode(indices, minCode), minCode);
      assert.deepEqual(decoded, [...indices], `minCode ${minCode}, ${n} pixels, ${spread} colours`);
      streams++;
    }
  }
  assert.equal(streams, 6000);
});

// ---------- print PNG resolution (EX-07) ----------

function pngChunk(type, data) {
  const table = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  let c = 0xffffffff;
  for (const b of body) c = table[(c ^ b) & 255] ^ (c >>> 8);
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE((c ^ 0xffffffff) >>> 0);
  return { bytes: Buffer.concat([len, body, crc]), crc: (c ^ 0xffffffff) >>> 0 };
}

function tinyPng() {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(2, 0); ihdr.writeUInt32BE(2, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((2 * 4 + 1) * 2, 255);
  raw[0] = 0; raw[9] = 0;
  return new Uint8Array(Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr).bytes, pngChunk("IDAT", deflateSync(raw)).bytes, pngChunk("IEND", Buffer.alloc(0)).bytes,
  ]));
}

test("print PNG: a pHYs chunk with 300 dpi sits between IHDR and IDAT", () => {
  const png = tinyPng();
  assert.deepEqual(pngChunkTypes(png), ["IHDR", "IDAT", "IEND"]);
  const out = withPngDensity(png);
  assert.deepEqual(pngChunkTypes(out), ["IHDR", "pHYs", "IDAT", "IEND"]);
  assert.equal(out.length, png.length + 21);
  const at = 8 + 25; // right after IHDR
  const view = new DataView(out.buffer, out.byteOffset);
  assert.equal(view.getUint32(at), 9);
  assert.equal(view.getUint32(at + 8), 11811);
  assert.equal(view.getUint32(at + 12), 11811);
  assert.equal(out[at + 16], 1, "unit is the metre");
  assert.equal(PX_PER_METRE_300DPI, Math.round(300 / 0.0254));
  assert.equal(view.getUint32(at + 17), pngChunk("pHYs", Buffer.from(out.subarray(at + 8, at + 17))).crc, "CRC of the new chunk");
  assert.deepEqual([...out.subarray(0, at)], [...png.subarray(0, at)], "IHDR untouched");
  assert.deepEqual([...out.subarray(at + 21)], [...png.subarray(at)], "IDAT and IEND untouched");
  assert.equal(withPngDensity(out), out, "already has pHYs: unchanged");
  const notPng = new Uint8Array([1, 2, 3]);
  assert.equal(withPngDensity(notPng), notPng);
});

// ---------- file names (EX-08, R48) ----------

test("file names: what the app reports is what a browser saves", () => {
  const cases = [
    ["שלום עולם, אנימציה ראשונה!", "שלום עולם, אנימציה ראשונה!"],
    ['a/b\\c:d*e?f"g<h>i|j', "a b c d e f g h i j"],
    ["א".repeat(40), "א".repeat(40)],
    ["...", "FlipLoop"],
    [".hidden", "hidden"],
    ["CON", "_CON"],
    ["con.txt", "_con.txt"],
    ["LPT1", "_LPT1"],
    ["CONSOLE", "CONSOLE"],
    ["סוף.", "סוף"],
    ["😀🎬 סרט", "😀🎬 סרט"],
    ["/////", "FlipLoop"],
    ["   ", "FlipLoop"],
    ["a‮gpj.exe", "agpj.exe"],
    ["⁧שם⁩ ‏טוב", "שם טוב"],
    ["  . רווחים .  ", "רווחים"],
    ["", "FlipLoop"],
    [null, "FlipLoop"],
  ];
  for (const [title, expected] of cases) assert.equal(safeFileName(title), expected, JSON.stringify(title));
  // 60 characters as the user counts them: an emoji at the cut is kept whole or dropped, never split.
  const long = safeFileName("x".repeat(59) + "😀😀");
  assert.equal([...long].length, 60);
  assert.equal(long.endsWith("😀"), true);
  // A cut that lands on a space or a dot does not leave it at the end.
  assert.equal(safeFileName("a".repeat(59) + " bcd"), "a".repeat(59));
  assert.equal(safeFileName("a".repeat(59) + ".bcd"), "a".repeat(59));
});

// ---------- video (EX-01, EX-02, EX-03, R46) ----------

function box(type, ...parts) {
  const body = Buffer.concat(parts.map((p) => (Buffer.isBuffer(p) ? p : Buffer.from(p))));
  const head = Buffer.alloc(8);
  head.writeUInt32BE(body.length + 8, 0);
  head.write(type, 4, "ascii");
  return Buffer.concat([head, body]);
}
const u32 = (...values) => { const b = Buffer.alloc(4 * values.length); values.forEach((v, i) => b.writeUInt32BE(v, i * 4)); return b; };

test("video check: counts samples and reads the duration of plain and fragmented MP4", () => {
  const mvhd = (timescale, duration) => box("mvhd", u32(0, 0, 0, timescale, duration), Buffer.alloc(80));
  const stbl = (count) => box("stbl", box("stsz", u32(0, 0, count)));
  const trak = (count) => box("trak", box("mdia", box("minf", stbl(count))));
  const moof = (count) => box("moof", box("mfhd", u32(0, 1)), box("traf", box("tfhd", u32(0, 1)), box("trun", u32(0, count))));

  const plain = Buffer.concat([box("ftyp", "isom"), box("mdat", Buffer.alloc(40)), box("moov", mvhd(1000, 3032), trak(37))]);
  assert.deepEqual(scanMp4(new Uint8Array(plain)), { samples: 37, durationMs: 3032 });

  const fragmented = Buffer.concat([box("ftyp", "isom"), box("moov", mvhd(30000, 0), trak(0)), moof(9), box("mdat", Buffer.alloc(8)), moof(4), box("mdat", Buffer.alloc(8))]);
  assert.deepEqual(scanMp4(new Uint8Array(fragmented)), { samples: 13, durationMs: null });

  const mvhd1 = box("mvhd", Buffer.from([1, 0, 0, 0]), Buffer.alloc(16), u32(600, 0, 6000), Buffer.alloc(80)); // version 1: 64-bit times
  assert.deepEqual(scanMp4(new Uint8Array(Buffer.concat([box("moov", mvhd1, trak(120))]))), { samples: 120, durationMs: 10000 });

  assert.equal(scanMp4(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9])), null, "not an MP4");
  assert.equal(scanMp4(new Uint8Array(0)), null);
  // A file cut off in the middle of a box is read up to the cut, without throwing.
  assert.deepEqual(scanMp4(new Uint8Array(plain.subarray(0, plain.length - 10))), null);
});

test("video plan: one sample per animation tick, holds repeat, whole cycles to 3 s", () => {
  const frames = (holds) => holds.map((hold) => ({ hold }));
  const a = planVideo(frames(Array(12).fill(1)), 12, "loop");
  assert.equal(a.cycles, 3);
  assert.equal(a.samples, 36);
  assert.ok(Math.abs(a.tickMs - 1000 / 12) < 1e-9);
  assert.equal(a.totalMs, 3000);
  const b = planVideo(frames([1, 3, 1, 1, 12, 1]), 12, "pingpong");
  assert.deepEqual(b.ticks, [0, 1, 1, 1, 2, 3, ...Array(12).fill(4), 5, ...Array(12).fill(4), 3, 2, 1, 1, 1]);
  assert.equal(b.cycleMs, 3000);
  assert.equal(b.samples, 36);
  // A cycle of exactly 0.5 s needs 6 cycles, not 7 (six times 83.33 ms sums to 499.99999999999994).
  const half = planVideo(frames(Array(6).fill(1)), 12, "loop");
  assert.deepEqual([half.cycleMs, half.cycles, half.samples, half.totalMs], [500, 6, 36, 3000]);
  for (const fps of [6, 12, 24]) for (let n = 1; n <= 120; n++) {
    const p = planVideo(frames(Array(n).fill(1)), fps, "loop");
    assert.equal(p.cycles, Math.max(1, Math.ceil((3 * fps) / n)), `${n} frames at ${fps} fps`);
  }
  const c = planVideo(frames(Array(120).fill(12)), 6, "loop");
  assert.equal(c.samples, 1440);
  assert.equal(Math.round(c.totalMs / 1000), 240);
});

test("video check: short, frozen and whole recordings are told apart", () => {
  const plan = planVideo(Array(12).fill({ hold: 1 }), 12, "loop"); // 36 samples, 3000 ms
  assert.equal(recordingFault({ plan, info: { samples: 37, durationMs: 3032 }, durationMs: 3032, exact: true }), null);
  assert.equal(recordingFault({ plan, info: { samples: 36, durationMs: 2990 }, durationMs: 2990, exact: true }), null);
  assert.equal(recordingFault({ plan, info: { samples: 11, durationMs: 410 }, durationMs: 410, exact: true }), "short", "cut to 0.4 s");
  assert.equal(recordingFault({ plan, info: { samples: 28, durationMs: 3030 }, durationMs: 3030, exact: true }), "short", "full length, frames dropped");
  assert.equal(recordingFault({ plan, info: { samples: 70, durationMs: 3030 }, durationMs: 3030, exact: false }), null, "browser-sampled capture: only the length is known");
  assert.equal(recordingFault({ plan, info: null, durationMs: 1200, exact: false }), "short", "WebM read through a <video>");
  assert.equal(recordingFault({ plan, info: null, durationMs: null, exact: true }), null, "nothing could be measured: not called short");
});
