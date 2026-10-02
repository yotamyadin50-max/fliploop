# Integration notes: FlipLoop fix round 2026-10

**Role:** Developer, integrator · **Date:** 2026-10-02 · **Branch:** `main` (local only, NOT pushed, nothing deployed) · **Base:** `27a84ea` "Fix round base"
**Binding file:** `_process/12-fix-direction.md` sections 5, 6, 10, 11. **Inputs:** the six `_process/fix-wsN.md` files (now on `main`).
**Server for all checks:** Node static server on `127.0.0.1:9410` (never Python's `http.server`). **Browser:** installed Chrome through Playwright 1.49.1 (headless), plus Playwright WebKit. **Scripts:** scratchpad `pw2/integ/`.

This file is written as the work goes; the status line of each section says whether it is finished.

## 1. Merge log (finished)

Merged straight into `main` with `git merge --no-ff`, in the binding order. After each merge: `node tools/build-strings.mjs`, `node --test "tests/*.test.mjs"`, and a real-browser smoke run (six screens, new animation, two strokes, add a frame, Play, Stop, GIF export to its preview, lesson 1 into the Editor, Gallery; service workers blocked).

| # | Branch | Commit on `main` | Conflicts | Unit tests after | Smoke after |
|---|---|---|---|---|---|
| 1 | `fix/ws1` | `2c62886` | none | 25 pass | 0 console errors, no horizontal scroll |
| 2 | `fix/ws2` | `20c173f` | `site/js/data/strings.js` (generated): took ours, regenerated (524 UI keys) | 33 pass | 0 errors |
| 3 | `fix/ws4` | `6fc3011` | `strings.js` (generated): regenerated (529 keys) | 41 pass | 0 errors |
| 4 | `fix/ws3` | `1f1bfb2` | `strings.js` (generated): regenerated (534 keys) | 48 pass | 0 errors |
| 5 | `fix/ws5` | `b9f2844` | `strings.js` (generated): regenerated (562 keys) | 59 pass | 0 errors, 0 CSP violations (the `<meta>` policy is live from here on) |
| 6 | `fix/ws6` | see `git log` | none reported by git; `strings.js` and `themes.js` regenerated (566 keys, 52 themes) | 63 pass | 0 errors, 0 CSP violations |

`editor.js`, `style.css`, `app.js` and `final-ui-copy.md` merged without a textual conflict in all six merges: the per-method and per-section ownership of section 5 held. No conflict outside the generated files, so no ownership rule was broken at the text level. (Behavioural overlaps are in section 2.)

