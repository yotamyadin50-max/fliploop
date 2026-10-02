# 05e · Copywriter review of the fix round (FlipLoop, 2026-10)

**Role:** Copywriter · **Date:** 2026-10-03 · **Branch state reviewed:** `main`, merged fix round, not released.
**Files edited:** `final-ui-copy.md` only (19 rows, plus two Notes lines and one new "בדיקת עברית" line). `final-lessons.md` was read in full and not changed. No other file was touched, and no build tool was run, so `site/js/data/strings.js` still holds the old 19 texts until a Developer runs `node tools/build-strings.mjs`.

**Handoff synthesis:** the integration notes hand over 87 new keys written by Developers as working drafts and 89 rows changed in place; the rulings in `12-fix-direction.md` section 3 fix a few words for good (R38 "ביטול" is Cancel only, R39 the three status texts, R40 one name per thing, R41 the play glyph, R42 the project-file toast); my own audit `08-copy.md` is the source of most of the 89. Together they say: the vocabulary is settled, so this pass is about whether each new sentence is true in every case the code can show it, and whether a child knows what to do after reading it. One tension, named: the drafts written into section 7 of the fix direction were applied verbatim by the Developers, but they are drafts, not rulings. I kept all of them except two (`conflict.body`, `challenge.stamp.toast`), each changed for a reason found in the code.

