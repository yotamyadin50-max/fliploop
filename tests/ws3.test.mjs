// node --test "tests/*.test.mjs"   (WS3 fix round: the lesson done rule and the lesson copy)
import { test } from "node:test";
import assert from "node:assert/strict";

import { countAddedInk, hasAddedInk, lessonOffset, shiftStrokes, DONE_PIXELS, LESSON_SPACE } from "../site/js/core/lesson-diff.js";
import { LESSONS, lessonText, blankCount } from "../site/js/data/lessons.js";
import { LESSON_COPY } from "../site/js/data/lesson-copy.js";
import { STRINGS } from "../site/js/data/strings.js";

const W = 20, H = 10;
const buf = () => new Uint8ClampedArray(W * H * 4);
function paint(b, x0, x1, [r, g, bl, a = 255], y0 = 0, y1 = H) {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = (y * W + x) * 4;
    b[i] = r; b[i + 1] = g; b[i + 2] = bl; b[i + 3] = a;
  }
  return b;
}
const INK = [31, 30, 27];
const RED = [224, 64, 58];

test("lesson done rule: identical frames and removed ink count as nothing", () => {
  const prepared = paint(buf(), 2, 10, INK); // 80 pixels of prepared ink
  assert.equal(countAddedInk(prepared.slice(), prepared), 0);
  assert.equal(countAddedInk(buf(), prepared), 0, "a cleared frame adds nothing");
  const halfErased = paint(prepared.slice(), 2, 6, [0, 0, 0, 0]);
  assert.equal(countAddedInk(halfErased, prepared), 0, "erasing part of the prepared drawing adds nothing");
  const softErased = paint(prepared.slice(), 2, 10, [...INK, 120]);
  assert.equal(countAddedInk(softErased, prepared), 0, "a soft eraser edge (same colour, less alpha) adds nothing");
  assert.equal(hasAddedInk(buf(), prepared), false);
});

test("lesson done rule: new ink counts, on paper and over the prepared drawing", () => {
  const prepared = paint(buf(), 2, 10, INK);
  const onPaper = paint(prepared.slice(), 12, 18, RED); // 60 new pixels on bare paper
  assert.equal(countAddedInk(onPaper, prepared), 60);
  assert.equal(hasAddedInk(onPaper, prepared), true);
  const over = paint(prepared.slice(), 2, 8, RED); // 60 pixels of red painted over the ink
  assert.equal(countAddedInk(over, prepared), 60);
  const sameColourOver = paint(prepared.slice(), 2, 8, INK);
  assert.equal(countAddedInk(sameColourOver, prepared), 0, "the same colour over the same ink changes nothing");
  // cleared, then redrawn: only the new ink counts, the missing prepared ink does not
  const redrawn = paint(buf(), 12, 17, RED, 0, 9); // 45 pixels
  assert.equal(countAddedInk(redrawn, prepared), 45);
  assert.equal(hasAddedInk(redrawn, prepared), false, "45 is under the 50 pixel bar");
  assert.equal(DONE_PIXELS, 50);
  // faint ink does not count: an alpha of 40 or less is not a real mark
  assert.equal(countAddedInk(paint(buf(), 0, 20, [...INK, 40]), buf()), 0);
  assert.equal(countAddedInk(paint(buf(), 0, 20, [...INK, 41]), buf()), 200);
  assert.throws(() => countAddedInk(new Uint8ClampedArray(8), new Uint8ClampedArray(4)), RangeError);
});

test("lesson space offset equals the centred crop Doc.resize applies", () => {
  assert.deepEqual(LESSON_SPACE, { width: 480, height: 360 });
  assert.deepEqual(lessonOffset(480, 360), { dx: 0, dy: 0 });
  assert.deepEqual(lessonOffset(360, 360), { dx: -60, dy: 0 }); // a lesson project made square
  const s = [{ c: "#000", w: 2, p: [[100, 50], [140, 60]], dash: true }];
  assert.equal(shiftStrokes(s, 0, 0), s);
  const moved = shiftStrokes(s, -60, 0);
  assert.deepEqual(moved[0].p, [[40, 50], [80, 60]]);
  assert.equal(moved[0].dash, true);
  assert.deepEqual(s[0].p, [[100, 50], [140, 60]], "the lesson data itself is not changed");
});

// ---- lesson copy (final-lessons.md through tools/build-strings.mjs) ----
const sentences = (s) => (s.match(/[.?!](?=\s|$)/g) || []).length;

