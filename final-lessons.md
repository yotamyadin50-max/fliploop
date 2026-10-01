## Copy: lessons (the 12 lesson bodies for `js/data/lessons.js`)

**Channel:** in-app teaching copy, Hebrew RTL: Lessons index, Lesson detail, Editor goal strip (lesson mode), completion sheet · **Goal:** teach each of the 12 principles in words a 10-year-old follows and an adult still learns from, then walk the user through the half-drawn exercise to the stamp.

**Handoff synthesis (Round 19):** The brief's surprise angle is "the lesson comes half drawn", and the plan's lessons table makes that literal: every exercise opens with locked key frames and asks only for the in-betweens. So each lesson's copy does two jobs in order. The explanation teaches the mechanism with an everyday example first and names the idea second (the 2026-09-08 feedback rule: teach through the thing, then name it). The steps then point at real frame numbers from the table, so the words match what the strip shows. Tensions, each resolved toward the binding file: (1) the plan's goal sample "מתיחה וכיווץ: צייר את הכדור בפריימים הריקים" is 42 chars, but the kickoff moves the name to the chip and caps the goal at 28, so the goal line carries only the action; (2) the kickoff says to pick one addressing form and notes the plan's singular samples, and `05-copywriter-ui-copy.md` already picked plural imperative + infinitive buttons for both deliverables, so I follow ui-copy; (3) the plan gives no location or size for hint text, so I capped every hint at 28 chars, the goal slot's own limit, so it can sit in that slot (placement note for Developer below); (4) the task asks for a credit line and ui-copy already has one in Settings, so the Lessons credit reuses that exact sentence and does not add a second version.

