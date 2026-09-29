## Web Designer Addendum (Critic round): FlipLoop

**Date:** 2026-09-29 · **Role:** Web Designer, targeted revision (F2, F3 only)
**Upstream:** `_process/09-critic-revision-direction.md` (F2, F3), `_process/09-critic-review.md`, `_process/03-web-designer-visual-spec.md`, `final-site-plan.md`, `final-lessons.md`. I checked the code only to find the real seams (`css/style.css`, `index.html`, `js/editor/lesson-mode.js`, `js/editor/editor.js`, `js/ui/dialog.js`). I did not edit any site code.
**Scope:** two decisions. Everything else in the visual spec stays as it is. No structure, content, CTA or copy changes. No new strings.

---

### F2: Hebrew heading face: **Fredoka 600**, and Playpen Sans Hebrew is kept only for the Latin wordmark

**Decision.** `--font-display` changes to **Fredoka 600**. It is a Google Fonts family with a real Hebrew cut (`U+0590-05FF` subset served), and it loads through the existing `<link>`. This is the one added family. A new `--font-wordmark` token keeps Playpen Sans Hebrew 700, only for the Latin brand name "FlipLoop".

**Why Fredoka and not the zero-cost Rubik 700.**
1. Rubik is already the UI and body face. If headings also used Rubik 700, the display layer would be the body font set bolder. The H1 would lose the "your own drawing" warmth the concept gave the headings.
2. Fredoka's rounded stroke ends match the icon set (2px Ink stroke, round caps and joins). They also keep the light-table tone playful and calm, while the letterforms stay plain print.
3. Fredoka is narrower than Playpen: the same six test words took about 993px against Playpen's about 1066px. So the switch adds no new wrap risk. In the live app at 375, "האתגר של השבוע" (H1) and "חללית ממריאה" (slate, 39px) both stay on one line.
4. Its Hebrew and Latin come from one family, so "ה-GIF מוכן" no longer mixes scripts or styles. This follows the bilingual-pairing rule.
Weight **600, not 700**: at 700 the counters of ם, ס and ה start to close at 39px on Film. 600 reads clean and still sits clearly above Rubik 500 labels.

**Render proof (screenshots read as images, not a glyph check).** Headless Chrome, page at scratchpad `fonttest.png` / `fontcheck.png`:
- Playpen Sans Hebrew 700 (current): cursive, as the Critic said. "ייצוא" draws as roughly "ICI3", the ץ in "מתיחה וכיווץ" is a cursive hook, and ל and א are script forms.
- **Fredoka 600 / 700: print letterforms** in "ייצוא", "שיעורים", "מתיחה וכיווץ" (the final ץ is a print ץ, and ך ף ן were checked at 64px as well), "האתגר של השבוע", "ה-GIF מוכן" and "חללית ממריאה". `document.fonts.check('600 20px Fredoka','ייצוא')` returns true, and the Hebrew subset face is the one loaded, so there is no fallback to Rubik.
- In context (live app, 375x667, Challenge screen): the H1 and the slate theme render in Fredoka print. The Latin "FlipLoop" stays in Playpen.

