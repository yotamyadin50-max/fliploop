## Copy: ui-copy (all FlipLoop UI strings except the 12 lesson bodies)

**Channel:** in-app microcopy, Hebrew RTL, 8 screens + 1 overlay · **Goal:** get a stranger from Home to a moving drawing in 60 seconds, keep every data-safety moment calm and clear, and give the Developer one paste-ready key/value set.

**Handoff synthesis (Round 19):** The brief says this is a Low/Feel product: lead with the moment the drawing moves, keep every explanation to 1 or 2 lines. The plan fixes every screen, state and sample string, and Part C plus the Build Manager kickoff bind the containers (Back labels 7 chars, one-word status, 16-char themes, one-line coach marks, a 2-line W3 and W5) and ask for one addressing form in both deliverables. Four real tensions, each resolved toward the binding file: (1) the plan's samples use the masculine singular ("צייר", "הוסף"), and `hebrew-writing-skill.md` rule 6 says that silently excludes half the readers, so I chose one gender-covering system (below) and rewrote every sample into it; (2) Back "לשיעורים" is 8 chars against the 7-char limit, so it becomes "למסלול", with the full destination in its aria-label; (3) status "לא נשמר" is two words against the one-word rule, so it becomes "נכשל", and the red W3 strip beside it carries the meaning; (4) the plan's GIF line "הכי נוח לשליחה בוואטסאפ" is a superlative, so it becomes the concrete "תמונה שזזה, לשליחה בוואטסאפ".

**Checklist walkthrough (Round 18):** 26/26 walked. Legitimate skips, named: 2 (one CTA per page, set by the plan, copy only labels it), 3 (no marketing headline), 4 (nothing is sold), 13 (not content marketing), 16 (no email), 17 (no push; the plan has no notifications), 19 (no paywall), 20 (not an informational page), 26 (the copy makes no claim about who made it). Items checked with a result: 1 and 7 (every claim is a mechanism or number from the plan: 120 frames, 50 undo steps, 7 days, 8 cards per sheet, "nothing leaves the device" narrowed to "the drawings" because Google Fonts is a network call); 5 and 25 (plural imperative, verbs, no nominalized chains); 8 and 11 (no cliché, no AI-tell words; Hebrew kill-table walked row by row); 10 (no Cialdini lever used); 12 (the researcher's "moves for the first time" angle drives the first-Play line); 14 (strings are one to two short lines; the few multi-sentence strings alternate a short and a longer sentence); 15 (coach marks triaged: one job each); 18 (coach marks: dream on Home, plain instruction on coach 1 and 2, nearly silent on coach 3); 21 (warnings are calm and plain, the celebration lives only in first Play and stamps); 22 (pattern break: the first-Play line calls the drawing a film, tying to the strip); 23 (synthesis above); 24 (13-year-old gut check passed on every sentence). The 3-second check ran after this: 3/3.

---

## 0. Conventions (read before pasting)

**Addressing form, identical in `ui-copy` and `lessons`:**

| Where | Form | Example |
|---|---|---|
| Sentences that tell the user to do something | plural imperative | "ציירו משהו", "נסו GIF" |
| Action buttons and menu actions | infinitive (no person, no gender) | "להתחיל לצייר", "להוריד PNG", "למחוק" |
| Tool names, screen names, section headings | noun | "עיפרון", "ייצוא", "שכבת בצל" |
| The user's own things | first person "שלי" (matches the plan's "העבודות שלי") | "האתגרים שלי", "להפוך לפרויקט שלי" |
| Back controls | "ל" + destination, max 7 chars | "לגלריה" |
| Fixed exceptions | "ביטול" (Cancel / Undo tool), "הבנתי" (first person, gender neutral) | |

**Placeholders:** `{like_this}`. Numbers, fps, percentages, sizes and counters go inside a `dir="ltr"` isolate (`.num`), per Part B. `{lessonName}` and `{goal}` come from `lessons.js` (the lessons deliverable).

**Plurals:** keys ending `.one` / `.two` / `.other`. Use `.one` for 1, `.two` for 2 where given, `.other` for everything else.

**Vocabulary locked for `lessons` to reuse:** פריים / פריימים, פריים מוכן (locked key frame), פריים ריק, רמזים, הפעלה / עצירה (Play / Stop), החזקה (hold), שכבת בצל (onion skin), לולאה / הלוך ושוב, חותמת, הדף (the canvas).

**Punctuation:** no em or en dashes anywhere. "·" (middle dot) separates fields. A plain hyphen appears only after a one-letter prefix before Latin text or digits ("ב-FlipLoop", "כ-PDF", "ל-4:3").

**Limits** (from `04b-build-manager-kickoff.md`): Back 7 chars; status 1 word; coach mark 1 line (about 24 chars in the 240px bubble); W2 1 line incl. %; W3 2 lines beside its button; W5 2 lines; export card 1 Muted line; themes 16 chars; lesson goal 28 chars and lesson name 24 chars (lessons deliverable).

---

## 1. Page title, meta, manifest

| Key | Hebrew / text | Where / notes |
|---|---|---|
| `meta.title.home` | FlipLoop | `<title>` on Home |
| `meta.title.pattern` | FlipLoop · {screen} | `<title>` on every other screen |
| `meta.title.editor` | {title} | `{screen}` in the Editor (project title) |
| `meta.title.export` | ייצוא | |
| `meta.title.print` | גיליון הדפסה | |
| `meta.title.lessons` | שיעורים | |
| `meta.title.lesson` | {lessonName} | |
| `meta.title.challenge` | האתגר של השבוע | |
| `meta.title.gallery` | העבודות שלי | |
| `meta.title.settings` | שמירה והגדרות | |
| `meta.title.notFound` | לא נמצא | |
| `meta.description` | ציירו כמה פריימים ותראו אותם זזים. 12 שיעורי אנימציה, אתגר שבועי, ייצוא ל-GIF, לווידאו ולגיליון הדפסה. בלי הרשמה, והציורים נשמרים רק במכשיר שלכם. | `<meta name="description">`, about 150 chars |
| `meta.og.title` | FlipLoop | `og:title` |
| `meta.og.description` | ציירו כמה פריימים ותראו אותם זזים. בלי הרשמה. | `og:description` |
| `meta.og.imageAlt` | שולחן אור ועליו ספרון דפדוף עם דמות קטנה שמנופפת | `og:image:alt` |
| `manifest.name` | FlipLoop | |
| `manifest.shortName` | FlipLoop | |
| `manifest.description` | ציירו פריים אחרי פריים ותראו את הציור זז. | |
| `manifest.shortcut.new` | אנימציה חדשה | → `#/new` |
| `manifest.shortcut.challenge` | האתגר של השבוע | → `#/challenge` (the plan wrote "האתגר השבועי"; aligned with the Home button so the same thing has one name) |
| `manifest.screenshot.narrowHome` | ציירו כמה פריימים ותראו אותם זזים | Install-dialog screenshot label, phone, Home (PWA pass) |
| `manifest.screenshot.narrowEditor` | עורך האנימציה עם רצועת הפריימים | Phone, Editor |
| `manifest.screenshot.wideEditor` | עורך האנימציה במחשב | Wide, Editor |
| `manifest.screenshot.wideHome` | שולחן האור של FlipLoop | Wide, Home |

---

## 2. Common (used on several screens)

