// Frame order rules that need no DOM: where a dragged frame is dropped (dropSlot), and
// where a deleted frame goes back (fix round R22). The "ghost order" is the film's frame
// order with the deleted frames that can still be restored kept in their old places. A
// restore then lands next to the neighbour the frame had, whatever was added, deleted,
// moved or restored in between. An index stored at delete time cannot do that.

/**
 * The ghost order after any change to the film.
 * ghost: the previous ghost order. order: the ids in the film now. keep: ids of deleted
 * frames that can still come back (others are dropped). Every kept deleted id sits right
 * after the nearest id that preceded it in the previous ghost order.
 */
export function syncGhost(ghost, order, keep) {
  const present = new Set(order);
  const out = [...order];
  let anchor = null;
  for (const id of ghost) {
    if (present.has(id)) { anchor = id; continue; }
    if (!keep.has(id)) continue;
    out.splice(anchor === null ? 0 : out.indexOf(anchor) + 1, 0, id);
    anchor = id;
  }
  return out;
}

/**
 * The insertion bar a dragged frame is dropped at: the bar nearest the pointer.
 * pos: the pointer, in cell widths from the first bar. moved: how far the drag has gone, its
 * sign is its direction. tie: how close to the middle between two bars counts as the middle.
 * Exactly in the middle (a drag of whole cells from a cell's centre) the bar the drag is
 * heading for wins, so a drag to the left behaves like the same drag to the right.
 */
export function dropSlot(pos, moved, tie = 0) {
  const lower = Math.floor(pos);
  const past = pos - lower;
  if (Math.abs(past - 0.5) <= tie) return moved < 0 ? lower : lower + 1;
  return past < 0.5 ? lower : lower + 1;
}

/** The index in `order` where the deleted frame `id` belongs. */
export function restoreIndex(ghost, order, id) {
  const at = ghost.indexOf(id);
  if (at < 0) return order.length;
  const present = new Set(order);
  for (let i = at - 1; i >= 0; i--) {
    if (present.has(ghost[i])) return order.indexOf(ghost[i]) + 1;
  }
  return 0;
}
