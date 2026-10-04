## Gatekeeper Review: FlipLoop fix round, Launch Gate (2026-10-03 to 2026-10-04)

**Status:** APPROVED

**Candidate:** `main` at `a3a997a` (merged fix round, not pushed), served at http://127.0.0.1:9410/ by `node tools/serve-headers.mjs 9410` (real response headers, `Content-Security-Policy` included). Worker version `411a89230697`, `?v=11`.
**Released build, for control runs and for the upgrade test:** `a87cb93` (what https://fliploop-app.netlify.app serves), extracted with `git archive a87cb93 site` and served locally.
**Method:** my own scripts only, 35 test scripts, in the scratchpad folder `pw2/gate/`. None of the developers' or auditors' scripts were run. Installed Chrome through Playwright 1.49.1 with real mouse, keyboard and touch (CDP) input, policy active, no `bypassCSP`, polling with `page.evaluate`; plus one Playwright WebKit pass. Results are read from IndexedDB, frame pixels and downloaded files, not from labels. Read-only: `git status` shows this review as the only changed file.

**Checklist walkthrough (Round 10):**
- Launch Gate, live build, 9 items: opened and clicked through, verified · every link and form works (header links, Back links, card menu, rename field, title field, both import inputs), verified · console clean, verified (0 errors, 0 page errors, 0 policy violations, 0 missing keys in every candidate run) · matches the plan's palette, type and layout: partly verified (the 12 base colours and 7 of the 70 shades paint their exact value, the web fonts load online and offline, four sizes looked at; the R35 token values were not re-measured, that is the Critic's layer) · zero placeholder content, verified (60 states scanned) · a live link: the candidate is local only until the push, http://127.0.0.1:9410/ works now · Unsplash: not applicable, no photos · `audit-site.py`: run by me, clean, exit 0 · `audit-render.js`: run by me, exit 0, zero MUST-FIX.
- Spec-Diff matrix: the 16 serious findings of `audit-report.md` section 1, 16 of 16 marked (table below); rulings R1 to R3, R5, R6, R8, R9, R11, R14 to R18, R22 to R25, R38, R39, R42, R46 each met by a measured check.
- Quick Check, 5 items: 1 voice, not applicable (the voice file covers planning documents only; the UI copy passed its own gate and the Copywriter's fix-round review) · 2 specific, verified (every new message says what happened and what to do) · 3 publishable as is, yes · 4 zero em and en dashes, verified by grep over `site/`, and no AI tell in any string read · 5 claims traceable, verified (the page description's claims, 12 lessons, weekly challenge, three exports, no sign-up, on-device storage, are each true of the build; a full journey talks only to its own origin and the two Google Fonts hosts, sends nothing, sets no cookie).
- Store-Readiness, iOS, Minimum Functionality, Permission and Metadata rounds: not applicable, this is a web release (Pages, then Netlify), no store listing. No device permission is requested; the `Permissions-Policy` header switches camera, microphone and geolocation off.
- 11-Star Bar: skipped at the Launch Gate, as the role file says.
- Round 11 perspectives that ran: the child trying to finish the task (lessons 1, 2, 3, 4, 5, 9 to their stamps, the challenge, exports, backup and restore) and the tester trying to break it (two fill scenarios of my own, erase and Move as stamp routes, both tab-close paths, the 120 cap, a lesson project squared by the released build, a stale rescue record against a second tab).
- Round 12: four chunks scored a hit and were finished as their own pass. Drag reorder (a tie at exactly one cell width: re-run past the tie, 20 of 20). GIF delays (my assertion was wrong, the file is right). Undo key name (my assertion was wrong, the build matches the approved copy rows). Rescue record with a second tab (a real corner, finding G-01 below, re-run five times on its own).

### What's good

- All 16 serious findings are fixed on the candidate, each reproduced with its original steps and measured. Where my script could run against the released build as a control, it failed there and passed here (findings 1, 2, 15).
- The release risk that matters most is clean: two browser profiles filled by the released build were updated on the same origin and came out with every project record, every frame, the settings and the stamps identical; the worker updated with one reload or none, and no loop.
- Zero console errors, zero policy violations, zero missing keys across every candidate run, with the real header policy, with the meta policy under `/fliploop/`, with the real service worker, and offline.
- The fix round did not just patch the 16: a failed create now recovers, a lesson project that the released build had already squared shows its true count, and a backup taken after the update still holds everything.

### What needs work (none of it blocks)

