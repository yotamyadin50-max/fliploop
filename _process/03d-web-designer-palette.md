## Web Designer: Shade Palette ("עוד גוונים")

**User request (verbatim):** "אני רוצה שעכשיו תוסיף עוד גוונים אני רוצה שיהיה את הצבעי בסיס כמו עכשיו ויהיה חץ שאם אני לוחץ עליו יש פלטה גדולה של גוונים שאתה יכול לבחור"

**Decision in one line:** the 12 base swatches, the 13th "recent" chip and "צבע אחר" stay exactly as they are. One new chevron button, "עוד גוונים", goes next to "צבע אחר". It opens a 10 x 7 shade palette (70 tiles) plus a "אחרונים" row that holds up to 7 recent colors. On phone the palette expands in place inside the colors sheet. On desktop it opens as a popover beside the side panel. Landscape phones get a two-column sheet.

**Mock verified:** a static mock (`scratchpad/palette/mock.html`) was rendered with headless Chrome at 375x812, 360x740, 812x375, 640x360, 1024x700 and 1280x800. There is no horizontal scroll at any size, and the popover stays clamped inside 1024x700. I looked at every screenshot. One thing I fixed after looking: the first landscape layout overflowed at 640px, so the landscape column widths below are now fixed (284 + 16 + 308 = 608).

Concept fit: the rows read as paint chip strips laid on the light table. Each hue is one strip, lightest at the start. This is the same "physical object on the desk" register as the rest of the UI, and it adds no new color to the chrome. All palette color lives inside the tiles.

---

### 1. The palette (exact values, the Developer pastes these)

**How it was built.** Each row is one base hue, taken from the base swatch's own OKLCH hue and chroma. I computed this in Node this session. The generator is `scratchpad/palette/gen.js`. The rules:
- **The base color is always in its own row, exact hex, never a look-alike.** The steps lighter than the base are spaced evenly in OKLCH L up to that row's lightest step (0.93 by default). The steps darker than the base are spaced evenly down to about 0.30. The split between lighter and darker steps is chosen per row so that the smallest step is as large as possible. So the base sits in position 3, 4 or 5 depending on how light it naturally is (yellow is light, purple is dark). Across rows the columns stay roughly the same lightness.
- **Chroma:** the base chroma, eased by up to 35% toward the lightest tint so tints read as tints and not neon, and by up to 10% toward the darkest. Then it is gamut-mapped to sRGB (chroma is binary-searched down until the color is in gamut, and hue is kept).
- **Hue drift:** yellow drifts up to -8° and orange up to -6° as they darken, so dark yellow reads as ochre or gold and not olive-green. Every other hue stays constant.
- **Two rows are hand-set in sRGB:** gray, and the dark half of brown. OKLCH-even steps there came out closer than the fill tolerance (next point). These rows are even steps of 33 or more on the largest channel, and they keep the base gray's warm tint (R +4, B -8 around G).
- **Hard check, flood fill:** `core/fill.js` fills with a tolerance of 32 on every channel. **Every pair of horizontal neighbours differs by 33 or more on at least one channel** (the checked minimum is 33). So a fill clicked on one shade never leaks into the next shade of the same row. That matters, because shading with neighbouring tones is exactly what a shade palette is for.
- Near-duplicate check across all 70 tiles plus the 12 base colors: the only pairs within 12 on the largest channel are gray-1 #FCFAF6 against white (9), which is kept on purpose as a warm off-white for highlights on colored areas, and blue-1 against purple-1 (12). Both are pale tints and still tell apart on screen.

Order: rows follow the base order with black and white removed (their ramp is the gray row). Columns go from step 1 (lightest, inline-start, so on the RIGHT in RTL) to step 7 (darkest, inline-end). **Bold** marks the exact base swatch.

