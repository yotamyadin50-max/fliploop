## Planning Coordination Note: FlipLoop

**Date:** 2026-09-28 · **Spawn:** Closing Check (Role 5.5), fresh · **Read:** 00-context-packet, 00b-kickoff, 01-researcher-brief, 02-site-planner-plan, 03-web-designer-visual-spec.

**Verdict:** CLEAN WITH RULINGS. No handback. Seven small items are settled below as binding for Developer, Copywriter and Gatekeeper. Where this note conflicts with 02 or 03, this note wins.

### Sequencing check
- **Kickoff to Researcher:** the brief opens with the 3 ranked load-bearing findings the kickoff asked for (GIF encoder, storage, MediaRecorder), plus competitor first-Play and print dimensions. Traced.
- **Researcher to Site Planner:** it shows real divergence first (a bottom tab bar weighed and rejected with a 250px canvas calculation). Research lands as decisions: holds become one GIF frame with a delay; frames are flattened on white; probe order and real-time video with Cancel; empty-Blob fallback to GIF; W1 "not protected" as the normal Safari case, returning after 7 days (the eviction rule); `persist()` after the first save; the project file as a first-class action; undo as rectangle patches under a byte budget (the 4.1 GB arithmetic); no setup dialog (Low/Feel); onion settings in place (Procreate); lesson mode in the same Editor (the Pixnote gap); card geometry from the flipbook sources.
- **Site Planner to Web Designer:** the Home flipbook is drawn at the printed card's 100x60 proportion, the Play choreography styles the planned Playing and Stop states, and the phone stack reproduces the planned 7 rows. Concept and Differentiation come first, with the palette derived against builds 33, 38 and 39.

### Coverage parity
I counted from the raw lists, not the summary lines (Round 12).
- **Screens:** 9 rows in the plan's screen table (8 screens + 1 overlay). 9 matching subsections in the spec, in the same order. No orphans in either direction.
- **Lessons:** 12 table rows, numbered 1 to 12. I re-added K + B frames per row against the stated frame count: 8, 10, 6, 12, 8, 9, 9, 8, 8, 8, 8, 6. All 12 sum correctly. Lesson 1's blanks are B2 to B4 and B6 to B8 = 6, which matches the "3/6 צוירו" sample in both files.
- **Editor:** 7 phone rows and 7 tool-row keys in the plan. The spec has 7 keys at 49px (7 x 49 = 343, which equals the canvas width). Stack height: 48+8+257+8+56+72+56 = 505, as the spec says. There are 7 Editor states. Playing, Stop, Loading, Not found and W2/W3/W4 are all styled. Moving and Exporting inherit the tool and overlay styling, which is acceptable.
- **Packet features, one by one:** canvas 480x360 plus square; onion red/blue, under the drawing, 0 to 2 each way, can be turned off; pencil in 3 widths with smoothing; eraser; fill; 12 swatches + picker; 50-step undo; duplicate, delete, reorder, move; 120-frame strip; 6/12/24 fps; loop and ping-pong; hold; 12 lessons with explanation, example and prepared exercise (ball, flower and stick figure all present); weekly challenge; gallery duplicate/edit; 3 exports; touch, mouse and pen pressure; autosave; storage warning; project import/export; the Home light table with its 3 buttons; the film-stock strip; the Play moment. Result: 25/25 land in both files. The one addition is a real PDF file (Ruling 2).
- **Accepted deviation:** keeping undo at 50 steps for non-current frames depends on the 64 MB budget. The Researcher's memory arithmetic justifies this. Developer states it in the report and does not hide it.

