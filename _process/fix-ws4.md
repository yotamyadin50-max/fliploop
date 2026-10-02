# Fix round 2026-10 · WS4 · Frames, strip, playback, toasts, coach marks

**Branch:** `fix/ws4` (4 code commits on top of `27a84ea`, not pushed, not merged) · **Worktree:** `.worktrees/ws4` · **Server:** `http://127.0.0.1:9404/` from `.worktrees/ws4/site` · **Browser:** installed Chrome through Playwright 1.49.1, headless, `serviceWorkers: "block"`, `locale: "he-IL"`.
**Scripts:** scratchpad `pw2/fix-ws4/` (`lib.mjs`, `t-f3.mjs`, `t-frames.mjs`, `t-toasts.mjs`, `t-coach.mjs`, `t-visual.mjs`, `t-scroll.mjs`; every script has a hard timeout). Each script prints PASS or FAIL per acceptance check. Outputs on the untouched branch: `base-*.txt`. Outputs after the fix: `fix1-*.txt` plus the short re-runs named below. Screenshots: `pw2/fix-ws4/shots/`.
**Binding instructions:** `_process/12-fix-direction.md` sections 0, 1, 2, 3, 5, 6, 7 (WS4), 8. Verdicts read from `_process/audit/11-verification.md` (F3, F5, F6, A1, J8 all CONFIRMED on the live site; F6 raised to Major; A1 and J8 narrower).

**Result in one line:** all 25 items fixed and verified in a real browser; unit tests 25 of 25 (17 old, 8 new); zero console errors and zero page errors in every run, apart from the test-setup artifact described under "Baseline".

## Baseline (untouched `fix/ws4` = `27a84ea`): every item failed first

Real mouse, real keyboard, real touch (CDP `Input.dispatchTouchEvent`).

