// WS4 fix round: restoring deleted frames next to their old neighbour (R22, audit F5).
import { test } from "node:test";
import assert from "node:assert/strict";
import { syncGhost, restoreIndex } from "../site/js/core/frame-order.js";

/** A film with the Editor's bookkeeping: delete, restore, insert after, move. */
function film(ids) {
  let order = [...ids];
  let ghost = [...ids];
  const trash = new Set();
  const sync = () => { ghost = syncGhost(ghost, order, trash); };
  return {
    get order() { return order.join(" "); },
    del(id) { sync(); order = order.filter((x) => x !== id); trash.add(id); },
    restore(id) {
      const at = restoreIndex(ghost, order, id);
      order.splice(at, 0, id);
      trash.delete(id);
      sync();
    },
    forget(id) { trash.delete(id); sync(); },
    insertAfter(prev, id) { order.splice(order.indexOf(prev) + 1, 0, id); sync(); },
    move(id, to) { order = order.filter((x) => x !== id); order.splice(to, 0, id); sync(); },
  };
}

test("frame restore: two deletes come back in order, whichever toast is pressed first", () => {
  for (const dels of [[3, 2], [2, 3], [2, 1], [1, 2], [4, 3], [1, 4]]) {
    for (const undo of [dels, [...dels].reverse()]) {
      const f = film([1, 2, 3, 4]);
      dels.forEach((id) => f.del(id));
      undo.forEach((id) => f.restore(id));
      assert.equal(f.order, "1 2 3 4", `delete ${dels}, undo ${undo}`);
    }
  }
});

test("frame restore: the older toast alone puts its frame where it was (audit F5: 2 3 4, not 3 2 4)", () => {
  const f = film([1, 2, 3, 4]);
  f.del(2);
  f.del(1);
  f.restore(2);
  assert.equal(f.order, "2 3 4");
  f.restore(1);
  assert.equal(f.order, "1 2 3 4");
});

test("frame restore: every order of three deletes and three restores", () => {
  const perms = (a) => (a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p])));
  for (const dels of perms([2, 3, 4])) {
    for (const undo of perms([2, 3, 4])) {
      const f = film([1, 2, 3, 4, 5]);
      dels.forEach((id) => f.del(id));
      undo.forEach((id) => f.restore(id));
      assert.equal(f.order, "1 2 3 4 5", `delete ${dels}, undo ${undo}`);
    }
  }
});

test("frame restore: first and last frames, and a film emptied down to one frame", () => {
  const f = film([1, 2, 3]);
  f.del(1);
  f.del(3);
  f.restore(3);
  assert.equal(f.order, "2 3");
  f.restore(1);
  assert.equal(f.order, "1 2 3");
});

test("frame restore: a frame added after the delete keeps its place, the restored frame returns to its old neighbour", () => {
  const f = film([1, 2, 3]);
  f.del(2);
  f.insertAfter(1, 9);
  f.restore(2);
  assert.equal(f.order, "1 2 9 3");
});

test("frame restore: the old neighbour was moved, the frame follows it", () => {
  const f = film([1, 2, 3, 4]);
  f.del(2);
  f.move(1, 2);
  assert.equal(f.order, "3 4 1");
  f.restore(2);
  assert.equal(f.order, "3 4 1 2");
});

test("frame restore: a forgotten delete does not disturb a later one", () => {
  const f = film([1, 2, 3, 4]);
  f.del(2);
  f.del(3);
  f.forget(2);
  f.restore(3);
  assert.equal(f.order, "1 3 4");
});

test("restoreIndex: an id that was never tracked goes to the end", () => {
  assert.equal(restoreIndex(["a", "b"], ["a", "b"], "zz"), 2);
});
