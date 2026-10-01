# Fix round WS5: exports, print, app shell and hosting

**Branch:** `fix/ws5` · **Worktree:** `.worktrees/ws5` · **Server:** `python -m http.server 9405 --bind 127.0.0.1` from `site/` · **Scripts:** scratchpad `pw2/fix-ws5/` · **Browser:** real Chrome 154.0.8037.92 through Playwright 1.49.1 (`channel: "chrome"`, headless), service workers blocked except in the service worker tests.

Status: IN PROGRESS. This file is appended as items land, so a cut-off run still leaves a true record.

## Baseline (untouched branch, before any change)

| Check | Result |
|---|---|
| `node --test "tests/*.test.mjs"` | 17 pass |
| EX-01, 3 fresh Chrome launches, 12 frames at 12 fps, first and second export (`ex01.mjs`, `an.mjs`) | first export defective 3 of 3 (29, 29, 31 frame changes instead of 36; frame 5 held 500, 667, 700 ms; 70 to 77 samples), second export clean 3 of 3 (36 changes, 90 or 91 samples) |

A copy of the untouched build (`git archive 27a84ea site`) is served from the scratchpad on port 9415 for the fail-first runs; "base" below means that copy.

## Progress log (short; the full table is written at the end)

- 5.1, 5.2, 5.3, 5.12 (L3): `site/js/export/video-export.js` rewritten, new `site/js/export/video-check.js`. Lab (`lab1.mjs`, blank page, fresh Chrome per run): with the warm-up 4 of 4 clean (37 samples = 36 + closing frame, sample lengths 82 to 86 ms); the same module with the warm-up cut to 1 ms: 2 of 3 came back "short" (the new check caught the dropped frames), which proves both the defect and the check. In the real app (`ex01.mjs`, `an.mjs`): 9 of 9 fresh launches clean on the first export (36 changes, 12 of 12 frames), 5 of them with "להקליט וידאו" pressed the instant the cards appear.
- 5.5, 5.6, 5.9, 5.10, 5.12, 5.13, 5.14, 5.16: `overlay.js`, `screens/print.js`, `editor.js openExport()`. `ov.mjs` 38 checks pass, `pr.mjs` 34 checks pass; base reproduces each (`prbase.mjs`, `ov.mjs route twice` on 9415).
- 5.4, 5.7, 5.8, 5.11, 5.23: `gif/encoder.js`, `print/png-density.js` (new), `lib/util.js`; `tests/ws5.test.mjs` (8 tests). The GIF, LZW and file-name tests fail on base and pass here.

## Items

(the per-item table is written below once every item is done)
