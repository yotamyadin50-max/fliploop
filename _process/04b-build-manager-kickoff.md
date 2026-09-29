## Build Kickoff: FlipLoop

**Date:** 2026-09-28 · **Spawn:** Kickoff (Role 7) · Part C rulings win on any conflict.

### Copy deliverables and draft order (Tell)

Track B app, so copy ships as exactly two deliverables, not per-screen files:

1. **`ui-copy`** (drafted first): all screens' UI strings, buttons, Back labels, empty states, coach marks, W1 to W5 plus W2b, save status, the export flow (cards, progress, done, error, cancelled, empty video, disabled reason), toasts, Home, Challenge with the fixed 52-theme list, Gallery, Settings, Print (Download PDF primary per Ruling 2), completion sheet, Not found.
2. **`lessons`** (drafted second): 12 × (Hebrew name, 2-sentence explanation, goal line, exercise instructions, hints, done message).

**Why (Cost of Delay over Duration):** `ui-copy` is longer, but its Cost of Delay is far higher: it carries the first 60 seconds (Home, coach marks, first Play), the data-safety warnings, and the vocabulary `lessons` reuses ("פריים", "פריים מוכן", "רמזים", Play and Stop labels, grammatical person). A voice miss caught there costs one revision, not two. `ui-copy` refers to lessons only through placeholders (`{lessonName}`, `{goal}`), so nothing blocks it.

