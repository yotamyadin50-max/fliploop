## Critic Revision Direction: FlipLoop

**Date:** 2026-09-29 · **Role:** Build Manager, Revision Direction spawn (Critic Gate trigger, Role 11.6)
**Upstream:** `_process/09-critic-review.md` (3 Major, 4 Minor, 2 Cosmetic). Cross-read: `final-site-plan.md` (Editor section, lesson mode, fonts), `_process/03-web-designer-visual-spec.md` (Editor phone spec, type tokens), `_process/07-developer-notes.md` (incl. Revision round 1), plus the code sites each finding names (`js/ui/dialog.js`, `js/app.js` Router, `js/editor/lesson-mode.js`, `js/screens/lessons.js`, `css/style.css`, `js/data/strings.js`), read to name the real seam, not edited.

**Bundling decision:** ONE round covers all three Majors plus F4, F5, F6, F7, F8. Each Minor/Cosmetic is a single contained change and every one of them touches a file the Majors already reopen (Editor, strings, style.css), so bundling adds no new regression surface. **F9 is closed with no change** (reason below). The Done-rule remark inside F3 is **not routed** (plan-level, see F3).

**Order of work (Tell):**
1. **Web Designer** first: two concept decisions, F2 (Hebrew display face) and F3 (where the lesson steps live during the exercise). Output: a short addendum `_process/03c-web-designer-critic-addendum.md`.
2. **Copywriter** second, strings only, two keys: F7 (challenge Back label) and F8 (default project title). Output: `_process/05c-copywriter-critic-strings.md` with the exact key/value pairs. Nothing else in the copy changes.
3. **Developer** last: implements F1 to F8 in one pass against 1 and 2, logs a "Revision round 2 (Critic)" section in `_process/07-developer-notes.md`.

Then my own re-check (confirmation + targeted regression sweep, Round 5) before promotion.

---

### F1 (Major): modal sheets survive a route change and still act on a gone editor

**The finding.** A `dialog.js` sheet open in the Editor ("עוד", colors, frame menu, lesson stamp sheet) stays open after browser Back / Alt+Left / edge-swipe. Route changes to Gallery, the sheet stays, and its "ניקוי הפריים" erased frame 1 of the project for real (0 inked px after reload, undo gone). The lesson stamp sheet leaked over Challenge, Gallery and Print the same way.

**The interface it actually lives at.** Developer-internal seam between two modules: `ui/dialog.js` `openSheet()` appends a `<dialog>` to `body` and has no owner, while the Router (`app.js`, `hashchange` → `navigate()`) tears down the screen but has no registry of what that screen opened. The sheet's handlers close over the old Editor instance, so its actions reach a model that is no longer on screen. Not a spec gap: the plan's "Back closes the panel first" behavior is standard and the spec never asked for sheets to outlive their screen.

**Who owns the fix, and why.** Developer. Pure implementation, one mechanism, no visual or copy decision.

**Recommendation (Tell).**
- Give `dialog.js` a module-level registry of open sheets and export `closeAllSheets()`. Call it at the start of every Router `navigate()` BEFORE the old screen is destroyed. Closing must go through each sheet's own `close()` so `onClose` runs (a `confirmDialog` must resolve as cancel/false, never as confirm).
- Do not break the Export overlay: it is its own route-bound `<dialog>` in `export/overlay.js`, and `closeOverlay()` uses `history.back()`. Exclude it from the registry, or make sure that closing it on its own route change is a no-op. Verify that Editor → Export → Back still returns to the Editor with no sheet flash.
- Belt and braces: when a screen is destroyed, any action in a sheet it opened becomes a no-op (guard on a `destroyed` flag in Editor/Gallery). A stale sheet must never be able to write data again, even if some future path skips the registry.
- Optional, Delegate: whether browser Back while a sheet is open should close only the sheet and stay on the screen (push a history entry on open, FlipaClip-style). This is better UX but touches history for every sheet. Do it only if it does not disturb the existing nested-stack history (Lessons → Lesson → Editor) or the export overlay's `overlayFromEditor` logic. Otherwise the close-on-navigate fix above is sufficient for this round.
- **Verify by reproducing the Critic's exact path** with real input at 375: Home → העבודות שלי → project → עוד → `history.back()` → `dialog[open]` count must be 0. Then repeat with the colors sheet, the frame menu, the lesson stamp sheet (lesson 1 → complete → Back), the Gallery project menu, and a `confirmDialog`. Confirm with a reload that frame 1 still has its ink.

**If this spans more than one role.** Single-role gap.

---

### F2 (Major): the Hebrew display face renders in cursive script

**The finding.** Playpen Sans Hebrew 700 (`--font-display`) draws Hebrew as cursive (כתב), not print. Every H1, the Export H2 "ייצוא", "ה-GIF מוכן", the weekly theme on the slate (39px) and the lesson names are affected. Early readers (about 6 to 8) cannot decode it, the same label switches script between the Home card (Rubik print) and the screen it opens, and "ה-GIF מוכן" mixes Latin print with Hebrew cursive. The Latin wordmark "FlipLoop" in the same face is fine.

