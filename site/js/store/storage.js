// Storage status and warnings (plan d): persist(), estimate(), W1, W2, W2b.
import { getSettings, updateSettings } from "./settings.js";
import { emit } from "../lib/bus.js";

const W2_RATIO = 0.8;
const W2B_RATIO = 0.95;
const W2_MIN_INTERVAL = 60000;
const WEEK = 7 * 86400000;

let lastW2Check = 0;
let lastEstimate = null;

export async function estimate() {
  if (!navigator.storage?.estimate) return null;
  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    if (!quota) return null;
    lastEstimate = { usage, quota, ratio: usage / quota };
    return lastEstimate;
  } catch {
    return null;
  }
}

/** W2: checked on load and after saves, at most once per 60 s. Emits "w2" with the ratio. */
export async function checkNearlyFull({ force = false } = {}) {
  const now = Date.now();
  if (!force && now - lastW2Check < W2_MIN_INTERVAL) return lastEstimate;
  lastW2Check = now;
  const e = await estimate();
  emit("w2", e && e.ratio >= W2_RATIO ? e : null);
  return e;
}

/** W2b: adding frames or projects is blocked at 95%. */
export async function isFull() {
  const e = await estimate();
  return !!e && e.ratio >= W2B_RATIO;
}

/** Would `bytes` more still fit under the 95% line? */
export async function hasRoomFor(bytes) {
  const e = await estimate();
  if (!e) return true;
  return e.usage + bytes <= e.quota * W2B_RATIO;
}

export async function persisted() {
  try {
    return navigator.storage?.persisted ? await navigator.storage.persisted() : false;
  } catch {
    return false;
  }
}

/** Re-read silently on each load: it can flip after a bookmark or install. */
export async function refreshPersisted() {
  const granted = await persisted();
  if (granted !== getSettings().persistGranted) await updateSettings({ persistGranted: granted });
  return granted;
}

/** Called once, after the first successful save of a project that has at least one stroke. */
export async function requestPersistOnce() {
  if (getSettings().persistRequested || !navigator.storage?.persist) return;
  await updateSettings({ persistRequested: true });
  try {
    const granted = await navigator.storage.persist();
    await updateSettings({ persistGranted: granted });
  } catch {
    /* the browser declined silently; W1 keeps telling the user */
  }
}

/**
 * W1 (not protected): shown when storage is not persisted and at least one project exists.
 * After a dismissal it returns once the reference time (the later of the last backup and
 * the dismissal) is more than 7 days old and a project changed after it.
 */
export function shouldShowW1(projects, isPersisted, now = Date.now()) {
  if (isPersisted || !projects.length) return false;
  const s = getSettings();
  if (!s.w1DismissedAt) return true;
  const reference = Math.max(s.lastBackupAt || 0, s.w1DismissedAt || 0);
  const changedSince = projects.some((p) => p.updatedAt > reference);
  return now - reference > WEEK && changedSince;
}