| Row | Hue name key | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|---|
| gray | `color.2` | #FCFAF6 | #DCD9D3 | #BCB8B1 | #9B978F | **#7A766E** | #58544D | #35322D |
| red | `color.4` | #FFE0DA | #FFAC9F | #FF6E5D | **#E23B2E** | #BB110B | #8C0000 | #5D0000 |
| orange | `color.5` | #FFE2CC | #FFB67C | **#F28C28** | #D06F00 | #AA5800 | #854100 | #612C00 |
| yellow | `color.6` | #FFF6DF | #FFDE80 | **#F5C518** | #CB9E00 | #A17A00 | #785800 | #503900 |
| green | `color.7` | #B9FBC4 | #8CDC9B | #5EBD73 | **#2E9E4F** | #007932 | #005320 | #00300F |
| teal | `color.8` | #B4F7F3 | #86D9D5 | #57BCB7 | **#1F9E9A** | #007A77 | #005754 | #003634 |
| blue | `color.9` | #E6EFFF | #B3CFFF | #80AEFF | #518BF7 | **#2F6BDB** | #0C45AB | #00256F |
| purple | `color.10` | #EAE3FF | #CDBBFF | #B390FF | #966DE6 | **#7A4BC9** | #59289E | #3A0073 |
| pink | `color.11` | #FFDEE8 | #FF9CC1 | **#E8619A** | #C5457E | #A32762 | #820048 | #58002F |
| brown | `color.12` | #EFCDB6 | #D5AA90 | #B08164 | **#8A5A3B** | #693E20 | #482202 | #270E00 |

Paste into `js/editor/panels.js` next to `SWATCHES`:

```js
// 10 hue rows x 7 steps, lightest first. `base` is the 0-based index into SWATCHES (hue name = color.{base+1});
// the cell equal to that swatch IS the base color. Generated in OKLCH, see _process/03d.
export const SHADE_ROWS = [
  { base: 1,  cells: ["#FCFAF6","#DCD9D3","#BCB8B1","#9B978F","#7A766E","#58544D","#35322D"] }, // gray
  { base: 3,  cells: ["#FFE0DA","#FFAC9F","#FF6E5D","#E23B2E","#BB110B","#8C0000","#5D0000"] }, // red
  { base: 4,  cells: ["#FFE2CC","#FFB67C","#F28C28","#D06F00","#AA5800","#854100","#612C00"] }, // orange
  { base: 5,  cells: ["#FFF6DF","#FFDE80","#F5C518","#CB9E00","#A17A00","#785800","#503900"] }, // yellow
  { base: 6,  cells: ["#B9FBC4","#8CDC9B","#5EBD73","#2E9E4F","#007932","#005320","#00300F"] }, // green
  { base: 7,  cells: ["#B4F7F3","#86D9D5","#57BCB7","#1F9E9A","#007A77","#005754","#003634"] }, // teal
  { base: 8,  cells: ["#E6EFFF","#B3CFFF","#80AEFF","#518BF7","#2F6BDB","#0C45AB","#00256F"] }, // blue
  { base: 9,  cells: ["#EAE3FF","#CDBBFF","#B390FF","#966DE6","#7A4BC9","#59289E","#3A0073"] }, // purple
  { base: 10, cells: ["#FFDEE8","#FF9CC1","#E8619A","#C5457E","#A32762","#820048","#58002F"] }, // pink
  { base: 11, cells: ["#EFCDB6","#D5AA90","#B08164","#8A5A3B","#693E20","#482202","#270E00"] }, // brown
];
```

**Why 7 steps x 10 rows (70), and not more.** The binding constraint is the phone at 360px. The sheet body is 360 - 2 x 16 = 328px. At the project's 44px minimum target, floor(328 / 44) = **7 per row**. That leaves 20px spare at 360 and 35px at 375, and it gives a readable 3 lighter / base / 3 darker spread. 10 rows is every chromatic base plus one gray row, and a row per hue is the only order a 14-year-old can scan without a legend. On desktop the pointer allows smaller tiles (WCAG 2.5.8 minimum is 24px, and I use 32). I deliberately did **not** add more steps on desktop. **One palette on every device** means a shade picked on the phone exists on the laptop in the same place, and project files look the same everywhere. Tile count on phone: 70 + up to 7 recent + 12 base + 1 recent chip + picker. The expanded sheet scrolls a little on phone (next section), and that is fine for a sheet.

