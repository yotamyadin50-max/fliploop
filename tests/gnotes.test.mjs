// node --test "tests/*.test.mjs"   (Gatekeeper notes G-01 to G-04: the DOM-free parts)
import { test } from "node:test";
import assert from "node:assert/strict";

import { planRescue } from "../site/js/store/rescue.js";
import { dropSlot } from "../site/js/core/frame-order.js";
import { countAddedInk, countAddedInkMoved, inkBounds, DONE_PIXELS } from "../site/js/core/lesson-diff.js";
import { STRINGS } from "../site/js/data/strings.js";
import { LESSON_COPY } from "../site/js/data/lesson-copy.js";

const PNG = "data:image/png;base64,iVBORw0KGgo=";
const frame = (id, over = {}) => ({ id, hold: 1, lessonRole: "free", locked: false, png: PNG, ...over });
const project = (over = {}) => ({
  id: "p", title: "ציור", kind: "free", width: 480, height: 360, fps: 12, playMode: "loop",
  onion: { enabled: true, prev: 1, next: 1 }, frameOrder: ["a", "b", "c"], updatedAt: 100, ...over,
});
const record = (over = {}) => ({
  v: 1, at: 150, base: 100, inflight: null, projectDirty: false, projectId: "p",
  project: { title: "ציור", width: 480, height: 360, fps: 12, playMode: "loop", onion: { prev: 1, next: 1, enabled: true } },
  frameOrder: ["a", "b", "c"], frames: [frame("b")], deleted: [], ...over,
});
const stored = (revs) => new Map(Object.entries(revs).map(([id, rev]) => [id, { id, hold: 1, rev }]));
const ids = (list) => list.map((f) => f.id);

test("the name lesson 1 had before its rename is kept as a string, apart from the current one (G-02)", () => {
  assert.ok(STRINGS["lesson.1.nameBefore"]);
  assert.notEqual(STRINGS["lesson.1.nameBefore"], LESSON_COPY["lesson.1.title"]);
  assert.match(STRINGS["lesson.projectTitle"], /\{n\}.*\{lessonName\}/);
});

test("drag reorder: the nearest insertion bar, and exactly in the middle the one the drag is heading for (G-03)", () => {
  const tie = 0.25 / 72;
  // frame 3 (bars 2 and 3 are its edges), pressed at its centre: pos 2.5
  assert.equal(dropSlot(2.5, 0, tie), 3); // not moved yet: its own right edge, the frame stays
  assert.equal(dropSlot(1.5, -72, tie), 1); // one whole cell left: bar 1, one place left
  assert.equal(dropSlot(3.5, 72, tie), 4); // one whole cell right: bar 4, one place right
  assert.equal(dropSlot(0.5, -144, tie), 0);
  assert.equal(dropSlot(4.5, 144, tie), 5);
  // away from the middle the direction does not matter
  assert.equal(dropSlot(1.6, -65, tie), 2);
  assert.equal(dropSlot(1.4, -80, tie), 1);
  assert.equal(dropSlot(3.4, 65, tie), 3);
  assert.equal(dropSlot(3.6, 80, tie), 4);
  assert.equal(dropSlot(1.5 + 0.2 / 72, -72, tie), 1); // within a quarter pixel of the middle
  assert.equal(dropSlot(1.5 + 0.5 / 72, -72, tie), 2);
});

// A 60x40 page. rect() paints ink; move() does what the Move tool does: the whole page shifted
// by whole pixels, what leaves the page is cut.
const W = 60, H = 40;
const page = () => new Uint8ClampedArray(W * H * 4);
function rect(buf, x, y, w, h, rgba = [31, 30, 27, 255]) {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) buf.set(rgba, (yy * W + xx) * 4);
  return buf;
}
function move(buf, dx, dy) {
  const out = page();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const tx = x + dx, ty = y + dy;
    if (tx < 0 || tx >= W || ty < 0 || ty >= H) continue;
    out.set(buf.subarray((y * W + x) * 4, (y * W + x) * 4 + 4), (ty * W + tx) * 4);
  }
  return out;
}
// The prepared drawing: an L shape, so its box and its ink are not the same thing.
const preparedPage = () => rect(rect(page(), 10, 8, 4, 20), 10, 24, 16, 4);

test("lesson done rule: prepared ink that was only moved is not added ink (G-04)", () => {
  const prepared = preparedPage();
  assert.deepEqual(inkBounds(prepared, W), { x0: 10, y0: 8, x1: 25, y1: 27 });
  assert.equal(inkBounds(page(), W), null);
  const moved = move(prepared, 17, 6);
  assert.ok(countAddedInk(moved, prepared) >= DONE_PIXELS, "the old rule called the moved drawing added ink");
  assert.equal(countAddedInkMoved(moved, prepared, W), 0);
  assert.equal(countAddedInkMoved(prepared.slice(), prepared, W), 0, "not moved at all");
  assert.equal(countAddedInkMoved(move(prepared, -3, -5), prepared, W), 0);
  // pushed partly off the page: the side that is still whole lines up
  assert.equal(countAddedInkMoved(move(prepared, 40, 0), prepared, W), 0);
  assert.equal(countAddedInkMoved(move(prepared, 0, -20), prepared, W), 0);
  assert.equal(countAddedInkMoved(move(prepared, -8, 18), prepared, W), 0, "the cut takes the foot of the L: two sides of its box change");
  // moved, then erased at the top and at the corner: removed ink never counts
  const erased = rect(rect(move(prepared, 17, 6), 27, 14, 4, 6, [0, 0, 0, 0]), 27, 30, 6, 4, [0, 0, 0, 0]);
  assert.equal(countAddedInkMoved(erased, prepared, W), 0);
});

