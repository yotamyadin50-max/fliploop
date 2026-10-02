// Reads what a recorded MP4 really holds: how many video samples and how long it runs.
// The recorder's own "done" says nothing about either (EX-01). DOM-free.

const CONTAINERS = new Set(["moov", "trak", "mdia", "minf", "stbl", "moof", "traf"]);

function u32(b, p) {
  return ((b[p] << 24) | (b[p + 1] << 16) | (b[p + 2] << 8) | b[p + 3]) >>> 0;
}

function u64(b, p) {
  return u32(b, p) * 2 ** 32 + u32(b, p + 4);
}

function walk(b, start, end, visit) {
  let p = start;
  while (p + 8 <= end) {
    let size = u32(b, p);
    let header = 8;
    if (size === 1) {
      if (p + 16 > end) return;
      size = u64(b, p + 8);
      header = 16;
    } else if (size === 0) size = end - p;
    if (size < header || p + size > end) return; // truncated or not a box: stop, keep what was read
    const type = String.fromCharCode(b[p + 4], b[p + 5], b[p + 6], b[p + 7]);
    if (CONTAINERS.has(type)) walk(b, p + header, p + size, visit);
    else visit(type, p + header, p + size);
    p += size;
  }
}

/**
 * bytes: Uint8Array of an MP4 file (plain or fragmented).
 * Returns { samples, durationMs }, or null when the bytes hold no movie header.
 * durationMs is null when the header carries no duration (a fragmented file cut into slices).
 */
export function scanMp4(bytes) {
  let hasMovie = false;
  let table = 0; // samples listed in the movie's own sample table
  let fragments = 0; // samples listed in movie fragments
  let durationMs = null;
  walk(bytes, 0, bytes.length, (type, p, end) => {
    if (type === "mvhd" && p + 24 <= end) {
      hasMovie = true;
      const v1 = bytes[p] === 1;
      const timescale = u32(bytes, p + (v1 ? 20 : 12));
      const duration = v1 ? u64(bytes, p + 24) : u32(bytes, p + 16);
      if (timescale > 0 && duration > 0) durationMs = (duration / timescale) * 1000;
    } else if (type === "stsz" && p + 12 <= end) {
      table += u32(bytes, p + 8);
    } else if (type === "trun" && p + 8 <= end) {
      fragments += u32(bytes, p + 4);
    }
  });
  if (!hasMovie) return null;
  return { samples: table + fragments, durationMs };
}

/**
 * What is wrong with a recording, or null when it is whole.
 * plan: { totalMs, tickMs, samples } from planVideo(). info: scanMp4() result or null.
 * durationMs: the measured length (header or a <video> probe), or null when unknown.
 * exact: every sample was sent on demand, so the count in the file must reach plan.samples.
 */
export function recordingFault({ plan, info = null, durationMs = null, exact = false }) {
  const slack = Math.max(2 * plan.tickMs, 300);
  if (durationMs !== null && durationMs < plan.totalMs - slack) return "short";
  if (exact && info && info.samples < plan.samples) return "short";
  return null;
}
