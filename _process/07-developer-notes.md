## Developer Notes: FlipLoop

**Date:** 2026-09-28 · **Spawn:** Developer (Role 10), second run. The first run (stopped about 15:26) wrote most of `site/`, the unit tests and the CDP harness but never verified or logged anything. This run inventoried that code against the plan, fixed what was broken, added a self-test hook, and verified everything in a real (headless) Chrome.

**Stack:** Static HTML/CSS/JS, zero dependencies, ES modules, no build step. In-house GIF encoder, PDF writer and flood fill.
**Files built:** `site/index.html`, `site/manifest.webmanifest`, `site/css/style.css`, `site/assets/` (favicon.svg, favicon.ico, apple-touch-icon.png, icon-192.png, icon-512.png, og-image.png, all code-generated), `site/js/**` (app shell and router; `editor/` doc, stage, drawing, strip, playback, undo, panels, lesson-mode, editor; `export/` overlay, gif-export, video-export; `gif/encoder.js`; `pdf/writer.js`; `print/` geometry, render; `screens/` home, home-art, mini-player, lessons, challenge, gallery, settings, print, common; `store/` db, projects, autosave, storage, settings, project-file, special-projects; `ui/` dialog, toast, coach, warnings, icons; `data/` strings, lesson-copy, lessons, shapes, themes, character; `core/` timing, fill, undo-ledger, challenge; `lib/`), **new this run:** `site/js/dev/selftest.js`. Tests: `tests/core.test.mjs` + `tests/helpers/gif-decode.mjs`. Tools: `tools/cdp.mjs`, `tools/run.mjs` (headless Chrome over CDP, port 9400), `tools/build-strings.mjs`, `tools/asset-gen.html`.
**Live preview:** http://localhost:5178/ (`.claude/launch.json` entry "fliploop", now also in the-system root `.claude/launch.json`). A python server on 5178 was already running from the first run and serves the current files.

### What this run fixed (each found by actually running the app, not by reading)
1. **Colour swatches rendered blank everywhere.** Root cause: the `h()` DOM helper applied `style` objects with `Object.assign(el.style, ...)`, which silently drops CSS custom properties, so `--swatch` never landed. Fixed in `js/lib/dom.js` (custom properties go through `setProperty`). Confirmed visually on desktop after the fix.
2. **Desktop side panel overflowed horizontally** (a scrollbar, and the onion 0/1/2 segments clipped). 6 × 44px swatches cannot fit the panel's 208px interior. Fix: 4 swatches per row in the panel (keeps the 44px hit area), and onion count rows stack label above control. **Deviation:** spec says 6x2 swatch grid on desktop; I chose the 44px hit area over the 6-column shape. The phone sheet keeps 6 per row.
3. **Lessons path overflowed the phone viewport** (scrollWidth 407 at 375; the H1 and intro were cut off). Root cause: the ±48px zigzag offset was on the full-width row. Moved to the 150px station link. Station names also used the handwriting display face; spec says Rubik 15/500, now fixed.
4. **Reduced-motion Play never moved the Lamp outline.** The player called `strip.setCurrent(i)`, which re-derives "current" from the Editor's index (frozen during Play), and CSS hides the current outline during Play anyway. Added `strip.markShowing(i)` plus an `is-showing` style. Measured after fix: outline stepped 1,3,4,5,6,7,8 over 1.7 s at 6 fps, strip transform stayed `none`.
5. **Print screen kept the Editor's document title.** Now "FlipLoop · גיליון הדפסה".
6. **Mobile Editor on a tall phone (812px)** had about 300px of empty desk under the top bar because the canvas was bottom-aligned. Canvas is now vertically centred in the free height. **Deviation:** on phones taller than the 667px design height the canvas-to-tool-row gap grows beyond the redline's 8px.
7. **Editor toasts (W5, delete-undo) covered the film strip**, including during Play. Moved to sit above the strip. **Deviation:** spec says "8px above the playback bar"; that position hides the signature strip.
8. **Gallery:** "לייבא קובץ" wrapped to two lines because the two secondary buttons had unequal widths. Equalised.
9. Harness scratch path updated to this session's scratchpad; `index.html` cache version bumped to `?v=2`.

### Added: scripted self-test hook (for the Playwright WebKit step)
`await window.__fliploop.selfTest(options)` dynamically imports `js/dev/selftest.js` (never loaded unless called) and runs GIF (full and half size), video, PDF A4 (Flate), PDF Letter, PDF with forced JPEG, and a 300 dpi A4 PNG. It returns a JSON report of measured values, not just pass/fail. GIF is checked by walking the block structure (works in any browser) and, where `ImageDecoder` exists, by decoding. Options: `source: "synthetic"|"current"`, `count`, `fps`, `playMode`, `holds`, `video`, `videoFrames`, `download`, `tag`. Nothing in it needs Chromium-only APIs.

### Verification (real headless Chrome 152 via CDP; every number measured)
| Check | Result |
|---|---|
| Unit tests `node tests/core.test.mjs` | 15/15 pass (before and after the fixes) |
| Console errors, all 9 screens + not-found + bad routes, mobile and desktop | 0. The only logged error in the whole session was the intentional `QuotaExceededError` stub in the W3 test |
| GIF, 12 frames, 24 fps, ping-pong, hold ×3 on frame 3 | `GIF89a`, NETSCAPE2.0 loop 0, 22 frames (1..12..2), delays 4,4,13,4,4,4,5… = expected, total 108 cs = expected; ImageDecoder decoded 22 frames, same 108 cs |
| GIF half size | 240x180, 12 frames, delays match |
| GIF 120 frames through the Export overlay UI (12 fps loop, hold ×4) | 120 frames, hold frame 33 cs, others 8/9 cs carry; progress "פריים 60/120"; 1.2 s; 206 KB |
| GIF 120 frames, 24 fps ping-pong (self-test) | 238 frames = 120 + 118, delays match |
| Video, winning MIME | `video/mp4;codecs=avc1` (Chrome picks MP4 first) |
| Video 12 frames (self-test) | 143 KB, loads in `<video>`, duration 3.27 s (plan 3.25 s, 3 cycles), 480x360 |
| Video 120 frames via overlay UI | MP4, 148 KB, duration 10.28 s, 480x360, progress reached "10/10 שניות" |
| Video Cancel after 1.2 s | back to the 4 idle cards, toast "הייצוא בוטל. שום דבר לא נשמר.", no result kept |
| Video empty-Blob path (forced by stubbing MediaRecorder) | error "הדפדפן הזה יצר קובץ וידאו ריק. נסו GIF." with a "להכין GIF" button |
| PDF A4 (Flate) | `%PDF-` … `%%EOF`, every xref offset lands on its `n 0 obj` (0 bad), page count = sheet count, MediaBox 595.28x841.89 |
| PDF Letter | same checks, MediaBox 612x792 |
| PDF forced JPEG fallback | DCTDecode, all structural checks pass |
| PDF from the Print screen, 119 frames + hold ×4 | 16 sheets, 16 pages, 51 objects, 0 bad offsets, 3.1 MB, 3.6 s |
| PNG A4 at 300 dpi | 2480x3508, PNG signature valid; cut lines at x = 58.5 / 1239.5 / 2420.5 px, so one card = 1181 px = **100.0 mm** |
| Print sheet count, 120 frames, no holds | "120 כרטיסים · 15 גיליונות" |
| 120 frames under mobile emulation (375x812, DPR 2, touch, 5 points) | filled by synthetic pen, mouse and touch PointerEvents in 30 s; 0 empty frames |
| Pen pressure | pen at 0.1 vs 1.0: 1406 vs 2844 ink px (ratio 2.02, matches 0.6x to 1.5x); mouse at 0.1 and 1.0: identical 2120 px |
| Palm rejection / second touch | touch right after pen ignored; a second touch mid-stroke cancelled it (541 px back to 0) |
| W4 | at 100: counter "100/120" + "נשארו 20 פריימים"; at 120: "120 פריימים, זה המקסימום", + disabled, a 121st add refused |
| Memory at 120 frames | `performance.memory` 83 MB used; undo ledger 0.63 MB of a 64 MB budget, 0 evictions |
| W5 via `deviceMemory = 2` override | budget became 32 MB, the W5 toast shown on opening the 120-frame project |
| Play at 24 fps (real rAF timing, 3.4 s) | 72 frames shown, median interval 42.0 ms (target 41.7), p10 33 / p90 50 (60 Hz vsync quantisation); stops on the showing frame |
| Ping-pong playback order | observed 1,2,3,2,1,0,1,2,3… (never repeats the ends) |
| Persistence after reload | 120/120 frames back, 0 empty, fps kept, + still disabled |
| W2 (stub estimate 82%) | strip "האחסון במכשיר כמעט מלא (82%)" + "לגלריה" |
| W2b (stub 96%) | "האחסון מלא" dialog on add; frame count unchanged |
| W3 (stub `QuotaExceededError` on every IndexedDB put) | red strip "השמירה נכשלה…", status "נכשל"; "download project file" built from memory: 1.55 MB, schemaVersion 1, 119 frames (saved as `test-exports/w3-from-memory-119f.fliploop.json`); after the stub was removed, the 10 s retry saved, strip hid, status "נשמר" |
| W1 | shown on Home and Gallery (storage not persisted in headless) |
| Project file import | round trip imported as a new id with 119 frames; a bad file raised the import error |
| Lesson 1 end to end | frames KBBBKBBB, + hidden, drawing on a key frame blocked with "זה פריים מוכן. ציירו בפריימים הריקים", progress 6/6, after Play the completion sheet with stamp; `lessonsDone` has 1 |
| Tools | fill stays inside a closed shape; move by (+100,+50) correct, undo/redo correct; dragged off the edge, pixels lost, one undo restored them |
| Frame ops | 300 ms long-press lifted the cell and reorder gave BCA; a plain swipe did not reorder; duplicate, delete, 5 s undo toast restore; hold badge "×3" |
| Challenge | "שבוע 39 · נשארו 6 ימים" on 2026-09-28, matching the plan's worked check (seen in the preview pane) |
| Reduced motion | Home shows 1 of 8 frame groups (still), strip does not move during Play, Lamp outline steps |
| Em or en dashes in site files | 0 |