**Checklist walkthrough:** 26/26 walked. Checked with a result: 1 and 25 (every claim in a corrected string was traced to the code that shows it, listed in the "why" column); 5 (plural imperative, verbs, no noun chains); 6 (GIF, PDF, Ctrl+Z stay Latin); 7 (each correction rests on what this app really does, for example that "לטעון את הגרסה החדשה" drops the tab's own drawing); 8 and 11 (no cliché, no AI-tell words; Hebrew kill-table walked row by row on the 19 new texts); 9 (each read aloud); 12 (reason-why: `conflict.body` and `storage.blocked.toast` both give the reason); 14 (1 to 3 short sentences each; `conflict.body` runs medium, medium, short); 21 (errors are plain and calm, no cheer, no alarm); 23 (synthesis above); 24 (13-year-old gut check on every sentence). Legitimate skips, named: 2, 3, 4 (nothing is sold, no page CTA or headline), 10 (no persuasion lever), 13, 15, 16, 17, 18, 19, 20 (no content marketing, ad, email, push, onboarding flow, paywall or search page), 22 (an error message should pass unremembered), 26 (no claim about who made it).

---

## 1. What was reviewed

| Set | Count | Kept | Changed |
|---|---|---|---|
| New keys of the round (integration notes, section 5) | 87 | 69 | 18 |
| Existing rows with changed text (sections 0 to 23) | 89 | 88 | 1 |
| **Total** | **176** | **157** | **19** |
| Lesson copy values changed by WS3 (`final-lessons.md`) | 37 | 37 | 0 |
| Themes changed (R45) | 7 | 7 | 0 |

**Kept, in one line:** all four Home keys, the conflict title and both conflict buttons, the read-failed and load-failed texts, the W0 banner (title and body), `storage.failed.toast`, `w3.left`, the skipped, copies, bad, stamps and partial import lines, the starter number pattern, the six Settings keys for the shortcuts switch and the report (label, hint, button, hint, toast, file name), both resize bodies, the hold stepper names, the three eraser names, `lessonMode.nudgeHold`, `lessonDone.toast`, the plural progress and counter names, `toast.frameRestore.full`, `toast.frameRestored.aria`, the video preparing and length lines, `export.done.back`, both share-failed lines, the preview alt, the progress name, the seven file-name patterns, the many-sheets title and button, `print.error.print`, `print.action.sharePdf`, `print.share.ready`, the 404 title, description, heading and link, every one of the 89 changed rows except the failed-status name, all 37 lesson values and all 7 themes.

**How each one was checked:** read against the conventions in section 0 of `final-ui-copy.md` (plural imperative for instructions, infinitive for buttons, one name per thing, no em or en dash, numbers and Latin fragments safe in RTL), against the rulings, and against the code line that shows it (`gallery.js reportImport()`, `project-file.js importEntries()`, `editor.js showConflict()`, `reloadDocument()`, `keepUnsaved()`, `setStatus()`, `afterSave()`, `deleteFrame()`, `warnings.js`, `overlay.js runVideo()`, `print.js askManySheets()`, `projects.js deleteProjectWithUndo()`, `site/404.html`). A read-only script (`scratchpad/copy-review/check.mjs`) then parsed the copy file the way `tools/build-strings.mjs` does and compared it with the generated `strings.js`: 560 keys on both sides, exactly 19 values differ, no dash, no broken table row, and the copy assertions of `tests/ws6.test.mjs` and `tests/ws3.test.mjs` hold on the new values.

---

## 2. Every key changed

| # | Key | Old | New | Why |
|---|---|---|---|---|
| 1 | `editor.status.failed.aria` | השמירה נכשלה. פרטים בפס האדום. | לא נשמר. פרטים בפס האדום. | The failed status is now a button that shows "לא נשמר" (R39, WS1 1.24). Its name did not hold those words, against the file's own rule (WCAG 2.5.3, section 0). Now it starts with them, and it is shorter. |
| 2 | `conflict.body` | כדי לא לדרוס את הגרסה החדשה, מכאן אי אפשר לשמור. | כדי לא למחוק את הגרסה החדשה, אי אפשר לשמור מכאן. אם תטענו אותה, מה שציירתם כאן ייעלם. אפשר להוריד אותו קודם כקובץ. | The two-tabs dialog did not say what the primary button costs: `reloadDocument()` drops this tab's unsaved drawing. Now it says so, and gives the order that keeps it (download first; the dialog stays open after the download). "לדרוס" is "run over" to a young reader, so "למחוק". |
| 3 | `storage.blocked.toast` | הדפדפן חוסם את השמירה במכשיר, אז הפעולה לא בוצעה. | אי אפשר לעשות את זה כאן: הדפדפן חוסם את השמירה במכשיר. | "הפעולה לא בוצעה" is passive office Hebrew. The new line has the shape the app already uses ("אי אפשר להוסיף: ...", "אי אפשר להחזיר את הפריים: ...") and still fits every blocked action (new animation, lesson, challenge, starter, backup, import). The W0 banner on Home, the Gallery and Settings carries the way out ("נסו בחלון רגיל או בדפדפן אחר"). |
| 4 | `import.none.one` | הפרויקט הזה כבר כאן. שום דבר לא השתנה. | הפרויקט הזה כבר כאן, אז הוא לא יובא שוב. | `reportImport()` can put the line "החותמות שבגיבוי נוספו" right under this one (nothing imported, but new stamps merged). "Nothing changed" was then false. The new line speaks only about projects and matches `import.skipped.*`. |
| 5 | `import.none.other` | כל הפרויקטים בקובץ כבר כאן. שום דבר לא השתנה. | הפרויקטים שבקובץ כבר כאן, אז הם לא יובאו שוב. | Same reason. "כל" is dropped because a damaged-entry line ("פרויקט אחד בקובץ פגום ולא יובא") can follow it. |
| 6 | `import.clash.one` | כבר יש כאן פרויקט של אותו שיעור או אתגר, אז הוא יובא כעותק חופשי | כבר יש כאן פרויקט של אותו שיעור או אתגר, אז החדש יובא כעותק חופשי | "הוא" pointed at the project that is already here. "החדש" names the imported one, and pairs with "הישן" in row 13. |
| 7 | `import.clash.other` | {n} פרויקטים של שיעור או אתגר שכבר יש כאן יובאו כעותקים חופשיים | {n} פרויקטים יובאו כעותקים חופשיים, כי לשיעור או לאתגר שלהם כבר יש כאן פרויקט | It was unclear what "שכבר יש כאן" belonged to. Now: what happened, then why. |
| 8 | `import.frames.blank.one` | פריים אחד בקובץ לא נקרא ויובא ריק | פריים אחד בקובץ פגום ויובא ריק | Without niqqud "לא נקרא" also reads "is not called". "פגום" is the word `import.bad.*` already uses for the same kind of fault. |
| 9 | `import.frames.blank.other` | {n} פריימים בקובץ לא נקראו ויובאו ריקים | {n} פריימים בקובץ פגומים ויובאו ריקים | Same. |
| 10 | `import.stopped` | הייבוא נעצר. יובאו {n} מתוך {total} פרויקטים. | הייבוא נעצר. יובאו {n} מתוך {total} פרויקטים. נסו שוב בעוד רגע. | It did not say what to do next. A second import of the same file skips what is already here (same id and same `updatedAt`), so trying again is the right step. Same closing words as `storage.failed.toast`. |
| 11 | `import.error.unreadable.one` | הפריים שבקובץ פגום ולא נקרא. שום דבר לא השתנה. | הקובץ פגום: אי אפשר לקרוא את הפריים שבו. שום דבר לא השתנה. | Opens with "הקובץ", like its two siblings `import.error.invalid` and `.newer`; no "נקרא". |
| 12 | `import.error.unreadable.other` | {n} הפריימים שבקובץ פגומים ולא נקראו. שום דבר לא השתנה. | הקובץ פגום: אי אפשר לקרוא את הפריימים שבו. שום דבר לא השתנה. | The row WS1 flagged as stiff. The count of damaged frames tells the child nothing, so `{n}` is no longer in the text (the code may keep passing it; `t()` ignores unused values). |
| 13 | `delete.restoredAsCopy` | בינתיים נוצר פרויקט חדש לשיעור הזה, אז הישן חזר כעותק חופשי | בינתיים נוצר פרויקט חדש לאותו שיעור או אתגר, אז הישן חזר כעותק חופשי | `deleteProjectWithUndo()` returns `asCopy` for a challenge project too, and then "לשיעור הזה" was wrong. |
| 14 | `challenge.stamp.toast` | קיבלתם חותמת על האתגר של השבוע | קיבלתם חותמת על האתגר | `afterSave()` records the stamp for the project's own week, which can be an older one (WS3 flagged it). "של השבוע" was then untrue. |
| 15 | `toast.frameDeleted.aria` | פריים {n} נמחק. אפשר להחזיר אותו, גם עם Ctrl+Z | פריים {n} נמחק. אפשר להחזיר אותו, גם עם Ctrl+Z. | Two sentences end with a period everywhere else (audit C-20). |
| 16 | `export.video.retrying` | ההקלטה הראשונה יצאה חלקית. מקליטים שוב. | ההקלטה הראשונה לא הצליחה. מקליטים שוב. | `runVideo()` retries after a short file and after an empty one. "חלקית" was wrong for an empty file, and it is a heavier word than "לא הצליחה". |
| 17 | `export.error.videoShort` | הווידאו יצא חלקי. נסו שוב, או הכינו GIF. | הווידאו לא יצא שלם. נסו שוב, או הכינו GIF. | "לא שלם" is the plain way to say "חלקי". |
| 18 | `print.confirm.many.body` | זה הרבה נייר, וההכנה יכולה לקחת כמה דקות. כדאי להוריד PDF ולבדוק אותו לפני שמדפיסים. | זה הרבה נייר, וההכנה יכולה לקחת זמן. כדאי להוריד PDF ולבדוק אותו לפני שמדפיסים. | "כמה דקות" is a figure nobody measured: no workstream file gives a time for preparing the print sheets, and the dialog opens from 17 sheets up to 180. "זמן" makes no claim about how long. |
| 19 | `page404.body` | אולי הכתובת נכתבה עם טעות. הציורים שלכם נשארו שמורים במכשיר. | אולי יש טעות בכתובת. שום דבר לא נמחק. | The 404 page is static and cannot check what is saved, so it now says only what is always true, in the words `storage.readFailed.body` already uses. "יש טעות בכתובת" does not claim that anyone typed the address; the page also shows after a tap on a broken link. |

---

## 3. What a Developer has to do with this

1. **Regenerate:** `node tools/build-strings.mjs`, then the unit tests. No key was added, removed or renamed; only `import.error.unreadable.other` lost a placeholder (`{n}`), which needs no code change.
2. **`site/404.html`, by hand:** the `<p>` under the `<h1>` must read "אולי יש טעות בכתובת. שום דבר לא נמחק." (row 19). The other four 404 texts are unchanged. The inline script and its hash are not touched by this.
3. **Look at five longer texts in their containers** after regenerating, at 320px: the conflict dialog (body went from 48 to 114 characters, three short sentences), and the toasts `storage.blocked.toast` (49 to 54), `import.stopped` (45 to 63), `import.clash.other` (63 to 77), `delete.restoredAsCopy` (59 to 68). None has a line limit in the notes, and toasts and dialog bodies wrap, but nobody has seen these on a screen yet.
4. **Scratch scripts that match old words:** any workstream script that waits for the exact old text of a row above (for example the blocked-storage toast in WS1's and the integrator's scripts, or "2 הפריימים שבקובץ פגומים" in WS1's 1.15) needs the new words. The committed unit tests do not pin any of the 19.

---

## 4. Looked at closely and kept, with the reason

| Row | Kept because |
|---|---|
| The five WS6 rows that differ from the audit (`common.back.gallery.aria`, `common.back.challenge.aria`, `onion.toggle.on/off.aria`, `tool.undo/redo.disabled.aria`, the two limits in section 0) | The six Back names follow one pattern, "label, חזרה ל[full screen name]", and five of them repeat their own word the same way ("לשיעור, חזרה לדף השיעור"); changing one would break the pattern. `tests/ws6.test.mjs` also requires each to start with its label. The onion name keeps its state word because `editor.js` also uses the same string as the announcement for the O key. The disabled names are R38's own text. The limits are R39 and R40; the stale "7 or fewer, one word" line in the Notes was corrected to match them. |
| `conflict.title`, `conflict.reload`, `conflict.download` | True, short, and the two buttons say what they do. "לשונית" is the word `settings.undoNote` already uses. |
| `w0.title`, `w0.body` | Says what is wrong, what it means ("מה שתציירו כאן לא יישמר"), and what to do. Nothing to add. |
| `storage.readFailed.*`, `editor.loadFailed.title`, `storage.failed.toast` | R4's own wording ("nothing was deleted", with a retry). A read that fails is not a delete, so the reassurance is true. |
| `w3.left` | Message plus its button "להוריד קובץ" is the same pair as the W3 strip in the Editor. One pattern for one problem. |
| `import.partial` | True for every count, and W2b opens right after it with the way out. |
| `settings.shortcuts.label` | "אות אחת" is slightly narrow (the digits 1, 2, 3 are switched off too), but "מקש אחד" would clash with the hint, which says Space and the arrows always work. |
| Save status "שומרים…", "נשמר", "לא נשמר" | R39. |
| `page404.h1`, `.title`, `.description` | "דף" also names the canvas, which is why the body line now says that nothing was deleted. |

---

## 5. Noticed, not copy, not changed

- **`reportImport()` with nothing imported and a damaged entry:** the main line says the projects in the file are already here, and the line under it says one is damaged. The new wording of rows 4 and 5 keeps this readable; a fully exact message would need a branch in the code.
- **`tool.undo.aria` and `tool.redo.aria`** ("צעד אחורה: ...", "צעד קדימה: ...") contain the visible word but do not start with it, while section 0 says "always starts with". They are my own audit text and R38 points at that table, so they stay; WCAG 2.5.3 asks only that the name contains the label.
- **`import.stopped` and copies:** a retry after a stop re-imports as a second copy any project that was already imported as a copy in the first run (its new id no longer matches the file). Rare, visible, and deletable; said here so nobody is surprised.
- **`final-lessons.md`, line 25:** the "Where each field shows" table still quotes the heading as "מה זה" without the question mark. It is a note, not a string; left alone because no lesson string is wrong.

---

**בדיקת עברית:** 8/8 items walked on the 19 corrected strings and on every kept new key. Two kinds of issue fixed: translated or office Hebrew ("הפעולה לא בוצעה", "לדרוס") and abstract or passive wording ("יצאה חלקית", "לא נקרא", "נכתבה עם טעות"). Two checks clean: "גם" appears in five strings, each before the words it stresses; every instruction is plural, every button an infinitive, every `.one` and `.other` pair agrees with its noun. Kill-table walked row by row on the new text: no corporate words, no hype, no "מקצה לקצה". No em or en dash in either copy file (checked by script).
