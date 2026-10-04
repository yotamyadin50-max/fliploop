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

## 9. Final polish (2026-10-03)

**Role:** Developer · **Branch:** `main`, local only. Nothing pushed, nothing deployed, no Netlify command.
**Server:** `node tools/serve-headers.mjs 9410` (real response headers). **Browser:** installed Chrome 154 through Playwright 1.49.1, plus Playwright WebKit for the smoke. **Scripts:** scratchpad `pw2/final-polish/`. Every screenshot named below was opened and looked at.

| Commit | What |
|---|---|
| `5336176` | Copy: the Copywriter's 19 strings regenerated, `site/404.html` body sentence by hand |
| `b735a9d` | Editor: a stroke begun during the arrival transition lands |
| `512f1de` | Three cosmetics: panel fade, overlay toast, lesson title at 320 px |
| `9704dcc` | `?v=11`, service worker manifest `411a89230697` |

### 9.1 Copy (item 1)

`node tools/build-strings.mjs`: 560 UI keys, 52 themes, 133 lesson keys. `site/404.html` now reads "אולי יש טעות בכתובת. שום דבר לא נמחק."; the inline script was not touched, the hash test in `tests/ws5.test.mjs` passes. Unit tests 63 of 63. The Copywriter's review file `_process/05e-copywriter-fix-round-review.md` went into the same commit.