**Saved exports** (open them directly): `_process/test-exports/`, 7 self-test files (12 frames: GIF, half GIF, MP4, PDF A4, PDF Letter, PDF JPEG, PNG) and 5 from the real UI on the 120-frame project (GIF, MP4, PDF A4 16 sheets, PDF Letter JPEG, sheet 15 PNG), plus the W3 from-memory project file.

**Visual looks this session:** real screenshots (headless, visible page, no hidden-pane problem) of Home desktop, Editor desktop before and after fixes, desktop mid-Play (gate on frame 2 with "2/4", cells dimmed, tools at 40%), mobile Editor at 120 frames, mobile mid-Play, Lessons, Lesson detail, Gallery, Print, the PNG sheet, and the Challenge screen in the preview pane. The Play *motion* itself (pull-down, 1728 px/s scroll, first-Play flicker) was checked by timing numbers and single frames, not watched as motion. **Please glance at Play mid-run and the strip on a real phone and send a screenshot.**

### Quiet simplifications and deviations, named
- The three layout deviations above (4-per-row desktop swatches, centred canvas on tall phones, toasts above the strip).
- Distance-2 onion blur is skipped where canvas `ctx.filter` is unsupported (older Safari); opacity 0.15 still applies.
- Chrome's PNG downloads of all sheets fire one after another with a 350 ms gap; Chrome may ask to allow multiple downloads (the per-sheet buttons are the fallback, as planned).
- The GIF encoder writes each frame in full (no frame-difference optimisation), so files are larger than they could be (206 KB for 120 simple frames).
- Undo steps start as raw pixels and are converted to PNG a moment later; the ledger counts raw bytes until then.
- Not changed, checked present: sprocket holes to `--desk`, edge-print numbers, gate 1.15 to 1, flip-shadow sweep, drag lift + Lamp insertion bar, half-viewport strip padding, `firstPlaySeen` reset by "show tips again".

### NOT DONE (honestly unverified)
- **Safari (macOS and iOS), Playwright WebKit**: not run here (separate step; the self-test hook is ready for it). Safari-defensive paths exist but are unverified: MP4 probe first, `captureStream`/MediaRecorder feature checks disable the video card with a reason, no `OffscreenCanvas`, JPEG fallback when `CompressionStream` is missing, `ctx.filter` guarded, `getCoalescedEvents` guarded.
- Firefox, Edge, Samsung Internet (forced dark-mode inversion): not tested.
- A real phone, real pen hardware (pressure used synthetic events only), a real touch screen.
- WebM path (Chrome picked MP4, so the WebM branch did not run).
- Screen reader spot-check (NVDA) and a full keyboard-only tab-through: not done. Keyboard shortcuts exist, and focus styles are in CSS; not walked.
- `window.print()` output through the real print dialog (the PDF and PNG paths were verified instead).
- Glyph spot-check of Playpen Sans Hebrew on the longest lesson name: rendered in screenshots, not checked glyph by glyph.
- PWA offline/install: out of scope per plan (manifest only, no service worker).

**Buildability gate (Round 36):** retroactive for this run: all W1 to W5 states, not-found, empty and loading states carry concrete copy in `final-ui-copy.md` and are built. Assets are all code-generated and present. Nothing flagged.
**Debugging log (Round 22):** swatches (hypothesis: `--swatch` not set; confirmed by the working `color-dot`, which uses `setProperty`, versus swatches built through `h()`), lessons overflow (per-element bounding-box scan found the translated rows), and reduced-motion stepping (probe showed `is-current` index frozen at 0 during Play). Each was confirmed before the fix and re-measured after.
**Revision discipline (Round 23):** `h()` style handling is shared by all screens; the change only adds custom-property support, and plain properties behave as before (re-checked all screens, 0 errors). Station transform rules had no other users.
**Deployment (written, not executed):** GitHub Pages: push `site/` as the Pages root. Cloudflare Pages: output directory `site`, no build command. Not Vercel Hobby. No deploy was requested.
- **404.html:** not present. The app is hash-routed from one `index.html`, and unknown hash routes redirect to Home. A real 404 page for broken paths is an open item for deploy time.
**Cache-busting:** `?v=2` on style.css and app.js; module imports are unversioned (first deploy).
**Favicon:** favicon.svg, favicon.ico, 180 apple-touch-icon.png present and linked SVG, ICO, apple order; the tab icon was not visually confirmed.
**Form handling:** not applicable (no forms beyond the title field and the Import picker).
**Analytics:** none, by design (no network, nothing leaves the device).
**Security:** no keys and no network calls except Google Fonts (Ruling 1). All user text goes through `textContent`; `innerHTML` only for code-authored SVG. No CSP set (host-dependent, open item at deploy).
**Error/crash reporting:** `window.onerror` / `unhandledrejection` ring buffer (last 20) in localStorage `fliploop-errors`; no visible "report a problem" export (open item).
**RTL QA:** `dir="rtl"` on `<html>`; strip, playback bar and frame keys are an LTR island with frame 1 left and + right (seen in screenshots); undo, redo and back chevrons flip; play/step do not.
**Accessibility, manual pass:** partial (see NOT DONE).
**Cross-browser QA:** Chrome (headless 152) only.
**Checklist walkthrough (Round 21):** Code quality 16/18 applicable (not met: no BEM/`@layer` audit of the inherited CSS; screen-reader-announced validation not applicable). Functional QA 5/9 (console, links/routes, mobile emulation, image dims, meta; not met: real phone, cross-browser, PageSpeed, analytics by design). Launch readiness 9/16 (live link, no placeholders, reduced motion, security, favicon files; not met: WAVE/NVDA, 404.html, CSP, report-a-problem export, Gatekeeper Launch Gate still to come). The 3-second check ran after: it runs (yes), zero placeholders (yes), link exists (yes). A self-review read of this run's diff was done before saving.
**Open Questions:**
- Accept the three layout deviations (desktop swatches 4 per row, centred canvas on tall phones, toasts above the strip)?
- Add a `404.html` and a "report a problem" export before any public deploy?

---

## Revision round 1 (2026-09-28, handback from `07b-build-manager-note.md`)

**Scope:** the 7 items in the Closing Check, plus a codebase sweep for the same bidi bug. Layout and markup only; no copy string was changed (`js/data/` untouched). **How verified:** real headless Chrome over CDP (`tools/run.mjs`, cache disabled, fresh reload per check), 375x812 DPR 2 mobile, 375x667 for the tallest lesson strip, 1280x800 desktop. Screenshots in the session scratchpad (`r1-*.png`), each looked at.