**Unaffected systems (checked):** onion skin recolors every pixel, so shades change nothing there. The GIF encoder uses the exact palette when there are 256 colors or fewer, and median-cut above that. The 12 + 70 set plus anti-aliasing already goes through that path, so there is nothing new to handle.

---

### 2. Recent colors

- **Storage:** `settings.recentColors: string[]` (uppercase hex), max **7**, most recent first, no duplicates. Add `recentColors: []` to `DEFAULT_SETTINGS` in `store/settings.js`. It persists through the existing `updateSettings` (IndexedDB meta). If the database is down it lives in memory for the session, which is the store's existing fallback.
- **What goes in:** any pick that is NOT one of the 12 base swatches, meaning palette tiles and "צבע אחר". A base pick is never recorded, because base colors are always one tap away. Picking a color that is already in the list moves it to the front.
- **The 13th chip** (the existing `swatch--recent` after the 12) now shows `recentColors[0]`. It replaces `ed.recentColor`, so the collapsed sheet keeps working exactly as today, and it now also remembers a palette shade. Its label is unchanged (`colors.recent.aria`).
- **The "אחרונים" row** sits inside the expanded palette and shows all of `recentColors` (1 to 7 chips). They are the same round `.swatch` chips as the base, so round means "a color I already have" and square means "a shade from the chart". **The whole block (caption and row) is hidden when the list is empty.** There is no empty-state text: the row appears the first time it has something in it.

### 3. `colorName(hex)` extension (tool key label, tooltips)

Look up in order: (1) base, `color.N` (unchanged); (2) shade, `shade.name` with `{colorName}` = the row's hue name and `{n}` = step 1..7, e.g. "כחול 6"; but if the cell IS the base hex, return the plain base name; (3) otherwise `color.custom`. This way the phone color key says "צבע: כחול 6" and not "צבע משלי".

---

### 4. Layout per context

**4a. Phone, colors sheet (portrait; also the fallback for landscape under 640px wide)**

```
[ sheet header: צבעים                           X ]
[ 12 base swatches, 6 x 44, 2 rows (unchanged)    ]
[ 13th recent chip (unchanged, when present)      ]
[ ▾ עוד גוונים  ...................  [■] צבע אחר ]  <- NEW row: toggle at start, picker at end
[ (expanded) אחרונים  ●●●●●                       ]
[ (expanded) 10 chip strips x 7                   ]
```

- The **toggle row** replaces the picker's current row. `display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap`. The toggle sits at the inline-start (right), and the picker (unchanged markup) at the inline-end (left). Collapsed, the sheet is exactly as tall as today, because the picker row already existed.
- **Expanded:** the palette block goes under the toggle row with a 16px gap between "אחרונים" and the strips.
- **Sheet height:** collapsed keeps `max-height: 70dvh`. Expanded adds class `sheet--tall` to the dialog (`max-height: calc(100dvh - 16px - var(--safe-t))`). At 375x812 the content is about 60px taller than that, so the body scrolls. Right after expanding, call `shadesPanel.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" })` so the bottom strips come into view.
- **Width check:** 7 x 44 = 308px at 328px (360 wide) and at 343px (375 wide). Swatch rows keep `justify-content:start`, aligned to the right edge like the base grid. No horizontal scroll.

**4b. Landscape phone (`orientation: landscape` and `max-height: 500px` and `640px <= width <= 1023px`)**

