# Integration notes: FlipLoop fix round 2026-10

**Role:** Developer, integrator · **Date:** 2026-10-02 · **Branch:** `main` (local only, NOT pushed, nothing deployed) · **Base:** `27a84ea` "Fix round base"
**Binding file:** `_process/12-fix-direction.md` sections 5, 6, 10, 11. **Inputs:** the six `_process/fix-wsN.md` files (now on `main`).
**Server for all checks:** Node static server on `127.0.0.1:9410` (never Python's `http.server`). **Browser:** installed Chrome through Playwright 1.49.1 (headless), plus Playwright WebKit. **Scripts:** scratchpad `pw2/integ/`.

Written as the work went. All sections are finished. Short answer: six merges with no conflict outside the generated string files, every contract meets on both ends, the full regression is green, nothing is pushed or deployed.

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

## 3. Regression on the merged build (finished)

**Build under test:** `main` at `b2bd595` (the last code change), `sw.js` version `6ab07c81f200`, 73 precached files.
**Servers (Node, `pw2/integ/serve.mjs`):** `9410` = `site/` with the response headers of `_headers` (the real `Content-Security-Policy` header plus the `<meta>` copy) and `404.html` with status 404 · `9411` = the same files under `/fliploop/`, no custom headers (the GitHub Pages shape: `<meta>` policy only) · `9401` to `9406` = the same files with the policy stripped, used ONLY to re-run the older workstream scripts that call `page.waitForFunction` (the policy refuses it).
**No bypass:** every script of mine (`pw2/integ/`) and every WS5 script ran on 9410 with the policy active and without `bypassCSP`. Policy violations were collected in every one of those runs: **0**.
**Input:** real mouse, keyboard and touch events (Playwright, CDP touch on the Pixel 7 profile). Results are read from IndexedDB, from frame pixels and from downloaded files, not from labels.

### 3.1 Summary table

| Area | Script(s) | Result |
|---|---|---|
| Unit tests | `node --test "tests/*.test.mjs"` | **63 pass, 0 fail** (17 core + 8 ws1 + 8 ws2 + 7 ws3 + 8 ws4 + 11 ws5 + 4 ws6) |
| Site audit | `python T-tools/06-scripts/audit-site.py O-output/40-fliploop/site` | clean, exit 0 |
| Manifest | `node tools/build-sw-manifest.mjs --check` | up to date (`6ab07c81f200`, 73 files; `404.html` and `js/fonts.js` in the list) |
| Contracts K1 to K15 | `k.mjs`, `k3b.mjs`, `probe-vt.mjs` | 50 + 7 + 7 checks, all pass |
| Full journey, real policy, workers blocked | `r-journey.mjs` | **59 of 59**, 0 console errors, 0 page errors, 0 missing string keys, 0 policy violations |
| The same journey with the REAL service worker | `FL_SW=allow r-journey.mjs` | **59 of 59**, same zeros |
| Offline, 404, fonts (root) | `r-sw.mjs offline` | **10 of 10** |
| The same under `/fliploop/` | `r-sw.mjs subpath` | **10 of 10** |
| Auto-update, real worker, two real version bumps | `r-sw.mjs update` | **19 of 19**; bumps reverted, `git status` clean, manifest check passes |
| Layout, 6 sizes | `r-layout.mjs` | **262 of 262**; 128 screenshots, six contact sheets looked at |
| WebKit (iPhone 13 profile and 1280x800) | `r-webkit.mjs` | **18 of 18** |
| Hand-over points between streams | `r-misc.mjs` | 5 of 5 |
| EX-01, six fresh Chrome processes | WS5's `ex01.mjs` x6, `an.mjs` | **6 of 6 clean** |
| WS1's own scripts on the merged build | 42 runs | as in `fix-ws1.md` (numbers in 3.2) |
| WS2's own scripts | 15 runs | as in `fix-ws2.md` |
| WS3's own scripts | 24 runs | as in `fix-ws3.md`; 12 of 12 lessons reach their stamp |
| WS4's own scripts | 9 runs, 116 checks | all pass (one flaky click target on the first run, clean on the re-run, see 3.4) |
| WS5's own scripts | 9 runs, 176 checks | 175 pass; 1 fails by design after R42 (see section 4) |
| WS6's own scripts | 8 runs | as in `fix-ws6.md` |

Not done the way `12-fix-direction.md` section 10 words it, said plainly: the ten auditors' original script folders (`pw2/audit-*`) were **not** re-run, except the tools auditor's six scripts that WS2 carried. Each workstream's own reproduce-then-verify scripts, which hold the repro of every finding, were re-run instead. The sweep is 6 sizes (the spawn instruction's list), not 11, and WebKit ran on two profiles, not three. Reduced motion was covered only by the workstream scripts that have a reduced-motion case (WS3 lesson pass, WS4 strip click during Play, WS6 Home art).

### 3.2 Every top finding, re-checked on the merged code

