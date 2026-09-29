// Playback order and frame timing shared by the player, the GIF encoder, video and print.

/** Frame indices for one cycle. Ping-pong plays 1..N then N-1..2, never repeating the end frames. */
export function playSequence(count, mode) {
  const forward = Array.from({ length: count }, (_, i) => i);
  if (mode !== "pingpong" || count < 3) return forward;
  const back = [];
  for (let i = count - 2; i >= 1; i--) back.push(i);
  return forward.concat(back);
}

/** Milliseconds one frame stays on screen. */
export function frameDurationMs(hold, fps) {
  return (hold * 1000) / fps;
}

/**
 * GIF delays in centiseconds for a list of holds, rounded with a carried remainder so the
 * total never drifts: at 24 fps the pattern starts 4, 4, 5 and every 6 frames sum to 25 cs.
 */
export function gifDelaysCs(holds, fps) {
  const delays = [];
  let elapsedMs = 0;
  let writtenCs = 0;
  for (const hold of holds) {
    elapsedMs += frameDurationMs(hold, fps);
    const targetCs = Math.round(elapsedMs / 10);
    delays.push(Math.max(1, targetCs - writtenCs));
    writtenCs = Math.max(targetCs, writtenCs + 1);
  }
  return delays;
}

/** Total length of one cycle in ms. */
export function cycleDurationMs(holds, fps) {
  return (holds.reduce((sum, hold) => sum + hold, 0) * 1000) / fps;
}

/** How many whole cycles reach at least minMs (video is at least 3 s). */
export function cyclesForMinimum(cycleMs, minMs) {
  if (cycleMs <= 0) return 1;
  return Math.max(1, Math.ceil(minMs / cycleMs));
}
