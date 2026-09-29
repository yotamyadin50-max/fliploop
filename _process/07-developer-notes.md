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
