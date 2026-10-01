// Video export via MediaRecorder (plan 3.2, fix round R46): probe MP4 first, then WebM.
// One video frame per animation tick, sent on demand (captureStream(0) + requestFrame()),
// so no frame of any cycle is skipped and the sample count is known in advance. Whole cycles
// repeat to at least 3 s. The encoder is warmed up first (Chrome's hardware encoder drops
// frames during its first seconds of a browser session), and the finished file is checked:
// a short or empty one is reported so the UI can retry or offer GIF.
import { playSequence, frameDurationMs, cyclesForMinimum } from "../core/timing.js";
import { ExportCancelled } from "./gif-export.js";
import { scanMp4, recordingFault } from "./video-check.js";

export const VIDEO_TYPES = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"];
const MIN_MS = 3000;
const WARMUP_MS = 3300; // measured: 2.5 s is not enough for the encoder to come up
const WARMUP_SIZE = 64;
const HALF_VSYNC_MS = 8; // a tick due within half a display frame is sent now, not one frame late
const TAIL_MS = 150; // lets the closing frame reach the encoder before stop()

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
  constructor(code, options) { super(code, options); this.code = code; } // "empty" | "short" | "hidden" | "failed"
}

/**
 * Plans the recording. `ticks` is one cycle as frame indices, one entry per 1000 / fps ms
 * (a held frame repeats), so the file has a constant frame rate and `samples` frames in all.
 */
export function planVideo(frames, fps, playMode) {
  const seq = playSequence(frames.length, playMode);
  const durations = seq.map((i) => frameDurationMs(frames[i].hold, fps));
  const cycleMs = durations.reduce((a, b) => a + b, 0);
  const cycles = cyclesForMinimum(cycleMs, MIN_MS);
  const ticks = seq.flatMap((i) => Array(frames[i].hold).fill(i));
  return { seq, durations, cycleMs, cycles, totalMs: cycleMs * cycles, tickMs: 1000 / fps, ticks, samples: ticks.length * cycles };
}

/** A capture stream for `canvas` plus push(), which sends the canvas as one video frame. */
function openCapture(canvas) {
  const stream = canvas.captureStream(0);
  const track = stream.getVideoTracks()[0];
  if (typeof track?.requestFrame === "function") return { stream, push: () => track.requestFrame(), onDemand: true };
  if (typeof stream.requestFrame === "function") return { stream, push: () => stream.requestFrame(), onDemand: true };
  // No on-demand capture here: the browser samples the canvas itself, 30 times a second.
  stream.getTracks().forEach((tr) => tr.stop());
  return { stream: canvas.captureStream(30), push: () => {}, onDemand: false };
}

let warm = null;

/**
 * A throwaway recording that brings the encoder up, once per page. Starts when the Export
 * overlay opens; the real recording waits for it. Never rejects.
 */
export function warmUpVideoEncoder() {
  warm ??= new Promise((resolve) => {
    const type = pickVideoType();
    if (!type || !canRecordVideo()) return resolve();
    let capture = null;
    let rec = null;
    let raf = 0;
    let n = 0;
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      clearTimeout(stopTimer);
      clearTimeout(giveUp);
      try { capture?.stream.getTracks().forEach((tr) => tr.stop()); } catch { /* already stopped */ }
      resolve();
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      try {
        if (rec && rec.state !== "inactive") rec.stop();
        else done();
      } catch {
        done();
      }
    };
    const stopTimer = setTimeout(stop, WARMUP_MS);
    const giveUp = setTimeout(done, WARMUP_MS + 1500); // a recorder that never answers stop()
    try {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = WARMUP_SIZE;
      const g = canvas.getContext("2d");
      capture = openCapture(canvas);
      rec = new MediaRecorder(capture.stream, { mimeType: type, videoBitsPerSecond: 250_000 });
      rec.onstop = done;
      rec.onerror = done;
      rec.start();
      const tick = () => {
        if (finished) return;
        g.fillStyle = n % 2 ? "#FFFFFF" : "#1F1E1B";
        g.fillRect(0, 0, WARMUP_SIZE, WARMUP_SIZE);
        g.fillStyle = "#F4B63F";
        g.fillRect((n * 3) % WARMUP_SIZE, 0, 8, WARMUP_SIZE);
        n++;
        capture.push();
        raf = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      done();
    }
  });
  return warm;
}

/** Resolves with `promise`, or rejects with ExportCancelled as soon as `signal` aborts. */
function orCancelled(promise, signal) {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(new ExportCancelled());
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(new ExportCancelled());
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
  });
}

/** The length of a recording as a <video> element reads it, in ms; null when it cannot tell. */
function probeDurationMs(blob) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const v = document.createElement("video");
    let settled = false;
    const end = (ms) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      v.removeAttribute("src");
      v.load();
      URL.revokeObjectURL(url);
      resolve(ms);
    };
    const timer = setTimeout(() => end(null), 4000);
    v.muted = true;
    v.preload = "metadata";
    v.onerror = () => end(0); // the browser cannot read its own recording
    v.onloadedmetadata = () => {
      if (Number.isFinite(v.duration)) return end(v.duration * 1000);
      // MediaRecorder WebM has no duration in its header; a far seek makes the browser find it.
      v.ontimeupdate = () => { if (Number.isFinite(v.duration)) end(v.duration * 1000); };
      v.currentTime = 1e7;
    };
    v.src = url;
  });
}

