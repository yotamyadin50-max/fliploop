// node --test "tests/*.test.mjs"   (fix round WS6: copy contracts that need no DOM)
import { test } from "node:test";
import assert from "node:assert/strict";

import { STRINGS } from "../site/js/data/strings.js";
import { t, tp } from "../site/js/lib/i18n.js";

test("copy: 'ביטול' means Cancel only (R38)", () => {
  assert.equal(STRINGS["tool.undo"], "אחורה");
  assert.equal(STRINGS["tool.redo"], "קדימה");
  assert.equal(STRINGS["common.undo"], "להחזיר");
  for (const [key, value] of Object.entries(STRINGS)) {
    if (value === "ביטול") assert.match(key, /(^|\.)cancel$/, `${key} says "ביטול" but is not a cancel key`);
    if (/^tool\.(undo|redo)/.test(key)) assert.ok(!value.includes("ביטול"), `${key} still says "ביטול"`);
  }
});

test("copy: the accessible name starts with the visible label (WCAG 2.5.3)", () => {
  for (const key of ["home", "gallery", "challenge", "lesson", "lessons", "editor"]) {
    const label = STRINGS[`common.back.${key}`];
    assert.ok(STRINGS[`common.back.${key}.aria`].startsWith(label), `common.back.${key}.aria`);
    assert.ok([...label].length <= 8, `Back label "${label}" is over 8 characters`);
  }
  assert.ok(STRINGS["clearFrame.aria"].startsWith(STRINGS["clearFrame"]));
  assert.ok(STRINGS["canvasSize.wide.aria"].startsWith(STRINGS["canvasSize.wide"]));
  assert.ok(STRINGS["canvasSize.square.aria"].startsWith(STRINGS["canvasSize.square"]));
  assert.ok(STRINGS["tool.undo.disabled.aria"].startsWith(STRINGS["tool.undo"]));
  assert.ok(STRINGS["tool.redo.disabled.aria"].startsWith(STRINGS["tool.redo"]));
  assert.ok(STRINGS["onion.toggle.on.aria"].startsWith(STRINGS["onion.toggle"]));
  assert.ok(STRINGS["onion.toggle.off.aria"].startsWith(STRINGS["onion.toggle"]));
  assert.equal(STRINGS["print.action.pngSheet.aria"], STRINGS["print.action.pngSheet"]);
  assert.equal(STRINGS["home.continue.aria"], STRINGS["home.continue"]);
});

test("copy: contracts with the other workstreams (K6, K11) and the play glyph (R41)", () => {
  assert.ok(STRINGS["export.done.project"].includes("{title}"));
  assert.ok(!STRINGS["export.done.project"].includes("{filename}"));
  assert.equal(t("export.done.project", { title: "כדור", filename: "x.json" }), 'קובץ הפרויקט של "כדור" ירד.');
  assert.equal(tp("home.cta.lessons.aria", 1, { done: 1 }), STRINGS["home.cta.lessons.aria.one"]);
  assert.ok(tp("home.cta.lessons.aria", 0, { done: 0 }).includes("0"));
  assert.ok(tp("home.cta.lessons.aria", 5, { done: 5 }).includes("5"));
  // U+25B6 with U+FE0E (text presentation), so the glyph is never drawn as a colour emoji.
  for (const key of ["coach.3", "lessonMode.nudgePlay"]) assert.ok(STRINGS[key].includes("▶︎"), key);
  assert.equal(STRINGS["meta.title.pattern"], "{screen} · FlipLoop");
  for (const key of ["home.art.pause.aria", "home.art.play.aria"]) assert.ok(STRINGS[key]);
});

test("copy: one name per thing (R40) and 'אתגר {week}' (R20)", () => {
  for (const key of ["gallery.h1", "meta.title.gallery", "home.nav.gallery"]) assert.equal(STRINGS[key], "הגלריה שלי", key);
  assert.equal(STRINGS["settings.backup"], STRINGS["gallery.backup"]);
  assert.equal(STRINGS["w1.action"], STRINGS["gallery.backup"]);
  assert.equal(STRINGS["settings.import"], STRINGS["gallery.import"]);
  for (const [key, value] of Object.entries(STRINGS)) assert.ok(!/הקיש|הקשה/.test(value), `${key} still says tap as "הקשה"`);
  for (const v of ["other", "two", "last"]) assert.ok(STRINGS[`challenge.meta.days.${v}`].startsWith("אתגר {week}"), v);
  assert.ok(STRINGS["challenge.stamp.aria"].startsWith("אתגר {week}"));
});
