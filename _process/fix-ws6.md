# Fix round WS6: layout, visual drift, accessibility markup, navigation, UI copy

**Role:** Developer · **Branch:** `fix/ws6` · **Worktree:** `.worktrees/ws6` · **Server:** `http://127.0.0.1:9406` (from `site/`) · **Date:** 2026-10-01
**Binding file:** `_process/12-fix-direction.md` (sections 0, 1, 2, 3, 5, 6, WS6 in 7, 8).
**Scripts and screenshots (scratch, not project files):** `scratchpad/pw2/fix-ws6/` (`lib.mjs`, `r01` ... scripts, `shots/before-*.png` and `shots/after-*.png`).
**Method:** real Chrome through Playwright (`channel: "chrome"`, headless), `serviceWorkers: "block"`, `locale: "he-IL"`, real mouse and keyboard input, a fresh context per scenario. Each item was reproduced on the untouched branch first (`TAG=before`), then re-run after the fix (`TAG=after`). WebKit runs are named where they were done.

**One test artefact, said once:** with service workers blocked, Playwright makes `navigator.serviceWorker.register()` resolve to `undefined`, and the frozen `js/pwa.js` then throws `Cannot read properties of undefined (reading 'waiting')` once per page load. It is on the untouched base as well, it is not caused by any WS6 change, and it does not happen with a real service worker. Every "0 console errors" below counts all other errors; this one is listed under "noticed outside my area".

This file is written as the work goes, so it is complete up to the last committed group.

---

## Items

| ID | Reproduced | What changed | Checks, measured | Not done |
|---|---|---|---|---|
