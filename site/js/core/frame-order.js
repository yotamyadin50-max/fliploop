// Where a deleted frame goes back (fix round R22). The "ghost order" is the film's frame
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
