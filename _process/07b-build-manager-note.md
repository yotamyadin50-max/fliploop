## Build Coordination Note: FlipLoop

**Date:** 2026-09-28 · **Spawn:** Closing Check (Role 10.5), fresh · **Read:** final-site-plan.md (Parts A, B, C), final-ui-copy.md, final-lessons.md, 04b-build-manager-kickoff.md, 07-developer-notes.md, 07c-webkit-check.md, feedback-system `[all]`.
**How I looked:** real headless Chrome 152 over CDP (`tools/run.mjs`), `document.visibilityState = "visible"`, real screenshots at 375x667 (DPR 2, touch, mobile UA), 375x812 and 1280x800/1000. No hidden-pane problem this session, so every visual claim below rests on a real rendered look, not on computed styles alone.

**Verdict: HANDBACK to Developer, one revision round, 7 items (3 moderate, 4 minor).** Nothing blocks the core loop (draw, add frame, Play, export). All 3 Developer deviations are ACCEPTED. After the fix, Adam re-spawns me for confirmation plus a targeted regression sweep, then Gatekeeper's Launch Gate.

---

### Spec fidelity

- **Tokens:** all 61 paste-ready tokens in Part B read live from `:root` and match value by value (colors, onion colors and alphas, type scale incl. both `clamp()`s, line heights, spacing, radii, easings, durations, strip and tool sizes). Body background `#DAD6CC`, `color-scheme: light only`, Rubik UI stack, Playpen display stack. Fonts load from the Google Fonts `<link>` (Ruling 1): Playpen 700, Rubik 400/500/700 loaded.
- **Home:** redline measured at 375: H1 to subtitle 8, subtitle to table 24, table (343x240) to primary 32, primary 343x56 Lamp with 2px Ink border and pencil icon. Wordmark hidden on Home only. Flipbook at card proportion, -4°, peg bar, pencil, Lamp cheeks, flip-shadow band caught mid-sweep. Drift: the secondary cards are **100px tall, not 72px** (item 1 below).
- **Editor phone (375x667):** top bar 48, canvas stage 343x257 with 8px Glow halo at 70%, tool row 56 with 7 keys at 49x56, strip 72, playback bar 56. Stack order matches the plan's 7 rows. Tool row to strip 0. Strip: frame 1 left, "+" right, counter "n/120" muted-on-film, sprocket holes Desk-filled, edge print numbers, current cell Lamp outline and glow, half-viewport padding so frame 1 sits centered (Ruling 6).
- **Play choreography (live, mid-run screenshot at +700ms, first Play):** icon ▶ to ■, aria "עצירה (רווח)", tools at 0.40 opacity, onion layer 0, canvas glow `rgba(244,182,63,.18) 0 0 0 8px`, gate over the center cell with "3/3" tabular label, cells outside dimmed, the film captured mid pull-down, first-Play line "הציור שלכם הפך לסרט." above the gate. Stop restored onion 1, tools 1, label "הפעלה (רווח)". Motion itself (pull-down timing, 1728 px/s) was not watched as motion; the single frame is consistent with Developer's timing numbers.
- **Editor desktop (1280):** rail right 72px with 48x48 keys, 240px panel left, canvas at 1.5x (720x540; 2x does not fit 900px of free width, correct choice), strip and playback full width, visible "הפעלה" and "לולאה" labels. Swatches 4 per row (Deviation 1, accepted below).
- **Lesson mode:** Ink "שיעור n" chip, goal, "0/n צוירו", hints switch only on hint lessons, lock chip at canvas top-start and on key cells. Drift: goal clipped on hint lessons (item 3), blank-cell marker invisible (item 4).
- **Challenge:** film slate with Lamp/Film clapper band, theme Playpen 39px On-film, "שבוע 39 · נשארו 6 ימים" (matches the plan's worked check for today), primary CTA, dashed empty stamp circle with "הצטרפו לאתגר הראשון שלכם".
- **Lessons:** 12 stations, 64px Glow circles, Playpen numbers, Rubik 15/500 names, "הבא בתור" Lamp pill, dashed path, no overflow (Developer's fix holds, scrollWidth 375).
- **Export overlay:** full-height sheet on phone, 560px dialog on desktop, 4 cards in planned order, GIF primary, others secondary. Drift: size labels reversed by bidi (item 2).
- **Print:** A4/Letter segment, summary with plural keys, "להוריד PDF" primary, "להדפיס" and "להוריד PNG" secondary (Ruling 2), helper lines. Printed sheet (PNG, looked at directly): staple margin left, shaded, 2 dots, upright margin numbers, dashed shared cut lines, 2x4 grid, 2-line footer.
- **Gallery / Settings:** W1 banner (Warn bg, rim, shield, secondary button, 44px dismiss), actions in 2 rows on phone, project card with sprocket band. Settings storage meter, protected "לא" with icon, 3 Glow cards.

### Copy-to-layout fit

Verbatim check, done by a different method from Developer's generator (Round 12): I collected every Hebrew cell of `final-ui-copy.md` (425) and `final-lessons.md` (133) and looked each one up among the shipped values: **0 missing**. 52/52 themes equal the paste block and the index table, each within its stated char count. Zero Hebrew literals exist in `site/js` outside `js/data/` (no retyped strings). Lesson names at most 23 chars, goals at most 26 (limits 24 / 28).

Rendered-fit results at 375 (every screen scanned for clipped text and off-viewport boxes, 0 automatic hits; the gaps below were found by looking):
1. **Home Challenge card:** "האתגר של השבוע" wraps to 2 lines. Measured: text 115.6px + 20px icon + 4px gap = 139.6px against 130px of content width (164px card, 16px side padding). Card grows to 100px vs the spec's 72px two-line card. The copy is the plan's own label and correct; the container is what is 10px short.
2. **Export GIF size labels:** copy `מלא ({w}×{h})` ships verbatim but renders **"מלא (360×480)"** and "חצי (240×180)" because the span has no LTR isolate, so the RTL bidi algorithm reverses the two numbers around "×". The copy file's own convention says sizes go inside the `.num` isolate. Wrong information on screen (reads height by width).
3. **Lesson goal strip, hint lessons (2, 6, 7, 10):** the goal is clipped to 114px ("ציירו את הכריעה ו…") because the "רמזים" switch takes the room. Non-hint lessons fit (202px available, lesson 9's 26-char goal fits). The Kickoff limit (28 chars) was set for the strip WITH the hints switch, so the copy honored its constraint; the built layout does not hold it.
4. **Editor top-bar title:** the title field gets 107px, so the default title "אנימציה חדשה 28.9" shows as "אנימציה חד…" and lesson projects as "שיעור 2: ה…". Ellipsis is planned for 40-char titles, but the default title and every lesson title being cut at 375 comes from the "compact" Export button measuring 91x40 (16px side padding plus icon plus label).
- Clean fit, checked: Back labels (all at most 6 chars), save status one word, coach marks one line in the bubble, W1 banner, Challenge slate (widest theme "כדור שלג מתגלגל" 310px in 311px, fits with 1px to spare), longest lesson name as a 2-line station and as a one-line Playpen H1 on Lesson detail, Home theme line (widest 111px of 130), print buttons and helpers, not-found card, Settings.

### Cross-page consistency

Baseline recorded from **Lessons at 375** (Round 14): header `site-header--screen` 56px; Back at top 6px, 44px tall, Rubik 15/500 Ink, chevron `icon--back icon--flip-rtl` pointing right, labeled with its destination; wordmark "FlipLoop" Playpen 25/700 at the far end; H1 Playpen 25px, 24px below the header. Diffed every other built screen against that recording:
- Challenge, Gallery, Settings: identical on every recorded value.
- Lesson detail: identical header; H1 59px down because the planned "שיעור n מתוך 12" line sits above it (planned, not drift).
- Home: wordmark hidden, 2 labeled links instead of Back (planned).
- Editor (all 3 modes) and Editor not-found: compact 48px top bar (planned for the Editor).
- **Print and Print not-found: drift.** They use the Editor-style 48px `topbar--plain` with **no wordmark**, while the spec says only Home hides it (item 6).
- **Print not-found Back:** labeled "לציור" with aria "לציור" (no destination), and it leads to `#/editor/{same missing id}`, which is another not-found screen. Editor not-found correctly uses "לגלריה" (item 7).
- Document titles: "FlipLoop" on Home, "FlipLoop · {screen}" on all 13 routes checked, incl. lesson names, project title in the Editor, "ייצוא", "גיליון הדפסה", "לא נמצא".
- Utility and edge screens included (Round 13): Editor not-found, Print not-found, unknown route `#/zzz` (redirects Home), `#/lesson/99` (redirects to Lessons), cold arrival on `#/editor/{id}/export` and `#/print/{id}`. There is no `404.html`; hash routing means no path-level 404 exists in the build, already an open deploy item in 07.
- Console: 0 errors and 0 logs across 28 route loads (14 routes x 2 widths) plus the draw, Play, delete and lesson flows.

### Asset completion

All required assets are code-generated and present: favicon.svg, favicon.ico, apple-touch-icon 180x180, manifest icons 192x192 and 512x512 (`purpose: "maskable"`, Ink flipbook glyph on Desk, looked at), OG image 1200x630 (Home light table, frame with arm up, no text, looked at), inline SVG icon set, 8-frame Home character, 12 lesson examples as stroke data, starters. Manifest shortcuts: "אנימציה חדשה" → `#/new`, "האתגר של השבוע" → `#/challenge`. Canva and Unsplash: none by plan, so no attribution needed.

### The three Developer deviations: decisions

1. **4 swatches per row in the desktop panel: ACCEPTED.** The spec contradicts itself: 6 per row with 44px hit areas needs 264px, and the 240px panel has 208px inside. Keeping the 44px targets (a WCAG-backed rule in Global Elements) beats keeping the 6x2 shape. Side effect named: at 1280x800 the panel scrolls 129px (canvas size and clear frame sit below the fold inside the panel); at 1000px tall it does not scroll. Acceptable. The contradiction goes to the loop for Web Designer.
2. **Canvas centred in the free height on tall phones: ACCEPTED.** The spec's height math (505px stack) leaves spare height but never says where it goes. Centering is the calmest reading, and the earlier bottom-aligned version left about 300px of empty desk under the top bar. **Correction to Developer's note (Round 12):** the gap is not only "on phones taller than 667": at exactly 375x667 I measured 89px between top bar and canvas and 89px between canvas and tool row, not the redline's 8. That is still the right behaviour; the note just understated where it applies.
3. **Toasts above the film strip: ACCEPTED.** Measured: the delete-undo toast sits at 467 to 531, so it covers the tool row (483 to 539) and ends 8px above the strip. The spec's position (8px above the playback bar) would cover the signature strip, including during Play. Covering the tool row for a 5s undo toast is the smaller cost. The W5 toast stays until "הבנתי" is tapped, so it holds the tool row until then. One tap, shown once per session: acceptable.

### Checklist walkthrough (Round 11)

- **Spec fidelity:** 61/61 tokens live; Home redline 5/6 values (secondary card height off); Editor phone stack 7/7 rows at spec sizes; tool keys 7/7 at 49x56 phone and 48x48 desktop; strip 9/10 sub-items (lesson-blank marker invisible); Play states 8/8 checked in one live frame plus Stop; screens 9/9 plus overlay looked at on phone, 5 on desktop.
- **Copy-to-layout fit:** 425/425 ui cells and 133/133 lesson cells shipped verbatim; 52/52 themes; 12/12 names and goals within limits; rendered fit checked on 13 routes at 375 and 1280 plus 3 lesson editors: 4 misfits (items 1 to 4).
- **Cross-page consistency:** 3 Global Elements (Back control, header/wordmark, document title) recorded from Lessons and diffed on 11 screen states incl. 2 not-found states and 2 redirect routes: 2 drifts (items 6, 7).
- **Asset completion:** 9/9 required assets present, dimensions read from the PNG headers, 3 looked at.
- **Claims reproduced by a different method (Round 12):**
  - GIF validity: I parsed Developer's saved files myself in Node, not through the in-app self-test. `ui-120f-12fps-loop-hold4.gif`: GIF89a, 480x360, 120 frames, NETSCAPE loop 0, total 1025 cs = 123 frame-units x 8.33 cs exactly, hold frame 33 cs. Self-test 24 fps ping-pong: 22 frames, delays 4,4,13,4,4,4…, total 108 cs. Matches.
  - PDF validity: I parsed both 120-frame PDFs myself: `%PDF-` … `%%EOF`, 51 objects, 0 bad xref offsets, 16 pages, MediaBox 595.28x841.89 (A4) and 612x792 (Letter). Matches.
  - Print layout: I looked at the PNG sheet myself rather than trusting the 100.0mm measurement: geometry and footer match Part A.
  - Challenge label, Play states, reduced-motion is NOT re-run, lesson-mode key-frame lock and counts: seen live by me.
  - **Not reproduced (flagged, taken from 07 only):** W2, W2b, W3 stubs; W4 at 100 and 120; W5 via `deviceMemory`; 120-frame persistence; pen pressure ratio; palm rejection; reduced-motion Play stepping; video MP4 duration. Reason: time-boxed to the integration seams. None of them is a copy-to-layout or cross-screen claim, apart from the W4 chip and W3 strip text fit, which I checked against the copy file only, not rendered.
- The 3-second check ran after this walkthrough: spec match yes (with 2 drifts named); copy fits no (4 misfits); consistent across pages mostly (Print drift). Two "no or partial" answers, so this goes back to Developer before the Launch Gate.

### Regression sweep

Not applicable. This is the initial Closing Check.

### Handed back for revision (Developer, one round)

All 7 items are Developer-owned: in each case the copy and the spec are right and the built container or markup is what drifts. None needs Copywriter or Web Designer.

| # | Severity | Interface | Gap | Recommendation |
|---|---|---|---|---|
| 2 | Moderate | Copywriter to Developer | GIF size labels render "360×480" / "240×180" (bidi reversal) | Wrap `{w}×{h}` in the `.num` LTR isolate, as the copy file's placeholder rule says. Grep every other number-symbol-number string (`×`, `/`, `:`) outside the LTR island and isolate it too. |
| 3 | Moderate | Copywriter to Developer | Goal clipped at 375 on hint lessons 2, 6, 7, 10 | Make the goal strip hold a 28-char goal next to the switch. For example: switch without the visible "רמזים" text (keep it as the aria-label), or move the "n/m צוירו" counter under the chip, or let the strip grow to 2 rows on hint lessons only. Verify all 4 hint lessons at 375. |
| 4 | Moderate | Web Designer to Developer | Lesson blank cells show no marker: the inset box-shadow paints under the thumbnail image, and it is solid, not dashed | Draw the 1.5px dashed `--disabled` inner border on a pseudo-element or overlay above the thumbnail. Confirm it by screenshot on lesson 1 (cells 2 to 4 and 6 to 8). |
| 1 | Minor | Copywriter to Developer | Home Challenge card wraps its title, 100px vs 72px | Give the title the 10px it lacks (for example, side padding 12px or icon gap 4px with a 18px icon) so "האתגר של השבוע" stays on one line at 375. Keep both cards the same height. |
| 5 | Minor | Copywriter to Developer | Top-bar title field 107px truncates the default title and lesson titles | Make Export truly compact (8px side padding, or icon only with its aria-label under 400px wide) so the title field gets about 150px or more. |
| 6 | Minor | Global Element drift | Print uses the 48px plain top bar with no wordmark | Use the same `site-header--screen` as Lessons, Challenge, Gallery and Settings (Back "לציור" plus the wordmark). |
| 7 | Minor | Global Element drift | Print not-found Back "לציור" loops to another not-found; aria has no destination | On Print not-found, Back goes to "לגלריה" with `common.back.gallery.aria`, the same as Editor not-found. |

Out of scope for me, passed on for Gatekeeper and Critic (not a handback): Playpen Sans Hebrew renders Hebrew in **cursive script** (for example "ייצוא" draws as "ICI3''"). That is the Web Designer's approved choice and it renders faithfully, and Israeli kids learn to read cursive in school. Still, it is worth a craft look for the youngest readers, since every H1, the Export H2 and the Challenge theme use it.

### For the loop

- Appended to `M-memory/learning-log.md`: number-symbol-number copy (`{w}×{h}`) reverses under RTL unless it is isolated. Checking that strings are verbatim cannot catch this; only a rendered look can.
- For Web Designer: re-derive component arithmetic (count x hit area against panel interior) before writing a fixed grid. "6x2 with 44px hit areas in a 240px panel" could not be built.
- For Kickoff: container limits set at Kickoff (goal 28 chars) need the Developer to build the container that the limit assumed. Name the full row contents (chip, counter, switch) next to the char limit, so the width budget is explicit on both sides.
