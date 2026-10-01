// Lesson "done" rule on raw RGBA pixels (fix round R14): a blank frame is done when it holds
// 50 or more pixels of ink ADDED on top of its prepared drawing. Ink that was removed (the
// eraser, "ניקוי הפריים") never counts, so wiping a prepared figure cannot earn a stamp.

export const DONE_PIXELS = 50;

/** Lessons are authored in this space; a lesson project may have been cropped to a square. */
export const LESSON_SPACE = { width: 480, height: 360 };

/**
 * Pixels of `frame` that carry ink the prepared raster does not: clearly more opaque than
 * prepared, or painted over prepared ink in another colour. Both buffers are RGBA of the
 * same size (non-premultiplied, as getImageData returns them).
 */
export function countAddedInk(frame, prepared, threshold = 40) {
  if (frame.length !== prepared.length) throw new RangeError("countAddedInk: buffers differ in size");
  let n = 0;
  for (let i = 0; i < frame.length; i += 4) {
    const fa = frame[i + 3];
    if (fa <= threshold) continue; // no real ink here now
    const pa = prepared[i + 3];
    if (fa - pa > threshold) { n++; continue; }
    if (pa > 0 && Math.abs(frame[i] - prepared[i]) + Math.abs(frame[i + 1] - prepared[i + 1]) + Math.abs(frame[i + 2] - prepared[i + 2]) > threshold * 3) n++;
  }
  return n;
}

export function hasAddedInk(frame, prepared, min = DONE_PIXELS) {
  return countAddedInk(frame, prepared) >= min;
}

/**
 * Where lesson space sits inside a document of another size: the same centred crop or pad
 * Doc.resize() applies (Math.round of half the difference on each axis).
 */
export function lessonOffset(width, height, space = LESSON_SPACE) {
  return { dx: Math.round((width - space.width) / 2), dy: Math.round((height - space.height) / 2) };
}

/** Stroke data moved by a whole-pixel offset (guides for a cropped lesson project). */
export function shiftStrokes(strokes, dx, dy) {
  if (!dx && !dy) return strokes;
  return strokes.map((s) => ({ ...s, p: s.p.map(([x, y]) => [x + dx, y + dy]) }));
}
