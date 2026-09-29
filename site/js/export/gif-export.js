// GIF export: frames flattened on white (no onion), one GIF frame per sequence entry with
// delay hold x 1000/fps ms (centisecond carry), ping-pong 1..N..2, main thread with a
// yield per frame, progress and cancel.
import { PaletteBuilder, GifWriter } from "../gif/encoder.js";
import { playSequence, gifDelaysCs } from "../core/timing.js";
import { makeCanvas, ctx2d, yieldToMain } from "../lib/util.js";

export function flattenFrame(frame, w, h, target) {
  const c = target || makeCanvas(w, h);
  const g = ctx2d(c);
  g.fillStyle = "#FFFFFF";
  g.fillRect(0, 0, w, h);
  g.imageSmoothingQuality = "high";
  g.drawImage(frame.canvas, 0, 0, w, h);
  return g.getImageData(0, 0, w, h).data;
}

export class ExportCancelled extends Error {
  constructor() { super("cancelled"); this.name = "ExportCancelled"; }
}

/** frames: [{ canvas, hold }], fps, playMode. Returns a GIF Blob. */
export async function encodeGif({ frames, fps, playMode, half = false, onProgress, signal }) {
  const src = frames[0].canvas;
  const w = Math.round(src.width * (half ? 0.5 : 1));
  const h = Math.round(src.height * (half ? 0.5 : 1));
  const seq = playSequence(frames.length, playMode);
  const delays = gifDelaysCs(seq.map((i) => frames[i].hold), fps);
  const scratch = makeCanvas(w, h);

  const pb = new PaletteBuilder();
  for (let i = 0; i < frames.length; i++) {
    if (signal?.aborted) throw new ExportCancelled();
    pb.addPixels(flattenFrame(frames[i], w, h, scratch));
    if (i % 8 === 7) await yieldToMain();
  }
  const palette = pb.build();
  const writer = new GifWriter(w, h, palette, { loop: 0 });
  const indexed = new Map();
  for (let k = 0; k < seq.length; k++) {
    if (signal?.aborted) throw new ExportCancelled();
    const i = seq[k];
    let idx = indexed.get(i);
    if (!idx) {
      idx = palette.indexPixels(flattenFrame(frames[i], w, h, scratch));
      indexed.set(i, idx);
    }
    writer.addFrame(idx, delays[k]);
    onProgress?.(k + 1, seq.length);
    await yieldToMain();
  }
  return new Blob([writer.finish()], { type: "image/gif" });
}