| Finding | Measured on the merged build |
|---|---|
| **J1** save honesty, reload and close | Label sampled every 50 ms over 20 strokes: it read "נשמר" in 232 of 395 samples (desktop) and 238 of 415 (Pixel 7), and in **none** of them did IndexedDB differ from the canvas. Stroke kept **3 of 3** after a reload at 50, 150, 300 and 1,000 ms and after closing the tab at 200 ms, desktop and Pixel 7 (30 runs). fps, mode, title, onion kept 3 of 3 each at 150 ms. With every IndexedDB write blocked from `pagehide` on, the stroke came back 3 of 3 from the rescue record alone. Worst time a finished stroke was missing from IndexedDB while drawing every 1.3 s: **240 ms**. Journey (both with and without the worker): reload 50, 150, 300 ms after a stroke keeps it, the label reads "שומרים…" right after the stroke, title and speed survive, a tab closed 200 ms after a stroke keeps it |
| **F2** change during a save | 4x CPU throttle: four fast Alt+Arrow moves 5 of 5, five fast hold "+" 5 of 5, fps tap during a write 5 of 5: IndexedDB equals the screen |
| **F4** two tabs | Audit repro: B reloaded itself to 3 frames, then saved: order 3, records 3, **orphans 0**. Unfinished stroke in B while A saves: B wrote nothing, the dialog offers both actions, the download holds B's drawing, "load the newer version" shows 3 frames. Stamps and settings from two tabs merged. Journey: the idle second tab followed by itself, 2 frames, 2 records |
| **S3** failed read | Gallery shows "לא הצלחנו לקרוא את העבודות" with a retry, never the empty state; Home shows the banner; the Editor shows "לא הצלחנו לפתוח את הציור"; backup gives a toast; **0 unhandled rejections**; after lifting the fault the retry shows the card and the Editor opens. Blocked storage, three variants: banner on Home, Gallery, Settings, every start action answers. `open()` that never answers: Home up after **3,231 ms** |
| **G-01** backup restores stamps | Clean profile after import: 22 projects, **12/12**, 4 starters, 2 challenge stamps, every `updatedAt` kept. Journey: a backup taken in one profile restores projects and stamps in a clean one, Home shows 2/12, a second import of the same file adds nothing |
| **T-01** fill leaks | **0 of 17** scenarios leak, outline pixel counts unchanged; 0 tinted rim pixels after yellow then blue and after red, blue, green; the tools auditor's own fill scripts as in the audit's "working" list. Journey: a second fill over paint keeps 2,685 outline pixels. WebKit: fill stays inside the box on both profiles |
| Canvas size | Wide, square, wide with no edit: **0, 0, 0** differing pixels; a frame edited while square keeps its stroke; hashes equal after a reload. Journey: four frames pixel-identical after the round trip. No size control in lessons 3, 6, 8 (panel and More sheet), and lesson 1 in the journey |
| Space plays | 4 of 4 focus situations play and open nothing; Space on the focused Play button plays then stops; Space in the title field types a space |
| Ctrl+Z mid-stroke | Undo steps 1 to 2, undoing the stroke gives 0 differing pixels; an arrow key mid-stroke does not move the frame; N, E, Space mid-stroke do nothing |
| **F3** drag reorder | Desktop, frame in the gate: **10 of 10**, control frames 3 of 3. Phone touch right after "+": **10 of 10**. Edge hold: frame 12 lands in slot 1 (phone), frame 24 in slot 1 (desktop). Long press 150, 350, 450, 700 ms: 9 of 9 checks |
| **F5 / F6** delete, undo, 120 cap | 7 of 7 delete and undo orders end in the original order, also after a reload. 120, delete, "+", undo: stays 120, counter "120/120", message shown; two delete toasts at the cap: 120 in memory and in IndexedDB |
| Lesson 9 | Drawn, no hold changed: the hold nudge; Play twice: the same nudge, no sheet, no stamp; after one "+" on a frame: sheet by itself at 1,277 ms |
| Lesson 11 text | Unit test "lesson 11 copy matches its stroke data" passes; in the Editor, prepared frames 1 and 5 hold the same band left of the ball centre (ink centroid x 213 against 239.5), the other six hold the circle only, which is what steps 1, 2 and 4 say |
| Stamp sheet | Opens by itself after one pass (lesson 1: 1,096 to 1,197 ms), never again on a later Play or Stop, not over another screen (3 of 3 leave-while-playing cases give the plain toast on the next screen), not under the Export overlay |
| **L-03** clear frame in a lesson | Lesson 5: stroke 3,814 px, after "ניקוי הפריים" **2,342 px = the prepared drawing alone**, progress "0/8", the toast's undo brings the stroke back. Clearing all 8 frames: still the prepared drawings, no stamp. This is the first time R16 runs end to end (WS2's call meets WS3's method) |
| All 12 lessons | **12 of 12** reach their stamp: 0/N to N/N, nudge, Play, sheet by itself between **938 and 1,516 ms**, right number and next link |
| **EX-01** first video export | Six fresh Chrome processes, "להקליט וידאו" pressed at once in four of them: **6 of 6 clean** (36 frame changes, 12 of 12 frames, 37 samples, longest sample gap 86 to 99 ms, header 3,030 to 3,047 ms), 0 errors, 0 policy violations. WS5's `reg.mjs`: 7 more fresh-browser first exports clean (24 fps three times, ping-pong, 4 s, 10 s with 121 samples, square), twice. Both journeys: first export a real MP4 |
| Export files | GIF89a 480x360, 6 frames, loops; MP4 with `ftyp`; project file JSON with 6 PNG frames and the title; PDF with header, EOF and the A4 media box; PNG sheet 2480x3508 with `pHYs` 11811. `ov.mjs` 37 of 37, `pr.mjs` 34 of 34, `misc.mjs` 18 of 18 |
| **A1** keyboard frame delete | Focus lands on the toast action, the undo key lights up, 6 s later (toast gone) a real Ctrl+Z restores the frame in its place; `t-toasts.mjs` 29 of 29 |
| **J5 / J6** Back and history | Home, Gallery, Editor, two in-app Backs: Home at history index 0, one more Back leaves the app (free, lesson and challenge chains). Back with a sheet open closes the sheet and the screen stays: 8 of 8 sheets plus the lesson steps sheet and three desktop popovers. Print "לציור" then Back lands on Home |
| **J7** empty projects | Two visits with nothing drawn: Gallery empty, no "המשך", one untouched record reused; after one stroke the card and the link appear. Untouched 25 h old: removed at launch |
| **J8** coach marks | `t-coach.mjs` 16 of 16. Journey: tip 1, "+" first then a stroke brings tip 2, a second drawn frame brings tip 3 |
| `selfTest` | `{count:12}`: gif, gifHalf, video, pdfA4, pdfLetter, pdfJpeg, pngA4 all ok in 7.8 s (video 79 samples, 3.28 s). `{count:120}`: all ok in 14.6 s (GIF 238 frames, video 244 samples and 10.12 s, PDF 16 pages). Same with the worker on |

