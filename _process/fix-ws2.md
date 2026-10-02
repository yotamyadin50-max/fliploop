# Fix round 2026-10 · WS2 · Drawing tools, fill, canvas size, shortcuts

**Branch:** `fix/ws2` (cut from `27a84ea` "Fix round base"). **Worktree:** `.worktrees/ws2`. **Server:** `python -m http.server 9402 --bind 127.0.0.1` from `.worktrees/ws2/site`.
**Browser:** real Chrome through Playwright 1.49.1 (`channel: 'chrome'`, headless), `serviceWorkers: 'block'`, `locale: 'he-IL'`. Desktop 1280x800 with real mouse and keyboard, phone = Pixel 7 profile with real touch events through CDP.
**Scripts, outputs and screenshots:** `scratchpad/pw2/fix-ws2/` (full prefix in `_process/audit/ENV-NOTE.md`). `lib.mjs` there is the tools auditor's helper, pointed at the local server. Each repro script was run on the untouched branch first (`out-*-base.txt`) and again after the fix (`out-*-fix.txt`).

| Script | Covers |
|---|---|
| `r01-fill.mjs` | 2.1: audit repros S1, S2, S3 and the verifier's 15 scenarios |
| `a-t03-fill.mjs`, `a-t04-fill-shades.mjs` | the tools auditor's own fill scripts, unchanged, against the local build |
| `r02-keys.mjs` | 2.4, 2.5, 2.6, 2.16 |
| `r03-draw.mjs` | 2.7, 2.9, 2.10, 2.11, 2.12, 2.13, 2.14 |
| `r04-size-onion.mjs` | 2.2, 2.3, 2.8 |
| `r05-a11y.mjs` | 2.17, 2.18, K8 |

Status: DONE, see the last section.

## Items