| # | Gap | Fix | Measured after |
|---|---|---|---|
| 2 | GIF size labels read "360×480" (bidi reversal around "×") | `overlay.js`: radio labels go through the existing `richText()` helper, which wraps "480×360" in the `.num` LTR isolate (`dir="ltr"`, `unicode-bidi: isolate`) | Screenshot: "מלא (480×360)", "חצי (240×180), קובץ קטן יותר". DOM: isolate text "480×360" / "240×180", `dir=ltr` |
| 3 | Goal clipped on hint lessons 2, 6, 7, 10 at 375 | New `goal-strip--hints` modifier (set only when the lesson has the hints switch). Under 480px it becomes a 2-row grid: chip + goal on row 1, counter + switch on row 2. Visible "רמזים" label kept. Non-hint lessons and desktop keep the one-row strip | Goal width client = scroll (no clip): L2 259px, L6 258, L7 260, L10 252 (were 114/114/115/107). L1 204 and L9 202, unchanged, one row. Strip 68px on hint lessons at 375. At 375x667, L7: stage still 343x257, tools/strip/playbar at 483/539/611, page scrollHeight 667 (no overflow). Desktop L2: strip 40px, one row, no clip |
| 4 | Lesson blank-cell marker invisible (inset shadow under the canvas thumbnail, solid) | Removed the two inset-shadow rules; `.cell--blank::after` draws a 1.5px dashed `--disabled` border over the thumbnail box (overlay, `pointer-events: none`). The marker stays on a blank cell even when it is current (the Lamp outline sits outside it) | Lesson 1: cells 2, 3, 4, 6, 7, 8 report `::after` dashed `rgb(138,133,123)`; keys 1 and 5 none. Seen in desktop screenshot (all 8 cells) and on phone (cells 2, 3). Chrome snaps 1.5px to 1 device px at DPR 1, 1.5 at DPR 2 |
| 1 | Home "האתגר של השבוע" wraps at 375, card 100px | `.home-card` padding 8px on all sides (was 8/16) and the two title icons 18px (was 20, now matching the meta stamp icon). Here the text measures 119.4px (Rubik loaded), so 16px padding with 12px was still 3.9px short; 8px padding gives 146px of room | Both cards 72.7px tall, title one line (27.2px) at 375; desktop 202x72.7 unchanged look |
| 5 | Editor top-bar title field 107px | Export gets `topbar__export`; under 400px it is icon-only, 44px wide (its existing aria-label "editor.export.aria" names it). 400px and up it keeps the "ייצוא" label (desktop 91px) | Title field 154px (was 107). Default title "אנימציה חדשה 28.9": client 153 = scroll 153, fully visible (screenshot). Lesson titles at 375 still end in an ellipsis by 0 to 14px (e.g. "שיעור 2: הכנה לת…", 166 vs 152); planned ellipsis, 32-char lesson titles cannot fit at 375 |
| 6 | Print used the 48px plain bar, no wordmark | `print.js` now uses the shared `screenHeader()` (Back + wordmark). `screenHeader` gained an optional 4th arg for aria params so Back keeps "חזרה לעריכת {title}" | Print header diffed against the Lessons baseline at 375: `site-header--screen`, 56px, Back top 6 / 44 tall, wordmark "FlipLoop" Playpen 25px, H1 top 80 (Lessons: 80). Desktop 56px with wordmark. Screenshots both widths |
| 7 | Print not-found Back "לציור" looped to another not-found | Not-found uses `screenHeader("#/gallery", "common.back.gallery", "common.back.gallery.aria")`, same as Editor not-found | Back "לגלריה", aria "חזרה לעבודות שלי", href `#/gallery`, wordmark present, title "FlipLoop · לא נמצא" |

**Codebase sweep, number-symbol-number and number-word runs in Hebrew text.** Every string in `js/data/strings.js` with a `{a}×{b}`, `{a}/{b}`, `{a}:{b}` or digit pair was traced to where it renders:
- `×` pairs: only the two GIF size labels (fixed above). `×{hold}` badges sit in the LTR strip island and the `.num` stepper value, single number, correct.
- `/` and `:` between digits do not reverse (the bidi rule for a single separator between two numbers keeps them one run): "4:3", "{n}/120", gate "{n}/{total}", print status "גיליון 1/16", footer drawn on canvas. Left as is.
- **Found the same class of bug, fixed:** three counters mixed a Hebrew word into a whole-element `.num` (`direction: ltr`) span, so the WORD ORDER flipped: "0/6 צוירו" (lesson goal strip), "0/12 הושלמו" (Lessons subtitle), and the export progress lines "פריים 3/120" / "2/5 שניות". Each now renders via `richText()` (only the number is LTR-isolated, the sentence stays RTL). Measured by position: number to the right of "צוירו" and "הושלמו" and "שניות", to the left of "פריים", as Hebrew reads. Settings storage meter ("12 MB / 5 GB · 0%", Latin and digits only) stays one LTR isolate, correct.

**Regression:** `node tests/core.test.mjs` 15/15 pass. `await window.__fliploop.selfTest({count:12})` ok: GIF (22 frames, 108 cs, loop 0), half GIF 240x180, MP4 3.27 s 480x360, PDF A4 and Letter (0 bad xref offsets, right MediaBoxes), PDF JPEG path, PNG 2480x3508 (100 mm card). Console: 0 errors across 22 fresh route loads (11 routes x 2 widths, incl. both not-found states and the export overlay) plus the lesson, export and print checks above (log capture confirmed working with a probe). No horizontal overflow at 375 or 1280. Cache-busting bumped to `?v=3` on style.css and app.js.

**Revision discipline (Round 23):** `screenHeader()` is shared by Lessons, Lesson, Challenge, Gallery, Settings; the new 4th arg is optional and undefined behaves as before (all five re-loaded, 0 errors). `.home-card` and `.btn--compact` are used elsewhere: the padding change is on `.home-card` only (Home only); `.btn--compact` itself is untouched (the icon-only rule targets the new `topbar__export` class). `richText()` existed but had no callers; now used in 4 places. The removed `.cell--blank .cell__thumb` rules had no other users.

**Still open / caveat:** at 360px wide phones the Home cards are 156px, so "האתגר של השבוע" (141px with icon) would wrap again: 137px of room with 8px padding against 141.4px needed. Not in the handback (spec width is 375), named for Build Manager's confirmation pass. The 2-row hint strip grows the goal strip by 28px on phones; at 375x667 it fits with the canvas at full size.

---

## Revision round 2 (Critic) (2026-09-29, from `09-critic-revision-direction.md`, `03c-web-designer-critic-addendum.md`, `05c-copywriter-critic-strings.md`)

**Scope:** F1 to F8 as directed (F9 closed, no change). **How verified:** real headless Chrome over CDP (`tools/run.mjs`, cache disabled, storage wiped with `Storage.clearDataForOrigin`). Drawing, the Critic's F1 path and the steps button used real touch input (`Input.dispatchTouchEvent`). Viewports: 375x667 and 375x812 (DPR 2, touch, mobile UA), 360x740, 1024x768, 1200x800, 1280x800. I opened and looked at every screenshot below (scratchpad `f1-*`, `f2-*`, `f3-*`, `f4-*`, `f6-*`, `f7-*`, `f8-*`).

