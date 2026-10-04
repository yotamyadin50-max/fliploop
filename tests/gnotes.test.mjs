// node --test "tests/*.test.mjs"   (Gatekeeper notes G-01 to G-04: the DOM-free parts)
import { test } from "node:test";
import assert from "node:assert/strict";

import { planRescue } from "../site/js/store/rescue.js";
import { dropSlot } from "../site/js/core/frame-order.js";
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