This is the same bottom sheet, with `sheet--tall`. When expanded, the body becomes two columns:
- Column 1 (start, 284px = the 6-swatch grid width): base swatches, toggle row, then "אחרונים". The column is `position: sticky; top: 0` so base colors never scroll away.
- Column 2 (end, 308px): the 10 strips, scrolling with the body.
- `grid-template-columns: 284px 308px; column-gap: 16px`. That is 608px, which fits 640 - 2 x 16 exactly, and it fits 812 with room to spare even with the 44px notch insets. At 812x375 about 6 strips are visible and the rest scroll.
- Under 640px wide in landscape (e.g. 568x320), it falls back to the portrait stack (4a) and scrolls.
- This rule only touches `.colors`, `.shades-panel` and the sheet. It does not touch `.editor__body` or `.tools`, so it does not collide with the Developer's current landscape editor work.

**4c. Desktop side panel (1024px and up, 208px inside)**

- Order inside the colors group: base grid (4 x 44, unchanged), 13th chip, **toggle button**, "צבע אחר" (unchanged). The toggle and picker cannot share one row at 208px (about 120 + 112), so the toggle gets its own row. It is **full width (208) and 44 tall**, with the chevron at the start and the label beside it (`justify-content:flex-start`).
- The toggle **does not expand the panel in place.** The panel is already 711px of content in a 534px viewport (measured in 03c), and 360px more would push the onion controls far below. Instead it opens a **popover beside the panel, on the canvas side.** Under RTL the panel is the leftmost column, so the popover opens to its RIGHT, over the canvas's left edge. It is transient and closes on pick.
- **Popover:** width 256px (16 + 7 x 32 + 16). Header uses the existing `.sheet__header`: title "כל הגוונים" (`colors.shades.title`) and a 44px X (`common.close`). Body: "אחרונים" (chips 24px inside 32px cells), then 10 strips of 32 x 32 tiles (28px visual height), rows with no extra gap, 16px padding. Total height is about 470px.
- **Position** (a new side placement for `openSheet`, e.g. `kind: "sheet", anchor, side: panelEl`). Inline-start of the panel: under RTL, `left = panelRect.right + 8`; under LTR, `left = panelRect.left - 8 - popW`. Then `top = clamp(8, toggleRect.top - 16, innerHeight - popH - 8)`, `position: fixed`, with `right/bottom: auto` (same guard as the existing `positionPopover`). Checked at 1280x800 and 1024x700: it fits without clamping at 1280 and clamps cleanly at 1024x700.
- While the popover is open the toggle shows its pressed state: Ink fill, Glow text, `aria-expanded="true"`.

---

### 5. Tiles, chips and states (exact CSS)

Add these tokens to `:root`: `--shade: 44px; --shade-h: 40px;` and set both to `32px / 28px` inside `.sheet--shades` (the desktop popover class).