1. **G-01 · Minor · data safety, a corner of rulings R2 and R3.** Two tabs on the same project. Tab A draws a stroke and is closed within the save delay (measured at 40 ms and 150 ms). Tab B, which never saw that stroke, then draws and saves. **A's last stroke is gone, with no dialog, 3 of 3** (`x2-rescue-two-tabs.mjs`: A's ink 4672, stored afterwards 3340 = B's version; A's label read "שומרים…" when it was closed, so nothing false was shown). Cause: A's work sits only in the `localStorage` rescue record; B's write makes the stored project newer, so the next launch drops the record, as R2 says ("only if the stored project is not newer"). Closed at 600 ms: kept. If any new tab boots before B draws: the stroke is recovered and B gets the two-tab dialog. Not a regression (the released build loses that stroke and much more) and it needs two tabs plus a close inside about 0.4 s, which is why it does not block. -> Fix direction for a follow-up: an open Editor with nothing unsaved that sees a `storage` event for `fliploop-rescue:<its project>` applies that record and reloads its document; an Editor with unsaved work treats the record as a newer version and shows the two-tab dialog.
2. **G-02 · Cosmetic.** A lesson-1 project made before the update keeps its stored title "שיעור 1: מתיחה וכיווץ" on its Gallery card and in the Editor top bar; the lesson is now "מתיחה ומעיכה". -> Either leave it (it is the child's own project name by now) or, at boot, rename lesson projects whose title still equals the old default.
3. **G-03 · Cosmetic.** Drag reorder: a drag of exactly one cell width (72 px) to the left leaves the frame in place, the same drag to the right moves it (5 of 5 each). The drop slot is the insertion bar nearest the pointer and the tie at the neighbour's centre rounds one way. A person follows the bar, so nothing lands where the bar did not show. -> `strip.js dragUpdate()`: decide the tie by drag direction.
4. **G-04 · Observation, not in the audit.** In a lesson, the Move tool on a prepared frame counts as drawn (moving frame 2's figure gave "1/8"). The child still acts on every frame and the result does move. -> Decide whether moved prepared ink should count; no change needed for this release.
5. **G-05 · Minor, the audit's own medium item (LAY-L3), not one of the 16.** Touch sizes: the lesson "התרגיל" button is drawn 86x32 and the "רמזים" switch 80x38.
6. **G-06 · Review-only line from `audit-render.js`.** Largest contentful paint 4.0 s on the script's throttled phone connection (target 2.5 s).
7. **Limits that are rulings, said so nobody is surprised:** a canvas size change is undone only while the Editor stays open; after a reload in square the cut is permanent (frame 2: ink 3513 -> 0). A device on the released build runs the released `pwa.js` for this one update, so a stroke drawn in the last 2 s before pressing "לרענן" there is not protected; from the candidate onward an update saves first.

### Recommendation

Release. The order in `12-fix-direction.md` section 11 stands: check that Netlify does not build from pushes, push, verify on Pages (my Pages-shaped run under `/fliploop/` passed 7 of 7), then the one Netlify deploy. The user's standing rule of 2026-07-17 is that Gatekeeper notes get closed before the deliverable is presented: G-01 is the one worth a decision by the Build Manager before the push (fix now in `store/` plus `editor.js`, or record it as a known limit next to R2); G-02 to G-06 can ride with the next round. The Critic and the real-device list of section 8 come after this gate.

---

## 1. The 16 serious findings

| # | Finding (`audit-report.md` section 1) | Verdict | Measured on the candidate |
|---|---|---|---|
| 1 | "נשמר" appears too early; reload or close loses the last strokes | **Fixed** | label is "שומרים…" after 20 of 20 strokes; "נשמר" never shown while IndexedDB differed (0 of 191 samples); stroke kept after reload at 50 / 300 / 1000 ms 12 of 12 (mouse) and 9 of 9 (touch), after tab close 16 of 16. Control: 0 of 37 |
| 2 | A change made during a save is lost | **Fixed** | 4x CPU throttle: order 5 of 5, hold 5 of 5, fps 5 of 5. Control: 4 of 5, 4 of 5 |
| 3 | Two tabs on one project | **Fixed** | idle tab follows by itself; 4 frames stored, 0 orphans; a stale tab with unsaved work writes nothing and shows the dialog with both actions |
| 4 | A storage fault looks like "no work yet"; dead "אנימציה חדשה"; blank page | **Fixed** | 14 of 14: own error state with retry, 0 unhandled rejections, second tap creates, Home up in 3,138 ms when `open()` never answers |
| 5 | A backup does not restore stamps | **Fixed** | clean profile after import: 3 projects, lesson stamp with its date, challenge stamp, Home 1/12 |
| 6 | Undo of a delete lands in the wrong place; 121 of 120 | **Fixed** | both undo orders end `0 1 2 3` in memory and IndexedDB; the 121 repro stays at 120 with a message |
| 7 | Fill leaks between near shades | **Fixed** | the audit's two scenarios and two of mine: 0 leaks, outline pixel counts unchanged |
| 8 | A canvas size change cuts for good | **Fixed as ruled (R9)** | round trip with no edit: pixel-identical; both dialogs say there is no step back; no control in lessons. Limit: permanent after a reload |
| 9 | Drag reorder lands wrong; cannot pass the visible frames | **Fixed** | centred frame 10 of 10 (mouse) and 10 of 10 (touch), strip moved 0 px; last frame to slot 1 in one drag, phone and desktop |
| 10 | Desktop keyboard shortcuts | **Fixed** | Space plays after 6 kinds of click; mid-stroke Ctrl+Z, arrow, N, E change nothing; history intact; D during Play stops first |
| 11 | Lesson 9 gets stuck | **Fixed** | the nudge names the hold, again on each Play; after one hold "+" the sheet opens by itself in 1,208 ms |
| 12 | Lesson 11, text against drawing | **Fixed** | frames 1 and 5 hold the same stripe at x 167; the steps now say so and say "move it right" |
| 13 | The stamp sheet gets stuck | **Fixed** | left while playing, lessons 2, 3, 4: no dialog on the next screen, stamp recorded, toast; never a second sheet |
| 14 | A stamp without drawing | **Fixed, both routes** | (a) no size control in lessons, and a lesson squared by the released build shows 0/8 and gives no stamp; (b) clearing all 8 frames stays 0/8, no stamp |
| 15 | The first video export comes out frozen | **Fixed on this PC** | 6 of 6 fresh Chrome launches: 36 of 36 samples show the right frame. Control: 31 and 32 of 36. Real Safari not testable here |
| 16 | A frame delete cannot be undone from the keyboard | **Fixed** | focus lands on "להחזיר"; Enter restores; Ctrl+Z restores, also after the toast is gone |

**Control runs.** Where it says "control", the same script of mine ran against the released code on port 9421. A check that fails there and passes on the candidate proves the script can see the original defect.

### Finding 1: "נשמר" appears too early · FIXED

Scripts `g01a-label.mjs`, `g01b-unload.mjs`.

| Check | Candidate | Control (released) |
|---|---|---|
| Label right after each of 20 strokes | "שומרים…" 20 of 20 | "נשמר" |
| "נשמר" shown while IndexedDB differs from the canvas (191 samples, about every 50 ms) | **0 times** (128 samples read "נשמר", in all of them the stored frame equalled the canvas) | n/a |
| Slowest stroke to reach IndexedDB | 612 ms (sampling overhead included) | about 2 s by design |
| Continuous drawing, a stroke every ~1.3 s for 10 s: IndexedDB behind by at most | 636 ms | 8.2 s in the audit |
| Stroke kept after reload at 50 / 300 / 1000 ms, desktop mouse | **4/4, 4/4, 4/4** (in memory and in IndexedDB) | 0/4, 0/4, 0/4 |
| Stroke kept after tab close at 50 / 200 / 300 / 1000 ms (both `page.close()` paths) | **16/16** | 0/16 |
| Stroke kept after reload at 50 / 300 / 1000 ms, phone profile, real touch | **3/3, 3/3, 3/3** | 0/9 |
| fps 12 to 24, loop to ping-pong, title edit, each then reload at 300 ms | kept, kept, kept | lost, lost, lost |

### Finding 2: a change made while a save runs is lost · FIXED

Script `g02-during-save.mjs`, Chrome at 4x CPU throttle, 6 frames.

| Check | Candidate | Control (released) |
|---|---|---|
| Four fast Alt+Arrow moves: stored order equals the screen | **5/5** | 4/5 |
| Five fast hold "+": stored hold equals the screen (x6) | **5/5** | 4/5 (one run: screen 6, stored 5) |
| fps tap while a stroke's write is running | **5/5** | 5/5 |
| After a reload: order, holds, fps as before | yes | yes |

### Finding 3: two tabs on one project · FIXED

Scripts `g03a-two-tabs.mjs` (the audit's repro) and `g03b-conflict.mjs` (the stale tab has unsaved work). Screenshot `g03-conflict-dialog.png` looked at.

| Check | Result |
|---|---|
| A adds and draws frames 3 and 4 while B is idle | B follows by itself: 4 frames, no dialog |
| B then draws on frame 1 and saves | stored order 4, records 4, **orphans 0**, ink in all four frames (3484, 1760, 1760, 1760) |
| A fresh tab | 4 frames (the audit saw 2) |
| B holds an open stroke while A adds a frame and saves; B then ends the stroke | B wrote nothing: stored project is still A's 3 frames, orphans 0 |
| What B says | dialog "הציור הזה השתנה בלשונית אחרת" with both actions; status "לא נשמר"; red strip with "להוריד קובץ" |
| "להוריד את מה שיש כאן" | a real `.fliploop.json` with B's 2 PNG frames; the dialog stays open |
| "לטעון את הגרסה החדשה" | B shows A's 3 frames, status "נשמר", and saves normally afterwards (stored ink equals B's, orphans 0) |
| A stamp earned in each of two tabs (`x1-extra.mjs`) | lesson 1 in tab A, lesson 2 in tab B (booted before A's stamp): both stored |

### Finding 4: storage faults · FIXED

Script `g04-read-fail.mjs` (faults injected with an init script: reads of `projects` and `frames` throw; a project write fails once; `indexedDB.open` throws; `open` never answers). 14 of 14. Screenshots looked at.

| Check | Result |
|---|---|
| Gallery while reads fail | never "עוד אין עבודות"; shows "לא הצלחנו לקרוא את העבודות / שום דבר לא נמחק" with "לנסות שוב" |
| Home while reads fail | the same message, not a silent healthy screen |
| Editor deep link while reads fail | "לא הצלחנו לפתוח את הציור", not "not found" |
| Retry after the fault is lifted | Editor opens the drawing; Gallery shows the card |
| Settings "לגבות הכל" while reads fail | one toast "הפעולה לא הצליחה. שום דבר לא נמחק. נסו שוב בעוד רגע." |
| Unhandled rejections | 0 |
| A create that fails once | one toast, address back on `#/` (not stuck on `#/new`); the second tap creates the project |
| Storage blocked (`open` throws) | banner "אי אפשר לשמור בדפדפן הזה" on Home, Gallery, Settings; "אנימציה חדשה" answers on both taps with "אי אפשר לעשות את זה כאן: הדפדפן חוסם את השמירה במכשיר." |
| `open` never answers | Home is up after **3,138 ms** with the banner (the audit saw a blank page after 11 s) |

### Finding 5: a backup does not bring the stamps back · FIXED

Script `g05-backup.mjs`. Profile 1 (real input): lesson 1 to its stamp, a free project with 2 drawn frames, the weekly challenge to its stamp, then Settings "לגבות הכל". Profile 2 is a new, empty browser context; the file is imported through the Settings file input. 12 of 12.

| Check | Result |
|---|---|
| Backup file | `format: fliploop-backup`, 3 projects, `progress: {"lessonsDone":{"1":"2026-10-04T16:36:36.204Z"},"challengeWeeks":[39]}` |
| Clean profile after import | 3 projects; toast "יובאו 3 פרויקטים · החותמות שבגיבוי נוספו" |
| Lesson stamp | restored with its original date; Home reads **1/12**; station 1 on the Lessons path carries the stamp |
| Challenge stamp | restored (`[39]`), 1 stamp on the Challenge screen |
| `updatedAt` of every project | unchanged (Gallery order kept) |
| The same file imported again | still 3 projects; toast "הפרויקטים שבקובץ כבר כאן, אז הם לא יובאו שוב." |

### Finding 6: undo of a delete lands in the wrong place; 121 of 120 · FIXED

Script `g06-delete-undo.mjs`, real clicks on the strip, the frame menu and the toasts. 8 of 8.

| Check | Result |
|---|---|
| Frames 0 1 2 3; delete frame 3, then frame 2; undo the **older** toast first, then the other | after the first undo `0 2 3`, at the end **`0 1 2 3`**, stored `0 1 2 3`, 0 orphans (the audit got `0 2 1 3`) |
| The same, newer toast first | `0 1 2 3`, stored `0 1 2 3` |
| 120 frames | counter "120/120", notice "120 פריימים, זה המקסימום" |
| N at 120 | nothing added; toast "אי אפשר להוסיף: 120 פריימים זה המקסימום" |
| The 121 repro: delete (119), add (120), undo the delete | **refused: 120 in memory, 120 in IndexedDB**, counter "120/120", toast "אי אפשר להחזיר את הפריים: כבר יש 120 פריימים" |

### Finding 7: fill leaks between near shades · FIXED

Script `g07-fill.mjs`, real picks in the desktop panel and the "עוד גוונים" popover, real clicks on the canvas, exact pixel counts of the frame. 6 of 6.

| Scenario | Measured on the candidate | The audit on the released build |
|---|---|---|
| S1 (audit): black outline, darkest green `#00300F` inside, then yellow | black **2644 -> 2644 -> 2644**; green 34379 -> 0; yellow 34400 | black 972 -> 0 |
| S2 (audit): lightest-blue `#E6EFFF` sky, white cloud outline, white inside | sky 172800 -> 169474 -> **145893**; white 26220 | sky -> 0, the whole page white |
| S3 (mine): gray-7 `#35322D` page, black outline (22 apart), red inside, then blue | black 2541 -> 2541 -> 2541; gray-7 139235 kept; red 29852 -> 0; blue 29852 | not tested there |
| S4 (mine): gray-1 `#FCFAF6` page, thick white ring (9 apart, the closest pair of the palette), red inside | gray-1 137681 kept outside; white ring 5810 -> 5810; red 28518 inside | not tested there |
| S5 (sanity): plain fill on bare paper inside a pencil circle | red 34379, 0 unfilled pixels left inside the outline | worked |

### Finding 8: a canvas size change cuts for good · FIXED as ruled (R9), with one limit that stays

Script `g08-size.mjs`. 9 of 9.

| Check | Result |
|---|---|
| Dialog, wide to square | "הציורים יישארו במרכז. מה שמצויר בצדדים, מחוץ לריבוע, ייחתך. אחרי השינוי אי אפשר לחזור צעד אחורה." |
| Dialog, square to wide | "הציורים יישארו במרכז, ובשני הצדדים יתווסף שטח ריק. אחרי השינוי אי אפשר לחזור צעד אחורה." |
| After the change | 360x360, ink 5274, 3513 -> 2160, 0; "אחורה" and "קדימה" off, as the dialog said |
| Wide, square, wide with no edit in between | **both frames pixel-identical to the originals** (hash equal), and IndexedDB holds the same ink (5274, 3513) |
| A frame edited while square | keeps its edit, its sides stay cut (5274 -> 3056); the untouched frame comes back whole |
| Lessons 3, 6, 8 (desktop panel) and lesson 3 (phone "עוד" sheet) | no "גודל הדף" control; a free project on the phone has it |

The limit that stays, by the ruling: the cut-off sides are kept in memory only. A reload while the page is square makes the cut permanent (frame 2, whose ink was all at the edges: 3513 -> 0 after a reload and a change back). The dialog does say the sides are cut.

### Finding 9: drag reorder · FIXED

Script `g09-drag.mjs`: real mouse on 1280x800, real touch on a 390x844 phone profile. 8 of 8.

| Check | Result |
|---|---|
| Desktop: the centred frame, long press, dragged past its neighbour's centre, left and right alternately | **10 of 10** land one slot away; the strip's `scrollLeft` changed by 0 during every drag; the lifted cell was 0 px off the pointer (the audit: strip scrolled 92 px, cell detached, landed two slots away) |
| Desktop: stored order after the drags | equals the screen |
| Desktop, 24 frames: hold the last frame at the left edge without moving | strip scrolls by itself, `scrollLeft` 1656 -> 0; the frame lands at index 0 in one drag |
| Phone touch: the centred frame (three different frames), one slot | **10 of 10**, strip did not jump |
| Phone touch, 12 frames: last frame to the start in one drag | lands at index 0 (the audit: only the 5 visible frames were reachable) |
| Phone touch: a 520 ms press without movement | selects the frame (not swallowed) |

My first run dragged exactly 72 px and scored 5 of 10: every left drag stayed in place. That is the tie of note G-03, not the audit's defect (strip still 0 px, cell still under the pointer).

### Finding 10: desktop keyboard shortcuts · FIXED

Script `g10-keys.mjs`, real mouse and keyboard at 1280x800. 14 of 14.

| Check | Result |
|---|---|
| Space after: clicking the eraser key and drawing · clicking a frame cell · opening and closing a frame menu · clicking an onion count · clicking the pencil key · clicking an fps button | plays in **6 of 6**, no popover or menu opens (focus was on the clicked button each time) |
| Space on the focused Play button | one toggle per press: plays, second Space stops |
| Space in the title field | types a space, does not play |
| Mouse held down mid-stroke, then Ctrl+Z, ArrowRight, N, E | nothing changes: same frame, 2 frames, tool still pencil, stroke A intact |
| Ctrl+Z after that stroke | removes exactly that stroke (frame identical to before it, ink 1760); Ctrl+Y brings it back (3718): history intact |
| D during Play | stops playback, then duplicates (3 frames, not playing) |
| O key | onion state, the panel switch's `aria-checked` and its label all change together |

### Finding 11: lesson 9 gets stuck · FIXED

Script `g11-lesson9.mjs`. 7 of 7.

| Check | Result |
|---|---|
| Lesson 9 opens on | frame 7, its first blank (not on a locked frame) |
| Goal and step 3 | goal "ציירו את הנחיתה ושנו את ההחזקה"; step 3 says a hold must be changed to finish |
| Both blanks drawn, no hold changed | "2/2 צוירו" and the toast "כל הפריימים צוירו. עכשיו שנו החזקה באחד הפריימים ולחצו על ▶︎ (הפעלה) כדי לסיים." |
| Play with no hold changed, twice | the same toast again both times, no sheet, no stamp |
| One hold "+", then Play | plays one pass, stops by itself, sheet "קיבלתם חותמת" after 1,208 ms, stamp recorded |

### Finding 12: lesson 11, the text contradicts the drawing · FIXED

Script `g12-lesson11.mjs`; three screenshots looked at. 8 of 8.

| Check | Result |
|---|---|
| What is really on the frames | frames 1 and 5 are the prepared ones and hold the same stripe (2438 px, centred at x 167, left of the ball centre 240); the other six hold the circle only |
| The example the child copies | stripe at x 210, 269, 303 on frames 2, 3, 4 and again on 6, 7, 8: it moves to the right |
| Step 1 | "... בפריים 1 ובפריים 5 יש גם פס מוכן, בשניהם ליד הקצה השמאלי של הכדור." |
| Step 2 | "בפריימים 2 עד 4 הזיזו את הפס ימינה, קצת בכל פריים, עד שבפריים 4 הוא מגיע לקצה הימני." The old "from its place in frame 1 towards its place in frame 5" is gone |
| Step 4 | explains that frame 5 is the other half coming round, then frames 6 to 8 |
| Lesson page and Editor steps card | the same four steps |

### Finding 13: the stamp sheet gets stuck · FIXED

Script `g13-stamp-sheet.mjs`. 12 of 12.

| Check | Result |
|---|---|
| Lessons 2, 3, 4: all blanks drawn, Play, then leave 250 ms later (Back link, history Back, Back link) | **3 of 3**: no dialog on the next screen, stamp recorded, one plain toast "קיבלתם חותמת על שיעור N"; the next screen answers clicks (the audit: sheet over the other screen with dead buttons, 3 of 3) |
| Lesson 1 | sheet opens by itself after one pass (1,114 ms) |
| "להמשיך לצייר" | closes the sheet, Editor stays |
| Play and Stop again in the same session | no second sheet |
| Reopen the finished lesson ("לפתוח שוב"), Play, Stop | the sheet does not come back |
| Lesson 5 sheet, "next lesson" | lands on `#/lesson/6`, no dialog left behind |

### Finding 14: a stamp without drawing · FIXED (both routes)

Scripts `g14-no-draw.mjs`, `g08-size.mjs`, and the upgrade test for a lesson project that the released build had already made square.

| Route | Result |
|---|---|
| (a) change the page to square inside a lesson | the control does not exist in lessons 3, 6, 8 (desktop panel) or lesson 3 (phone "עוד" sheet) |
| (a) a lesson 5 project squared by the released build, where it showed "8/8 צוירו" | on the candidate: **"0/8 צוירו"**, Play gives no sheet and no stamp (section 3) |
| (b) "ניקוי הפריים" on all eight frames of lesson 5 | progress stays "0/8 צוירו" after every clear; every frame still holds its prepared drawing (ink identical); Play, Stop: no sheet, no stamp (the audit: 8/8 and a stamp) |
| Draw, then clear | 1/8, then back to 0/8 with the prepared drawing (2248 -> 4653 -> 2248); the toast's "להחזיר" brings the stroke back |
| Mine: erase part of the prepared drawing on all eight frames | still 0/8 (removed ink does not count) |

### Finding 15: the first video export comes out frozen · FIXED (on this PC; real Safari not testable here)

Script `g15-video.mjs`. Each run is a new Chrome process. 12 frames, each with a vertical bar at its own x, 12 fps, loop: the plan is 36 samples, 3.0 s. The finished video in the overlay is stepped through sample by sample (seek, draw to a canvas, find the bar), so every one of the 36 samples is identified.

| Launch | When "להקליט וידאו" was pressed | Result |
|---|---|---|
| 1 | the moment the overlay was up | done in 6.5 s (includes the warm-up), MP4, 3.03 s, **36/36 samples show the right frame**, 35 frame changes, 12/12 frames |
| 2 | 4 s after the overlay opened | done in 3.3 s, 3.04 s, **36/36**, 35 changes, 12/12 |
| 3 | at once | 6.5 s, 3.03 s, **36/36**, 35 changes, 12/12 |
| 4 | after 4 s | 3.3 s, 3.04 s, **36/36**, 35 changes, 12/12 |
| two more launches in a first trial run | one each | 36/36 and 36/36 |

**6 of 6 fresh launches clean.** Control, released build, two fresh launches: 31/36 and 32/36, with one frame frozen over 5 to 6 samples near the start (`0,1,2,3,4,4,4,4,4,4,10,11,...`), while the app said the video was ready. The freeze in my control is shorter than in the audit (headless Chrome 154 on this PC), but it is the same defect and it is gone on the candidate.

### Finding 16: a frame delete cannot be undone from the keyboard · FIXED

Script `g16-kbd-undo.mjs`, keyboard only (cell focused, Enter, Tab to "למחוק", Enter). 9 of 9.

| Check | Result |
|---|---|
| Where focus lands after the delete | on the toast's action "להחזיר" (5 Tab presses inside the menu to reach "למחוק"; the audit counted 44 Tabs to the toast) |
| 6 s later | the toast is still there (its timer waits while it has focus) |
| Enter on it | the frame is back in its place: `0 1 2 3` |
| Escape on the toast, then Ctrl+Z | focus returns to a frame cell, "אחורה" is enabled, Ctrl+Z restores the frame in its place |
| Focus moved away, toast gone after 6.5 s, then Ctrl+Z | frame restored in its place, in memory and in IndexedDB (ink in all 4 frames) |
| Delete, then a stroke, then Ctrl+Z | the stroke is undone and the frame stays deleted (R22: "as long as no newer step exists") |

---

## 2. Core regression · PASS

All on http://127.0.0.1:9410/ (real response headers, policy active), real input. Scripts `r1-tools.mjs` to `r5-sw-offline.mjs`, `n1-network.mjs`, `s1-subpath.mjs`.

| Area | Measured |
|---|---|
| Home | heading, "אנימציה חדשה", two cards, two header links, the flipbook art and its pause button ("להפעיל את האנימציה" after one press) |
| New animation | real click on Home: Editor on one empty frame. A stroke begun 0, 60, 110, 160, 220 ms after arriving from the Gallery lands whole, 5 of 5 |
| Draw | pencil S, M, L measure 2, 6, 10 px across; eraser M cuts 20 px; fill colours a closed box with exact `#E23B2E` (25,616 px, inside only); Move shifts the drawing and keeps every pixel |
| Palette | 12 base swatches; "עוד גוונים" opens 70 shades in 10 rows; all 12 base colours and 7 shades from 7 rows paint their exact colour; recent colours: 7 kept, newest first, chip in the panel and a row in the chart |
| Undo, redo | 55 strokes: exactly 50 steps back, 50 forward, frame hash identical after redo |
| Frames | "+" adds and selects; duplicate copies the pixels; insert adds a blank; delete removes; hold stepper off at x1 and x12, badge "×3"; ArrowLeft and the step button move one frame; IndexedDB equals the screen at the end, 0 orphans |
| Onion skin | frame 2: 2,962 red and 2,962 blue ghost pixels; off: 0 and 0 |
| Play | median frame time 166.7 ms at 6 fps, 83.3 ms at 12 fps; at 24 fps 51 changes in 2.2 s (33 and 50 ms steps on a 60 Hz screen); loop order `0123 0123`; ping-pong `0123210123210`; a frame held x3 stays 250 ms; Stop lands on the frame showing; Play with one frame says "צריך לפחות 2 פריימים" |
| GIF | GIF89a 480x360, 6 frames, loops forever, frame delays 8, 9, 8, 8, 9, 8 cs = exactly 500 ms for 6 frames at 12 fps (my first assertion wanted 8 cs on every frame and was wrong; the spread is right). Half size: 240x180, its own `-half.gif` name |
| Video | finding 15: 6 of 6 fresh launches |
| Print | PDF: `%PDF`, media box `0 0 595.28 841.89`, `%%EOF`, "6 כרטיסים · גיליון אחד". PNG sheet: 2480x3508, chunks IHDR, pHYs, IDAT, IEND, pHYs 11811. "Back" returns to the same Editor |
| Project file | export: JSON with 6 PNG frames and the title; toast `קובץ הפרויקט של "בדיקת ייצוא Test 7" ירד.` inside the overlay and hit-testable. Import in a clean profile: 6 frames **pixel-identical** (hash equal), same title |
| Gallery | empty state with one primary action; Editor "לגלריה" goes up without growing history and the card is there at once; opening "אנימציה חדשה" and leaving without drawing leaves no card; card menu duplicate, rename, download; delete asks first and "להחזיר" brings the card back; history Back with the menu open closes the menu and the Gallery stays |
| One full lesson to the stamp | lesson 1 six times (1,114 and 1,136 ms to the sheet in Chrome, 1,347 and 1,390 ms in WebKit, where timed), lessons 2, 3, 4, 5, 9 at least once each |
| Weekly challenge | "אתגר 40 · נשארו 7 ימים"; two drawn frames give the stamp with a toast; the stamp shows on the Challenge screen |
| Settings | storage figures "96 KB / 10.0 GB · 0%", protection line, last-backup line; the single-letter switch is on by default, stays off after a reload, and then E and N do nothing in the Editor while Space still answers; error report downloads as `fliploop-report-2026-10-04.txt` |
| Install card | heading "התקנה", lead line and the browser-menu hint (headless Chrome offers no install prompt, so the button state cannot be seen here) |
| 404 | unknown path: status 404, Hebrew page "הדף הזה לא נמצא", link home; the same offline |
| Real service worker | worker `411a89230697` active and in control, 73 files precached (`404.html`, `js/fonts.js` among them); draw, Play, GIF with the worker; **offline**: reload opens the Editor with both frames, GIF export works, all eight screens render, the web fonts load from the cache; no reload by itself |
| Pages shape, `/fliploop/`, no response headers | 7 of 7: boots, worker scope `/fliploop/`, stroke kept after a reload at 300 ms, GIF under the meta policy, offline reload, Hebrew 404 whose link opens `/fliploop/` (on a first visit with no worker my local host is not `*.github.io`, so the link went to `/`; the script in `404.html` takes the first path segment on `*.github.io`, read in the source) |
| Network | a full journey talks only to its own origin (75 requests) and the two Google Fonts hosts (6); no request other than GET, no cookie |
| Unit tests, manifest | `node --test "tests/*.test.mjs"`: 63 pass, 0 fail. `build-sw-manifest.mjs --check`: up to date, `411a89230697`, 73 files |
| Console | **0 console errors, 0 page errors, 0 policy violations, 0 missing string keys** in every candidate run. The only error lines anywhere are the browser's own notice for the unknown paths I asked for and the injected storage faults of finding 4 |

---

## 3. Upgrade safety: data made by the released build survives the update · PASS

**Setup.** My own server (`switch-server.mjs`, port 9420) serves ONE origin from either the released code or the candidate's `site/`, each with its own `_headers`, switched by a control URL. Two persistent Chrome profiles (short paths `%TEMP%/flgA`, `%TEMP%/flgB`, real service worker) were filled on the released build with real input, then the origin was switched to the candidate. Scripts `u1a-old-free.mjs`, `u1b-old-lessons.mjs`, `u1s-snapshot.mjs`, `u2-update.mjs`, `u3-open-all.mjs`.

**What the released build stored (profile A, 7 projects, 32 frame records):** a 3-frame free project (fps 24, ping-pong, title "ישן א׳ John 12") · a 360x360 free project with 2 frames · an empty project (the released build stores one per "אנימציה חדשה") · lesson 1 finished with its stamp · lesson 5 made square on the released build (its progress jumped to 8/8 there, the audit's free-stamp route, stopped before Play) · lesson 8 with 2 of 8 blanks drawn · the weekly challenge with its stamp · settings: recent colours `#FFAC9F`, `#0C45AB`, the three tips and first-Play seen, the "not protected" banner dismissed, paper A4. Released worker `193c89fdf674`, `app.js?v=8`.

**The update itself.**

| Path | What happened | Page loads caused by the update | Loop? |
|---|---|---|---|
| Profile B: open the app after the deploy, press the released build's own "לרענן" toast | first open is still the released build (v=8) from its cache; the candidate worker `411a89230697` installs and waits; toast "יש גרסה חדשה של FlipLoop"; after the press the candidate (v=11) is on screen with its worker in control and the old cache deleted | **1** | none: 0 further loads in the next 15 s, nothing waiting, one shell cache |
| Profile A: the browser was closed while the candidate worker was waiting (toast ignored), then opened again | the candidate (v=11) is on screen at once, its worker in control, the old cache deleted | **0** | none in 15 s |

**Nothing lost (compared with the snapshot taken on the released build, read straight from IndexedDB):**

| Check | Profile A | Profile B |
|---|---|---|
| Project records (id, title, kind, frames, size, fps, mode, `updatedAt`) | 7 of 7 identical | 3 of 3 |
| Frames: ink per frame, order, holds, no orphans | 7 of 7 projects, 32 records | 3 of 3, 6 records |
| Settings object | byte-identical | byte-identical |
| Stamps (`lessonsDone`, `challengeWeeks`) | identical | n/a |
| Gallery of the candidate | 7 cards, the empty project included (records without `touched` count as the user's; nothing was purged) | 3 cards |
| Console errors, policy violations, missing keys after the candidate took over | 0, 0, 0 | 0, 0, 0 |

**Everything opens and works (profile A, `u3-open-all.mjs`, 14 of 14):** all 7 projects open in the candidate's Editor with the same pixels, size, fps, mode and title · the recent colours are offered (chip and list) · a new stroke on an old project is saved (ink 1782 -> 4108 in IndexedDB, 0 orphans); add a frame, draw, reload at once: 4 frames, stroke kept · **lesson 5 squared before the update shows the true count "0/8 צוירו" (the released build said 8/8), Play gives no sheet and no stamp, and there is no size control** (screenshot looked at: the figure sits cropped at the left edge, usable) · lesson 8 keeps "2/8 צוירו" · lesson 1 shows "הושלם 4.10.2026", button "לפתוח שוב", Play and Stop open no sheet · Challenge: 1 stamp, "להמשיך לצייר" · Home: 1/12, "המשך" link, the dismissed banner stays dismissed · a backup taken after the update holds 7 projects and both stamps · the old settings keys are all still there after use.

Notes G-02 and the released-`pwa.js` limit (top of this file) come from this section.

---

## 4. Hebrew copy on screen · PASS

Script `c1-copy.mjs` at 320x568 and at 390x844 (touch profile), 30 states each: Settings (with the import toast), Home, Gallery, card menu, rename, delete confirm, Lessons top and bottom, lesson 5 page, Challenge, free Editor, colours sheet closed and with the 70 shades open, "עוד" sheet, resize confirm, width sheet, frame menu, the frame-deleted toast, the two-tab dialog (raised through the Editor's own `showConflict()`; the real two-tab flow is in finding 3), Export idle top and bottom, GIF done, Print, Editor not-found, lesson Editor, steps sheet, the lesson 9 hold nudge, the stamp sheet. Every visible text plus every `aria-label`, `title`, `alt` was scanned. Ten of the 320 px screenshots were opened and read.

| Check | 320 px | 390 px |
|---|---|---|
| Raw `{placeholder}` | 0 in 30 states | 0 in 30 states |
| "undefined", "NaN", "null", "[object" | 0 | 0 |
| Missing string key (console) | 0 | 0 |
| Horizontal page scroll | none | none |
| Text outside the screen | none | none |
| Text cut | only the two cuts that are by design: the status word under 360 px (icon only, R39) and the lesson Back label under 400 px (arrow only) | the lesson Back label only |
| Em or en dashes in `site/` | 0 (grep over the whole folder) | |

**Undo and redo (R38).** Visible words "אחורה" and "קדימה" (at 320 px the tool keys are icons only, as before). Names: disabled "אחורה, אין צעד לחזור אליו" / "קדימה, אין צעד להחזיר"; enabled "צעד אחורה: לבטל את הצעד האחרון", tooltip "צעד אחורה (Ctrl+Z)". These are exactly the rows of `final-ui-copy.md` (lines 179 to 182) and of the Copywriter's table in `audit/08-copy.md`. No "ביטול" or "שחזור" anywhere on the Editor screen itself; the toast action is "להחזיר"; the Cancel button of a dialog is "ביטול". (My first assertion wanted the enabled name to start with "אחורה"; it starts with "צעד אחורה", which contains the visible word and is the approved text, so the assertion was wrong, not the build.)

**New messages, read on screen as a native reader would.** All grammatical, plural, gender-free, no English leftovers:
- "לא הצלחנו לקרוא את העבודות · שום דבר לא נמחק. נסו שוב בעוד רגע. · לנסות שוב"
- "לא הצלחנו לפתוח את הציור"
- "אי אפשר לשמור בדפדפן הזה" (banner) and "אי אפשר לעשות את זה כאן: הדפדפן חוסם את השמירה במכשיר." (toast)
- "הפעולה לא הצליחה. שום דבר לא נמחק. נסו שוב בעוד רגע."
- "הציור הזה השתנה בלשונית אחרת · כדי לא למחוק את הגרסה החדשה, אי אפשר לשמור מכאן. אם תטענו אותה, מה שציירתם כאן ייעלם. אפשר להוריד אותו קודם כקובץ. · לטעון את הגרסה החדשה · להוריד את מה שיש כאן" (4 lines at 320 px, both buttons on screen)
- "אי אפשר להחזיר את הפריים: כבר יש 120 פריימים" · "אי אפשר להוסיף: 120 פריימים זה המקסימום" · "120 פריימים, זה המקסימום" (the reversed order of the audit is gone)
- "כל הפריימים צוירו. עכשיו שנו החזקה באחד הפריימים ולחצו על ▶︎ (הפעלה) כדי לסיים." (2 lines at 320 px; the ▶ is a plain triangle, not a colour emoji, in Chrome and in Playwright WebKit)
- "קיבלתם חותמת על שיעור 2" · "קיבלתם חותמת על האתגר של השבוע"
- "יובאו 3 פרויקטים · החותמות שבגיבוי נוספו" · "הפרויקטים שבקובץ כבר כאן, אז הם לא יובאו שוב."
- `קובץ הפרויקט של "בדיקת ייצוא Test 7" ירד.` (mixed Hebrew and Latin title, reads in order)
- 404 page: "הדף הזה לא נמצא"

---

## 5. Layout sanity · PASS

Script `l1-layout.mjs`, four sizes, seven screens each (Home, free Editor, lesson Editor, Lessons, Gallery, Settings, Export), seeded with a finished lesson, a challenge project and a free project. 28 screenshots, four contact sheets opened and looked at, plus the lesson Editor at 844x390, 1280x800 and 390x844 at full size.

| Size | "אנימציה חדשה" on Home without scrolling | Editor rows (top bar, goal strip, canvas, tools, steps card, panel, strip, playbar) | Canvas free / lesson | Play | Export dialog | Horizontal scroll |
|---|---|---|---|---|---|---|
| 390x844 touch | yes (449..505) | no overlap, nothing outside | 358x268 / 358x268 | 48x48 | sheet inside the window, 4 cards | none |
| 844x390 touch | yes (161..217), two columns | no overlap, strip and playbar share one row | 328x246 / 328x246 | 48x48 | 560 px dialog inside the window | none |
| 768x1024 touch | yes (711..767) | no overlap | 736x552 / 736x552 | 48x48 | inside | none |
| 1280x800 | yes (235..291) | no overlap; panel, steps card, canvas, rail side by side | 720x540 / 600x450 | 48x48 | 560 px dialog with a margin (40..760) | none |

What I saw: Home, Lessons (zigzag path on phones, three rows of four with a dashed path on desktop, no name on the dashed line), Gallery (banner, action row, starter, cards), Settings (reading column on desktop, storage figure on the start side), Export (GIF, video, print, project file) all read cleanly at the four sizes. The lesson Editor opens on its first blank frame with the previous frame's ghost in red.

`audit-render.js` (Edge, 2 pages x 2 viewports, screenshots sent to my scratch folder so the project stays untouched): exit 0, zero MUST-FIX, one review-only line (G-06). `audit-site.py`: clean, exit 0.

---

## 6. WebKit pass (Playwright WebKit 18.2 on Windows, not real Safari) · PASS

Script `wk1.mjs`, mouse input, policy active. 390x844: 10 of 10. 1280x800: 11 of 11.

| Check | 390x844 | 1280x800 |
|---|---|---|
| Six screens render, none scrolls sideways | yes | yes |
| A stroke, reload after 300 ms | kept (1780 in memory and in IndexedDB), label was "שומרים…" | kept (1776) |
| A stroke, reload after 50 ms | kept (3533) | kept (3534) |
| Fill stays inside a closed box | 25,891 px | 25,573 px |
| Play runs, Stop stops | yes | yes; Space after a tool click plays, opens nothing |
| GIF export | GIF89a 480x360 | GIF89a 480x360 |
| Lesson 9 nudge names the hold | yes (screenshot looked at, ▶ is a plain triangle) | yes |
| Lesson 1 to its stamp, sheet by itself | 1,390 ms | 1,347 ms |
| Backup, then import in a clean WebKit context | 3 projects and the lesson stamp | the same |
| Console errors, policy violations, missing keys | 0, 0, 0 | 0, 0, 0 |

`MediaRecorder` is `undefined` in this engine, so video cannot be judged here.

---

## 7. Extra probes of my own

| Probe | Script | Result |
|---|---|---|
| A stale rescue record against a second tab | `x1-extra.mjs`, `x2-rescue-two-tabs.mjs` | what tab B shows as "נשמר" is exactly what a fresh tab opens, 0 orphans, the record is cleared; but the closed tab's last stroke is lost when B draws first (3 of 3 at 40 and 150 ms; kept at 600 ms). Finding G-01. If a new tab boots first: recovered, and B gets the dialog |
| Stamps earned in two tabs | `x1-extra.mjs` | both stored |
| A stroke right on arrival in the Editor | `x1-extra.mjs` | 5 of 5 delays land whole; the arrival class does not stick |
| Move and erase as stamp routes | `g14-no-draw.mjs` | erase: 0/8; Move: counts (G-04) |
| Hosts and cookies | `n1-network.mjs` | own origin and Google Fonts only, GET only, no cookie |

---

## 8. Not verified here

Still needs a real device, exactly as `12-fix-direction.md` section 8.3 and `13-integration-notes.md` section 7 list: real iPhone and Mac Safari (video recording, the synchronous rescue write in `pagehide`, the native colour picker, safe areas, the ▶ glyph), a real Android phone (pull-to-refresh, app switch during a save, finger drag reorder and long press, share sheets, the automatic update in an installed app), a real pen, a real screen reader, a real printer. The first-video result is from one PC (Chrome 154, headless). The automatic update between two candidate versions (bump to bump) was not re-run by me; the integrator's two real bumps are in `13-integration-notes.md` section 3.3, and my upgrade test covers the released-to-candidate step. The install prompt cannot be raised in headless Chrome.

## 9. Evidence

Scripts, outputs and screenshots: scratchpad `pw2/gate/` (`lib.mjs`, `g01a` to `g16`, `r1` to `r5`, `u1a` to `u3`, `c1`, `l1`, `wk1`, `x1`, `x2`, `n1`, `s1`, the three small servers, `shots/`, `tmp/`). The released build's copy: `pw2/gate/old/site`. The two test profiles: `%TEMP%/flgA`, `%TEMP%/flgB` (and one abandoned first try, `%TEMP%/flg1`); they hold only test drawings and can be deleted.