| Check on the base | Result on the base |
|---|---|
| F3 desktop, frame in the centre gate, 10 drags | 0 of 10 right. The strip scrolled by exactly the drag distance and the lifted frame stayed in the gate (x 640) while the pointer was 90 to 234 px away |
| F3 phone (Pixel 7, touch), right after adding 5 frames with "+" | 1 of 10 right. scrollLeft jumped 288 to 360 at the moment of the lift, in every run |
| F3 edge hold, phone 12 frames and desktop 24 frames | scrollLeft never moved (720 and 1728 for 6.4 s); frame 12 ended at position 9, frame 24 at position 17 |
| F5, 7 delete and undo orders | 5 of 7 wrong, and saved wrong (read back after a reload). Example: delete 3 then 2, undo the older toast first: `1 2 4 3` |
| F6 | 121 frames, counter "121/120", no message |
| F7 D during Play | frame duplicated, player kept running |
| F8 strip click during Play | selection changed, player kept running (reduced and normal motion) |
| F10 at 100, 119, 120 on a 360 px phone | notice off screen at all three scroll positions tried, computed `direction: ltr`; N, D and "+" at 120 gave no message |
| F12 tap on Play with one frame | no toast |
| F14 vertical wheel over the strip | scrollLeft 2088 before and after |
| F15 | step buttons live at both ends; duplicate thumbnail ink sum 55143 against 50528 for its original |
| J8 "+" first | "ציירו משהו" stayed through a stroke on frame 2, a third frame and a second drawn frame; flags stayed `100` |
| CODE-C11 | touch presses of 350, 450, 700 ms and a 700 ms mouse press did nothing |
| CODE-L10 | two fingers lifted two cells |
| CODE-C18 | toast still on the Gallery after leaving by the Back link and by history Back; its action rewrote the project from the closed Editor (3 frames in IndexedDB again) |
| A1 | focus on `BODY` after a keyboard delete, live region "פריים 4 נמחק", toast gone at 7 s, no `frameRestore` |
| A3 | toast under the Export dialog (`elementFromPoint` did not hit it) on desktop and at 390 px; live region `ignored: true (activeModalDialog)` |
| A4 | outline colour `rgb(31, 30, 27)` on the coach close button and on the toast action |
| A13 point 7, point 3 | toast is `role="status"` and is copied to the live region; counter name "1 פריימים מתוך 120" on a span with no role |
| D-14 | toast covered all 7 tool keys at 390x844 and 375x667 (toast bottom 48 px below the tool row's top) |
| Stacking | 5 toasts on screen after five fast deletes |
| Reorder hint on the coach bubble | overlapped on desktop |
| D-15 | rings `box-shadow: none`; leader painted over the tool key under it (17 and 18 of 18 sampled pixels Lamp) for coach 2 and 3 |
| LAY-L2 coach | at 844x390 the bubble covered the title field for coach 1, 2 and 3 |
| CODE-L1 | `ReferenceError: Cannot access 'closed' before initialization` |
| D-07 | Lamp tint 4.5, 5.5 and 7 px outside the thumbnail, and on the sprocket holes above and below |
| D-08 | ring clipped: top and bottom side pixels were Desk and Film, not the ring |
| D-09 | 56 x 48 at 390x844, 844x390 and 1280x800 |
| D-10 | cell, both fps states and the loop button: no pressed state; cell and fps: no hover state |
| DS-01 | playing halo luminance 0.640, below the Desk at 0.674; dip alpha .18 to .1656 |
| D-16, LAY-L6 | radii 6, 6, 10, 14 px; coach text 15 px at a 200% root font |

**Test-setup artifact, counted apart in every run:** with `serviceWorkers: "block"` Playwright's stubbed `register()` resolves `undefined`, and the frozen `js/pwa.js` then throws "Cannot read properties of undefined (reading 'waiting')" once per page load. A real browser never resolves `register()` with `undefined`, so this is not an app error. It is listed under "Noticed outside my area" for the integrator.

**Server note:** plain `python -m http.server` refused connections under Chrome's parallel module requests about once in ten page loads (`net::ERR_CONNECTION_REFUSED`), which left the app stuck on `#/new`. I used python's own `http.server` with a larger listen backlog (`pw2/fix-ws4/serve.py`), same port, same folder.

## Items

| # | IDs | Reproduced on the base | What changed (files, methods) | Checks, measured | Not done |
|---|---|---|---|---|---|
| 4.1 | F3 (R!) | Yes: 0 of 10 desktop, 1 of 10 phone, edge scroll dead | `strip.js` `dragBegin`, `dragMove`, new `dragUpdate`, new `edgeScroll`, `positionInsert`, `dragEnd`; CSS `.strip.is-dragging .strip__scroller` (no snap, no overflow scroll). Scroll position frozen at drag start; a 16 ms timer scrolls while the pointer rests within 40 px of an end, and the lifted cell stays under the pointer | Desktop centred frame 10 of 10, control frames 3 of 3. Phone touch right after "+" 10 of 10, scrollLeft 288 at lift and through the drag, lifted cell centre equals the pointer x in every run. Edge hold with no pointer movement: phone 720 to 0 in 1.2 s, frame 12 lands in slot 1; desktop 1728 to 0 in 2.4 s, frame 24 lands in slot 1 | Real phone check stays open (section 8.3) |
| 4.2 | F5, F6 (R!) | Yes: 5 of 7 orders wrong; 121/120 | New pure module `core/frame-order.js` (`syncGhost`, `restoreIndex`) with 8 unit tests in `tests/ws4.test.mjs`. `editor.js` `deleteFrame`, `insertAt`, `reorder`, new `restoreFrame`, `rememberOrder`, `emptyTrash`, `trash` getter. A restore goes next to the neighbour the frame had; at 120 frames it is refused with `toast.frameRestore.full` and the delete toast stays open | 7 of 7 delete and undo orders give `1 2 3 4` (or `1 3 4` for the one-undo case), also after a reload. 120, delete, "+", undo: stays 120, counter "120/120", message shown. Two delete toasts at the cap: 120 in memory and 120 in IndexedDB | |
| 4.3 | F7 | Yes | `editor.js` `duplicateFrame`, `insertBlank`: stop the player first, then act on the frame it stopped on | D during Play: playing false, 7 frames. `insertBlank()` during Play: player stopped, 4 frames | |
| 4.4 | F8 | Yes | `strip.js` new `tap()`, `cellClick`; host gets `stop` in the `FilmStrip` block of `build()` | Click during Play: stopped on the clicked frame (frame 3 reduced motion, frame 6 normal motion), no frame menu opened | |
| 4.5 | F10, J-C1 | Yes | `strip.js` constructor, `render`, `refreshChrome`: counter and notice are one chip pinned at the strip's top right corner, in the 12 px band above the thumbnails, outside the scrolling track, `dir="rtl"`. "+" is `aria-disabled` at 120 instead of `disabled`, so a tap can answer. `editor.js` new `roomForFrame()` used by `addFrame`, `duplicateFrame`, `insertBlank` | 360 wide at 100, 119, 120: notice fully inside the viewport and painted on top at three scroll positions each, covers no thumbnail, direction rtl, text starts with "120". N, D and a tap on "+" at 120 each show "אי אפשר להוסיף: 120 פריימים זה המקסימום", frame count stays 120. Screenshot `counter-360-120.png` looked at | The chip is hidden during Play (the gate label counts then) |
| 4.6 | F12 = J8 second half | Yes | `editor.js` `togglePlay` | Tap on Play with one frame (Pixel 7): toast "צריך לפחות 2 פריימים" | |
| 4.7 | J8 first half (R!) | Yes | `editor.js` `startCoach`, `advanceCoach` rewritten as a state read from facts, new `closeCoach`; `select()` re-reads the state | Scripted path: tip 1, tip 2, tip 1 text on the new empty frame, tip 3, first-Play line, flags `111`. "+" first, then draw on frame 2: "ציירו משהו" leaves, tip 2 shows; a second drawn frame brings tip 3. Two frames, standing on the empty one: tip 1 text; drawing there brings tip 3. After Play a new project shows no tip. X on tip 1 then drawing: tip 2 | See "One deviation" below |
| 4.8 | F14 | Yes | `strip.js` new `wheel()` | 30 frames: scrollLeft 2088, wheel up 1656, wheel down 1944; selected frame unchanged | |
| 4.9 | F15 | Yes | `editor.js` `buildPlaybar`, `refreshPlaybar` (`aria-disabled` on the end buttons, both live during Play); `strip.js` new `drawThumb()` with one smoothing setting on a software canvas | Previous disabled on frame 1, next on the last, both live in between. Duplicate thumbnail 204 dark pixels and ink sum 55284, identical to its original at once | |
| 4.10 | CODE-C11 | Yes | `strip.js` `LONG_PRESS_MS` 450, `dragEnd`: no movement means `tap()` | Touch presses of 150, 350, 450, 700 ms on the current frame open its menu; 350 and 700 ms on another frame select it; 700 ms mouse press selects | Real phone long-press behaviour (context menu timing) stays open |
| 4.11 | CODE-L10 | Yes | `strip.js` `pressStart`: a press is ignored while a drag exists | Two fingers: 1 lifted cell, one frame moved | |
| 4.12 | CODE-C18 first bullet | Yes | `toast.js` `owner` option, `sweep()` on the bus `route` event and before each new toast, check at click time. All toasts made in WS4 methods pass `owner: this` | Delete, leave within 2 s by the Back link and by history Back: 0 toasts on the Gallery, IndexedDB keeps 2 frames. Action clicked with the owner disposed: nothing happens | |
| 4.13 | A1 (R!) | Yes | `toast.js` rule 4 (focus to the action after keyboard input, timer waits on focus or hover, Escape, `returnFocus`), `announce` option; `editor.js` `deleteFrame` sets `this.frameRestore` (K4) | Keyboard only: focus lands on the toast action; live region says "פריים 4 נמחק. אפשר להחזיר אותו, גם עם Ctrl+Z"; toast still there 7 s later; Enter restores (`1 2 3 4`) and focus lands on the frame cell; Escape closes and focus returns to the cell. K4: `frameRestore` is a function, a real Ctrl+Z restores the frame 6 s after the toast is gone, then it is `null` | The Ctrl+Z check ran with WS2's one K4 consumer line applied in the page; `doUndo` is WS2's method |
| 4.14 | A3 = COPY-C-06 | Yes | `toast.js` `rehome()`, `topDialog()`: both regions move into the top open modal dialog and back on its `close` or when it starts closing | Export, "להוריד קובץ פרויקט", desktop and 390 px: toast visible, `elementFromPoint` hits it, live region `ignored: false`; after Escape both regions are back in `body`. Screenshot looked at | Not heard with a real screen reader (section 8.3) |
| 4.15 | A4 | Yes | CSS `.toast :focus-visible, .coach :focus-visible` | Outline `rgb(244, 182, 63)` on both. Screenshots `a4-*.png` | |
| 4.16 | A13 (7, 3), COPY-C-12 | Yes | `toast.js`: the toast has no role, the live region is the one announcer. `strip.js`: count is `role="img"` with `tp("strip.counter.aria", n)` (K11) | "פריים אחד מתוך 120" at 1, "2 פריימים מתוך 120" at 2, role `img`; 0 status toasts, live region holds the text | |
| 4.17 | D-14 = J9 (b), stacking, hint on coach | Yes | `toast.js` `place()` measures the rows that lie under the toast (tool row, strip, playback bar) and sits 8 px above the highest; `MAX_TOASTS` 3. `coach.js` `place()` lifts the bubble clear of any toast | 390x844 and 375x667: 7 of 7 tool keys hit at centre, top and bottom, gap to the tool row 8 px. Five fast deletes: 3 toasts at most. Reorder hint and coach bubble: no overlap on desktop and phone. Screenshots looked at | |
| 4.18 | D-15 = J-C2 = T-16, LAY-L2 coach, CODE-L1 | Yes | `coach.js`: variables declared before `place()`, `keepBelow`, obstacles count only when they lie under the bubble. CSS: `body:has(.coach--lead) .tool-key` paints above the leader; rings get a Film edge | Leader over a tool key: 0 Lamp pixels of 16 to 18 sampled, coach 2 and 3, two phone sizes. Rings `box-shadow` Film inside and out. 844x390: coach 1, 2, 3 cover neither title, Export nor Back. `showCoach` on a detached target: no throw. Screenshots `coach3-390x844.png`, `coach1-844x390.png` looked at | |
| 4.19 | D-07 | Yes | CSS `.cell.is-current .cell__thumb`: 2 px Lamp outline, blurred glow, `clip-path: inset(-4px)` | At 3x: film untouched 4.5, 5.5 and 7 px out; 10 sprocket-hole samples untouched; `d07-current-cell-3x.png` looked at | |
| 4.20 | D-08 = A13 (5) | Yes | CSS `.cell:focus-visible` and its `::before`: inset On-film ring around the whole cell, above the cell's children | Current and non-current cell: ring pixel On-film on all four sides; ring colour differs from Lamp. Screenshots looked at | |
| 4.21 | D-09 | Yes | CSS `.play-btn` 48 x 48 | 48 x 48 at 390x844, 844x390, 1280x800 | |
| 4.22 | D-10 | Yes | CSS hover and pressed for `.cell`, `.fps-btn`, `.mode-btn` | Rest, hover and pressed all differ for a frame cell, fps (selected and not) and the loop button | Computed styles only |
| 4.23 | DS-01 | Yes | CSS `.is-playing .stage`, `.glow-dip`, new `.glow-catch`; `playback.js` `firstPlayFlourish` (clean 40 ms steps; no flicker under reduced motion) | Halo 4 px out: luminance 0.858 playing against Desk 0.674, at three sizes. Dip: steady alpha .45, .28 inside both dips, sampled every animation frame. Screenshot `ds01-playing-375x667.png` looked at | The 40 ms dip is proven by per-frame computed style, not by a pixel capture: screenshots take about 70 ms each here. The outer amber glow 13 px out measures 0.634, slightly under the Desk; that is the value R27 gives |
| 4.24 | D-16, LAY-L6 | Yes | CSS radii to tokens; coach and toast text in `rem` | gate 4, "+" 4, coach close 12, rings 16; coach text 15 px at 100%, 30 px at 200% | |
| 4.25 | CODE-DEAD | Yes (0 callers) | `FilmStrip.updateAll` removed | grep over `site/` and `tests/`: 0 references; tests green | |

Also checked: no horizontal page scroll in the Editor at 320, 390 and 1280 with a toast and a coach tip open (`t-scroll.mjs`).

## One deviation from the Tell in 4.7, with the reason

The Tell says: two or more frames and one with ink, coach 1 text at the canvas. I show that text only while the frame on screen is empty. When the child stands on the one drawn frame, tip 2 ("הוסיפו פריים וציירו הלאה") shows at "+" instead. Reason: on the "+ first, then draw" path the child is standing on the frame just drawn, and "ציירו משהו" over that drawing is exactly the J8 symptom; the acceptance check ("the tip moves on") would fail. The Build Manager may overrule; the change is one line in `advanceCoach`.

## New string keys (section 24.4 of `final-ui-copy.md`)

| Key | Hebrew | Status |
|---|---|---|
| `strip.counter.aria.one` | פריים אחד מתוך 120 | K11, Copywriter's proposal from COPY-C-12 |
| `strip.counter.aria.other` | {n} פריימים מתוך 120 | K11 |
| `toast.frameRestore.full` | אי אפשר להחזיר את הפריים: כבר יש 120 פריימים | Build Manager's draft |
| `toast.frameDeleted.aria` | פריים {n} נמחק. אפשר להחזיר אותו, גם עם Ctrl+Z | my working draft, needs the Copywriter pass |
| `toast.frameRestored.aria` | פריים {n} חזר למקומו | my working draft, needs the Copywriter pass |

The old unsuffixed `strip.counter.aria` row is no longer used by code (K11: the integrator removes it).

## Contracts

- **K3 served:** `toast(message, { owner, returnFocus })`. Also new and optional: `announce`, `onClose`, and an action's `onClick` may return `false` to keep the toast open.
- **K4 served:** `editor.frameRestore` is `null` or a function returning a promise. Set in `deleteFrame`, cleared when used or replaced. If the restore is refused at 120 frames it re-arms itself.
- **K12 served:** `player.cycle` and `player.stop()` unchanged.
- **K11 consumed:** `strip.counter.aria` re-keyed to `.one` and `.other`.

## Needs from another workstream

- **WS2 (K4):** `doUndo()` must start with the K4 line, `afterEdit()` must set `this.frameRestore = null`, `refreshUndoButtons()` must treat a pending `frameRestore` as "can undo". Until then Ctrl+Z does not restore a frame; the toast action does.
- **WS2 (K3):** `clearFrame()` passes `owner: this`.
- **WS1 (K3):** the Gallery delete toast passes `returnFocus`.
- **WS6:** `common.undo` becomes "להחזיר" (R38). My draft `toast.frameDeleted.aria` uses the verb "להחזיר" and reads right after that change.
- **WS6 (R32, R33):** nothing needed. The toast position and the coach placement are measured from the real rows, so the new landscape layout needs no change here.

## Noticed outside my area

- `js/pwa.js` (frozen): `reg.waiting` is read without checking that `register()` returned a registration. Harmless in real browsers; it is the one page error in every blocked-service-worker test run.
- The first-Play line ("הציור שלכם הפך לסרט.") sits over the dimmed tool row on phones for its 2.5 s. Not in any audit item, left as it is.
- `editor.js` `advanceCoach` reads `this.topbar`, which WS1's top bar block creates. If WS1 renames it, the coach only loses its "stay under the top bar" limit.

## Not verifiable here (section 8.3)

Drag-reorder and long press on a real phone; the toast and live region with a real screen reader; the lamp dip on a real 60 Hz phone screen.