**Tokens (replace spec lines 171 and 44's display entry):**
```css
:root{
  --font-display:"Fredoka","Rubik","Segoe UI","Arial Hebrew",sans-serif;   /* Hebrew headings, print */
  --font-wordmark:"Playpen Sans Hebrew","Rubik","Segoe UI",sans-serif;     /* Latin "FlipLoop" only */
  --fw-display:600;
}
```

**Class mapping (exact):**

| Class | What it renders | Font | Weight |
|---|---|---|---|
| `.screen-h1` | every screen H1, including each lesson name | `--font-display` | `var(--fw-display)` 600 |
| `.export__h2` | "ייצוא" | `--font-display` | 600 |
| `.export__done-title` | "ה-GIF מוכן" and the other done titles | `--font-display` | 600 |
| `.slate__theme` | weekly theme, 39px on Film | `--font-display` | 600 |
| `.station__num` | Lessons station digits (25px) | `--font-display` | 600 |
| `.wordmark` | "FlipLoop" (header) | `--font-wordmark` | 700 |
| `.display` | Home H1, which is the string "FlipLoop" (`home.h1`) | `--font-wordmark` | 700 |
| `.about__name` | "FlipLoop" (`settings.about.name`) | `--font-wordmark` | 700 |

This differs from the direction's default for `.about__name`, and the reason is in the code: `.about__name` and `.display` render only the Latin brand name, so they are wordmark uses, and Hebrew still never renders in Playpen. **Guard rule:** any element whose string contains Hebrew uses `--font-display`. If `home.h1` or `settings.about.name` ever becomes Hebrew, that class moves to `--font-display`.

Unchanged: `--lh-head` 1.25, slate line-height 1.2, letter-spacing 0, and all sizes and redlines.

**Google Fonts `<link>` (index.html:24), exact:**
```
https://fonts.googleapis.com/css2?family=Fredoka:wght@600&family=Playpen+Sans+Hebrew:wght@700&family=Rubik:wght@400;500;700&display=swap
```
Playpen 600 is dropped because no rule uses it. Keep the family name "Playpen Sans Hebrew": the browser downloads only the unicode-range subsets it actually uses, so with Latin-only text it fetches only the Latin file. The existing `preconnect` lines stay.

**New font check (replaces spec line 202; a glyph-presence check alone no longer counts):** render "ייצוא", "שיעורים", "מתיחה וכיווץ", "ה-GIF מוכן" and "חללית ממריאה" in the live build, take a screenshot, open it as an image, and confirm print letterforms: a straight final ץ with no cursive hook, and a print ל and א. Do this at 375 and 360 on the Export sheet, the done state, Challenge and one Lesson detail. This check applies to every future Hebrew display font whenever the audience includes early readers.

**For Developer, re-measure (per direction):** slate theme at 39px, the longest lesson-name H1, the Export H2 and "ה-GIF מוכן" at 375 and 360. I pre-checked the Challenge H1 and slate at 375: one line each. The rest is yours to confirm with screenshots.

---

### F3: where the lesson steps live during the exercise

**Decision.** Below 1280px, a labelled "התרגיל" button in the goal strip opens the steps. At 1280px and wider, the steps sit in a card next to the canvas that is always visible. The steps render verbatim from `lessonText(n).steps` (`this.text.steps` in `LessonMode`). The only label is the existing `lesson.exercise.h2` ("התרגיל"). No new copy.

#### Phone and tablet (< 1280px): "התרגיל" button in the goal strip

**Markup** (built in `LessonMode.build()`, inserted after `.goal__progress` and before the hints switch):
```js
this.stepsBtn = h("button", { class: "goal__steps", type: "button", "aria-haspopup": "dialog",
  onclick: () => this.openSteps() }, iconEl("book", { size: 18 }), h("span", {}, t("lesson.exercise.h2")));
// openSteps():
openSheet({ title: t("lesson.exercise.h2"), anchor: this.stepsBtn,
  body: h("ol", { class: "steps lesson-steps__list" }, this.text.steps.map((s) => h("li", {}, s))) });
```
`openSheet` with `anchor` is already a bottom sheet on phone and an anchored 340px popover at 1024 to 1279 (`dialog.js`). The sheet also picks up the F1 close-on-navigate fix, and `dialog.js` already returns focus to the button on close. The icon is the existing `book` glyph, the same one the lessons use, so no new icon is needed.

**CSS (exact):**
```css
.goal__steps{position:relative;display:inline-flex;align-items:center;gap:var(--s-4);height:32px;
  padding:0 10px 0 12px;border:1.5px solid var(--ink);border-radius:var(--r-pill);background:var(--glow);
  color:var(--ink);font:500 .8125rem/1 var(--font-ui);white-space:nowrap;flex:0 0 auto}
.goal__steps::before{content:"";position:absolute;inset:-6px -4px}   /* 44px hit area (32 + 12) */
.goal__steps:hover{background:var(--glow-hover)}
.goal__steps:active{transform:translateY(1px)}
.lesson-steps__list{font-size:.9375rem;line-height:1.6;margin:0 0 var(--s-8)}

/* < 768: every lesson goal strip is 2 rows (this replaces the current max-width:479px hints-only rule) */
@media (max-width:767px){
  .goal-strip{display:grid;grid-template-columns:auto 1fr auto;
    grid-template-areas:"chip goal goal" "prog . steps";column-gap:var(--s-8);row-gap:0;padding:var(--s-4) var(--s-8)}
  .goal-strip--hints{grid-template-columns:auto 1fr auto auto;
    grid-template-areas:"chip goal goal goal" "prog . steps switch";padding:var(--s-4) var(--s-8) 0}
  .goal-strip>.chip{grid-area:chip} .goal-strip>.goal__text{grid-area:goal}
  .goal-strip>.goal__progress{grid-area:prog} .goal-strip>.goal__steps{grid-area:steps}
  .goal-strip>.switch{grid-area:switch}
}
/* 768 to 1279: single flex row, as today: chip, goal (flex 1), progress, steps button, switch */
@media (min-width:1280px){ .goal__steps{display:none} }
```
RTL reading of row 2 at 375: "0/6 צוירו" at the start (right), then the steps button, then the hints switch at the end (left).

**Measured in the live app at 375x667** (prototype injected at runtime, no code edited):

| | Goal strip | Canvas | Page scroll |
|---|---|---|---|
| Lesson 1 (no hints), today | 40px, 1 row | 343x257 | none |
| Lesson 1 with button | **66px** (row 2 = 32px button + 4px padding) | **343x257** | none (667) |
| Lesson 2 (hints) with button | **68px**, the existing ceiling (row 2 = the 38px switch) | **343x257** | none (667) |

In the 2-row hints strip the goal keeps 259px on row 1, so it does not truncate. The button is 86x32 visible with a 44px hit area.

**Sheet fit, measured:** lesson 1 has the longest steps (6 steps, 450 characters). At 15px/1.6 its sheet body is 368/368, so there is no inner scroll at 375x667. The sheet is 420px tall, inside the 70dvh cap. At 16px/1.7 it overflowed by 7px, which is why the list is set to 15px in the sheet. Screenshot: the steps sheet over the lesson-2 editor, numbered 1 to 6 on the start side, like `ol.steps` on Lesson detail.

**Auto-open: no.** The child read these same steps one tap earlier on Lesson detail, and a sheet that opens on entry covers the canvas they came to draw on. That would be the tutorial wall the plan forbids (plan line 16). There is also no extra coach mark: the button carries a visible word, not an icon alone. During Play it dims with the goal strip through the existing `.is-playing .goal-strip` rule.

#### Desktop (≥ 1280px): an always-visible steps card between the canvas and the panel

**Why not "inline in the 240px panel under swatches/onion", the direction's suggested shape.** I measured it at 1280x800 on lesson 1: the panel content is already **711px inside a 534px panel** (colors 220, onion 289, size 74, clear 48). Steps placed under those groups would sit below the fold of a scrolling panel, so they would not be "always visible". Putting them first would push the swatches out of view while drawing.

**Why ≥1280 and not ≥1024.** A 280px card at 1024 would shrink the canvas column to about 352px. That is below the 1x step (480), and the desktop canvas scale rule would break. At 1280 and wider, the canvas column keeps its current scale step. The 1024 to 1279 band therefore uses the goal-strip button, which there opens as an anchored popover.

**Markup** (created by `LessonMode`, inserted into `.editor__body` after `.tools` and before `.panel`, so the tab order is rail, canvas, steps, panel):
```js
h("aside", { class: "lesson-steps", "aria-labelledby": "h3-lesson-steps" },
  h("h3", { id: "h3-lesson-steps", class: "panel-title" }, t("lesson.exercise.h2")),
  h("ol", { class: "steps lesson-steps__list" }, this.text.steps.map((s) => h("li", {}, s))))
```
Give the Editor section an `editor--lesson` class in lesson mode, used for the grid below.

**CSS (exact):**
```css
.lesson-steps{display:none}
@media (min-width:1280px){
  .editor--lesson .editor__body{grid-template-columns:72px 1fr 280px 240px;grid-template-areas:"rail canvas steps panel"}
  .lesson-steps{grid-area:steps;display:flex;flex-direction:column;gap:var(--s-8);padding:var(--s-16);
    background:var(--glow);border:1px solid var(--desk-rim);border-radius:var(--r-card);
    align-self:start;max-height:100%;overflow-y:auto}
  .lesson-steps .lesson-steps__list{font-size:.875rem;line-height:1.6;margin:0}
}
.is-playing .lesson-steps{opacity:.4;pointer-events:none;transition:opacity 160ms var(--ease-exit)}
```
Under `dir="rtl"` the columns run right to left: rail on the right, then the canvas, then the steps card, then the panel on the left.

**Measured at 1280x800 (prototype):** the canvas column is 608px, which still takes the 1.25x step (600x450), the same scale as today. The card is 280px wide. Its height for all 12 lessons is 287 to 460px, inside the 536px row, so none scroll. At 1440x900 the canvas column is 768px, keeping 1.5x (720). At shorter windows such as 1280x720, lesson 1's card may scroll inside itself (`overflow-y:auto`), and the canvas does not change.

#### Developer verification (adds to the direction's list)
- At 375x667: lesson 1 goal strip ≤ 68px (target 66) and lesson 2/6/7/10 = 68px. Canvas `getBoundingClientRect()` is 343x257, the page does not scroll, and the steps text is in the DOM when the sheet is open. Tap the button, then Back: the sheet closes (F1). Focus returns to the button after Esc.
- At 1280x800: the card is visible without tapping, the goal-strip button is hidden, and the canvas is the same size as without the card. Do this on lesson 1 and lesson 7. At 1024 and 1200: no card, and the button opens the anchored popover.
- Screenshots at 375 and 1280, read as images.
- Environment note: while the Browser pane was hidden, `fitStage` and the hash router's View Transition stalled (rAF paused). My desktop canvas numbers therefore come from the grid math and the measured column widths, not from a re-fitted stage. Re-confirm them in a visible window.

---

### Checklist
- F2: print letterforms confirmed by screenshot for all five required words plus "האתגר של השבוע". One family added (Fredoka), weight 600, loaded through the existing link. Wordmark split done. Spot-check rule replaced.
- F3: canvas 343x257 at 375x667, measured on a hint and a non-hint lesson. Steps are one tap from the goal strip. No new copy. The sheet inherits F1. No auto-open. The desktop card is always visible at 1280 and wider without shrinking the canvas.
- Side effect to know about: the prototype runs created lesson-2 exercise data in the local dev origin's storage at 127.0.0.1:5178, through the normal "להתחיל תרגיל" flow. It is ordinary app data.

### For the loop
- A panel that "has room" on paper can already be overflowing in the live build. Measure `scrollHeight` against `clientHeight` before placing new content "under" existing groups.