test("lesson copy: every explanation is exactly two sentences, limits hold, no dashes", () => {
  for (const l of LESSONS) {
    const text = lessonText(l.n);
    assert.equal(sentences(text.explanation), 2, `lesson ${l.n} explanation`);
    assert.equal(/[?!]/.test(text.explanation), false, `lesson ${l.n} explanation has no ? or !`);
    assert.ok([...text.title].length <= 24, `lesson ${l.n} title`);
    assert.ok([...text.caption].length <= 38, `lesson ${l.n} caption`);
    assert.ok([...text.goal].length <= 30, `lesson ${l.n} goal`);
    for (const hint of Object.values(text.hints)) assert.ok([...hint].length <= 30, `lesson ${l.n} hint "${hint}"`);
  }
  assert.equal(/[‒-―−]/.test(Object.values(LESSON_COPY).join("\n")), false);
});

test("lesson copy: one name per thing (fix round R19, R41, R44 and the Copywriter's terms)", () => {
  const all = Object.entries(LESSON_COPY);
  assert.equal(LESSON_COPY["lesson.1.title"], "מתיחה ומעיכה");
  // Play is always shown as the glyph the child sees (U+25B6 U+FE0E) followed by the word.
  const play = "לחצו על ▶︎ (הפעלה)";
  for (const l of LESSONS) {
    const steps = lessonText(l.n).steps;
    assert.equal(steps.filter((s) => s.includes(play)).length, 1, `lesson ${l.n} names Play once`);
    assert.ok(steps[steps.length - 1].includes(play), `lesson ${l.n}: Play is in the last step`);
  }
  for (const [key, v] of all) {
    assert.equal(/לחצו על הפעלה/.test(v), false, `${key}: Play without its glyph`);
    assert.equal(/הפעילו/.test(v), false, `${key}: hints are switched on with "הדליקו"`);
    assert.equal(/הקישו/.test(v), false, `${key}: "לחצו", not "הקישו"`);
    assert.equal(/הקווקו/.test(v) && !/המקווקו/.test(v), false, `${key}: "הקו המקווקו"`);
  }
  assert.ok(LESSON_COPY["lessons.credit"].includes("אולי ג'ונסטון ופרנק תומס"));
  assert.ok(LESSON_COPY["lessons.credit"].includes("The Illusion of Life"));
  // Lesson 9 says that a hold must change (R15), and its nudge exists.
  assert.ok(LESSON_COPY["lesson.9.step.3"].includes("לפחות אחת כדי לסיים"));
  assert.ok(LESSON_COPY["lesson.9.step.3"].includes("ברצועה"));
  assert.ok(STRINGS["lessonMode.nudgeHold"].includes("שנו החזקה"));
  assert.ok(STRINGS["lessonMode.nudgeHold"].includes("▶︎ (הפעלה)"));
});

test("lesson 11 copy matches its stroke data: the band is in the same place on frames 1 and 5", () => {
  const frames = LESSONS[10].frames;
  const bandOf = (f) => [...f.strokes, ...f.solution].find((s) => s.w === 10).p;
  const meanX = (p) => p.reduce((sum, q) => sum + q[0], 0) / p.length;
  const xs = frames.map((f) => meanX(bandOf(f)));
  assert.ok(Math.abs(xs[0] - xs[4]) < 1e-6, "frames 1 and 5 show the same band (half a turn apart)");
  assert.ok(xs[0] < 240 && xs[4] < 240, "both on the left half of the ball");
  for (const [a, b] of [[0, 1], [1, 2], [2, 3], [4, 5], [5, 6], [6, 7]]) assert.ok(xs[b] > xs[a], `band moves right from frame ${a + 1} to ${b + 1}`);
  assert.ok(xs[3] > 240 && xs[7] > 240, "frames 4 and 8 reach the right edge");
  assert.ok(LESSON_COPY["lesson.11.step.1"].includes("בשניהם ליד הקצה השמאלי"));
  assert.ok(LESSON_COPY["lesson.11.step.2"].includes("ימינה"));
});

test("plural keys for the lesson progress label (K11) and the new WS3 strings exist", () => {
  assert.equal(STRINGS["lessonMode.progress.aria.one"], "פריים ריק אחד מתוך {total} צויר");
  assert.ok(STRINGS["lessonMode.progress.aria.other"].includes("{done}"));
  assert.ok(STRINGS["lessonDone.toast"].includes("{n}"));
  assert.ok(STRINGS["challenge.stamp.toast"]);
  assert.equal(LESSONS.reduce((n, l) => n + blankCount(l), 0), 70);
});