| Key | Hebrew | Where / notes |
|---|---|---|
| `common.back.home` | לבית | Back on Lessons, Challenge, Gallery, Settings (4 chars) |
| `common.back.home.aria` | חזרה לדף הבית | |
| `common.back.gallery` | לגלריה | Back in Editor (free) (6) |
| `common.back.gallery.aria` | חזרה לעבודות שלי | |
| `common.back.challenge` | לאתגר | Back in Editor (challenge), goes to `#/challenge` (5). Added Critic round (F7) |
| `common.back.challenge.aria` | חזרה לאתגר של השבוע | |
| `common.back.lesson` | לשיעור | Back in Editor (lesson mode) (6) |
| `common.back.lesson.aria` | חזרה לדף השיעור | |
| `common.back.lessons` | למסלול | Back on Lesson detail (6). Replaces "לשיעורים" (8 chars, over the limit) |
| `common.back.lessons.aria` | חזרה לכל השיעורים | |
| `common.back.editor` | לציור | Back on Print (5) |
| `common.back.editor.aria` | חזרה לעריכת {title} | |
| `common.cancel` | ביטול | |
| `common.close` | לסגור | aria-label of every X / dismiss |
| `common.gotIt` | הבנתי | |
| `common.undo` | ביטול | Action text inside 5 s undo toasts |
| `common.save` | לשמור | |
| `common.loading` | טוען… | Generic loading text |
| `common.error.generic` | משהו השתבש. נסו שוב. | Fallback for any unexpected error |
| `common.kind.lesson` | שיעור | Kind chip on Gallery cards |
| `common.kind.challenge` | אתגר | Kind chip on Gallery cards |
| `common.frames.one` | פריים אחד | |
| `common.frames.other` | {n} פריימים | |
| `common.newProject` | אנימציה חדשה | Same label on Home, Gallery, Not found, manifest |
| `common.defaultTitle` | האנימציה שלי {n} | Default project title, e.g. "האנימציה שלי 3". {n} = count of free projects + 1, raised until the title is unique. Changed Critic round (F8), was "אנימציה חדשה {d}.{m}" |
| `common.copySuffix` | {title} (עותק) | Title of a duplicate or "הפוך לפרויקט שלי" copy. Truncate `{title}` so the total stays at 40 chars |

---

## 3. Home (`#/`)