| # | Fix | Measured after |
|---|---|---|
| F1 | `ui/dialog.js` now keeps a module registry of open sheets and exports `closeAllSheets()`. It closes each sheet through its own `close()`, immediately, so `onClose` runs and a `confirmDialog` resolves `false`. `app.js` `navigate()` calls it first on every hash change, before any teardown, including the Editor ↔ Export update path. The Export overlay is not registered (it is route-bound and closes itself). Second safeguard: `openSheet({ owner })`. While `owner.disposed` is true, a capture-phase guard swallows click/input/change/keydown/pointerdown in that sheet and closes it. Every sheet passes its owner: the Editor's (frame menu, width, colors, more, resize confirm), lesson steps, lesson stamp, and the Gallery's menu, rename and delete confirm. `clearFrame()` also returns early when disposed. Side fix: when storage is full, `createNew()` now shows W2b after the Gallery route lands (`router.afterNavigate`). Otherwise the new close-on-navigate step would have closed it | **Critic repro** with real taps at 375x812 (Home, Gallery, project, "עוד", `history.back()`): `dialog[open]` goes from 1 to **0**, 0 `<dialog>` left in the DOM, route `#/gallery`, no "ניקוי הפריים" button anywhere (`f1-after-back.png`). **Every other sheet** behaves the same (open, Back, 0 open):<br>- colors, pencil width, frame menu, more<br>- resize `confirmDialog`: resolved as cancel, canvas still 480x360<br>- lesson steps sheet<br>- lesson stamp sheet: lesson 1 filled 6/6 by touch, Play, Stop, "קיבלתם חותמת", then Back, Challenge, Gallery, Lessons, 0 open on each<br>- Gallery project menu, rename, delete confirm (project still listed)<br>- W2b through the new after-navigate path: shown on Gallery, closed on the next route<br>**Stale guard:** More sheet open, `disposed = true`, click "ניקוי הפריים": 4775 inked alpha px before and **4775 after**, sheet closed.<br>**Editor → Export → Back:** `#/editor/{id}/export`, then Back returns to `#/editor/{id}` with the editor shown and 0 dialogs. The X-button path gives the same result |
| F2 | Tokens per the addendum: `--font-display` Fredoka, `--font-wordmark` Playpen Sans Hebrew, `--fw-display` 600. Display 600: `.screen-h1`, `.export__h2`, `.export__done-title`, `.slate__theme`, `.station__num`. Wordmark 700: `.wordmark`, `.display`, `.about__name`. Google Fonts link exactly as specified (Playpen 600 dropped) | Loaded faces: Fredoka 600, Playpen 700, Rubik 400/500/700. **Print letterforms in the screenshots:**<br>- "ייצוא" (`f2-export-375.png`, `f2-export-360.png`)<br>- "מתיחה וכיווץ", with a straight final ץ (`f2-lesson1-375.png`)<br>- "ה-GIF מוכן" (`f2-gifdone-375.png`)<br>- "האתגר של השבוע" and the slate "חללית ממריאה" (`f2-challenge-375.png`)<br>- "העבודות שלי" (`f1-after-back.png`)<br>**Wrap check** (height / line-height at 375 and 360): one line each for the 39px slate, the longest lesson H1 (lesson 5, "המשך תנועה ותנועה חופפת"), the Export H2, "ה-GIF מוכן" (26/26), the Lessons, Settings, Gallery, Print and Challenge H1s, and the station digits. No new wrap |
| F3 | `LessonMode` adds a "התרגיל" button (`book` icon + `lesson.exercise.h2`) after the progress. It opens `openSheet({ anchor, owner })` with `ol.steps.lesson-steps__list`, built verbatim from `text.steps`. An `aside.lesson-steps` card goes into `.editor__body` before `.panel`, and the section gets the `editor--lesson` class. CSS exactly per the addendum: 2-row strip under 768, button hidden at 1280+, card grid `72px 1fr 280px 240px`, dims while playing. No auto-open. The sheet list uses the selector `.steps.lesson-steps__list` so the later `.steps` margin rule cannot override it. Side fix found here: `placePopover()` now sets `right/bottom: auto`. Under `dir=rtl` the UA inset pinned every anchored popover to the right edge: the steps popover sat at x 684 while its button was at x 113. It now sits at x 8, under the button | **375x667:** goal strip **66px** on lesson 1 and **68px** on lessons 2/6/7/10. Canvas **343x257** on all five, page scroll 0 (scrollHeight 667), playbar bottom 667, goal text not clipped. **Sheet:** title "התרגיל", 6 items at 15px, body 368/368 (no inner scroll), sheet 420px tall (`f3-steps-sheet-375x667.png`). Esc closes it and focus returns to `.goal__steps`. Back closes it (0 open, route `#/lesson/1`). **1280x800:** button `display:none`; card 280 wide and visible (460 tall on lesson 1, 310 on lesson 7); canvas **600x450**, the same 1.25x step as before (`f3-l7-1280.png`). **1024x768 and 1200x800:** no card, button visible, anchored popover under the button (`f3-l7-1024-popover.png`) |
| F4 | New `showCoach(..., { clearOf })` option: with placement above, the bubble rises until it clears the highest of the given elements. Coaches 2 and 3 pass tools + strip + playbar on phone (strip + playbar on desktop). The rings stay on "+" / Play | **375x812:** coach 2 bottom 620 vs tools top 628; coach 3 bottom 620 vs strip top 684 (`f4-coach2-812.png`, `f4-coach3-812.png`). **375x667:** coach 2 and coach 3 bottom 475, tools top 483, strip top 539. `f4-coach3-667.png` shows the bubble on the lower canvas edge, with no thumbnail and no tool covered |
| F5 | `strip.js`: `counter.hidden = doc.isLesson`, plus CSS `.strip__counter[hidden]{display:none}` because the flex rule was overriding `[hidden]`. The `strip.counter` string is untouched | Counter `display: none` on lessons 1, 2, 6, 7, 10 at 375 and on lessons 1 and 7 at 1280 and 1024. The free editor still shows "1/120" |
| F6 | `.project-card__meta` now uses `padding-block: 4px; padding-inline: var(--s-8)`. Sweeping `style.css` for physical left/right padding or margin on text containers found 4 more, each putting the wide inset on the wrong side in RTL. All converted to logical properties: `.w3-strip`, `.sheet__header` (the title got 8 and the close button 16), `.toast`, and `.coach` (its `[dir=rtl]` override is removed). `.coach--first-play` is logical too (symmetric). Kept physical on purpose: positions inside the LTR film island (`.cell__*`, `.strip__insert`, `.strip__gate*`), the centred sheet handle, and the coach arrow (placed in px by JS) | 1280 Gallery card: meta text sits **9px** in from the card's right edge (1px border + 8), padding 8/8 (`f6-gallery-1280.png`). Sheet header padding: right 16, left 8 (16 on the title side) |
| F7 | Strings `common.back.challenge` "לאתגר" and `common.back.challenge.aria` "חזרה לאתגר של השבוע". The Editor's `backLink()` sends `kind: "challenge"` to `#/challenge` | Challenge editor at 375: label "לאתגר", aria "חזרה לאתגר של השבוע", href `#/challenge`. Tapping it lands on `#/challenge` (`f7-challenge-editor-375.png`). Free projects still show "לגלריה", lessons "לשיעור" |
| F8 | `common.defaultTitle` is now "האנימציה שלי {n}". `projects.js`: `defaultTitle(projects, excludeId)` returns free projects + 1, raised until the title is unique. `createProject()` fills it when no title is given. The Editor computes `fallbackTitle` on mount (excluding itself) for an emptied title field. Lesson and challenge titles are unaffected | On a clean store the first new project is "האנימציה שלי 1" and the second "האנימציה שלי 2" (`f8-title-375.png`). Uniqueness: with `[{free, "האנימציה שלי 2"}]` it gives 3. Rendered width at Rubik 500 16px: "…3" 106px, "…12" 113px, "…123" 123px, all inside the 153px field (client 153). No ellipsis at 375 |

**Copy sync:** updated `final-ui-copy.md`: the `common.back.gallery` note now reads "Back in Editor (free)", plus the two new challenge keys and the new default title. Then `node tools/build-strings.mjs` regenerated `strings.js`. The diff is exactly the 3 changed lines, and `lesson-copy.js` is byte-identical.

**Regression:**
- `node tests/core.test.mjs`: 15/15 pass.
- `selfTest({count:12})`: all ok (gif, gifHalf, video (MP4 3.29 s 480x360), pdfA4, pdfLetter, pdfJpeg, pngA4).
- Console: **0 errors** over 26 fresh loads (13 routes at 375 and 1280, including the export overlay, both not-found states and a bogus route) and over every flow above. Log capture confirmed with a `console.error` probe; `fliploop-errors` is empty.
- No horizontal overflow on any route at either width.
- Cache-busting bumped to `?v=4` on style.css and app.js.

**Revision discipline (Round 23):**
- `openSheet()` has 12 callers. `owner` is optional, and `null` behaves exactly as before.
- `closeAllSheets()` also runs on the Editor ↔ Export update path. This is safe: a modal sheet makes the top bar inert, so no sheet can be open when Export is reached in-app.
- The Router's `afterNavigate` hook has one user.
- `showCoach()`'s `clearOf` is optional. Coach 1 and the first-Play line pass none, so they are unchanged.
- `defaultTitle()` changed signature. Its only callers (`newProjectRecord`, Editor) were updated, and no test used it.

**Found, not fixed (outside F1 to F8):**
- Desktop editor, live window shrink only: a free project's stage fitted at 1280 (720px, 1.5x) stays 720 wide after the window narrows to 1024. A fresh load at 1024 is correct (600x450). I tried `minmax(0, 1fr)` on the grid column, it did not change the result, and I reverted it. The cause is somewhere in the `fitStage` / ResizeObserver path; I did not investigate further this round.
- The Export done state reads "0.00 MB" for a small GIF (under about 5 KB, because it is `toFixed(2)` of MB). Pre-existing, cosmetic.
- At 360px the Home cards still wrap "האתגר של השבוע" (100px cards). Same caveat as Revision round 1: it is the Rubik UI face, which F2 did not touch.

**Checklist walkthrough (Round 21), this round only:** yes to each of these: functional QA of every changed path with real input at the four required viewports, console at 0, screenshots opened, cache-busting bumped, and a self-review read of the diff before saving. Not re-run: cross-browser (Chrome only, as before) and screen reader.

---

## Polish pass (2026-09-29, non-blocking leftovers from Revision round 2 "found, not fixed" and the Critic re-check notes)

