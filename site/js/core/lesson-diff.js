// Lesson "done" rule on raw RGBA pixels (fix round R14): a blank frame is done when it holds
// 50 or more pixels of ink ADDED on top of its prepared drawing. Ink that was removed (the
// eraser, "ניקוי הפריים") never counts, so wiping a prepared figure cannot earn a stamp.
// Ink that was only moved (the Move tool) is not added ink either (Gatekeeper note G-04).

export const DONE_PIXELS = 50;

/** Lessons are authored in this space; a lesson project may have been cropped to a square. */
export const LESSON_SPACE = { width: 480, height: 360 };

/**
 * Pixels of `frame` that carry ink the prepared raster does not: clearly more opaque than
 * prepared, or painted over prepared ink in another colour. Both buffers are RGBA of the
 * same size (non-premultiplied, as getImageData returns them).
 * moved = { width, dx, dy }: compare with the prepared drawing moved by that many whole
 * pixels (width = pixels per row). What a move pushes in from outside the page is no ink.
 */
export function countAddedInk(frame, prepared, threshold = 40, moved = null) {
  if (frame.length !== prepared.length) throw new RangeError("countAddedInk: buffers differ in size");
  const width = moved ? moved.width : 0;
  const height = moved ? frame.length / 4 / width : 0;
  let n = 0;
  for (let i = 0; i < frame.length; i += 4) {
    const fa = frame[i + 3];
    if (fa <= threshold) continue; // no real ink here now
    let p = i;
    if (moved) {
      const at = i / 4;
      const x = (at % width) - moved.dx, y = Math.floor(at / width) - moved.dy;
      p = x < 0 || x >= width || y < 0 || y >= height ? -1 : (y * width + x) * 4;
    }
    const pa = p < 0 ? 0 : prepared[p + 3];
    if (fa - pa > threshold) { n++; continue; }
    if (pa > 0 && Math.abs(frame[i] - prepared[p]) + Math.abs(frame[i + 1] - prepared[p + 1]) + Math.abs(frame[i + 2] - prepared[p + 2]) > threshold * 3) n++;
  }
  return n;
}

/** The box around the real ink of an RGBA buffer ({ x0, y0, x1, y1 }, inclusive), or null when it has none. */
export function inkBounds(data, width, threshold = 40) {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (let i = 3, at = 0; i < data.length; i += 4, at++) {
    if (data[i] <= threshold) continue;
    const x = at % width, y = (at - x) / width;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}

/**
 * Added ink when the prepared drawing may have been moved. The Move tool shifts the whole
 * frame by whole pixels, so the prepared drawing is still there, only somewhere else, and
 * counting it against its old place called it "added". The count is the smallest one over
 * no move at all and the moves that put a side of the prepared drawing's box on the same
 * side of the frame's ink box (a side still lines up after erasing elsewhere, or after the
 * other side was pushed off the page). Ink drawn on top still counts under every one of them.
 * enough: the caller only asks whether the count reaches it, so a lower count ends the search.
 */
export function countAddedInkMoved(frame, prepared, width, threshold = 40, enough = 1) {
  let best = countAddedInk(frame, prepared, threshold);
  if (best < enough) return best;
  const from = inkBounds(prepared, width, threshold);
  const to = from && inkBounds(frame, width, threshold);
  if (!to) return best;
  const tried = new Set(["0,0"]);
  for (const dx of [to.x0 - from.x0, to.x1 - from.x1]) {
    for (const dy of [to.y0 - from.y0, to.y1 - from.y1]) {
      if (tried.has(`${dx},${dy}`)) continue;
      tried.add(`${dx},${dy}`);
      best = Math.min(best, countAddedInk(frame, prepared, threshold, { width, dx, dy }));
      if (best < enough) return best;
    }
  }
  return best;
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