test("lesson done rule: ink drawn on a moved frame still counts, and only that ink (G-04)", () => {
  const prepared = preparedPage();
  // 6 x 10 = 60 pixels drawn away from the moved drawing
  const drawn = rect(move(prepared, 17, 6), 2, 2, 6, 10);
  assert.equal(countAddedInkMoved(drawn, prepared, W), 60);
  // drawn first, moved afterwards: the same 60
  assert.equal(countAddedInkMoved(move(rect(prepared.slice(), 40, 2, 6, 10), -6, 9), prepared, W), 60);
  // under the bar stays under the bar
  assert.equal(countAddedInkMoved(rect(move(prepared, 17, 6), 2, 2, 5, 9), prepared, W), 45);
  // a frame that was never moved counts exactly as before
  const plain = rect(prepared.slice(), 40, 2, 6, 10);
  assert.equal(countAddedInkMoved(plain, prepared, W), countAddedInk(plain, prepared));
  // no prepared drawing at all: every pixel of ink is added, wherever it is
  assert.equal(countAddedInkMoved(rect(page(), 3, 3, 10, 6), page(), W), 60);
  // `enough` only ends the search early, it never changes a verdict
  assert.ok(countAddedInkMoved(drawn, prepared, W, 40, DONE_PIXELS) >= DONE_PIXELS);
  assert.ok(countAddedInkMoved(move(prepared, 17, 6), prepared, W, 40, DONE_PIXELS) < DONE_PIXELS);
});

test("rescue record: the stored project is the version the closed tab knew, all of it goes in (R2)", () => {
  assert.deepEqual(planRescue(record(), project(), stored({ a: 90, b: 100, c: 95 })), { mode: "whole" });
  // its own write was in flight when the tab closed, and that write did commit
  assert.deepEqual(planRescue(record({ inflight: 140 }), project({ updatedAt: 140 }), stored({ a: 90, b: 140, c: 95 })), { mode: "whole" });
  // a record from the build before this one has no `projectDirty`: still applied whole
  const old = record();
  delete old.projectDirty;
  assert.equal(planRescue(old, project(), stored({ a: 90, b: 100, c: 95 })).mode, "whole");
});

test("rescue record against a newer project: a frame nobody saved since goes in, a frame saved since is never written over (G-01)", () => {
  // another tab saved frame "a" (rev 200) after the closed tab's version 100
  const newer = project({ updatedAt: 200 });
  const frames = stored({ a: 200, b: 100, c: 95 });
  let plan = planRescue(record(), newer, frames);
  assert.equal(plan.mode, "merge");
  assert.deepEqual([ids(plan.apply), ids(plan.compare), ids(plan.missing), plan.project], [["b"], [], [], false]);
  // the same frame in both: compared, not applied
  plan = planRescue(record({ frames: [frame("a"), frame("b")] }), newer, frames);
  assert.deepEqual([ids(plan.apply), ids(plan.compare)], [["b"], ["a"]]);
  // a frame the closed tab's own running write stored counts as its own
  plan = planRescue(record({ inflight: 140, frames: [frame("c")] }), newer, stored({ a: 200, b: 100, c: 140 }));
  assert.deepEqual(ids(plan.apply), ["c"]);
  // no `rev` (stored by an older build): nothing is known about it, so it is never applied
  plan = planRescue(record(), newer, stored({ a: 200, b: undefined, c: 95 }));
  assert.deepEqual([ids(plan.apply), ids(plan.compare)], [[], ["b"]]);
  // a frame that is not part of the stored project (added by the closed tab, or deleted since)
  plan = planRescue(record({ frames: [frame("x")], frameOrder: ["a", "b", "c", "x"] }), newer, frames);
  assert.deepEqual([ids(plan.apply), ids(plan.missing)], [[], ["x"]]);
  plan = planRescue(record(), project({ updatedAt: 200, frameOrder: ["a", "c"] }), frames);
  assert.deepEqual(ids(plan.missing), ["b"]);
  // another canvas size: the rescued image does not fit the stored project
  plan = planRescue(record({ project: { width: 360, height: 360 } }), newer, frames);
  assert.deepEqual([ids(plan.apply), ids(plan.compare)], [[], ["b"]]);
});

test("rescue record against a newer project: unsaved title, order or deletion of the closed tab is noticed, the other tab's is not (G-01)", () => {
  const newer = project({ updatedAt: 200, title: "שם אחר", fps: 24 });
  const frames = stored({ a: 200, b: 100, c: 95 });
  // the closed tab had only a stroke unsaved: the newer title and speed are the other tab's
  assert.equal(planRescue(record({ projectDirty: false }), newer, frames).project, false);
  // it had a project change unsaved, and what it had differs from what is stored
  assert.equal(planRescue(record({ projectDirty: true }), newer, frames).project, true);
  // unknown (old record): compared, to be safe
  const old = record();
  delete old.projectDirty;
  assert.equal(planRescue(old, newer, frames).project, true);
  // a project change that the stored project already has is nothing to keep
  const same = project({ updatedAt: 200 });
  assert.equal(planRescue(record({ projectDirty: true }), same, frames).project, false);
  assert.equal(planRescue(record({ projectDirty: true, frameOrder: ["b", "a", "c"] }), same, frames).project, true);
  assert.equal(planRescue(record({ projectDirty: true, deleted: ["c"] }), same, frames).project, true);
  assert.equal(planRescue(record({ projectDirty: true, deleted: ["gone"] }), same, frames).project, false);
});
