## Revision log (Plan Gate round 1)

Site Planner, revision spawn, per `04-plan-revision-direction.md`. Flagged spans only; no replan. Every sample value in the touched sections was re-derived from its own source line.

- **Finding 1 (memory warning):** added row **W5 Memory tight** to the warning table (trigger: first undo-budget eviction in a session, or `deviceMemory` 2 or less at 60 frames; one-time non-blocking Editor toast; "הבנתי" close) plus a line naming storage (W1 to W4) and memory (W5) as separate cases. The Undo rule now says the first eviction raises W5; Editor States and the Copywriter asset line now include W5. Packet trace for "storage/memory approaches its limit" is now met, so 25/25. Web Designer still owes the W5 styling line in 03's Banners.
- **Finding 2 (canvas tap):** Stop rule now reads "Space and Play toggle playback. A canvas tap only stops it; in Ready it draws." It matches the Playing row of the state table.
- **Finding 3 (Challenge):** theme index = `((weekIndex mod 52) + 52) mod 52`; `challengeWeek` stores the 0-based `weekIndex`; label = `weekIndex + 1`; days left = 7 minus days since Sunday (today counts, Saturday shows "יום אחרון"); a clock before the epoch drops the week number. Worked check added (2026-09-28: 267 days, weekIndex 38, label 39, 6 days left); sample fixed to "שבוע 39 · נשארו 6 ימים".
- **Finding 4a (exercise line):** formula "{total} פריימים, {K count} מוכנים" read from the lessons table; K count 0 (lessons 5, 8) shows "{total} פריימים עם ציור בסיס". Sample re-derived from lesson 1: "8 פריימים, 2 מוכנים".
- **Finding 4b (starters):** a starter builds a `kind: "free"` project from the lesson's example stroke data in `lessons.js`, all frames unlocked, at the lesson's fps and play mode; never a user's own attempt.
- **Finding 4c (duplicate):** a lesson or challenge project duplicates as a `kind: "free"` copy with all frames unlocked, same as "הפוך לפרויקט שלי"; the original stays the single lesson (or week) project. A free project duplicates as free.
- **Soft note (OG image):** Open Graph now names one 1200x630 PNG of the light table.
- **Soft note (icons):** manifest icons 192x192 and 512x512 px PNG, `purpose: "maskable"`.
- **Soft note (PDF encoding):** recorded as a stated default the Developer may change: Flate-compressed RGB (`FlateDecode` via `CompressionStream("deflate")`), falling back to JPEG (`DCTDecode`, quality 0.92). Tied to 03b Ruling 2's PDF writer.
- **Soft note (Lesson 12):** "plus an optional face on any blank frame (not checked by Done)".
- **Left as is (per direction):** Challenge editor Back to the Gallery.

### Web Designer

Web Designer, revision spawn, per `04-plan-revision-direction.md`. Assigned spans in `03-web-designer-visual-spec.md` only; Informed on W5, not a decider.

- **Finding 1 (W5 styling):** Component Look, Banners line now ends "W5: standard Film toast, Warn-chip icon, no timer bar; stays until its 44px "הבנתי" close is tapped." It styles 02's W5 row as written (one-time, non-blocking, Editor).
- **Soft note (Home wordmark):** Home hero header now hides the Playpen 25px wordmark on Home only (`display:none`), since the display H1 already reads FlipLoop; every other screen keeps it.
- **Soft note (icons and OG):** Icon layer line now mirrors 02: flipbook glyph as 192x192 and 512x512 px PNG, `purpose: "maskable"`, Ink on full-bleed Desk inside the 80% safe zone; OG image is one 1200x630 PNG of the Home light table (frame 4) on Desk, no text.
- **Flagged, not edited (outside assigned spans):** 03 still carries two samples that 02 re-derived: Challenge slate "שבוע 39 · נשארו 3 ימים" (02 now "נשארו 6 ימים") and Lesson detail "6 פריימים, 2 מוכנים" (02 now "8 פריימים, 2 מוכנים").

## Orchestrator sync (Adam)
- 03 line 145 sample synced to 02: "8 פריימים, 2 מוכנים".
- 03 line 148 sample synced to 02: "שבוע 39 · נשארו 6 ימים".
