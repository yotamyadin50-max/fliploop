// Video export via MediaRecorder (plan 3.2): probe MP4 first, then WebM; real-time
// recording from a visible canvas; whole cycles repeated to at least 3 s; progress in
// seconds; cancel leaves nothing behind; an empty result is reported so the UI can
// offer GIF instead.
import { playSequence, frameDurationMs, cyclesForMinimum } from "../core/timing.js";
import { ExportCancelled } from "./gif-export.js";

export const VIDEO_TYPES = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"];
const MIN_MS = 3000;

export function pickVideoType() {
  const MR = globalThis.MediaRecorder;
  if (!MR || typeof MR.isTypeSupported !== "function") return null;
  for (const type of VIDEO_TYPES) {
    try { if (MR.isTypeSupported(type)) return type; } catch { /* keep probing */ }
  }
  return null;
}

export function canRecordVideo() {
  return !!pickVideoType() && typeof HTMLCanvasElement.prototype.captureStream === "function";
}

export function extensionFor(type) {
  return type.startsWith("video/mp4") ? "mp4" : "webm";
}

export class VideoError extends Error {
  constructor(code, options) { super(code, options); this.code = code; } // "empty" | "hidden" | "failed"
}

/** Plans the recording: sequence, per-entry durations, cycles, total ms. */
export function planVideo(frames, fps, playMode) {
  const seq = playSequence(frames.length, playMode);
  const durations = seq.map((i) => frameDurationMs(frames[i].hold, fps));
  const cycleMs = durations.reduce((a, b) => a + b, 0);
  const cycles = cyclesForMinimum(cycleMs, MIN_MS);
  return { seq, durations, cycleMs, cycles, totalMs: cycleMs * cycles };
}

/**
 * Records `frames` onto `canvas` (visible in the overlay). Resolves { blob, type, ext }.
 * Rejects with ExportCancelled or VideoError.
 */
export function recordVideo({ frames, fps, playMode, canvas, onProgress, signal }) {
  const type = pickVideoType();
  if (!type) return Promise.reject(new VideoError("failed"));
  const plan = planVideo(frames, fps, playMode);
  const g = canvas.getContext("2d");
  const draw = (i) => {
    g.fillStyle = "#FFFFFF";
    g.fillRect(0, 0, canvas.width, canvas.height);
    g.drawImage(frames[i].canvas, 0, 0, canvas.width, canvas.height);
  };
  const starts = [];
  plan.durations.reduce((acc, d) => { starts.push(acc); return acc + d; }, 0);

  return new Promise((resolve, reject) => {
    let stream;
    let rec;
    try {
      stream = canvas.captureStream(30);
      rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 4_000_000 });
    } catch (err) {
      reject(new VideoError("failed", { cause: err }));
      return;
    }
    const chunks = [];
    let raf = 0;
    let outcome = null; // "done" | "cancelled" | "hidden" | "failed"
    const cleanup = () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      signal?.removeEventListener("abort", onAbort);
      stream.getTracks().forEach((tr) => tr.stop());
    };
    const finish = (why) => {
      if (outcome) return;
      outcome = why;
      if (rec.state !== "inactive") rec.stop();
      else onStop();
    };
    const onVisibility = () => { if (document.visibilityState === "hidden") finish("hidden"); };
    const onAbort = () => finish("cancelled");
    const onStop = () => {
      cleanup();
      if (outcome === "cancelled") return reject(new ExportCancelled());
      if (outcome === "hidden") return reject(new VideoError("hidden"));
      if (outcome === "failed") return reject(new VideoError("failed"));
      const blob = new Blob(chunks, { type: type.split(";")[0] });
      if (!blob.size) return reject(new VideoError("empty"));
      resolve({ blob, type, ext: extensionFor(type) });
    };
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = onStop;
    rec.onerror = () => finish("failed");
    document.addEventListener("visibilitychange", onVisibility);
    signal?.addEventListener("abort", onAbort);
    if (document.visibilityState === "hidden") { finish("hidden"); return; }

    draw(plan.seq[0]);
    rec.start(250);
    const t0 = performance.now();
    let lastSecond = -1;
    const tick = (now) => {
      if (outcome) return;
      const elapsed = now - t0;
      if (elapsed >= plan.totalMs) {
        draw(plan.seq[plan.seq.length - 1]);
        onProgress?.(Math.round(plan.totalMs / 1000), Math.round(plan.totalMs / 1000));
        setTimeout(() => finish("done"), 120);
        return;
      }
      const e = elapsed % plan.cycleMs;
      let k = 0;
      while (k + 1 < starts.length && starts[k + 1] <= e) k++;
      draw(plan.seq[k]); // redraw every tick keeps the capture stream at a steady rate
      const s = Math.floor(elapsed / 1000);
      if (s !== lastSecond) {
        lastSecond = s;
        onProgress?.(s, Math.round(plan.totalMs / 1000));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  });
}
