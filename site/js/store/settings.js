// meta.settings and meta.progress, cached in memory, written through to IndexedDB.
// Every write is read-merge-write inside one transaction (fix round R3), so two tabs never
// overwrite each other: settings merge key by key, progress is a union of stamps.
import { getMeta, updateMeta } from "./db.js";
import { emit } from "../lib/bus.js";

const DEFAULT_SETTINGS = {
  coach1Seen: false,
  coach2Seen: false,
  coach3Seen: false,
  firstPlaySeen: false,
  lastBackupAt: null,
  persistRequested: false,
  persistGranted: false,
  printPaper: "A4",
  w1DismissedAt: null,
  recentColors: [], // uppercase hex, newest first, max RECENT_MAX, never a base swatch
  shadesOpen: false, // phone colors sheet: shade chart expanded
  letterShortcuts: true, // single-letter Editor shortcuts (B, E, G, V, 1, 2, 3, O, N, D); WCAG 2.1.4
};
export const RECENT_MAX = 7;
const HEX = /^#[0-9A-F]{6}$/;

/** Clean list: valid uppercase hex, no duplicates, at most RECENT_MAX. Folds in the
 *  pre-palette single `recentColor` value if an older build ever stored one. */
function normalizeRecent(s) {
  const raw = [...(Array.isArray(s.recentColors) ? s.recentColors : []), ...(typeof s.recentColor === "string" ? [s.recentColor] : [])];
  const out = [];
  for (const c of raw) {
    const up = typeof c === "string" ? c.toUpperCase() : "";
    if (HEX.test(up) && !out.includes(up)) out.push(up);
  }
  delete s.recentColor;
  s.recentColors = out.slice(0, RECENT_MAX);
  return s;
}
const DEFAULT_PROGRESS = { lessonsDone: {}, challengeWeeks: [] };

/** Keeps only what a progress record may hold: lessons 1 to 12 with a date, whole week numbers
 *  (a week number is negative on a device whose clock is before 2026). */
export function cleanProgress(p) {
  const out = structuredClone(DEFAULT_PROGRESS);
  if (!p || typeof p !== "object") return out;
  const done = p.lessonsDone && typeof p.lessonsDone === "object" ? p.lessonsDone : {};
  for (let n = 1; n <= 12; n++) {
    const at = done[n];
    if (typeof at === "string" && !Number.isNaN(Date.parse(at))) out.lessonsDone[n] = at;
  }
  const weeks = Array.isArray(p.challengeWeeks) ? p.challengeWeeks : [];
  for (const w of weeks) if (Number.isInteger(w) && !out.challengeWeeks.includes(w)) out.challengeWeeks.push(w);
  out.challengeWeeks.sort((a, b) => a - b);
  return out;
}

/** Union of two progress records: every stamp of both, the earliest date of each lesson wins. */
export function mergeProgress(a, b) {
  const x = cleanProgress(a), y = cleanProgress(b);
  const out = { lessonsDone: { ...x.lessonsDone }, challengeWeeks: [...x.challengeWeeks] };
  for (const [n, at] of Object.entries(y.lessonsDone)) {
    if (!out.lessonsDone[n] || Date.parse(at) < Date.parse(out.lessonsDone[n])) out.lessonsDone[n] = at;
  }
  for (const w of y.challengeWeeks) if (!out.challengeWeeks.includes(w)) out.challengeWeeks.push(w);
  out.challengeWeeks.sort((p, q) => p - q);
  return out;
}

let settings = { ...DEFAULT_SETTINGS };
let progress = structuredClone(DEFAULT_PROGRESS);
let dbOk = true;
const pendingPatches = []; // settings patches whose write has not committed yet

export async function loadSettings() {
  try {
    settings = normalizeRecent({ ...DEFAULT_SETTINGS, ...((await getMeta("settings")) || {}) });
    progress = { ...structuredClone(DEFAULT_PROGRESS), ...((await getMeta("progress")) || {}) };
    dbOk = true;
  } catch (err) {
    dbOk = false;
    if (err && typeof err === "object") err.handled = true; // boot shows the storage banner
    console.warn("Settings could not be read; using defaults for this session.", err);
  }
}

export function getSettings() {
  return settings;
}

export function getProgress() {
  return progress;
}

export async function updateSettings(patch) {
  settings = { ...settings, ...patch };
  emit("settings", settings);
  if (!dbOk) return;
  pendingPatches.push(patch);
  try {
    const stored = await updateMeta("settings", (now) => ({ ...(now || {}), ...patch }));
    pendingPatches.splice(pendingPatches.indexOf(patch), 1);
    // What is stored now (it may hold another tab's changes), plus our own patches still on their way.
    settings = normalizeRecent(Object.assign({ ...DEFAULT_SETTINGS, ...stored }, ...pendingPatches));
  } catch (err) {
    pendingPatches.splice(pendingPatches.indexOf(patch), 1);
    if (err && typeof err === "object") err.handled = true; // a setting, not the user's work: stay quiet
    console.warn("Settings write failed", err);
  }
}

export async function updateProgress(mutator) {
  mutator(progress);
  emit("progress", progress);
  if (!dbOk) return;
  try {
    const mine = progress;
    const merged = await updateMeta("progress", (now) => mergeProgress(now, mine));
    // Keep whatever the mutators added since, then take in the stored (merged) stamps.
    progress = mergeProgress(merged, progress);
    emit("progress", progress);
  } catch (err) {
    if (err && typeof err === "object") err.handled = true;
    console.warn("Progress write failed", err);
  }
}

/** Moves hex to the front of recentColors (the caller skips base swatches). */
export function rememberColor(hex) {
  const up = hex.toUpperCase();
  const list = [up, ...(settings.recentColors || []).filter((c) => c !== up)].slice(0, RECENT_MAX);
  if (list.join() === (settings.recentColors || []).join()) return Promise.resolve();
  return updateSettings({ recentColors: list });
}

export function lessonsDoneCount() {
  return Object.keys(progress.lessonsDone).length;
}

export async function resetTips() {
  await updateSettings({ coach1Seen: false, coach2Seen: false, coach3Seen: false, firstPlaySeen: false });
}
