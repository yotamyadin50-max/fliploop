## Copywriter: Critic Revision Strings (F7, F8)

**Date:** 2026-09-29 · **Role:** Copywriter, targeted revision round (Critic Gate)
**Upstream:** `_process/09-critic-revision-direction.md` (F7, F8 only), `final-ui-copy.md` (conventions: Back = "ל" + destination, max 7 chars; the user's own things in first person "שלי"; one name per thing, the challenge is "האתגר של השבוע"), `site/js/data/strings.js`.
**Scope:** two changes to `strings.js`, nothing else in the copy moves. No site code edited.

---

### F7: Back from the challenge editor

| Key | Value | Where it shows |
|---|---|---|
| `common.back.challenge` | לאתגר | Back control in the Editor when `kind: "challenge"`, goes to `#/challenge` (5 chars, same pattern as "לשיעור" / "לגלריה") |
| `common.back.challenge.aria` | חזרה לאתגר של השבוע | aria-label on that same Back control |

Notes:
- The aria uses the challenge's one locked name ("האתגר של השבוע"), so a screen reader hears the same thing the Home card and the Challenge h1 say.
- Update the `common.back.gallery` row note in `final-ui-copy.md` from "Back in Editor (free, challenge)" to "Back in Editor (free)". The copy doc is the Developer's to sync when implementing; I am not touching code.

### F8: Default project title

**Choice: direction (b), an ordinal name.**

| Key | Old value | New value |
|---|---|---|
| `common.defaultTitle` | אנימציה חדשה {d}.{m} | האנימציה שלי {n} |

Where it shows: the title field in the Editor for every new free project, the Gallery card, the Home "המשך: {title}" line, the Print sheet footer, and the exported/shared file names (`{title}-flipbook.pdf` and the rest). Lesson titles (`lesson.projectTitle`) and challenge titles (`challenge.projectTitle`) are unaffected.

**Why (b), not the date:**
- It reads unmistakably as a name, in first person, the same way "העבודות שלי" and "האתגרים שלי" do. A kid's third piece is "האנימציה שלי 3", which is something you can say out loud and share.
- The Critic's problem was a number that looks like a version. A bare date "29.9.2026" fixes that, but gives two works made the same day the same name. The ordinal never collides.
- "חדשה" is dropped on purpose: a saved work is not new a week later.

**Placeholder `{n}` (for Developer):** n = count of existing free projects + 1. If that exact title already exists (for example after a delete), increase n until the title is unique. Integer only, no leading zero.

**Fit check, 154px title field at 375px, Rubik 16/500, estimated conservatively:**
- Character count: 14 with a one-digit n ("האנימציה שלי 3"), 15 with two digits ("האנימציה שלי 12"). That is 11 Hebrew letters, 2 spaces, 1 or 2 digits.
- Conservative advance: 10px per Hebrew letter (0.62em, above Rubik's real average), 4.5px per space, 9.5px per digit.
- One digit: 110 + 9 + 9.5 = about 129px. Two digits: about 138px. Even three digits: about 148px. All under 154px, no ellipsis.
- This is an estimate. Developer measures the real rendered width at 375px as the direction requires; if it somehow overflows, report back and I will cut to "העבודה שלי {n}" (12 chars).

---

**Checklist walkthrough:** items that apply to two UI strings checked (zero em/en dashes, locked vocabulary reused, first-person convention, Back pattern and 7-char limit, no jargon for a kid, fit stated with numbers). Channel, headline, CTA-persuasion and authorship items do not apply to two micro-strings, named skip.
