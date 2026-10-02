# Fix round 2026-10 · WS4 · Frames, strip, playback, toasts, coach marks

**Branch:** `fix/ws4` · **Worktree:** `.worktrees/ws4` · **Server:** `http://127.0.0.1:9404/` (python http.server from `.worktrees/ws4/site`) · **Browser:** installed Chrome through Playwright 1.49.1, headless, `serviceWorkers: "block"`, `locale: "he-IL"`.
**Scripts:** scratchpad `pw2/fix-ws4/` (`lib.mjs`, `base-*.mjs` = reproduce on the untouched branch, `v-*.mjs` = verify after the fix; every script has a hard timeout). Screenshots: `pw2/fix-ws4/shots/`.
**Binding instructions:** `_process/12-fix-direction.md` sections 0, 1, 2, 3, 5, 6, 7 (WS4), 8. Final verdicts read from `_process/audit/11-verification.md` (F3, F5, F6, A1, J8 all CONFIRMED on the live site; F6 raised to Major; A1 and J8 narrower).

Status of this file: written early and appended as the work goes. A row that still says "pending" is not done.

## Baseline (untouched `fix/ws4` = `27a84ea`): every item failed first

The five `t-*.mjs` scripts print PASS or FAIL per acceptance check. They were run on the untouched branch first (outputs kept as `pw2/fix-ws4/base-*.txt`), then again after the fix (`fix-*.txt`). Real mouse, real keyboard, real touch (CDP `Input.dispatchTouchEvent`).

| Check on the base | Result on the base |
|---|---|
| F3 desktop, frame in the centre gate, 10 drags | 0 of 10 right. The strip scrolled by exactly the drag distance and the lifted frame stayed in the gate (x 640) while the pointer was 90 to 234 px away |
| F3 phone (Pixel 7, touch), right after adding 5 frames with "+" | 1 of 10 right. scrollLeft jumped 288 to 360 at the moment of the lift, in every run |
| F3 edge hold, phone 12 frames and desktop 24 frames | scrollLeft never moved (720 and 1728 for 6.4 s); frame 12 ended at position 9, frame 24 at position 17 |
| F5, 7 delete and undo orders | 5 of 7 wrong, and saved wrong (read back after a reload). Example: delete 3 then 2, undo the older toast first: `1 2 4 3` |
| F6 | 121 frames, counter "121/120", no message |
| F7 D during Play | frame duplicated, player kept running |
| F8 strip click during Play | selection changed, player kept running (reduced and normal motion) |
| F10 at 100, 119, 120 on a 360 px phone | notice off screen at all three scroll positions tried (x 512 to 625 at best), computed `direction: ltr`; N, D and "+" at 120 gave no message |
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
| D-14 | toast covered all 7 tool keys at 390x844 and 375x667 (0 of 7 centres free, toast bottom 48 px below the tool row's top) |
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

One artifact of the test setup, counted apart in every run: with `serviceWorkers: "block"` Playwright's stubbed `register()` resolves `undefined`, and the frozen `js/pwa.js` then throws "Cannot read properties of undefined (reading 'waiting')" once per page load. It is not an app error in a real browser (a real `register()` never resolves `undefined`). Apart from that one line, every run had zero console errors and zero page errors.

The static server is python's `http.server` with a larger listen backlog (`pw2/fix-ws4/serve.py`): the plain `python -m http.server` refused connections under Chrome's parallel module requests about once in ten page loads (`net::ERR_CONNECTION_REFUSED`), which left the app stuck on `#/new`.

## Items

| # | IDs | Reproduced on the base | What changed | Checks, measured | Not done |
|---|---|---|---|---|---|
| 4.1 | F3 (R!) | pending | pending | pending | |
| 4.2 | F5, F6 (R!) | pending | pending | pending | |
| 4.3 | F7 | pending | pending | pending | |
| 4.4 | F8 | pending | pending | pending | |
| 4.5 | F10, J-C1 | pending | pending | pending | |
| 4.6 | F12 | pending | pending | pending | |
| 4.7 | J8 first half (R!) | pending | pending | pending | |
| 4.8 | F14 | pending | pending | pending | |
| 4.9 | F15 | pending | pending | pending | |
| 4.10 | CODE-C11 | pending | pending | pending | |
| 4.11 | CODE-L10 | pending | pending | pending | |
| 4.12 | CODE-C18 first bullet | pending | pending | pending | |
| 4.13 | A1 (R!) | pending | pending | pending | |
| 4.14 | A3 = COPY-C-06 | pending | pending | pending | |
| 4.15 | A4 | pending | pending | pending | |
| 4.16 | A13 (7, 3), COPY-C-12 | pending | pending | pending | |
| 4.17 | D-14 = J9 (b) | pending | pending | pending | |
| 4.18 | D-15 = J-C2 = T-16, LAY-L2 coach, CODE-L1 | pending | pending | pending | |
| 4.19 | D-07 | pending | pending | pending | |
| 4.20 | D-08 = A13 (5) | pending | pending | pending | |
| 4.21 | D-09 | pending | pending | pending | |
| 4.22 | D-10 | pending | pending | pending | |
| 4.23 | DS-01 | pending | pending | pending | |
| 4.24 | D-16, LAY-L6 | pending | pending | pending | |
| 4.25 | CODE-DEAD | pending | pending | pending | |

## New string keys (section 24.4 of `final-ui-copy.md`)

Pending.

## Contracts

Pending.

## Needs from another workstream

Pending.

## Noticed outside my area

Pending.