**Checklist walkthrough (Round 18):** 26/26 walked. Legitimate skips, named: 2 (the CTA labels belong to ui-copy), 3 (no marketing headline), 4 (nothing is sold), 13 (not content marketing), 16 (no email), 17 (no push), 19 (no paywall), 20 (not a search page), 26 (no claim about who wrote it; the credit says the explanations were rewritten, which is true). Items checked with a result: 1 and 25 (every explanation uses a concrete object or action: a ball hitting the floor, a car at a red light, a ponytail after a run, a bowling ball and a ping pong ball); 5 (plural imperative everywhere, verbs, no noun chains); 7 (every step names the lesson's real frame numbers from the plan's table, which no other app's copy could carry); 8 and 11 (no cliché, no AI-tell words; the Hebrew kill-table walked row by row); 10 (no Cialdini lever); 12 (reason-why: each explanation's second sentence says why the principle works, not only what it is); 14 (explanations pair a longer sentence with a shorter one; steps mix fragments and full lines); 15 (goal lines: one job each, an action plus its object); 18 (the steps run from a plain setup line to a nearly silent final "לחצו על הפעלה"); 21 (calm and clear in the steps, warm only in the done lines); 22 (pattern break: every done line ends by moving the principle out of the lesson into the real world: a ponytail, a lift, Saturn's rings); 23 (synthesis above); 24 (13-year-old gut check on every sentence; "פרופורציות", "צללית" and "תלת ממד" kept because each is taught by its own sentence). Then the 3-second check: 3/3.

---

## 0. Conventions (same as `ui-copy`, not re-decided)

- **Addressing:** plural imperative in sentences ("ציירו", "לחצו", "הדליקו"), past tense plural in the done lines ("ציירתם", "שיניתם"). No buttons in this file; CTAs live in ui-copy §17 and §11.
- **Locked vocabulary reused:** פריים / פריימים, פריים מוכן, פריים ריק, רמזים (the switch label), הפעלה (Play), החזקה (hold), שכבת בצל, לולאה, חותמת, רצועה (the film strip; "פס" is only the stripe on the ball in lesson 11), הקו המקווקו (the dashed guide).
- **Fix round 2026-10 (audit `08-copy.md`, rulings R18, R19, R41, R44):** the hints switch is turned on with "הדליקו", so that "הפעלה" names only the Play button; a tap is "לחצו", never "הקישו"; Play is written as the glyph the child sees on a phone followed by the word, "לחצו על ▶︎ (הפעלה)" (U+25B6 then U+FE0E, the text presentation selector).
- **Placeholders ui-copy expects, and where they come from here:** `{lessonName}` = `lesson.{n}.title` · `{explanation}` = `lesson.{n}.explanation` · `{goal}` = `lesson.{n}.goal`.
- **Punctuation:** zero em or en dashes. A plain hyphen appears only after a one-letter prefix before a digit ("ו-8"), the same rule ui-copy uses for Latin text and for "ו-{n}".
- **Limits:** title 24 chars (station card, 2 lines of Rubik 15/500); goal 28 chars (40px goal strip, one line); hint 28 chars (my cap, so it fits the goal slot); explanation exactly 2 sentences; caption 1 line (all 38 chars or fewer). Fix round 2026-10: four texts proposed in the copy audit run past the 28 cap by 1 or 2 characters (`lesson.9.goal` 30, `lesson.2.hint.4` 30, `lesson.10.hint.3` 29, `lesson.10.hint.6` 29). Developer measured each in its slot at 320, 360, 390, 768 and 1280px: none is cut, so the working limit for goal and hint is 30.

### Where each field shows

| Field | Key pattern | Screen and spot |
|---|---|---|
| Title | `lesson.{n}.title` | Station card, Lesson detail H1, completion sheet, `<title>`, project title (via ui-copy) |
| Explanation | `lesson.{n}.explanation` | Lesson detail, under H2 "מה זה" |
| Caption | `lesson.{n}.caption` | Lesson detail, one Muted line under the "דוגמה" mini player. Also usable as the player's visible description |
| Goal | `lesson.{n}.goal` | Editor goal strip beside the "שיעור {n}" chip; Lesson detail, first line under H2 "התרגיל" |
| Steps | `lesson.{n}.step.{m}` | Lesson detail, a numbered list under the exercise line ("8 פריימים, 2 מוכנים"), above the CTA |
| Hint | `lesson.{n}.hint.{frame}` | Editor, lesson mode, only while "רמזים" is on and that frame is current. Suggested spot: it takes the goal's place in the goal strip (same 28-char box), and goes to the polite live region. Only lessons 2, 6, 7, 10 |
| Done | `lesson.{n}.done` | Completion sheet, one Body line under `lessonDone.body` ("שיעור {n}: {lessonName}") |

---

## 1. Lessons index additions (`#/lessons`)

| Key | Hebrew | Where / notes |
|---|---|---|
| `lessons.intro` | כל שיעור נפתח חצי מצויר: חלק מהציור כבר שם, ואתם מציירים את מה שחסר. | Body line under the ui-copy subtitle "12 עקרונות האנימציה, כל אחד בכמה דקות", above the path. 2 lines at 375. The brief's surprise angle |
| `lessons.credit` | 12 העקרונות לקוחים מהספר The Illusion of Life של אולי ג'ונסטון ופרנק תומס (1981). ההסברים כאן נכתבו מחדש. | Muted caption at the bottom of the Lessons path. **Same sentence as ui-copy `settings.about.credit`**, so Developer can point both keys at one string. Wrap the English title in `<i dir="ltr">` (the plan sets it in italics) |

---

## 2. The 12 lessons, in the plan's order

### Lesson 1 · Squash and stretch (8 frames, 12 fps · K1, K5 · blanks 2 to 4, 6 to 8)

| Key | Hebrew | Chars / notes |
|---|---|---|
| `lesson.1.title` | מתיחה ומעיכה | 12. Fix round R19: the title uses the verb the body uses ("נמעך", "מעוך"); "כיווץ" suggested shrinking, which the explanation denies |
| `lesson.1.explanation` | כשכדור פוגע ברצפה הוא נמעך לרוחב, וכשהוא טס באוויר הוא נמתח לאורך הכיוון שאליו הוא זז. הכדור לא גדל ולא קטן: מה שהוא מאבד בגובה הוא מרוויח ברוחב, ולכן הוא נראה רך וקופצני ולא כמו אבן. | 2 sentences |
| `lesson.1.caption` | נמתח בנפילה, נמעך ברצפה, קופץ חזרה | |
| `lesson.1.goal` | ציירו את הכדור נופל וקופץ | 25 |
| `lesson.1.step.1` | פריים 1 ופריים 5 מוכנים: הכדור למעלה, והכדור מעוך על הרצפה. | |
| `lesson.1.step.2` | בפריימים 2 עד 4 הכדור נופל. ציירו אותו קצת נמוך יותר בכל פריים, ומתוח לגובה. | |
| `lesson.1.step.3` | ככל שהוא קרוב לרצפה הוא מהיר יותר, אז מתחו אותו יותר. למעלה הוא כמעט עגול. | The physics reason for the stretch |
| `lesson.1.step.4` | הכדורים באדום ובכחול הם שכבת הבצל: האדום הוא הפריים הקודם, והכחול הוא הבא, כשיש בו ציור. ציירו כל כדור חדש צעד אחד אחרי האדום. | Teaches in-betweening once, in the first lesson. True on frame 2 too, where only the red ghost shows |
| `lesson.1.step.5` | בפריימים 6 עד 8 הוא עולה בחזרה, מתוח, וכל פעם קרוב יותר לגובה של פריים 1. | |
| `lesson.1.step.6` | לחצו על ▶︎ (הפעלה). הכדור נראה קשה כמו אבן? מתחו אותו עוד קצת. | |
| `lesson.1.done` | הכדור שלכם נמתח ונמעך בלי לשנות גודל. אותו טריק עובד על פרצוף, על כלב ועל ג'לי. | |

### Lesson 2 · Anticipation (10 frames, 12 fps · K1, K7, K10 · blanks 2 to 6, 8, 9 · G4)

| Key | Hebrew | Chars / notes |
|---|---|---|
| `lesson.2.title` | הכנה לתנועה | 11. Plain words over the literal "ציפייה", which needs the concept first |
| `lesson.2.explanation` | לפני שקופצים גבוה מתכופפים למטה, ולפני שזורקים כדור מושכים את היד אחורה. תנועה קטנה לכיוון ההפוך מכינה את מי שצופה למה שעומד לקרות, ובלעדיה הקפיצה נראית כאילו באה משום מקום. | 2 sentences |
| `lesson.2.caption` | קודם יורדים למטה, ורק אז קופצים | |
| `lesson.2.goal` | ציירו את הכריעה והקפיצה | 23 |
| `lesson.2.step.1` | פריים 1 (עומד), פריים 7 (באוויר) ופריים 10 (נוחת) מוכנים. | |
| `lesson.2.step.2` | בפריימים 2 ו-3 הדמות יורדת לכריעה: ברכיים מתכופפות, ידיים נמשכות אחורה. | |
| `lesson.2.step.3` | בפריים 4 היא הכי נמוכה. הדליקו את הרמזים כדי לראות את התנוחה הזו בקו מקווקו. | "הכי נמוכה" is a position in the sequence, not a claim |
| `lesson.2.step.4` | בפריימים 5 ו-6 היא מתיישרת בכוח, והידיים עפות קדימה ולמעלה. | |
| `lesson.2.step.5` | בפריימים 8 ו-9 היא יורדת מהאוויר אל הנחיתה. | |
| `lesson.2.step.6` | לחצו על ▶︎ (הפעלה). הקפיצה חלשה? ציירו את הכריעה בפריים 4 נמוכה עוד קצת. | |
| `lesson.2.hint.4` | הכריעה הנמוכה: לפי הקו המקווקו | 30 |
| `lesson.2.done` | הדמות שלכם ירדה לפני שקפצה, ולכן מרגישים את הכוח. חפשו את הרגע הזה בכל תנועה גדולה: זריקה, בעיטה, עיטוש. | |

### Lesson 3 · Staging (6 frames, 6 fps · K1, K6 · P2 to P5 pot and ground · blanks 2 to 5)

| Key | Hebrew | Chars / notes |
|---|---|---|
| `lesson.3.title` | בימוי ברור | 10 |
| `lesson.3.explanation` | כשמצלמים חבר, מעמידים אותו במרכז, בוחרים זווית שרואים ממנה את הפנים ודואגים ששום דבר לא מסתיר אותו, כדי שכל מי שיסתכל יבין מיד מה בתמונה. זה בימוי, והבדיקה שלו היא הצללית: אם ממלאים את הציור בשחור ועדיין מבינים מה קורה, הבימוי עובד. | 2 sentences. Example first, name second |
| `lesson.3.caption` | פרח במרכז הדף, פונה אלינו, נפתח לאט | |
| `lesson.3.goal` | ציירו את הפרח נפתח | 18 |
| `lesson.3.step.1` | פריים 1 (ניצן סגור) ופריים 6 (פרח פתוח) מוכנים. בפריימים 2 עד 5 כבר יש עציץ וקו אדמה. | |
| `lesson.3.step.2` | בפריימים 2 עד 5 ציירו את עלי הכותרת נפתחים, קצת יותר בכל פריים. | "עלי כותרת" (petals), so lesson 8's "עלה" (leaf) stays a different thing |
| `lesson.3.step.3` | השאירו רווח בין עלי הכותרת, כדי שגם בצללית שחורה יראו כל אחד מהם. | "גם" sits before "בצללית", the word it stresses |
| `lesson.3.step.4` | לחצו על ▶︎ (הפעלה). 6 פריימים בשנייה זה איטי בכוונה: יש זמן לראות כל שלב. | This lesson's fps is 6 |
| `lesson.3.done` | הפרח נפתח במרכז, מול העיניים, ומבינים אותו גם בלי צבע. לפני כל סצנה שאלו: מה הדבר האחד שחייבים לראות? | |

### Lesson 4 · Straight ahead vs pose to pose (12 frames, 12 fps · K1, K7, K12 · blanks 2 to 6, 8 to 11)

| Key | Hebrew | Chars / notes |
|---|---|---|
| `lesson.4.title` | ברצף או מתנוחה לתנוחה | 21. The literal "ישר קדימה" version is 25, over the limit |
| `lesson.4.explanation` | יש שתי דרכים לצייר תנועה: ברצף, פריים אחרי פריים בלי לדעת איפה תסיימו, או מתנוחה לתנוחה, קודם הרגעים החשובים ואז מה שביניהם. ברצף יוצא חי ומפתיע, כמו אש או מים, ומתנוחה לתנוחה יוצא מדויק, כי יודעים מראש לאן מגיעים. | 2 sentences |
| `lesson.4.caption` | אותו כדור, פעם ברצף ופעם מתנוחה לתנוחה | |
| `lesson.4.goal` | גלגלו כדור בשתי הדרכים | 22 |
| `lesson.4.step.1` | חלק א', ברצף: פריים 1 מוכן. ציירו את פריימים 2 עד 6 לפי הסדר, כל אחד ממשיך מהקודם. | |
| `lesson.4.step.2` | אל תתכננו לאן הכדור יגיע. תנו לו להתגלגל. | |
| `lesson.4.step.3` | חלק ב', מתנוחה לתנוחה: פריים 7 ופריים 12 מוכנים, ההתחלה והסוף. ציירו ביניהם את פריימים 8 עד 11. | |
| `lesson.4.step.4` | לחצו על ▶︎ (הפעלה) והשוו: איזה חצי מרגיש חופשי, ואיזה מדויק? | |
| `lesson.4.done` | ניסיתם את שתי הדרכים. אפשר גם לשלב: לתכנן את התנוחות הראשיות, ולצייר ברצף דברים חופשיים כמו שיער, אש ובד. | |

### Lesson 5 · Follow through and overlapping action (8 frames, 12 fps · P1 to P8 body, stops at frame 4 · scarf on all 8)

| Key | Hebrew | Chars / notes |
|---|---|---|
| `lesson.5.title` | המשך תנועה ותנועה חופפת | 23. The plan's longest name, 2 lines on the card |
| `lesson.5.explanation` | כשגוף עוצר, לא כל החלקים שלו עוצרים באותו רגע: שיער, זנב או צעיף ממשיכים לזוז עוד קצת ורק אז נרגעים. גם בזמן תנועה כל חלק זז בקצב משלו, וזה מה שהופך אותה לרכה ואמיתית ולא לתנועה של בובת קרטון. | 2 sentences. "גם" before "בזמן תנועה", the stressed phrase |
| `lesson.5.caption` | הדמות עוצרת, והצעיף ממשיך להתנופף | |
| `lesson.5.goal` | ציירו צעיף שממשיך לזוז | 22 |
| `lesson.5.step.1` | הדמות כבר מצוירת בכל 8 הפריימים. היא רצה ועוצרת בפריים 4. | |
| `lesson.5.step.2` | בפריימים 1 עד 4 הצעיף נגרר מאחוריה, כי היא רצה. | Direction-free on purpose (see Notes) |
| `lesson.5.step.3` | בפריים 4 הגוף עוצר, אבל הצעיף לא. בפריימים 5 ו-6 הוא ממשיך קדימה, מעבר לגוף. | |
| `lesson.5.step.4` | בפריימים 7 ו-8 הוא נופל ונרגע. ואז לחצו על ▶︎ (הפעלה). | |
| `lesson.5.done` | הגוף עצר והצעיף המשיך, כמו שקורה באמת. שימו לב לזה בפעם הבאה שמישהו עם קוקו עוצר בריצה. | |

### Lesson 6 · Slow in and slow out (9 frames, 12 fps · K1, K9 · blanks 2 to 8 · G2 to G8 spacing ticks)

| Key | Hebrew | Chars / notes |
|---|---|---|
| `lesson.6.title` | האצה והאטה | 10. Says what happens, speeding up and slowing down |
| `lesson.6.explanation` | דברים אמיתיים לא מתחילים ולא עוצרים בבת אחת: מכונית יוצאת לאט, נוסעת מהר ומאטה לפני הרמזור. באנימציה עושים את זה עם מרווחים: הכדור זז רק קצת בין פריים לפריים בהתחלה ובסוף, והרבה באמצע, שם התנועה מהירה. | 2 sentences |
| `lesson.6.caption` | הכדור יוצא לאט, טס באמצע ונעצר בעדינות | |
| `lesson.6.goal` | ציירו כדור על כל סימון | 22 |
| `lesson.6.step.1` | פריים 1 ופריים 9 מוכנים: הכדור בנקודת ההתחלה ובנקודת הסוף. | No line is drawn on the two ready frames, so the step does not speak of one |
| `lesson.6.step.2` | הדליקו את הרמזים. יופיע קו, ועליו סימונים: צפופים בקצוות ורחוקים באמצע. | The line is a hint: it shows only on frames 2 to 8, with "רמזים" on |
| `lesson.6.step.3` | בפריימים 2 עד 8 ציירו בכל פריים כדור אחד, על הסימון של אותו פריים. | |
| `lesson.6.step.4` | לחצו על ▶︎ (הפעלה). הכדור מאט לא כי ציירתם אותו לאט, אלא כי בכל פריים הוא זז רק קצת מהמקום הקודם. | The one idea the lesson exists for: spacing is speed. The spacing is on the drawing, not on the strip |
| `lesson.6.hint.2` | צעד קטן: הכדור רק יוצא לדרך | 27 |
| `lesson.6.hint.3` | קצת יותר רחוק: הוא מאיץ | 23 |
| `lesson.6.hint.4` | צעד גדול: הוא כבר מהיר | 22 |
| `lesson.6.hint.5` | אמצע הקו: המהירות בשיא | 22 |
| `lesson.6.hint.6` | עוד צעד גדול, עדיין מהיר | 24 |
| `lesson.6.hint.7` | הצעדים מתקצרים: הוא מאט | 23 |
| `lesson.6.hint.8` | צעד קטן לפני העצירה | 19 |
| `lesson.6.done` | הכדור שלכם מאיץ ומאט רק בזכות המרווחים. אותו כלל עובד על דלת שנסגרת, יד שמנופפת ומעלית שעוצרת. | |

### Lesson 7 · Arcs (9 frames, 12 fps · K1, K9 · blanks 2 to 8 · G2 to G8 dashed arc)

| Key | Hebrew | Chars / notes |
|---|---|---|
| `lesson.7.title` | תנועה בקשת | 10 |
| `lesson.7.explanation` | כדור שנזרק עף בקשת, יד שמנופפת מסתובבת סביב הכתף, וראש שמסתובב עובר בחצי עיגול. כשתנועה עוברת בקו ישר היא נראית כמו של מכונה, וכשהיא עוברת בקשת היא נראית טבעית. | 2 sentences |
| `lesson.7.caption` | כדור נזרק, עולה בקשת ונופל | |
| `lesson.7.goal` | ציירו את הכדור לאורך הקשת | 25 |
| `lesson.7.step.1` | פריים 1 ופריים 9 מוכנים: הכדור בנקודת הזריקה ובנקודת הנחיתה. | |
| `lesson.7.step.2` | הדליקו את הרמזים: קשת מקווקוות מראה את הדרך. | |
| `lesson.7.step.3` | בפריימים 2 עד 8 ציירו את הכדור על הקשת, מתקדם קצת בכל פריים. פריים 5 הוא אמצע הדרך, בראש הקשת. | Assumes the apex sits at frame 5 (see Notes) |
| `lesson.7.step.4` | לחצו על ▶︎ (הפעלה) ועקבו אחרי הכדור בעין: הוא צריך לעוף בקו עגול, בלי פינות. | |
| `lesson.7.hint.2` | עולה, בתחילת הקשת | 17 |
| `lesson.7.hint.3` | עולה, עוד על הקשת | 17 |
| `lesson.7.hint.4` | כמעט בראש הקשת | 14 |
| `lesson.7.hint.5` | בראש הקשת: אמצע הדרך | 20 |
| `lesson.7.hint.6` | מתחיל לרדת | 10 |
| `lesson.7.hint.7` | יורד על הקשת | 12 |
| `lesson.7.hint.8` | כמעט בנחיתה | 11 |
| `lesson.7.done` | הכדור שלכם עף בקשת ולא בקו ישר. נסו את זה על ראש שמסתובב או על רגל שצועדת: גם הן זזות בקשתות. | |

### Lesson 8 · Secondary action (8 frames, 12 fps · P1 to P8 flower opening · leaf on all 8)

| Key | Hebrew | Chars / notes |
|---|---|---|
| `lesson.8.title` | פעולה משנית | 11 |
| `lesson.8.explanation` | מישהו הולך ובאותו זמן שורק, או פרח נפתח ועלה שלו מתנדנד ברוח: תנועה קטנה מצטרפת לפעולה הראשית ומספרת עוד משהו. זו פעולה משנית, והיא מוסיפה חיים בלי לגנוב את ההצגה, ולכן היא קטנה ושקטה יותר מהפעולה הראשית. | 2 sentences. Example first, name second |
| `lesson.8.caption` | הפרח נפתח, והעלה מתנדנד לידו | |
| `lesson.8.goal` | ציירו עלה שמתנדנד ברוח | 22 |
| `lesson.8.step.1` | הפרח שנפתח כבר מצויר בכל 8 הפריימים. | |
| `lesson.8.step.2` | ציירו עלה על הגבעול בכל פריים, ובכל פעם הטו אותו קצת: לצד אחד, ואז בחזרה. | |
| `lesson.8.step.3` | שמרו על תנועה קטנה. העלה מוסיף, הפרח הוא העיקר. | |
| `lesson.8.step.4` | לחצו על ▶︎ (הפעלה) ובדקו: העין הולכת קודם לפרח? | |
| `lesson.8.done` | העלה שלכם זז, והפרח עדיין במרכז. זה האיזון: פעולה משנית מוסיפה חיים ולא מתחרה. | |

### Lesson 9 · Timing (8 frames, 12 fps · K1 to K6 the fall · blanks 7, 8 · holds unlocked)

| Key | Hebrew | Chars / notes |
|---|---|---|
| `lesson.9.title` | תזמון | 5 |
| `lesson.9.explanation` | אותה נפילה בדיוק יכולה להיראות כמו של כדור באולינג כבד או של כדור פינג-פונג קל, רק לפי כמה זמן כל ציור נשאר על המסך. זה תזמון: כמה פריימים כל תנועה מקבלת, וזה מה שמספר לצופה כמה משהו שוקל ואיך הוא מרגיש. | 2 sentences. Example first, name second. The first one sets up the hold step |
| `lesson.9.caption` | אותה נפילה פעמיים: כבדה וקלה | |
| `lesson.9.goal` | ציירו את הנחיתה ושנו את ההחזקה | 30 |
| `lesson.9.step.1` | פריימים 1 עד 6 מוכנים: הכדור נופל. | |
| `lesson.9.step.2` | בפריימים 7 ו-8 ציירו איך הוא נוחת ונרגע. כבד? נעצר כמעט מיד. קל? קופץ עוד קצת. | Either choice passes the done rule |
| `lesson.9.step.3` | בשיעור הזה אפשר לשנות החזקה, וצריך לשנות לפחות אחת כדי לסיים. לחצו על פריים ברצועה, לחצו עליו שוב, ולחצו על + ליד החזקה. | Tapping the selected thumbnail again opens the frame menu (plan). The done rule of this lesson needs one changed hold, and the step now says so (R15) |
| `lesson.9.step.4` | לחצו על ▶︎ (הפעלה) ונסו כמה החזקות. פריים שנשאר יותר זמן על המסך נותן לנחיתה משקל. | |
| `lesson.9.done` | שיניתם תזמון בלי לשנות אף קו. לפעמים זה כל ההבדל בין נוצה לסלע. | |

### Lesson 10 · Exaggeration (8 frames, 12 fps · K1, K2, K4, K5, K7, K8 · blanks 3, 6 · G3, G6 mild pose)

| Key | Hebrew | Chars / notes |
|---|---|---|
| `lesson.10.title` | הגזמה | 5 |
| `lesson.10.explanation` | תנועה שמצוירת בדיוק כמו במציאות נראית באנימציה חלשה, אז מגדילים אותה: כריעה עמוקה יותר, קפיצה גבוהה יותר, הבעה ברורה יותר. הגזמה טובה לא משנה את מה שקורה, היא רק מחזקת אותו כדי שירגישו אותו גם מרחוק. | 2 sentences |
| `lesson.10.caption` | קפיצה רגילה, ואז אותה קפיצה בהגזמה | |
| `lesson.10.goal` | ציירו כריעה וקפיצה בהגזמה | 25 |
| `lesson.10.step.1` | רוב הפריימים מוכנים. חסרים שניים: פריים 3 ופריים 6. | |
| `lesson.10.step.2` | הדליקו את הרמזים. הקו המקווקו מראה תנוחה רגילה, והמשימה היא להגזים יותר ממנו. | |
| `lesson.10.step.3` | בפריים 3 ציירו כריעה עמוקה יותר מהקו המקווקו: ברכיים כפופות, ראש נמוך. | |
| `lesson.10.step.4` | בפריים 6 ציירו קפיצה גבוהה יותר מהקו המקווקו: ידיים למעלה, גוף ארוך. | |
| `lesson.10.step.5` | לחצו על ▶︎ (הפעלה). עדיין נראה רגיל? הגזימו עוד. | |
| `lesson.10.hint.3` | כריעה עמוקה יותר מהקו המקווקו | 29 |
| `lesson.10.hint.6` | קפיצה גבוהה יותר מהקו המקווקו | 29 |
| `lesson.10.done` | דחפתם את התנוחות מעבר לרגיל, והקפיצה קיבלה כוח. הגזמה עובדת כשהיא מחזקת את מה שכבר נכון. | |

### Lesson 11 · Solid drawing (8 frames, 12 fps · P1 to P8 circle · K1, K5 stripe · blanks 2 to 4, 6 to 8)

| Key | Hebrew | Chars / notes |
|---|---|---|
| `lesson.11.title` | ציור עם נפח | 11. Plainer than the literal "ציור מוצק" |
| `lesson.11.explanation` | פס שמקיף כדור חוף לא נראה ישר: הוא מתעקל סביב הכדור, וכשהכדור מסתובב חלק מהפס נעלם מאחור וחלק אחר מגיע מקדימה. זה ציור עם נפח: מציירים כל דבר כאילו יש לו צד קדמי, צד אחורי ועובי, ואז הוא נראה כמו חפץ אמיתי ולא כמו מדבקה שטוחה. | 2 sentences. Example first, name second. Matches the band geometry in Developer assumption (5) |
| `lesson.11.caption` | כדור עם פס מסתובב, והפס מתעקל סביבו | |
| `lesson.11.goal` | ציירו פס שמסתובב על הכדור | 25 |
| `lesson.11.step.1` | העיגול כבר מצויר בכל הפריימים. בפריים 1 ובפריים 5 יש גם פס מוכן, בשניהם ליד הקצה השמאלי של הכדור. | |
| `lesson.11.step.2` | בפריימים 2 עד 4 הזיזו את הפס ימינה, קצת בכל פריים, עד שבפריים 4 הוא מגיע לקצה הימני. | Matches the stroke data: left edge, left of centre, right of centre, right edge (R18) |
| `lesson.11.step.3` | ציירו את הפס מעוקל, כמו קו על כדור אמיתי. ליד שולי העיגול הוא מתעקל יותר ונצמד לקו של העיגול. | Foreshortening, in kid words, true for the band in assumption (5) |
| `lesson.11.step.4` | בפריים 5 הפס מופיע שוב משמאל: זה החצי השני שלו, שהגיע מאחורי הכדור. בפריימים 6 עד 8 הזיזו אותו שוב ימינה, כמו בפריימים 2 עד 4, ואז לחצו על ▶︎ (הפעלה). | Frames 1 and 5 are half a turn apart, and half a turn of a band through both poles looks the same: frame 5 is the second half arriving, not a new place |
| `lesson.11.done` | הפס שלכם עוטף את הכדור, ולכן העיגול נראה כמו כדור. אותה מחשבה עובדת על פסים של חולצה, חגורה או הטבעות של שבתאי. | |

### Lesson 12 · Appeal (6 frames, 12 fps · P1 to P6 body · K1, K4 arm · blanks 2, 3, 5, 6)

| Key | Hebrew | Chars / notes |
|---|---|---|
| `lesson.12.title` | דמות עם קסם | 11 |
| `lesson.12.explanation` | יש דמויות מצוירות שכיף להסתכל עליהן גם כשהן רק עומדות ומחכות: הצורות שלהן ברורות, ומבינים מיד מה הן מרגישות. לזה קוראים קסם, וגם נבל יכול להיות מלא קסם, כל עוד מבינים מי הוא ומה הוא מרגיש. | 2 sentences. Example first, name second |
| `lesson.12.caption` | הדמות מדף הבית מנופפת לשלום | Same character as the Home flipbook |
| `lesson.12.goal` | ציירו את היד מנופפת | 19 |
| `lesson.12.step.1` | הגוף כבר מצויר בכל 6 הפריימים. בפריים 1 ובפריים 4 היד מוכנה, בשני הקצוות של הנפנוף. | |
| `lesson.12.step.2` | בפריימים 2 ו-3 ציירו את היד עוברת מהתנוחה של פריים 1 לזו של פריים 4. בפריימים 5 ו-6, בחזרה. | |
| `lesson.12.step.3` | הזיזו את היד בקשת סביב הכתף, כמו הכדור בשיעור 7. | Callback to arcs |
| `lesson.12.step.4` | רוצים? הוסיפו לדמות משהו משלכם, כובע או בלון, בפריים ריק שתבחרו. זה לא חובה, והשיעור ייספר גם בלעדיו. | The character already has a face in every frame, so the free extra is something of the child's own. Not checked by Done |
| `lesson.12.step.5` | לחצו על ▶︎ (הפעלה). | Nearly silent last step |
| `lesson.12.done` | הדמות שלכם מנופפת, ורואים מה היא מרגישה. זה השיעור האחרון במסלול: מכאן, בכל אנימציה אפשר לשלב כמה עקרונות יחד. | Does not say "all 12 done": lessons open in any order |

---

## 3. Derived strings for Developer to check (built from ui-copy formulas, not new copy)

Exercise line on Lesson detail, from ui-copy `lesson.exercise.frames` / `.base` and the plan's table:

| n | Exercise line |
|---|---|
| 1 | 8 פריימים, 2 מוכנים |
| 2 | 10 פריימים, 3 מוכנים |
| 3 | 6 פריימים, 2 מוכנים |
| 4 | 12 פריימים, 3 מוכנים |
| 5 | 8 פריימים עם ציור בסיס |
| 6 | 9 פריימים, 2 מוכנים |
| 7 | 9 פריימים, 2 מוכנים |
| 8 | 8 פריימים עם ציור בסיס |
| 9 | 8 פריימים, 6 מוכנים |
| 10 | 8 פריימים, 6 מוכנים |
| 11 | 8 פריימים, 2 מוכנים |
| 12 | 6 פריימים, 2 מוכנים |

Goal-strip progress totals (blank frames, for "{done}/{total} צוירו"): 6, 7, 4, 9, 8, 7, 7, 8, 2, 2, 6, 4.

---

### Notes

- **Angle:** the half-drawn lesson. Each explanation opens on something the reader has already seen (a ball hitting the floor, a car at a red light, a ponytail after a run) and names the idea only after that. Each done line takes the principle out of the app and into the world, so the stamp means "you can now spot this", not "good job".
- **Names, one alternative weighed:** literal translations ("ציפייה", "ישר קדימה מול תנוחה לתנוחה", "ציור מוצק", "משיכה") were rejected. "ציפייה" and "משיכה" mean nothing to a 12-year-old until someone explains them, "ישר קדימה..." is 25 chars, and "משיכה" is easy to misread as gravity (כוח משיכה). The names used say what you actually do. Lesson 1 and lesson 5 keep the plan's own names.
- **Assumptions Developer must match in `lessons.js` stroke data, or tell me:** (1) lesson 7's hints and step 3 put the top of the arc at frame 5, the middle of 9 frames; (2) lesson 6's hints assume the ticks are tight at frames 2, 3, 7, 8 and widest around frame 5, as the plan says ("bunched at both ends"); (3) lesson 12 does not say which of K1 or K4 is arm up, so either works; (4) lesson 5 says "behind her" rather than left or right, so the run direction is free; (5) lesson 11's stripe is a band that goes all the way around the ball through both poles (like the seam on a beach ball) and turns about the vertical axis, with K1 and K5 half a turn apart. Part of the band is always visible on every frame, so B2 to B4 and B6 to B8 each have an honest 50+ pixels of band to draw. The explanation ("חלק מהפס עובר מאחוריו") and step 3 ("מתעקל יותר ונצמד לקו של העיגול") describe this shape only; if the stroke data uses another stripe, tell me.
- **Hint placement is a suggestion, not a plan change:** the plan gives no spot for hint text. Every hint is 28 chars or fewer, the goal slot's own limit, so it can swap in for the goal while "רמזים" is on and a G frame is current. If Developer puts hints somewhere else, the text still works.
- **Consistency with ui-copy:** no string here repeats or rewords a ui-copy key. The credit is the exact `settings.about.credit` sentence. "הפעלה", "רמזים", "החזקה", "רצועה" and "פריים מוכן" are used the way ui-copy uses them. The plan's singular goal sample ("צייר את הכדור...") is replaced by the plural, as in ui-copy.
- **Checks run by script on this file (now in `tests/ws3.test.mjs`, so they run with every test run):** titles 24 chars or fewer (longest: lesson 5, 23); goals 30 or fewer (longest: lesson 9, 30); hints 30 or fewer (longest: lesson 2 frame 4, 30); captions 38 or fewer (longest: lesson 4, 38); each explanation has exactly 2 sentence-ending marks and no "?" or "!"; zero U+2014 and U+2013 in the file; 17 hints, only on lessons 2, 6, 7, 10; the word "רמזים" appears in steps only in those 4 lessons; every lesson names Play exactly once, in its last step, as "לחצו על ▶︎ (הפעלה)".
- **Fix round 2026-10, what changed and why (texts are the Copywriter's proposals from the copy audit, applied by key):** lesson 11 steps 1, 2 and 4 now describe the stripe the stroke data really draws (the drawing was right, the words were wrong); lesson 9 says that one hold must change, in step 3 and in the goal; lesson 12 step 4 no longer asks for a face that is already there; lesson 6 steps 1 and 2 no longer speak of a line on the ready frames; lesson 2 step 6 and lesson 1 step 6 lost two misreadings ("הורידו" as download, "קשה" as difficult); explanations 8, 11 and 12 were tightened, still two sentences each; lesson 1 is "מתיחה ומעיכה"; the credit names Johnston first, so "ואולי" can no longer be read as "and maybe".

---
**בדיקת עברית:** 8/8 items walked, fixed 3 issues. (1) Gender: all instructions are plural, and the done lines use plural past tense. (2) "גם" placement: checked in all 9 places it appears (lesson 3 twice, 4, 5, 7, 10, 11, lesson 12 twice), and each one sits before the word it stresses. (3) Translated-sounding names: "ציפייה", "ציור מוצק" and "משיכה" were swapped for plain names. Kill-table walked row by row: no corporate words, no "מקצה לקצה", no "מדהים". Hype words: none. "הכי" appears once, as a position in the sequence (lesson 2 step 3). No arrows in Hebrew text.
