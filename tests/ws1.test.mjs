// node --test "tests/*.test.mjs"   (WS1 fix round: the DOM-free parts of the storage layer)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { mergeProgress, cleanProgress, updateSettings, getSettings } from "../site/js/store/settings.js";
import { parseImport, ImportError } from "../site/js/store/project-file.js";
import { shouldShowW1 } from "../site/js/store/storage.js";
import { defaultTitle } from "../site/js/store/projects.js";
import { STRINGS } from "../site/js/data/strings.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PNG = "data:image/png;base64,iVBORw0KGgo=";
const entry = (over = {}, frames = 2) => ({
  project: { id: "p-1", title: "ציור", kind: "free", width: 480, height: 360, fps: 12, playMode: "loop", frameOrder: [], updatedAt: 1000, createdAt: 900, schemaVersion: 1, ...over },
  frames: Array.from({ length: frames }, (_, i) => ({ id: `f-${i}`, hold: 1, lessonRole: "free", locked: false, png: PNG })),
});
const backup = (projects, extra = {}) => JSON.stringify({ format: "fliploop-backup", schemaVersion: 1, projects, ...extra });

test("progress merge: a union of stamps, the earliest date of a lesson wins (R3, R6)", () => {
  const a = { lessonsDone: { 1: "2026-10-01T10:00:00.000Z", 2: "2026-10-02T09:00:00.000Z" }, challengeWeeks: [38] };
  const b = { lessonsDone: { 2: "2026-10-01T11:00:00.000Z", 5: "2026-09-20T08:00:00.000Z" }, challengeWeeks: [37, 38] };
  const m = mergeProgress(a, b);
  assert.deepEqual(m.lessonsDone, { 1: "2026-10-01T10:00:00.000Z", 2: "2026-10-01T11:00:00.000Z", 5: "2026-09-20T08:00:00.000Z" });
  assert.deepEqual(m.challengeWeeks, [37, 38]);
  assert.deepEqual(mergeProgress(b, a), m); // the order of the two tabs does not matter
  assert.deepEqual(mergeProgress(undefined, a), cleanProgress(a)); // nothing stored yet
});

test("progress from a file is cleaned: lessons 1 to 12 with a real date, whole week numbers", () => {
  const p = cleanProgress({ lessonsDone: { 0: "2026-01-01", 3: "not a date", 4: "2026-10-01T10:00:00.000Z", 13: "2026-10-01", __proto__: { 7: "x" } }, challengeWeeks: [38, "39", 38, 2.5, -1], extra: true });
  assert.deepEqual(p, { lessonsDone: { 4: "2026-10-01T10:00:00.000Z" }, challengeWeeks: [-1, 38] });
  assert.deepEqual(cleanProgress(null), { lessonsDone: {}, challengeWeeks: [] });
  assert.deepEqual(cleanProgress({ lessonsDone: [], challengeWeeks: "x" }), { lessonsDone: {}, challengeWeeks: [] });
});

test("import: a backup with a bad entry keeps the valid ones and counts the bad one (R6)", () => {
  const bad = entry({ id: "p-2" });
  delete bad.project.title;
  const r = parseImport(backup([entry(), bad, null]));
  assert.equal(r.entries.length, 1);
  assert.equal(r.bad, 2);
  assert.equal(r.progress, null); // an old backup has no stamps and still imports
  assert.equal(r.backup, true);
});

test("import: a backup carries the stamps; a stamps-only backup is still a backup", () => {
  const progress = { lessonsDone: { 1: "2026-10-01T10:00:00.000Z" }, challengeWeeks: [38] };
  const r = parseImport(backup([entry()], { progress }));
  assert.deepEqual(r.progress, progress);
  const only = parseImport(backup([], { progress }));
  assert.equal(only.entries.length, 0);
  assert.deepEqual(only.progress, progress);
  assert.throws(() => parseImport(backup([])), (e) => e instanceof ImportError && e.code === "invalid");
  assert.throws(() => parseImport(backup([], { progress: { lessonsDone: {}, challengeWeeks: [] } })), (e) => e.code === "invalid");
});