**How verified:** real headless Chrome over CDP (`tools/run.mjs`, cache disabled, storage wiped, full reload per check). Viewports 360x740 and 375x667 (mobile, touch), 1024x768/800 and 1280x800, plus live resizes. Screenshots opened (scratchpad `p-*`).

| # | Leftover | Fix | Measured after |
|---|---|---|---|
| 1 | Home "האתגר של השבוע" wraps at 360 | `.home__cards` gap 8px under 375px (`@media (max-width: 374px)`), so each card is 160px: 144px of room for the 141.4px title. 375 and up keep the 16px gap | 360: both cards 160x73, both titles one line (27.2px). 375: 164x73, one line (unchanged). 1280: 202x73 (unchanged). No overflow (`p-home-360.png`) |
| 2 | Desktop stage stays 720 wide after a live 1280 → 1024 shrink | Root cause: the canvas grid track was `1fr` (min = auto = the stage's own 720px), so the region never shrank and the ResizeObserver never fired. Both desktop grids now use `minmax(0, 1fr)` for the canvas column (the 1024+ 3-column one and the 1280+ lesson 4-column one), and `.editor__canvas` gets `min-width: 0`. (The earlier try changed the track only; the item's min-width kept it wide) | Free project live: 1280 720x540 → 1024 **600x450** (column 648) → 1280 720x540 → 1200 720x540 → 1024 600x450. Fresh load at 1024: 600x450. Lesson 7 across the 1280 breakpoint (steps card on/off): 1280 600x450 (4 columns) → 1279 600x450 (3 columns, height-bound, same as a fresh load at 1279) → 1024 600x450 → 1280 600x450. No horizontal overflow at any step (`p-resize-1024.png`) |
| 3 | Small GIF reads "0.00 MB" | New `formatFileSize()` in `lib/util.js`: KB under 1000 KB (min 1), one decimal MB above. `export.done.size` template is now `{size}` with the unit inside the value, the same pattern `settings.storage.meter` already uses ("124 MB / 2.1 GB"). `final-ui-copy.md` row updated, `strings.js` regenerated (1-line diff, `lesson-copy.js` byte-identical). No new copy | Real GIF export of a blank 1-frame project at 375: "1 KB" (`p-gif-done-375.png`). Formatter: 500 B "1 KB", 999 KB "999 KB", 1048575 B "1.0 MB", 1.5 MB "1.4 MB" |
| 4 | Coach 3's arrow points at the tool row, not Play | `coach.js` now sets `--lead` = the gap the `clearOf` lift adds; `.coach--above::before` draws a 2px leader down from the bubble and the `::after` tip moves to its end. When lifted (`coach--lead`), leader and tip are Lamp with a 1px Film edge so they read on both the light tool row and the dark film. Unlifted coaches (coach 1, first-Play) are unchanged (lead 0) | Tip x vs Play centre x: 375x667 89 vs 89.25, 360x740 86 vs 85.5, 1280 498 vs 498.3. Tip lands 4.5px above Play's top on all three (611 vs 615.5, 684 vs 688.5, 744 vs 748.5), the same gap an unlifted arrow has. Bubble position unchanged (still clear of tools and strip). Coach 2 gets the same leader down to "+" (tip 534 vs "+" top 539 at 375). Seen in `p-coach3-375x667.png`, `p-coach3-1280x800.png` |
| 5 | "התרגיל" tap target | Measured first: hit area was **41px** tall, not 44. The `::before` inset is measured from the padding box (inside the 1.5px border), and the editor body painted over its bottom edge. Fix: inset -7.5px -5.5px, and `z-index: 1` on `.goal__steps` | `::before` 45x95 (DPR 1 border snaps to 1px; 44 at 1.5px). elementFromPoint hit extent 45.5 x 95.5 on lessons 1 and 7 at 375, 360 and 1024; a point 5px below and 6px above the visible pill hits the button. No overlap with the hints switch (2.5px gap left). Button still `display:none` at 1280. Look unchanged (`p-lesson7-375.png`) |

**Regression:** `node tests/core.test.mjs` 15/15 pass. `selfTest({count:12})`: gif, gifHalf, video, pdfA4, pdfLetter, pdfJpeg, pngA4 all ok. Console: 0 errors over 33 fresh loads (11 routes incl. export, print, both not-found states, at 360, 375 and 1280) and every check above; capture confirmed with a `console.error` probe. No horizontal overflow on any of them. Cache-busting bumped to `?v=5` on style.css and app.js.

**Revision discipline:** `showCoach()` is used by coaches 1 to 3 and the first-Play line; the leader only appears when `clearOf` actually lifts the bubble. `formatFileSize()` is new with one caller; `formatBytes()` (Settings) untouched. The grid and `.goal__steps` changes are scoped to the editor.


---

## PWA pass (2026-09-30): installable on phone, tablet and desktop, offline after first load, Netlify-ready

**What shipped**

