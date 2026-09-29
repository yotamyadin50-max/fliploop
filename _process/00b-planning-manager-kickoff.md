## Planning Kickoff: FlipLoop

**Date:** 2026-09-28 · **Track:** website, Track B (personal creative tool) · **Upstream:** `_process/00-context-packet.md`

### Idea Manager needed?
No. The user wrote a complete spec: editor tools and limits, 12 named lessons, weekly challenge logic, 3 export formats, storage rules, and the home and editor look, including the selling moment. There is nothing to find. Skipping straight to Researcher.

### Readiness calibration (Round 4)
No earlier build in `O-output/` is a canvas drawing editor with a frame timeline. `28-loop-music-maker` is the closest creative tool, but it has a different core. So this is a genuinely new shape. Site Planner and Web Designer get Coaching-level direction below (what matters, and roughly how). Researcher gets lighter direction because its job shape is familiar. Only its priorities change.

### Direction per role

**Researcher**
- *Situation:* Hebrew RTL, browser-only frame-by-frame animation tool with no server, full working code.
- *Background:* 3 exports (in-browser GIF library, MediaRecorder WebM/MP4, print sheet as PDF or PNG), IndexedDB autosave, a storage-limit warning, pressure-aware pen input, 120 frames on a phone. Web is ON.
- *Assessment:* On this build, the findings that change decisions are technical feasibility findings, not market ones. A competitor teardown still matters (FlipaClip-style mobile animators, the Flipnote lineage, browser tools, all verified live, not assumed). But the plan breaks if the GIF library needs a worker file that fails under a plain static server, or if MP4 recording behaves differently than assumed.
- *Recommendation:* Open the brief with a "Load-bearing for Site Planner / Web Designer" block of at most 3 findings, ranked. It must cover: (1) which GIF encoder works offline from a static folder, with its license and worker needs; (2) MediaRecorder MIME support in Chrome vs Safari, and what `navigator.storage.estimate()` / `persist()` actually return; (3) how the strongest competitor stages the first Play and how it handles onion skin. Also give real flipbook print dimensions and staple-margin conventions, traced to a source. Put everything else in the regular six-part brief below that block. Lesson material has to be original. Cite principle names only, never quote the book.

**Site Planner**
- *Situation:* Track B app, not a site. Brochure default is not a risk here. The Track B structural risk is.
- *Background:* Home (light table, 3 buttons), Editor, Lessons (12), Weekly Challenge, Gallery, export and import flows, storage warning.
- *Assessment:* The key structural question is whether a lesson exercise opens **the same Editor in a "lesson mode"** (prepared frames, locked or ghost frames, a goal strip) or opens a separate screen. That one call decides how much Developer builds twice.
- *Recommendation:* Before any screen is detailed, state these: (a) navigation topology (hub-and-spoke from Home is the likely fit, but weigh at least one alternative first); (b) hash-route deep links (`#/editor/{id}`, `#/lesson/{n}`, `#/challenge`); (c) the project data model at plan level: frames, hold count, fps, loop or ping-pong, canvas size, and the prepared-frame format for exercises; (d) when `storage.persist()` is requested (after the first real save, never on load) and the full wording trigger for the storage warning; (e) the Editor's states: drawing, playing (can you draw while playing? state it), exporting; (f) **timeline direction under RTL**, meaning which side frame 1 sits on and which way the strip runs during playback. Every lesson example and exercise gets its own row, so the plan shows all 12, counted.

**Web Designer**
- *Situation:* Visual system and editor shell for a tool whose selling moment is one transition.
- *Background:* The user set the direction: light table seen from above, film-stock strip, a flipbook on Home that flips by itself. Onion skin is fixed at faint red (previous) and faint blue (next).
- *Assessment:* There are two real risks. Skeuomorphism can bury the canvas: the drawing surface has to stay the calmest, largest thing on screen. The palette can also collide with the onion red and blue.
- *Recommendation:* Write your Concept and Differentiation lines FIRST. Derive the palette fresh for this brief, and keep UI accents clear of the onion hues. Spec the first-Play moment as a real choreography: onion fade, strip motion, timing in ms, and a `prefers-reduced-motion` version. Spec the phone Editor layout at 375px, including where "tools on the side" goes and how the 480x360 canvas scales. State the light/dark stance. Go deep on those checks rather than skimming all of them.

### Decision ownership (Round 9, RACI)
| Shared decision | Responsible | Informed |
|---|---|---|
| Hub order and the order of Home's 3 buttons | Site Planner | Web Designer |
| Primary action per screen (Home: New animation) | Site Planner | Web Designer |
| Mobile Editor reordering (which tools stay visible, which collapse) | Site Planner | Web Designer (visual treatment only) |
| Track B screen mapping, lesson mode vs separate screen | Site Planner | Web Designer |
| Timeline direction in RTL | Site Planner | Web Designer |
| Play-moment motion and timing | Web Designer | Site Planner (states only) |
| Print-sheet layout content (numbering, cut lines, margin) | Site Planner | Web Designer (visual) |

I am Accountable for the combined plan's coherence.

### Live weaknesses to watch on this build (Round 13)
- **Standing, Site Planner (Track B):** treating topology, permission timing, and Editor states as someone else's call. The 6 items above are the check.
- **Standing, Web Designer:** a shallow pass through every checklist, and reusing an earlier build's palette or signature detail (MealMap v1).
- **Standing, Researcher:** the load-bearing technical findings getting buried in an evenly weighted brief.
- **Build-specific:** the plan fails to cohere because RTL flips the timeline in one file and not the other, so frame 1 is on the right in Site Planner's plan and on the left in Web Designer's strip.
- **Build-specific:** the plan fails to cohere because lessons are planned as content pages, and the prepared-frame exercise format never gets a real definition.
- **Build-specific:** the plan fails to cohere because Researcher's GIF, MediaRecorder, and storage findings never reach Site Planner's export flow and warning states (reshaped or vaguely referenced).

### Sequence
Researcher, then Site Planner, then Web Designer. The dependencies are real:
1. Site Planner's export flow and storage-warning states need Researcher's findings (1) and (2). Do not plan exports against assumed formats.
2. Site Planner's print-sheet layout needs Researcher's flipbook dimensions.
3. Web Designer needs Site Planner's settled timeline direction, Editor states, and mobile tool priority before styling the strip or the Play moment.

Closing Check will count screens, lessons, and Editor states directly from the raw lists (Round 12), not from summary lines.