### Contradictions found
I checked the shared decisions directly against each other (Round 8):
- **Strip direction:** both files put frame 1 on the left and "+" on the right, with the film sliding leftward past a fixed center gate and the playback bar as an LTR island. Agree.
- **Onion colors:** red previous (#E0403A) and blue next (#2F6BDB) in both files. The Researcher's note that FlipaClip uses green was correctly not adopted.
- **First Play, one-time vs every time:** there is no conflict. The choreography runs on every Play with 2+ frames (both files). The lamp-flicker flourish runs once, on the first Play ever (spec only). The missing flag is settled in Ruling 4.
- **Nav, CTA, mobile order, lesson mode:** these agree. Home has one primary, New animation, with Lessons and Challenge after it. Play is the Editor's primary. Lesson mode runs inside the same Editor.
- **PDF method:** contradicted by the orchestrator ruling. Both files say print dialog only. Settled in Ruling 2.
- **Fonts:** the spec's vendored woff2 conflicts with the orchestrator ruling. The plan's "Google Fonts, no runtime calls" is internally inconsistent. Settled in Ruling 1.
- **Print margin (numeric, found by re-deriving):** the spec's `@page { margin: 10mm }` leaves 190mm of printable width on A4 (195.9mm on Letter). The plan's grid of 2 cards at 100mm needs 200mm. Settled in Ruling 3.

### Rulings (binding)
1. **Fonts.** Load Playpen Sans Hebrew and Rubik from the Google Fonts stylesheet `<link>` with `display=swap`. No font files go into the project. When offline, the spec's fallback stacks render. "Vendor" in spec lines 44, 68 and 202 now reads "link". Developer's glyph spot-check of the longest lesson name still runs, online.
2. **Print export, 3 paths.** (a) **Download PDF:** a real `.pdf` file built in-browser by an in-house minimal PDF writer. It has one page per sheet at the A4 or Letter point size and embeds that sheet's rendered 300 dpi image. It does not depend on Safari's print scaling. (b) **Download PNG:** per sheet, as already planned. (c) **Print:** `window.print()` with `@page`. Button hierarchy: Download PDF is primary, Print and PNG are secondary, and the per-sheet PNG buttons stay. Copywriter writes the labels. The GIF encoder is in-house (`js/gif/encoder.js`, as the plan already says). The Researcher's gifenc recommendation is superseded, and its behavioral findings (delay per hold, flatten on white, yield per frame) still apply.
3. **Print geometry.** Keep 100x60mm cards, 2 x 4. Set `@page` margins to 10mm top and bottom and 5mm left and right on A4, and 7.9mm left and right on Letter. Adjacent cards share one dashed cut line, so the grid is exactly 200 x 240mm. The PDF writer and the PNG render use the same geometry.
4. **`firstPlaySeen`** joins the `meta.settings` onboarding flags and resets with "הצג שוב טיפים".
5. **Lesson done rule for pre-drawn frames.** In lessons 3, 5, 8 and 11, frames the user must complete already hold P content, so "50+ non-transparent pixels" would pass untouched. For every frame the user must complete, "done" means 50+ pixels that differ from that frame's own rasterized prepared content, which is re-derivable from `lessons.js`. P frames the user must complete carry `lessonRole: "blank"`, with the prepared strokes baked in.
6. **Strip centering.** The strip carries half-viewport leading and trailing padding, so frame 1 and frame N can sit in the center gate.
7. **Drag-reorder look,** which the plan lists and the spec left unstyled: the lifted cell gets `--shadow-lift` and scale 1.05, a 2px Lamp insertion bar marks the drop point, and under reduced motion the cells do not move.

### Specialist strength check
The two load-bearing findings shaped real decisions: storage and eviction (W1 through W3, the undo budget, the placement of the backup action) and MediaRecorder behavior (the export states). None was cherry-picked, reshaped or vaguely referenced. The GIF library choice was overruled on purpose by the orchestrator, not dropped.

### Live-weakness check
- **Site Planner, Track B ownership:** avoided. All 6 decisions come first.
- **Web Designer, shallow pass / palette reuse:** avoided. The Play, the 375px layout and the light/dark stance get a deep pass, and the palette is fresh.
- **Researcher, buried findings:** avoided.
- **RTL timeline split:** avoided.
- **Lessons as content pages:** mostly avoided. The format is defined, and the P-frame edge case is closed by Ruling 5.
- **Research not reaching exports:** avoided.

### Checklist walkthrough
- Sequencing: 3/3 hand-offs traced, with divergence evidence.
- Coverage: 9/9 screens, 12/12 lessons, 25/25 packet features, all re-derived from the raw lists.
- Contradictions: 7/7 shared points checked. Track B screen mapping is applicable and agrees.
- Strength: 3/3 load-bearing findings traced.
- Live weakness: 6/6.
- The 3-second check ran after this walkthrough: 3/3.

### Handed back for revision
None. Proceed to Gatekeeper's Plan Gate with this note attached.

### Decider calls made
Ruling 3: I kept the card size and cut the side margins. The alternative I did not choose was shrinking the cards to fit a 10mm margin. Reason: 100x60mm traces to the Researcher's sources.

### For the loop
Re-derive physical print math (page width minus margins against the grid) whenever one role sets the card sizes and another sets `@page`.