```css
.colors { display: flex; flex-direction: column; gap: var(--s-8); }
.colors__row { display: flex; align-items: center; justify-content: space-between; gap: var(--s-8); flex-wrap: wrap; }
.shades-toggle { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding-inline: 8px 12px; margin-inline-start: -8px; border-radius: var(--r-control); font-weight: 500; }
.shades-toggle:hover { background: var(--glow-hover); }
.shades-toggle .icon { transition: transform var(--t-state) var(--ease-enter); }
.shades-toggle[aria-expanded="true"] .icon { transform: rotate(180deg); }          /* phone: points up when open */
.panel .shades-toggle { width: 100%; margin: 0; border: 1.5px solid var(--desk-rim); }
.panel .shades-toggle .icon { transform: rotate(-90deg); }                           /* desktop RTL: points right, at the popover */
[dir="ltr"] .panel .shades-toggle .icon { transform: rotate(90deg); }
.panel .shades-toggle[aria-expanded="true"] { background: var(--ink); color: var(--glow); border-color: var(--ink); }

.shades-panel { display: grid; grid-template-rows: 0fr; opacity: 0; transition: grid-template-rows 240ms var(--ease-enter), opacity 160ms linear; }
.shades-panel.is-open { grid-template-rows: 1fr; opacity: 1; }
.shades-panel__inner { min-height: 0; overflow: hidden; display: flex; flex-direction: column; gap: var(--s-16); padding-top: var(--s-8); }
.shades-caption { font-size: var(--fs-caption); color: var(--muted); font-weight: 500; margin-bottom: 4px; }
.recent-row { display: grid; grid-template-columns: repeat(7, var(--shade)); justify-content: start; }
.recent-row .swatch { width: var(--shade); height: var(--shade); }
.sheet--shades .recent-row .swatch::before { width: 24px; height: 24px; }

.shades { display: grid; grid-template-columns: repeat(7, var(--shade)); justify-content: start; }
.shade { width: var(--shade); height: var(--shade); display: grid; place-items: center; }
.shade::before { content: ""; width: 100%; height: var(--shade-h); background: var(--swatch);
  box-shadow: inset 0 1px 0 rgba(31,30,27,.18), inset 0 -1px 0 rgba(31,30,27,.18); }
.shade:nth-child(7n+1)::before { border-start-start-radius: 10px; border-end-start-radius: 10px; }   /* strip ends, logical so RTL is free */
.shade:nth-child(7n)::before   { border-start-end-radius: 10px;   border-end-end-radius: 10px; }
.sheet--shades .shade:nth-child(7n+1)::before { border-start-start-radius: 8px; border-end-start-radius: 8px; }
.sheet--shades .shade:nth-child(7n)::before   { border-start-end-radius: 8px;   border-end-end-radius: 8px; }
/* the base color's tile: a 4px Glow pip so kids see "this is the one from above" */
.shade--base::after { content: ""; position: absolute; bottom: 7px; left: 50%; width: 4px; height: 4px; margin-left: -2px;
  border-radius: 50%; background: var(--glow); box-shadow: 0 0 0 1px rgba(31,30,27,.55); }
.sheet--shades .shade--base::after { bottom: 6px; }
/* selected: lifts out of the strip with the SAME two-tone ring the base swatches use (Glow gap + Ink) */
.shade[aria-pressed="true"] { z-index: 1; }
.shade[aria-pressed="true"]::before { border-radius: 8px; box-shadow: 0 0 0 2px var(--glow), 0 0 0 4px var(--ink); }
.sheet--shades .shade[aria-pressed="true"]::before { border-radius: 6px; }
@media (hover: hover) { .shade:hover::before { box-shadow: inset 0 0 0 2px var(--glow), inset 0 0 0 3px rgba(31,30,27,.45); } }
.shade:focus-visible { outline: 3px solid var(--ink); outline-offset: 2px; z-index: 2; }
.sheet--tall { max-height: calc(100dvh - 16px - var(--safe-t)); transition: max-height 240ms var(--ease-enter); }

@media (orientation: landscape) and (max-height: 500px) and (min-width: 640px) and (max-width: 1023px) {
  .colors.is-expanded { display: grid; grid-template-columns: 284px 308px; grid-template-rows: auto auto 1fr; column-gap: 16px; justify-content: start; align-items: start; }
  .colors.is-expanded > .swatches, .colors.is-expanded > .colors__row { grid-column: 1; }
  .colors.is-expanded > .colors__row { margin-block: 8px; }
  .colors.is-expanded .shades-panel, .colors.is-expanded .shades-panel__inner { display: contents; }
  .colors.is-expanded .recent-block { grid-column: 1; grid-row: 3; }
  .colors.is-expanded .shades { grid-column: 2; grid-row: 1 / span 3; }
  /* sticky start column: wrap .swatches + .colors__row + .recent-block in one element if sticky per-item is uneven */
}
```