test("import: single files, schema versions, frame ids and the frame cap", () => {
  const one = parseImport(JSON.stringify({ format: "fliploop-project", schemaVersion: 1, ...entry() }));
  assert.equal(one.entries.length, 1);
  assert.equal(one.bad, 0);
  assert.equal(one.backup, false);
  assert.throws(() => parseImport("not json"), (e) => e.code === "invalid");
  assert.throws(() => parseImport(JSON.stringify({ schemaVersion: 2, ...entry() })), (e) => e.code === "newer");
  assert.throws(() => parseImport(JSON.stringify({ schemaVersion: 1, ...entry({ width: 1920, height: 1080 }) })), (e) => e.code === "invalid");
  // frame ids are never trusted any more, so a file without them is fine
  const noIds = entry();
  noIds.frames.forEach((f) => { delete f.id; });
  assert.equal(parseImport(JSON.stringify({ schemaVersion: 1, ...noIds })).entries.length, 1);
  // a project that passed the 120 cap by a frame or two before the fix (F6) must still restore
  assert.equal(parseImport(backup([entry({}, 122)])).entries.length, 1);
  assert.throws(() => parseImport(backup([entry({}, 131)])), (e) => e.code === "invalid");
  assert.throws(() => parseImport(backup([entry({}, 0)])), (e) => e.code === "invalid");
  // an id the router cannot open is not a reason to refuse the file (it gets a new id at import)
  assert.equal(parseImport(JSON.stringify({ schemaVersion: 1, ...entry({ id: "my project/1" }) })).entries.length, 1);
});

test("W1 after a backup: gone at once, back after 7 days only if something changed (R7)", async () => {
  const now = 1_800_000_000_000;
  const day = 86400000;
  const projects = [{ updatedAt: now - day }];
  await updateSettings({ w1DismissedAt: null, lastBackupAt: null });
  assert.equal(shouldShowW1(projects, false, now), true);
  assert.equal(shouldShowW1(projects, true, now), false); // protected storage: never
  // what downloadBackup() stores: the backup is the dismissal
  await updateSettings({ w1DismissedAt: now, lastBackupAt: now });
  assert.equal(getSettings().lastBackupAt, now);
  assert.equal(shouldShowW1(projects, false, now + 1000), false);
  assert.equal(shouldShowW1(projects, false, now + 8 * day), false); // nothing changed since the backup
  assert.equal(shouldShowW1([{ updatedAt: now + 2 * day }], false, now + 6 * day), false); // changed, but not 7 days yet
  assert.equal(shouldShowW1([{ updatedAt: now + 2 * day }], false, now + 8 * day), true);
});

test("default title counts free projects and stays unique", () => {
  const t1 = defaultTitle([]);
  assert.match(t1, /1$/);
  const list = [{ id: "a", kind: "free", title: t1 }, { id: "b", kind: "lesson", title: "שיעור" }];
  assert.match(defaultTitle(list), /2$/);
  assert.equal(defaultTitle(list, "a"), t1); // the project itself does not count
  assert.match(defaultTitle([{ id: "a", kind: "free", title: defaultTitle(list) }]), /3$/); // "…2" is taken: raised until unique
});

test("every string key WS1 code asks for exists in the generated strings", () => {
  const files = [
    ...readdirSync(join(root, "site/js/store")).map((f) => `site/js/store/${f}`),
    "site/js/ui/warnings.js", "site/js/screens/gallery.js", "site/js/screens/settings.js", "site/js/app.js",
  ];
  const missing = [];
  for (const f of files) {
    const src = readFileSync(join(root, f), "utf8");
    for (const m of src.matchAll(/\bt\(\s*"([^"]+)"/g)) if (!(m[1] in STRINGS)) missing.push(`${f}: ${m[1]}`);
    for (const m of src.matchAll(/\btp\(\s*"([^"]+)"/g)) {
      for (const suffix of [".one", ".other"]) if (!(`${m[1]}${suffix}` in STRINGS)) missing.push(`${f}: ${m[1]}${suffix}`);
    }
  }
  assert.deepEqual(missing, []);
  // the keys WS1 uses inside editor.js (a shared file, so listed by hand)
  for (const k of ["conflict.title", "conflict.body", "conflict.reload", "conflict.download", "editor.loadFailed.title", "storage.readFailed.body", "storage.readFailed.retry", "w3.left", "w3.action"]) {
    assert.ok(k in STRINGS, k);
  }
});