The five longer texts at 320x568 (`copy320.mjs`, screenshots `shots/copy-320-*.png`; 9 of 10 checks pass, and the tenth is the script's own count: it expected one toast where the earlier storage toast was still up, and both were inside the screen and not cut):

| Text | How it was raised | Result |
|---|---|---|
| `conflict.body` | the Editor's own `showConflict()` | 4 lines, dialog 19..301 px wide and 118..450 px high, both buttons on screen without scrolling, nothing cut |
| `storage.blocked.toast` | for real: `indexedDB.open` throws, then "אנימציה חדשה" on Home; and over the Editor | 2 lines, inside the screen; over the Editor it ends 8 px above the tool row |
| `import.stopped` | the app's `toast()` with the real string and all four note lines (the `import.clash.other` line among them) | 8 lines in all, inside the screen, nothing cut |
| `import.clash.other` | as the one note line under "יובאו 9 פרויקטים" | 3 lines, nothing cut |
| `delete.restoredAsCopy` | the app's `toast()`, together with a second toast | 2 lines each, both inside the screen |

No layout change was needed. Not done: the older workstream scripts that wait for the old words (Copywriter note 4) were not edited; they are scratch files.

### 9.2 The first stroke after arriving in the Editor (item 2)

**Is it new? No.** The released build (https://fliploop-app.netlify.app) measured the same way: strokes begun 0, 50, 100 and 200 ms after the canvas first appears are lost **12 of 12 on desktop mouse and 12 of 12 on phone touch**; at 300 ms 3 of 3 land on both. `main` before the fix: 8 of 8 lost on desktop, and 8 of 8 on the phone profile (that run already carried the `pointer-events` rule named below, which changes nothing).

**Cause.** While a view transition runs, Chrome gives every pointer event to the root element (the page under the transition is not hit-tested), so the canvas never saw the press. On a phone the browser then took the finger for a scroll and cancelled it. Two things tried and dropped: `::view-transition { pointer-events: none }` changes nothing in Chrome 154 (the press still goes to the root); shortening the pair would only shorten the gap.

**Fix (the 200 ms fade and the 300 ms canvas pair are kept):**
- `app.js`: one `pointerdown` listener on the window. While a transition runs and the press went to the root, the router hands it to the screen that just arrived (`screen.earlyPointer(e, transition)`).
- `editor.js earlyPointer()`: if the press is inside the canvas box, the transition is ended at once (`skipTransition()`), the browser is asked what really lies under the pointer, and if it is the canvas, the stroke starts through the normal `DrawingInput.onDown` (pointer capture carries the rest of the stroke). A toast, a tip or a sheet over the canvas keeps the press. Nothing is handed over while the Export overlay is on its way in.
- `style.css`: `html.vt-editor { touch-action: none }`, set by the router only while the Editor arrives. Without it every finger stroke was cancelled (6 of 6 lost with the rule switched off).
- The second press of a double click is not handed over (under 500 ms and under 24 px from the press before it). The canvas is up 43 to 107 ms after the first click, so a double click on a Gallery card or on "אנימציה חדשה" would otherwise have left a dot on the drawing.

A press beside the canvas leaves the transition alone. So the only change to the designed motion: the animation ends early when somebody starts to draw during it.

**Measured after the fix** (`arrive.mjs`; "the canvas first appears" is the first animation frame after the canvas entered the page, reported by the page itself; the real delay of each press was measured inside the page: 3 to 223 ms on desktop, 15 to 235 ms on the phone profile; in all 96 trials the browser had sent the press to the root, so the new path is what was tested):

| Arrival | Desktop mouse, at 0 · 50 · 100 · 200 ms | Phone touch (Pixel 7 profile), at 0 · 50 · 100 · 200 ms |
|---|---|---|
| Gallery "אנימציה חדשה" (free) | 3/3 · 3/3 · 3/3 · 3/3 | 3/3 · 3/3 · 3/3 · 3/3 |
| Gallery card (the thumbnail-to-canvas pair) | 3/3 · 3/3 · 3/3 · 3/3 | 3/3 · 3/3 · 3/3 · 3/3 |
| Lesson 1 start | 3/3 · 3/3 · 3/3 · 3/3 | 3/3 · 3/3 · 3/3 · 3/3 |
| Challenge start | 3/3 · 3/3 · 3/3 · 3/3 | 3/3 · 3/3 · 3/3 · 3/3 |

**96 of 96**, each a whole stroke (1,170 to 1,183 changed pixels, not a dot), 0 cancelled, 0 console errors. That is 12 of 12 for each of free, lesson and challenge on each input, plus the card arrival.

**Edges** (`early-edge.mjs`, 20 of 20): an early stroke released over the top bar is kept, the status goes back to "נשמר" and IndexedDB holds the same ink · the button let go outside the window: the next move with no button ends the stroke, the next stroke draws · a press beside the canvas: transition keeps running, nothing drawn · arriving on the Export overlay: a press over the canvas area draws nothing · double click on a card 60, 120, 200, 300 ms apart: no mark · phone: a stroke that ends over the strip is kept; a second finger cancels it; a double tap on "אנימציה חדשה" 100, 180, 280 ms apart leaves no mark; a scrolling screen does not get the Editor class · reduced motion (no transition): the stroke at 0 ms lands. The integrator's `probe-vt.mjs` (the pair still runs from a card and from the menu): 7 of 7.

Said so nobody chases it: my first version of the probe sent mouse moves with `button: none`; Chrome then drops the pointer capture one frame later and the stroke ends as a dot. That was the script, not the app (Playwright's own mouse sends `button: left` while a button is down, and the numbers above use that).

Not covered: a press on a button during a transition still reaches nothing, on every screen, as before (only the Editor's canvas takes an early press). WebKit was not measured for this path (no scripted touch there); the handler acts only when the press went to the root element, so a browser that gives the press to the canvas itself is not affected.

### 9.3 Three cosmetics (item 3)

Before and after screenshots: `shots/cos-before-*.png`, `shots/cos-after-*.png` (`cosmetics.mjs`, after: 61 checks pass, run in parts).

| Issue | Before | Fix | After |
|---|---|---|---|
| Desktop panel, scroll fade over the last visible control (issue 3) | at 1280x800 the pressed "1" of "הבאים" was half washed out; at 1440x900 the whole page-size control lay under the fade | `style.css`: every control of the panel (swatches, "עוד גוונים", colour well, switch, segmented groups, the clear button) is drawn above the fade. The fade stays and still softens text and the panel's background | 1280x800, 1280x720, 1440x900, 1024x768: no control is drawn under the fade; the last visible one is cut by the panel's edge. Scrolled to the end, the last control is clear of the edge |
| Toast in the Export overlay (issue 4) | 1280x800: toast at 743..784, dialog ends at 760 | `toast.js place()`: a dialog that leaves less room under it than the toast needs takes the toast inside, 8 px above its bottom edge | toast at 711..752, inside the dialog. It lies over the lower 8 px of "להוריד קובץ פרויקט" for its 4 s when the overlay is scrolled to its end (on phones it covered 16 px of that button before and still does). A small dialog with room under it keeps its toast below: the two-tabs dialog at 1280x800 (dialog ends 533, toast 743..784) and at 320x568 (450, 511..552) |
| Lesson title cut at 320 px (issue 5) | "שיעור 6: האצה…": the title needs 164 px and had 130 | `style.css`, under 400 px: in a lesson Editor the Back link is its arrow only (44x44, its `aria-label` names it), and the title field gives up 2 px of padding a side (all Editors) | 174 px at 320, 181 at 360, 211 at 390. All twelve titles checked at 320: **ten fit**. Lessons 4 and 5 ("שיעור 4: ברצף או מתנוחה לתנוחה", "שיעור 5: המשך תנועה ותנועה חופפת") need 237 and 256 px, more than any phone bar gives, and keep their ellipsis |

### 9.4 The slow Editor leave (item 4)

`leave.mjs`: a stroke, then Back, timed inside the page from the Back press to the Gallery's cards; every `canvas.toBlob` of the leave timed too. **105 leaves, none slower than 297 ms.** No leave near 2.4 s came up, no cause was found, nothing was changed.

| Profile | Case | n | min | median | p90 | max |
|---|---|---|---|---|---|---|
| Desktop | one unsaved stroke, Back at once | 15 | 47 | 127 | 238 | 258 ms |
| Desktop | Back 300 ms after the stroke | 15 | 29 | 46 | 134 | 135 ms |
| Desktop | five frames with unsaved strokes | 15 | 69 | 155 | 246 | 268 ms |
| Desktop | stroke 120 ms after arriving, Back at once | 15 | 44 | 126 | 160 | 173 ms |
| Phone | one unsaved stroke, Back at once | 15 | 54 | 138 | 182 | 237 ms |
| Phone | Back 300 ms after the stroke | 15 | 27 | 36 | 72 | 161 ms |
| Phone | five frames with unsaved strokes | 15 | 40 | 124 | 253 | 297 ms |

The longest single `toBlob` was 151 ms, and none ran during a transition. A real phone is still unmeasured.

### 9.5 Release checks (item 5)

| Check | Result |
|---|---|
| `?v=` | `index.html`: three tags, all `?v=11`. `404.html` has none |
| `node tools/build-sw-manifest.mjs`, then `--check` | version `411a89230697`, 73 files, up to date |
| `node --test "tests/*.test.mjs"` | 63 pass, 0 fail |
| Site audit (`audit-site.py`) | clean, exit 0 |
| Every screen, real headers, real service worker (`final-pass.mjs`) | desktop **22 of 22**, phone profile **22 of 22** on its second run (the first had 21: the one video failure of the next row): the worker is active and controls the page (caches `fliploop-shell-411a89230697`, `fliploop-fonts`); Home, Gallery, Settings, Lessons, Lesson, Challenge, Editor (a stroke right on arrival, a second frame, Play, Stop), Export overlay, Print, lesson Editor, challenge Editor, Editor not-found, the 404 page with its new sentence; **0 console errors, 0 page errors, 0 missing string keys, 0 policy violations, 0 failed requests** |
| `window.__fliploop.selfTest({count:12})` | desktop: gif, gifHalf, video, pdfA4, pdfLetter, pdfJpeg, pngA4 all ok in 8.5 s (video 80 samples, 3.23 s), and again inside the integrator's journey. Phone profile: all ok in 6 of 7 runs; in one run `video` came back false and I did not capture why (the six good runs show a header length of 3.19 to 4.88 s for a 3.25 s plan, so the recording is not steady under this emulation). The export code was not touched in this round |
| Integrator's journey, real worker (`r-journey.mjs`, `FL_SW=allow`) | 59 of 59 |
| Integrator's layout sweep, six sizes (`r-layout.mjs`) | 262 of 262. One console line in the run, `net::ERR_CONNECTION_TIMED_OUT` at 768x1024: a request timed out, I did not find out which (the fonts host is the only outside one) |
| WebKit smoke (`r-webkit.mjs`) | 18 of 18 on the second run. On the first, the desktop profile's first page load waited 30 s for `load` and the script stopped (9 of 9 iPhone checks had passed) |
| Integrator's contracts (`k.mjs`) | 50 pass, 2 fail: the two K3 keyboard-delete checks. They fail the same way against the build before this round (`fb81036`, served beside it): the script falls back to a mouse click on the confirm button, and then the toast rightly does not take focus. The dedicated `k3b.mjs` passes 7 of 7 |

### 9.6 Open after this round

- Issues 1 to 5 of section 6: 1 fixed, 2 measured with no cause found, 3 to 5 fixed as far as section 9.3 says.
- Lessons 4 and 5 keep a cut title on phones.
- The overlay toast lies over the lower edge of the last button for 4 s (8 px on a desktop, 16 px on phones).
- The phone-profile video self-test failed once in seven runs, cause not found.
- Still needs a real device: a finger stroke right on arrival, a pen, a double tap on a card, and everything in section 7.
- Not done here: push, deploy, the Build Manager re-check, the Launch Gate.

**Files changed in this round:** `site/css/style.css` · `site/js/app.js` · `site/js/editor/editor.js` · `site/js/ui/toast.js` · `site/404.html` · `site/index.html` · `site/sw.js` (generated block) · `site/js/data/strings.js` (generated) · `final-ui-copy.md` and `_process/05e-copywriter-fix-round-review.md` (the Copywriter's, committed) · this file.

**Local preview:** `node tools/serve-headers.mjs 9410`, then http://127.0.0.1:9410/

## 10. Gatekeeper notes closed (2026-10-04)

**Role:** Developer · **Upstream:** `_process/14-gatekeeper-fix-round-review.md`, notes G-01 to G-05 (G-06 is review-only) · **Branch:** `main`, local commits only. Nothing pushed, nothing deployed, no Netlify command.
**Server:** `node tools/serve-headers.mjs 9410` (real response headers, policy active, no `bypassCSP`). **Browser:** installed Chrome through Playwright 1.49.1, real mouse and touch input. **Scripts and outputs:** scratchpad `pw2/gate-fixes/` (my own `lib.mjs`; results are read from IndexedDB and from frame pixels, not from labels).

| Note | Result | Commit |
|---|---|---|
| G-01 a closed tab's last stroke is lost when a second tab draws next | **Fixed**: kept 3 of 3 at 40 ms and 3 of 3 at 150 ms (it was lost 3 of 3 and 3 of 3) | `b49852f`, `96ed592` |
| G-02 the old lesson 1 project's stored title | **Fixed**: renamed at launch, a typed title is left alone | `1f5616d` |
| G-03 a drag of exactly one cell width to the left | **Fixed**: 5 of 5 left, 5 of 5 right, mouse and touch (left was 0 of 5) | `09fe6b8` |
| G-04 the Move tool on a prepared lesson frame counts as drawn | **Fixed**: stays 0/8 (it gave 8/8 and the stamp) | `c9a2fd4` |
| G-05 touch targets of "התרגיל" and "רמזים" | **Fixed where the real hit area was short**: landscape phones, the switch was 37 px tall to a finger; now 45 px or more at 12 sizes | `2df0f18` |
| Release prep | `?v=12`, worker `901a3cdbc372`, 73 files | `5d69a1c`, `96ed592` |

### 10.1 G-01 · a closed tab's last stroke, when a second tab draws next · FIXED (commits `b49852f`, `96ed592`)

**Reproduced first** (`g01-two-tabs-close.mjs`, the candidate before the fix): tab A draws, is closed 40 ms or 150 ms after the stroke, tab B draws 1.2 s later. A's last stroke (2,336 px) stored afterwards: **0 px in 3 of 3 runs at 40 ms and in 3 of 3 at 150 ms**. No dialog, B read "נשמר".

**Cause, two parts.** (1) The one the Gatekeeper named: at the next launch the record is refused because the stored project is newer. (2) One more, found while testing the merge: the record never reached that launch at all. The record's key was one per project, and tab B's own successful save ends with "the unload record is redundant, delete it", so B deleted A's record.

**Fix** (`store/rescue.js`, `store/autosave.js`, `store/db.js`, `app.js`, `editor.js`):

- **The Gatekeeper's direction.** Any open tab takes a rescue record in the moment it appears (a `storage` event), under a Web Lock so only one tab does it. The Editor then treats it as any other tab's save (the existing R3 path): with nothing unsaved it reloads its document by itself; with unsaved work it writes nothing and shows the two-tab dialog. The listener sits in the app shell, not in the Editor, so a tab on the Gallery or on Home takes the record in too.
- **One record per project and per tab** (the key ends with a tab id). A tab deletes only its own record. A record in the old key form, written by the build before this one, is still applied at launch.
- **Where the direction leaves a choice** (the stored project has already moved on when the record is looked at: the other tab never got the event, or its own save won a race): the record is applied **frame by frame**. Every stored frame now carries `rev`, the project `updatedAt` of the write that stored it (`db.saveProject`, one place). A frame nobody stored since the closed tab's version gets the rescued pixels. A frame somebody did store since is **never written over**: if it already holds the same pixels, there is nothing to do; if not, the closed tab's version is kept as a project of its own with the "(עותק)" title (its frames in its order). The same copy is made for an unsaved title, speed, frame order or deletion that the stored project does not have. A record is dropped only when its content is stored.
- **A tab that is only hidden** (it writes the same record and stays alive) recognises its own record when another tab applied it, and goes on from that version, also when it hears of it before its own save runs. Without this the new path would have given that tab a false two-tab dialog.
- No new string. The copy uses the existing `common.copySuffix`.

**Measured after the fix** (every script: 0 console errors, 0 policy violations, 0 missing keys):

| Check | Script | Result |
|---|---|---|
| A closed 40 ms / 150 ms after its stroke, B draws next | `g01-two-tabs-close.mjs` | **3 of 3 and 3 of 3 kept**: stored frame holds A's first stroke 2,336, A's last stroke 2,336 and B's stroke 788; B showed A's stroke before it drew; no dialog, B "נשמר", 0 orphans, no record left |
| The Gatekeeper's own `x2-rescue-two-tabs.mjs` | `pw2/gate/` | A's stroke kept in 4 of 4 "B draws next" runs (40, 40, 150, 600 ms; stored 5,676 = A's 4,672 + B's). Its second check now reports FAIL **by design**: it expects the stale tab to be stopped by the dialog after a new tab booted first; the stale tab now follows by itself (it showed 4,672 before drawing) and saves on top |
| A new tab boots first, B never got the event | `g01-more.mjs boot` | 3 of 3: the new tab shows A's stroke, B reloads by itself, draws, saves; all three strokes stored |
| B holds an open stroke when A is closed | `g01-more.mjs unsaved` | 3 of 3: A's stroke is in IndexedDB at once, B's page is not swapped under the pen; when B's stroke ends: the two-tab dialog, "לא נשמר", **B wrote nothing**; "להוריד את מה שיש כאן" gives B's drawing; "לטעון את הגרסה החדשה" shows A's stroke and B saves normally afterwards; one project, no copy |
| B finished a stroke just before A was closed | same | 4 of 4: the dialog, B wrote nothing, A's stroke stored |
| B never got the event and saved **another frame** first, then a launch | `g01-more.mjs merge` | A's frame goes in (2,336), B's frame untouched (788), no copy, B follows by itself |
| B never got the event and saved the **same frame** first, then a launch | same | B's project is not written at all (same `updatedAt`, same ink per frame); A's version is in the Gallery as "האנימציה שלי 1 (עותק)", 2 frames, A's stroke in it; a second launch makes no second copy |
| The same with frames stored by the released build (no `rev`) | same | nothing is assumed: not written into the newer project, kept as a copy |
| A changed only the title and was closed, B saved first | same | B's project keeps its title, a copy carries "שם חדש John 7 (עותק)" |
| A only hidden, not closed (5 runs) | `g01-more.mjs alive` | stroke stored, A "נשמר" and not in conflict, B shows it, no dialog in either tab, no copy; A draws again: saved, B follows |
| Two other tabs, Web Locks switched off | `g01-more.mjs nolocks` | 3 of 3: stored once, no copy, both tabs show it, no dialog |
| A record in the old key form | `g01-more.mjs oldrecord` | 2 of 2 applied at launch and removed |
| The browser refuses the Web Lock itself | `g01-more.mjs lockfail` | 2 of 2 in an open tab and 2 of 2 at a launch: the record still goes in (commit `96ed592`) |
| Playwright WebKit (not real Safari) | `wk-g01.mjs` | A leaves inside the save delay by navigating away, B draws next: **3 of 3 kept** (2,336 and 788 stored), B had the stroke before it drew, Web Locks present. `page.close()` in this engine leaves no rescue record even with one tab (measured: 0 records), so a closed tab cannot be simulated there |

**No regression** (`reg-save.mjs`):

| Area | Result |
|---|---|
| Two tabs (finding 3, the old F4) | 8 of 8: idle B follows A to 4 frames; B then draws: order 4, records 4, **orphans 0**; a stale B with an open stroke writes nothing (stored version unchanged) and shows the dialog with "לא נשמר"; B closed in that state leaves no record and A's version stays; six strokes in turn from two tabs: all six stored, no dialog, no copy |
| Reload and close survival (finding 1) | stroke kept in memory and in IndexedDB after a reload and after a tab close at 50 / 300 / 1000 ms: **6 of 6 alone, 6 of 6 with a second tab open** (which then shows the stroke by itself, no dialog); one project, no record left |
| Save honesty (finding 1) | label sampled inside the page while 12 strokes are drawn: "נשמר" read in 123 samples alone and 132 with a second tab open (the run on the final commit), **IndexedDB differed from the canvas in 0 of them**; the label right after each stroke was "שומרים…" every time |
| Unit tests | 3 new tests for the decision function `planRescue` (whole, per frame, project changes) |

**Limits, said plainly.** The per-frame rule needs `rev`, so a frame last stored by the released build is treated as "unknown" until it is saved once by this build: in that corner the closed tab's work lands in a copy instead of in the project. The copy appears in the Gallery without a message (no string exists for it; a toast line would be a Copywriter decision). A frame the closed tab had just added, when the other tab saved first, also goes to the copy rather than into the newer project. A tab that is closed while the two-tab dialog is open still drops its unsaved work, as before (the dialog offers the download). An idle second tab that takes the stroke in reloads its document, as it already does after any other tab's save, so its undo history starts again. Real Safari was not tested: the `storage` event and Web Locks are standard there (Locks from 15.4; without them the code runs unlocked and the second pass finds the pixels stored), and the write in `pagehide` itself was already on the real-device list.

### 10.2 G-02 · the old lesson 1 project's stored title · FIXED (commit `1f5616d`)

**Before** (`g02-old-title.mjs`, stored title set back to what the released build wrote): after a launch the Gallery card, the Editor top bar, its heading and the tab title all read "שיעור 1: מתיחה וכיווץ".

**Fix.** At launch (`special-projects.js renameOldLessonTitles()`, called from `app.js` after the rescue records are applied), a lesson project whose stored title is still exactly the default built from the lesson's earlier name gets today's default. `updatedAt` is not touched, so the Gallery order and a backup's "already here" check stay as they were. The earlier name is one row in `final-ui-copy.md` (section 24.6, key `lesson.1.nameBefore`), generated into `strings.js` by `tools/build-strings.mjs` (561 UI keys). It is the old text kept word for word for the comparison and is never shown; no new copy was written. Only lesson 1 was renamed between the released build and now (checked with `git show a87cb93:site/js/data/lesson-copy.js`).

**After:** 8 of 8. Stored title, Gallery card, Editor top bar, heading and tab title read "שיעור 1: מתיחה ומעיכה"; `updatedAt` unchanged; lesson 2, a free project that happens to carry the same words, and a title somebody typed ("... שלי") are all left alone.

### 10.3 G-03 · a drag of exactly one cell width · FIXED (commit `09fe6b8`)

**Before** (`g03-drag-tie.mjs`, long press at a cell's centre, drag exactly 72 px, real mouse at 1280x800 and real touch at 390x844): right 5 of 5 moved, **left 0 of 5**; exactly two cells: right two places, left only one.

**Cause.** The drop slot is the insertion bar nearest the pointer. From a cell's centre, a whole number of cells puts the pointer exactly half way between two bars, and `Math.round` took the right-hand bar both ways.

**Fix.** `core/frame-order.js dropSlot()`: the nearest bar, and within a quarter pixel of the middle the bar the drag is heading for. `strip.js dragUpdate()` uses it. The bar on screen is drawn from the same slot, so the frame still lands where the bar shows.

**After:** 17 of 17. Left 5 of 5 and right 5 of 5 on mouse and on touch; two cells each way: two places; away and back: stays; drags of 30 and 64 px stay, 80 px moves one place (unchanged rule: from the centre the next bar is a whole cell away); the last of 14 frames held at the left edge still travels to the start; a long press without movement is still a tap; stored order equals the screen. One unit test.

### 10.4 G-04 · the Move tool on a prepared lesson frame · FIXED (commit `c9a2fd4`)

**Before** (`g04-move-counts.mjs`, lesson 5, real drags): Move on frame 2 gave "1/8"; Move on all eight frames gave **"8/8 צוירו" and, after Play, the stamp sheet "קיבלתם חותמת"**. So this was more than an observation: it was a third route to a stamp without drawing, next to the two of finding 14.

**Cause.** The rule counts ink that the prepared drawing does not have, with the prepared drawing in its original place. A moved drawing is all "new" by that measure.

**Fix** (`core/lesson-diff.js countAddedInkMoved()`, used by `lesson-mode.js frameDone()`). The Move tool shifts the whole frame by whole pixels, so the count is also taken against the prepared drawing moved to where the frame's ink is: the moves that put a side of the prepared drawing's ink box on the same side of the frame's ink box (four at most), and the smallest count wins. It needs no stored state, so it holds after undo, a reload, an import and a canvas size change. Ink drawn on a moved frame counts under every one of those moves; erased ink still never counts.

**After:** 11 of 11 on lesson 5 and 11 of 11 on lesson 8 (the other lesson with a drawing on every frame). Move with the figure whole on the page (2,213 px before and after, box moved by exactly 29 and 14 px): 0/8. All eight moved, then Play: 0/8, no sheet, no stamp. Moved until the edge cuts part of it: 0. Moved, then erased along one side and along a second side: 0. Moved, then a pencil line: 1/8. Drawn, then moved: stays counted. The same after undo and after a reload. The rule for all 8 frames takes 10 to 24 ms. Two unit tests. **Regression** (`reg-lessons.mjs`): all 12 lessons still reach their stamp by drawing (sheet by itself 1,009 to 1,534 ms after Play), and on lesson 5 "ניקוי הפריים" on all eight frames plus the eraser across all eight still gives 0/8, no sheet, no stamp.

**Limit.** Moved, then erased so that all four sides of the drawing's box change, with nothing drawn: no side lines up any more, and the frame counts as drawn. Before this fix every move counted.

### 10.5 G-05 · touch targets of "התרגיל" and "רמזים" · FIXED where the real hit area was short (commit `2df0f18`)

Measured with `document.elementFromPoint` (`g05-touch-targets.mjs`): every point around each control on a 1 px grid, a 44 x 44 square on its centre, and real taps 21 px above, below, left and right of the centre. Lesson 6, 12 sizes (320x568, 360x740, 390x844, 568x320, 640x300, 667x375, 844x390, 932x430, 768x1024, 1024x768 touch and mouse, 1280x800).

**Before.** The drawn boxes are 86x32 and 80x38, as the Gatekeeper measured. Both already carried a 44 px hit area through a `::before` box, and that held at 8 of the 12 sizes (hit area 95 px by 45 or 46, and 81 px by 45). **On landscape phones (568x320, 667x375, 844x390, 932x430) the switch was 81x37 to a finger:** there the two are stacked 2 px apart, the button's hit area lay over the top 7 px of the switch, and a tap 21 px above the switch's centre opened the exercise sheet instead of switching the hints (3 of 4 taps reached the switch).

**Fix** (`style.css`): the stacked pair sits 10 px apart, and the switch's hit area is 46 px (38 + 2 x 4) so it does not drop under 44 where the box sits on a fraction of a pixel. The drawn sizes are unchanged (a visual size is the Web Designer's call).

**After:** 5 of 5. Hit areas at all 12 sizes: "התרגיל" 95 or 96 px wide and 45 or 46 px tall, "רמזים" 81 px wide and 45 to 47 px tall; the 44 x 44 square reaches its own control at every point; the four taps work on every size (a tap counts only when it reached its own control and not the neighbour); the canvas keeps its own top edge and corner; no sideways scroll. Screenshots `shots/g05-after-844x390.png` and `g05-after-568x320.png` opened and looked at: the goal card fits without scrolling.

### 10.6 Release checks

| Check | Result |
|---|---|
| `?v=` | `index.html`: three tags, all `?v=12`. `404.html` has none |
| `node tools/build-sw-manifest.mjs`, then `--check` | version `901a3cdbc372`, 73 files, up to date |
| `node tools/build-strings.mjs` | 561 UI keys, 52 themes, 133 lesson keys; no difference to the committed files |
| `node --test "tests/*.test.mjs"` | **70 pass, 0 fail** (63 before, 7 new in `tests/gnotes.test.mjs`) |
| Site audit (`audit-site.py`) | clean, exit 0 |
| Every screen, real headers, real service worker (`final-pass.mjs`, a fresh persistent profile each) | desktop **12 of 12**, phone profile **12 of 12**: worker `901a3cdbc372` active and in control; Home, Gallery, Settings, Lessons, Lesson, Challenge; Editor (two strokes on two frames saved, every stored frame carries `rev`; Play, Stop); frames stripped of `rev` (as the build before stored them): open, a stroke, reload 60 ms later, kept; Export overlay, Print; lesson Editor (hints switch, exercise steps); challenge Editor; Editor not-found; the Hebrew 404 page with status 404. **0 console errors, 0 page errors, 0 policy violations, 0 missing string keys, 0 failed requests** (the one console line is the browser's own notice for the unknown path asked for on purpose) |
| `window.__fliploop.selfTest({count:12})` | desktop and phone profile: gif, gifHalf, video, pdfA4, pdfLetter, pdfJpeg, pngA4 all ok in 8.5 to 8.8 s (video 79 samples, 3.28 s) |
| Every script of this round, run again on the final commit `96ed592` | `g01-two-tabs-close.mjs` 3 of 3 and 3 of 3 · `g01-more.mjs`: `unsaved` 18 of 18, `merge` 10 of 10, `boot` 4 of 4, `alive` 4 of 4, `nolocks` 7 of 7, `lockfail` 5 of 5, `oldrecord` 3 of 3 · `reg-save.mjs`: `twotabs` 8 of 8, `reload` 6 of 6, `honesty` 6 of 6 · `g02` 8 of 8 · `g03` 17 of 17 · `g04` 11 of 11 · `g05` 5 of 5 |

Said so nobody chases them: three checks of my own scripts were wrong on the first run and were corrected, not the app. A background tab's save comes late in headless Chrome (its timers are slowed), so the stale-tab check has to bring that tab to the front first; my "every pixel kept" check moved the lesson 5 figure off the bottom edge; and a stroke after a reload lands on the frame the Editor came back to, not on frame 1.

### 10.7 Open after this round

- **For the Gatekeeper's re-check:** its own `x2-rescue-two-tabs.mjs` now passes its first check and fails its second by design (section 10.1). The rescue record's key now ends with a tab id (`fliploop-rescue:<project>:<tab>`); a script that looks the record up by the old exact key has to look it up by prefix.
- **For the Copywriter or Build Manager, a decision, not a defect:** the "(עותק)" project that keeps a closed tab's version (the corner of section 10.1) arrives without a word. A toast would need one new string.
- **NOT DONE: the automatic update from the worker before this one** (`411a89230697` to `901a3cdbc372`) was not re-run with a real version switch. `pwa.js` and `sw.js` logic were not touched; a fresh profile installs and runs the new worker (section 10.6).
- **NOT DONE: real Safari, a real phone.** Everything in section 7 stands. New on that list: a tap on the "רמזים" switch on a real landscape phone, and two real Safari tabs for G-01.
- G-06 (largest contentful paint 4.0 s on the script's throttled connection) is review-only and was not worked on.
- Not done here: push, deploy, any Netlify command.

**Files changed in this round:** `site/js/store/rescue.js` · `site/js/store/autosave.js` · `site/js/store/db.js` · `site/js/store/special-projects.js` · `site/js/app.js` · `site/js/editor/editor.js` · `site/js/editor/strip.js` · `site/js/editor/lesson-mode.js` · `site/js/core/frame-order.js` · `site/js/core/lesson-diff.js` · `site/css/style.css` · `site/index.html` · `site/sw.js` (generated block) · `site/js/data/strings.js` (generated) · `final-ui-copy.md` (one row, section 24.6) · `tests/gnotes.test.mjs` (new) · this file · `_process/07-developer-notes.md`.

**Local preview:** `node tools/serve-headers.mjs 9410`, then http://127.0.0.1:9410/