| Area | Change |
|---|---|
| Service worker | New `site/sw.js`, registered from `js/pwa.js` (called by `app.js` after the first screen renders) with a relative URL and scope (`./sw.js`, `./`), so it works at a domain root and under a subpath. Precache: 64 files, 413 KB (every HTML/CSS/JS/icon the app uses; the shell document is cached as `./`). App files are cache-first (`ignoreSearch`, so `?v=6` still hits). Navigations to `/` or `/index.html` get the cached shell. Precache fetches use `cache: "reload"`, so a version holds exactly its own files. Old `fliploop-shell-*` caches are deleted on activate. Non-GET requests and cross-origin requests other than fonts are not touched; IndexedDB never goes through the worker |
| Fonts offline | Google Fonts CSS is stale-while-revalidate; font files (immutable URLs) are cache-first, in a separate `fliploop-fonts` cache that survives updates. At install the worker also warms the CSS plus its Hebrew and Latin woff2 files (6 files), so the first offline launch already has every face, even ones no screen has used yet. The stylesheet `<link>` now carries `crossorigin`, so responses are CORS, not opaque (opaque entries would each count about 7 MB against the storage quota Settings shows) |
| Generated list | New `tools/build-sw-manifest.mjs` walks `site/` and writes the precache list, a 12-char content-hash `VERSION` and the font CSS URL between the `@precache` markers in `sw.js`. It excludes `sw.js`, `_headers`, `og-image.png`, `assets/screenshots/`, `js/dev/` (selfTest is QA-only) and dotfiles. Text files hash with LF endings, so a Windows CRLF checkout and the Linux deploy give the same version. `--check` exits 1 if `sw.js` is stale |
| Update flow | No `skipWaiting` at install. A new version installs in the background and waits; the page shows one toast "יש גרסה חדשה של FlipLoop" with "לרענן" (posts `SKIP_WAITING`, reloads once on `controllerchange`). If ignored, the next launch finds it waiting and, before any input, activates it with one reload. Other open tabs get the same toast when another tab activated a version. The first install never reloads. The installed app re-checks for updates when it returns to the foreground (at most every 30 min) |
| Manifest | Added `id` "./", `orientation` "any", `categories`, `launch_handler` focus-existing; kept name/short_name "FlipLoop", standalone, `lang` he, `dir` rtl, Desk `#DAD6CC` for background and theme. Icons: "any" 192/512 (rounded tile, transparent corners) plus new maskable 192/512 (full-bleed Desk, glyph inside the safe zone: farthest ink 196.5 px from centre vs the 204.8 px 40% circle at 512). All rendered by headless Chrome from `tools/asset-gen.html` (new `?type=maskable`), no downloads. Screenshots from the real app: 2 narrow 780x1688 (Home, lesson Editor) and 2 wide 1280x800 (Home, lesson Editor) in `assets/screenshots/`; labels added to `final-ui-copy.md` §1 |
| iOS | `apple-mobile-web-app-capable`, `mobile-web-app-capable` (avoids Chrome's deprecation warning), status bar `default` (dark text on the light Desk; `black-translucent` would put white text on it), `apple-mobile-web-app-title`, existing `apple-touch-icon`. Safe areas: `.app` pads top/left/right with `env(safe-area-inset-*)` (physical on purpose), the editor height subtracts the top inset, and bottom sheets, the phone Export sheet and toasts respect the side insets; the bottom inset was already handled |
| Install UI | `js/pwa.js` captures `beforeinstallprompt` (suppresses the mini-infobar) and tracks `appinstalled` and display-mode. Home header: an install button at the start of the header, only while the prompt is available (label + icon from 420 px, icon only from 360 to 419, hidden under 360, where Settings still offers it). Settings: new "התקנה" card between Storage and Help with exactly one state line: the button (prompt available), the iPhone/iPad Share hint (iOS, no prompt API), the browser-menu hint (anything else), or "installed" with a check when running standalone. New `install` icon in the set |
| Netlify | `site/_headers`: `/sw.js` and `/manifest.webmanifest` no-cache, the manifest as `application/manifest+json`, `/` and `/index.html` no-cache, `/js/*` and `/css/*` revalidate (names are not content-hashed), `/assets/*` one day then revalidate, plus nosniff, Referrer-Policy and a Permissions-Policy on `/*`. No path gets two Cache-Control rules, since Netlify merges matching rules. `netlify.toml` at the project root: `publish = "site"`, no build command |
| Copy | 13 new keys in `final-ui-copy.md` (§3 `home.nav.install*`, new §21b Install and updates, §22 toast index, §1 four screenshot labels). Buttons infinitive, instructions plural imperative, zero em/en dashes (the builder's dash check passed). `strings.js` regenerated; `lesson-copy.js` and `themes.js` byte-identical |

Cache-busting bumped to `?v=6`.

**How verified** (real headless Chrome 152 over CDP, `tools/run.mjs`, server on 127.0.0.1:5178)

- **Registration and control:** fresh profile, first load: the worker installs and claims the page (no reload), scope `http://127.0.0.1:5178/`, caches `fliploop-shell-<version>` with 64 entries and `fliploop-fonts` with 7 (CSS + 6 woff2).
- **Offline** (`Network.emulateNetworkConditions` offline, confirmed by a failing probe fetch): a reload and a fresh navigation to a new URL both load the app from the worker. Home renders with its CSS; the real fonts load from cache (`document.fonts.load` for Playpen Sans Hebrew 700 Hebrew, Fredoka 600 Hebrew and Latin, Rubik 400/500/700: all "loaded", 0 errors). Editor offline: `#/new` created a project, a real mouse drag (`Input.dispatchMouseEvent`) drew 1829 ink pixels, status "נשמר"; the Export overlay (a lazy `import()`) opened and a real GIF export finished ("ה-GIF מוכן", 2 KB).
- **Installability:** `Page.getInstallabilityErrors` returns `[]`; `Page.getAppManifest` has `errors: []` and parses id, start_url `./#/`, scope, standalone, orientation any, 4 icons, 4 screenshots (2 narrow, 2 wide) and both shortcuts. `beforeinstallprompt` fired, so the Home and Settings buttons appeared; clicking calls `prompt()`, after which the card falls back to the menu hint (or the iPhone hint under an iOS user agent, checked). The installed state was checked by setting `navigator.standalone` (Chrome cannot emulate `display-mode`): the card shows the check line and the Home button hides.
- **Update flow**, with two real version bumps (a comment appended to style.css and rebuilt, reverted afterwards): (a) reload → the new worker waits, the toast appears (screenshot), "לרענן" → one reload onto the new version, the old shell cache deleted, nothing left waiting; (b) bump again, reload (toast ignored), then a fresh launch → it activates before any input with exactly one reload, then stays stable (no further reload 3 s later).
- **Layout:** Home header at 320/360/375/390/420/768: no horizontal overflow, every link on one line (44 px tall). Landscape 844x390 with `Emulation.setSafeAreaInsetsOverride` (47/47 sides, 21 bottom): `.app` padding 0 47px, the playbar keeps its 21 px bottom inset, no overflow. Screenshots opened: Home 360, Settings (prompt, iOS, installed), the update toast, offline Home, offline Export, landscape Editor.
- **Regression:** `node tests/core.test.mjs` 15/15 pass. `selfTest({count:12})`: gif, gifHalf, video, pdfA4, pdfLetter, pdfJpeg, pngA4 all ok. Console: 0 messages over 22 fresh loads (11 routes including both not-found states and a bogus route, at 375 and 1280) and every flow above; capture confirmed with a `console.error` probe; `fliploop-errors` empty. After the final line-ending-only rebuild (version `47279df9a136`), install, control, offline load and installability were re-checked on a fresh profile.

**Tooling note:** `tools/run.mjs` now takes `CDP_PROFILE`. With the profile under the long scratchpad path, Chrome's CacheStorage files pass Windows MAX_PATH and `caches.open()` fails with "Unexpected internal error", so every service worker install goes redundant. Use a short path, e.g. `CDP_PROFILE=C:/Users/yotam/AppData/Local/Temp/flp node tools/run.mjs`.

**Working rule from now on:** after ANY change under `site/`, run `node tools/build-sw-manifest.mjs`. Otherwise `sw.js` stays byte-identical, no update is detected, and installed users keep the old files. `--check` catches it; a Netlify build step (`command = "node tools/build-sw-manifest.mjs --check"`) would enforce it. I left the build command out, as asked.

**Not verified here (needs real devices):** the iOS Add to Home Screen flow and status bar look (no Safari on this machine; Playwright WebKit does not install PWAs), the Android install sheet with the rich screenshots, and a real Netlify deploy of `_headers` (the local Python server ignores it). Chrome also gates `beforeinstallprompt` on engagement, so the Home button may not show on a first short visit; that is expected, and the Settings menu hint covers it.

**Found, not fixed (pre-existing, now more reachable):** on a phone in landscape (844x390) the Editor keeps its 240 px minimum stage width (`fitStage`, mobile branch), so the stage overlaps the tool row by about 7 px (25 px with side insets). `orientation: "any"` makes landscape phones reachable in the installed app, so this deserves a small layout pass (a landscape phone layout, or letting the floor drop when the stage is height-bound). Tablets and desktops are fine.

**Revision discipline:** `siteHeader()` has one caller (Home); it now returns the header with a `dispose()` that Home's `unmount()` calls. `SettingsScreen` gains `renderInstall()` and unsubscribes on unmount. `toast()` is used unchanged (`id`, `persistent`, `action`). The CSS edits are scoped: shell padding (0 when there is no inset), editor height, sheet/export/toast side insets, and the new `.nav-link--install` / `.install__state` rules.

## Landscape pass (2026-09-30): Editor on landscape phones, tablets re-checked

Closes the "found, not fixed" item from the PWA pass (stage over the tool row on a landscape phone).

**What changed**

| Area | Change |
|---|---|
| `fitStage()` (`editor.js`) | Dropped the 240 px minimum stage width on phones and tablets. It only ever acted when the region was height-bound, and then it pushed the stage over the tool row. Now a plain fit: `min(region width, region height x aspect)`. Desktop steps (2x/1.5x/1.25x/1x) unchanged |
| Landscape phone layout (`style.css`) | New block `@media (orientation: landscape) and (max-height: 500px) and (max-width: 1023px)`. `.editor__body` becomes a grid `"rail canvas"`: the tool keys form a compact 44x44 key grid at the start side (3 columns, 3 rows; 2 columns, 4 rows from 400 px tall), the canvas fills the rest height-bound. Strip and playback stay full width below. Playback bar 48 px instead of 56 in this layout (Play is 48, every other control 44) |
| Lessons in landscape | The section becomes a grid; the goal strip moves out of the column into a side card at the end side (width `minmax(168px, 22vw)`): chip + counter on row 1, goal text wrapping, then the "התרגיל" button, then the hints switch. Scrolls inside itself only as a last resort (never needed at the tested sizes) |
| Cache-busting | `?v=7`; `sw.js` regenerated (version `fb7ae3e94ecb`, 64 files) |

Portrait phones, portrait tablets (768/820 wide) and everything 1024+ do not match the new query, so their layout is untouched.

**Measurements** (headless Chrome 152, `tools/run.mjs`, mobile emulation; "insets" = `Emulation.setSafeAreaInsetsOverride` 47 left/right + 21 bottom in landscape, 47 top + 34 bottom in portrait). Each row checked free 4:3, free square, lesson 1, lesson 2 (hints switch) and a challenge project: stage vs tool keys (including the 8 px halo), strip, goal card and top bar never intersect; no horizontal or vertical page scroll; playbar bottom inside the viewport; every tool key on screen.

| Viewport | Insets | Stage 4:3 | Stage square | Tool grid | Goal card (lesson 1 / hints) | Overlaps |
|---|---|---|---|---|---|---|
| 667x375 | no | 242x182 | 182x182 | 140x140 | 152x112 / 152x150 | 0 |
| 667x375 | yes | 214x161 | 161x161 | 140x140 | 152x112 / 152x150 | 0 |
| 740x360 | no | 222x167 | 167x167 | 140x140 | 152x112 / 152x150 | 0 |
| 740x360 | yes | 194x146 | 146x146 | 140x140 | 152x112 / 152x150 | 0 |
| 812x375 | no | 242x182 | 182x182 | 140x140 | 163x112 / 163x150 | 0 |
| 812x375 | yes | 214x161 | 161x161 | 140x140 | 163x112 / 163x150 | 0 |
| 844x390 | no | 262x196 | 197x197 | 140x140 | 170x93 / 170x131 | 0 |
| 844x390 | yes | 234x176 | 176x176 | 140x140 | 170x93 / 170x131 | 0 |
| 926x428 | no | 313x235 | 235x235 | 92x188 | 188x93 / 188x131 | 0 |
| 926x428 | yes | 285x214 | 214x214 | 92x188 | 188x93 / 188x131 | 0 |
| 1024x768 | no | 600x450 | 540x540 | rail 72 | top strip | 0 |
| 768x1024 | no | 736x552 | 736x736 | row 56 | top strip | 0 |
| 1180x820 | no | 720x540 | 540x540 | rail 72 | top strip | 0 |
| 820x1180 | no | 788x591 | 788x788 | row 56 | top strip | 0 |
| 375x667 | no | **343x257** | 343x343 | row 56 | strip 66/68 | 0 |
| 375x812 | no / yes | 343x257 | 343x343 | row 56 | strip 66/68 | 0 |
| 360x740 | no | 328x246 | 328x328 | row 56 | strip 66/68 | 0 |
| 1280x800 | no | 720x540 (lesson 600x450) | 540x540 | rail 72 | strip + steps card | 0 |

Before this pass, 844x390 had the stage 7 px over the tool row (25 px with insets). The portrait and desktop numbers match the earlier notes (343x257 at 375x667; lesson 600x450 at 1280x800). A live rotation (375x812 lesson, then 812x375, then back, no reload) re-fits through the existing ResizeObserver: 242x182 in landscape, 343x257 back in portrait. Screenshots opened: 812x375 and 740x360 hints lesson, 667x375 hints lesson with insets, 926x428 free, 740x360 square with insets.

**Regression:** `node tools/build-sw-manifest.mjs --check` up to date; `node tests/core.test.mjs` 15/15; `selfTest({count:12})` gif, gifHalf, video, pdfA4, pdfLetter, pdfJpeg, pngA4 all ok; console 0 errors over the sweep (capture confirmed with a `console.error` probe), `fliploop-errors` empty.

**Test note:** the test browser's service worker serves the previous precache after a CSS edit until the version changes, and `?v=7` stays in the HTTP cache. Rebuild the manifest, then `Page.reload` with `ignoreCache: true` (or unregister the worker) before measuring. `Network.enable` plus `setCacheDisabled` wedged the runner once; avoid it.

**Seen, not changed:** the first-session coach mark ("ציירו משהו") anchors above the canvas; in landscape it overlaps the top bar area for its few seconds until dismissed. On landscape phones with side insets the film strip and playbar stop at the inset (the `.app` padding from the PWA pass), rather than running edge to edge under the notch; that is safe and readable but a designer may want the film to bleed to the edges.

## Shade palette pass (2026-09-30)

Upstream: `_process/03d-web-designer-palette.md` (spec), `_process/05d-copywriter-palette-strings.md` (strings already in `strings.js`).

| Area | Change |
|---|---|
| `editor/panels.js` | `SHADE_ROWS` pasted verbatim (10 x 7). `colorName()` now returns "כחול 6" for shades, the plain base name for a base cell, "צבע משלי" otherwise. `colorPanel(ed, {context})`: the 12 base swatches, 13th chip and "צבע אחר" unchanged; new "עוד גוונים" toggle. Phone/landscape (`context:"sheet"`): recent row + chart expand in place (`.reveal` 0fr to 1fr, `inert` while collapsed, `aria-expanded`, `settings.shadesOpen` persisted, `sheet--tall`, scrollIntoView after expanding, selected tile scrolled into view when the sheet opens expanded). Desktop (`context:"panel"`): full-width toggle opens the popover. Tiles: `aria-pressed`, `shade.aria` labels (base cell = hue name), `title` = `shade.name`, one roving `tabindex=0`, arrows follow the screen (ArrowLeft = darker under RTL, swapped under LTR), Up/Down rows, Home/End, Ctrl+Home/End, no wrap. Strips are `role=group` with the hue name; the chart is a group "כל הגוונים"; recent row labelled by its caption "בחרתם לאחרונה" |
| `ui/dialog.js` | `openSheet({ side })`: new `placeBeside()` for the desktop popover: `left = panel.right + 8` (RTL) / `panel.left - 8 - w` (LTR), `top = clamp(8, toggle.top - 16, innerHeight - h - 8)`, `right/bottom:auto`. It is still a registered sheet, so the route change's `closeAllSheets()` closes it (Back verified). A side popover returns focus to its toggle |
| `editor/editor.js` | `recentColor` removed. `recentColors` / `shadesOpen` read from settings; `setColor(hex)` uppercases and records every non-base pick (tiles, recent chips, "צבע אחר"); `openShadesPopover()`; colors sheet opens with `sheet--tall` when expanded |
| `store/settings.js` | `recentColors: []` (max 7, newest first, no duplicates) and `shadesOpen: false` in defaults; `rememberColor()`; on load the list is normalized and a legacy single `recentColor` value (if one was ever stored) is folded in and dropped |
| `ui/icons.js` | `chevron` (spec path) |
| `style.css` | Spec CSS (tokens `--shade/--shade-h`, toggle, reveal, strips, base pip, selected ring, hover, focus, landscape two-column 284 + 308 with sticky start column, `.sheet.sheet--tall` (needed the extra class to beat `.sheet`'s 70dvh), popover slide-in from the panel side). Strips use `:first-child/:last-child` because each strip is its own group element |
| `gif/encoder.js` | Median cut now keeps a flat shade exact: a per-bin Boyer-Moore majority vote picks the dominant 24-bit colour, and a box whose top bin is a clear majority uses that exact colour (and maps those pixels straight to it) instead of the box average. Exact-palette path unchanged |
| Cache | `?v=8`, `sw.js` regenerated (193c89fdf674, 64 files) |

**Deviation, flagged:** the desktop popover is 258px, not 256: the popover has a 1px border each side, and at 256 the 7 x 32 strip overflowed the body's 16px padding by 2px. Measured at 258: 16px padding both sides.

**Verified live** (headless Chrome, `tools/run.mjs`, screenshots opened: 375x812 collapsed/expanded/after reload, 360x740, 812x375, 1024x768, 1280x800):
- 375x812: collapsed sheet 228px (276 with the 13th chip, same as before); expanded `sheet--tall` 698px, body scrolls, tiles 44x44, 7 per row, no wrap. 360x740: tiles x 36..344. 812x375 and 640x360: two columns `284px 308px`. Document `scrollWidth` = viewport at every size.
- Picked blue 6 (#0C45AB): sheet closes, color key "הצבע הנוכחי: כחול 6". Drew a rectangle with it, picked blue 7 (#00256F), filled inside: interior #00256F, outline still #0C45AB, outside transparent (no leak between adjacent shades). After reload the frame pixel is still #00256F, recent row = [#00256F, #0C45AB], 13th chip = #00256F. `shadesOpen` survives reload in both states.
- Keyboard (RTL): from row 1 step 1, ArrowLeft x2 then ArrowDown = row 2 step 3 (visually further left); End = step 7; Ctrl+End then Down/Left stays at 10/7; Ctrl+Home = 1/1; exactly one `tabindex=0`.
- Desktop: popover at x = panel.right + 8 (264), 1280x800 top 297 unclamped, 1024x700 clamped to bottom 692; tiles 32x32; focus lands on the pressed tile; pick closes it, focus back on the toggle, panel base grid and 13th chip re-rendered; Esc and X close with focus on the toggle; Back closes both the phone sheet and the popover (0 dialogs left).
- Reduced motion: `.reveal`, `.sheet--tall` and the chevron all resolve to `transition-property: opacity, color, background-color` (global block).
- GIF: 3 frames with 28 adjacent shades (4 rows) plus an anti-aliased stroke and text (forces median cut): decoded shade cells exact (max channel error 0; 5 only where the moving black stroke crossed a sample point). Scratch stress test (70 shades with 2-row soft blends): old encoder worst error 5, new 0.

**Regression:** `node tools/build-sw-manifest.mjs --check` up to date; `node tests/core.test.mjs` 17/17 (2 new: palette structure + neighbours > fill tolerance 32 + `colorName`; median cut keeps 70 shades exact); `selfTest({count:12})` gif, gifHalf, video, pdfA4, pdfLetter, pdfJpeg, pngA4 all ok; console 0 errors over the sweep (capture confirmed with a probe).

**Seen, not changed:** the first-session coach toast ("הוסיפו פריים...") can sit over the lower edge of the desktop popover for its few seconds. The current color is not persisted across reloads (existing behaviour), so after a reload no tile is pressed until a pick.

## Auto-update pass (2026-10-01): a new version applies by itself at a safe moment

**Problem (real user report):** after a deploy the installed app kept showing the old version, and the "יש גרסה חדשה של FlipLoop / לרענן" toast went unnoticed. The waiting worker only activated on a toast tap or on the next cold launch, and an installed phone app is rarely cold-launched. The app also only asked the server for a new version every 30 minutes, and only on returning to the foreground.

**What changed**

| Area | Change |
|---|---|
| `js/pwa.js` (update flow rewritten) | A waiting version is now applied without any user action: `SKIP_WAITING`, one reload, same route. It happens only when ALL hold: page visible, no pointer down, no open `<dialog>` (sheets, confirms, the export overlay in any state), no file picker open, no import / backup / print render running, router idle, and the current screen reports not busy. **Triggers:** arriving on a freshly mounted screen and launching (applied at once, nothing has been started yet); returning to the foreground; a 2 s ticker while an update is pending, which needs a pause without input: 20 s in the Editor (or with a text field focused), 3 s elsewhere |
| Editor safety (`editor.js`, `autosave.js`) | `EditorScreen.isBusy()`: stroke in progress, undo step being written, playback, strip drag, export overlay open or opening, or the autosaver not clean. New `Autosaver.isClean` = nothing dirty, no write in flight, last write succeeded. So a failed save (W3) blocks the automatic reload for as long as it lasts |
| Nothing resets after the reload | Before reloading, the page stores `{hash, scrollY, view}` in sessionStorage (`fliploop-resume`); `app.js` hands `view` to the first screen's `mount()`. Editor restores current frame, tool, colour and both widths (the colour was never persisted, so a silent reload would otherwise have switched it to black and jumped to frame 1). Print restores its ping-pong option. Scroll position is restored, retrying for up to 8 s on a screen that fills in late (print previews) and stopping on any input |
| Eager checks | `reg.update()` on launch, on every return to the foreground, on every screen arrival and from a 60 s timer, all throttled to at most once per 5 minutes and only while visible (was: 30 minutes, foreground only). An app left open on any screen gets a deploy within about 5 to 6 minutes |
| Toast, the fallback | Same strings, no new copy. It now appears only when no safe moment came within 30 s (continuous drawing, a long export), or at once when the loop guard has already used its one automatic reload. It stays until tapped. "לרענן" now saves first (`flush()`), then reloads; if the save fails it does not reload and the toast comes back |
| Loop guard | sessionStorage `fliploop-auto-update` holds the version this session already reloaded for automatically. The version is asked from the waiting worker itself (`GET_VERSION`). Same version still waiting after that reload: no second automatic reload, only the toast. No sessionStorage: no automatic reload at all |
| Other tabs | A tab whose controller changed without asking (another tab applied the update) is treated the same way: it reloads itself at its own next safe moment, toast as fallback (was: toast only) |
| Router (`app.js`) | `router.busy` (navigations queued or running) and a `route` bus event after a real screen mount (not on the export overlay opening or closing inside the Editor) |
| New `js/lib/busy.js` | `busyWhile(fn)` / `isHeld()`. Wraps project import, backup download, and the Print screen's preview render, PDF, PNG and print jobs |
| Cache | `?v=9`; `sw.js` regenerated: version `5eb0a919ffdf`, 65 files |

`sw.js` logic is unchanged (still no `skipWaiting` at install). No Hebrew string added or changed; `final-ui-copy.md` untouched.

**How verified** (real headless Chrome over CDP, `tools/run.mjs`, profile `C:/cdpfl4`, server 127.0.0.1:5178; 16 real version bumps, each a comment appended to `style.css` plus `node tools/build-sw-manifest.mjs`; `style.css` restored byte for byte at the end, `git status` clean for it). Page loads were counted with a script injected on every new document; drawing was done with real mouse events (`Input.dispatchMouseEvent`); "ink" = non-transparent pixels per frame.

| Case | Result |
|---|---|
| (a) App left open on Home | Loaded 20:38:11, deploy at 20:38:24, no input. It reloaded itself at 20:43:16 (the 5 minute check window) onto the new version: exactly 1 reload, still 1 after 75 s more, old shell cache deleted, nothing waiting, no toast |
| (b) Editor, stroke in progress | Update found with the mouse button held mid-stroke: 26 s later still no reload. Released: saved, clean, but at +12 s still no reload (not idle long enough). Reloaded at +22 s. Same route `#/editor/<id>`, ink `[732, 2722]` before and after, still on frame 2 of 2, blue, width L |
| (c) During an export | Update arrived 1 s into a 24 s video recording: at second 23 still recording, no reload. Export finished (MP4, 25,798 B); 25 s later with the result still on screen, no reload. Overlay closed by a real click: reloaded 22 s later on the Editor route, 12 frames intact |
| (d) Toast fallback | 11 strokes over 65 s: no reload, toast appeared at 30 s and was still there 33 s later. Tapped "לרענן": reloaded 95 ms later, new version, ink identical, same frame |
| Save failing (injected IndexedDB error) | 36 s idle with an unsaved stroke: no reload. Toast tapped: no reload, toast back, W3 showing. Storage restored: retry saved, then it reloaded by itself; the stroke was there after the reload |
| Leaving the Editor while dirty | Back to Gallery: saved on unmount, reloaded on arrival, 1 reload, drawing intact when reopened |
| Loop guard | Version pre-marked as already used: 14 s idle on Home, no reload, toast shown within 3 s. New session with the version still waiting: exactly one reload at launch, then stable |
| Background and foreground (window really minimised, `visibilityState` hidden) | Hidden 12 s with a version waiting: no reload; shown again: reloaded at once. Full flow: hidden 5.5 minutes, deploy in the meantime, no check while hidden; on return it checked, installed and reloaded within 2.2 s, no manual step |
| Two tabs | The visible tab applied the update; the hidden tab went stale, showed the toast, and reloaded itself once when brought to the front |
| File picker | Chooser open 10 to 14 s on Gallery: no reload. Cancelled: applied. File chosen: the import finished first (2 projects), then the reload, both projects still there |
| Print | Ping-pong option kept; scroll 3000 came back as 2956 while previews were still filling in |
| Upgrade from the committed build (`193c89fdf674`, old `pwa.js`), on a scratch copy served at :5179 | Old client: toast at the next launch, new code on the launch after that. From then on a bump applied by itself |
| First visit, fresh origin | Worker installs and takes control with no reload, no toast |

**Regression:** `node tools/build-sw-manifest.mjs --check` up to date (`5eb0a919ffdf`, 65 files); `node tests/core.test.mjs` 17/17; `selfTest({count:12})` gif, gifHalf, video, pdfA4, pdfLetter, pdfJpeg, pngA4 all ok; console 0 messages over 22 fresh loads (11 routes including the export overlay, not-found Editor and a bogus route, at 1280 and 375) and over every case above except the deliberately injected save failure; capture confirmed with a `console.error` probe; `fliploop-errors` empty; no horizontal overflow on any route.

**Found while testing, fixed:** the first version refused to update while any text field had focus. Drawing leaves the Editor title field focused (the canvas calls `preventDefault` on pointerdown), so one title edit would have blocked the update for the whole session. A focused field now only asks for the longer 20 s pause; re-tested.

**Known limits, stated plainly**
- **Devices already on the old build need one last old-style update.** Their `pwa.js` is the old one. They get this fix by tapping "לרענן" once, or by fully closing and reopening the app (twice at most: once to fetch, once to switch). Everything after that is automatic. Nothing on the server side can safely force it without risking unsaved work on those devices.
- **Undo history does not survive the reload** (it lives in memory). The drawing, frame, tool, colour and widths do. This is why the Editor waits for 20 s without input.
- **Not tested on a real phone.** All of the above is desktop headless Chrome. The Android installed app and iOS Safari (home screen app) should behave the same, since only standard APIs are used (`visibilitychange`, `sessionStorage`, `registration.update()`), but that is an expectation, not a measurement.
- The scroll position on a long Print page comes back approximately, not to the pixel.
- The context line for `update.ready` in `final-ui-copy.md` §21b still reads as if the toast always shows; the string itself is unchanged, so I left the file alone.
- Seen, not changed: on one first visit the worker was still "installing" after 6 s (a second try took 0.8 s). Probably the Google Fonts warm-up, which the install waits for; cause not confirmed. No effect on updates.

**Revision discipline:** `registerServiceWorker()` has one caller (`app.js`), now passing four callbacks. `screen.mount(params, view)` gained a second argument used by Editor and Print only; other screens ignore it. `toast()`, `dialog.js` and `sw.js` logic are unchanged. `swVersion()` keeps its signature. Nothing was committed, pushed or deployed.