### 3.3 Auto-update with a real service worker and two real bumps

Each bump: one comment appended to `site/css/style.css`, then `node tools/build-sw-manifest.mjs`; the page then called `registration.update()` once, which stands in for the app's own 60 s check (throttled to 5 minutes).

| Step | Measured |
|---|---|
| Start | version `6ab07c81f200` installed and controlling |
| Bump 1 (`37f3b8fd6b39`), found right after a stroke | `isBusy()` true at that moment. No reload in the 12 s after the last input. Reload by itself **21.9 s** after the last input, exactly **1** reload. New version controls the page. Ink per frame `[1088, 3917]` before and after, the same in IndexedDB. Frame 2, pencil, red, width L all restored. No toast left. No second reload in the next 9 s |
| Bump 2 (`0069af5fa410`), drawing without a pause | A stroke every 3.5 s: no reload, the "לרענן" toast appeared after **33.4 s**. One more stroke, then the toast action pressed while the Editor was dirty: saved first, **1** reload, ink `[1088, 11276]` on screen and in IndexedDB before and after, newest version in control, no further reload in 10 s, one shell cache left |
| After | both bumps reverted with `git checkout`, `--check` passes on `6ab07c81f200`, `git status` clean |

0 console errors, 0 page errors, 0 policy violations over the whole flow. The other cases of the Auto-update pass table (export running, file picker, two tabs, minimised window) were not re-run with a real worker; `isBusy()`, `flush()`, a failing save and leaving while dirty were re-checked through WS1's `r05-update-hooks.mjs`.

### 3.4 Offline, 404, subpath

After one online load with the worker in control (root and `/fliploop/`, 10 checks each): offline reload opens the Editor with both frames drawn · all eight screens render offline (Home, Gallery, Settings, Lessons, Lesson, Challenge, Print, Editor) · Rubik 400, 500, 700, Playpen Sans Hebrew 700 and Fredoka 600 load from the cache, Hebrew and Latin · a GIF export offline gives a real `GIF89a` 480x360 · a lesson exercise starts offline · an unknown path offline gives the Hebrew 404 page with status 404, and its link opens the app at `/` or at `/fliploop/` · an unknown path online gives the same page with status 404, not the shell. WS5's `shell.mjs`: 16 of 16 at the root and 16 of 16 under the subpath; `host404.mjs` 14 of 14.

### 3.5 Layout sweep

320x568, 390x844, 844x390, 768x1024, 1024x768, 1280x800, each on: Editor first run with coach, Editor with 5 frames and a mixed-direction title ("שלום John 050-1234567 ₪1,234"), Editor with a toast, playing, frame menu, colours sheet, shades open, More sheet (or the shades popover on desktop), Export overlay, Print, Home, Gallery, Gallery card menu, Settings top and bottom, Lessons top and bottom, Lesson 5, Challenge, lesson Editor with and without hints, Editor not-found. Checks: no horizontal page scroll, nothing outside the viewport, the Editor's rows (top bar, stage, tools, strip, playbar, goal strip, panel, steps card) do not overlap, the toast is on screen and clear of tools, strip, playbar and top bar, 0 policy violations. **262 of 262**, 0 console errors. All six contact sheets were opened and read; `844x390/03-editor-toast.png` and `21-editor-lesson-6-hints.png` at full size.

