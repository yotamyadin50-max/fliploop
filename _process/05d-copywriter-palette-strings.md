## Copy: palette strings (targeted round, 2026-09-30)

Upstream: `_process/03d-web-designer-palette.md` §8, `final-ui-copy.md` §0 and §8.

| Key | Final | Verdict and reason |
|---|---|---|
| `colors.shades.more` | עוד גוונים | Confirmed. Noun label, matching "צבע אחר" beside it and the §0 noun rule. 9 chars fits the phone toggle row and the 208px desktop button. |
| `colors.shades.title` | כל הגוונים | Confirmed. Short popover title, also the group aria-label. |
| `colors.shades.recent` | בחרתם לאחרונה | Changed from "אחרונים". Inside a chart ordered light to dark, "אחרונים" can read as "the last shades" (the darkest step). "בחרתם לאחרונה" says what the row is, echoes the existing 13th chip label "הצבע האחרון שבחרתם", and uses the plural form (gender covering, per §0). 13 chars fits 256px and 308px. |
| `shade.name` | {colorName} {n} | Confirmed. Short, unique per tile (a tone word alone would repeat: two or three steps are "כהה"), fits the tool key "צבע: כחול 6". `{n}` in a `.num` isolate. |
| `shade.aria` | {colorName} {tone}, גוון {n} מתוך 7 | Confirmed. Mirrors the existing "פריים {n} מתוך {total}" pattern. Base cell keeps the plain hue name, per spec. |
| `shade.tone.light` | בהיר | Confirmed. All 10 hue keys used (`color.2`, `color.4..12`) are masculine, so it agrees. |
| `shade.tone.dark` | כהה | Confirmed, same reason. |

Placed in `final-ui-copy.md` §8 as a "Shade palette" sub-table. `node tools/build-strings.mjs` regenerated `site/js/data/strings.js`; `git diff` shows only these 7 keys added (after `color.custom`). Zero em or en dashes.

Developer note: `colors.shades.recent` is used unchanged for both the visible caption and the group aria-label, so no extra key is needed.
