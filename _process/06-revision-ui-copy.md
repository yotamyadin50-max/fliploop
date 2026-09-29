## Revision: ui-copy (FlipLoop), round 1 of 1

**Source:** `06-gatekeeper-ui-copy-review.md` (3 findings + 4 soft notes). Edited in place in `05-copywriter-ui-copy.md`; nothing else touched.

### Findings
1. **Print plurals (§15):** `print.summary` now joins `print.summary.cards.one` "כרטיס אחד" / `.other` "{cards} כרטיסים" and `print.summary.sheets.one` "גיליון אחד" / `.other` "{sheets} גיליונות" with " · ". Added `print.done.pdf.one` "ה-PDF ירד: גיליון אחד" and `print.done.png.one` "ירד קובץ PNG אחד" (old strings kept as `.other`). `print.preview.sheet.aria` uses the cards pair via `{cardsText}`. Toast index (§22) row renamed to `print.done.pdf.*` / `print.done.png.*`.
2. **Hold aria (§9):** `frameMenu.hold.value.aria` split into `.one` "החזקה ×1: אורך רגיל" and `.other` "החזקה ×{hold}: הפריים נשאר על המסך פי {hold}".
3. **Coach mark 2 (§4):** `coach.2` is now "הוסיפו פריים וציירו הלאה" (24 chars by script). `coach.2.short` deleted, and its Developer note removed from Notes.

### Soft notes
- `export.video.line`: "לפי מה שהדפדפן תומך בו".
- `toast.canvasResized` replaced by `.wide` "גודל הדף שונה ל-4:3" (4:3 in the `.num` isolate) and `.square` "גודל הדף שונה לריבוע". Conventions punctuation line extended to "Latin text or digits" so the "ל-4:3" hyphen is covered by the stated rule.
- `w2.action` note: button in the Editor strip only; the Gallery banner shows `w2.text` + `w2.gallery.hint` with no "לגלריה" button.
- `home.subtitle`: "ציירו כמה דפים ותראו אותם זזים. בלי הרשמה." (note updated).

### Checks
Em/en dashes (plus U+2012/2015/2212): 0 by script over the whole file. No stale references to `coach.2.short`, `toast.canvasResized` (unsuffixed) or unsuffixed `print.done.pdf/png` remain.