The 844x390 point WS6 raised: the toast sits 8 px above the shared strip and playbar row (measured by WS4's `place()`, not by the `--playbar` variable), covering only the bottom of the canvas area. Looked at.

### 3.6 WebKit smoke (Playwright WebKit on Windows, not real Safari)

iPhone 13 profile and 1280x800, no bypass, 9 checks each: six screens render with no horizontal scroll · drawing puts ink on the frame · fill colours the inside of a box and does not leak · Play runs and Stop stops · the drawing is saved · GIF export gives a real GIF · lesson 1 reaches its stamp with the sheet opening by itself · 0 console errors, 0 page errors, 0 policy violations. Screenshots looked at: the stamp sheet (number as the stamp, check badge on the rim), the Editor with tip 3 (the ▶ is a plain triangle, not an emoji). WS5's `wk.mjs` 16 of 16, WS3's glyph check as before. Mouse input was used on the iPhone profile (Playwright WebKit has no touch drag); video cannot be tested in this engine (no `MediaRecorder`).

### 3.7 What the regression found, and what was done

| Found | Where | Fix |
|---|---|---|
| After the Gallery's undo, keyboard focus stayed on the page heading, because the toast closes before the card is back | `k3b.mjs` | `gallery.js focusRestoredCard()` (section 2, K3). Re-run: focus lands on the restored card |
| Failed save status under 360 px showed its words (WS6's rule did not match WS1's button), and the button itself was 18 px wide inside a 44 px wrapper | `r-misc.mjs`, screenshot | `style.css`: the rule also hides `.save-status__btn > span`; the button gets `min-width: 44px`. Re-run: icon only, 44x44, words visible again at 390 |

Nothing else needed a code change. Three things that looked like failures and were the test, said so nobody chases them again:

- Playwright's `locator.click()` on the coach's X timed out in WebKit after an in-app arrival and then swallowed the next mouse events, which looked like "strokes do not land in desktop WebKit". A raw mouse click closes the coach and the stroke lands (`probe-wk3.mjs`, `probe-wk4.mjs`).
- WS4's F8 check clicks "two cells right of the gate" while the film moves; on the first run the click fell beside a frame. Re-run alone: 31 of 31.
- `page.goto(url, { waitUntil: "load" })` on a hash-only change sometimes waits out its timeout. Scripts now set `location.hash`.

## 4. Items from the six `fix-wsN.md` files that did not survive integration unchanged

No fix was lost or reverted by the merge. These statements in the six files are no longer true as written:

| File, item | What it says | What is true on `main` |
|---|---|---|
| `fix-ws5.md` 5.8 | "the toast names the same file" | Superseded by R42 (WS6): the toast names the project, `קובץ הפרויקט של "{title}" ירד.`. The file names themselves are exactly as 5.8 says (13 of 13 titles saved to disk under the name the app builds). WS5's `reg.mjs` reports this one check as failed for that reason only |
| `fix-ws2.md` 2.12 | colour well is `#1f1e1b` after a reload | WS1's view memory (F13) brings the last colour back after a reload, and the well follows it (`#0c45ab` in the run). Consistent, just different |
| `fix-ws2.md` 2.17, `fix-ws6.md` copy table | onion switch label "שכבת בצל פועלת / כבויה" | WS6's row: "להציג שכבת בצל: פועלת / כבויה". WS2's `r02-keys.mjs` prints "OUT OF SYNC" because it compares against the old words; state, `aria-checked` and label agree |
| `fix-ws1.md` 1.5 "Two leftovers", 1.26 | generic toast and stuck `#/new`; no icon for "לפתוח" and "לשנות שם" | Closed by WS6 and WS3 (K1, K7) |
| `fix-ws2.md` K4, K5, K8 rows; `fix-ws4.md` 4.13; `fix-ws3.md` 3.4; `fix-ws6.md` 6.6, 6.20, 6.22 | "no-op until X is merged", "simulated in the test" | All real now, and measured for real in section 2 and 3.2 |
| `fix-ws3.md` K12 | `PLAY_LEAD_MS` copied from `playback.js` | One exported constant |
| every file | page error "reading 'waiting'" in each blocked-worker run | Gone (`pwa.js` guard) |
| the workstream scripts that look for "ביטול" or "שחזור" on the undo keys (the tools auditor's `a-t05-undo.mjs`) | | The keys read "אחורה" and "קדימה" (R38). A copy of the script with the new words passes: 50 undo steps, undo all and redo all with 0 differing pixels |

Still open exactly as the workstreams left them (not integration losses): WS4's deviation in 4.7 (tip 2 instead of tip 1's text on the one drawn frame) waits for the Build Manager; WS6's two 200% leftovers and the 8 px Home card padding under 390 px; the 3-line lesson link at 320 px (WS3).

## 5. New Hebrew string keys of this round, for the Copywriter pass

Generated by diffing `site/js/data/strings.js` against the base commit (`pw2/integ/new-keys.mjs`): **87 new UI keys**, 6 removed, **89 existing keys with changed text**, 37 lesson copy values changed, 7 themes changed. The Copywriter pass of `12-fix-direction.md` section 10 step 2 has **not** been run.

| Key | Hebrew | Where (section of `final-ui-copy.md`) |
|---|---|---|
| `home.cta.lessons.aria.one` | שיעורים, שיעור אחד מתוך 12 הושלם | 3. Home (`#/`) |
| `home.cta.lessons.aria.other` | שיעורים, {done} מתוך 12 הושלמו | 3. Home (`#/`) |
| `home.art.pause.aria` | לעצור את האנימציה | 3. Home (`#/`) |
| `home.art.play.aria` | להפעיל את האנימציה | 3. Home (`#/`) |
| `conflict.title` | הציור הזה השתנה בלשונית אחרת | 24.1 WS1 |
| `conflict.body` | כדי לא לדרוס את הגרסה החדשה, מכאן אי אפשר לשמור. | 24.1 WS1 |
| `conflict.reload` | לטעון את הגרסה החדשה | 24.1 WS1 |
| `conflict.download` | להוריד את מה שיש כאן | 24.1 WS1 |
| `storage.readFailed.title` | לא הצלחנו לקרוא את העבודות | 24.1 WS1 |
| `storage.readFailed.body` | שום דבר לא נמחק. נסו שוב בעוד רגע. | 24.1 WS1 |
| `storage.readFailed.retry` | לנסות שוב | 24.1 WS1 |
| `editor.loadFailed.title` | לא הצלחנו לפתוח את הציור | 24.1 WS1 |
| `w0.title` | אי אפשר לשמור בדפדפן הזה | 24.1 WS1 |
| `w0.body` | הדפדפן חוסם את השמירה במכשיר, למשל בגלישה פרטית. מה שתציירו כאן לא יישמר. נסו בחלון רגיל או בדפדפן אחר. | 24.1 WS1 |
| `storage.blocked.toast` | הדפדפן חוסם את השמירה במכשיר, אז הפעולה לא בוצעה. | 24.1 WS1 |
| `storage.failed.toast` | הפעולה לא הצליחה. שום דבר לא נמחק. נסו שוב בעוד רגע. | 24.1 WS1 |
| `w3.left` | הציור האחרון לא נשמר. | 24.1 WS1 |
| `import.none.one` | הפרויקט הזה כבר כאן. שום דבר לא השתנה. | 24.1 WS1 |
| `import.none.other` | כל הפרויקטים בקובץ כבר כאן. שום דבר לא השתנה. | 24.1 WS1 |
| `import.skipped.one` | פרויקט אחד כבר היה כאן ולא יובא שוב | 24.1 WS1 |
| `import.skipped.other` | {n} פרויקטים כבר היו כאן ולא יובאו שוב | 24.1 WS1 |
| `import.copies.one` | פרויקט אחד כבר היה כאן בגרסה אחרת, אז יובא כעותק | 24.1 WS1 |
| `import.copies.other` | {n} פרויקטים כבר היו כאן בגרסה אחרת, אז יובאו כעותקים | 24.1 WS1 |
| `import.clash.one` | כבר יש כאן פרויקט של אותו שיעור או אתגר, אז הוא יובא כעותק חופשי | 24.1 WS1 |
| `import.clash.other` | {n} פרויקטים של שיעור או אתגר שכבר יש כאן יובאו כעותקים חופשיים | 24.1 WS1 |
| `import.bad.one` | פרויקט אחד בקובץ פגום ולא יובא | 24.1 WS1 |
| `import.bad.other` | {n} פרויקטים בקובץ פגומים ולא יובאו | 24.1 WS1 |
| `import.frames.blank.one` | פריים אחד בקובץ לא נקרא ויובא ריק | 24.1 WS1 |
| `import.frames.blank.other` | {n} פריימים בקובץ לא נקראו ויובאו ריקים | 24.1 WS1 |
| `import.stamps` | החותמות שבגיבוי נוספו | 24.1 WS1 |
| `import.partial` | יובאו {n} מתוך {total} פרויקטים. לשאר אין מקום. | 24.1 WS1 |
| `import.stopped` | הייבוא נעצר. יובאו {n} מתוך {total} פרויקטים. | 24.1 WS1 |
| `import.error.unreadable.one` | הפריים שבקובץ פגום ולא נקרא. שום דבר לא השתנה. | 24.1 WS1 |
| `import.error.unreadable.other` | {n} הפריימים שבקובץ פגומים ולא נקראו. שום דבר לא השתנה. | 24.1 WS1 |
| `gallery.starter.numbered` | {starter} {n} | 24.1 WS1 |
| `delete.restoredAsCopy` | בינתיים נוצר פרויקט חדש לשיעור הזה, אז הישן חזר כעותק חופשי | 24.1 WS1 |
| `settings.shortcuts.label` | קיצורי מקלדת של אות אחת | 24.1 WS1 |
| `settings.shortcuts.hint` | למשל B לעיפרון ו-N לפריים חדש. רווח, חצים ו-Ctrl+Z פועלים תמיד. | 24.1 WS1 |
| `settings.report.button` | להוריד דוח תקלות | 24.1 WS1 |
| `settings.report.hint` | קובץ טקסט קטן שנשאר אצלכם. הוא לא נשלח לשום מקום. | 24.1 WS1 |
| `settings.report.done` | הדוח ירד: {filename} | 24.1 WS1 |
| `settings.report.file` | fliploop-report-{date}.txt | 24.1 WS1 |
| `confirm.resize.body.square` | הציורים יישארו במרכז. מה שמצויר בצדדים, מחוץ לריבוע, ייחתך. אחרי השינוי אי אפשר לחזור צעד אחורה. | 24.2 WS2 |
| `confirm.resize.body.wide` | הציורים יישארו במרכז, ובשני הצדדים יתווסף שטח ריק. אחרי השינוי אי אפשר לחזור צעד אחורה. | 24.2 WS2 |
| `frameMenu.hold.less.aria` | פחות החזקה | 24.2 WS2 |
| `frameMenu.hold.more.aria` | יותר החזקה | 24.2 WS2 |
| `tool.eraser.s.aria` | מחק דק, 8 פיקסלים | 24.2 WS2 |
| `tool.eraser.m.aria` | מחק בינוני, 20 פיקסלים | 24.2 WS2 |
| `tool.eraser.l.aria` | מחק עבה, 40 פיקסלים | 24.2 WS2 |
| `lessonMode.nudgeHold` | כל הפריימים צוירו. עכשיו שנו החזקה באחד הפריימים ולחצו על ▶︎ (הפעלה) כדי לסיים. | 24.3 WS3 |
| `lessonDone.toast` | קיבלתם חותמת על שיעור {n} | 24.3 WS3 |
| `challenge.stamp.toast` | קיבלתם חותמת על האתגר של השבוע | 24.3 WS3 |
| `lessonMode.progress.aria.one` | פריים ריק אחד מתוך {total} צויר | 24.3 WS3 |
| `lessonMode.progress.aria.other` | {done} מתוך {total} פריימים ריקים צוירו | 24.3 WS3 |
| `strip.counter.aria.one` | פריים אחד מתוך 120 | 24.4 WS4 |
| `strip.counter.aria.other` | {n} פריימים מתוך 120 | 24.4 WS4 |
| `toast.frameRestore.full` | אי אפשר להחזיר את הפריים: כבר יש 120 פריימים | 24.4 WS4 |
| `toast.frameDeleted.aria` | פריים {n} נמחק. אפשר להחזיר אותו, גם עם Ctrl+Z | 24.4 WS4 |
| `toast.frameRestored.aria` | פריים {n} חזר למקומו | 24.4 WS4 |
| `export.video.preparing` | מכינים את ההקלטה… | 24.5 WS5 |
| `export.video.retrying` | ההקלטה הראשונה יצאה חלקית. מקליטים שוב. | 24.5 WS5 |
| `export.error.videoShort` | הווידאו יצא חלקי. נסו שוב, או הכינו GIF. | 24.5 WS5 |
| `export.video.length.seconds` | ההקלטה תימשך {s} שניות. | 24.5 WS5 |
| `export.video.length.minutes` | ההקלטה תימשך {time} דקות. | 24.5 WS5 |
| `export.done.back` | לאפשרויות הייצוא | 24.5 WS5 |
| `export.share.failed` | השיתוף לא הצליח. אפשר להוריד את הקובץ ולשלוח אותו. | 24.5 WS5 |
| `export.preview.alt` | תצוגה מקדימה של ה-GIF | 24.5 WS5 |
| `export.progress.name` | התקדמות הייצוא | 24.5 WS5 |
| `export.file.gif` | {title}.gif | 24.5 WS5 |
| `export.file.gifHalf` | {title}-half.gif | 24.5 WS5 |
| `export.file.video` | {title}.{ext} | 24.5 WS5 |
| `print.file.pdf.paper` | {title}-flipbook-{paper}.pdf | 24.5 WS5 |
| `print.file.pdf.pingpong` | {title}-flipbook-{paper}-pingpong.pdf | 24.5 WS5 |
| `print.file.png.paper` | {title}-sheet-{nn}-{paper}.png | 24.5 WS5 |
| `print.file.png.pingpong` | {title}-sheet-{nn}-{paper}-pingpong.png | 24.5 WS5 |
| `print.confirm.many.title` | להדפיס {sheets} גיליונות? | 24.5 WS5 |
| `print.confirm.many.body` | זה הרבה נייר, וההכנה יכולה לקחת כמה דקות. כדאי להוריד PDF ולבדוק אותו לפני שמדפיסים. | 24.5 WS5 |
| `print.confirm.many.print` | להדפיס בכל זאת | 24.5 WS5 |
| `print.error.print` | ההדפסה נכשלה. נסו להוריד PDF. | 24.5 WS5 |
| `print.action.sharePdf` | לשתף PDF | 24.5 WS5 |
| `print.share.ready` | ה-PDF מוכן. לחצו שוב על "לשתף PDF". | 24.5 WS5 |
| `print.share.failed` | השיתוף לא הצליח. אפשר להוריד את ה-PDF ולשלוח אותו. | 24.5 WS5 |
| `page404.title` | הדף לא נמצא · FlipLoop | 24.5 WS5 |
| `page404.description` | הדף הזה לא נמצא. מכאן אפשר לחזור ל-FlipLoop. | 24.5 WS5 |
| `page404.h1` | הדף הזה לא נמצא | 24.5 WS5 |
| `page404.body` | אולי הכתובת נכתבה עם טעות. הציורים שלכם נשארו שמורים במכשיר. | 24.5 WS5 |
| `page404.home` | הביתה | 24.5 WS5 |

**Removed keys (no code reads them):** `home.cta.lessons.aria`, `strip.counter.aria`, `lessonMode.progress.aria`, `print.file.pdf`, `print.file.png`, `confirm.resize.body`

**Existing keys whose text changed (89), all in sections 0 to 23 (WS6) of `final-ui-copy.md`:** `meta.title.home`, `meta.title.pattern`, `meta.title.gallery`, `meta.description`, `meta.og.description`, `manifest.description`, `manifest.screenshot.narrowHome`, `common.back.home`, `common.back.home.aria`, `common.back.gallery.aria`, `common.back.challenge.aria`, `common.back.lesson.aria`, `common.back.lessons`, `common.back.lessons.aria`, `common.back.editor.aria`, `common.undo`, `common.loading`, `home.nav.gallery`, `home.continue.aria`, `coach.3`, `editor.status.saving`, `editor.status.failed`, `editor.status.failed.aria`, `editor.canvas.playing.aria`, `tool.pencil.tooltip`, `tool.eraser.tooltip`, `tool.fill.tooltip`, `tool.undo`, `tool.undo.aria`, `tool.undo.tooltip`, `tool.undo.disabled.aria`, `tool.undo.disabled.tooltip`, `tool.redo`, `tool.redo.aria`, `tool.redo.tooltip`, `tool.redo.disabled.aria`, `tool.redo.disabled.tooltip`, `more.move.tooltip`, `more.move.hint`, `onion.toggle`, `onion.toggle.on.aria`, `onion.toggle.off.aria`, `onion.prev`, `onion.prev.aria`, `onion.next.aria`, `canvasSize.wide.aria`, `clearFrame.aria`, `strip.frame.hold.aria`, `frameMenu.hold.value.aria.one`, `frameMenu.hold.value.aria.other`, `play.prev`, `play.prev.tooltip`, `play.next`, `play.next.tooltip`, `play.mode.tooltip`, `lessonMode.keyFrame`, `lessonMode.nudgePlay`, `lessonDone.makeMine.hint`, `lessonDone.madeMine.toast`, `editor.loading`, `notFound.title`, `w1.body`, `w1.action`, `w5.text`, `export.video.line`, `export.video.realtime`, `export.done.project`, `export.error.videoHidden`, `print.pingpong`, `print.action.pngSheet`, `print.action.pngSheet.aria`, `print.multiDownloadTip`, `lessons.allDone.body`, `lesson.what.h2`, `lesson.example.prev`, `lesson.example.next`, `challenge.meta.days.other`, `challenge.meta.days.two`, `challenge.meta.days.last`, `challenge.stamp.aria`, `gallery.h1`, `gallery.projects.h2`, `gallery.loading.aria`, `gallery.duplicate.done`, `settings.protected.label`, `settings.import`, `settings.undoNote`, `settings.motionNote`, `settings.about.credit`

**Lesson copy (`final-lessons.md`, WS3):** 37 of 133 values changed (the 37 keys are listed with old and new text in `pw2/fix-ws3/out/copy-applied.txt`).

**Themes changed (7):** THEMES.11=פרפר מרפרף · THEMES.15=זיקוקים בשמיים · THEMES.17=מדורה בוערת · THEMES.27=מדוזה צפה · THEMES.28=תמנון מנופף · THEMES.35=תפוח בדבש · THEMES.47=קנגורו קופץ

Notes for the reviewer, collected from the six files:

- Working drafts written by a Developer, not by the Copywriter: every 24.1 key that has no draft in the fix direction (the `import.*`, `storage.*.toast`, `settings.*`, `delete.restoredAsCopy`, `w3.left`, `gallery.starter.numbered` rows), `tool.eraser.s/m/l.aria`, `toast.frameDeleted.aria`, `toast.frameRestored.aria`, and all of 24.5.
- WS1 flags `import.error.unreadable.other` as stiff, and `storage.blocked.toast` as one sentence used for every blocked action.
- WS3: four lesson texts pass the 28-character cap by 1 or 2 (`lesson.9.goal` 30, `lesson.2.hint.4` 30, `lesson.10.hint.3` 29, `lesson.10.hint.6` 29), measured as not cut at 320 px; `challenge.stamp.toast` says "של השבוע" also for an older week's project.
- WS6's five rows that differ from the audit's proposal (table in `fix-ws6.md`): `common.back.gallery.aria`, `common.back.challenge.aria`, `onion.toggle.on/off.aria`, `tool.undo/redo.disabled.aria`, and the two amended limits in section 0.
- `settings.report.*`: the downloaded report itself is in English (a diagnostic file).
- `page404.*` are also written by hand in `site/404.html`; a wording change must be made in both places.

## 6. Open issues and things noticed, not changed

1. **Input in the first 0.3 s after arriving in the Editor is dropped.** After an in-app navigation into the Editor (Gallery "אנימציה חדשה", a card, a lesson start), a stroke started 0, 100 or 200 ms after the canvas appears does not land (12 of 12), at 300 ms 3 of 4 land, from 450 ms all land (`arrive-stroke.mjs`). The browser sends input to the view transition while it runs; WS6's canvas pair lasts 300 ms. Not reachable by a person in practice, and a direct load is not affected, but it is the cause of any "first stroke lost" a script reports. Left as is; shortening the pair to 200 ms would be the lever.
2. **Leaving the Editor with several unsaved frames:** about 0.1 to 0.2 s in all but one of 20 measured leaves, 2.4 s once (the save runs before the transition, PERF-P-01 a). Real phone still unmeasured.
3. **Desktop side panel at 1280x800:** the scroll fade lies over the last visible control (the pressed "1" of "הבאים" looks half washed out). It is the scroll cue WS6 built, working as built; at first sight it reads as a rendering fault. For the Critic.
4. **Toast inside the Export overlay (1280):** it sits on the dialog's bottom edge, half outside the dialog box. Readable and clickable; cosmetic.
5. **Lesson title in the Editor top bar at 320 px** is cut ("שיעור 6: האצה…"), as WS3 noted.
6. **First-Play line** sits over the dimmed tool row on phones for its 2.5 s (WS4's note).
7. **Alt+Arrow on a focused strip cell during a stroke** still reorders (the cell's own key handler; `onKey`'s mid-stroke guard does not cover it). Needs a mouse button held and a keyboard chord at once; no data loss seen in code. Not in any audit.
8. **404 page on a host that is neither `*.github.io` nor has a registered worker, under a subpath:** the Home link points to `/`. Only the local subpath server with workers blocked is such a host; Pages and Netlify are right (WS5's 14 of 14).
9. **Dead code left in place:** `core/fill.js countChangedPixels` (only its unit test calls it), `home-art.js lightTableSvg({ still })`.
10. **`tools/serve-headers.mjs`** (WS5, outside the ownership table) is kept: it is the Netlify rehearsal server.
11. **Process steps of section 10 not done by this agent:** the Copywriter pass; appending section 12's plan amendments to `final-site-plan.md`; updating `audit-report.md`; the Build Manager re-check and the Gatekeeper's Launch Gate. **Nothing of section 11 was done:** no push, no deploy, no Netlify command. The first step there (check that Netlify does not build from GitHub pushes) is still to do before any push.
12. **Worktrees and branches** `fix/ws1` to `fix/ws6` are left in place.

## 7. Still needs a real device

Everything in `12-fix-direction.md` section 8.3 stands. In short: real iPhone and Mac Safari (video recording after R46, where a short result now gets a retry and then an error with "להכין GIF"; the native colour picker; safe areas; edge-swipe Back with a sheet open; whether ▶ is drawn as a colour emoji, in which case R41's fallback wording applies; the synchronous rescue write in `pagehide`; BroadcastChannel between an installed app and a tab; IndexedDB reconnect after backgrounding) · a real Android phone (pull-to-refresh, app switch during a save, the starter card on a slow phone, share sheets, WhatsApp accepting the MP4, drag-reorder and long press by finger, the auto-update in an installed app) · a real pen · a real screen reader (status text, toast focus, the live region inside dialogs) · real Windows High Contrast · a real printer · GIF encoding in a hidden tab · a real link-preview scraper for `og:image` · the policy on Netlify's own header merging (rehearsed locally with the same `_headers` file).

Also only measured here on one PC (Intel Iris Xe, Chrome 154): EX-01's warm-up length. And the visible desktop scrollbar of the side panel is confirmed in computed style only (headless Chrome draws overlay scrollbars).

## 8. Files the integrator changed (beyond the merges)

`site/js/pwa.js` · `site/js/editor/editor.js` · `site/js/editor/playback.js` · `site/js/editor/lesson-mode.js` · `site/js/screens/gallery.js` · `site/css/style.css` (two rules in WS6's status block) · `site/index.html` (`?v=10`) · `site/sw.js` (generated block) · `site/js/data/strings.js` (generated) · `final-ui-copy.md` (six unused rows removed) · this file · `_process/07-developer-notes.md`.

Commits on `main` after the six merges: `193997f` (contract glue), `75cb06a` (K3 focus, `?v=10`, manifest), `b2bd595` (status target), and the notes commit.

**Local preview of the merged build:** `node tools/serve-headers.mjs 9410`, then http://127.0.0.1:9410/ (real response headers, Hebrew 404).