/** Rejects with VideoError("short") when the file holds less than was recorded into it. */
async function checkRecording(result, plan) {
  const info = result.ext === "mp4" ? scanMp4(new Uint8Array(await result.blob.arrayBuffer())) : null;
  const durationMs = info?.durationMs ?? await probeDurationMs(result.blob);
  const fault = recordingFault({ plan, info, durationMs, exact: result.onDemand });
  if (fault) throw new VideoError(fault);
  return { ...result, samples: info?.samples ?? null, durationMs };
}

/**
 * Records `frames` onto `canvas` (visible in the overlay).
 * onPhase("preparing") while the encoder warms up, then onPhase("recording").
 * Resolves { blob, type, ext, samples, durationMs }. Rejects with ExportCancelled or VideoError.
 */
export async function recordVideo({ frames, fps, playMode, canvas, onProgress, onPhase, signal }) {
  const type = pickVideoType();
  if (!type) throw new VideoError("failed");
  const plan = planVideo(frames, fps, playMode);
  const g = canvas.getContext("2d");
  const draw = (i) => {
    g.fillStyle = "#FFFFFF";
    g.fillRect(0, 0, canvas.width, canvas.height);
    g.drawImage(frames[i].canvas, 0, 0, canvas.width, canvas.height);
  };
  draw(plan.ticks[0]);
  onPhase?.("preparing");
  await orCancelled(warmUpVideoEncoder(), signal);
  onPhase?.("recording");
  const result = await capture({ plan, canvas, draw, type, onProgress, signal });
  return checkRecording(result, plan);
}

function capture({ plan, canvas, draw, type, onProgress, signal }) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const total = plan.samples;
    const totalS = Math.round(plan.totalMs / 1000);
    const lastFrame = plan.ticks[plan.ticks.length - 1];
    let source = null;
    let rec = null;
    let raf = 0;
    let stopTimer = 0;
    let sent = 0;
    let outcome = null; // "done" | "cancelled" | "hidden" | "failed" | "stopped"
    const cleanup = () => {
      cancelAnimationFrame(raf);
      clearTimeout(stopTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      signal?.removeEventListener("abort", onAbort);
      source?.stream.getTracks().forEach((tr) => tr.stop());
    };
    const onStop = () => {
      outcome ??= "stopped"; // the browser ended the recording by itself: the check decides what it is worth
      cleanup();
      if (outcome === "cancelled") return reject(new ExportCancelled());
      if (outcome === "hidden") return reject(new VideoError("hidden"));
      if (outcome === "failed") return reject(new VideoError("failed"));
      const blob = new Blob(chunks, { type: type.split(";")[0] });
      if (!blob.size) return reject(new VideoError("empty"));
      resolve({ blob, type, ext: extensionFor(type), onDemand: source.onDemand });
    };
    const finish = (why) => {
      if (outcome) return;
      outcome = why;
      if (rec && rec.state !== "inactive") rec.stop();
      else onStop();
    };
    const onVisibility = () => { if (document.visibilityState === "hidden") finish("hidden"); };
    const onAbort = () => finish("cancelled");

    if (signal?.aborted) return reject(new ExportCancelled());
    if (document.visibilityState === "hidden") return reject(new VideoError("hidden"));
    try {
      source = openCapture(canvas);
      rec = new MediaRecorder(source.stream, { mimeType: type, videoBitsPerSecond: 4_000_000 });
      rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onstop = onStop;
      rec.onerror = () => finish("failed");
      document.addEventListener("visibilitychange", onVisibility);
      signal?.addEventListener("abort", onAbort);
      // No timeslice: one finished file with a real duration in its header, not a stream of fragments.
      rec.start();
    } catch (err) {
      cleanup();
      reject(new VideoError("failed", { cause: err }));
      return;
    }

    let t0 = 0;
    let lastSecond = -1;
    const tick = (now) => {
      if (outcome) return;
      if (!t0) t0 = now;
      const elapsed = now - t0;
      if (source.onDemand) {
        // At most one frame per display frame, always the next one in order: a late tick is
        // sent late, never dropped, and the schedule stays tied to the clock.
        if (sent < total && elapsed + HALF_VSYNC_MS >= sent * plan.tickMs) {
          draw(plan.ticks[sent % plan.ticks.length]);
          source.push();
          sent++;
        } else if (sent === total && elapsed + HALF_VSYNC_MS >= plan.totalMs) {
          // Closing frame: gives the last tick its full length in the file.
          draw(lastFrame);
          source.push();
          sent++;
        }
      } else if (elapsed < plan.totalMs) {
        draw(plan.ticks[Math.min(plan.ticks.length - 1, Math.floor((elapsed % plan.cycleMs) / plan.tickMs))]);
      } else {
        draw(lastFrame);
        sent = total + 1;
      }
      if (sent > total) {
        onProgress?.(totalS, totalS);
        stopTimer = setTimeout(() => finish("done"), TAIL_MS);
        return;
      }
      const s = Math.min(totalS, Math.floor(elapsed / 1000));
      if (s !== lastSecond) {
        lastSecond = s;
        onProgress?.(s, totalS);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  });
}