| Key | Hebrew | Where / notes |
|---|---|---|
| `home.nav.gallery` | העבודות שלי | Header link, left |
| `home.nav.settings` | שמירה והגדרות | Header link, left |
| `home.nav.install` | להתקין | Header link at the start, shown only while the browser offers install (PWA pass) |
| `home.nav.install.aria` | להתקין את FlipLoop | |
| `home.h1` | FlipLoop | Display H1 |
| `home.subtitle` | ציירו כמה דפים ותראו אותם זזים. בלי הרשמה. | Muted subtitle. Uses "דפים" (the flipbook's pages), not "פריימים", because "פריים" is taught at coach mark 2 |
| `home.cta.new` | אנימציה חדשה | Primary, → `#/new` |
| `home.cta.new.aria` | אנימציה חדשה: פותח דף ציור ריק | |
| `home.cta.lessons` | שיעורים | Secondary card, line 1 |
| `home.cta.lessons.progress` | {done}/12 | Secondary card, line 2, beside the stamp glyph |
| `home.cta.lessons.aria` | שיעורים, {done} מתוך 12 הושלמו | |
| `home.cta.challenge` | האתגר של השבוע | Secondary card, line 1 |
| `home.cta.challenge.theme` | {theme} | Secondary card, line 2 (Muted) |
| `home.cta.challenge.aria` | האתגר של השבוע: {theme} | |
| `home.continue` | המשך: {title} | Tertiary link, only if a project exists |
| `home.continue.aria` | להמשיך לעבוד על {title} | |

---

## 4. Coach marks and first Play (Editor, first session)

| Key | Hebrew | Where / notes |
|---|---|---|
| `coach.1` | ציירו משהו | At the canvas, frame 1 empty (10 chars) |
| `coach.2` | הוסיפו פריים וציירו הלאה | At "+", after the first stroke. Teaches the word "פריים" (24 chars) |
| `coach.3` | עכשיו לחצו על הפעלה | At Play, after frame 2 has a stroke (19 chars) |
| `coach.close.aria` | לסגור את הטיפ | 44px close |
| `firstPlay.line` | הציור שלכם הפך לסרט. | **New line, requested in the spawn prompt; the plan has no text for first Play.** Shown once (`firstPlaySeen`), in the coach-mark bubble style above the gate at t = 360ms, fades out after 2.5 s, never blocks, also sent to the polite live region. Reduced motion: appears and fades by opacity only |

---

## 5. Editor: top bar, headings, save status

| Key | Hebrew | Where / notes |
|---|---|---|
| `editor.h1.hidden` | {title} | Visually hidden H1 |
| `editor.h2.canvas` | דף הציור | Visually hidden H2 |
| `editor.h2.tools` | כלים | Visually hidden H2 |
| `editor.h2.frames` | פריימים | Visually hidden H2 |
| `editor.h2.playback` | ניגון | Visually hidden H2 |
| `editor.title.aria` | שם הפרויקט | Editable title field |
| `editor.title.hint` | עד 40 תווים | aria-describedby |
| `editor.export` | ייצוא | Top bar button |
| `editor.export.aria` | ייצוא: GIF, וידאו, הדפסה או קובץ פרויקט | |
| `editor.status.saving` | שומר… | One word |
| `editor.status.saved` | נשמר | One word |
| `editor.status.failed` | נכשל | One word. Replaces the plan's two-word "לא נשמר"; opens W3 |
| `editor.status.failed.aria` | השמירה נכשלה. פרטים בפס האדום | |
| `editor.canvas.aria` | דף ציור, פריים {n} מתוך {total} | |
| `editor.canvas.playing.aria` | מתנגן. הקשה על הדף עוצרת | While Playing |

---

## 6. Editor: tool row (phone) and tool rail (desktop)

Tooltips show on desktop hover and keyboard focus. The shortcut letter sits in parentheses, inside an LTR isolate.

| Key | Label | aria-label | Tooltip |
|---|---|---|---|
| `tool.pencil` | עיפרון | עיפרון, {width} | עיפרון (B). הקשה נוספת: עובי |
| `tool.pencil.s` | דק | עיפרון דק, 2 פיקסלים | דק (1) |
| `tool.pencil.m` | בינוני | עיפרון בינוני, 5 פיקסלים | בינוני (2) |
| `tool.pencil.l` | עבה | עיפרון עבה, 10 פיקסלים | עבה (3) |
| `tool.pencil.sheet` | עובי העיפרון | (sheet title) | |
| `tool.eraser` | מחק | מחק, {width} | מחק (E). הקשה נוספת: עובי |
| `tool.eraser.sheet` | עובי המחק | (sheet title) | |
| `tool.fill` | מילוי | מילוי בצבע | מילוי (G). ממלא שטח סגור בפריים הזה |
| `tool.color` | צבע | הצבע הנוכחי: {colorName} | צבע: {colorName} |
| `tool.undo` | ביטול | ביטול הצעד האחרון | ביטול (Ctrl+Z) |
| `tool.undo.disabled` | | אין מה לבטל | אין מה לבטל |
| `tool.redo` | שחזור | שחזור הצעד שבוטל | שחזור (Ctrl+Shift+Z) |
| `tool.redo.disabled` | | אין מה לשחזר | אין מה לשחזר |
| `tool.more` | עוד | עוד כלים | הזזה, שכבת בצל, גודל הדף, ניקוי |

**Width names for `{width}`:** `tool.width.s` דק · `tool.width.m` בינוני · `tool.width.l` עבה.

---

## 7. Editor: "More" sheet (phone) and left panel (desktop)

| Key | Hebrew | Where / notes |
|---|---|---|
| `more.title` | עוד כלים | Sheet title |
| `more.move` | הזזה | Move tool |
| `more.move.tooltip` | הזזה (V). גוררים את כל הציור בפריים | |
| `more.move.hint` | מה שיוצא מהדף נחתך. ביטול מחזיר אותו | Helper under Move, 1 line |
| `onion.title` | שכבת בצל | Section title (sheet and desktop panel) |
| `onion.hint` | הפריים הקודם באדום, הבא בכחול, מתחת לציור | Helper, 1 line |
| `onion.toggle` | שכבת בצל | Switch label |
| `onion.toggle.tooltip` | שכבת בצל (O) | |
| `onion.toggle.on.aria` | שכבת בצל פועלת | |
| `onion.toggle.off.aria` | שכבת בצל כבויה | |
| `onion.prev` | קודמים (אדום) | Count control, 0 to 2 |
| `onion.prev.aria` | כמה פריימים קודמים להראות: {n} | |
| `onion.next` | הבאים (כחול) | Count control, 0 to 2 |
| `onion.next.aria` | כמה פריימים הבאים להראות: {n} | |
| `canvasSize.title` | גודל הדף | Section title |
| `canvasSize.wide` | 4:3 | Option (480×360) |
| `canvasSize.wide.aria` | רחב, 480 על 360 | |
| `canvasSize.square` | ריבוע | Option (360×360) |
| `canvasSize.square.aria` | ריבוע, 360 על 360 | |
| `clearFrame` | ניקוי הפריים | Action |
| `clearFrame.aria` | למחוק את כל הציור בפריים הזה | |

---

## 8. Colors (swatch sheet / desktop panel)

| Key | Hebrew | Notes |
|---|---|---|
| `colors.title` | צבעים | Sheet / panel title |
| `colors.picker` | צבע אחר | Native color input label |
| `colors.picker.aria` | לבחור צבע אחר | |
| `colors.recent.aria` | הצבע האחרון שבחרתם | 13th chip |
| `colors.selected.aria` | {colorName}, נבחר | |
| `color.1` | שחור | #1F1E1B |
| `color.2` | אפור | #7A766E |
| `color.3` | לבן | #FFFFFF |
| `color.4` | אדום | #E23B2E |
| `color.5` | כתום | #F28C28 |
| `color.6` | צהוב | #F5C518 |
| `color.7` | ירוק | #2E9E4F |
| `color.8` | טורקיז | #1F9E9A |
| `color.9` | כחול | #2F6BDB |
| `color.10` | סגול | #7A4BC9 |
| `color.11` | ורוד | #E8619A |
| `color.12` | חום | #8A5A3B |
| `color.custom` | צבע משלי | `{colorName}` for a custom color |

**Shade palette (added 2026-09-30, spec `_process/03d`).** Hue names reuse `color.2` and `color.4..12`; all ten are masculine, so the tone words agree. `{n}` is a digit 1 to 7 in a `.num` isolate.

| Key | Hebrew | Notes |
|---|---|---|
| `colors.shades.more` | עוד גוונים | Toggle label, phone and desktop. Noun label beside "צבע אחר"; state comes from `aria-expanded` |
| `colors.shades.title` | כל הגוונים | Desktop popover title, and the palette group's aria-label |
| `colors.shades.recent` | בחרתם לאחרונה | Caption above the recent row, and that row's group aria-label. Not "אחרונים": inside a light-to-dark chart that reads as "the last (darkest) shades" |
| `shade.name` | {colorName} {n} | Tooltip and `colorName()` result for a non-base tile ("כחול 6"); tool key reads "צבע: כחול 6". Base cell uses the plain hue name |
| `shade.aria` | {colorName} {tone}, גוון {n} מתוך 7 | Tile aria-label ("כחול כהה, גוון 6 מתוך 7"). Base cell's label is the plain hue name |
| `shade.tone.light` | בהיר | `{tone}` for steps before the base |
| `shade.tone.dark` | כהה | `{tone}` for steps after the base |

---

## 9. Film strip and frame menu

| Key | Hebrew | Where / notes |
|---|---|---|
| `strip.frame.aria` | פריים {n} מתוך {total} | Thumbnail accessible name |
| `strip.frame.current.aria` | , נבחר | Appended to the current frame |
| `strip.frame.hold.aria` | , מוחזק ×{hold} | Appended when hold > 1 |
| `strip.frame.key.aria` | , פריים מוכן, נעול | Appended on lesson key frames |
| `strip.frame.blank.aria` | , פריים ריק לציור | Appended on lesson blanks still empty |
| `strip.hold.badge` | ×{hold} | Lamp chip on the cell |
| `strip.add` | + | Visible glyph |
| `strip.add.aria` | פריים חדש | |
| `strip.add.tooltip` | פריים חדש (N) | |
| `strip.counter` | {n}/120 | Muted-on-film counter |
| `strip.counter.aria` | {n} פריימים מתוך 120 | |
| `strip.reorder.hint` | לחיצה ארוכה וגרירה כדי להזיז פריים | Tooltip on thumbnails (desktop) and first long-press |
| `strip.reorder.done.aria` | פריים {from} עבר למקום {to} | Live region |
| `frameMenu.title` | פריים {n} | Sheet / popover title |
| `frameMenu.duplicate` | לשכפל | |
| `frameMenu.duplicate.tooltip` | לשכפל (D) | |
| `frameMenu.insertBlank` | פריים ריק אחרי זה | |
| `frameMenu.hold` | החזקה | Control label, ×1 to ×12 |
| `frameMenu.hold.hint` | כמה זמן הפריים נשאר על המסך | Helper, 1 line |
| `frameMenu.hold.value.aria.one` | החזקה ×1: אורך רגיל | Default value |
| `frameMenu.hold.value.aria.other` | החזקה ×{hold}: הפריים נשאר על המסך פי {hold} | ×2 to ×12 |
| `frameMenu.delete` | למחוק | |
| `frameMenu.delete.disabled` | צריך לפחות פריים אחד | Reason when only 1 frame exists |

---

## 10. Playback bar (LTR island; Hebrew labels keep `dir="rtl"`)

| Key | Hebrew | Where / notes |
|---|---|---|
| `play.play` | הפעלה | Play label |
| `play.play.aria` | הפעלה (רווח) | |
| `play.stop` | עצירה | Stop label (the icon turns to ■) |
| `play.stop.aria` | עצירה (רווח) | |
| `play.play.disabled` | צריך לפחות 2 פריימים | Tooltip when there is 1 frame |
| `play.prev` | פריים קודם | aria-label |
| `play.prev.tooltip` | פריים קודם (חץ שמאלה) | Key names spelled out, so no arrow points against the text |
| `play.next` | פריים הבא | aria-label |
| `play.next.tooltip` | פריים הבא (חץ ימינה) | |
| `play.fps.label` | מהירות | Group label |
| `play.fps.tooltip` | פריימים בשנייה | |
| `play.fps.option` | {fps} | Segment text: 6, 12, 24 |
| `play.fps.option.aria` | {fps} פריימים בשנייה | |
| `play.mode.loop` | לולאה | Toggle state |
| `play.mode.pingpong` | הלוך ושוב | Toggle state |
| `play.mode.aria` | מצב ניגון: {mode} | |
| `play.mode.tooltip` | לולאה: מההתחלה שוב. הלוך ושוב: קדימה ואחורה | |
| `play.gate.label` | {n}/{total} | Gate counter during Play |
| `play.started.aria` | מתנגן, {fps} פריימים בשנייה | Live region |
| `play.stopped.aria` | נעצר בפריים {n} | Live region |

---

## 11. Lesson mode in the Editor, and the completion sheet

| Key | Hebrew | Where / notes |
|---|---|---|
| `lessonMode.chip` | שיעור {n} | Ink chip in the goal strip |
| `lessonMode.goal` | {goal} | From `lessons.js`, max 28 chars |
| `lessonMode.progress` | {done}/{total} צוירו | e.g. "3/6 צוירו" |
| `lessonMode.progress.aria` | {done} מתוך {total} פריימים ריקים צוירו | |
| `lessonMode.hints` | רמזים | Switch label (lessons 2, 6, 7, 10 only) |
| `lessonMode.hints.on.aria` | רמזים מוצגים | |
| `lessonMode.hints.off.aria` | רמזים מוסתרים | |
| `lessonMode.keyFrame` | זה פריים מוכן. ציירו בפריימים הריקים | Toast when drawing on a locked key frame |
| `lessonMode.lock.aria` | פריים מוכן, נעול | Lock chip on the canvas |
| `lessonMode.addDisabled` | בשיעור מספר הפריימים קבוע | Tooltip on disabled "+", delete, reorder |
| `lessonMode.holdDisabled` | בשיעור הזה אין החזקה | Hold control disabled (all lessons except 9) |
| `lessonMode.nudgePlay` | כל הפריימים צוירו. לחצו על הפעלה כדי לסיים | Toast once, when every blank is filled but Play was not pressed yet |
| `lessonDone.title` | קיבלתם חותמת | Completion sheet title |
| `lessonDone.body` | שיעור {n}: {lessonName} | Line under the stamp |
| `lessonDone.stamp.aria` | חותמת על שיעור {n}, {lessonName} | |
| `lessonDone.next` | לשיעור הבא | Primary |
| `lessonDone.last` | לכל השיעורים | Primary after lesson 12 (no next lesson) |
| `lessonDone.keepDrawing` | להמשיך לצייר | Secondary |
| `lessonDone.makeMine` | להפוך לפרויקט שלי | Tertiary |
| `lessonDone.makeMine.hint` | עותק חופשי, בלי פריימים נעולים. החותמת נשארת | Helper under tertiary |
| `lessonDone.unlock` | חדש בגלריה: להתחיל מ{starter} | Shown only when this lesson unlocks a starter for the first time. `{starter}` from §20 |
| `lessonDone.madeMine.toast` | נוצר עותק: {title} | After "להפוך לפרויקט שלי" |

---

## 12. Editor states: loading, not found

| Key | Hebrew | Where / notes |
|---|---|---|
| `editor.loading` | טוען את הציור… | Loading state (skeleton strip), also aria-busy text |
| `notFound.title` | הפרויקט לא נמצא במכשיר הזה | Editor and Print, id not on this device |
| `notFound.body` | פרויקטים נשמרים רק בדפדפן שבו יצרתם אותם. יש לכם קובץ פרויקט? אפשר לייבא אותו בגלריה. | |
| `notFound.gallery` | לגלריה | Button |
| `notFound.new` | אנימציה חדשה | Button |

---

## 13. Warnings W1 to W5 (plus W2b)

| Key | Hebrew | Where / notes |
|---|---|---|
| `w1.title` | העבודות שמורות רק בדפדפן הזה | Banner, Home and Gallery |
| `w1.body` | יש דפדפנים שמוחקים אותן אחרי שבוע בלי כניסה. קובץ גיבוי שומר עליהן. | "שבוע" traces to Safari's 7-day rule in the brief; "יש דפדפנים" keeps it true for Chrome |
| `w1.action` | לשמור גיבוי | Secondary button; downloads the full backup |
| `w1.dismiss.aria` | לסגור את ההודעה | |
| `w2.text` | האחסון במכשיר כמעט מלא ({percent}%) | Editor top-bar strip and Gallery, 1 line |
| `w2.action` | לגלריה | Button in the Editor strip only. In the Gallery the banner shows `w2.text` plus `w2.gallery.hint` and no "לגלריה" button (it would point to the current screen) |
| `w2.action.aria` | לגלריה, כדי לשמור ולמחוק עבודות ישנות | |
| `w2.gallery.hint` | כדי לפנות מקום: להוריד קובץ פרויקט, ואז למחוק עבודות ישנות. | Gallery version of the banner, second line |
| `w2b.title` | האחסון מלא | Modal, when adding a frame or a project |
| `w2b.body` | אין מקום לפריימים או לפרויקטים חדשים. את מה שכבר יש אפשר עדיין לצייר ולייצא. | |
| `w2b.hint` | כדי לפנות מקום, שמרו קובץ פרויקט ומחקו עבודות ישנות בגלריה. | |
| `w2b.action` | לשמור קובץ פרויקט | Primary |
| `w2b.gallery` | לגלריה | Secondary |
| `w2b.close` | לסגור | Tertiary |
| `w3.text` | השמירה נכשלה. הציור פתוח כאן, אבל לא שמור. | Red strip, 2 lines max beside its button. Tightened from the plan's 3 sentences |
| `w3.action` | להוריד קובץ | Button beside the strip (short, to fit) |
| `w3.action.aria` | להוריד קובץ פרויקט עכשיו | Built from memory, works without IndexedDB |
| `w3.retry.aria` | מנסים לשמור שוב כל 10 שניות | aria-describedby on the strip |
| `w3.recovered` | השמירה חזרה לעבוד | Toast when a save succeeds after W3 |
| `w4.remaining.one` | נשאר פריים אחד | Warn chip, at 119 |
| `w4.remaining.other` | נשארו {n} פריימים | Warn chip, 100 to 118 (100 shows "נשארו 20 פריימים") |
| `w4.max` | 120 פריימים, זה המקסימום | At 120 |
| `w4.add.disabled` | אי אפשר להוסיף: 120 פריימים זה המקסימום | Tooltip / aria on the disabled "+" |
| `w5.text` | הזיכרון מתמלא: בפריים הזה נשמרים 50 צעדי ביטול, בשאר פחות. | Film toast, 2 lines max, once per session |
| `w5.close` | הבנתי | 44px close |

---

## 14. Export overlay (`#/editor/{id}/export`)

| Key | Hebrew | Where / notes |
|---|---|---|
| `export.h2` | ייצוא | |
| `export.close.aria` | לסגור את הייצוא | |
| `export.gif.h3` | GIF | Card 1 |
| `export.gif.line` | תמונה שזזה, לשליחה בוואטסאפ | 1 Muted line. Replaces "הכי נוח לשליחה בוואטסאפ" (unbacked superlative) |
| `export.gif.size.label` | גודל | |
| `export.gif.size.full` | מלא ({w}×{h}) | 480×360 or 360×360 |
| `export.gif.size.half` | חצי ({w}×{h}), קובץ קטן יותר | 240×180 or 180×180 |
| `export.gif.action` | להכין GIF | Primary |
| `export.video.h3` | וידאו | Card 2 |
| `export.video.line` | MP4 או WebM, לפי מה שהדפדפן תומך בו | 1 Muted line |
| `export.video.action` | להקליט וידאו | Secondary |
| `export.video.disabled` | הדפדפן הזה לא יודע להקליט וידאו. נסו GIF. | Card disabled (no MediaRecorder); replaces the Muted line |
| `export.print.h3` | גיליון הדפסה | Card 3 |
| `export.print.line` | ספרון דפדוף להדפיס, לגזור ולהדק | 1 Muted line |
| `export.print.action` | לגיליון ההדפסה | Secondary, → `#/print/{id}` |
| `export.project.h3` | קובץ פרויקט | Card 4 |
| `export.project.line` | גיבוי שאפשר לפתוח שוב ב-FlipLoop | 1 Muted line |
| `export.project.action` | להוריד קובץ פרויקט | Secondary, `{title}.fliploop.json` |
| `export.progress.gif` | פריים {n}/{total} | Under the progress bar |
| `export.progress.gif.aria` | מכינים GIF, פריים {n} מתוך {total} | |
| `export.progress.video` | {s}/{total} שניות | Under the progress bar |
| `export.progress.video.aria` | מקליטים וידאו, {s} מתוך {total} שניות | |
| `export.video.realtime` | ההקלטה בזמן אמת. השאירו את הלשונית פתוחה עד הסוף. | Under the recording canvas. True: a hidden tab freezes the recording |
| `export.video.format` | הקובץ יהיה {ext} | Shown once the probe picks a type (MP4 or WebM) |
| `export.cancel` | ביטול | Tertiary, during encoding / recording |
| `export.cancelled` | הייצוא בוטל. שום דבר לא נשמר. | Toast |
| `export.done.gif` | ה-GIF מוכן | Done title |
| `export.done.video` | הווידאו מוכן ({ext}) | Done title |
| `export.done.size` | {size} | Muted, under the done title. {size} carries its unit, same pattern as `settings.storage.meter`: "48 KB" under 1 MB, "1.4 MB" above |
| `export.done.download` | להוריד | Primary |
| `export.done.share` | לשתף | Secondary, only if `navigator.canShare({files})` |
| `export.share.text` | ציירתי את זה ב-FlipLoop | Text passed to `navigator.share` |
| `export.done.project` | קובץ הפרויקט ירד: {filename} | Toast after the project file downloads |
| `export.error.gif` | יצירת ה-GIF נכשלה. נסו שוב, או בגודל חצי. | Error state |
| `export.error.video` | ההקלטה נכשלה. נסו שוב, או הכינו GIF. | Error state |
| `export.error.videoHidden` | ההקלטה נעצרה כי הלשונית הוסתרה. נסו שוב והשאירו אותה פתוחה. | Error state, only if Developer detects `visibilityState` hidden mid-recording |
| `export.error.videoEmpty` | הדפדפן הזה יצר קובץ וידאו ריק. נסו GIF. | Empty Blob fallback |
| `export.error.videoEmpty.action` | להכין GIF | Button in that state, switches to the GIF card |
| `export.error.retry` | לנסות שוב | Button in error states |
| `export.error.project` | הורדת קובץ הפרויקט נכשלה. נסו שוב. | Error state |

---

## 15. Print preview (`#/print/{id}`) and the printed sheet

| Key | Hebrew | Where / notes |
|---|---|---|
| `print.h1` | גיליון הדפסה | |
| `print.options.h2` | אפשרויות | |
| `print.paper.label` | גודל נייר | |
| `print.paper.a4` | A4 | |
| `print.paper.letter` | Letter | |
| `print.pingpong` | להוסיף את פריימי החזרה (הלוך ושוב) | Checkbox, off by default, only when play mode is ping-pong |
| `print.summary` | {cardsText} · {sheetsText} | Under options. Join the two plural keys below with " · ", e.g. "96 כרטיסים · 12 גיליונות", "2 כרטיסים · גיליון אחד" |
| `print.summary.cards.one` | כרטיס אחד | |
| `print.summary.cards.other` | {cards} כרטיסים | |
| `print.summary.sheets.one` | גיליון אחד | |
| `print.summary.sheets.other` | {sheets} גיליונות | |
| `print.holdNote` | פריים עם החזקה מודפס כמה פעמים, לפי ההחזקה. | Helper, shown only if any hold > 1 |
| `print.preview.h2` | תצוגה מקדימה | |
| `print.preview.sheet.aria` | גיליון {n} מתוך {total}, {cardsText} | Alt text per sheet preview. `{cardsText}` uses `print.summary.cards.one` / `.other` (the last sheet can hold 1 card) |
| `print.preparing` | מכינים גיליון {n}/{total}… | Preparing state |
| `print.legend.staple` | כאן מהדקים | Screen legend beside the shaded 20 mm margin |
| `print.legend.cut` | גוזרים לאורך הקו המקווקו | Screen legend beside a cut line |
| `print.action.pdf` | להוריד PDF | **Primary** (Part C, Ruling 2) |
| `print.action.print` | להדפיס | Secondary, opens the print dialog |
| `print.action.png` | להוריד PNG | Secondary, all sheets |
| `print.action.pngSheet` | PNG גיליון {n} | Per-sheet button |
| `print.action.pngSheet.aria` | להוריד את גיליון {n} כ-PNG | |
| `print.dialogTip` | בחלון ההדפסה בחרו קנה מידה 100%, כדי שהכרטיסים יצאו בגודל הנכון. | Helper under "להדפיס" |
| `print.multiDownloadTip` | הדפדפן עשוי לשאול אם לאפשר כמה הורדות. אם לא, יש כפתור לכל גיליון. | Helper under "להוריד PNG" |
| `print.done.pdf.one` | ה-PDF ירד: גיליון אחד | Toast, 1 sheet |
| `print.done.pdf.other` | ה-PDF ירד: {sheets} גיליונות | Toast |
| `print.done.png.one` | ירד קובץ PNG אחד | Toast, 1 sheet |
| `print.done.png.other` | ירדו {sheets} קובצי PNG | Toast |
| `print.error.pdf` | יצירת ה-PDF נכשלה. נסו להוריד PNG או להדפיס. | Error toast |
| `print.error.png` | יצירת ה-PNG נכשלה. נסו שוב. | Error toast |
| `print.file.pdf` | {title}-flipbook.pdf | Filename |
| `print.file.png` | {title}-sheet-{nn}.png | Filename, `{nn}` two digits |
| `print.pdf.metaTitle` | {title} · FlipLoop | PDF `/Title` |
| **Printed on the sheet (canvas-drawn, `direction = "rtl"`, after `document.fonts.ready`)** | | |
| `sheet.card.number` | {n} | Inside the staple margin, 8 pt, upright |
| `sheet.footer.id` | FlipLoop · {title} · גיליון {n}/{total} | Sheet footer, line 1 |
| `sheet.footer.howTo` | סדרו לפי המספרים, 1 למעלה, והדקו בשוליים | Sheet footer, line 2 (plan text, already plural) |
| `sheet.label.staple` | שוליים להידוק | Optional small label in the first card's margin, if Developer adds one; the plan specifies only dots and shading |
| `sheet.label.cut` | קו גזירה | Optional label on the first sheet's outer cut line, same condition |

---

## 16. Lessons index (`#/lessons`)

| Key | Hebrew | Where / notes |
|---|---|---|
| `lessons.h1` | שיעורים | |
| `lessons.subtitle` | 12 עקרונות האנימציה, כל אחד בכמה דקות | Muted subtitle (plan text) |
| `lessons.progress` | {done}/12 הושלמו | Beside the subtitle, if Developer shows a count |
| `lessons.station.number` | {n} | In the circle |
| `lessons.station.name` | {lessonName} | Max 24 chars, 2 lines |
| `lessons.station.aria` | שיעור {n}: {lessonName} | |
| `lessons.station.done.aria` | , הושלם | Appended |
| `lessons.station.next.aria` | , הבא בתור | Appended |
| `lessons.nextUp` | הבא בתור | Lamp pill on the lowest undone station |
| `lessons.allDone.title` | סיימתם את כל 12 השיעורים | Finished banner |
| `lessons.allDone.body` | 12 חותמות. כל ציור מוכן מחכה לכם בגלריה. | True: all 4 starters are unlocked by then |

---

## 17. Lesson detail (`#/lesson/{n}`), chrome only

| Key | Hebrew | Where / notes |
|---|---|---|
| `lesson.h1` | {lessonName} | |
| `lesson.number` | שיעור {n} מתוך 12 | Muted, above or under the H1 |
| `lesson.what.h2` | מה זה | |
| `lesson.what.body` | {explanation} | From `lessons.js` |
| `lesson.example.h2` | דוגמה | |
| `lesson.example.aria` | דוגמה מונפשת: {lessonName} | Mini player |
| `lesson.example.play` | הפעלה | Mini player (reduced motion: paused) |
| `lesson.example.stop` | עצירה | |
| `lesson.example.prev` | פריים קודם | Step button, reduced motion |
| `lesson.example.next` | פריים הבא | Step button, reduced motion |
| `lesson.exercise.h2` | התרגיל | |
| `lesson.exercise.goal` | {goal} | From `lessons.js` |
| `lesson.exercise.frames` | {total} פריימים, {k} מוכנים | e.g. "8 פריימים, 2 מוכנים" |
| `lesson.exercise.frames.base` | {total} פריימים עם ציור בסיס | Lessons 5 and 8 (K count 0) |
| `lesson.cta.start` | להתחיל תרגיל | No project yet |
| `lesson.cta.resume` | להמשיך תרגיל | Project exists, not done |
| `lesson.cta.reopen` | לפתוח שוב | Done |
| `lesson.done.badge` | הושלם {date} | Success stamp line, `{date}` as d.m.yyyy |
| `lesson.prev` | הקודם: {lessonName} | Tertiary link (hidden on lesson 1) |
| `lesson.next` | הבא: {lessonName} | Tertiary link (hidden on lesson 12) |
| `lesson.projectTitle` | שיעור {n}: {lessonName} | Title of the lesson project |

---

## 18. Challenge (`#/challenge`)

| Key | Hebrew | Where / notes |
|---|---|---|
| `challenge.h1` | האתגר של השבוע | |
| `challenge.theme` | {theme} | H2 on the film slate, from §19 |
| `challenge.meta.days.other` | שבוע {week} · נשארו {days} ימים | e.g. "שבוע 39 · נשארו 6 ימים" (days 3 to 7) |
| `challenge.meta.days.two` | שבוע {week} · נשארו יומיים | Friday |
| `challenge.meta.days.last` | שבוע {week} · יום אחרון | Saturday |
| `challenge.meta.noWeek.other` | נשארו {days} ימים | Device clock before the epoch (drop the week number) |
| `challenge.meta.noWeek.two` | נשארו יומיים | |
| `challenge.meta.noWeek.last` | יום אחרון | |
| `challenge.cta.start` | להתחיל לצייר | Not joined |
| `challenge.cta.resume` | להמשיך לצייר | Joined |
| `challenge.rule` | אותו נושא לכל מי שמצייר השבוע. נושא חדש בכל יום ראשון. | Muted line under the CTA |
| `challenge.stampRule` | חותמת מתקבלת כשיש 2 פריימים מצוירים. | Muted, shown while joined but not yet counted |
| `challenge.stamps.h2` | האתגרים שלי | Plan had "האתגרים שלך"; first person matches "העבודות שלי" |
| `challenge.stamps.empty` | הצטרפו לאתגר הראשון שלכם | Beside the dashed empty circle |
| `challenge.stamp.aria` | שבוע {week}: {theme} | Each stamp |
| `challenge.projectTitle` | {theme} | Title of the challenge project |

---

## 19. The 52 weekly themes (`js/data/themes.js`, `THEMES[0..51]`)

Every theme is 1 to 3 words, at most 16 characters (spaces counted), brand-free, kid-safe, and names **something that moves**, so it works in a few frames. The index is `((weekIndex mod 52) + 52) mod 52`, with index 0 = the week of Sunday 2026-01-04. I placed seasonal themes on the weeks they land in 2026 (rain in winter, Purim, Independence Day, Lag BaOmer, summer sea, back to school, Rosh Hashana, first rain, Hanukkah). A 52-week cycle is 364 days, so these weeks drift about 1 to 2 days a year; that is fine for seasons, and no theme depends on an exact date. "רקטה" was avoided on purpose (in Israel it reads as a weapon); "חללית ממריאה" is used instead.

| Index | Week (2026) starts | Hebrew | Chars |
|---|---|---|---|
| 0 | 4.1 | מטרייה נפתחת | 12 |
| 1 | 11.1 | טיפה בשלולית | 12 |
| 2 | 18.1 | כדור שלג מתגלגל | 15 |
| 3 | 25.1 | פינגווין מחליק | 14 |
| 4 | 1.2 | שתיל צומח | 9 |
| 5 | 8.2 | חתול מתמתח | 10 |
| 6 | 15.2 | לב פועם | 7 |
| 7 | 22.2 | צב מציץ | 7 |
| 8 | 1.3 | מסכה מחייכת | 11 |
| 9 | 8.3 | קופסת הפתעות | 12 |
| 10 | 15.3 | דבורה על פרח | 12 |
| 11 | 22.3 | פרפר | 4 |
| 12 | 29.3 | כלב מכשכש | 9 |
| 13 | 5.4 | ביצה בוקעת | 10 |
| 14 | 12.4 | עפיפון ברוח | 11 |
| 15 | 19.4 | זיקוקים | 7 |
| 16 | 26.4 | דגל מתנופף | 10 |
| 17 | 3.5 | מדורה | 5 |
| 18 | 10.5 | חילזון זוחל | 11 |
| 19 | 17.5 | צפרדע קופצת | 11 |
| 20 | 24.5 | מטוס נייר | 9 |
| 21 | 31.5 | רובוט רוקד | 10 |
| 22 | 7.6 | בועת סבון | 9 |
| 23 | 14.6 | דג שוחה | 7 |
| 24 | 21.6 | כדור פורח | 9 |
| 25 | 28.6 | גלידה נמסה | 10 |
| 26 | 5.7 | גל בים | 6 |
| 27 | 12.7 | מדוזה | 5 |
| 28 | 19.7 | תמנון | 5 |
| 29 | 26.7 | פיל מתיז מים | 12 |
| 30 | 2.8 | שמש זורחת | 9 |
| 31 | 9.8 | קשת בענן | 8 |
| 32 | 16.8 | זריקה לסל | 9 |
| 33 | 23.8 | רכבת נוסעת | 10 |
| 34 | 30.8 | שעון מעורר | 10 |
| 35 | 6.9 | תפוח טובל בדבש | 14 |
| 36 | 13.9 | ציפור עפה | 9 |
| 37 | 20.9 | עלה נושר | 8 |
| 38 | 27.9 | חללית ממריאה | 12 |
| 39 | 4.10 | הגשם הראשון | 11 |
| 40 | 11.10 | נחש מתפתל | 9 |
| 41 | 18.10 | אריה שואג | 9 |
| 42 | 25.10 | ינשוף ממצמץ | 11 |
| 43 | 1.11 | גלגל ענק | 8 |
| 44 | 8.11 | עכבר בורח | 9 |
| 45 | 15.11 | דינוזאור צועד | 13 |
| 46 | 22.11 | הר געש מתפרץ | 12 |
| 47 | 29.11 | קנגורו | 6 |
| 48 | 6.12 | סביבון מסתובב | 13 |
| 49 | 13.12 | כוכב נופל | 9 |
| 50 | 20.12 | פרצוף מופתע | 11 |
| 51 | 27.12 | פיהוק גדול | 10 |

Paste-ready:

```js
export const THEMES = [
  "מטרייה נפתחת", "טיפה בשלולית", "כדור שלג מתגלגל", "פינגווין מחליק",
  "שתיל צומח", "חתול מתמתח", "לב פועם", "צב מציץ",
  "מסכה מחייכת", "קופסת הפתעות", "דבורה על פרח", "פרפר",
  "כלב מכשכש", "ביצה בוקעת", "עפיפון ברוח", "זיקוקים",
  "דגל מתנופף", "מדורה", "חילזון זוחל", "צפרדע קופצת",
  "מטוס נייר", "רובוט רוקד", "בועת סבון", "דג שוחה",
  "כדור פורח", "גלידה נמסה", "גל בים", "מדוזה",
  "תמנון", "פיל מתיז מים", "שמש זורחת", "קשת בענן",
  "זריקה לסל", "רכבת נוסעת", "שעון מעורר", "תפוח טובל בדבש",
  "ציפור עפה", "עלה נושר", "חללית ממריאה", "הגשם הראשון",
  "נחש מתפתל", "אריה שואג", "ינשוף ממצמץ", "גלגל ענק",
  "עכבר בורח", "דינוזאור צועד", "הר געש מתפרץ", "קנגורו",
  "סביבון מסתובב", "כוכב נופל", "פרצוף מופתע", "פיהוק גדול"
];
```

Worked check: on 2026-09-28, weekIndex = 38, so the theme is `THEMES[38]` = "חללית ממריאה", label "שבוע 39 · נשארו 6 ימים".

---

## 20. Gallery (`#/gallery`)

| Key | Hebrew | Where / notes |
|---|---|---|
| `gallery.h1` | העבודות שלי | |
| `gallery.cta.new` | אנימציה חדשה | Primary |
| `gallery.import` | לייבא קובץ | Secondary, accepts `.json` |
| `gallery.import.aria` | לייבא קובץ פרויקט או גיבוי | |
| `gallery.backup` | לגבות הכל | Secondary, one `fliploop-backup-{date}.json` |
| `gallery.starters.h2` | להתחיל מציור מוכן | Plan's "התחל מ..."; hidden when no starter is unlocked |
| `gallery.starter.ball` | כדור | Unlocked by its first lesson |
| `gallery.starter.flower` | פרח | |
| `gallery.starter.stick` | איש מקלות | |
| `gallery.starter.character` | דמות מנופפת | |
| `gallery.starter.aria` | אנימציה חדשה מתוך: {starter} | |
| `gallery.projects.h2` | פרויקטים | |
| `gallery.card.frames` | see `common.frames.*` | "8 פריימים" |
| `gallery.card.menu.aria` | אפשרויות עבור {title} | 44px menu button |
| `gallery.menu.open` | לפתוח | |
| `gallery.menu.duplicate` | לשכפל | |
| `gallery.menu.rename` | לשנות שם | |
| `gallery.menu.download` | להוריד קובץ פרויקט | |
| `gallery.menu.delete` | למחוק | |
| `gallery.empty.title` | עוד אין עבודות | Empty state |
| `gallery.empty.body` | כל מה שתציירו יישמר כאן, במכשיר הזה. | |
| `gallery.empty.cta` | אנימציה חדשה | |
| `gallery.loading.aria` | טוען עבודות… | Skeleton cards |
| `gallery.duplicate.done` | נוצר עותק: {title} | Toast |
| `gallery.duplicate.freeNote` | העותק פתוח לעריכה חופשית, בלי פריימים נעולים | Toast, 2nd line, when duplicating a lesson or challenge project |
| `rename.title` | שינוי שם | Dialog |
| `rename.label` | שם | |
| `rename.save` | לשמור | |
| `rename.cancel` | ביטול | |
| `rename.error.empty` | צריך שם, לפחות תו אחד | Inline error |
| `rename.hint` | עד 40 תווים | |
| `delete.title` | למחוק את "{title}"? | Confirm dialog |
| `delete.body.one` | הפרויקט והפריים שלו יימחקו מהמכשיר. | |
| `delete.body.other` | הפרויקט ו-{n} הפריימים שלו יימחקו מהמכשיר. | |
| `delete.stampNote` | החותמת נשארת. | Extra line for lesson and challenge projects |
| `delete.confirm` | למחוק | Destructive button |
| `delete.cancel` | ביטול | |
| `delete.done` | "{title}" נמחק | 5 s toast, with `common.undo` |
| `import.done.one` | יובא: {title} | Toast |
| `import.done.other` | יובאו {n} פרויקטים | Toast (backup file) |
| `import.done.copy` | הפרויקט כבר היה כאן, אז יובא כעותק | Toast, 2nd line, when the id already exists |
| `import.error.invalid` | הקובץ לא נראה כמו פרויקט FlipLoop. שום דבר לא השתנה. | Import error (plan text) |
| `import.error.newer` | הקובץ נוצר בגרסה חדשה יותר של FlipLoop. שום דבר לא השתנה. | `schemaVersion` above 1 |
| `import.error.tooBig` | see W2b | Not enough space |
| `backup.done` | הגיבוי ירד: {filename} | Toast |
| `backup.empty` | אין עדיין עבודות לגבות | Toast when there are no projects |
| `backup.file` | fliploop-backup-{date}.json | Filename, `{date}` as yyyy-mm-dd |

---

## 21. Settings (`#/settings`)

| Key | Hebrew | Where / notes |
|---|---|---|
| `settings.h1` | שמירה והגדרות | |
| `settings.storage.h2` | אחסון | |
| `settings.storage.meter` | {used} / {quota} · {percent}% | e.g. "124 MB / 2.1 GB · 6%" |
| `settings.storage.meter.aria` | בשימוש {used} מתוך {quota}, {percent} אחוז | |
| `settings.storage.unknown` | הדפדפן לא מדווח כמה מקום יש | When `estimate()` is missing |
| `settings.protected.label` | מוגן ממחיקה | Label before yes/no |
| `settings.protected.yes` | כן | |
| `settings.protected.no` | לא | |
| `settings.protected.yes.hint` | הדפדפן לא ימחק את העבודות לבד כשחסר לו מקום. | |
| `settings.protected.no.hint` | הדפדפן עלול למחוק את העבודות אם לא נכנסים הרבה זמן. גיבוי שומר עליהן. | |
| `settings.lastBackup` | גיבוי אחרון: {date} | |
| `settings.lastBackup.never` | עוד לא נשמר גיבוי | |
| `settings.backup` | לגבות הכל | Secondary |
| `settings.import` | לייבא | Secondary |
| `settings.help.h2` | עזרה | |
| `settings.tips.reset` | להציג שוב טיפים | Resets coach marks and `firstPlaySeen` (Ruling 4) |
| `settings.tips.done` | הטיפים יופיעו שוב בפעם הבאה שתציירו | Toast |
| `settings.undoNote` | צעדי הביטול נמחקים כשמרעננים או סוגרים את הדף. הציורים עצמם נשמרים. | |
| `settings.motionNote` | התנועה באתר מתאימה להגדרת הפחתת התנועה של המכשיר. | Optional line |
| `settings.about.h2` | אודות | |
| `settings.about.name` | FlipLoop | |
| `settings.about.privacy` | בלי חשבון ובלי שרת. הציורים לא יוצאים מהמכשיר. | "The drawings", not "nothing": the Google Fonts link is a network call |
| `settings.about.credit` | 12 העקרונות לקוחים מהספר The Illusion of Life של פרנק תומס ואולי ג'ונסטון (1981). ההסברים כאן נכתבו מחדש. | Credit by title (plan) |

---

## 21b. Install and updates (PWA pass, 2026-09-30)

Settings card between Storage and Help. Only one of the three state lines shows: the button when the browser offers install, the iPhone line on iOS Safari, the menu line anywhere else. The whole card is replaced by `install.installed` when FlipLoop already runs as an installed app.

| Key | Hebrew | Where / notes |
|---|---|---|
| `install.h2` | התקנה | Settings card heading |
| `install.lead` | התקינו את FlipLoop וציירו גם בלי אינטרנט. | Muted line under the heading |
| `install.button` | להתקין את FlipLoop | Secondary button, opens the browser's install dialog |
| `install.ios` | באייפון ובאייפד: לחצו על שיתוף ובחרו "הוספה למסך הבית". | iOS Safari only (no install API). "הוספה למסך הבית" is the iOS menu item's own Hebrew name |
| `install.menu` | פתחו את תפריט הדפדפן ובחרו התקנה או הוספה למסך הבית. | Browsers with no install prompt right now |
| `install.installed` | FlipLoop מותקן במכשיר הזה ועובד גם בלי אינטרנט. | Instead of the card body, in the installed app |
| `install.done` | FlipLoop הותקן | Toast after a successful install |
| `update.ready` | יש גרסה חדשה של FlipLoop | Toast when a new version is ready, with `update.action` |
| `update.action` | לרענן | Toast action, loads the new version |

---

## 22. Toasts (index, one place to find them all)

| Key | Hebrew | Trigger |
|---|---|---|
| `toast.frameAdded.aria` | נוסף פריים {n} | Live region only |
| `toast.frameDuplicated` | פריים {n} שוכפל | After duplicate |
| `toast.frameDeleted` | פריים {n} נמחק | After delete, 5 s, with `common.undo` |
| `toast.frameCleared` | הפריים נוקה | After "ניקוי הפריים", with `common.undo` |
| `toast.canvasResized.wide` | גודל הדף שונה ל-4:3 | After a change to 4:3. "4:3" inside the `.num` isolate |
| `toast.canvasResized.square` | גודל הדף שונה לריבוע | After a change to square |
| `lessonMode.keyFrame` | זה פריים מוכן. ציירו בפריימים הריקים | §11 |
| `lessonMode.nudgePlay` | כל הפריימים צוירו. לחצו על הפעלה כדי לסיים | §11 |
| `lessonDone.madeMine.toast` | נוצר עותק: {title} | §11 |
| `w3.recovered` | השמירה חזרה לעבוד | §13 |
| `w5.text` | (see §13) | §13 |
| `export.cancelled` | הייצוא בוטל. שום דבר לא נשמר. | §14 |
| `export.done.project` | קובץ הפרויקט ירד: {filename} | §14 |
| `print.done.pdf.*` / `print.done.png.*` | (see §15) | §15 |
| `gallery.duplicate.done` | נוצר עותק: {title} | §20 |
| `delete.done` | "{title}" נמחק | §20 |
| `import.done.*` | (see §20) | §20 |
| `backup.done` | הגיבוי ירד: {filename} | §20 |
| `settings.tips.done` | הטיפים יופיעו שוב בפעם הבאה שתציירו | §21 |
| `install.done` | FlipLoop הותקן | §21b |
| `update.ready` | יש גרסה חדשה של FlipLoop | §21b, with `update.action` |

---

## 23. Confirmations (dialogs)

| Key | Hebrew | Where / notes |
|---|---|---|
| `confirm.resize.title` | לשנות את גודל הדף? | Canvas size change when frames have content |
| `confirm.resize.body` | הציורים יישארו במרכז. מה שיוצא מהשוליים ייחתך, ובצד השני יתווסף שטח ריק. | |
| `confirm.resize.ok` | לשנות | |
| `confirm.resize.cancel` | ביטול | |
| `delete.*` | (see §20) | Project delete |
| `w2b.*` | (see §13) | Storage full |

Frame delete and clear frame have no dialog, by plan: they use a 5 s undo toast.

---

## 24. Fix round 2026-10: new keys

### 24.1 WS1

| Key | Hebrew | Where / notes |
|---|---|---|

### 24.2 WS2

| Key | Hebrew | Where / notes |
|---|---|---|

### 24.3 WS3

| Key | Hebrew | Where / notes |
|---|---|---|

### 24.4 WS4

| Key | Hebrew | Where / notes |
|---|---|---|

### 24.5 WS5

| Key | Hebrew | Where / notes |
|---|---|---|

### Notes

- **Angle:** the researcher's recommended lead, "your drawing moves for the first time," lives in exactly two places so it stays strong: the Home subtitle (the promise) and `firstPlay.line` (the payoff). "הציור שלכם הפך לסרט" is the one deliberate pattern break. It names the film strip the user just watched run, instead of a generic "כל הכבוד". Everything else is plain, calm instruction, which the brief's Low/Feel reading asks for.
- **Addressing decision (flag for Gatekeeper and for the `lessons` spawn):** plural imperative for sentences, infinitive for buttons, nouns for tools and headings, "שלי" for the user's own things. This replaces every masculine-singular sample in the plan ("צייר", "הוסף", "לחץ", "ייבא", "גבה", "הורד", "התחל", "הצטרף", "שלך"). Alternative considered: keep the plan's singular masculine, which is shorter by 1 or 2 letters. Rejected, because `hebrew-writing-skill.md` rule 6 treats it as a standard exclusion check, and the audience is every kid, not only boys.
- **Deliberate deviations from the plan's sample strings, each forced by a binding limit or rule:** "לשיעורים" to "למסלול" (7-char Back limit); "לא נשמר" to "נכשל" (one-word status); W3 cut from 3 sentences to 2 (2-line limit); the GIF "הכי נוח" line (superlative); "האתגר השבועי" to "האתגר של השבוע" in the manifest (one name for one thing). The Print Back label is "לציור" (the plan names no label; "לעורך" is jargon for a kid).
- **For Developer:** `export.error.videoHidden`, `import.error.newer`, `sheet.label.staple` and `sheet.label.cut` are ready if you build those paths; they are not required by the plan.
- **Char checks:** all 52 themes are 16 chars or fewer (longest: "כדור שלג מתגלגל", 15), with no duplicates; all Back labels are 7 or fewer; all three status words are one word; zero em or en dashes in this file (checked by script).

---
**בדיקת עברית:** 8/8 items walked, fixed 3 issues: (1) gendered defaults: every masculine-singular imperative from the plan's samples rewritten into plural or infinitive; (2) superlative "הכי נוח" replaced with a concrete line; (3) "שלך" changed to "שלי" to match "העבודות שלי". Kill-table walked row by row: no corporate words, no "מקצה לקצה", no hype. "גם" appears 0 times. No right-pointing arrows in Hebrew text; frame keys are spelled out ("חץ שמאלה").