**Both deliverables (Tell):** every string gets a stable key and its screen location, so Developer places it verbatim into `js/data/themes.js`, `js/data/lessons.js` and the UI. Pick one addressing form (the plan's samples use the singular imperative, "צייר", "הוסף") and apply it identically in both. Zero em or en dashes, including in the 52 themes.

### Highest fidelity-risk pages (Tell)

- **Highest Severity: the Editor's persistence layer and the film strip.** Autosave, the W3 save-failed path (a project file built from memory), and the undo budget are the only places a bug destroys a child's drawing. The film strip plus playback bar is the Global Element of every Editor session in all three modes, and it is the signature detail.
- **Highest Occurrence: original work with nothing to copy.** In order: the Play choreography (intermittent pull-down at 6 and 12 fps, continuous 1728px/s scroll at 24, gate, Stop in 280ms, the once-only first-Play flicker); the in-house GIF encoder (median-cut, LZW, NETSCAPE loop, centisecond delay carry: 4, 4, 5 cs at 24 fps, ping-pong 1..N..2); the in-house PDF writer (byte-exact xref offsets, FlateDecode via `CompressionStream`, JPEG fallback, Ruling 3 geometry of 200 × 240mm with 5mm or 7.9mm side margins); pointer input (pressure 0.5x to 1.5x for pen only, palm rejection while a pen is active, second-touch cancel, 300ms long-press reorder against strip scroll).
- **Lowest Detection:** the print PNG and PDF files (only detected by opening the output), the W2, W2b, W3 and W5 states (they never fire in normal testing), 120-frame memory, the reduced-motion variants of Play and Home, cold arrival on `#/editor/{id}/export` and `#/print/{id}`, and the RTL strip under `dir="rtl"` (frame 1 left, "+" right, Hebrew labels inside the LTR island kept `dir="rtl"`).

### Live weaknesses to watch on this build (Tell)

- **Developer, Browser pane visibility.** When `document.visibilityState` is hidden, rAF freezes, screenshots fail and transitions report stale values. This hits Play directly and can make `canvas.captureStream()` record an empty or frozen video. Check visibility before calling it a site bug. Every visual claim about Play, the strip, onion ghosts or the Home flipbook states whether it rests on a real look or on computed styles. Ask the user for a real screenshot of Play mid-run and of the strip.
- **Developer, quiet simplification.** Name it in `07-developer-notes.md`, never silently, if any of these are dropped or approximated: pull-down versus smooth scroll, sprocket holes punched to `--desk`, edge-print numbers, gate scale 1.15 to 1, distance-2 onion blur, the flip-shadow sweep, the drag-reorder lift and Lamp insertion bar (Ruling 7), half-viewport strip padding (Ruling 6).
- **Developer, declaring done because code looks right** (its documented failure pattern). Export validity is exactly where this would repeat: a download that starts is not a valid file.
- **Developer, integration drift.** Self-check each new screen against Global Elements already built: Back labels, top bar, sheets, toasts, W banners, titles.
- **Copywriter, layout drift:** handled by the limits below. **Canva: not live.**

### Asset dependencies (Tell)

No Web Designer asset blocks anything. Developer produces every asset in code, no downloads: the SVG icon set, the 8-frame Home character, manifest icons (192, 512) and the 1200x630 OG PNG from canvas. **Internal dependency:** `lessons.js` stroke data (12 examples, K, P and G frames) must exist before lesson mode, Lesson detail, the Ruling 5 done-check and the Gallery starters can be built. Lesson hints must name guides only where the table has G frames (lessons 2, 6, 7, 10). Fonts come from the Google Fonts `<link>` with `display=swap` and the fallback stacks from Ruling 1. Canvas-drawn Hebrew (print footers) waits for `document.fonts.ready` and sets `direction = "rtl"`.

### Early lock-in risk (Tell)

Containers at 375px; Copywriter writes to them, Developer reports any it cannot hold:
- **Lesson goal strip (40px, one line, beside "3/6 צוירו" and the hints switch):** the name moves to the chip. Goal line at most 28 characters.
- **Station card:** name at most 2 lines of Rubik 15/500. The longest name is at most 24 characters.
- **Themes** (Home card line, Playpen 39px slate, project title): 1 to 3 words, at most 16 characters.
- **Top bar (48px):** Back labels at most 7 characters, status words one word.
- **Coach marks (240px bubble):** one line each.
- **W2 strip (32px):** one line including the percentage.
- **W3 strip:** the plan's sample runs 3 sentences. At 375 it must fit 2 lines beside its button, so tighten it.
- **W5 toast:** at most 2 lines.
- **Export card:** 1 Muted line.

### Developer verification plan (Tell)

Tests run in real Chrome (the claude-in-chrome browser, which avoids the hidden-pane problem), with exports checked in the page as Blobs:
- **GIF:** header `GIF89a`, NETSCAPE2.0 present. Decode with `ImageDecoder` and check frame count and durations against holds, 24 fps carry and ping-pong. Test at full and half size, and at 120 frames.
- **Video:** log the winning MIME type. Blob size above 0; it loads in `<video>`, duration at least 3 s, `videoWidth` 480. Cancel leaves nothing behind. Exercise the empty-Blob path by forcing it.
- **PDF:** file starts with `%PDF-` and ends with `%%EOF`. Every xref offset points at its `n 0 obj`. Page count equals the sheet count. MediaBox is 595.28x841.89 (A4) and 612x792 (Letter). Force the JPEG fallback path too. Open the file in Chrome's PDF viewer for a real look.
- **PNG:** 2480x3508 on A4, checked with `createImageBitmap`. Measure one card at 100x60mm.
- **120 frames under mobile emulation (375x812, touch):** fill 120 frames by script and draw with synthetic pen, touch and mouse `PointerEvent`s, including pressure. Log `performance.memory` and when W5 fires, and run the `deviceMemory` 2-or-less path by override. Measure real play timing at 24 fps. Then reload: all 120 frames persist, W4 shows at 100 and at 120, and the print output is 15 sheets.
- **Failure states, by stubbing:** W2 and W2b (stub `estimate()`), W3 (stub a `QuotaExceededError`, then build the project file from memory).
- **Honestly marked NOT DONE:** Safari (macOS and iOS), a real phone, real pen hardware, Samsung Internet, and any browser not installed. Playwright WebKit would need a download, so it is not used. The Safari-defensive paths (MP4 probe, no `OffscreenCanvas`, Blob-in-IndexedDB) are written but unverified.