The strips are drawn edge to edge: tiles in a row touch, and each 44px row has a 4px gap built into the tile (40 visual inside 44 hit). So the hit areas are a full 44x44 with no dead space, and the strips still read as separate chips. The 1px inset top and bottom line keeps the palest tints (#FCFAF6, #FFF6DF) visible on Glow.

**New icon** (`ui/icons.js`), in the same wobble style as the set: `chevron: "M6.2 9.3l5.8 5.9 5.9-5.8"` (points down). **RTL:** on phone it does not flip, because it points down and rotates to up. On desktop it is rotated to point at the popover's side (right under RTL, left under LTR), set by the CSS above, not by mirroring.

---

### 6. Behavior

| Event | Phone / landscape | Desktop |
|---|---|---|
| Tap "עוד גוונים" | Toggle in place: `.is-open` on `.shades-panel`, `sheet--tall` on the dialog, `aria-expanded` flips, then `scrollIntoView({block:"nearest"})`. Save `settings.shadesOpen`. | Open the side popover. Tapping it again (or X, Esc, or an outside click) closes it. |
| Colors sheet opens | If `settings.shadesOpen` is true it opens already expanded with no animation, and scrolls the selected tile into view (`block:"nearest"`). | The popover never auto-opens. |
| Pick a tile or recent chip | `ed.setColor(hex)`, add to `recentColors` (unless base), close the sheet (same as base today). | Same, then close the popover. The panel's base grid re-renders its pressed state (call the panel's `render()`), and focus returns to the toggle. |
| "צבע אחר" | Unchanged, and the result also goes into `recentColors`. | Unchanged. |
| Current color is a shade | That tile gets `aria-pressed="true"`. A base hex is pressed both in the base grid and on its tile, which is correct because it is the same color. | Same. |
| Current color is custom | No tile is pressed. The recent chip holding it is pressed. | Same. |
| Eraser or Move active | Picking a color switches to Pencil (existing `setColor` rule). | Same. |

**Motion.** Expanding animates `grid-template-rows 0fr to 1fr` over 240ms with `--ease-enter`, plus a 160ms opacity fade. Collapsing uses 200ms `--ease-exit`. The chevron rotates over 200ms. The desktop popover uses the existing `fade-in 150ms` plus `translateX(-8px) to 0` under RTL (it slides out from the panel side; +8px under LTR). **Reduced motion** (`prefers-reduced-motion: reduce`): no height, max-height, rotate or translate transitions. The panel appears instantly, with a 120ms opacity fade at most. `scrollIntoView` uses `behavior:"auto"`. The global reduced-motion block may already zero these durations. If it does, just confirm that the `grid-template-rows` and `max-height` transitions are covered too.

**Closed state:** while collapsed, set `inert` on `.shades-panel`, so the 70 hidden buttons are not tabbable and not announced.

---

### 7. Keyboard and ARIA

- **Toggle:** `<button type="button" aria-expanded="false" aria-controls="shades-{id}">`. Its visible label is the accessible name, "עוד גוונים", with no separate aria string: the expanded state comes from `aria-expanded`. On desktop also add `aria-haspopup="dialog"`.
- **Palette container:** `role="group" aria-label="כל הגוונים"` (`colors.shades.title`). Each strip is `role="group"` with `aria-label` = the hue name (e.g. "כחול"), so a screen reader says the row once and not 7 times.
- **Tiles:** `<button type="button" class="shade" aria-pressed>`, the same pattern as the base swatches.
  - `aria-label` is `shade.aria` ("{colorName} {tone}, גוון {n} מתוך 7"), where `{tone}` is `shade.tone.light` for cells before the base and `shade.tone.dark` for cells after it.
  - The base cell's label is just the hue name ("כחול"), so it matches the swatch above.
  - `title` is `shade.name` ("כחול 6"), which is the desktop tooltip.