**The interface it actually lives at.** Web Designer's spec to the audience, not Web Designer to Developer. Developer implemented `--font-display: "Playpen Sans Hebrew", ...` exactly as specced (`css/style.css:27` matches spec line 171). The spec's own safety net, "spot-check the longest lesson name; if a glyph falls back, switch to Rubik 700" (spec line 202), tests glyph PRESENCE, not letterform STYLE. So it passed, and it could never catch this. It is a concept-level type choice. Routing it to Developer would send the fix to a role that did nothing wrong and does not own the call.

**Who owns the fix, and why.** Web Designer decides; Developer implements. It is the approved type token, and the Critic's own routing agrees.

**Recommendation (Tell, with one Delegate).**
- **Web Designer:** replace the Hebrew display face with one that has **print Hebrew letterforms**. Split the token: `--font-display` (Hebrew headings) becomes the new print face, and a new `--font-wordmark` keeps Playpen Sans Hebrew for the Latin "FlipLoop" wordmark only. Delegate: which face. Constraints (Tell): it is on Google Fonts with Hebrew support and loads through the existing `<link>` (no font files in the project), at most one added family, weight 600 or 700 available, and it keeps the playful-but-calm tone of the light-table concept. The zero-cost baseline is Rubik 700, already loaded and already the spec's own fallback. Pick something else only if it clearly beats that for tone. State whether the station numbers (Playpen 25px digits) and `.about__name` move to the new face or stay on the wordmark face. Default: move to the new face, so Hebrew never renders in Playpen anywhere.
- **Replace the spot-check rule** in the addendum: render these real words and look at them in a screenshot, confirming print letterforms: "ייצוא", "שיעורים", "מתיחה וכיווץ" (a final ץ), "ה-GIF מוכן", "חללית ממריאה". A glyph-presence check alone no longer counts.
- **Developer:** apply the token split everywhere `--font-display` is used (`.display`, `.screen-h1`, `.wordmark`, `.export__h2`, `.export__done-title`, `.station__num`, `.slate__theme`, `.about__name`), update the Google Fonts `<link>`, and drop Playpen's Hebrew weights if the wordmark no longer needs them. Then re-measure every heading that was sized around Playpen's metrics at 375 and 360: the slate theme at 39px, the longest lesson-name H1, the Export H2, and "ה-GIF מוכן". Report any new wrap. Screenshot evidence at both widths, read as images, is required. A computed-style check is not enough for this one.

**If this spans more than one role.** Web Designer → Developer, in that order.

---

### F3 (Major): the lesson steps are stranded on the detail page during the exercise

**The finding.** The six numbered steps, the actual method with frame numbers ("בפריימים 2 עד 4 הכדור נופל...", "בפריימים 6 עד 8 הוא עולה בחזרה"), exist only on Lesson detail. In the Editor the child gets only the goal line and "0/6 צוירו". The steps are not in the DOM. The "we do" scaffold is missing at the moment of doing, across all 12 lessons.

**The interface it actually lives at.** Site Planner / Web Designer spec to the Editor, one layer up from Developer. The plan's lesson-mode goal strip (plan line 189) and the spec's goal strip specify chip + goal + progress + hints switch, and nothing else. Developer built exactly that. The steps content already exists (`lesson.N.step.M` in `lesson-copy.js`, returned by `lessonText(n).steps`). The gap is that no approved surface in the Editor was given to them. This is a placement decision inside a tight 375 layout (the canvas must stay 343x257 at 375x667), which is Web Designer's call, not Developer's.

**Who owns the fix, and why.** Web Designer decides the placement; Developer implements. Copywriter is not needed, because the steps copy already exists and is approved, and it must be reused verbatim.

