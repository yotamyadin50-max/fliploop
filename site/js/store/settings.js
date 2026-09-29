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
};
const DEFAULT_PROGRESS = { lessonsDone: {}, challengeWeeks: [] };

let settings = { ...DEFAULT_SETTINGS };
let progress = structuredClone(DEFAULT_PROGRESS);
let dbOk = true;

export async function loadSettings() {
  try {
    settings = { ...DEFAULT_SETTINGS, ...((await getMeta("settings")) || {}) };
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

export function lessonsDoneCount() {
  return Object.keys(progress.lessonsDone).length;
}

export async function resetTips() {
  await updateSettings({ coach1Seen: false, coach2Seen: false, coach3Seen: false, firstPlaySeen: false });
}
