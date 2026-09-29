// Weekly challenge math (plan 7). Deterministic, no server: epoch Sunday 2026-01-04.
const EPOCH_UTC = Date.UTC(2026, 0, 4);
const DAY_MS = 86400000;

/** Whole local calendar days since the epoch. Date.UTC keeps daylight saving out of it. */
export function daysSinceEpoch(date) {
  const today = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((today - EPOCH_UTC) / DAY_MS);
}

const mod = (a, n) => ((a % n) + n) % n;

export function weekInfo(date, themeCount = 52) {
  const days = daysSinceEpoch(date);
  const weekIndex = Math.floor(days / 7);
  const daysSinceSunday = mod(days, 7);
  return {
    days,
    weekIndex,
    themeIndex: mod(weekIndex, themeCount),
    weekLabel: weekIndex + 1,
    hasWeekNumber: weekIndex >= 0,
    daysLeft: 7 - daysSinceSunday,
  };
}