**Recommendation (Tell, with one Delegate).**
- **Web Designer, decide the placement under these hard constraints:** at 375x667 the canvas stays 343x257 and tools, strip and Play stay visible with no scroll (today's hint-lesson strip is already 68px, the ceiling). No new copy: the steps render verbatim from `text.steps`. Any label reuses an existing string ("התרגיל", `lesson.exercise.h2`, fits as the sheet title and button label). The steps must be reachable in one tap from the goal strip without leaving the Editor.
- **Recommended shape** (Delegate: Web Designer may choose differently within the constraints). Phone: a compact "התרגיל" button in the goal strip (icon + visible label, 44px hit area) opens a sheet with the numbered steps list, styled like Lesson detail's `ol.steps`. It uses `openSheet()`, so it inherits the F1 close-on-navigate fix. Desktop (1024+): the steps sit inline in the existing 240px left panel under the swatches/onion group, always visible, no button. Also, Web Designer: say whether the steps sheet should auto-open once on first entry to a lesson. My lean is no, because the coach-style auto-open fights the "no tutorial wall" rule on plan line 16.
- **Developer:** implement per the addendum. Verify on lesson 1 and on one hint lesson (2, 6, 7 or 10, which have the 2-row strip) at 375x667 and 1280: canvas size unchanged, no overflow, steps text in the DOM, sheet closes on Back (F1).
- **Not routed, flagged to Adam: the Done rule.** The Critic noted that the stamp can be earned with 6 identical circles because the Done rule counts pixels. That rule is written into the approved plan (plan line 192: 50+ px per blank + Play once). No build-team role can change it within this round. My recommendation is to keep it as is: a child-friendly completion bar is a deliberate Low/Feel choice, and giving the steps a place in the Editor (above) addresses the teaching gap without making completion stricter. Adam can raise it with the user only if the user wants lessons to grade the principle.

**If this spans more than one role.** Web Designer → Developer.

---

### Bundled Minor / Cosmetic (Developer unless named)

**F4, coach marks cover their own context (Minor).** Interface: Web Designer's coach-mark component to Developer's anchor math. The spec named the component but not anchor rules, so Developer anchored the bubbles onto the strip and the tool row. Owner: Developer, bounded. **Recommendation (Tell):** coach 3 ("עכשיו לחצו על הפעלה") must not overlap any strip thumbnail. Anchor it above the playback bar's Play button, pointing down at Play, sitting over the lower canvas edge if needed. Coach 2 must not cover the tool row. Anchor it so it points at "+" at the strip end from above, over the canvas. Delegate: the exact offsets. Verify with screenshots at 375x812 and 375x667.

**F5, lesson-mode counter reads "8/120" (Minor).** Interface: a free-mode strip component reused in lesson mode without its lesson variant. Owner: Developer, no copy change. **Recommendation (Tell):** hide the strip counter in lesson mode (`kind: "lesson"`). The goal strip's "3/6 צוירו" already carries the progress, and the frame count is fixed. Do not edit `strip.counter`.

**F6, Gallery card meta line touches the card edge (Minor).** Interface: Developer CSS, a physical-direction slip in RTL. `.project-card__meta` has `padding: 4px 0 4px var(--s-8)`, so the 8px lands on the physical LEFT, while in RTL the text starts on the right, where it gets 0. Owner: Developer. **Recommendation (Tell):** `padding-block: 4px; padding-inline: var(--s-8);`, matching the title's 8px inset. Also sweep `style.css` for other physical left/right padding or margin on text containers and convert them to logical properties. Report what you found.

**F7, Challenge editor Back goes to Gallery (Minor).** Interface: Router/Editor back logic to copy. `editor.js:88` only knows lesson vs gallery, and there is no challenge Back string. Owners: **Copywriter** supplies two keys, `common.back.challenge` (a short label in the same pattern as "לשיעור"/"לגלריה", e.g. "לאתגר") and `common.back.challenge.aria` (e.g. "חזרה לאתגר השבוע"). This is needed because a new destination needs a new label, and none exists. **Developer** then makes Back for `kind: "challenge"` go to `#/challenge` with those strings.

**F8, default title "אנימציה חדשה 29.9" reads like a version (Cosmetic).** Interface: copy (`common.defaultTitle`) to its real context (the name a child's first work is saved and shared under). Owner: **Copywriter** decides, Developer implements. Reason for a string change: the Critic's point is valid for a shared file name. **Recommendation (Tell the constraint, Delegate the words):** it must read unmistakably as a name or date, not a version, and fit the 154px title field at 375 (Rubik 16/500) with no ellipsis. Two acceptable directions: (a) a clear date, e.g. "{d}.{m}.{yyyy}", if it fits; (b) an ordinal name, e.g. "האנימציה שלי {n}", where Developer supplies n = the count of free projects + 1. Copywriter picks one, and Developer measures the fit.

**F9, "שחזור" for redo (Cosmetic): closed, no change.** Reason: the Critic itself rates the impact low because the icons disambiguate. The tooltip already carries "Ctrl+Shift+Z" and the aria text says "שחזור הצעד שבוטל", which is unambiguous. The clearer Hebrew alternatives ("ביצוע חוזר") do not fit a 49px tool key. Changing a working label for a cosmetic note is churn with its own regression cost.

---

### What my re-check will cover (so Developer knows the bar)
- **Confirmation:** each of F1 to F8 reproduced by the Critic's own path with real input, a different method from Developer's own log (Round 12).
- **Regression sweep:** (1) the heading font change on EVERY screen with an H1/H2, including 404/not-found, Print, Settings and the export done state, diffed against a recorded baseline. (2) Every `openSheet` user (Editor ×4, lesson done, Gallery ×2, W2b, confirmDialog) and the Export overlay's Back path after the F1 change. (3) The goal strip height at 375x667 on lessons 1 and 7 after F3. (4) Home "האתגר של השבוע" still one line if the new face touches it (it is Rubik UI today, so it should not).

### For the loop
- Revision routing: when a Critic "font" or "layout" finding matches the approved spec exactly, the owner is the spec's author, not the implementer. The tell is `css` token value == spec token value.
