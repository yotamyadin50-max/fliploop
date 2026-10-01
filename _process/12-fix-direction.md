# Fix Direction: FlipLoop audit round (Build Manager, Revision Direction)

**Date:** 2026-10-01 · **Base:** `main` at `329ddd7` (auto-update work, committed, NOT pushed: `origin/main`, GitHub Pages and Netlify all still serve `a87cb93`).
**User instruction (verbatim):** "תשפר את הכל ותתקן את הכל ואז תעשה את העידכון האוטומטי"
**Trigger:** the ten audit reports `_process/audit/01..10-*.md` plus `11-verification.md` (still IN PROGRESS when this was written: only T-01 and EX-01 have a verdict).
**Shape:** six Developer agents in parallel, one git worktree and one branch each, then one integrator merges, regenerates, tests and releases.
**Shell:** read `_process/audit/ENV-NOTE.md` first (PATH prefix for Bash, or use PowerShell; Playwright lives in the scratchpad `pw2` folder).

Line numbers in the audits are for `a87cb93` or the live site. In `329ddd7`, `editor.js` is 32 lines longer and `autosave.js` 5 lines longer. Method names in this file are the stable reference.

---

## 0. How to read this file

| Section | What it gives you |
|---|---|
| 1 | Rules every workstream follows (Tell, no exceptions) |
| 2 | Finding ID scheme and the duplicate map |
| 3 | Rulings: every design, copy and behaviour decision, each with its reason |
| 4 | Step 0: what the integrator commits before the six branches are cut |
| 5 | File ownership: whole files, `editor.js` by method, `style.css` by section, the copy files |
| 6 | Contracts between workstreams (the only places where two branches touch one behaviour) |
| 7 | The six workstreams: items, fix direction, acceptance checks |
| 8 | Not fixing, closed without a code change, needs real hardware |
| 9 | Coverage ledger: every audit ID and where it went |
| 10 | Integration plan |
| 11 | Release checklist (GitHub Pages first, then exactly one Netlify deploy) |
| 12 | Plan amendments the integrator records, and the line for the loop |

Tags used in the item tables: **Tell** = do exactly this. **Delegate** = the how is yours, the acceptance check is not. **R!** = verdict still pending in `11-verification.md`: reproduce on the base build first (see rule 1.2).

---

## 1. Rules for all six workstreams (Tell)

1. **Your branch, your worktree, your files.** Work only in `.worktrees/wsN` on branch `fix/wsN`. Edit only what section 5 gives you. If a fix seems to need a file or method you do not own, do not edit it: use the contract in section 6, or write the need in your `fix-wsN.md` under "Needs from another workstream".
2. **Fail first.** Reproduce each finding on your untouched branch before fixing it, with a real browser and real input, and keep the script. For the eight **R!** items (F3, F5, F6, G-01, L-03, A1, J7, J8) this is a gate: if a real attempt does not reproduce it and the cause is not plain in the code, change nothing for that item and say so in your notes. Re-read `11-verification.md` before you start, it may have new verdicts.
3. **Never run** `node tools/build-sw-manifest.mjs` for a commit, never change `?v=` in `index.html`, never append to `_process/07-developer-notes.md`. Write your own `_process/fix-wsN.md`. (WS5 may run the manifest tool locally to test the service worker, then must restore the generated block before committing.)
4. **Hebrew strings never go into JS by hand.** New key: add a row to your own sub-table in `final-ui-copy.md` section 24 (created in Step 0). Changed wording of an existing key: only WS6 edits existing rows of `final-ui-copy.md`, only WS3 edits `final-lessons.md`. Then run `node tools/build-strings.mjs` and commit the regenerated `site/js/data/*.js` so your branch runs. The integrator regenerates after every merge, so conflicts in those three generated files are expected and harmless.
5. **Strings without a draft in this file:** write a working draft by the conventions in `final-ui-copy.md` section 0 (plural imperative for instructions, infinitive for buttons, no em or en dashes, numbers in `.num`), list every new key in `fix-wsN.md`. One Copywriter pass reviews all new keys at integration.
6. **Test with service workers blocked** (`browser.newContext({ serviceWorkers: "block", locale: "he-IL" })`), from your own static server: `python -m http.server 940N --bind 127.0.0.1` with `.worktrees/wsN/site` as the working directory (WS1 9401 ... WS6 9406). Do not use port 9400 or 5178. Scripts go in `pw2/fix-wsN/`.
7. **Unit tests:** `node --test tests/` must stay green. New tests go in a new file `tests/wsN.test.mjs`. Only these edits to `tests/core.test.mjs` are allowed: WS2 the fill, palette and undo tests; WS3 the test "lessons match the plan table"; WS5 the GIF, PDF and print tests; WS6 the test "copy: no em or en dashes".
8. **Look, do not only measure.** Every visual change gets a screenshot at 390x844 and 1280x800 that you open and look at. Where a claim rests on computed styles only, say so in your notes.
9. **Console clean:** zero console errors and zero page errors over your flows, and no horizontal page scroll at 320, 390 and 1280 on any screen you touched.
10. **Product promises stay:** no server, no signup, no AI, everything on the device. No new feature beyond what an audit item asks for.
11. **`fix-wsN.md` format**, one row per item: ID, reproduced (yes, no, how), what changed (files and methods), checks run with measured results, anything not done and why. Plus three lists: new string keys, contracts used, things noticed outside your area.

---

## 2. Finding IDs and the duplicate map

Several reports reuse the same letters, so every ID below carries its report where needed.

| Report | IDs as written here |
|---|---|
| 01 Critic journey | J1 to J10, cosmetics **J-C1 to J-C10** |
| 02 Tools | T-01 to T-16 |
| 03 Frames, playback | F1 to F15 |
| 04 Lessons, challenge, gallery | L-01 to L-11, challenge **CH-C-01 to CH-C-03**, G-01 to G-11, **PERF-P-01**, **SET-S-01** |
| 05 Exports | EX-01 to EX-10, unverified notes **EX-N1 to EX-N4** |
| 06 PWA, storage, layout | storage S1 to S9, **PWA-P1 to P5**, **LAY-L1 to L9** |
| 07 Design | D-01 to D-16, suggestions **DS-01 to DS-08** |
| 08 Copy | **COPY-C-01 to C-24** |
| 09 Code review | **CODE-C1 to C18**, **CODE-L1 to L15**, **CODE-DEAD** |
| 10 WebKit, accessibility | A1 to A14, **WK-W1, WK-W2** |

**Merged duplicates (one item, one owner):**

| Merged item | Same finding in | Owner |
|---|---|---|
| "Saved" label and unload loss | J1 = F1 = S1 = CODE-C1 | WS1 |
| Change during a save is lost | F2 = CODE-C2 | WS1 |
| Two tabs | F4 = S2 = CODE-C3 | WS1 |
| Read failure looks empty | S3 = CODE-C5 (read part) | WS1 |
| W1 returns after a backup | S8 = G-02 | WS1 |
| Backup has no stamps | G-01 = CODE-L11 | WS1 |
| Starter double tap | G-04 = CODE-C12 (first bullet) | WS1 |
| Import trusts frame ids | G-06 = CODE-C14 (point 2) | WS1 |
| Empty projects pile up | J7 = G-11 (second half) | WS1 |
| Fill leaks between close colours | T-01 = CODE-C10 (T-10 is its cosmetic tail) | WS2 |
| Space does not play | T-03 = F9 | WS2 |
| Shortcuts during a stroke | T-04 (a, b) = CODE-C13 | WS2 |
| Onion switch out of sync | T-05 = A2 | WS2 |
| Pen cancel kills finger input | T-06 = CODE-L2 | WS2 |
| Colour well is stale | T-13 = A14 | WS2 |
| Size change inside a lesson | L-02 = CODE-C4 (split: a = the control is live, b = projects already made square; see R9, R14) | WS2 (a), WS3 (b) |
| Stamp sheet over another screen | J2 = CODE-C18 (second bullet) | WS3 |
| Stamp sheet repeats | J4 = L-05 | WS3 |
| Lesson 9 dead end | L-01 = COPY-C-02 | WS3 |
| Lesson 11 text vs drawing | L-04 = COPY-C-01 | WS3 |
| Stamp number collides | L-08 = D-03 = COPY-C-23 (stamp line) | WS3 |
| Lesson names cross the path | L-09 = D-02 = LAY-L7 = COPY-C-14 | WS3 |
| D during playback | F7 = T-04 (c) = CODE-C13 ("Also") | WS4 |
| Play with one frame is silent | F12 = J8 (second half) | WS4 |
| Coach leader over tool labels | D-15 = J-C2 = T-16 | WS4 |
| Toast covers the phone tool row | D-14 = J9 (second half) | WS4 |
| Focus ring clipped on cells | D-08 = A13 (point 5) | WS4 |
| Toast hidden behind a modal | A3 = COPY-C-06 | WS4 |
| Double runs on the print screen | EX-05 = CODE-C12 (second, third bullet) | WS5 |
| GIF with exactly 256 colours | EX-04 = CODE-C15 (palette part) | WS5 |
| No CSP, no frame protection | PWA-P3 = CODE-L13 | WS5 |
| Wrong address, broken shell | PWA-P2 + CODE-C9 | WS5 |
| Import button 48 px | J-C5 = LAY-L8 = D-04 (gallery part) = WK-W2 | WS6 |
| Panel cut with no scroll cue | LAY-L5 = D-13 = J10 (first half) | WS6 |
| Storage figure left-aligned | D-06 = LAY-L9 = SET-S-01 = COPY-C-23 (storage line) | WS6 |
| "More" sheet size control | D-05 = J-C7 | WS6 |
| Card meta wraps | J-C4 = G-08 | WS6 |
| Landscape canvas is tiny | LAY-L2 = T-15 | WS6 |
| Label in name | A6 = COPY-C-16 | WS6 |
| Week label and holiday drift | CH-C-03 = CODE-C16 = COPY-C-22 (last two bullets) | WS6 (label), not fixing (drift) |

Where one audit item holds several unrelated defects, it is split with a letter (for example J9a, J9b) and each part has exactly one owner. Section 9 lists every split.

---

## 3. Rulings (binding; nobody needs to ask)

**Storage**

| # | Ruling | Reason |
|---|---|---|
| R1 | **"נשמר" means: everything on the screen is committed to IndexedDB.** From the moment anything changes (stroke end, a title key, fps, mode, onion, hold, order) the label shows the saving state until the transaction commits. It never shows "saved" by default. | A label that says "saved" during a wait is a false statement (four auditors, 9 of 9 losses). |
| R2 | **Save timing:** 250 ms after the last change (was 2 s), at least every 2 s while changes keep coming (was 10 s), frame operations at once (unchanged). A frame is never encoded in the middle of a stroke. **Unload safety net is synchronous:** on `pagehide` and on `visibilitychange: hidden` the pending write is also put into one `localStorage` rescue record (PNG data URLs of the dirty frames plus the project fields); boot applies it to IndexedDB before the first screen and deletes it. | An async write started in `pagehide` does not finish (measured). `localStorage` is the only synchronous store, and one 480x360 frame is a few tens of KB. |
| R3 | **Two tabs:** every write checks, inside its own transaction, that the stored `updatedAt` is not newer than the one this tab loaded. If it is newer, nothing is written and the tab shows a dialog with two actions: load the newer version, or download what is here as a project file. A `BroadcastChannel` tells other tabs after each save; a tab with nothing unsaved reloads its document by itself. Settings and progress writes merge inside one transaction (union of stamps, earliest date wins). | Never overwrite silently, never drop silently. One person draws in one tab at a time, so the automatic reload covers the real case. |
| R4 | **Storage blocked or broken:** no in-memory mode. One honest state instead: a fixed banner on Home, Gallery and Settings, a distinct "could not read, nothing was deleted" state with a retry (never the empty Gallery, never "not found"), every start action says why it cannot start, `indexedDB.open()` gets a 3 s timeout. | An in-memory mode is a new feature and a second code path for saving. The defect is the false "all is well". |
| R5 | **Untouched new projects are invisible.** A project gets `touched: false` when created with no ink. The first save with ink, a second frame or a rename sets it to true. `listProjects()` hides untouched ones (Gallery, Home "המשך", W1, backup, default-title count); boot deletes untouched projects older than 24 hours. Records without the field count as touched. | Forward after Back must still open the same project, so it cannot be deleted on leave. |
| R6 | **Backup and import.** A backup also carries `progress` (lesson dates, challenge weeks); import merges it. Imported frames always get new ids. A project id that is not `[\w-]+` gets a new id. Import keeps the file's `updatedAt`. An entry whose id exists with the same `updatedAt` is skipped ("already here"); same id with a different `updatedAt` imports as a copy. A lesson or challenge project that clashes with an existing one imports as a free copy with the "(עותק)" suffix and the note. Frames that fail to decode, or whose pixel size is not the project's, import blank and are counted in the toast; a file where no frame of any project can be read is refused. Bad entries in a backup are skipped and counted, valid ones import. A quota failure opens W2b and says how many were imported. | Each rule closes one measured hole (G-01, G-05, G-06, G-07, G-10, G-11, CODE-C14). |
| R7 | **W1 after a backup:** a backup counts as the dismissal (`w1DismissedAt` = now, `lastBackupAt` = now). The 7-day rule of the plan then applies. | The banner asked for a backup; coming back at once reads as a nag. |