| # | IDs | Reproduced on the untouched branch | What changed | Checks, measured | Not done |
|---|---|---|---|---|---|
| 2.1 | T-01 = CODE-C10, T-10 | Yes. 7 of 17 scenarios leak: the 2 audit repros and the verifier's 2, 2c, 3b, 3c, 4 (outline 1871 px to 0, or the whole frame flooded). Rim: 159 yellow-tinted pixels after yellow then blue (the audit's number). | `core/fill.js`: tolerance 32 when the clicked pixel is not fully opaque, 4 when it is opaque paint. On paint the rim pixels (touching the area by a side or a corner) are un-mixed against the line colour beside them and the old colour's share is replaced by the new colour. On paint the fill no longer grows into bare paper, and soft pixels of the same paint are recoloured with their alpha kept. `tests/core.test.mjs`: fill test and palette test updated (all 2,556 pairs further apart than 4, closest pair is 9). `tests/ws2.test.mjs`: all pairs both directions, rim, painted page, NaN. | 0 of 17 leak; outline pixel counts unchanged in every scenario. Rim: 0 yellow-tinted pixels after yellow then blue, 0 red-tinted after red, blue, green. The auditor's own scripts: 10,216 px disc, 972 outline px kept through three refills, same-colour fill adds no step, open shape floods and one undo restores it with 0 differing pixels, thin 2 px triangle holds. Zoomed screenshot looked at (`shots/r01-S3-zoom8x-fix.png` against `-base.png`). | |
| 2.2 | T-02, COPY-C-18 resize row | Yes. Wide, square, wide with no edit: 5220, 690 and 1438 pixels differ on the three frames. One dialog text for both directions, no word about the undo steps. | `editor/doc.js`: `resizeFrame()` keeps what a crop cuts off (`frame.cut`, raw pixels of the cut strips, empty strips skipped) and puts it back when the size changes back and `frame.version` did not move. A copy of an unedited frame inherits it. `restoreFrame()` resizes a frame that was deleted before a size change. `editor.requestResize()`: body per direction (`confirm.resize.body.square`, `.wide`), blocked during a stroke or playback. | Wide, square, wide with no edit in between: 0, 0, 0 differing pixels on the three frames. Second round with frame 2 edited while square: frames 1 and 3 again 0 differing pixels, frame 2 keeps the new stroke (1,600 px in its band) and its cut sides stay cut. Undo is empty after each change, as the dialog says. A reload shows the same pixels as before it (hashes equal). Both dialogs read on screen (`shots/r04-resize-dialog-square-fix.png`, `-wide-`). | |
| 2.3 | L-02 (a) = CODE-C4 (a) | Yes. Lessons 3, 6, 8 show "גודל הדף" in the desktop panel and in the phone More sheet. | `renderPanel()` and `openMore()` leave the size group out for lesson documents; `requestResize()` returns at once for them. | Lessons 3, 6, 8: desktop panel groups are colours and onion only, 0 size buttons; phone More sheet has the onion group only, 0 size buttons; `requestResize(360, 360)` called directly changes nothing and opens no dialog. A free project still has the control (2 buttons). Screenshots of lesson 3 looked at, desktop and phone. | |
| 2.4 | T-03 = F9 | Yes. 1 of 4 flows plays (eraser key: width popover opens; frame cell: frame menu opens; onion count: nothing). | `onKey`: Space is Play or Stop for any focus outside a text field or a dialog; key-down is prevented and the next Space key-up is swallowed once, so a focused button is not clicked as well. | 4 of 4 flows play, no dialog opens. Space on the focused Play button: playing after the first press, stopped after the second. Enter on a focused tool key still opens its sheet. Space in the title field types a space and does not play. | |
| 2.5 | T-04 (a, b) = CODE-C13 | Yes. Ctrl+Z mid-stroke: 1472 pixels differ after undoing the stroke, history corrupted. Arrow mid-stroke: the frame switches under the pen. N, E, Space mid-stroke all act. | `onKey` does nothing while `input.active` (default action still prevented for Space, arrows, Ctrl+Z, Ctrl+Y); `doUndo`, `doRedo`, `clearFrame`, `requestResize` return while a stroke is open. | Ctrl+Z mid-stroke: undo steps 1 to 2, undoing the stroke gives 0 differing pixels. Arrow mid-stroke: frame stays, frame 2 unchanged. N, E, Space mid-stroke: count 2, tool pencil, not playing. | |
| 2.6 | T-05 = A2 | Yes. After O the switch still says on (`aria-checked="true"`, "שכבת בצל פועלת") while onion is off. | `setOnion()` calls `onionPanel.sync(document, onion)`, the one place that writes the switch state, its label and the pressed counts. The switch no longer sets its own state. The O key also announces the new state. | Desktop: in sync after O and after O again. Phone More sheet opened after O: off, "שכבת בצל כבויה"; after a tap on the switch: on, label matches. | |
| 2.7 | T-06 = CODE-L2 | Yes. Pen down and cancel, a finger 700 ms later adds 0 px, `penActiveUntil` is Infinity. Same for a pen press on a locked lesson frame lifted outside the canvas. | `drawing.js`: the grace time is set on pen cancel and on any pen `pointerup` or `pointercancel` on the page (capture listener on `window`). | Finger adds 752 px after 700 ms in both cases; a finger inside the 600 ms grace still adds 0. Synthetic pen events (CDP cannot send a real pen cancel). | Real pen: section 8.3. |
| 2.8 | T-07 | Yes. Yellow backgrounds: the stage shows plain yellow where the previous frame's mark is. | `editor/stage.js`: second onion canvas above the display canvas (`stage__onion stage__onion--over`, `pointer-events: none` inline), filled where the current frame is opaque, the neighbour has ink there, and the two colours differ. One deliberate narrowing, see "Readings" below. `flushEdits()` re-renders it after an edit of the current frame. | Five frames with yellow backgrounds, on frame 3: the stage shows (239,157,35) at the previous frame's mark (red ghost over yellow), (185,170,83) at the next frame's mark (blue ghost), the frame's own mark stays (31,30,27), plain background stays (245,197,24). Line drawings: 0 pixels on the new layer, also after a same-colour line is drawn across the neighbours' marks, so the stage shows exactly what it did. Onion off: 0 pixels on both layers. A stroke over the ghost lands on the frame and the hit test returns the drawing canvas. During Play both layers are at opacity 0. Screenshot looked at (`shots/r04-onion-filled-fix.png`). | |
| 2.9 | T-08 | Yes. Cuts 2, 4 (+2 partly) and 10 px. | `ERASER_WIDTHS = { s: 8, m: 20, l: 40 }`, `DrawingInput.widthPx(tool, key)`. Width sheet dots are the real size + 6, capped at 40 px. Eraser options get their own aria names. | Cuts measured through a filled disc: 8, 20, 40 rows fully clear. Pencil still 2, 6 (5 px line on a pixel centre), 10. Dots 14, 26, 40 px inside 97x88 (desktop) and 121x88 (phone) buttons. | |
| 2.10 | T-11 | Yes. Move on an empty frame: undo 1. Eraser on an empty frame: undo 2. Frame marked dirty. | `UndoManager.commit()` compares the rectangle before and after (`sameBytes`, unit tested) and returns false without recording when nothing changed; callers then skip `touch()` and `onStrokeEnd`. `clearFrame()` uses the same rule instead of the ink scan. | Move and erase on an empty frame: undo 0, undo button disabled, document not dirty. A real Move and a real erase add one step each. Note: a stroke of the same colour over itself still records a step, because blending rounds some pixels by one level, so pixels did change. | |
| 2.11 | T-12 | Yes. Edge row of the 5 px line: 183 to 184 with dense samples, 128 with spots of 137 to 178 at every joint with sparse samples. | `drawing.js` `redraw()`: for constant-width strokes the changed rectangle gets its pre-stroke pixels back and the stroke is drawn again inside it as one path (clip), from every piece that reaches into it. Pressure strokes keep `segment()`. | Edge rows 37, 42, 77, 82: 160 of 160 pixels at alpha 128, dense and sparse. 40 strokes back to back: 40 lines, 40 steps. 600-point stroke at 4x CPU throttle: pointermove handler mean 0.29 ms, p95 1.2 ms, max 3.4 ms, 0 of 600 moves at 4 ms or more (a full-stroke redraw per move was tried first and measured p95 5.8 ms, so it was replaced). Against one full redraw of the same stroke the piece method differs on 2,219 edge pixels, 1,622 of them by 1 or 2 alpha levels, 2 by more than 16: rasteriser rounding, not double painting. | |
| 2.12 | T-13 = A14 | Yes. Well stays `#1f1e1b` after a swatch and after a shade. | `panels.js`: the input is created before `render()`, and `render()` sets its value. | `#e23b2e` after the red swatch, `#0c45ab` after blue 6, `#1f1e1b` after a reload (the Editor's colour is black again then). | |
| 2.13 | T-14 | Yes. Pixel 7 profile, 4x throttle: `pointerup` handler 145, 87, 48, 31 ms; fills 274 ms (first) and 117 ms (full background). | `afterEdit()` does the canvas, the undo buttons and the save kick at once; thumbnail, onion, lesson progress and coach checks run in `flushEdits()` after the next painted frame (150 ms timer as a fallback for a hidden tab; Space calls it directly before Play). Fill works on a copy of the gesture snapshot (one frame read instead of two) and hands the result to `commit()`. PNG compression of undo patches runs when idle. | `pointerup` handler 4, 3, 3, 2 ms (target 50). Fill `pointerdown` handler 47 ms (first) and 93 ms (full background, target 120). Thumbnail and undo count correct afterwards. | |
| 2.14 | CODE-C7 | Yes, with a second finger as the cancel (the audit used Space, which 2.5 now blocks): 872 px after the cancel, 2854 px after a reload. | `cancelActive()` calls `frame.touch()` and the new host hook `onCancel` (kicks the autosave). A Move dragged away and back does the same. | 872 px after the cancel, 872 px after a reload. | |
| 2.15 | CODE-L15 | From code. | `floodFill` refuses a start that is not inside the canvas, NaN included; `onDown` refuses a NaN point. | Unit test in `tests/ws2.test.mjs`. | |
| 2.16 | A5 (b) | Not applicable (new switch, contract K2). | `onKey`: B, E, G, V, 1, 2, 3, O, N, D are skipped when `getSettings().letterShortcuts === false`. | Setting off: tool pencil, 1 frame, width m, onion on after E G V N D 3 O. Space plays, ArrowLeft moves, Ctrl+Z works. | The switch itself is WS1's (1.25). |
| 2.17 | A13 points 2, 3, 4; COPY-C-17; DS-07; F15 | From code and the live DOM in the audits. | Stepper buttons named (`frameMenu.hold.less.aria`, `.more.aria`), minus is U+2212, disabled at x1 and x12 (focus moves to the other button when the focused one turns off). The value is a `role="status"` region: the sign is `aria-hidden`, the sentence is an `sr-only` span. The two onion count groups are named by their captions, the size group by its heading (`aria-labelledby`). | Accessibility tree of the stepper: group "החזקה" with button "פחות החזקה" (text U+2212), a `status` holding the sentence, button "יותר החזקה". At x1 "less" is disabled, at x12 "more" is disabled and focus sits on "less". Hold 12 is saved on the frame. Panel groups are named "קודמים (אדום)", "הבאים (כחול)", "גודל הדף"; the same three names in the phone More sheet. | The spoken sentence still has "×" in it; changing it to "פי" is WS6's row (6.33). |
| 2.18 | DS-06 data side | Not applicable (contract K9). | `luminance()` and `data-light="1"` on swatches, recent chips and shade tiles above 0.8. | Present on 7 of the 82 swatches and tiles: `#FFFFFF`, `#FCFAF6` (gray 1), `#FFE2CC` (orange 1), `#FFF6DF` (yellow 1), `#B9FBC4` (green 1), `#B4F7F3` (teal 1), `#E6EFFF` (blue 1). Red 1, purple 1 and pink 1 are at 0.79 to 0.80, just under the contract's line, so they do not get it. | The ring itself is WS6's CSS. If WS6 wants the three tints at 0.79 included, the threshold is one number in `panels.js` (`lightData`). |
| 2.19 | CODE-DEAD | From a grep over `site/` and `tests/`. | Removed `touchIds`, the `{ custom: true }` argument, `lessonTitleFor`; the frame limit in `frameMenu` now comes from `doc.canAdd()`. | 25 unit tests pass. | The import of `lessonText` in `editor.js` line 24 is now unused. I left it: the import block is not in my ownership table and a change there can collide with other branches. One line for the integrator. |

## Readings (where a Tell left a choice)

- **2.8, R12.** The Tell says the over layer is "filled only where the current frame is opaque and the neighbour differs". I fill a subset of that: a neighbour pixel that has the neighbour's own backdrop colour is skipped. The backdrop is the opaque colour that more than half of the neighbour's border pixels have (a bucket-filled page); a drawing on bare paper has none. Reason: with the rule taken literally, every stroke the child draws on a filled page is washed red and blue, because the neighbours have "something different" (their background) under it. With the narrowing the previous frame's mark shows and the child's own marks keep their colour. Where two frames have the same colour nothing is drawn, so a one-colour line drawing is pixel-identical to before. Lines of different colours that cross do get a ghost on top at the crossing; that follows the ruling.
- **2.1, R8.** Beyond the Tell: on paint the fill does not turn fully transparent neighbours into paint (the old ring pass did, so every refill grew one pixel into erased holes), and a soft pixel of the same paint keeps its alpha. Both follow from the tolerance going to 4: pixels the old 32 swallowed are rim pixels now.
- **K4.** `doUndo()` restores a deleted frame only when it is called without a frame (the key, the tool button). The clear-frame toast calls `doUndo(frame)` and must undo that frame.

## Checks on the final code (run again after the stall)

Every repro script was run again on the last commit. Outputs: `out-*-final*.txt` and `out-*-fix.txt` in the scripts folder.

| Check | Result |
|---|---|
| Unit tests (`node --test "tests/*.test.mjs"`) | 25 pass, 0 fail (17 before, 8 new in `tests/ws2.test.mjs`) |
| `r01-fill` | 17 of 17 scenarios without a leak, 0 tinted rim pixels |
| `r02-keys` | 2.4, 2.5, 2.6, 2.16 as in the table |
| `r03-draw` | 2.7, 2.9, 2.10, 2.11, 2.12, 2.14 as in the table. 2.13 second run: pointerup handler 16, 5, 6, 5 ms; fill 41 and 50 ms; move handler max 3.1 ms |
| The tools auditor's own scripts against this build | undo (`t05`): 50 steps, undo all and redo all with 0 differing pixels, 10 fast undo and redo consistent. move (`t07`): as in the audit's "tested and working" list, and an empty frame now gives 0 steps. multi-touch (`t10`): second finger cancels and restores, two fingers together draw nothing, stop on canvas tap adds no ink. pen (`t11`): pressure 0.1, 0.5, 1.0 gives the same three widths, touch inside the grace ignored, touch 900 ms later draws |
| Pen pressure that changes inside one stroke (`r07`) | width 4, 6, 8 px along a 0.1 to 1.0 ramp, no gap |
| Lesson flow with the deferred follow-up (`r06 lesson`) | lesson 1: 6 blanks drawn, Space pressed straight after the last stroke: label already "6/6 צוירו", Play runs, Stop opens "קיבלתם חותמת", stamp recorded. Clear frame plus the toast's undo restores exactly. Clear on a locked frame is refused |
| Coach marks and clear frame in a free project (`r06 free`) | coach 1, 2, 3 appear in order after the strokes. Clear on an empty frame: no step, no toast. Clear on a drawn frame: toast undo restores exactly, thumbnail follows |
| WebKit, Safari engine (`r06 webkit`, Playwright WebKit 1280x800) | pencil edge row uniform, yellow then blue leaves 0 tinted rim pixels, undo plus redo: alpha identical, premultiplied colour off by at most 1.9 of 255 (the audit's known WebKit rounding), Space after clicking the eraser key plays and opens nothing |
| K8 on this branch alone | the width popover opens with `side: this.tools`. With today's `dialog.js` it lands at x 932 to 1272 and still covers the rail (1192 to 1264), as it did before. It moves to the canvas side when WS6's placement is merged. Looked at: usable, all three options visible |
| Horizontal page scroll | none at 320, 390 and 1280 in the Editor, also with the More sheet and the frame menu open |
| Console | 0 errors and 0 page errors in every run, after filtering the one test-setup artifact named below |
| Looked at (screenshots opened) | 1280x800: Editor, frame menu, eraser width popover, resize dialog, lesson 3, onion over yellow backgrounds, rim zoom. 390x844: eraser width sheet, frame menu, lesson 3 More sheet |

Claims that rest on measurement only, not on looking: 2.7 (pen), 2.13 (timings), 2.14, 2.16, and the `data-light` attribute (no visual change until WS6's CSS).

Not checked here, needs real hardware (section 8.3 of the direction): a real pen for 2.7, real phone timings for 2.13, the native colour picker opening on the well's colour (2.12), real Safari.

## New string keys

All in `final-ui-copy.md` section 24.2; `node tools/build-strings.mjs` run, generated files committed.

| Key | Text | Source |
|---|---|---|
| `confirm.resize.body.square` | הציורים יישארו במרכז. מה שמצויר בצדדים, מחוץ לריבוע, ייחתך. אחרי השינוי אי אפשר לחזור צעד אחורה. | given in item 2.2 |
| `confirm.resize.body.wide` | הציורים יישארו במרכז, ובשני הצדדים יתווסף שטח ריק. אחרי השינוי אי אפשר לחזור צעד אחורה. | given in item 2.2 |
| `frameMenu.hold.less.aria` | פחות החזקה | given in item 2.17 |
| `frameMenu.hold.more.aria` | יותר החזקה | given in item 2.17 |
| `tool.eraser.s.aria` | מחק דק, 8 פיקסלים | working draft, pattern of `tool.pencil.s.aria` |
| `tool.eraser.m.aria` | מחק בינוני, 20 פיקסלים | working draft |
| `tool.eraser.l.aria` | מחק עבה, 40 פיקסלים | working draft |

The old `confirm.resize.body` row is no longer used by the code (WS6 or the integrator can remove it).

## Contracts used

| Contract | Where | State on this branch alone |
|---|---|---|
| K2 | `onKey` reads `getSettings().letterShortcuts` | works; the setting is only reachable from code until WS1's switch is merged |
| K3 | `clearFrame()` passes `owner: this` to `toast()` | ignored by today's `toast()`, harmless |
| K4 | `doUndo()`, `afterEdit()`, `refreshUndoButtons()`, also cleared in `requestResize()` | `frameRestore` is never set until WS4 is merged |
| K5 | `clearFrame()` calls `this.lessonMode?.paintPrepared?.(f, this.cur)` | no-op until WS3 is merged: a lesson frame still clears to empty |
| K8 | `toolTap()` passes `side: this.tools` on desktop | see "Checks after the stall" |
| K9 (served) | `data-light="1"` | attribute present, no CSS yet |

## Things noticed outside my area

- `js/pwa.js` (frozen): with service workers blocked by Playwright, `register()` resolves to undefined and the page logs `TypeError: Cannot read properties of undefined (reading 'waiting')` once per load. A test-setup artifact, but a `reg?.waiting` there would keep test consoles clean. My scripts filter this one message and the "registration blocked" warning; nothing else is filtered.
- `editor.js` line 24: the `lessonText` import is unused now (see 2.19).
- A frame deleted and then restored from its toast after a canvas size change used to come back at the old size. `Doc.restoreFrame()` now resizes it, so WS4's restore needs nothing extra.
- WS4: after setting or clearing `editor.frameRestore`, call `this.refreshUndoButtons()` so the undo key lights up (K4).

## Needs from another workstream

- **WS6:** CSS for `[data-light]` (K9) and the `side` placement of K8.
- **WS3:** `lessonMode.paintPrepared(frame, index)` (K5). `lessonMode.afterStroke(i)` is now called one frame after the stroke ends, not inside the pointer-up handler; `flushEdits()` runs it earlier when Space is pressed.
- **WS1:** the Settings switch for `letterShortcuts` (K2). `Autosaver.strokeEnded()` is also called from the new `onCancel` hook of the drawing input.
- **WS4:** `advanceCoach("stroke")` now runs one frame after the stroke ends (same deferral).

## State of this file

DONE. All 19 items are fixed on `fix/ws2`; nothing was pushed, merged or deployed. The stream stalled once (2026-10-01 night) after the code was written and most checks had run; on resume the work was committed and every check was run again on the final code. The server on port 9402 is stopped.
