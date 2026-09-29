## Gatekeeper Review: FlipLoop, Launch Gate (Role 11)

**Date:** 2026-09-29 · **Spawn:** fresh sub-agent · **Read:** gatekeeper-agent.md, 00-context-packet.md, feedback-system.md, 07-developer-notes.md (incl. Revision round 1), 07b-build-manager-note.md, 07c-webkit-check.md, final-site-plan.md / final-ui-copy.md / final-lessons.md (spot-checked against the live build).
**How I looked:** real headless Chrome over CDP (`tools/run.mjs`), live build at http://127.0.0.1:5178/, DOM and app state inspected by script, screenshots at 375x812 (DPR 2, touch) and 1280x800, plus 360px for the open item.

**Status:** APPROVED
**Checklist walkthrough (Round 10):** Quick Check 5/5 (1 and 4 checked on shipped UI strings: 0 em/en dashes in every .js/.css/.html/.webmanifest/.svg under `site/`; voice left to the Page Gate that already passed the copy; 2 specific: yes; 3 would ship: yes; 5 claims: the one factual claim on screen, the Thomas and Johnston 1981 book credit in Settings, traces to the context packet). Live-build Launch Gate paragraph 7/7 applicable (opened and clicked through with real CDP mouse input: yes; links/routes: 13 routes x 2 widths all resolve, including 2 not-found and 1 redirect; forms: the only inputs are the title field, color picker and the Import file input, all exercised; console clean: yes, capture proven by a probe `console.error`; palette/type/layout vs plan: header/wordmark/H1 diffed on 6 screens, tokens not re-read since 07b read 61/61 and this round touched layout only; zero placeholders: yes; live link: http://127.0.0.1:5178/, local only by plan; Unsplash: not applicable, none used). Spec-Diff RTM against the user's brief: 24/24 rows verified live (table below). Build Manager handback: 7/7 gaps confirmed fixed, each at 375 and 1280. Store-readiness, iOS, Rounds 6 to 8: not applicable (no store submission, browser-only). 11-Star Bar: skipped at the Launch Gate by rule (Critic's job).
Perspectives run (Round 11): (a) the 14-year-old first-time user trying to draw, play, and export in one sitting; (b) the Developer who has to fix anything I flag, so each finding names a measurement. Round 12: the only chunk with a hit (Home at 360px) had its other items re-checked separately (card link targets, equal card heights, no clipping, no horizontal scroll): all clean.

### Step 1: self-test (verified)
`await window.__fliploop.selfTest({count:12})` on the live build: **ok: true**, 5.6 s. GIF89a 480x360, 22 frames (ping-pong of 12), NETSCAPE loop 0, delays 4,4,13(hold 3),4... GIF half 240x180 12 frames. Video `video/mp4;codecs=avc1` 480x360, 3.3 s loaded back. PDF A4 (MediaBox 595.28x841.89) / Letter (612x792) / JPEG path, 0 bad xref offsets. PNG 2480x3508, 100 mm card. 0 console entries during the run.

### Step 2: editor brief points, driven by real CDP mouse input at 1280x800 (verified)
- `#/new` creates a project 480x360, 12 fps, loop, 1 frame; redirects to `#/editor/{id}`; document title "FlipLoop · {title}".
- Pencil 3 widths: same 200px stroke inks 274 / 830 / 1427 px (s / m / l). Undo returns to the prior count each time; redo restores (2659).
- Eraser (l) over a line: 2659 -> 1427 px (that line fully removed).
- Fill inside a closed pencil box with red: pixel inside = (226,59,46,255) = #E23B2E, pixel outside untouched (alpha 0), +5795 px.
- 12 swatches + "צבע אחר" `<input type=color>`: setting #123456 sets the brush color (a 13th "recent" dot appears, planned).
- Move tool: drag of 60 px page = 40 canvas px; drawing bbox [20,34,195,275] -> [60,74,235,315].
- Onion skin: on frame 2 the onion layer holds 1232 red px (frame 1), on frame 1 1231 blue px (frame 2), alpha 77/255 (0.3) at distance 1; toggle off -> 0 px; prev 0 -> 0 px; UI has 0/1/2 segments for each direction and the toggle. Seen in screenshot: faint blue line under the black one.
- Undo 50 per frame: 55 real strokes on one frame, exactly 50 undos available, 5 strokes' ink left.
- Duplicate (identical pixels), hold x4 (strip badge "2 ×4"), delete (count 3 -> 2), reorder by real long-press drag in the strip (ids [1c59,22e6] -> [22e6,1c59]), add up to exactly 120 then "+" disabled.
- Playback: 6/12/24 buttons (aria-pressed follows), loop/ping-pong toggle (label "הלוך ושוב", sequence 0,1,2,3,4,3,2,1). First Play (flag reset): onion layer opacity 0 for the whole run, gate label advances 1/120 -> 19/120 in 2 s at 12 fps with the hold, "הציור שלכם הפך לסרט." line shown; Stop restores onion 1, aria "הפעלה (רווח)", `firstPlaySeen` saved.
- `node tests/core.test.mjs`: 15/15 pass.

### Step 3: canvas size, exports, gallery (verified)
- Square option: "גודל הדף" segment "4:3 / ריבוע" (aria "רחב, 480 על 360" / "ריבוע, 360 על 360"); on a blank project it resizes doc and canvas to 360x360 with no dialog.
- Export overlay at 375 (wide project): labels "מלא (480×360)" and "חצי (240×180), קובץ קטן יותר"; the size sits in a `.num` span `dir=ltr`, `unicode-bidi: isolate`, and glyph positions run 4 (x 201) to 0 (x 259), left to right. **Gap 2 fixed** (screenshot `gk/export-375.png`). Cards in order GIF, וידאו, גיליון הדפסה, קובץ פרויקט.
- Project file: `projectToJson` of the 120-frame project (786 KB) wrapped in the shipped `fliploop-project` v1 format and fed to the Gallery's real `<input type=file>` (CDP `DOM.setFileInputFiles`): toast "יובא: ... (עותק) / הפרויקט כבר היה כאן, אז יובא כעותק"; the imported project has 120 frames, 480 wide, 6 fps, ping-pong. The UI "להוריד קובץ" button reported its toast; headless Chrome did not write the file to disk this session, so the byte-level download was taken from the Developer's saved files, not re-observed.
- Gallery card: open link `#/editor/{id}`, options sheet "לפתוח / לשכפל / לשנות שם / להוריד קובץ פרויקט / למחוק"; "לשכפל" makes a 120-frame copy (10 -> 11 projects), toast "נוצר עותק: ...".

### Step 4: lessons, challenge, print, the 7 handback gaps, console (verified)

**Build Manager's 7 gaps (07b), rechecked live:**

| # | Gap | 375x812 | 1280x800 | Result |
|---|---|---|---|---|
| 1 | Home challenge card wraps | both cards 164x72.7, title 27.2px tall (one line) | 202x72.7 | Fixed (`gk/home-375.png`, `gk/home-1280.png`) |
| 2 | GIF size labels reversed | "מלא (480×360)", LTR isolate, glyph order 4 to 0 left to right | same component | Fixed (`gk/export-375.png`) |
| 3 | Goal clipped on hint lessons | `goal-strip--hints`, 2 rows (68px); goal client = scroll: L2 259, L6 258, L7 260, L10 252; L1 204 and L9 202 stay one row (40px); no page overflow (scrollHeight 812) | L2 strip 40px, one row | Fixed (`gk/lesson2-375.png`, `gk/lesson2-1280.png`) |
| 4 | Blank-cell marker invisible | `.cell--blank::after` dashed on every blank cell (L2 pattern KBBBBBKBBK), seen in the screenshot | 7 dashed cells seen | Fixed |
| 5 | Editor title field 107px | title input client 153 = scroll 153 ("אנימציה חדשה 29.9" fully visible); Export 44px icon-only with aria "ייצוא: GIF, וידאו, הדפסה או קובץ פרויקט" | Export 91px with label | Fixed (`gk/ed-375.png`, `gk/ed-1280.png`) |
| 6 | Print header drift | `site-header--screen` 56px, Back top 6 / 44 tall, wordmark Playpen 25px, H1 top 80 = Lessons, Challenge, Settings | wordmark present | Fixed (`gk/print-1280.png`) |
| 7 | Print not-found Back loop | Back "לגלריה", aria "חזרה לעבודות שלי", href `#/gallery`, title "FlipLoop · לא נמצא" | same | Fixed |

**Lessons:** 12 stations, "0/12 הושלמו"-style subtitle with the number isolated, 12 detail pages: each has exactly 2 sentences of explanation, a mini example canvas that changes between samples (animating), and an exercise line with partial frames ("8 פריימים, 2 מוכנים", "10 פריימים, 3 מוכנים", "8 פריימים עם ציור בסיס"...). Starting the exercise opens a lesson project with locked key frames (lock chip on canvas and key cells) and "0/7 צוירו".
**Challenge:** "חללית ממריאה, שבוע 39 · נשארו 5 ימים" on 2026-09-29. `weekInfo` from the fixed epoch Sunday 2026-01-04: week index 38 -> theme[38] of 52 = "חללית ממריאה" (the same value the Home card shows); on 2026-10-05 it moves to week 40, theme 39. Deterministic, no network.
**Print:** real click on "להוריד PDF" for the 120-frame project produced an `application/pdf` blob of 1,692,034 bytes, toast "ה-PDF ירד: 16 גיליונות", summary "123 כרטיסים · 16 גיליונות" (hold x4 expands to 123 cards). Staple margin, 2 dots, numbers and dashed cut lines visible in the preview.
**Console and resources:** fresh load of Home, `#/new` (editor), `#/lessons`, `#/lesson/3`, `#/lesson/12`, `#/challenge`, `#/gallery`, `#/settings`, `#/print/{id}`, `#/editor/{id}/export`, `#/print/nope`, `#/editor/nope`, `#/zzz` at 375 and at 1280: **0 console entries, 0 exceptions, 0 failed resources (resource `responseStatus` >= 400), the app's own `fliploop-errors` ring buffer stayed empty, no horizontal overflow.** The flows above (drawing, 55-stroke undo, Play, import, duplicate, PDF) also left 0 entries. Log capture proven by a probe `console.error`.
**Title/H1:** `<title>FlipLoop</title>`, Home H1 "FlipLoop"; every other screen "FlipLoop · {screen}".
**Home:** light table with peg bar, pencil, 8-frame flipbook that flips by itself (8 of 8 frame groups seen in 3 s), and the 3 buttons: "אנימציה חדשה" `#/new`, "שיעורים" `#/lessons`, "האתגר של השבוע" `#/challenge`.

### Spec-Diff RTM, the user's brief (24/24 verified live)
Title/H1 FlipLoop ✔ · 480x360 default ✔ · square option ✔ · onion red prev / blue next ✔ · 0 to 2 each way ✔ · onion toggle ✔ · pencil 3 widths ✔ · eraser ✔ · fill ✔ · 12 colors + picker ✔ · undo/redo, 50 per frame ✔ · duplicate ✔ · delete ✔ · reorder by drag ✔ · move drawing ✔ · strip up to 120 ✔ · 6/12/24 fps ✔ · loop / ping-pong ✔ · hold ✔ · 12 lessons, 2 sentences, mini example, partial exercise ✔ · weekly challenge by week number ✔ · gallery duplicate / edit ✔ · GIF, video, PDF/PNG print exports ✔ (self-test plus a UI PDF) · project file export/import ✔ (import through the real file input; see caveat) · Home light table + self-flipping flipbook + 3 buttons ✔ · first Play hides onion and runs the strip ✔.

### What's good
- Every one of the 7 handback items is fixed at both widths, and the fix did not regress the neighbours: one-row goal strips on non-hint lessons, 72.7px cards on desktop, the Lessons header baseline identical on Print.
- The core loop holds up under real mouse input, not only API calls: a 55-stroke run gave exactly 50 undos, a long-press drag reordered frames, and a 120-frame project round-tripped through export and import with its fps, mode and hold intact.
- Clean runtime: 26 fresh route loads plus every flow, 0 console entries, 0 failed requests, empty error ring buffer.

### What needs work (soft notes, not a send-back, per Round 14)
1. **Minor, Developer: Home "האתגר של השבוע" wraps at 360px** (the open item). Measured at 360x780: cards 156px wide, challenge title 54.4px tall (2 lines), both cards grow to 99.9px (equal heights, nothing clipped, no overflow, links correct; screenshot `gk/home-360.png`). It reads as a tidy 2-line label, not a defect, and the spec width is 375. Still worth one line of CSS in a later pass because 360px Android phones are common: for example, under 370px drop the card side padding to 6px and the title icon gap to 2px (4.4px short today), or set `text-wrap: balance` so the break is deliberate. Not blocking.
2. **Caveat, not a finding:** headless Chrome did not write downloads to disk this session (the "להוריד קובץ" click reported its toast; the PDF was confirmed as a 1.69 MB blob at the `createObjectURL` seam). The byte-level validity of the files is covered by the self-test, the Developer's saved files and Build Manager's own parse in 07b. The open items already named in 07 (real phone, Firefox, NVDA, `404.html`, CSP) stay open for the deploy step and the Critic.

### Recommendation
APPROVED. Hand to the Critic for the craft review (07b's note on Playpen Sans Hebrew rendering Hebrew in cursive, for example "ייצוא" and "העבודות שלי", belongs there). Item 1 can ride along with any Critic-driven polish round.