**Drawing**

| # | Ruling | Reason |
|---|---|---|
| R8 | **Fill: fix the algorithm, leave the palette alone.** Tolerance depends on the clicked pixel: 32 per channel when it is not fully opaque (bare paper, soft edges), **4** when it is fully opaque paint. The edge ring is re-tinted on a refill (un-mix the old fill colour, mix in the new one). A unit test checks all 2,556 pairs of the 72 colours, not only neighbours. | The 70 shades are approved and identical on every device; the closest pair is 9 apart, so 4 can never leak. `11-verification` confirms the leak needs an already painted area, which is exactly the opaque case. |
| R9 | **Canvas size.** Inside a lesson the control does not exist. In free projects the change stays, with two additions: the pre-change bitmaps are kept in memory until the Editor is left, and changing back restores every frame that was not edited in between; the dialog has one body per direction (Copywriter's texts) plus one sentence that the steps back are gone. | Lessons depend on 480x360 geometry. A child who tries square and goes back should not lose the sides. Undo patches are in old coordinates, so they cannot survive. |
| R10 | **Eraser sizes are its own: 8, 20, 40 px** (pencil stays 2, 5, 10). Keys 1, 2, 3 keep working for both. | One fill tap paints an area that a 10 px eraser cannot realistically clear. |
| R11 | **Space is always Play or Stop in the Editor,** unless focus is in a text field or a dialog is open. Enter activates the focused control. The key-up must not click the focused button as well. | The app teaches one meaning for Space ("הפעלה (רווח)"). |
| R12 | **Onion skin stays under the drawing.** Addition: where the current frame's own opaque paint hides a ghost and the neighbour frame differs at that pixel, the ghost is drawn above, same tint and opacity. Nothing changes for line drawings. Onion colours and opacities are not changed (A11). | Keeps the approved stack, brings the ghost back after a bucket-filled background. |
| R13 | **Single-letter shortcuts get an off switch** in Settings, default on. Space, arrows and Ctrl+Z are not affected. | WCAG 2.1.4 Level A, two small changes. |

**Lessons and challenge**

| # | Ruling | Reason |
|---|---|---|
| R14 | **Done rule and the sheet.** "Done" for a frame = 50 or more pixels of **added** ink compared with its prepared drawing (removed ink never counts). When the rule is met and Play is pressed, the animation plays one full cycle, stops by itself, and the stamp sheet opens. Stop before that also opens it. The sheet opens only at the moment the stamp is first earned, never again. If the child leaves while it plays, the stamp is still recorded and a plain toast on the next screen says so; no sheet opens outside the Editor. | Instruction and trigger must match (J3). A reward names the moment it was earned (J4). |
| R15 | **Lesson 9:** when both blanks are drawn and no hold was changed, the nudge names the missing step (Copywriter's `lessonMode.nudgeHold`), and it shows again if Play is pressed in that state. Steps and goal get the Copywriter's wording. | Play must never do nothing without a word. |
| R16 | **"ניקוי הפריים" in a lesson returns the frame to its prepared drawing** (not to empty). On a locked frame it stays blocked. | A lesson has no "reset exercise"; clearing must not destroy the base drawing. |
| R17 | **A lesson opens on its first blank frame that is not done yet,** not on frame 1. | The first stroke should not be refused in every lesson. |
| R18 | **Lesson 11: the drawing is right, the text is wrong.** Use the Copywriter's three step texts. Stroke data stays. | Half a turn of a band through both poles looks the same; the new text teaches exactly that. |
| R19 | **Lesson names stay as approved** (4 and 5 are not shortened). The collision with the path line is fixed in CSS. Lesson 1 becomes "מתיחה ומעיכה". | The names carry the principles (plan). Title and body of lesson 1 must use the same verb. |
| R20 | **Challenge:** the number is called "אתגר {week}", not "שבוע {week}" (no change to the maths). Earning the stamp shows one toast. The fixed 52-week theme cycle stays. | The number counts FlipLoop challenges since the start, so name it that. |

**Frames, playback, toasts**

| # | Ruling | Reason |
|---|---|---|
| R21 | **Stop keeps the plan's rule:** playback stops on the frame showing and it becomes current (F11 is not changed). The selected frame is now remembered across a reload (F13). | Plan decision (e) and the Stop choreography; a split rule would give Stop two meanings. Open to the user to overrule, see section 8. |
| R22 | **Deleted frames come back in the right place:** each undo restores next to the neighbour frame it had (by frame id), not at a stored index. A restore that would pass 120 frames is refused with a message. Ctrl+Z restores the last deleted frame as long as no newer step exists. | F5 and F6; A1 asks for an undo that is not a 5 s race. |
| R23 | **Toasts, one rule set.** (1) Phone Editor: 8 px above the tool row, never on the tools or the strip. (2) At most 3 on screen; the oldest non-persistent one leaves first. (3) A toast whose action edits an open document belongs to that screen and closes with it; the project-delete undo is global and refreshes whichever Gallery is on screen. (4) When an action toast appears after keyboard input, focus moves to its action, its timer pauses while it has focus or hover, Escape closes it and focus returns to a sensible control. (5) While a modal dialog is open, toasts and the live region live inside it. (6) One announcement per toast. | D-14, F5, CODE-C18, G-03, A1, A3, A13. |
| R24 | **Long press is 450 ms** (was 300), and a long press that ends without movement does the normal tap. | A slow tap by a child must not be swallowed (CODE-C11). |
| R25 | **Frame counter and the 100, 119, 120 notice leave the scrolling track** and are pinned inside the strip, readable at any scroll position, in correct RTL order. At 120, N, D and "+" say why nothing happens. | F10, J-C1. |
| R26 | **Play button: a true 48 px circle** on every size. | A 56 px circle cannot sit inside the 56 px bar; the stadium was the drift. |
| R27 | **Play lamp:** use the Web Designer's values from DS-01: the cream halo stays and an amber glow is added (`0 0 0 8px rgba(255,252,244,.7), 0 0 28px 10px rgba(244,182,63,.45)`); the first-Play dip takes the amber from .45 to .28 for 40 ms, twice. | The specified value darkened the surround; the dip was invisible. |
| R28 | **Coach marks follow what the child did, not frame 1** (state by facts: frames with ink, frame count). The leader line passes behind the tool keys, and the rings get a Film edge so they can be seen on the Desk. | J8, D-15. |

**Navigation**

| # | Ruling | Reason |
|---|---|---|
| R29 | **In-app Back is "up", and it must not grow history.** If the parent screen is the previous history entry, the Back link calls `history.back()`. Otherwise it replaces the current entry with the parent. System Back from Home then leaves the app. | J5, Android convention. |
| R30 | **Back with a sheet or dialog open closes that sheet and the screen stays.** The router detects a back traversal while a registered sheet is open, closes the top sheet and restores the history position. No history entry per sheet. The Export overlay keeps its own route. | J6. One rule, and no race with links inside sheets. |
| R31 | A failed `#/new` returns the hash to the previous screen, so the next tap works. | S5. |

**Layout and design**

| # | Ruling | Reason |
|---|---|---|
| R32 | **Phone landscape Editor:** film strip and playback controls share one row (controls beside the strip). Home in short landscape uses the existing two-column layout. | LAY-L1, LAY-L2: about 48 px more canvas height. |
| R33 | **Tap targets:** compact buttons, Export, the title field and the wordmark go to 44 px. At 339 px wide and less the tool row uses 6 px side padding so the 7 keys are 44 px, and the fps segments are 40x44 (the only exception: seven 44 px controls and a 48 px Play need 312 px without gaps). | LAY-L3. |
| R34 | **Desktop:** reading columns and single-action blocks are capped at about 720 px (Settings, Challenge, Lesson detail), the title field at about 28 characters, the lesson page gets two columns from 1024 px, desktop stations get a dashed path. The side panel keeps its order and gets a visible scroll cue. Rail tools show their labels on touch devices. | DS-03, D-13, J10. |
| R35 | **Token drift:** radii snap to 4, 12, 16, 20, 999 (the 8 and 10 px of the shade palette stay, they are in `03d`). Sheet titles 20 px, Home subtitle 16 px, tool-key labels 13 px, header links stay 15 px. Export cards stay Paper white and the spec line is amended. The 4x3 desktop swatch grid stays. | D-16; a Glow card on a Glow sheet has no edge. |
| R36 | **Buttons in one row share one height.** In sheets and in the Export overlay the primary is 48 px. | D-04. |
| R37 | **Home flipbook can be paused:** the art is a real toggle button. The loop itself stays. The flip shadow becomes a narrow soft band. | A7 (WCAG 2.2.2), DS-02. |

**Copy**

| # | Ruling | Reason |
|---|---|---|
| R38 | **Undo and Redo are "אחורה" and "קדימה"; the toast action is "להחזיר"; "ביטול" means only Cancel.** Full table in COPY-C-04, plus: disabled names become "אחורה, אין צעד לחזור אליו" and "קדימה, אין צעד להחזיר" so the visible word is in the name. | One word must not mean two actions on one screen. |
| R39 | **Status words:** "שומרים…", "נשמר", "לא נשמר". Under 360 px the status shows its icon only (the text stays for screen readers). | COPY-C-19; "נכשל" was masculine and vague. |
| R40 | **One name per thing** (COPY-C-15): the screen is "הגלריה שלי" (`gallery.h1`, `meta.title.gallery`, `home.nav.gallery`), its list heading is "האנימציות שלי"; Back to lessons is "לשיעורים"; Back to Home is "הביתה"; the strip is "רצועה"; "לגבות הכל" and "לייבא קובץ" everywhere; "לחצו" and "לחיצה" instead of "הקישו" and "הקשה"; "הקו המקווקו"; `notFound.title` becomes "הפרויקט לא נמצא בדפדפן הזה" (the other "where it is saved" lines stay). | Eight strings already say "גלריה"; three title edits give one name. |
| R41 | **"לחצו על הפעלה" on phones:** the texts show the glyph the child sees: `coach.3` "עכשיו לחצו על ▶", nudge and lesson steps "לחצו על ▶ (הפעלה)". The glyph is U+25B6 followed by U+FE0E. If a WebKit iPhone screenshot shows a colour emoji, use "כפתור ההפעלה" instead and note it. | COPY-C-08; the Play button has no word on phones. |
| R42 | **File-name toast names the project, not the file:** `export.done.project` becomes `קובץ הפרויקט של "{title}" ירד.` | COPY-C-05: mixed-direction file names scramble. |
| R43 | **Titles and meta:** Home title "FlipLoop · אנימציה בציור, דף אחרי דף"; pattern "{screen} · FlipLoop"; descriptions say "דפים" (texts in WS5 item 5.25). | COPY-C-21. |
| R44 | **Credit line:** "... של אולי ג'ונסטון ופרנק תומס (1981) ..." (order swapped, no niqqud). | Removes the "ואולי" misreading without depending on niqqud in the font. |
| R45 | **Themes:** the six bare nouns get a movement and "תפוח טובל בדבש" becomes "תפוח בדבש" (COPY-C-22). "קופסת הפתעות" stays. | "קופסת הפתעות נפתחת" is 18 characters, over the 16 limit the Home card and the build check enforce. |

**Exports and hosting**

| # | Ruling | Reason |
|---|---|---|
| R46 | **Video:** a hidden 64x64 warm-up recording of 3.3 s starts when the Export overlay opens; the real recording waits for it. Frames are captured on demand (`captureStream(0)` with `requestFrame()`, old path as fallback). `MediaRecorder.start()` runs without a timeslice. The result is checked (duration against the plan); a short or empty result retries once by itself, then shows an error with "לנסות שוב" and "להכין GIF". | EX-01 confirmed 6 of 6 by the verifier (hardware encoder start-up); EX-02, EX-03. |
| R47 | **Print:** the direct Print path keeps `window.print()`, gets a try/catch and an in-flight guard, and above 16 sheets asks first and recommends the PDF. Long videos show their length before the click. Held frames keep printing as repeated cards. | EX-05, EX-09, CODE-C17; the plan's Ruling 2 stands. |
| R48 | **File names:** half GIF, paper size and ping-pong get their own names; `safeFileName` strips leading dots, trailing dots and spaces, bidi control characters and Windows reserved names. | EX-08. |
| R49 | **Fonts stay on the Google link** (Part C, Ruling 1) but stop blocking first paint: the link is a preload that a small module turns into a stylesheet. | PWA-P1. |
| R50 | **CSP and framing:** one policy in `site/_headers` and the same policy as a `<meta>` in `index.html` (so GitHub Pages tests it too). It must allow `blob:` and `data:` for images, media and `fetch`, Google Fonts, and inline styles; `frame-ancestors 'none'` in the header. | PWA-P3. The single Netlify deploy must not be the first time the policy runs. |
| R51 | **404:** a small Hebrew `404.html` with a link home. The service worker serves the shell only for the scope root and `index.html`. | PWA-P2, CODE-C9. |
| R52 | `selfTest` stays in the build (loaded only when called). The error log gets a "download report" button in Settings. Dead code named in `09` is removed by each file's owner after a grep over `site/` and `tests/`. | The integrator's regression uses `selfTest`. |

---

## 4. Step 0: the integrator prepares the base (before any Developer starts)

On `main` (`329ddd7`), one commit named "Fix round base":

1. `.gitignore`: add `.worktrees/`.
2. `tools/build-strings.mjs` line 10: read `final-lessons.md` instead of `_process/05-copywriter-lessons.md` (the two files are byte-identical today; from now on `final-lessons.md` is the only source).
3. `final-ui-copy.md`: insert, between section 23 and "### Notes", a section `## 24. Fix round 2026-10: new keys` with five empty sub-tables (`### 24.1 WS1` ... `### 24.5 WS5`), each with the header row `| Key | Hebrew | Where / notes |` and its separator row. Each workstream appends rows only to its own sub-table.
4. `site/css/style.css`: just before the closing brace of `@layer components` (after the settings block), add two marker comments separated by blank lines: `/* ---- fix round: WS1 additions ---- */` and `/* ---- fix round: WS2 additions ---- */`. WS1 and WS2 own no CSS section; any rule they need goes directly under their own marker.
5. Run `node tools/build-strings.mjs` (output must be unchanged) and `node --test tests/` (17 pass).
6. Cut the worktrees:
   `git worktree add .worktrees/ws1 -b fix/ws1` (and ws2 to ws6).

Do not push this commit yet.

---

## 5. File ownership

### 5.1 Whole files

| Owner | Files |
|---|---|
| **WS1** | `site/js/store/*` (all, plus new files there), `site/js/ui/warnings.js`, `site/js/screens/gallery.js`, `site/js/screens/settings.js`, `site/js/lib/busy.js` |
| **WS2** | `site/js/core/fill.js`, `site/js/core/undo-ledger.js`, `site/js/editor/drawing.js`, `site/js/editor/doc.js`, `site/js/editor/panels.js`, `site/js/editor/stage.js`, `site/js/editor/undo.js` |
| **WS3** | `site/js/editor/lesson-mode.js`, `site/js/data/lessons.js`, `shapes.js`, `character.js`, `site/js/screens/lessons.js`, `mini-player.js`, `challenge.js`, `site/js/core/challenge.js`, new `site/js/core/lesson-diff.js`, **`final-lessons.md`** |
| **WS4** | `site/js/editor/strip.js`, `site/js/editor/playback.js`, `site/js/ui/toast.js`, `site/js/ui/coach.js` |
| **WS5** | `site/js/export/*`, `site/js/gif/*`, `site/js/pdf/*`, `site/js/print/*`, `site/js/screens/print.js`, `site/js/lib/util.js`, `site/js/dev/selftest.js`, `site/sw.js` (outside the generated block), `site/index.html` (never the `?v=`), `site/_headers`, `site/manifest.webmanifest`, new `site/404.html`, new `site/js/fonts.js`, `site/assets/*`, `tools/asset-gen.html`, `netlify.toml` |
| **WS6** | `site/js/ui/dialog.js`, `site/js/ui/icons.js`, `site/js/screens/home.js`, `home-art.js`, `common.js`, `site/js/lib/dom.js`, `i18n.js`, **existing rows of `final-ui-copy.md`** |
| **Frozen** | `site/js/pwa.js`, `site/js/lib/bus.js`, `site/js/lib/raster.js`, `site/js/core/timing.js`, `tools/build-strings.mjs`, `tools/build-sw-manifest.mjs`, `tools/run.mjs`, `tools/cdp.mjs`. If you believe one must change, write it in `fix-wsN.md`; the integrator decides. |
| **Generated** | `site/js/data/strings.js`, `lesson-copy.js`, `themes.js`: regenerate and commit on your branch; the integrator regenerates after each merge. |

### 5.2 `site/js/app.js`

| Part | Owner |
|---|---|
| `parseRoute`, the whole `Router` class including `navigate()`, `createNew()`, `closeOverlay()`, a delegated click handler for Back links | WS6 |
| `captureErrors()`, `boot()` | WS1 |
| Imports at the top: each adds only its own import lines | both |

### 5.3 `site/js/editor/editor.js` by method (the main hot spot)

Edit only inside your own methods. New methods go directly below the anchor named in the last column. Nobody edits another owner's lines, not even to add one call: use a contract from section 6.

| Owner | Methods and blocks | New methods go after |
|---|---|---|
| **WS1** | `constructor`, `mount`, `isBusy`, `flush`, `viewState`, `restoreView`, `update`, `unmount`, `renderLoading`, `renderNotFound`, `setTitle`, `setStatus`, `onSaveStatus`, `downloadFromMemory`, `renderW2`, `showW5`, `checkLowMemory`. In `build()`: the top bar block (title field, status, export link, W2 and W3 strips) and the `Autosaver` block. | `restoreView()` |
| **WS2** | `renderPanel`, `toolTap`, `setTool`, `setWidth`, `refreshToolKeys`, `recentColors`, `shadesOpen`, `setShadesOpen`, `setColor`, `refreshColorKey`, `openColors`, `openShadesPopover`, `openMore`, `setOnion`, `requestResize`, `clearFrame`, `doUndo`, `doRedo`, `refreshUndoButtons`, `afterEdit`, `onKey`, the trailing `lessonTitleFor`. In `build()`: the tools block, the panel lines and the `DrawingInput` block. | `refreshToolKeys()` |
| **WS3** | `afterSave`, `makeMine`. In `build()`: the two lesson-mode blocks. | `makeMine()` |
| **WS4** | `frame` getter, `currentIndex`, `select`, `step`, `addFrame`, `insertAt`, `duplicateFrame`, `insertBlank`, `deleteFrame`, `setHold`, `reorder`, `openFrameMenu`, `buildPlaybar`, `refreshPlaybar`, `setFps`, `toggleMode`, `togglePlay`, `onPlayStart`, `onPlayStop`, `firstPlayLine`, `startCoach`, `advanceCoach`. In `build()`: the `FilmStrip` and `Player` blocks and the three lines that render the strip and select frame 1. | `reorder()` |
| **WS5** | `openExport` | `openExport()` |
| **WS6** | `fitStage` only, and only if item 6.8 or 6.27 cannot be done in CSS alone. All other WS6 Editor work is CSS, strings and the router. | `fitStage()` |
| **Nobody** | `backLink`, the body assembly and the listener tail of `build()`. A listener you must add is registered from your own method. | |

### 5.4 `site/css/style.css` by section header

| Owner | Sections (the `/* ---- name ---- */` blocks) |
|---|---|
| **WS6** | reset, tokens, base, shell, buttons, banners, home, editor shell, stage, tools, desktop editor (all three media blocks, including phone landscape), panel groups / swatches / controls, shade palette, sheets and dialogs, challenge, gallery, settings, utilities, the reduced-motion block, the view-transition rules |
| **WS4** | film strip, playback bar, playing state, toasts, coach marks |
| **WS5** | export overlay, print preview, `#print-root` and `@media print` |
| **WS3** | lessons (path, station, lesson page, mini player, done sheet, stamp) |
| **WS1, WS2** | only their own marker block from Step 0 |

A rule that styles your component but needs a media query goes inside your own section, not into another owner's media block. Exception already decided: the phone-landscape and 339 px rules for the strip, playbar and fps buttons are written by WS6 inside the desktop-editor media blocks (R32, R33).

### 5.5 Copy files

| File | Who edits what |
|---|---|
| `final-ui-copy.md` sections 0 to 23 | WS6 only. Every existing-row change that another workstream's fix needs is listed in WS6 item 6.33. When a key appears twice (its own section and the toast index in section 22), change both. |
| `final-ui-copy.md` section 24 | each of WS1 to WS5 appends to its own sub-table; WS6's own new keys go into the section they belong to |
| `final-lessons.md` | WS3 only |
| `tests/core.test.mjs` | per rule 1.7 |

---

## 6. Contracts between workstreams

Every contract is additive: the consumer's code works on its own branch before the provider's branch is merged, it just does less.

| # | Contract | Provider | Consumer, and what it writes |
|---|---|---|---|
| K1 | Errors thrown by the database layer carry `err.storage === true`. | WS1 (`store/db.js`) | WS6 `Router.createNew()`: on any failure restore the previous hash; show the generic toast only when `!err.storage`. WS3 `LessonScreen.start()`, `ChallengeScreen.start()`: add a `catch` that logs and does nothing else (WS1's global listener shows the message). |
| K2 | Setting `letterShortcuts` (boolean, missing means on). | WS1 (default, Settings switch) | WS2 `onKey`: skip B, E, G, V, 1, 2, 3, O, N, D when `getSettings().letterShortcuts === false`. |
| K3 | `toast(message, { owner, returnFocus })`: `owner` is a screen object with `disposed`; `returnFocus` is a function returning an element. Unknown options are ignored today. | WS4 | WS2 `clearFrame()` passes `owner: this`. WS1 Gallery delete toast passes `returnFocus`. WS4 passes both in its own methods. |
| K4 | `editor.frameRestore`: `null` or a function that restores the last deleted frame and returns a promise. | WS4 (`deleteFrame` sets it, clears it when used or replaced) | WS2: `doUndo()` starts with `if (this.frameRestore) { const f = this.frameRestore; this.frameRestore = null; return f(); }`; `afterEdit()` sets `this.frameRestore = null`; `refreshUndoButtons()` treats a pending `frameRestore` as "can undo". |
| K5 | `lessonMode.paintPrepared(frame, index)`: draws the lesson's prepared strokes for that frame onto `frame.ctx`. | WS3 | WS2 `clearFrame()`: after `clearRect`, call `this.lessonMode?.paintPrepared?.(f, this.cur)`; skip the "nothing to clear" early return in lesson mode. |
| K6 | `export.done.project` will read `{title}` instead of `{filename}`. | WS6 (string) | Every call site passes both: `t("export.done.project", { filename: name, title })`. WS1: `editor.downloadFromMemory`, `gallery.js` menu, `warnings.js` W2b. WS5: `overlay.js runProject`. |
| K7 | Icons `rename`, `open`, `minus`. Unknown icon names render an empty SVG today, they do not throw. | WS6 (`icons.js`) | WS1 Gallery card menu: `open` for "לפתוח", `rename` for "לשנות שם", and `more` (horizontal dots) for the card's menu button. |
| K8 | `openSheet({ anchor, side })` places a desktop popover beside `side`, on the side that faces the canvas, top-aligned with `side`. | WS6 (`dialog.js`) | WS2 `toolTap()` passes `side: this.tools` on desktop, so the width popover no longer covers the rail. |
| K9 | Attribute `data-light="1"` on a `.swatch` or `.shade` whose colour has relative luminance above 0.8. | WS2 (`panels.js`) | WS6 styles `[data-light]` with a full 1 px ring at Ink 45%. |
| K10 | Class `is-opening` on the `.project-card` whose open link was activated. | WS1 (`gallery.js`, on click) | WS6 CSS: `view-transition-name: vt-canvas` on that card's thumbnail and on `.stage`. |
| K11 | A plural key whose call changes from `t()` to `tp()` is re-keyed by the owner of the call site, as new `.one` and `.other` keys in its own sub-table. | WS3 (`lessonMode.progress.aria`), WS4 (`strip.counter.aria`), WS6 (`home.cta.lessons.aria`) | The old unsuffixed rows stay until the integrator removes unused keys. |
| K12 | `player.cycle` (ms of one full pass) and `player.stop()` keep their meaning. | WS4 | WS3 uses them for the automatic stop after one cycle (R14). |
| K13 | Bus event `"projects-changed"`. | WS1 emits it after import, duplicate, delete, delete-undo, rename | WS1's Gallery listens. No other consumer. |
| K14 | The Export overlay's own `<dialog>` follows the same open rule as `dialog.js`: focus goes to the heading (`tabindex="-1"`), not to the close button. | WS6 defines it for sheets (WK-W1) | WS5 does the same in `overlay.js`. |
| K15 | `Autosaver` keeps its public surface: `strokeEnded()`, `frameOp()`, `saveNow()`, `isDirty`, `isClean`, `dispose()`. | WS1 | Callers in WS2 and WS4 methods do not change. |

---

## 7. The six workstreams

Severity is the audit's. Cross = found by more than one auditor. V = confirmed by `11-verification`.

### WS1 · Storage and data safety (branch `fix/ws1`, port 9401)

The highest-risk stream. Do item 1.1 first and alone, verify it, then the rest. Use fault stubs like the auditors did (`addInitScript` that makes `indexedDB.open` or a store method throw or never answer).

| # | IDs | The interface it lives at, and the fix | Acceptance |
|---|---|---|---|
| 1.1 | **J1 = F1 = S1 = CODE-C1** (Major, cross x4) | Autosaver to status label (the label is "saved" unless a write is running) and Autosaver to page lifecycle (async write in `pagehide`). **Tell:** R1 and R2. All inside `autosave.js`, a new `store/rescue.js`, `boot()` and the Editor's status methods: `strokeEnded()` reports the saving state at once and schedules 250 ms; the 10 s tick becomes 2 s; nothing is encoded while `input.active` (pass a `isStrokeActive` callback in the Autosaver block); `write()` success clears the rescue record; `pagehide` and `hidden` write it synchronously (cap 4 MB, skip quietly if `localStorage` throws); boot applies it only if the stored project is not newer. | (a) Sample the label every 50 ms after 20 strokes: never "נשמר" while the frame in IndexedDB differs from the canvas. (b) Reload 50, 150, 300, 1000 ms after a stroke and close the tab after 200 ms, desktop and Pixel 7 profile: the stroke is there 10 of 10 each. Same for fps, mode, title, onion. (c) A stroke every 1.3 s for 10 s: IndexedDB never more than 2.5 s behind. (d) The auto-update cases (b), (d), "save failing" and "leaving the Editor while dirty" from the Auto-update pass still pass. |
| 1.2 | F2 = CODE-C2 (Major, cross) | `write()` snapshot against the dirty flags. **Tell:** clear `projectDirty` and each snapshotted frame's `metaDirty` when the snapshot is taken, set them back if the write fails. | At 4x CPU throttle: four fast Alt+Arrow moves, five fast hold "+", an fps tap during a write: IndexedDB equals the screen 10 of 10. |
| 1.3 | F4 = S2 = CODE-C3 (Major, cross x3) | No second-writer detection. **Tell:** R3. `saveProject` takes the expected `updatedAt` and aborts inside the transaction when the stored one is newer; `BroadcastChannel("fliploop")`; reload the document in place (keep frame, tool, colour); `updateSettings` and `updateProgress` become read-merge-write. Strings: draft `conflict.title` "הציור הזה השתנה בלשונית אחרת", `conflict.body` "כדי לא לדרוס את הגרסה החדשה, מכאן אי אפשר לשמור.", `conflict.reload` "לטעון את הגרסה החדשה", `conflict.download` "להוריד את מה שיש כאן". | The audit's two-tab repro: tab A's frames survive, no orphan frame records, tab B shows the dialog or has already reloaded. A stamp earned in A and one in B both remain. |
| 1.4 | S3 = CODE-C5 read part, and its "silent failures" (Major, cross) | Read failures are turned into empty results at each call site. **Tell:** R4. Gallery: error state with retry; Editor: `renderLoadError()` distinct from not-found; `w1Banner()` returns the storage banner when storage is unhealthy; backup, download, rename, duplicate report failure. One global listener (registered in `boot()`) shows one message for any `err.storage`. Drafts: `storage.readFailed.title` "לא הצלחנו לקרוא את העבודות", `.body` "שום דבר לא נמחק. נסו שוב בעוד רגע.", `.retry` "לנסות שוב", `editor.loadFailed.title` "לא הצלחנו לפתוח את הציור". | With `getAll` and `get` throwing: the Gallery never shows "עוד אין עבודות", the Editor never shows "not found", backup shows a message, zero unhandled rejections. Retry works once the stub is lifted. |
| 1.5 | S4 (Major) | Boot swallows a failed open. **Tell:** R4. Drafts: `w0.title` "אי אפשר לשמור בדפדפן הזה", `w0.body` "הדפדפן חוסם את השמירה במכשיר, למשל בגלישה פרטית. מה שתציירו כאן לא יישמר. נסו בחלון רגיל או בדפדפן אחר." | The three stub variants of `06` S4: banner on Home, Gallery, Settings; each start button gives a message; Settings does not show healthy storage figures. |
| 1.6 | S6 (Major) | `openDb()` has no timeout. **Tell:** 3 s, then the 1.5 state. | Open that never answers: Home is up within 4 s with the banner. |
| 1.7 | CODE-C6 (Major, latent) | Connection is cached forever. **Tell:** `onversionchange` closes, `onclose` clears the cache, one reopen-and-retry on `InvalidStateError`. | Connection closed underneath the app: the next save succeeds. A second connection asking for version 2 is not blocked. |
| 1.8 | S7 | Leaving with a failed save drops the work. **Tell:** if the save still fails when the Editor unmounts, keep the document in a module-level rescue slot and show a persistent toast on the next screen ("הציור האחרון לא נשמר." with the existing "להוריד קובץ" action); add a native `beforeunload` prompt only while the save is failing. | Quota stub, draw, leave by link and by history Back: the toast is there and the download holds the drawing. |
| 1.9 | S8 = G-02 | R7. | After a backup the banner is gone on Home, Gallery, Home again, and after a reload. |
| 1.10 | S9 | W2b on the Gallery offers "לגלריה". **Tell:** hide that button when the Gallery is the current screen. | Screenshot at 97%. |
| 1.11 | **J7 = G-11 second half** (R!) | A record is written at `#/new`. **Tell:** R5. | Tap in and out twice on a fresh profile: Gallery empty, no "המשך" link, Forward still opens the project; after a stroke it appears. |
| 1.12 | **G-01 = CODE-L11** (Major, R!) | R6: backup carries progress, import merges it. | 12 of 12 and starters after restoring on a clean profile. An old backup without `progress` still imports. |
| 1.13 | G-03 | The undo closure calls `refresh()` on a disposed screen. **Tell:** K13; the delete toast is global. | Delete, Home, Gallery, undo: the card is back on screen. |
| 1.14 | G-04 = CODE-C12 first bullet, PERF-P-01 (b) | No in-flight guard on starter cards. **Tell:** disable the card and show it busy while it works; repeat titles get a number ("כדור 2"). | Two taps 0.2 s apart make one project. |
| 1.15 | G-05, CODE-C14 point 3 | R6: decode and size check. | `07-corrupt-png.json`: toast counts the damaged frames; a 4000x3000 frame does not render oversized. |
| 1.16 | G-06 = CODE-C14 point 2, points 1 and 5 | R6: new frame ids, id charset, field validation. | `25-frame-id-collision.json` leaves the first project intact; a file with id `my project/1` opens. |
| 1.17 | G-07 | R6: clash gets the copy suffix and note. | Two lesson-1 cards never share a title. |
| 1.18 | G-10, CODE-C14 point 4 | R6: skip identical, count copies, partial backup. | Re-import of a 22-project backup: 0 new cards and a truthful toast. A backup with one bad entry imports the rest. |
| 1.19 | G-11 first half | R6: keep `updatedAt`. | Order after restore equals order before. |
| 1.20 | G-09 | "החותמת נשארת." shows for projects with no stamp. **Tell:** only when the stamp exists. | Both cases in a screenshot. |
| 1.21 | CODE-L5, L6, L7, L9 | Overlapping `refresh()` appends W1 twice; delete uses two transactions; undo of a deleted lesson project can leave two for one lesson (restore it as a free copy then); thumbnail URL not revoked on error. | One script per point. |
| 1.22 | CODE-L12 | The error log has no reader. **Tell:** Settings, Help card: "להוריד דוח תקלות" saves the log as a text file. Draft hint: "קובץ טקסט קטן שנשאר אצלכם. הוא לא נשלח לשום מקום." | The file holds a forced test error. |
| 1.23 | F13 | The selected frame is lost on reload. **Tell:** write `viewState()` to `sessionStorage` per project on `pagehide` and on unmount; `mount()` uses it when no update-resume view was passed. | Frame 4 of 8, reload: frame 4. |
| 1.24 | A13 point 6 | The status is a disabled button. **Tell:** plain `role="status"` text; a button only in the failed state. | Accessibility tree. |
| 1.25 | A5 (a) | K2: Settings switch. Drafts: `settings.shortcuts.label` "קיצורי מקלדת של אות אחת", `.hint` "למשל B לעיפרון ו-N לפריים חדש. רווח, חצים ו-Ctrl+Z פועלים תמיד." | Persisted across a reload. |
| 1.26 | DS-07 (card glyph, menu icons), DS-08 (two primaries in the empty Gallery) | K7. Remove the second "אנימציה חדשה" from the empty state; the action row above it is the one primary. | Screenshots. |
| 1.27 | CODE-DEAD (store) | Remove `frameCount`, `countNonEmptyFrames`, `blobHasInk`, `getBlobMode`, `getLastEstimate`, `isNearlyFull` after a grep. | Tests green. |

**Contracts you serve:** K1, K2, K6 (three call sites), K10, K13, K15.

### WS2 · Drawing tools, fill, canvas size, shortcuts (branch `fix/ws2`, port 9402)

| # | IDs | The interface it lives at, and the fix | Acceptance |
|---|---|---|---|
| 2.1 | **T-01 = CODE-C10, T-10** (Major, V) | One flat tolerance for two different targets (paper and paint). **Tell:** R8 in `core/fill.js`. Ring re-tint: for a ring pixel that is opaque, estimate the line colour from its outward neighbour, compute how much of the old fill is in it, replace that share with the new colour. Update the two tests in `core.test.mjs` and add the all-pairs test. | Both audit repros and the verifier's five leaking scenarios (2, 2c, 3b, 3c, 4): no leak. The audit's "tested and working" fill list still holds. Refill yellow then blue: 0 yellow-tinted rim pixels. |
| 2.2 | T-02 (Major, cross), COPY-C-18 resize row | The resize destroys bitmaps and undo with a dialog that does not say so. **Tell:** R9. New keys `confirm.resize.body.square`: "הציורים יישארו במרכז. מה שמצויר בצדדים, מחוץ לריבוע, ייחתך. אחרי השינוי אי אפשר לחזור צעד אחורה." and `confirm.resize.body.wide`: "הציורים יישארו במרכז, ובשני הצדדים יתווסף שטח ריק. אחרי השינוי אי אפשר לחזור צעד אחורה." | Wide, square, wide with no edit in between: 0 differing pixels. A frame edited in square keeps the edit. |
| 2.3 | **L-02 (a) = CODE-C4 (a)** (Major, cross) | The size control is live in lesson projects. **Tell:** not rendered in `renderPanel()` and `openMore()` for lesson documents; `requestResize()` returns early for them. | Lessons 3, 6, 8: no control on phone or desktop. |
| 2.4 | T-03 = F9 (Major, cross) | R11. Handle key-down and key-up so the focused button is not clicked as well. | The four flows of `t20-space.mjs` all play. Space on the focused Play button toggles once. Space in the title field types a space. |
| 2.5 | T-04 (a, b) = CODE-C13 | Keys act while a stroke is open. **Tell:** `onKey` ignores everything while `input.active`; `doUndo` and `doRedo` return early while `input.active`. | `t06` E and F: no change to other frames, history intact. |
| 2.6 | T-05 = A2 | `setOnion()` does not tell the panel. **Delegate.** | After O the switch, its `aria-checked` and its label match the state, on desktop and in the More sheet. |
| 2.7 | T-06 = CODE-L2 | `penActiveUntil` stays at Infinity after a cancel or an uncaptured pen press. | Synthetic pen down and cancel: a finger draws again after 600 ms. |
| 2.8 | T-07 | R12 in `stage.js`: a second onion layer above the display canvas (same `stage__onion` class, `pointer-events: none`), filled only where the current frame is opaque and the neighbour differs. | Five frames with yellow backgrounds: the previous frame's mark is visible in red. Line drawings: pixel-identical to today. |
| 2.9 | T-08 | R10. Width sheet dots capped so they fit. | Measured cuts 8, 20, 40 px. |
| 2.10 | T-11 | Gestures that change nothing add an undo step. **Tell:** commit only when the pixels in the rectangle differ. | Move and erase on an empty frame: undo count stays 0. |
| 2.11 | T-12 | Each smoothed segment is stroked on its own, so soft edges are painted twice at joints. **Tell:** for strokes of constant width (mouse, touch, pen without pressure change) redraw the whole stroke as one path from the pre-stroke snapshot on every move; pen strokes with changing pressure keep the segment method. | Edge row of a 5 px line is uniform. The pointer-move handler stays under 4 ms at 4x throttle on a 600-point stroke. 40 strokes back to back all land. |
| 2.12 | T-13 = A14 | The colour input gets its value once. **Tell:** update it in `render()`. | The well shows the current colour after a swatch, a shade and a reload. |
| 2.13 | T-14 | Stroke end and big fills do everything synchronously. **Delegate:** move the thumbnail redraw, lesson progress and coach checks after the next frame. | At 4x throttle on the Pixel 7 profile: stroke-end handler 50 ms or less, full-frame fill 120 ms or less, or report what you reached. |
| 2.14 | CODE-C7 | `cancelActive()` does not mark the frame changed. **Tell:** `frame.touch()` there. | The audit's repro B: the cancelled stroke is not there after a reload. |
| 2.15 | CODE-L15 | A `NaN` start coordinate passes the bounds check. | Unit test. |
| 2.16 | A5 (b) | K2. | With the switch off: B and N do nothing, Space still plays. |
| 2.17 | A13 points 2, 3 (hold value), 4; COPY-C-17 stepper; DS-07 stepper glyph; F15 stepper ends | **Tell:** stepper buttons named (`frameMenu.hold.less.aria` "פחות החזקה", `.more.aria` "יותר החזקה"), disabled at x1 and x12, minus drawn with U+2212; the hold value's label moves onto an element with a role; the three segmented groups get names. | Accessibility tree. |
| 2.18 | DS-06 data side | K9. | Attribute present on white, gray 1, yellow 1 and the other light tints. |
| 2.19 | CODE-DEAD | `touchIds`, the ignored `{ custom: true }`, the hard-coded `120` (use `MAX_FRAMES`), `lessonTitleFor`. | Tests green. |

**Contracts you consume:** K2 (`onKey`), K3 and K5 (`clearFrame`), K4 (`doUndo`, `afterEdit`, `refreshUndoButtons`), K8 (`toolTap`).

### WS3 · Lessons, lesson content, challenge (branch `fix/ws3`, port 9403)

| # | IDs | The interface it lives at, and the fix | Acceptance |
|---|---|---|---|
| 3.1 | **J2 = CODE-C18 second bullet** (Major, cross x3) | `unmount()` stops the player, the stop handler opens a sheet after the route changed. **Tell:** `onPlayStop()` checks `ed.disposed`: record the stamp, open no sheet, show a plain toast (draft `lessonDone.toast`: "קיבלתם חותמת על שיעור {n}"). | Leave while playing by the Back link and by history Back, lessons 2, 3, 4: no dialog on the next screen, the stamp is recorded, the toast shows. |
| 3.2 | J3, L-06, **J4 = L-05** | The trigger (Stop) does not match the instruction (Play); the "shown once" flag lives in the Editor instance; the nudge depends on `playedOnce`. **Tell:** R14. Use `player.cycle` for the automatic stop (K12). | Lesson 1: Play after the last blank, the sheet opens by itself after one cycle. Reopen a finished lesson, Play, Stop: no sheet. Preview before drawing, then draw all blanks: the nudge appears. |
| 3.3 | **L-01 = COPY-C-02** (Major, cross) | R15. New key `lessonMode.nudgeHold`: "כל הפריימים צוירו. עכשיו שנו החזקה באחד הפריימים ולחצו על הפעלה כדי לסיים." (apply R41 to the Play word); lesson rows `lesson.9.step.3`, `lesson.9.goal` from COPY-C-02. | Lesson 9 without a hold change: the nudge names the hold, and again after Play. With a hold change: stamp. |
| 3.4 | **L-03** (R!), **L-02 (b) = CODE-C4 (b)** | "Done" means "differs from prepared", so removed ink counts, and a square lesson project compares buffers of different widths. **Tell:** R14 and R16. New pure module `core/lesson-diff.js` (added-ink count; unit tests). The prepared raster and the guides are drawn at 480x360 and then shifted by the same centred crop the document used, so lesson projects that were already made square behave. Provide `paintPrepared()` (K5). | Clearing all eight frames of lesson 5 gives 0 of 8 and no stamp. A lesson project resized on the live site before this fix shows the true count. |
| 3.5 | J9 (a) | R17: after the Editor is built, select the first blank that is not done, unless a resume view already chose a frame. Do it from `lesson-mode.js` (for example a microtask queued in the constructor, which runs after `build()` and does nothing when `ed.cur` is no longer 0); do not edit `mount()` or the select line in `build()`. | Lessons 1 to 12 open on a drawable frame. An auto-update reload still returns to the frame the child was on. |
| 3.6 | **L-04 = COPY-C-01** (Major, cross) | R18: the three step texts from COPY-C-01. | Read against frames 1, 4, 5, 8 in a screenshot. |
| 3.7 | L-07 | `cell.offsetLeft` is measured from the page. **Tell:** measure inside the strip. | 1280 wide, lessons 9 and 10: the current cell is visible on every frame. |
| 3.8 | CODE-C8 | The example player replays every missed frame after a pause in the background. **Tell:** cap the catch-up to one frame and pause on `visibilitychange`. | Simulated clock, one hour hidden: under 50 ms blocked. |
| 3.9 | L-08 = D-03 = COPY-C-23 stamp line | The number sits on the check glyph. **Delegate.** | The number is readable for 1 and for 10, both viewports, looked at. |
| 3.10 | L-09 = D-02 = LAY-L7 = COPY-C-14 | The 150 px name box crosses the centre line; the lesson page's next and previous links wrap to three lines at 360. **Tell:** names stay on their own side of the path (R19); the two links take half the row each. | 320, 390, 768: no name touches the dashed line. 360: links in at most two lines. |
| 3.11 | L-10 | Step 1 of lesson 6 speaks of a line that is not on the key frames. **Tell:** copy only: `lesson.6.step.1` "פריים 1 ופריים 9 מוכנים: הכדור בנקודת ההתחלה ובנקודת הסוף." and `lesson.6.step.2` "הדליקו את הרמזים. יופיע קו, ועליו סימונים: צפופים בקצוות ורחוקים באמצע." | Text read against the frames. |
| 3.12 | L-11 | "לפתוח שוב" when the project was deleted. **Tell:** label by what exists: project and stamp "לפתוח שוב", project only "להמשיך תרגיל", no project "להתחיל תרגיל". | All three cases. |
| 3.13 | CH-C-01 | The stamp is recorded with no feedback. **Tell:** one toast in `afterSave()` when the week is first added (draft `challenge.stamp.toast`: "קיבלתם חותמת על האתגר של השבוע"). | Toast seen once. |
| 3.14 | CH-C-02 | Joined but not stamped: the list still invites to join. **Tell:** show the `challenge.stampRule` line in the list's empty state when a project exists. | Screenshot. |
| 3.15 | D-01 | The completion sheet is a full-width bottom sheet on desktop. **Tell:** open it as a centred dialog from 1024 px. | 1280: dialog 480 wide. |
| 3.16 | DS-03 (lesson screens) | R34: lesson page two columns from 1024 px with a reading measure of 75 characters or less, CTA capped; a dashed path between desktop stations. | 1280 screenshots of both screens. |
| 3.17 | DS-08 (example strip), J-C6, LAY-L6 (station names) | Example cells at full opacity, current one outlined; the "חדש בגלריה" line is plain Ink text, not link-like; station names in `rem`. | Screenshots; root font 200%. |
| 3.18 | COPY in `final-lessons.md`: C-03, C-07, C-08 (lesson steps, R41), C-09, C-10, C-11 (`lessons.credit`, R44), C-15 (lesson rows: `lesson.1.title` per R19, lesson 10 goal, step 4 and hint 6, "רצועה" and "לחצו" in `lesson.9.step.3`, "הקו המקווקו"), C-18 (explanations 8, 11, 12), C-24 (lesson rows) | **Tell:** take the Copywriter's proposed text for each key exactly. | The build's dash check passes; each explanation is still two sentences. |
| 3.19 | COPY-C-12 (progress), A13 point 3 (lesson progress) | K11; put the label on an element with a role. | "פריים ריק אחד מתוך 6 צויר" at 1. |
| 3.20 | CODE-C5 (lesson and challenge start) | K1. | No unhandled rejection with storage blocked. |
| 3.21 | CODE-DEAD | `LESSON_SIZE` (keep `blankCount`, the tests use it). | Tests green. |

**Contracts you serve:** K5. **You consume:** K1, K11, K12.

### WS4 · Frames, strip, playback, toasts, coach marks (branch `fix/ws4`, port 9404)

| # | IDs | The interface it lives at, and the fix | Acceptance |
|---|---|---|---|
| 4.1 | **F3** (Major, R!) | Scroll snap follows the cell being dragged, so the drop slot is computed from a moving `scrollLeft`; edge scroll only runs on pointer moves. **Tell:** no snapping while a drag is active, `scrollLeft` frozen at drag start, edge scrolling from a timer. | The centred frame lands in the slot under the pointer 10 of 10, phone and desktop. Holding at the edge scrolls; frame 12 reaches slot 1 in one drag. |
| 4.2 | **F5, F6** (Major, Minor, R!) | Each toast restores at an index captured earlier, with no cap check. **Tell:** R22. Draft `toast.frameRestore.full`: "אי אפשר להחזיר את הפריים: כבר יש 120 פריימים". | Delete 2 then 1, undo in both orders: 0 1 2 3. The 121 repro stays at 120 with the message. |
| 4.3 | F7 = T-04 (c) = CODE-C13 "Also" | Frame-changing methods must stop playback themselves. **Tell:** `duplicateFrame` and `insertBlank` stop the player like `addFrame`. | D during Play stops, then duplicates. |
| 4.4 | F8 | A strip click during Play selects without stopping. **Tell:** stop, then select that frame. | Click frame 3 during Play: stopped on 3. |
| 4.5 | F10, J-C1 | The notice sits in an LTR island with no direction and inside the scrolling track. **Tell:** R25. **Delegate** the exact placement. | 360 wide at 100, 119, 120: full text visible without scrolling, number first. N, D, "+" at 120 show the max message. Thumbnails stay unobstructed. |
| 4.6 | F12 = J8 second half | A refused Play says nothing on touch. **Tell:** toast with `play.play.disabled`. | Tap on a one-frame project. |
| 4.7 | **J8 first half** (R!) | The coach sequence is keyed on frame 1. **Tell:** R28: no ink anywhere, coach 1; ink and one frame, coach 2; two or more frames and one with ink, coach 1 text at the canvas; two or more with ink, coach 3. | "+" first, then draw: the tip moves on and coach 3 appears. The scripted path still works. |
| 4.8 | F14 | A vertical wheel does not scroll the strip. **Tell:** map it to horizontal over the strip. | 30 frames, wheel: `scrollLeft` changes. |
| 4.9 | F15 (step buttons at the ends, duplicate thumbnail) | Disable previous at frame 1 and next at the last frame; draw thumbnails with one consistent smoothing setting. | Dark-pixel count of a duplicate equals its original. |
| 4.10 | CODE-C11 | R24. | Presses of 350, 450, 700 ms without movement act as a tap. |
| 4.11 | CODE-L10 | A second long press starts a second drag. **Tell:** ignore it. | Two-finger test. |
| 4.12 | CODE-C18 first bullet | Toast actions run against a disposed Editor. **Tell:** R23 point 3 with K3; sweep on the bus `route` event and check at click time. | Delete a frame, leave within 2 s: the toast is gone on the next screen. |
| 4.13 | **A1** (Major, R!) | No reachable undo for keyboard users. **Tell:** R22 (K4) and R23 point 4; the announcement names the undo. | Keyboard only: delete a frame, Enter on the focused "להחזיר" restores it; Ctrl+Z also restores it. |
| 4.14 | A3 = COPY-C-06 | Toasts and the live region are in `body`, which is inert under a modal. **Tell:** R23 point 5: before each toast or announcement, move both regions into the top open `<dialog>`; on that dialog's `close` event move them back. | Export, "להוריד קובץ פרויקט": the toast is visible and `elementFromPoint` hits it. The live region is not "ignored" in the accessibility tree with a sheet open. |
| 4.15 | A4 | Ink focus ring on Film surfaces. **Tell:** Lamp ring for `.toast` and `.coach`. | Screenshots of both, focused. |
| 4.16 | A13 points 7 and 3 (counter), COPY-C-12 (counter) | R23 point 6; K11. | "פריים אחד מתוך 120" at 1. |
| 4.17 | D-14 = J9 (b), the stacking note in F5, the reorder-hint note in `03` | R23 points 1 and 2. The reorder hint must not sit on an open coach bubble. | 390x844 and 375x667: all seven tool keys clickable while a toast shows. Five fast deletes: at most three toasts. |
| 4.18 | D-15 = J-C2 = T-16, the coach part of LAY-L2, CODE-L1 | R28: tool keys paint above the leader while a lead coach is open; rings get a Film edge; in short landscape the bubble must not cover the title or Export; fix the initialisation order in `coach.js`. | Phone screenshots of coach 2 and 3: no label crossed. |
| 4.19 | D-07 | The current frame is a hard 7 px block. **Tell:** 2 px Lamp outline plus a blurred glow that stays inside the cell. | 3x zoom screenshot: neighbours and sprocket holes untouched. |
| 4.20 | D-08 = A13 point 5 | The focus ring is clipped by the 72 px scroller. **Tell:** an inset ring that also differs from the "current" outline. | Keyboard focus on a current and a non-current cell, looked at. |
| 4.21 | D-09 | R26. | Rect 48x48 at 390, 844x390 and 1280. |
| 4.22 | D-10 (cells, fps, loop button) | Hover and pressed states for these three. | Probe rest, hover, pressed. |
| 4.23 | DS-01 | R27. | Playing halo luminance above the idle Desk; the dip is visible in a frame capture. |
| 4.24 | D-16 (gate, "+" cell, coach close radii), LAY-L6 (coach text in `rem`) | R35. | Computed values. |
| 4.25 | CODE-DEAD | `FilmStrip.updateAll`. | Tests green. |

**Contracts you serve:** K3, K4, K12. **You consume:** K11.

### WS5 · Exports, print, app shell and hosting (branch `fix/ws5`, port 9405)

Video cannot be tested in Playwright WebKit (no `MediaRecorder`). Say so; do not guess about real Safari.

| # | IDs | The interface it lives at, and the fix | Acceptance |
|---|---|---|---|
| 5.1 | **EX-01** (Major, V) | Real-time recording trusts the encoder from the first frame and checks only the blob size. **Tell:** R46. | The verifier's method (`audit-verify/ex.mjs`, `an.mjs`): 10 fresh default Chrome processes, first export clean 10 of 10 (36 changes, 12 of 12 frames), also when "להקליט וידאו" is pressed at once. A forced short result retries and then shows the error with both buttons. |
| 5.2 | EX-02 | 24 fps content sampled at 30. R46. | Three runs at 24 fps: 0 frames skipped. |
| 5.3 | EX-03 | The 250 ms timeslice makes fragmented MP4. R46. | 4 s and 10 s clips: `mvhd` duration is real. |
| 5.4 | EX-04 = CODE-C15 | 256 exact colours plus white make 257; the end code can be one bit short. **Tell:** fall back to median cut in that case; apply the size bump before the end code. | Unit tests for both; `s20-c256` decodes. |
| 5.5 | EX-05 = CODE-C12 second and third bullets | Only the PDF button guards itself. **Tell:** one in-flight state disables all action buttons and the per-sheet buttons. | Double click on each: one run. |
| 5.6 | EX-06 | Focus falls to `body` after Cancel and in the error view. | `activeElement` is inside the dialog in both. |
| 5.7 | EX-07 | The print PNG has no `pHYs`. **Tell:** insert the chunk (11811 px per metre), as a pure function with a unit test. | Chunk list is IHDR, pHYs, IDAT, IEND. |
| 5.8 | EX-08 | R48. New keys for the file-name patterns go in your sub-table. | The audit's 13 titles all save under the name the app reports. |
| 5.9 | EX-09 (length warning, many sheets), CODE-C17 | R47; also re-check `disposed` after `document.fonts.ready`. | 240 s video: the card says so before the click. 180 sheets: a confirm first. A forced `print()` failure shows a message and clears the status. |
| 5.10 | EX-10 | **Tell:** a "back to the export options" button in the done view; a failed share shows a message (not on a user cancel); the print screen offers "לשתף PDF" when `canShare` accepts the file. | Pixel 7 profile. |
| 5.11 | EX-N1 | GIF encoding yields with `setTimeout(0)`, which hidden tabs throttle. **Tell:** yield through a `MessageChannel`. Cannot be measured here; say so. | 120-frame GIF time unchanged while visible. |
| 5.12 | CODE-L3, L4, L8, CODE-C18 third bullet | `rec.start()` inside the try; `openExport()` cannot open twice; the last export is released when the overlay or screen closes; closing the overlay by navigation shows no "cancelled" toast. | One script per point. |
| 5.13 | A9, A8 (print case and the print heading) | Paper size is a radiogroup that ignores arrows. **Tell:** the same `aria-pressed` segmented buttons as elsewhere, focus kept on the chosen button; the print `h1` takes focus on arrival. | Keyboard walk. |
| 5.14 | A13 point 1, COPY-C-17 (GIF preview alt), WK-W1 (export dialog, K14) | Name the progress bar; new key `export.preview.alt` "תצוגה מקדימה של ה-GIF". | Accessibility tree; no focus ring after a tap-open in WebKit. |
| 5.15 | D-12, D-04 (export part), D-16 (projector frame and progress radii), DS-07 (button icons) | Desktop dialog floats with a margin (max 90dvh); R36; the action buttons drop the icon their card heading already shows. | 1280x800 screenshot. |
| 5.16 | COPY-C-18 (multi-download tip) | Hide the tip when there is one sheet (the wording is WS6's). | One-sheet project. |
| 5.17 | PWA-P1 | R49: `<link rel="preload" as="style">` (keep the `href` and `crossorigin`, the manifest tool reads it) plus `js/fonts.js`. | Fonts host stalled 8 s on a first visit: first paint under 1.5 s. Fonts still load, and still come from the cache offline. |
| 5.18 | PWA-P2, CODE-C9 | R51. The Home link in `404.html` must also work under `/fliploop/` on GitHub Pages. | `/lessons/` with the worker installed is not a broken shell. Offline unknown path: the Hebrew page. |
| 5.19 | PWA-P3 = CODE-L13 | R50. | The whole export regression under a local server that sends the exact header from `_headers`: zero CSP violations (GIF, video, PDF, PNG, print, import, fonts, service worker). |
| 5.20 | PWA-P4 | `og:image` is relative. **Tell:** `https://fliploop-app.netlify.app/assets/og-image.png`. | Markup. |
| 5.21 | PWA-P5 | The apple touch icon has transparent corners. **Tell:** regenerate it full-bleed on Desk with `tools/asset-gen.html`. | No pixel with alpha under 255. |
| 5.22 | COPY-C-21 (static copies) | R43, by hand in `index.html` and the manifest: `<title>` "FlipLoop · אנימציה בציור, דף אחרי דף"; description "ציירו כמה דפים ותראו אותם זזים. 12 שיעורי אנימציה, אתגר שבועי, ייצוא ל-GIF, לווידאו ולגיליון הדפסה. בלי הרשמה, והציורים נשמרים רק במכשיר שלכם."; `og:description` "ציירו כמה דפים ותראו אותם זזים. בלי הרשמה."; manifest description "ציירו דף אחרי דף ותראו את הציור זז."; narrow Home screenshot label "ציירו כמה דפים ותראו אותם זזים". | Markup equals the rows WS6 writes. |
| 5.23 | CODE-DEAD | `formatMB`, `nextFrame`, `debounce` in `util.js`. | Tests green. |

**Contracts you consume:** K6 (`runProject`), K14.

### WS6 · Layout, visual drift, accessibility markup, navigation, UI copy (branch `fix/ws6`, port 9406)

Most items are small; the two router items (6.1, 6.2) are the risky ones, do them first.

| # | IDs | The interface it lives at, and the fix | Acceptance |
|---|---|---|---|
| 6.1 | J5 | Back links are plain forward links. **Tell:** R29, in `app.js` only: each new history entry records in `history.state` its index and the hash it came from; a delegated click on `a.back` goes back when the parent is the previous entry, else replaces. Every `location.replace` in the router carries the state forward. **Delegate:** from Print, "לציור" followed by system Back must not reopen Print. | Home, Gallery, project, "לגלריה", "הביתה", then Back: the app is left in one press. The lesson and challenge chains too. `#/new` still never re-creates a project. |
| 6.2 | J6 | Only the Export overlay has a history entry. **Tell:** R30: a back traversal while a registered sheet is open closes the top sheet and calls `history.forward()`; a navigation to the route already on screen is a no-op. `dialog.js` exposes what the router needs. | History Back with each of the 8 sheet types open and with the delete confirmation: sheet closed, same screen, nothing deleted. Links inside sheets still navigate. |
| 6.3 | S5 = CODE-C5 dead button | R31 with K1. | The stuck-`#/new` repro: the second tap creates the project. |
| 6.4 | PERF-P-01 (a), the delay noted in D-10 | The outgoing screen saves inside the view transition, where rendering is paused. **Tell:** await `unmount()` before `startViewTransition`. | Editor to Gallery with one unsaved frame under 400 ms here; real phone check stays open (section 8). |
| 6.5 | J1 (b) | Pull-to-refresh is armed. **Tell:** `overscroll-behavior-y: none` on the page. | Computed style. |
| 6.6 | D-11 | The `vt-canvas` pair was dropped. **Tell:** K10. Off under reduced motion. | Running animations include the `vt-canvas` group. |
| 6.7 | LAY-L1 | R32, Home. | "אנימציה חדשה" fully visible without scrolling at 667x375, 740x360, 844x390, 915x412, 932x430. |
| 6.8 | LAY-L2 = T-15 | R32, Editor. | Canvas at least 300 px wide at 844x390 and 280 at 667x375, free and lesson projects, no overlap, every control at least 44 px. |
| 6.9 | LAY-L3 | R33. Check the "התרגיל" button with `elementFromPoint` (it has a 44 px hit area already); fix only if the real hit area is smaller. | Target report over the 9 touch sizes. |
| 6.10 | LAY-L4, J-C4 = G-08 | Card menu clipped at 320; the frame count wraps beside a kind chip. | 320 and 360: menu button fully inside the card, count on one line. |
| 6.11 | LAY-L5 = D-13 = J10 | R34: bottom fade and a thin visible scrollbar on the panel; rail labels under `(hover: none)`. | 1280x800 and 1080x810 touch. |
| 6.12 | LAY-L6 (rest) | Rows that break at 200% text size. **Delegate.** | Root font 200%, 390 and 1280, Gallery, Editor free and lesson, Lessons: nothing clipped or colliding. |
| 6.13 | J-C5 = LAY-L8 = D-04 (gallery, not-found) = WK-W2 | R36: buttons in a row stretch to one height; the two phone secondaries split evenly. | Measured rects. |
| 6.14 | D-06 = LAY-L9 = SET-S-01 = COPY-C-23 (storage line) | The LTR figure aligns to the left. **Tell:** keep it an LTR isolate, align it to the start side. | 320 and 1280. |
| 6.15 | D-05 = J-C7 | The segmented control stretches. **Tell:** it hugs its content, like the onion counts. | Phone More sheet. |
| 6.16 | D-10 (rest) | No hover or pressed state. **Tell:** add both to swatches and recent chips, segmented buttons, the switch, the hold stepper, width options and project cards; add pressed to the shades toggle, menu items, starter cards and shade tiles. | Probe as in `s06`. |
| 6.17 | D-16 (rest) | R35: title field, warn icon and storage meter radii; sheet titles, Home subtitle, tool-key labels. | Computed values. |
| 6.18 | DS-02, A7 | R37. New keys `home.art.pause.aria` "לעצור את האנימציה", `home.art.play.aria` "להפעיל את האנימציה" (in section 3 of the copy file). | The band is on screen under 40% of the time. Keyboard can pause. Reduced motion unchanged. |
| 6.19 | DS-03 (Settings, Challenge, title field) | R34. | 1280 screenshots. |
| 6.20 | DS-04 | K8; the palette popover aligns to the panel top. | Neither popover covers the rail, the strip or Play. |
| 6.21 | DS-05 | The phone colours sheet has three left edges and a duplicate recent chip. **Tell:** both grids fill the sheet width; hide the 13th chip while the chart is open (CSS). | 390 screenshot. |
| 6.22 | DS-06 | K9. | White and the lightest tints have a visible edge. |
| 6.23 | DS-07 (rest), J-C3 | Home lessons card: the stamp glyph is Muted at 0 of 12 and Success from 1; the native colour well matches the round swatches; width options and the palette toggle use the Ink border; add the icons of K7. The duplicate "שכבת בצל" label is a string (6.33). | Screenshots. |
| 6.24 | DS-08 (tool labels 13 px, Home card padding 12 px) | R35. | Looked at on 360 and 390. |
| 6.25 | J-C8, J-C10 | Starters row starts inside the gutter; shade tiles are 32 px on a touch device at 1024 and up. **Tell:** scroll padding for the row; 44 px tiles under `(hover: none)`. | iPad landscape. |
| 6.26 | A8 (Rename, Delete) | `returnFocus` is an element that no longer exists. **Tell:** a dialog opened from inside a sheet inherits that sheet's return target. | Escape from Rename and Delete: focus on the card's menu button. |
| 6.27 | A10 | The Editor has a fixed height and no scroll. **Tell:** under 320 px of height the Editor may scroll and the canvas keeps a usable size. | 427x267 and 320x256: Back and "עוד" clickable, lesson canvas at least 200 px wide. |
| 6.28 | A12 | Forced colours hide swatches and selection. **Tell:** `forced-color-adjust: none` on swatches, tiles and the colour dot; an outline for pressed states. | Emulated forced colours. |
| 6.29 | WK-W1 (sheets) | `showModal()` focuses the close button. **Tell:** focus the heading. | WebKit: no ring after a tap-open; screen readers start at the title. |
| 6.30 | CODE-DEAD | `qs`, `qsa`, `has`. | Tests green. |
| 6.33 | **All UI copy** (existing rows): COPY-C-04 (R38), C-05 (R42), C-08 `coach.3` and `lessonMode.nudgePlay` (R41), C-11 `settings.about.credit` (R44), C-12 Home (K11), C-13, C-15 (R40, includes J-C9), C-16 = A6 (each name starts with the visible words; `print.action.pngSheet` becomes "להוריד גיליון {n} (PNG)"), C-17 ("פי" instead of "×" in the three aria strings), C-18 (all UI rows as proposed; the resize body is WS2's), C-19 (R39), C-20, C-21 rows (R43), C-22 (R45, and CH-C-03 = CODE-C16 label per R20: `challenge.meta.days.*` and `challenge.stamp.aria` say "אתגר {week}"), C-23 (`onion.toggle` "להציג", `settings.protected.label` "מוגן ממחיקה:", duplicate toasts "העותק מוכן: {title}"), C-24 `lesson.what.h2` "מה זה?", T-09 (a) `more.move.tooltip` "הזזה (V). גוררים את כל הציור בפריים. מה שיוצא מהדף נחתך." | **Tell:** the Copywriter's proposed text for every key, exactly, plus the rulings above. Update the conventions line in section 0 ("ביטול" is Cancel only) and both copies of any key that the toast index repeats. Themes: change the table and the paste-ready block together. | Dash check passes; 52 themes, all 16 characters or fewer; no raw `{placeholder}` on any screen except `{title}` in `export.done.project` before the merge (K6). Status and Back labels fit at 320. |

(Item numbers 6.31 and 6.32 are unused.)

**Contracts you serve:** K7, K8, K14 (rule), and the strings of K6. **You consume:** K1, K9, K10, K11.

---

## 8. What is not being fixed, and what cannot be checked here

### 8.1 Not fixing (allowed reasons only)

| ID | What | Reason |
|---|---|---|
| F11 | After Stop you land on the frame that was showing | Auditor's suggestion against a plan ruling (decision (e), the Stop choreography), with a real downside: Stop would mean two things (button and Space return, canvas tap stays). F13 is fixed, which removes the worst case. **This is the one item the user may want to overrule; ask if in doubt.** |
| T-09 (b) | Keep ink that Move pushed past the edge | Contradicts the plan's Moving state ("lost on release, one undo brings it back"); the gain is small because one Undo restores it. The missing desktop warning is fixed (6.33). |
| A11 | Onion previous and next differ by hue only | The onion colours and opacities are fixed by the plan; the audit itself rates the real impact as small (only full colour blindness). |
| CH-C-03, CODE-C16, COPY-C-22 (holiday drift from 2027) | Holiday themes move off their holidays | The plan fixes a 52-week cycle with no server and says no theme depends on an exact date; every theme is still drawable. Decide again before the first year ends. |
| COPY-C-22 ("קופסת הפתעות נפתחת") | Add a movement to theme 10 | 18 characters, over the approved 16-character limit. |
| EX-09 (third point) | A "one card per frame" print option | The plan says holds print as repeated cards (that is what makes the flipbook keep its timing); the new confirm covers the surprise. |
| EX-N4 | Cut lines 5 mm from the paper edge | Needs a real printer; the margins are Part C Ruling 3. |
| CODE-L14 | `selfTest` ships in production | Opinion with a real downside: removing it removes the integrator's export regression hook. It is loaded only when called. |

### 8.2 Closed without a code change

| ID | Why |
|---|---|
| D-16 (export cards are Paper, not Glow) | The build is right: a Glow card on a Glow sheet has no edge. The spec line is amended (section 12). |
| D-16 (desktop swatch grid 4x3) | The audit itself: the spec's 6x2 does not fit 208 px; the spec line is stale. |
| DS-08 (canvas far from the tools on tall phones) | Answered by R23: the band under the canvas is where toasts now sit. |
| COPY-C-23 (tool labels hidden at 360) | A note, not a defect; R38 makes the icons-only state less ambiguous. |
| COPY-C-14 (shorter lesson names) | The collision is fixed in CSS (3.10); the rename option is declined by R19. |
| F15 notes (24 fps cadence at 60 Hz, strip settling on "+") | The auditor marks both as not defects. |
| `10` observation (a keyboard user cannot put ink) | Passes WCAG 2.1.1 by the path exception; keyboard Fill and Move would be new features. |

### 8.3 Fixed or mitigated here, but only a real device can confirm

Tell the user plainly that these stay unverified: real iPhone and Mac Safari (video recording after R46, the native colour picker, safe areas, edge-swipe Back with a sheet open, the play glyph of R41); a real Android phone (pull-to-refresh, app switch during a save, tap right after a stroke, the 9 s starter case of PERF-P-01, share sheets, WhatsApp accepting the MP4); a real pen (T-06); a real screen reader; real Windows High Contrast; a real printer; print memory on a phone (CODE-C17); GIF encoding in a hidden tab (EX-N1).

---

## 9. Coverage ledger (every audit ID, where it went)

W1 to W6 = workstream and item. NF = section 8.1. CL = section 8.2.

**01 Critic:** J1 W1 1.1 (+ pull-to-refresh W6 6.5) · J2 W3 3.1 · J3 W3 3.2 · J4 W3 3.2 · J5 W6 6.1 · J6 W6 6.2 · J7 W1 1.11 · J8 W4 4.7 and 4.6 · J9 (a) W3 3.5, (b) W4 4.17 · J10 W6 6.11 · J-C1 W4 4.5 · J-C2 W4 4.18 · J-C3 W6 6.23 · J-C4 W6 6.10 · J-C5 W6 6.13 · J-C6 W3 3.17 · J-C7 W6 6.15 · J-C8 W6 6.25 · J-C9 W6 6.33 · J-C10 W6 6.25

**02 Tools:** T-01 W2 2.1 · T-02 W2 2.2 · T-03 W2 2.4 · T-04 (a, b) W2 2.5, (c) W4 4.3 · T-05 W2 2.6 · T-06 W2 2.7 · T-07 W2 2.8 · T-08 W2 2.9 · T-09 (a) W6 6.33, (b) NF · T-10 W2 2.1 · T-11 W2 2.10 · T-12 W2 2.11 · T-13 W2 2.12 · T-14 W2 2.13 · T-15 W6 6.8 · T-16 W4 4.18

**03 Frames:** F1 W1 1.1 · F2 W1 1.2 · F3 W4 4.1 · F4 W1 1.3 · F5 W4 4.2 and 4.17 · F6 W4 4.2 · F7 W4 4.3 · F8 W4 4.4 · F9 W2 2.4 · F10 W4 4.5 · F11 NF · F12 W4 4.6 · F13 W1 1.23 · F14 W4 4.8 · F15 stepper W2 2.17, step buttons and thumbnail W4 4.9, two notes CL

**04 Lessons, challenge, gallery:** L-01 W3 3.3 · L-02 (a) W2 2.3, (b) W3 3.4 · L-03 W3 3.4 · L-04 W3 3.6 · L-05 W3 3.2 · L-06 W3 3.2 · L-07 W3 3.7 · L-08 W3 3.9 · L-09 W3 3.10 · L-10 W3 3.11 · L-11 W3 3.12 · CH-C-01 W3 3.13 · CH-C-02 W3 3.14 · CH-C-03 label W6 6.33, drift NF · G-01 W1 1.12 · G-02 W1 1.9 · G-03 W1 1.13 · G-04 W1 1.14 · G-05 W1 1.15 · G-06 W1 1.16 · G-07 W1 1.17 · G-08 W6 6.10 · G-09 W1 1.20 · G-10 W1 1.18 · G-11 W1 1.19 and 1.11 · PERF-P-01 (a) W6 6.4, (b) W1 1.14 · SET-S-01 W6 6.14

**05 Exports:** EX-01 to EX-08 W5 5.1 to 5.8 · EX-09 W5 5.9, third point NF · EX-10 W5 5.10 · EX-N1 W5 5.11 · EX-N2, EX-N3 section 8.3 · EX-N4 NF

**06 PWA, storage, layout:** S1 W1 1.1 · S2 W1 1.3 · S3 W1 1.4 · S4 W1 1.5 · S5 W6 6.3 · S6 W1 1.6 · S7 W1 1.8 · S8 W1 1.9 · S9 W1 1.10 · PWA-P1 to P5 W5 5.17 to 5.21 · LAY-L1 W6 6.7 · LAY-L2 W6 6.8 (coach part W4 4.18) · LAY-L3 W6 6.9 · LAY-L4 W6 6.10 · LAY-L5 W6 6.11 · LAY-L6 W6 6.12 (station names W3 3.17, coach text W4 4.24) · LAY-L7 W3 3.10 · LAY-L8 W6 6.13 · LAY-L9 W6 6.14

**07 Design:** D-01 W3 3.15 · D-02 W3 3.10 · D-03 W3 3.9 · D-04 gallery and not-found W6 6.13, export W5 5.15 · D-05 W6 6.15 · D-06 W6 6.14 · D-07 W4 4.19 · D-08 W4 4.20 · D-09 W4 4.21 · D-10 strip controls W4 4.22, rest W6 6.16, delay W6 6.4 · D-11 W6 6.6 · D-12 W5 5.15 · D-13 W6 6.11 · D-14 W4 4.17 · D-15 W4 4.18 · D-16 W6 6.17, W4 4.24, W5 5.15, two points CL · DS-01 W4 4.23 · DS-02 W6 6.18 · DS-03 W3 3.16 and W6 6.19 · DS-04 W6 6.20 · DS-05 W6 6.21 · DS-06 W6 6.22 (data W2 2.18) · DS-07 stepper W2 2.17, card glyph and menu icons W1 1.26, export button icons W5 5.15, rest W6 6.23 and 6.33 · DS-08 Gallery W1 1.26, example strip W3 3.17, labels and Home cards W6 6.24, canvas position CL

**08 Copy:** C-01 W3 3.6 · C-02 W3 3.3 · C-03 W3 3.18 · C-04 W6 6.33 · C-05 W6 6.33 (call sites K6) · C-06 W4 4.14 · C-07 W3 3.18 · C-08 W6 6.33 and W3 3.18 · C-09 W3 3.18 · C-10 W3 3.18 · C-11 W6 6.33 and W3 3.18 · C-12 W4 4.16, W6 6.33, W3 3.19 · C-13 W6 6.33 · C-14 W3 3.10, rename CL · C-15 W6 6.33 and W3 3.18 · C-16 W6 6.33 · C-17 W2 2.17, W6 6.33, W5 5.14 · C-18 W6 6.33, W3 3.18, W2 2.2, W5 5.16 · C-19 W6 6.33 · C-20 W6 6.33 · C-21 W6 6.33 and W5 5.22 · C-22 W6 6.33, two points NF · C-23 W6 6.33, W6 6.14, W3 3.9, one point CL · C-24 W6 6.33 and W3 3.18

**09 Code:** C1 W1 1.1 · C2 W1 1.2 · C3 W1 1.3 · C4 W2 2.3 and W3 3.4 · C5 W1 1.4, W6 6.3, W3 3.20 · C6 W1 1.7 · C7 W2 2.14 · C8 W3 3.8 · C9 W5 5.18 · C10 W2 2.1 · C11 W4 4.10 · C12 W1 1.14 and W5 5.5 · C13 W2 2.5 and W4 4.3 · C14 W1 1.15, 1.16, 1.18 · C15 W5 5.4 · C16 W6 6.33, drift NF · C17 W5 5.9 · C18 W4 4.12, W3 3.1, W5 5.12 · L1 W4 4.18 · L2 W2 2.7 · L3 W5 5.12 · L4 W5 5.12 · L5, L6, L7, L9 W1 1.21 · L8 W5 5.12 · L10 W4 4.11 · L11 W1 1.12 · L12 W1 1.22 · L13 W5 5.19 · L14 NF · L15 W2 2.15 · DEAD W1 1.27, W2 2.19, W3 3.21, W4 4.25, W5 5.23, W6 6.30

**10 WebKit, accessibility:** A1 W4 4.13 · A2 W2 2.6 · A3 W4 4.14 · A4 W4 4.15 · A5 W1 1.25 and W2 2.16 · A6 W6 6.33 · A7 W6 6.18 · A8 W6 6.26 and W5 5.13 · A9 W5 5.13 · A10 W6 6.27 · A11 NF · A12 W6 6.28 · A13 point 1 W5 5.14, points 2 and 4 W2 2.17, point 3 W4 4.16, W2 2.17, W3 3.19, point 5 W4 4.20, point 6 W1 1.24, point 7 W4 4.16 · A14 W2 2.12 · WK-W1 W6 6.29 and W5 5.14 · WK-W2 W6 6.13

**Item counts:** WS1 27 · WS2 19 · WS3 21 · WS4 25 · WS5 23 · WS6 31 · not fixing 8 · closed without change 7.

---

## 10. Integration plan (one integrator, after all six report done)

**Before merging:** read the six `fix-wsN.md` files and the final `11-verification.md`. A finding the verifier disproved and the Developer could not reproduce is closed, not merged.

**Merge order** (on a branch `fix/integration` cut from the Step 0 commit): **WS1, WS2, WS4, WS3, WS5, WS6.** Storage first because every other stream sits on it; WS6 last because it changes strings, CSS and the router across everything.

After **each** merge:
1. Resolve conflicts. In `strings.js`, `lesson-copy.js`, `themes.js`: take either side, then run `node tools/build-strings.mjs`. In `editor.js` and `style.css`: both sides' hunks are kept, section 5 says whose lines are whose. Any conflict outside these files means an ownership rule was broken: read the two `fix-wsN.md` files before choosing.
2. `node --test tests/` (all files).
3. A two-minute smoke run with service workers blocked: new animation, draw, add a frame, Play, Stop, export a GIF, open lesson 1, open the Gallery. Zero console errors.

**After the last merge, in this order:**
1. **Contract glue check:** `export.done.project` has `{title}` and all four call sites pass `title` (K6); the three re-keyed plural keys are used and the old rows are removed if unused (K11); icons `open`, `rename`, `minus` exist (K7); `toolTap` passes `side` (K8); `data-light` and `is-opening` have their CSS (K9, K10); `frameRestore` is set, used and cleared (K4); `clearFrame` calls `paintPrepared` (K5). Missing string keys show as "Missing string key" in the console: there must be none.
2. **Copy pass:** one Copywriter spawn reviews every row of `final-ui-copy.md` section 24 and the changed rows (conventions, gender-free forms, lengths), then `node tools/build-strings.mjs`.
3. **Full regression** on the merged build, service workers blocked, then once more with the worker on:
   - `node --test tests/` and `selfTest({ count: 12 })` (gif, gifHalf, video, pdfA4, pdfLetter, pdfJpeg, pngA4 all ok).
   - Re-run each auditor's own scripts against the local build (they are in the scratchpad: `pw2/audit-critic`, `audit-tools`, `audit-frames`, `audit-lessons`, `audit-exports`, `audit-pwa`, `audit-design`, `audit-copy`, `audit-code`, `audit-webkit-a11y`, `audit-verify`; change the base URL only). Every Major repro must now fail to reproduce, and every line of each report's "tested and working" list must still hold.
   - The Auto-update pass table from `07-developer-notes.md` (all cases), because 1.1 changed the save timing it depends on.
   - Layout sweep 11 sizes x 10 screens (no horizontal scroll, no overlap), reduced motion, WebKit on three profiles, zero console errors.
4. **Build step:** bump `?v=9` to `?v=10` in `index.html` (all script and style tags), then `node tools/build-sw-manifest.mjs`, then `--check`. The new `404.html` and `js/fonts.js` must be in the precache list.
5. **Service worker pass** (short profile path, see the tooling note in the PWA pass): install, offline reload, offline exports, and the update flow with two local version bumps.
6. **Records:** one entry in `_process/07-developer-notes.md` ("Fix round 2026-10") that links the six `fix-wsN.md` files; append section 12's amendments to `final-site-plan.md`; update `audit-report.md` with what was fixed, what was not, and what still needs a real device.
7. **Gates:** Build Manager re-check (confirmation plus the regression sweep above), then the Gatekeeper's Launch Gate. Then fast-forward `main` to `fix/integration` and remove the worktrees.

---

## 11. Release checklist

GitHub Pages is free and deploys on every push to `main`. Netlify has about 20 deploys a month for all sites: **exactly one production deploy.**

1. **Before the first push:** confirm the Netlify site is not building from GitHub pushes (`netlify status`, and the site's build settings). If it is, stop and ask the user, because the push itself would spend a Netlify deploy.
2. `git push origin main`. Wait for the Pages workflow to finish (`gh run watch`).
3. **Verify on https://yotamyadin50-max.github.io/fliploop/** with a fresh browser profile: the worker's version equals the local `VERSION`; smoke run (new animation, a stroke then a reload after 300 ms keeps it, GIF export, first video export, lesson 1 to its stamp, Gallery, backup and import); the 404 page; zero console errors and zero CSP violations (the `<meta>` policy runs here).
4. **Update from the old build:** a profile that still has the previous Pages build (`a87cb93`, old `pwa.js`) must get the new one after one "לרענן" or one close and reopen. This is the last manual step those devices need (known limit of the Auto-update pass).
5. **Automatic update, end to end, on Pages:** with the new build open in a profile, push one more commit that changes one comment in `style.css` plus the regenerated `sw.js`. The open app must apply it by itself: within about 6 minutes on Home, and in the Editor only after 20 s without input, with the drawing, frame, tool and colour intact. This is the proof for "העידכון האוטומטי"; it costs nothing on Pages.
6. **The one Netlify deploy:** `netlify deploy --prod --dir=site` from the project root (site id is in `.netlify/state.json`). Deploy the exact commit that passed step 5.
7. **Verify on https://fliploop-app.netlify.app:** response headers (`Content-Security-Policy` present, `sw.js` no-cache), the Hebrew 404, `og:image` absolute, the worker's version, one smoke run, zero console errors. If something is wrong, do not deploy again: republish the previous deploy in the Netlify UI (that is not a new deploy) and fix on Pages first.
8. **Tell the user, in Hebrew:** what was fixed, the "not fixing" list with the F11 question, the list in 8.3 that only their devices can check, and that devices already running the old build need one last manual refresh.

---

## 12. Plan amendments and the loop

**Amendments the integrator appends to `final-site-plan.md`** ("Fix round 2026-10", pointing here): fill tolerance 32 on paper and 4 on opaque paint (R8) · eraser 8, 20, 40 px (R10) · canvas size not available in lessons, round-trip restore in a session (R9) · autosave 250 ms and 2 s, synchronous rescue record, the three status words (R1, R2, R39) · two-tab rule (R3) · `touched` flag on projects (R5) · backup carries progress (R6) · lesson done rule = added ink, sheet after one cycle, once (R14) · long press 450 ms (R24) · Space rule (R11) · toast position on phones (R23) · Play 48 px circle and the lamp values (R26, R27) · counter pinned in the strip (R25) · Back and sheet history rules (R29, R30) · title pattern "{screen} · FlipLoop" (R43) · export cards are Paper, desktop swatch grid is 4x3 (R35) · onion over-layer for ghosts hidden by opaque paint (R12) · single-letter shortcut switch (R13) · names: "הגלריה שלי", "לשיעורים", "הביתה", "אחורה", "קדימה" (R38, R40) · CSP and 404 (R50, R51).

**Risk notes for the integrator (where a miss is least likely to be seen):** the raw `{title}` placeholder if one K6 call site was missed; the CSP, which first meets real response headers on the single Netlify deploy (the `<meta>` copy and the local header server are the two rehearsals); `404.html` under the `/fliploop/` path on Pages; the rescue record applied at boot against a project another tab already saved; lesson projects that were made square on the live site before the fix.

**For the loop:** `2026-10-01 | build-manager | 40-fliploop | A fix round of about 150 findings can run as six parallel branches only if three things are decided before anyone starts: per-method ownership of the one hot file, additive contracts so no branch needs another branch's code to run, and a base commit that reserves each stream's own insertion point in every shared text file | Applies to any multi-agent fix round on a zero-build codebase where one file (here editor.js) is touched by most findings`
