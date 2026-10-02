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
| 6 | `fix/ws6` | `d3778b4` | none reported by git; `strings.js` and `themes.js` regenerated (566 keys, 52 themes) | 63 pass | 0 errors, 0 CSP violations |

`editor.js`, `style.css`, `app.js` and `final-ui-copy.md` merged without a textual conflict in all six merges: the per-method and per-section ownership of section 5 held. No conflict outside the generated files, so no ownership rule was broken at the text level. (Behavioural overlaps are in section 2.)

The plan in `12-fix-direction.md` section 10 names a branch `fix/integration`; the integrator's spawn instruction said to merge into `main`, so the merges are on `main`. Nothing is pushed, so `origin/main`, GitHub Pages and Netlify still serve `a87cb93`. The six worktrees and branches are left in place.

## 2. Contracts wired (finished)

Commits `193997f` and `75cb06a`. Each row was checked on the merged build with real input (`pw2/integ/k.mjs`, 50 checks, and `k3b.mjs`, 7 checks; all pass, 0 console errors).

| # | State after the merge | What the integrator did | Measured on the merged build |
|---|---|---|---|
| K1 | Both ends already met: `store/db.js` marks every error `storage` and fires the bus event `storage-error` (deferred, so a caller can set `handled`); `app.js watchStorageErrors()` shows one toast; `LessonScreen.start()` and `ChallengeScreen.start()` catch and log; `Router.createNew()` skips its generic toast on `err.storage` and restores the hash. WS3's worry (the message must not depend on `unhandledrejection`) is met: it comes from the bus event. | nothing | With `indexedDB.open` throwing: Home shows the "cannot save here" banner; "אנימציה חדשה" gives exactly one toast (the storage one, not the generic one) and the hash is back on `#/`; a second tap answers again; lesson start and challenge start each give the storage toast and the button is enabled again; 0 unhandled rejections |
| K2 | Met: Settings switch (WS1), `onKey` (WS2) | nothing | Default on; off: E, G, V, N, D, 3, O change nothing, Ctrl+Z still works; on again: E selects the eraser |
| K3 | Met for `owner` (clear-frame, frame toasts, lesson toasts) and `returnFocus` (frame delete, Gallery delete). One gap: after the Gallery's undo the toast closes before the card is back, so `returnFocus` found no card and focus stayed on the page heading | `gallery.js`: `focusRestoredCard()` moves focus from the heading to the restored card once it is on screen | Clear-frame toast closes when the Editor is left. Gallery delete by keyboard: focus on the toast action, toast still there 6 s later, Escape returns focus to the Gallery `h1`; Enter on the action restores the card and focus lands on that card |
| K4 | Met: `deleteFrame` sets `frameRestore`; `doUndo()`, `afterEdit()`, `refreshUndoButtons()`, `requestResize()` use and clear it | `editor.js afterEdit()`: when a newer step clears `frameRestore`, the frame trash is emptied too (a deleted frame whose toast is gone was otherwise kept in memory until the next delete) | Keyboard delete: focus on the toast action, undo key enabled. 6 s later (toast gone) a real Ctrl+Z restores the frame in its place (ids equal). Delete, then a stroke: `frameRestore` is `null` and Ctrl+Z undoes the stroke. IndexedDB: 3 frames in order, 3 frame records |
| K5 | Met: `clearFrame()` calls `lessonMode.paintPrepared` | nothing | Lesson 5: prepared 2,248 px, with a stroke 5,339 px, after "ניקוי הפריים" 2,248 px and 0 bytes differ from a fresh prepared raster; progress back to "0/8"; the toast's undo brings the stroke back; clearing an untouched prepared frame makes no step and no toast |
| K6 | Met at all five call sites (`editor.downloadFromMemory`, the unsaved-work toast, Gallery menu, W2b, export overlay) | nothing | Title "שלום John 12": all four reachable sites show `קובץ הפרויקט של "שלום John 12" ירד.`, no raw `{title}` or `{filename}` |
| K7 | Met: `open`, `rename`, `minus` in `icons.js`; Gallery uses `open`, `rename`, `more` | nothing | All five menu items have a drawn icon; the card button shows the horizontal dots. Screenshot looked at |
| K8 | Met: `toolTap()` passes `side: this.tools` | nothing | Pencil and eraser width popovers at 1280x800: rect 844..1184, rail 1192..1264: covers neither rail nor panel. Screenshot looked at |
| K9 | Met: `data-light` (WS2) and its ring (WS6) | nothing | White swatch and 6 light shade tiles carry `inset 0 0 0 1px rgba(31,30,27,.45)`. Screenshot looked at. (Red 1, purple 1, pink 1 stay just under the 0.8 line, as WS2 noted) |
| K10 | Met for the card link. The menu's "לפתוח" did not set the class | `gallery.js`: the menu item sets `is-opening` on its card too | Click on the card: class set, thumbnail `view-transition-name: vt-canvas` |
| K11 | Three old unsuffixed rows still in the copy file, unused | Removed from `final-ui-copy.md`: `home.cta.lessons.aria`, `strip.counter.aria`, `lessonMode.progress.aria`, and the three rows replaced by renamed families: `confirm.resize.body`, `print.file.pdf`, `print.file.png`. Strings regenerated: 560 UI keys | "פריים אחד מתוך 120" at 1 frame, "2 פריימים מתוך 120" at 2; "שיעורים, 0 מתוך 12 הושלמו"; "פריים ריק אחד מתוך 6 צויר". No "Missing string key" in any run |
| K12 | Two copies of one number (`START_DELAY` in `playback.js`, `PLAY_LEAD_MS` in `lesson-mode.js`) | `playback.js` exports `PLAY_LEAD_MS`; `lesson-mode.js` imports it | Lesson 1: sheet opens by itself 1,132 ms after Play (lead 360 + cycle 667 + half a frame) |
| K13 | Met (WS1 on both ends) | nothing | WS1's `r13 g03` on the merged build: undo after leaving and coming back shows the card |
| K14 | Met: sheets and the Export overlay focus their heading | nothing | Export overlay: focus on the `h2` (`tabindex="-1"`). A toast raised inside the overlay sits inside the dialog and is hit-testable. Screenshot looked at |
| K15 | Met: `Autosaver` surface unchanged | nothing | every caller runs (regression below) |

Also done in this step:

- **`js/pwa.js`** (frozen file, integrator's decision): `if (!reg) return null;` after `register()`. With service workers blocked, the page error "Cannot read properties of undefined (reading 'waiting')" is gone from every run. WS1's catch in `boot()` stays as a second net.
- **`editor.js`**: the unused `lessonText` import (WS2's note) is removed.
- **WS6's two selectors against WS1's status markup:** `.topbar > .save-status` matches (the status is a direct child of the top bar). `.save-status > span` matches the saved and saving states; in the failed state the words sit inside WS1's button, so the rule missed them. Added `.save-status__btn > span` to the same rule (`style.css`, WS6's block).
- **WS6's eight rules on other owners' selectors:** checked in the layout sweep (section 3): Play is 48 px at 320 px, the fps segments 40 px, the landscape strip and playbar share one row, no overlap anywhere.
- **`?v=`:** `index.html` has three tags (`style.css`, `fonts.js`, `app.js`), all now `?v=10`. `404.html` has none. `node tools/build-sw-manifest.mjs`: 73 files, `404.html` and `js/fonts.js` in the list; `--check` passes.