- **Roving tabindex:** exactly one tile has `tabindex="0"`. That is the pressed tile, or row 1 step 1 if none is pressed. All others have `-1`. Tab enters the grid on that tile, and the next Tab leaves it.
- **Arrow keys follow the screen, not the DOM** (RTL):
  - ArrowLeft goes to the next step, which is darker and visually left.
  - ArrowRight goes to the previous step.
  - Under LTR the two are swapped (read `getComputedStyle(grid).direction`).
  - ArrowUp and ArrowDown move to the same step in the previous or next row.
  - Home and End go to the first and last step in the row. Ctrl+Home and Ctrl+End go to the first and last tile in the grid.
  - Movement stops at the edges (no wrap).
  - In landscape two-column mode the logical 10 x 7 order is unchanged.
- Enter and Space pick the tile (it is a native button).
- **Focus:** a phone expand keeps focus on the toggle. When the desktop popover opens, focus goes to the roving tile. Esc closes the popover and returns focus to the toggle. The popover is the existing modal `<dialog>`, so focus is trapped inside it.
- **Recent chips:** `.swatch` buttons with `aria-pressed` and `aria-label` = `colorName(hex)`, inside `role="group" aria-label="אחרונים"`.
- Contrast: the tiles are content (ink), not UI text, so 1.4.11 applies only to the selected ring. The Ink and Glow double ring shows on every tile: Ink on the lightest, Glow on the darkest. Focus uses the existing 3px Ink outline.

---

### 8. New strings (proposed; Copywriter to confirm, following `final-ui-copy.md` §0)

| Key | Proposed | Purpose |
|---|---|---|
| `colors.shades.more` | עוד גוונים | Toggle label (phone and desktop). A noun label, like "צבע אחר". |
| `colors.shades.title` | כל הגוונים | Desktop popover title, and the palette group's aria-label |
| `colors.shades.recent` | אחרונים | Caption above the recent row, and that row's group aria-label |
| `shade.name` | {colorName} {n} | Tooltip and `colorName()` result for a non-base tile ("כחול 6") |
| `shade.aria` | {colorName} {tone}, גוון {n} מתוך 7 | Tile aria-label |
| `shade.tone.light` | בהיר | Tone word before the base step (all 10 hue names are masculine, so this agrees) |
| `shade.tone.dark` | כהה | Tone word after the base step |

No em or en dashes, no gendered imperatives. `{n}` is a digit and renders fine inside Hebrew. Existing keys reused: `colors.title`, `colors.picker`, `colors.picker.aria`, `colors.recent.aria`, `colors.selected.aria`, `color.1..12`, `color.custom`, `common.close`.

---

### 9. Developer checklist (acceptance)

1. The 12 base swatches, their order, sizes and ring are unchanged. The 13th chip still appears, now fed by `recentColors[0]`.
2. There is no horizontal scroll at 360, 375, 640x360 landscape or 812x375 landscape. The desktop popover stays in the viewport at 1024x700.
3. All 70 tiles are 44x44 hit areas on phone and 32x32 on desktop. The 7 in a row never wrap.
4. A flood fill on any tile's color does not leak into its horizontal neighbour (tolerance 32, neighbours are 33 or more apart).
5. `recentColors` survives a reload, holds at most 7, has no base colors and no duplicates, and puts the newest first.
6. `shadesOpen` survives a reload (phone). The collapsed palette is `inert`.
7. Arrow-key navigation matches the screen direction in RTL. Esc and focus return work on the desktop popover.
8. Reduced motion shows no height, rotate or slide animation.
9. `colorName()` returns "כחול 6"-style names for shades, and the base name for base cells.

Mock and generator: `C:\Users\yotam\AppData\Local\Temp\claude\...\scratchpad\palette\mock.html`, `gen.js`, `shades.json`, screenshots `phone-closed.png`, `phone-open.png`, `phone-360.png`, `landscape.png`, `landscape640.png`, `desktop.png`, `desktop1024.png` (scratch only, not project files).
