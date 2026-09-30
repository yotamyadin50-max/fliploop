// meta.settings and meta.progress, cached in memory, written through to IndexedDB.
import { getMeta, setMeta } from "./db.js";
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

let settings = { ...DEFAULT_SETTINGS };
let progress = structuredClone(DEFAULT_PROGRESS);
let dbOk = true;

export async function loadSettings() {
  try {
    settings = normalizeRecent({ ...DEFAULT_SETTINGS, ...((await getMeta("settings")) || {}) });
    progress = { ...structuredClone(DEFAULT_PROGRESS), ...((await getMeta("progress")) || {}) };
  } catch (err) {
    dbOk = false;
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
  try {
    await setMeta("settings", settings);
  } catch (err) {
    console.warn("Settings write failed", err);
  }
}

export async function updateProgress(mutator) {
  mutator(progress);
  emit("progress", progress);
  if (!dbOk) return;
  try {
    await setMeta("progress", progress);
  } catch (err) {
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
