## Site Plan: FlipLoop

**Goal:** a stranger draws a few frames and sees them move within 60 seconds, then returns for lessons and the weekly challenge. · **Audience:** Hebrew-speaking kids, teens, and a broad public on phone or laptop (the ICP file describes this system's clients, not FlipLoop's users).

**Site type:** Track B personal creative web app, closest to SaaS/Digital Product (#5) minus Pricing and Signup, since there is no account and nothing to sell. **Page count driver:** one screen per real job (start, draw, learn, take part, manage work) plus 2 support screens (print, storage): 8 screens and 1 overlay. Credits live in Settings, so there is no About page.

**Involvement quadrant (Researcher):** Low / Feel. "New animation" opens a drawable canvas at once: no size dialog, no naming, no tutorial wall. Explanations stay 1 to 2 lines.

**Build quality bar (about-me.md) mapped to a creative tool:** real Home screen (the light table); stages = the 12 lesson stations on a visible path; meta-progression = lesson stamps and weekly challenge stamps; power-ups = **unlocked starters** (a finished lesson adds its subject to a "Start from" row in the Gallery, since a drawing tool has no win condition); concrete theme = light table, film strip, and the waving character (Home and lesson 12).

---

## The 6 settled decisions (settled before any screen)

### (a) Navigation topology: hub-and-spoke from Home, with one nested stack
- **Top level:** hub-and-spoke. Home dispatches to Editor, Lessons, Challenge, Gallery. Each screen has one Back control to its parent, never sideways.
- **Nested stack:** Lessons → Lesson detail → Editor (lesson mode), each step a history entry.
- **Alternative weighed, rejected: bottom tab bar** (Home / Lessons / Gallery / Challenge). At 375px a 56px bar plus tool row plus film strip pushes the canvas under 250px tall; sessions are single-branch (draw one thing or do one lesson, leave); and the bar would have to hide inside the Editor anyway.
- **Parent map:** Editor (free/challenge) → Gallery; Editor (lesson) → Lesson detail; Lesson detail → Lessons; Lessons, Challenge, Gallery, Settings → Home; Print → Editor.
- **History:** routes are hash changes, so browser and Android Back work natively. Hidden views get `inert` + `hidden`. `#/new` uses `location.replace` so Back never re-creates a project.

### (b) Hash routes

| Route | Screen | Cold arrival (no history, fresh tab) |
|---|---|---|
| `#/` | Home | Normal. |
| `#/new` | Creates a free project, then replaces the route with `#/editor/{id}` | Works. |
| `#/editor/{id}` | Editor | If the id is not on this device: "Not found" state (see Editor). |
| `#/editor/{id}/export` | Export overlay on top of the Editor | Opens the Editor, then the overlay. |
| `#/print/{id}` | Print sheet preview | Same not-found state as the Editor. |
| `#/lessons` | Lessons path | Normal. |
| `#/lesson/{n}` (n = 1 to 12) | Lesson detail | Normal. An n out of range redirects to `#/lessons`. |
| `#/challenge` | This week's challenge | Normal, computed from the date. |
| `#/gallery` | Gallery | Normal (empty state if no projects exist). |
| `#/settings` | Storage and settings | Normal. |
| anything else | redirect to `#/` | |

**Deep-link scope:** project routes are device-local; only `#/lesson/{n}` and `#/challenge` show the same thing everywhere. **Open Graph:** one static title and one 1200x630 PNG image of the light table for all URLs (no server, nothing needs personalization).

### (c) Data model (IndexedDB database `fliploop`, version 1)

**Store `projects`** (key `id`, a UUID):

| Field | Type / values |
|---|---|
| `id`, `title` | string. Title is at most 40 characters. The default is "אנימציה חדשה" plus the date. |
| `kind` | `"free"` \| `"lesson"` \| `"challenge"` |
| `lessonId` | 1 to 12 (lesson projects only) |
| `challengeWeek` | integer week index (challenge projects only) |
| `width`, `height` | 480x360 (default) or 360x360 (square) |
| `fps` | 6 \| 12 \| 24 (default 12) |
| `playMode` | `"loop"` \| `"pingpong"` (default loop) |
| `onion` | `{enabled: true, prev: 1, next: 1}`. Each count is 0 to 2. |
| `frameOrder` | array of frame ids, length 1 to 120 |
| `thumbBlob` | PNG, 160x120, taken from frame 1 on every save |
| `createdAt`, `updatedAt`, `schemaVersion: 1` | |

**Store `frames`** (key `id`, index `projectId`): `imageBlob` (a PNG with a transparent background, full canvas size), `hold` (1 to 12, default 1), `lessonRole` (`"free"` \| `"key"` \| `"blank"`), `locked` (true only for lesson key frames).

**Store `meta`** (key/value): `settings` (onboarding flags, `lastBackupAt`, `persistRequested`, `persistGranted`, `printPaper`: A4 or Letter), `progress` (`lessonsDone: {n: ISO date}`, `challengeWeeks: [weekIndex]`).

**Rules**
- One frame = one bitmap layer, shown over paper white; every export flattens onto opaque white.
- **Lesson prepared-frame format** (static `js/data/lessons.js`, never stored per user): `{n, fps, playMode, frames: [{role, strokes, guides}]}`. `strokes` = vector data `[{color, width, points:[[x,y]...]}]`, rasterized into the frame bitmap when the exercise is created. `guides` = dashed hints drawn on a separate guide layer at render time, never baked in, never exported.
- **Undo:** up to 50 steps per frame, each storing only the changed rectangle as a before/after PNG patch. Global in-memory budget 64 MB (32 MB if `navigator.deviceMemory` is 2 or less); when exceeded, the oldest steps of non-current frames go first, the current frame's 50 are always kept. The first eviction in a session raises W5, so the user is told when this happens. Undo is memory-only and cleared on reload (stated in Settings help).

### (d) Autosave, `storage.persist()`, and storage warnings

**Autosave:** 2 s after the last stroke ends; immediately after any frame operation (add, delete, duplicate, reorder, hold); at least every 10 s while dirty; and on `visibilitychange` hidden and `pagehide`. Only dirty frames are written, in one transaction with the project record. Top bar status: "שומר…" / "נשמר" / "לא נשמר" (opens W3).

**`persist()`:** called once, after the first successful save of a project with at least one stroke, never on load. Result stored in `meta.settings`; `navigator.storage.persisted()` is re-read silently on each load (it can flip after a bookmark or install). Settings shows the real result.

**Warning states** (copy direction below; Copywriter finalizes the wording):

| ID | Trigger | Where | Message direction | Action |
|---|---|---|---|---|
| W1 Not protected | `persisted()` is false AND at least 1 saved project. It comes back after dismissal when `lastBackupAt` is older than 7 days and some project changed since then. | Banner on Home and Gallery, never in the Editor | "העבודות שמורות רק בדפדפן הזה. דפדפנים מסוימים מוחקים אותן אחרי תקופה בלי כניסה. כדאי לשמור קובץ גיבוי." | "שמור גיבוי" (downloads a full backup, then sets `lastBackupAt`) |
| W2 Nearly full | `estimate()` usage/quota reaches 0.80 or more. Checked on load and after saves, at most once per 60 s. | Strip in the Editor top bar, plus Gallery | "האחסון במכשיר כמעט מלא (82%)." | "לגלריה" (to export and delete old work) |
| W2b Full | usage/quota reaches 0.95 or more | Modal when adding a frame or a project | Adding is blocked; existing work can still be edited and exported | "שמור קובץ פרויקט" |
| W3 Save failed | a save rejects (`QuotaExceededError` or any other error) | Red strip in the Editor that stays until a save succeeds. Retries every 10 s. | "השמירה נכשלה. הציור עדיין פתוח כאן, אבל לא שמור. הורד קובץ פרויקט עכשיו." | "הורד קובץ פרויקט" (built from memory, so it works without IndexedDB) |
| W4 Frame limit | 100 frames: soft notice. 120 frames: the add button is disabled. | Film strip | "נשארו 20 פריימים" / "הגעת ל-120 פריימים, המקסימום" | none |
| W5 Memory tight | The undo budget evicts steps for the first time in a session, OR `navigator.deviceMemory` is 2 or less and the project reaches 60 frames. Whichever comes first; shown at most once per session. | One-time toast in the Editor, not blocking | "הזיכרון במכשיר מתמלא. בפריימים אחרים נשמרים פחות צעדי ביטול; בפריים הנוכחי נשמרים 50." | none (the "הבנתי" close) |

This table covers the packet's "storage/memory approaches its limit" as two separate cases: storage (W1, W2, W2b, W3, W4) and memory (W5).

### (e) Editor states

| State | Canvas input | Onion skin | Strip | Controls available |
|---|---|---|---|---|
| Loading | off | n/a | skeleton | Back |
| Ready (drawing) | on | on if enabled | static, current frame selected | all |
| Moving (Move tool dragging) | the drag moves the whole frame. Pixels pushed past the edge are lost on release, and one undo brings them back. | on | static | all |
| **Playing** | **off: you cannot draw while playing.** A tap on the canvas stops playback. | **hidden** | runs under a fixed gate in the middle of the strip, like film through a projector | Stop, fps, loop/ping-pong. Everything else is dimmed. |
| Exporting | off (the overlay is modal) | n/a | n/a | Cancel only |
| Save error (W3) | on | on | on | all, plus the W3 strip |
| Not found | n/a | n/a | n/a | "לגלריה", "אנימציה חדשה" |

**Stop rule:** playback stops on the frame showing; it becomes current, the strip scrolls to it, onion fades back. Space and Play toggle playback. A canvas tap only stops it; in Ready it draws. Holds are respected; ping-pong plays 1..N..2 without repeating end frames.
**First Play:** every Play with 2+ frames runs the choreography (onion out, strip moving, drawing moving). Timing and motion are Web Designer's call; only the states are settled here.

### (f) Timeline direction under RTL: the strip runs left to right
- **Frame 1 at the LEFT end, frames advance rightward, "+" at the right end.** During playback the film slides leftward past the fixed gate.
- **Why it does not mirror:** the strip is a time axis, not a reading list. The play icon points right everywhere, media playback controls conventionally stay LTR in RTL interfaces, Israeli school graphs run time left to right, and the printed flipbook binds left. A mirrored strip would put the play arrow against the direction of travel.
- **Mirrors (everything else):** layout, headers, tool rail (right, the start side), text, Gallery grid, Lessons path (station 1 on the right).
- **LTR island, exactly:** film strip, playback bar (play, step, fps, loop mode), and frame keys (→ next, ← previous) sit in `dir="ltr"`; Hebrew labels inside keep `dir="rtl"`. Print sheets order cards left to right, top to bottom. **Web Designer styles from this and does not re-decide it.**

---

**Store screenshot set:** not applicable (no store). README preview order: 1. Editor mid-Play (the selling moment); 2. lesson mode with locked keys; 3. print sheet preview.

**Onboarding, first 60 seconds:**
1. Home: flipbook waving, 3 buttons (the buffet choice: draw, learn, challenge).
2. "אנימציה חדשה" → Editor, frame 1 empty, pencil M, black. Coach mark 1 at canvas: "צייר משהו".
3. After the first stroke: coach mark 2 at "+": "הוסף פריים וצייר שוב, קצת זז".
4. After frame 2 has a stroke: coach mark 3 at Play: "עכשיו לחץ Play". First Play.
Coach marks: one line, never block input, closable, shown once (flags in `meta.settings`, reset in Settings).

**Permission requests:** none needed (no camera, mic, location, notifications; `persist()` shows no prompt). Chrome may ask "allow multiple downloads" for print PNGs; each sheet has its own button as fallback.

**Home-screen shortcuts:** `manifest.webmanifest` with 2, in order: "אנימציה חדשה" → `#/new` (the core repeat action) and "האתגר השבועי" → `#/challenge` (the weekly return trigger). Lessons did not earn a slot (a one-time path). Manifest icons: 192x192 and 512x512 px PNG, `purpose: "maskable"`. Android: near-zero cost, only if installed. iOS: none. Service worker/offline cache: out of scope.

---

## Screen list (8 screens + 1 overlay)

| # | Screen | Route | Purpose | Parent |
|---|---|---|---|---|
| 1 | Home | `#/` | Show the idea in 5 seconds and dispatch to the 3 jobs | none (hub) |
| 2 | Editor (free, challenge, and lesson mode) | `#/editor/{id}` | Draw frames and play them | Gallery, or Lesson detail |
| 3 | Export overlay | `#/editor/{id}/export` | Take the work out: GIF, video, print, project file | Editor |
| 4 | Print preview | `#/print/{id}` | Printable flipbook sheets as PDF or PNG | Editor |
| 5 | Lessons | `#/lessons` | The 12 stations and your stamps | Home |
| 6 | Lesson detail | `#/lesson/{n}` | Explanation, example, start the exercise | Lessons |
| 7 | Challenge | `#/challenge` | This week's theme and your challenge stamps | Home |
| 8 | Gallery | `#/gallery` | Your projects: open, duplicate, back up, import | Home |
| 9 | Settings | `#/settings` | Storage status, backup and restore, tips, credits | Home |

Document title: "FlipLoop" on Home, and "FlipLoop · {screen name}" elsewhere, so screen readers announce route changes.

---

## Page-by-Page Spec

### 1. Home
**Purpose:** prove "your drawing can move" in 5 seconds. **Promise:** "Draw a few frames and watch them move." **Scan:** Z (sparse): logo, flipbook, buttons.
**Sections (mobile order):**
1. Header (no heading): wordmark right; labeled icon links left: "העבודות שלי" (Gallery), "שמירה והגדרות" (Settings).
2. **H1 "FlipLoop"** + one-line subtitle (draw frames, watch them move, no sign-up).
3. Light table with the self-flipping flipbook: 8 pre-authored frames of the waving character, 12 fps loop; reduced motion = still frame, tap flips one page. `aria-hidden`.
4. Actions, in order: **"אנימציה חדשה" (primary)** → `#/new`; "שיעורים" → `#/lessons` (with "3/12" stamps); "האתגר של השבוע" → `#/challenge` (theme name as second line).
5. "המשך: {title}" link to the last edited project (only if one exists).
6. W1 banner slot, below the actions.
**CTA:** one primary; ratio 1 primary : 2 secondary : 3 small links. Anxiety "do I need to sign up or set up?" is offset by the canvas opening directly. Primary needs strong contrast against the light table (color: Web Designer's call) and sits in the lower half on mobile (thumb zone).
**States:** first visit; returning; W1.

### 2. Editor
**Purpose:** draw frame by frame and see it move. **Promise:** a big calm canvas, strip ready to play. **Scan:** tool surface, canvas central.
**Headings:** visually hidden H1 = project title (the top bar title is an editable field); visually hidden H2 per region (Canvas, Tools, Frames, Playback).

**Mobile layout, top to bottom (375px):**
1. Top bar: Back, title field, save status, "ייצוא".
2. Lesson goal strip (lesson mode only).
3. Canvas fit to width (343x257; 343x343 square). Pointer Events for mouse, touch, pen.
4. **Tool row, always visible (7):** Pencil (second tap opens S/M/L), Eraser, Fill, Current color (opens swatch panel), Undo, Redo, "עוד".
5. **"More" sheet:** Move, onion (on/off, previous 0 to 2, next 0 to 2), canvas size (4:3/square), clear frame.
6. Film strip (LTR island): 64x48 thumbnails, "+" at the right end, counter "12/120".
7. Playback bar (LTR island): Play/Stop, step ←/→, fps 6/12/24, loop/ping-pong.

**Desktop (1024px+):** tool rail right (start side); canvas center at 1x to 2x; left panel with 12 swatches, picker, and onion settings in place next to the canvas (Researcher's Procreate reference); strip and playback at the bottom. Visual treatment: Web Designer's call.

**Tool rules**
- Pencil 2 / 5 / 10 px, midpoint quadratic smoothing; pen pressure scales 0.5x to 1.5x, mouse/touch fixed 1.0x. Touch is ignored while a pen is active; a second touch pointer cancels the stroke. Eraser: same widths.
- Fill: contiguous, current frame only (onion is not a boundary), tolerance 32.
- 12 swatches + native color input; the last custom color becomes a 13th "recent" chip.
- Frame menu (tap the selected thumbnail again): duplicate, insert blank after, hold ×1 to ×12 ("×3" badge), delete (5 s undo toast). Reorder: 300 ms long-press, then drag, so a swipe still scrolls.
- Keys: Space play, B pencil, E eraser, G fill, V move, 1/2/3 widths, O onion, N new frame, D duplicate, Ctrl+Z / Ctrl+Shift+Z, → / ← frames.
- Canvas size change with content: confirm dialog (drawings stay centered, edges crop or pad).

**Lesson mode (same Editor, `kind: "lesson"`)**
- Goal strip: "שיעור 1 · מתיחה וכיווץ: צייר את הכדור בפריימים הריקים", progress "3/6 צוירו", "הצג רמזים" toggle for guides.
- Key frames: lock badge on thumbnail and canvas; drawing on one shows "זה פריים מוכן. צייר בפריימים הריקים" and highlights the next blank.
- Frame count fixed (no add, delete, reorder); holds off except lesson 9; export works.
- **Done rule:** every blank frame has 50+ non-transparent pixels AND Play was pressed once. Completion sheet: stamp, "לשיעור הבא", "המשך לצייר", "הפוך לפרויקט שלי" (copies to `kind: "free"` with all frames unlocked). The stamp stays either way.

**CTA:** Play (Export is a utility). Anxiety "will I lose my drawing?" is offset by the always-visible save status.
**States:** decision (e), plus W2, W3, W4, W5.

### 3. Export overlay
**Purpose:** get the animation out of the browser. **H2 "ייצוא"**, with 4 option cards (H3 each), in this order:
1. **GIF** ("הכי נוח לשליחה בוואטסאפ"). Full 480x360 or half 240x180. In-house encoder module `js/gif/encoder.js`: exact palette if 256 colors or fewer, else median-cut; LZW; NETSCAPE loop extension; no transparency; frames flattened on white, no onion. **A hold = one GIF frame with delay hold × 1000/fps ms**, rounded to centiseconds with a carried remainder (24 fps gives 4, 4, 5 cs). Ping-pong writes 1..N then N-1..2. Main thread, yields per frame; progress "פריים 37/120" + Cancel.
2. **Video.** Probe `video/mp4;codecs=avc1`, `video/mp4`, `video/webm;codecs=vp9`, `video/webm`; extension follows the winner. Real-time recording from a visible canvas in the overlay; whole cycles repeated to at least 3 s; progress in seconds + Cancel. Empty Blob: "הדפדפן הזה יצר קובץ וידאו ריק. נסה GIF." No MediaRecorder: card disabled with the reason.
3. **Print sheet** → `#/print/{id}`.
4. **Project file** → `{title}.fliploop.json` (project record + frames as PNG data URLs, `schemaVersion: 1`).
When done: "הורד", plus "שתף" if `navigator.canShare({files})`.
**States:** idle, encoding/recording (Editor locked), done, error, cancelled (nothing saved).

### 4. Print preview
**Purpose:** a flipbook you can cut and staple. **H1 "גיליון הדפסה".**
**Layout content (Web Designer styles it, but does not change it):**
- Card 100x60 mm; 20 mm staple margin on the LEFT (binding is physical, not reading direction); image 72x54 mm (4:3) or 54x54 mm (square), padding 4 mm sides, 3 mm top/bottom.
- Frame number inside the staple margin, 8 pt, upright; 2 staple dots, margin lightly shaded.
- Dashed cut lines around every card. 2 across × 4 down = 8 per sheet; A4 default, Letter option; 120 frames = 15 sheets.
- Holds expand to repeated cards, numbered in sequence. Ping-pong return frames: checkbox, off by default.
- Sheet footer: "FlipLoop · {title} · גיליון 3/15" + "סדרו לפי המספרים, 1 למעלה, והדקו בשוליים".
**Sections:** H2 options (paper, ping-pong); H2 sheet previews; actions **"הדפס / שמור כ-PDF"** (primary: `window.print()` + `@page` CSS, PDF via the browser dialog, no library) and "הורד PNG" (300 dpi, one file per sheet, `{title}-sheet-01.png`, plus a button per sheet). Per 03b Ruling 2, a downloaded PDF is also built by the in-house PDF writer. **PDF image encoding, stated default (Developer may change):** each sheet's 300 dpi image is embedded as Flate-compressed RGB pixels (`FlateDecode`, via `CompressionStream("deflate")`) so cut lines stay crisp; where `CompressionStream` is missing, fall back to JPEG (`DCTDecode`, quality 0.92).
**States:** preparing (progress), ready, not found.

### 5. Lessons
**H1 "שיעורים"**, subtitle "12 עקרונות האנימציה, כל אחד בכמה דקות". Path: station 1 right, 12 left (a list, so it mirrors); each shows number, name, stamp if done. **All lessons open from the start**; a "הבא בתור" marker sits on the lowest undone one. CTA: tap a station.
**States:** 0 done; some; all 12 (finished banner).

### 6. Lesson detail
**H1** = lesson name. (H2) "מה זה": 2 original sentences. (H2) "דוגמה": looping mini player at the lesson fps (reduced motion: paused, step buttons). (H2) "התרגיל": goal line + exercise line. **Exercise line** = "{total} פריימים, {K count} מוכנים", where total is the lesson's frame count and K count is its locked key frames, both read from the table below (lesson 1: "8 פריימים, 2 מוכנים"). When K count is 0 (lessons 5 and 8), show "{total} פריימים עם ציור בסיס" (lesson 5: "8 פריימים עם ציור בסיס"). **CTA:** "התחל תרגיל" / "המשך תרגיל" / "פתח שוב" (creates or resumes the single lesson project for n). Previous/next links at the bottom.

**All 12 lessons (counted 12/12).** K = locked key frame, B = blank for the user, G = has a guide hint, P = pre-drawn content on a user frame (editable).

| n | Principle | Example (auto-plays) | Exercise subject | Frames / fps | Pre-drawn | User draws | Done means |
|---|---|---|---|---|---|---|---|
| 1 | Squash and stretch | Ball bounce with a squash on impact | Bouncing ball | 8 / 12 | K1 (top), K5 (squashed on the floor) | B2 to B4 falling and stretched, B6 to B8 rising | all B filled + Play |
| 2 | Anticipation | Figure crouches, then jumps | Stick figure jump | 10 / 12 | K1 stand, K7 in the air, K10 landed | B2 to B6 (the crouch, G4 shows the lowest pose dashed), B8, B9 | same |
| 3 | Staging | Flower opens, centered, facing us | Flower opening | 6 / 6 | K1 bud, K6 open; P2 to P5 pot and ground line | B2 to B5 the petals opening, readable as a silhouette | same |
| 4 | Straight ahead vs pose to pose | Two balls: freehand, then planned | Rolling ball, twice | 12 / 12 | K1 (start of part A); K7, K12 (part B keys) | B2 to B6 drawn in order; B8 to B11 between the keys | same |
| 5 | Follow through and overlapping action | Figure stops, the scarf keeps going | Stick figure with a scarf | 8 / 12 | P1 to P8 the body (it stops at frame 4) | the scarf on all 8, trailing past the stop | scarf strokes on all 8 + Play |
| 6 | Slow in and slow out | Ball eases across the screen | Ball on a line | 9 / 12 | K1, K9; G2 to G8 spacing ticks bunched at both ends | B2 to B8, a ball at each tick | all B + Play |
| 7 | Arcs | Ball thrown along a curve | Thrown ball | 9 / 12 | K1, K9; G2 to G8 a dashed arc path | B2 to B8 along the arc | same |
| 8 | Secondary action | Flower opens while a leaf sways | Flower plus leaf | 8 / 12 | P1 to P8 the flower opening | the swaying leaf on all 8 | leaf strokes on all 8 + Play |
| 9 | Timing | The same drop, heavy and light | Ball drop | 8 / 12 | K1 to K6 the fall | B7, B8 the settle; plus change at least one hold (holds unlocked here) | B filled + a hold changed + Play |
| 10 | Exaggeration | A mild jump, then an exaggerated one | Stick figure jump | 8 / 12 | K1, K2, K4, K5, K7, K8 | B3 deepest crouch, B6 highest stretch; G3 and G6 show the mild pose dashed, to push past | all B + Play |
| 11 | Solid drawing | A striped ball turning, showing volume | Rotating ball | 8 / 12 | P1 to P8 the circle; K1, K5 the stripe positions | the stripe on B2 to B4 and B6 to B8, curving around the form | all B + Play |
| 12 | Appeal | The Home character waving | Waving character | 6 / 12 | P1 to P6 the body; K1, K4 the arm | the arm on B2, B3, B5, B6, plus an optional face on any blank frame (not checked by Done) | all B + Play |

**Content rule:** each example is the completed exercise, stored as stroke data in `lessons.js` (no image files). Copywriter writes original sentences and goal lines, naming principles only; Hebrew names are Copywriter's call, and the longest ("המשך תנועה ותנועה חופפת") must fit a station card in 2 lines.

### 7. Challenge
**Purpose:** one shared theme a week, the return trigger. **H1 "האתגר של השבוע"**.
**Rule (deterministic, no server):** epoch = Sunday 2026-01-04 (Israeli week starts Sunday). `weekIndex = floor(daysBetween(epoch, today) / 7)`, days counted from local calendar dates via `Date.UTC(y, m, d)` so daylight saving never shifts it. `theme = THEMES[((weekIndex mod 52) + 52) mod 52]` (the double mod keeps the index at 0 to 51 even on a device clock set before the epoch, where JavaScript's `%` would go negative), a fixed 52-item list in `js/data/themes.js` (content: Copywriter's call; each drawable in lines, kid-safe, brand-free). Same theme for everyone; it changes at local midnight Saturday to Sunday. `challengeWeek` stores `weekIndex` (0-based).
**Week label** = `weekIndex + 1`. **Days left** = 7 minus days since this week's Sunday, where days since Sunday = `((daysBetween(epoch, today) mod 7) + 7) mod 7`; today counts as a day left, so Sunday shows 7 and Saturday shows "יום אחרון" instead of a number. If `weekIndex` is below 0 (clock before the epoch), the label drops the week number and shows only the days left.
Worked check: on 2026-09-28, daysBetween = 267, weekIndex = floor(267/7) = 38, label 39, days since Sunday = 1, days left = 6.
**Sections:** theme, big (H2); "שבוע 39 · נשארו 6 ימים"; **CTA "התחל לצייר"** / "המשך לצייר" (creates or resumes this week's `kind: "challenge"` project titled with the theme); (H2) "האתגרים שלך": stamps for weeks joined, newest first (a week counts once its project has 2+ non-empty frames).
**States:** not joined; joined; no stamps yet ("הצטרף לאתגר הראשון שלך").

### 8. Gallery
**Purpose:** everything you made, on this device. **H1 "העבודות שלי"**.
**Sections:** W1/W2 banner slot. Actions: "אנימציה חדשה" (primary), "ייבא קובץ" (`.json`), "גבה הכל" (one `fliploop-backup-{date}.json`). (H2) "התחל מ..." = unlocked starters (up to 4 subjects: ball, flower, stick figure, character; each unlocked by its first completed lesson; tap = new `kind: "free"` project built from the lesson's example stroke data in `lessons.js`, all frames unlocked, at that lesson's fps and play mode; identical for everyone and never copies a user's own attempt; hidden when none). (H2) "פרויקטים" grid by last edit: thumbnail, title, frame count, kind tag (שיעור / אתגר), menu: open, duplicate, rename, download project file, delete (confirm + 5 s undo). **Duplicate:** a free project duplicates as a free copy; duplicating a lesson or challenge project creates a `kind: "free"` copy with all frames unlocked, the same as "הפוך לפרויקט שלי", so the original stays the single lesson project for n (or the week's challenge project). No filter: sort by recent covers any realistic volume.
**Import:** validate `schemaVersion` and fields; an existing id imports as a copy with a new id; bad file: "הקובץ לא נראה כמו פרויקט FlipLoop", nothing changes; too big for remaining space: W2b.
**States:** empty ("עוד אין עבודות" plus the primary CTA), loading (skeleton cards), import error.

### 9. Settings
**H1 "שמירה והגדרות"**. (H2) Storage: used/quota in MB and %, protected yes/no, last backup date, "גבה הכל", "ייבא". (H2) Help: "הצג שוב טיפים", plus a short note that undo history is cleared on reload. (H2) About: "FlipLoop", no accounts and nothing leaves the device, and a credit for the 12 principles from *The Illusion of Life* (Thomas and Johnston, 1981), by title only. Motion follows the OS `prefers-reduced-motion` setting (no separate toggle).

---

## Global Elements
- **Nav:** no persistent bar (hub-and-spoke). Back controls are labeled with their destination ("לגלריה", "לשיעורים", "לבית"), never a bare arrow, for information scent. "פריים" is taught once (coach mark 2), then used everywhere. **Footer:** none. **Header:** static; Editor top bar compact (48px).
- **Touch targets:** 44x44 px for tools and thumbnails (above WCAG 2.2's 24 px); full keyboard access with visible focus.
- **Fonts:** Google Fonts optional with a system Hebrew fallback; no runtime network calls.

## Asset Checklist
- No photos. All visuals are code or stroke data: Home character (8 frames), 12 lesson examples, starters, icons (style: Web Designer's call).
- Copywriter: 12 × (name, 2 sentences, goal line), 52 themes, coach marks, W1 to W5 wording.
- **Photography:** not applicable; hand drawing is the product's medium.

## Validation & QA Pass
- **IA validation:** not run (no participants in this session). Recommended: a first-click test with 3 friends aged 12 to 16 on plain wireframes: "start an animation" (Home), "make your 2 drawings move" (Editor), "save a GIF for WhatsApp".
- **Cognitive walkthrough** (13-year-old Hebrew speaker on a phone, first animation to first Play): finds the primary button, yes; knows to draw, yes (coach 1); adds a frame, yes (coach 2); presses Play, yes (coach 3); understands the result, yes. 5/5. Risk found and fixed: drag-to-reorder clashed with swiping the strip, hence the 300 ms long-press.
- **Content stress test:** 120 frames (counter, W4, 15 sheets, undo budget), 40-character title (truncates in the top bar, 2 lines on cards), longest lesson name, hold ×12, 120 frames at 6 fps video = 20 s (40 s ping-pong) with progress + Cancel.
- **Checklist walkthrough:** Sitemap Track A 0/8 applicable (replaced by Track B per the file); Track B 6/6 (return triggers have named screens: Challenge, Lessons; no real-world-dependent output; topology named; permissions none, stated; deep links scoped; 2 shortcuts named). Per-page 13 items × 9 screens checked (forms only Import + title; filters not applicable, reason stated); Track B 2/2. Build-readiness 12 items, 3 not applicable (NAP; first-click test recommended, not claimed; ICP content replaced by stress test); Track B 4/4. The 3-second check ran after this.

## Open Questions
- None blocking. Scope notes: service worker/offline install out of scope; Safari and real-phone tests are impossible on this machine (context packet).

---

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
