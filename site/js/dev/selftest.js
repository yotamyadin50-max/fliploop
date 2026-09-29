// Scripted self-test of the three exports, callable from page JS in any browser (used for
// the Chrome run and the Playwright WebKit run): window.__fliploop.selfTest(options).
// Loaded only when called, so it costs normal visitors nothing. Returns a JSON report;
// every check records what was measured, not just pass or fail.
import { encodeGif } from "../export/gif-export.js";
import { recordVideo, pickVideoType, canRecordVideo, planVideo } from "../export/video-export.js";
import { playSequence, gifDelaysCs } from "../core/timing.js";
import { renderSheet, canvasRgb, deflate, hasCompressionStream } from "../print/render.js";
import { cardList, sheetCount, PAPERS } from "../print/geometry.js";
import { buildPdf } from "../pdf/writer.js";
import { makeCanvas, ctx2d, canvasToBlob, downloadBlob } from "../lib/util.js";

const COLORS = ["#1F1E1B", "#E23B2E", "#2F6BDB", "#2E9E4F", "#F28C28", "#7A4BC9"];

/** Synthetic frames: a ball moving across, a different colour every few frames. */
export function syntheticFrames({ count = 12, width = 480, height = 360, holds = {} } = {}) {
  return Array.from({ length: count }, (_, i) => {
    const canvas = makeCanvas(width, height);
    const g = ctx2d(canvas);
    g.lineWidth = 5;
    g.lineCap = "round";
    g.strokeStyle = COLORS[i % COLORS.length];
    g.beginPath();
    g.arc(40 + ((width - 80) * i) / Math.max(1, count - 1), height / 2, 30, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = "#1F1E1B";
    g.font = "bold 28px sans-serif";
    g.fillText(String(i + 1), 12, 36);
    return { canvas, hold: holds[i] || 1 };
  });
}

function currentFrames() {
  const ed = window.__fliploop?.router?.current?.screen;
  if (!ed?.doc) return null;
  return { frames: ed.doc.frames.map((f) => ({ canvas: f.canvas, hold: f.hold })), fps: ed.doc.project.fps, playMode: ed.doc.project.playMode, title: ed.doc.project.title };
}

// ---------- GIF ----------
/** Walks the GIF block structure (no pixel decode): header, loop, frame count, delays. */
export function scanGif(bytes) {
  let p = 0;
  const ascii = (n) => String.fromCharCode(...bytes.subarray(p, (p += n)));
  const sig = ascii(6);
  const width = bytes[6] | (bytes[7] << 8), height = bytes[8] | (bytes[9] << 8);
  const flags = bytes[10];
  p = 13 + (flags & 0x80 ? 3 * (1 << ((flags & 7) + 1)) : 0);
  const delays = [];
  let loop = null, netscape = false, pending = null, trailer = false;
  const skipSubs = () => { let n; while ((n = bytes[p++])) p += n; };
  while (p < bytes.length) {
    const b = bytes[p++];
    if (b === 0x3b) { trailer = true; break; }
    if (b === 0x21) {
      const label = bytes[p++];
      if (label === 0xf9) { pending = bytes[p + 2] | (bytes[p + 3] << 8); p += 6; }
      else if (label === 0xff) {
        const len = bytes[p++];
        const id = ascii(len);
        if (id === "NETSCAPE2.0") { netscape = true; loop = bytes[p + 2] | (bytes[p + 3] << 8); }
        skipSubs();
      } else skipSubs();
      continue;
    }
    if (b !== 0x2c) throw new Error(`unexpected GIF block 0x${b.toString(16)} at ${p - 1}`);
    const iflags = bytes[p + 8];
    p += 9;
    if (iflags & 0x80) p += 3 * (1 << ((iflags & 7) + 1));
    p++; // LZW minimum code size
    skipSubs();
    delays.push(pending);
    pending = null;
  }
  return { sig, width, height, netscape, loop, frames: delays.length, delays, trailer };
}

async function decodeWithImageDecoder(blob) {
  if (typeof globalThis.ImageDecoder !== "function") return { available: false };
  try {
    if (!(await ImageDecoder.isTypeSupported("image/gif"))) return { available: false };
    const dec = new ImageDecoder({ data: blob.stream(), type: "image/gif" });
    await dec.tracks.ready;
    await dec.completed;
    const n = dec.tracks.selectedTrack.frameCount;
    const durationsCs = [];
    for (let i = 0; i < n; i++) {
      const { image } = await dec.decode({ frameIndex: i });
      durationsCs.push(Math.round((image.duration || 0) / 10000));
      image.close();
    }
    dec.close();
    return { available: true, frameCount: n, durationsCs };
  } catch (err) {
    return { available: true, error: String(err.message || err) };
  }
}

async function testGif({ frames, fps, playMode, half = false }) {
  const t0 = performance.now();
  const blob = await encodeGif({ frames, fps, playMode, half });
  const ms = Math.round(performance.now() - t0);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const scan = scanGif(bytes);
  const seq = playSequence(frames.length, playMode);
  const expected = gifDelaysCs(seq.map((i) => frames[i].hold), fps);
  const decoded = await decodeWithImageDecoder(blob);
  const w = Math.round(frames[0].canvas.width * (half ? 0.5 : 1));
  const h = Math.round(frames[0].canvas.height * (half ? 0.5 : 1));
  const ok = scan.sig === "GIF89a" && scan.netscape && scan.loop === 0 && scan.trailer && scan.width === w && scan.height === h
    && scan.frames === expected.length && scan.delays.every((d, i) => d === expected[i])
    && (!decoded.available || decoded.error || (decoded.frameCount === expected.length && decoded.durationsCs.every((d, i) => d === expected[i])));
  return {
    ok, ms, size: blob.size, fps, playMode, half, sourceFrames: frames.length,
    header: scan.sig, netscape: scan.netscape, loop: scan.loop, width: scan.width, height: scan.height,
    frames: scan.frames, expectedFrames: expected.length,
    delaysFirst12: scan.delays.slice(0, 12), expectedFirst12: expected.slice(0, 12),
    totalCs: scan.delays.reduce((a, b) => a + b, 0), expectedTotalCs: expected.reduce((a, b) => a + b, 0),
    imageDecoder: decoded, blob,
  };
}

// ---------- video ----------
async function videoMeta(blob) {
  const url = URL.createObjectURL(blob);
  const v = document.createElement("video");
  v.muted = true;
  v.preload = "auto";
  v.src = url;
  try {
    await new Promise((res, rej) => {
      v.onloadedmetadata = res;
      v.onerror = () => rej(new Error("video element error " + (v.error?.code ?? "")));
      setTimeout(() => rej(new Error("loadedmetadata timeout")), 15000);
    });
    let duration = v.duration;
    if (!Number.isFinite(duration)) {
      // MediaRecorder WebM has no duration header; seeking far forces the real length.
      await new Promise((res) => { v.ontimeupdate = () => { v.ontimeupdate = null; res(); }; v.currentTime = 1e7; setTimeout(res, 5000); });
      duration = v.duration;
    }
    return { loaded: true, duration: Number.isFinite(duration) ? Math.round(duration * 100) / 100 : null, videoWidth: v.videoWidth, videoHeight: v.videoHeight };
  } catch (err) {
    return { loaded: false, error: String(err.message || err) };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function testVideo({ frames, fps, playMode, cancelAfterMs = 0 }) {
  const type = pickVideoType();
  if (!canRecordVideo()) {
    return { ok: false, supported: false, mime: type, reason: typeof MediaRecorder === "undefined" ? "no MediaRecorder" : "no supported type or captureStream" };
  }
  const canvas = makeCanvas(frames[0].canvas.width, frames[0].canvas.height);
  canvas.style.cssText = "position:fixed;left:0;bottom:0;width:120px;height:auto;z-index:99;opacity:.9";
  document.body.append(canvas);
  const plan = planVideo(frames, fps, playMode);
  const ac = new AbortController();
  if (cancelAfterMs) setTimeout(() => ac.abort(), cancelAfterMs);
  const t0 = performance.now();
  try {
    const res = await recordVideo({ frames, fps, playMode, canvas, signal: ac.signal });
    const meta = await videoMeta(res.blob);
    const ok = res.blob.size > 0 && meta.loaded && meta.videoWidth === frames[0].canvas.width && (meta.duration === null || meta.duration >= 2.9);
    return { ok, supported: true, mime: res.type, blobType: res.blob.type, ext: res.ext, size: res.blob.size, plannedMs: plan.totalMs, cycles: plan.cycles, wallMs: Math.round(performance.now() - t0), ...meta, blob: res.blob };
  } catch (err) {
    return { ok: cancelAfterMs > 0 && err.name === "ExportCancelled", supported: true, mime: type, cancelled: err.name === "ExportCancelled", error: String(err.message || err), wallMs: Math.round(performance.now() - t0) };
  } finally {
    canvas.remove();
  }
}

// ---------- print: PDF and PNG ----------
function sheetsFor(frames, paperId, pingpong, title) {
  const cards = cardList(frames.map((f) => f.hold), { pingpongReturn: pingpong });
  const total = sheetCount(cards.length);
  return { cards, total, args: (sheet, dpi) => ({ frames, cards, sheet, sheetTotal: total, paperId, dpi, title }) };
}

/** Parses a PDF: header, EOF, every xref offset lands on "n 0 obj", pages, media boxes. */
export function inspectPdf(bytes) {
  const dec = new TextDecoder("latin1");
  const head = dec.decode(bytes.subarray(0, 8));
  const tail = dec.decode(bytes.subarray(bytes.length - 32));
  const sx = tail.lastIndexOf("startxref");
  const xrefStart = parseInt(tail.slice(sx + 9).trim(), 10);
  const xrefText = dec.decode(bytes.subarray(xrefStart, Math.min(bytes.length, xrefStart + 64 + 20 * 2000)));
  const lines = xrefText.split("\n");
  const [, count] = lines[1].split(" ").map(Number);
  let badOffsets = 0;
  for (let n = 1; n < count; n++) {
    const off = parseInt(lines[2 + n].slice(0, 10), 10);
    const at = dec.decode(bytes.subarray(off, off + String(n).length + 6));
    if (at !== `${n} 0 obj`) badOffsets++;
  }
  // Page objects and media boxes: scan only the non-stream text portions cheaply.
  const all = dec.decode(bytes);
  const countMatch = all.match(/\/Type \/Pages \/Kids \[[^\]]*\] \/Count (\d+)/);
  const boxes = [...all.matchAll(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/g)].map((m) => `${m[1]}x${m[2]}`);
  const filters = [...new Set([...all.matchAll(/\/Subtype \/Image [^>]*\/Filter \/(\w+)/g)].map((m) => m[1]))];
  return {
    header: head.slice(0, 5), eof: tail.trimEnd().endsWith("%%EOF"), xrefStart, xrefLeadsWithXref: lines[0] === "xref",
    objects: count - 1, badOffsets, pageCount: countMatch ? Number(countMatch[1]) : null, mediaBoxes: [...new Set(boxes)], filters,
  };
}

async function testPdf({ frames, paperId = "A4", pingpong = false, forceJpeg = false, title = "FlipLoop self-test" }) {
  const { total, args } = sheetsFor(frames, paperId, pingpong, title);
  const paper = PAPERS[paperId];
  const flate = hasCompressionStream() && !forceJpeg;
  const t0 = performance.now();
  const pages = [];
  for (let s = 0; s < total; s++) {
    const canvas = renderSheet(args(s, 300));
    let image;
    if (flate) image = { width: canvas.width, height: canvas.height, filter: "FlateDecode", data: await deflate(canvasRgb(canvas)) };
    else {
      const jpg = await canvasToBlob(canvas, "image/jpeg", 0.92);
      image = { width: canvas.width, height: canvas.height, filter: "DCTDecode", data: new Uint8Array(await jpg.arrayBuffer()) };
    }
    canvas.width = 0;
    pages.push({ widthPt: paper.wPt, heightPt: paper.hPt, image });
  }
  const bytes = buildPdf({ pages, title });
  const info = inspectPdf(bytes);
  const expectBox = paperId === "A4" ? "595.28x841.89" : "612x792";
  const ok = info.header === "%PDF-" && info.eof && info.xrefLeadsWithXref && info.badOffsets === 0 && info.pageCount === total
    && info.mediaBoxes.length === 1 && info.mediaBoxes[0] === expectBox;
  return { ok, paperId, expectedSheets: total, expectedMediaBox: expectBox, compressionStream: hasCompressionStream(), path: flate ? "FlateDecode" : "DCTDecode", size: bytes.length, ms: Math.round(performance.now() - t0), ...info, blob: new Blob([bytes], { type: "application/pdf" }) };
}

async function testPng({ frames, paperId = "A4", sheet = 0, title = "FlipLoop self-test" }) {
  const { args } = sheetsFor(frames, paperId, false, title);
  const canvas = renderSheet(args(sheet, 300));
  const blob = await canvasToBlob(canvas);
  canvas.width = 0;
  const sig = [...new Uint8Array(await blob.slice(0, 8).arrayBuffer())].map((b) => b.toString(16).padStart(2, "0")).join("");
  const bmp = await createImageBitmap(blob);
  const res = { width: bmp.width, height: bmp.height };
  // One card at 100x60 mm = 1181.1 x 708.7 px at 300 dpi: measure the first card's cut-line box.
  const c = makeCanvas(bmp.width, bmp.height);
  const g = ctx2d(c);
  g.drawImage(bmp, 0, 0);
  bmp.close?.();
  // Dark runs along one row (a vertical cut line is a run; take its centre). Tries rows
  // until one crosses both vertical lines on a dash rather than a gap.
  const runsAt = (y) => {
    const d = g.getImageData(0, y, res.width, 1).data;
    const runs = [];
    let s = -1;
    for (let x = 0; x <= res.width; x++) {
      const dark = x < res.width && d[x * 4] < 128 && d[x * 4 + 1] < 128 && d[x * 4 + 2] < 128;
      if (dark && s < 0) s = x;
      if (!dark && s >= 0) { runs.push((s + x - 1) / 2); s = -1; }
    }
    return runs;
  };
  let cardWidthMm = null;
  for (let ymm = 45; ymm <= 55 && cardWidthMm === null; ymm += 0.5) {
    const runs = runsAt(Math.round((ymm / 25.4) * 300));
    const left = runs[0];
    const mid = runs.find((x) => Math.abs(x - left - 1181.1) < 12);
    if (left !== undefined && mid !== undefined) cardWidthMm = Math.round(((mid - left) / 300) * 25.4 * 10) / 10;
  }
  const expectW = paperId === "A4" ? 2480 : 2550;
  const expectH = paperId === "A4" ? 3508 : 3300;
  return { ok: sig === "89504e470d0a1a0a" && res.width === expectW && res.height === expectH && cardWidthMm !== null && Math.abs(cardWidthMm - 100) <= 0.5,
    paperId, pngSignature: sig === "89504e470d0a1a0a", ...res, expected: `${expectW}x${expectH}`, cardWidthMm, size: blob.size, blob };
}

// ---------- runner ----------
/**
 * options: { source: "synthetic"|"current", count, fps, playMode, holds, video: bool,
 *   videoFrames, pdfPaper, forceJpeg, download: bool }
 * Blobs are stripped from the returned report; with download: true they are saved.
 */
export async function run(options = {}) {
  const started = performance.now();
  const cur = options.source === "current" ? currentFrames() : null;
  const frames = cur?.frames || syntheticFrames({ count: options.count ?? 12, holds: options.holds ?? { 2: 3 } });
  const fps = options.fps ?? cur?.fps ?? 24;
  const playMode = options.playMode ?? cur?.playMode ?? "pingpong";
  const report = { userAgent: navigator.userAgent, source: cur ? "current" : "synthetic", frames: frames.length, fps, playMode, results: {} };
  const keep = [];
  const step = async (name, fn) => {
    try {
      const r = await fn();
      if (r.blob) { keep.push([name, r.blob]); delete r.blob; }
      report.results[name] = r;
    } catch (err) {
      report.results[name] = { ok: false, error: String(err?.message || err), stack: String(err?.stack || "").split("\n").slice(0, 4).join(" | ") };
    }
  };
  await step("gif", () => testGif({ frames, fps, playMode }));
  await step("gifHalf", () => testGif({ frames, fps, playMode: "loop", half: true }));
  if (options.video !== false) {
    const vf = options.videoFrames ? frames.slice(0, options.videoFrames) : frames;
    await step("video", () => testVideo({ frames: vf, fps, playMode }));
  }
  await step("pdfA4", () => testPdf({ frames, paperId: options.pdfPaper || "A4" }));
  await step("pdfLetter", () => testPdf({ frames: frames.slice(0, 8), paperId: "Letter" }));
  await step("pdfJpeg", () => testPdf({ frames: frames.slice(0, 8), paperId: "A4", forceJpeg: true }));
  await step("pngA4", () => testPng({ frames, paperId: "A4" }));
  report.ok = Object.values(report.results).every((r) => r.ok);
  report.ms = Math.round(performance.now() - started);
  if (options.download) {
    const ext = { gif: "gif", gifHalf: "gif", pdfA4: "pdf", pdfLetter: "pdf", pdfJpeg: "pdf", pngA4: "png" };
    for (const [name, blob] of keep) {
      const e = name === "video" ? (blob.type.includes("mp4") ? "mp4" : "webm") : ext[name];
      downloadBlob(blob, `selftest-${options.tag || report.source}-${name}.${e}`);
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  window.__selfTestBlobs = Object.fromEntries(keep);
  return report;
}
