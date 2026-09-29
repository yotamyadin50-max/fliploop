# FlipLoop: Final Site Plan

Approved at the Plan Gate on 2026-09-28 (round 1 revision, see `_process/04-gatekeeper-plan-review.md`).
Contents: Part A structure (Site Planner), Part B visual design (Web Designer), Part C binding rulings (Planning Manager closing note).

---

# Part A: Structure

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


---

# Part B: Visual Design

## Visual Design: FlipLoop

**Vertical:** Track B personal creative tool (browser frame-by-frame animation, Hebrew RTL) · **Tone target:** precise and warm (`voice-dna.md`: numbers and mechanisms, no hype), so the visuals use real film geometry and real print proportions, not decoration.

**Concept:** A 2D animator's backlit animation desk seen from above (frosted glass lit from below, a steel peg bar, a graphite pencil), with one strip of black 16mm projector film as the only dark object on it; pressing Play threads that film through a lamp-lit projector gate.

**Differentiation:** Builds 39 (sepia album), 38 (barograph paper, pen nib) and 33 (charcoal, work-order stub) all used static printed-object motifs. FlipLoop is two-temperature (one lit warm-white surface, one dark film object) and its signature moves: sprocketed film advancing with a projector's intermittent pull-down.

**Aspirational reference applied:** Procreate Dreams Flipbook mode (Researcher). Adapted detail: onion ghosts behave like translucent sheets, so distance-2 ghosts are softer (0.4px blur, half opacity) than distance-1.

**Primary style:** Charming/Handmade (hand-drawn icons, handwritten display face, code-drawn character) · **Secondary accent:** Immersive/Cinematic's single signature moment, used once: Play.

**Color system:** Split-complementary around Lamp amber (hue about 40°); the two complement slots are deliberately left to the fixed onion red (about 0°) and blue (about 220°), which live only inside the canvas. Coverage: **Restrained** (amber only where you act or where the lamp is on).

**Interaction level:** subtle micro-animations, one authored showpiece (Play), no scroll effects.

**Brand file:** FlipLoop is the user's personal product with its own identity, so `C-core/brand-visuals.md` (the business brand log) was NOT edited; the identity is recorded here.

---

### Visual Identity

| Role | Token | Hex | Usage |
|---|---|---|---|
| Neutral 60% (desk) | `--desk` | #DAD6CC | Background of every screen: the desk around the lit glass |
| Surface (glow) | `--glow` | #FFFCF4 | Cards, sheets, tool rail, light-table center |
| Paper | `--paper` | #FFFFFF | Canvas and print sheets only (exports flatten onto white) |
| Text | `--ink` | #1F1E1B | Text on light surfaces, active tool fill, primary button border |
| Muted | `--muted` | #5E5A52 | Secondary text, counters, captions |
| Primary 30% (film) | `--film` | #1C1916 | Film strip, playback bar, toasts, coach marks, Challenge slate |
| On film | `--on-film` | #F1EBDD | Text and icons on film |
| Accent 10% (lamp) | `--lamp` | #F4B63F | Primary CTA fill, Play, current frame, projector gate; always Ink labels |
| Success | `--success` | #285E3C | "נשמר", lesson and challenge stamps |
| Warning | `--warn-text` / `--warn-bg` | #7A4B00 / #FBEFD3 | W1 banner, W2 strip, W4 notice |
| Error | `--error` | #B3261E | W3 strip fill with white text, delete confirm; never inside the canvas |
| Info/Disabled | `--disabled` | #8A857B | Disabled controls, guide dashes, cut lines; info notices use Muted text, never blue |

**Fixed onion colors (canvas only):** previous `#E0403A`, next `#2F6BDB`, each a tinted silhouette (`source-in` fill of the frame bitmap) at opacity 0.30 (distance 1) and 0.15 plus `blur(0.4px)` (distance 2), under the full-opacity current frame. No UI color sits near these hues (accent and selection amber, info graphite, focus Ink). The one UI red, Error, is a solid top-bar fill, never on paper, so it cannot read as a ghost.

**12 drawing swatches (ink, not UI):** #1F1E1B, #7A766E, #FFFFFF, #E23B2E, #F28C28, #F5C518, #2E9E4F, #1F9E9A, #2F6BDB, #7A4BC9, #E8619A, #8A5A3B. A red drawing still ghosts red-tinted, because the onion recolors every pixel.

**Contrast check** (WCAG relative-luminance formula, computed in Node this session): Ink/Desk 11.49; Ink/Glow 16.26; Ink/Paper 16.67; Muted/Desk 4.73; Muted/Glow 6.69; Ink on Lamp 9.22; Ink on Lamp-hover #E3A21F 7.50; On-film/Film 14.72; edge print #C8B48A/Film 8.63; Lamp/Film 9.67; muted-on-film #A89F8E/Film 6.68; white/Error 6.54; Success/Desk 5.25; Success/Glow 7.43; Warn text/Warn bg 6.49; guide #8A857B/Paper 3.67 (non-text, passes 3:1). **Banned:** Lamp as text or border on Glow or Desk (1.76:1). Lamp appears only as a fill under Ink, or on Film; primary buttons carry a 2px Ink border so their edge passes 1.4.11.

**Typography:** **Playpen Sans Hebrew** (display: wordmark, screen H1s, lesson names, Challenge theme; 600/700; handwriting, because the product is your own drawing) + **Rubik** (UI and body: 400 body, 500 labels, 700 badge numerals). Both Google Fonts, Hebrew and Latin in one family, a pairing new to this portfolio; variable files, static weights only. **Offline:** runtime network calls are forbidden, so the Developer vendors subset woff2 (Hebrew plus Latin) in `site/fonts/` with `font-display: swap`. Fallback stacks: `"Rubik","Segoe UI","Arial Hebrew","Noto Sans Hebrew",Arial,sans-serif` and `"Playpen Sans Hebrew","Rubik","Segoe UI",sans-serif`. **Scale:** Major Third 1.25 from 16px (12.8/16/20/25/31.25/39/61): Caption 13, Body 16, H3 20, H2 25, screen H1 `clamp(1.563rem, 1.43rem + 0.563vw, 1.953rem)`, Home display H1 `clamp(2.438rem, 1.953rem + 2.066vw, 3.813rem)`. **Hebrew rules:** body line-height 1.7, headings 1.25, UI 1.3; letter-spacing 0 everywhere; body never under 400. Counters, fps and frame numbers use `tabular-nums` inside `dir="ltr"` isolates.

**Spacing scale:** 8-point (8/16/24/32/48/64/96/128) plus 4px for icon-label gaps and badges. Section padding 48px desktop / 24px mobile.

**Layout grid:** 4 columns at 375 (16px margins and gutter), 8 at 768 (24px), 12 from 1024 (32px gutter, max 1120px). The 16px mobile gutter deliberately replaces Round 16's 32px: the plan fixes the canvas at 343px, which is 375 minus two 16px margins. Editor desktop: `grid-template-areas: "top top top" "rail canvas panel" "strip strip strip" "play play play"`, columns `72px 1fr 240px`; under `dir="rtl"` the first column renders on the right, putting the rail at the start side. **Container query:** `.project-card` goes side by side at 320px or wider, stacked below.

**Page transitions:** same-document View Transitions on hash changes (progressive enhancement): 200ms root crossfade; one pair, `vt-canvas` (Gallery thumbnail to Editor canvas, 300ms), `standard-decelerate`. Off under reduced motion.

**Breakpoints:** 375 / 768 / 1024 / 1440, plus `@media (max-height: 640px)` for the Editor.

**Color-scheme stance:** `only light`, an explicit opt-out (`<meta name="color-scheme" content="only light">`, `theme-color` #DAD6CC). The canvas is white paper, exports flatten onto white, and onion opacities are tuned on white; algorithmic darkening would invert the paper and break the ghosts. The film strip is already the dark mass.

**Navigation shell:** hub-and-spoke as planned; no tab bar or drawer. One labeled Back control at top start, chevron pointing right. Phone: **modal** bottom sheets (More, colors, pencil width, frame menu, completion); desktop: anchored popovers. No swipe-only actions, no pull-to-refresh.

**Icon layer & splash:** not applicable (browser-only); the manifest icons are the flipbook glyph as 192x192 and 512x512 px PNG, `purpose: "maskable"`, Ink glyph on a full-bleed Desk square kept inside the central 80% safe zone. The Open Graph image is one 1200x630 PNG of the Home light table (flipbook on frame 4, arm up) centered on Desk, no text.

**Iconography/Imagery:** one custom inline SVG set on a 24px grid, 2px Ink stroke, round caps and joins, one deliberate 0.5px wobble per path so it reads hand-drawn yet consistent. No library, no downloads, no emoji. The onion icon (two offset sheets) is the only one showing red and blue, because it depicts the feature. **Flips in RTL:** back chevron, lesson arrows, undo, redo. **Never flips:** the LTR island (play, step, loop), lock, plus, wordmark. No photography.

**Texture:** frosted-glass grain on the Home light table only (`feTurbulence`, baseFrequency 0.9, 3%, never under text). Everything else: none. The canvas stays the calmest surface.

**Corners and shadows:** canvas 4px (a paper corner), buttons and tool keys 12px, cards 16px, sheets 20px, chips and Play 999px. Only sheets, popovers and print previews get `--shadow-lift`; cards use a 1px `#C9C4B8` border.

**Signature detail:** the film strip: sprocket holes punched through to the desk, edge-print frame numbers like real film edge codes, a lamp-lit gate during Play. Wow test: the strip becomes a projector. Removal test: without it, a generic drawing app.

**Target builder fit:** plain HTML/CSS/JS, vendored fonts, SVG and canvas art: achievable. **Canva assets / Unsplash:** none (the plan requires code or stroke data only).

---

### Component Look

- **Tool key:** 48x48 desktop, 49x56 phone, Glow, 12px radius, 24px icon. Hover `#F3EEE2` 150ms; pressed scale 0.94 100ms; **active** Ink fill with Glow icon plus `aria-pressed` (inversion, not color alone); focus 3px Ink outline offset 2; disabled `--disabled` icon.
- **Tool rail (desktop):** 72px, Glow, 16px radius, 1px `#C9C4B8` border, keys 4px apart, 16px gap before Undo/Redo.
- **Film strip:** Film band 72px tall: 8px sprocket band, 4, 48px frame window, 4, 8px sprocket band. Holes 6x8px, 1.5px radius, 12px pitch, filled `--desk`. Cell 72px wide (64px Paper thumbnail plus 4px frame lines). Edge print: frame number, Rubik 11/500 tabular, `#C8B48A`, lower band, decorative (the accessible name is on the thumbnail). **Current frame:** 2px Lamp outline plus a 6px Lamp glow at 35%. Hold: Lamp chip "×3" with Ink text. Key frame: 20px Ink lock chip. Lesson blank: dashed 1.5px `--disabled` inner border. "+" cell at the right end: dashed On-film outline. Counter "12/120" muted-on-film. `scroll-snap-type: x proximity`.
- **Playback bar (LTR island):** Film, 56px plus safe area. Left to right: step back, **Play** (56px Lamp circle, Ink icon, 2px Ink ring), step forward, fps segments 6/12/24 (44px, selected = Lamp fill, Ink text), loop/ping-pong toggle.
- **Buttons:** primary Lamp fill, 2px Ink border, Ink Rubik 17/500, 56px tall (48 in sheets), hover #E3A21F, pressed translateY(1px), disabled Desk fill with dashed border and `--disabled` text. Secondary Glow with 1.5px Ink border. Tertiary underlined Ink text, 44px hit area. Destructive Error fill, white text.
- **Sheets:** Glow, 20px top radius, 36x4 handle, scrim `rgba(28,25,22,.45)`, max 70dvh, safe-area padding. Enter 300ms `standard-decelerate`, exit 200ms `standard-accelerate`.
- **Toasts:** Film, On-film 15px, Lamp action text, 12px radius, 8px above the playback bar; the 5s undo toast has a 2px Lamp line shrinking linearly over 5000ms.
- **Banners:** W1 Warn bg, `#E2C98F` border, shield icon, secondary button, 44px dismiss. W2 32px Warn strip under the top bar. W3 Error fill, white text, persistent. W2b centered dialog. W4: counter becomes a Warn chip at 100; "+" disabled at 120. W5: standard Film toast, Warn-chip icon, no timer bar; stays until its 44px "הבנתי" close is tapped.
- **Coach marks:** Film bubble, On-film 15/500, max 240px, 44px close; two Lamp rings pulse on the target (1200ms, three times).

---

### Home Art Direction: Light Table and Self-Flipping Flipbook

One inline SVG (`aria-hidden`), viewBox 343x240 on phone, scaled on desktop.

1. **Light table:** 16px-radius panel, radial gradient #FFFDF7 (center) to #FBF6EA (55%) to #EFE8D8 (edge), 3% grain, 1px `#C9C4B8` rim.
2. **Peg bar** across the top: steel #9A958B, 1.5px #6F6A61 outline, three pegs (round, long slot, round).
3. **Flipbook:** proportioned like the printed card (100x60 mm, drawn 180x108), so Home shows what the print sheet makes. Left staple margin #F1EEE8 with two Ink staple dots; 5 page edges beneath at 1.5px offsets, alternating #FFFFFF and #F6F3EC; rotated -4°.
4. **Character:** Ink 3px round-cap strokes, no fills except two Lamp cheek dots at 60%: 40px round head, 52px pear body, dot eyes, smile arc, three-hair tuft. **8 frames at 12 fps:** arm at 20°, 45°, 70°, 95°, 95°, 70°, 45°, 20°; tuft lags the head one frame (follow-through); blink on frame 6; body squashes 2% on frames 4 and 5. Each frame a `<g>`, one visible at a time.
5. **Flip:** each frame change, a shadow band (Ink, 0 to 12% gradient) sweeps from the free right edge to the staple margin in 60ms linear.
6. **Pencil** (hexagonal, Lamp body, graphite tip) at bottom right, 20°.

**Reduced motion:** frame 4 still (arm up, the clearest wave); a tap flips one page without the sweep.

---

### The Play Choreography (every Play with 2+ frames)

A **connected sequence**, not a staggered peer group: each step is visibly caused by the press. t = 0 at click.

| t (ms) | What moves | Duration, curve |
|---|---|---|
| 0 | Play scales to 0.94 and back; icon ▶ becomes ■; label "עצור" | 100, `standard-decelerate` |
| 0 | Onion layer fades out | 180, `standard-accelerate` |
| 0 | Tools, top-bar actions dim to 40%, pointer events off | 160, `standard-accelerate` |
| 60 | Canvas backlight warms: glow `0 0 0 8px rgba(244,182,63,.18)` | 240, `standard-decelerate` |
| 120 | Strip glides so the current frame is centered (skipped if already) | 240, `emphasized-decelerate` |
| 120 | Projector gate: 76x56 Lamp bracket over the center cell scales 1.15 to 1 and fades in; cells outside dim to 55% | 240, `emphasized-decelerate` |
| 360 | Playback starts; canvas frames swap instantly, never crossfaded | at fps |
| each frame | **6 and 12 fps, intermittent pull-down:** film jumps one cell (72px) in 0.4 of a frame period (67ms at 6, 33ms at 12) and rests in the gate. **24 fps:** continuous linear scroll, 1728px/s. A hold rests the film hold × period. Ping-pong reverses the film | `standard-decelerate` |
| each frame | Gate label "3/12" updates (tabular) | instant |

**First Play ever (once; flag `firstPlaySeen` in the existing onboarding flags):** at 360 and 480ms the canvas glow dips 8% for 40ms (a lamp catching: two small dips, far under the three-flashes limit), and the visible edge-print numbers light Lamp left to right, 20ms apart, fading back over 400ms.

**Stop** (Stop, Space, canvas tap), 280ms total, faster than entrance: film halts with the showing frame in the gate and it becomes current; gate fades 160ms `standard-accelerate`; from 80ms the onion returns over 200ms `standard-decelerate`; tools undim and the glow cools over 200ms.

**Reduced motion:** no scaling, glide, pull-down or flicker. Play changes icon and label only; onion, tools and gate change by opacity over 120ms. During playback the strip stays still and the Lamp outline steps cell to cell, jumping a screen width instantly only when the current frame would leave view. The drawing still animates: that is what Play was pressed for.

**Other juice:** new cell grows 0 to 72px in 200ms `standard-decelerate`; deleted cell collapses in 160ms; save tick 150ms; stamps drop (scale 1.3 to 1, rotate to -8°) in 320ms `emphasized-decelerate`. Strokes get no effect. No sound.

---

### Page-by-Page Visual Spec (8 screens + 1 overlay, as planned)

#### 1. Home
**Context:** sparse, hero-led entry. **Hero:** phone: 56px header (labeled icon links left; the Playpen 25px wordmark is hidden on Home only, `display:none`, because the display H1 right below already reads FlipLoop; every other screen keeps it), display H1, Muted subtitle, 343x240 light table, actions in the lower half. Desktop: `grid-template-areas: "text table"` (text 5 columns right, table 7 left, max 560px). Mirrored sparse Z: flipbook, back to the H1, landing on the primary CTA. Inline SVG, no image LCP. **Value/trust:** the flipbook shows the promise before any text; the "no sign-up" subtitle sits right above the CTA. **Sections:** primary full-width 343x56; Lessons and Challenge as two 2-up Glow secondary cards, 72px, two lines ("3/12" with a stamp glyph; theme name in Muted); "המשך: {title}" tertiary; W1 slot. **Redline:** H1 to subtitle 8, subtitle to table 24, table to primary 32, primary to secondaries 16, secondaries to link 16, link to W1 24. **Primary CTA:** Lamp, Ink border, pencil icon, the only amber block on screen. **Components:** buttons, cards, W1. **Footer:** none; ends on the link or banner. **Mobile:** the plan's order 1 to 6 exactly.

#### 2. Editor (free, challenge, lesson mode)
**Phone (375), the plan's order:** top bar 48px (Back "לגלריה"/"לשיעור", title field Rubik 16/500 with ellipsis, save status icon plus text, compact secondary "ייצוא"); goal strip 40px (lesson only); canvas 343x257 (343x343 square) on Paper, 1px `#C9C4B8` border, 8px Glow halo at 70%; tool row 56px, 7 keys at 49px; film strip 72px; playback bar 56px plus safe area. About 505px total, so it fits a 667px phone unscrolled. **Canvas scaling:** backing store stays 480x360; CSS size = min(100vw - 32px, remaining height × aspect); under `max-height: 640px` it shrinks by height (minimum 240px wide) so strip and Play stay visible. **Desktop:** rail right; canvas centered at the largest of 2x, 1.5x, 1.25x, 1x that fits; 240px Glow left panel with 12 swatches (6x2, 32px chips, 44px hit areas), picker and onion settings in place; strip and playback full width below. **Lesson mode:** Glow goal strip with an Ink "שיעור 1" chip, goal 14/500, "3/6 צוירו" tabular Muted, "הצג רמזים" switch. Guides: 1.5px `--disabled` dashes (6 on, 4 off). Key frames show a lock chip at the canvas top-start; the next blank cell pulses Lamp twice with the key-frame message. Completion sheet: Success stamp, "לשיעור הבא" primary, "המשך לצייר" secondary, "הפוך לפרויקט שלי" tertiary. **Not found:** centered Glow card with the two planned buttons. **Loading:** Film skeleton cells. **Redline:** top bar, goal strip, canvas and tool row 8 apart; tool row to strip 0 (the film reads as the table edge). **Primary CTA:** Play, bar center, thumb reach. **Components:** tool keys, strip, playback bar, sheets, toasts, W2/W3/W4, coach marks.

#### 3. Export overlay
Phone: full-height modal sheet; desktop: 560px centered dialog, `--shadow-lift`. H2 "ייצוא" in Playpen. Four Glow cards in the planned order (GIF, Video, Print sheet, Project file): 32px icon, H3 20px, one Muted line, own button; GIF's is primary (the WhatsApp default), others secondary. **Progress:** 12px Film bar with sprocket ticks and Lamp fill, "פריים 37/120" tabular, Cancel tertiary. Video's recording canvas sits in an 8px Film frame like a projector screen. Done: "הורד" primary, "שתף" secondary. **Redline:** H2 to first card 24, card to card 16, icon to H3 12, H3 to line 4, line to button 16.

#### 4. Print preview
H1 "גיליון הדפסה". Options card (paper, ping-pong); A4 previews at fit width on Desk, `--shadow-lift`, 24px apart. Card styling on the plan's layout: 0.5pt dashed `--disabled` cut lines, #F1EEE8 staple margin with two Ink dots, 8pt Rubik numbers upright, 8pt Muted footer. "הדפס / שמור כ-PDF" primary, "הורד PNG" and per-sheet buttons secondary. `@media print`: hide UI, `@page { size: A4; margin: 10mm }` (Letter when chosen), pure black lines. **Redline:** H1 to options 24, options to first sheet 32, sheet to its button 8.

#### 5. Lessons
H1 plus Muted subtitle. Phone: one column of 12 stations, station 1 at top right, alternating 48px right/left offsets, joined by a 2px dashed `--disabled` path; desktop: 3 rows of 4, right to left. Station: 64px Glow circle, 1.5px Ink border, Playpen 25px number, Rubik 15/500 name (2 lines max). Done: Success stamp at -8°. "הבא בתור": Lamp pill. All 12: Glow banner with stamp. **Redline:** H1 to subtitle 8, subtitle to path 32, station to name 8, station to station 24.

#### 6. Lesson detail
H1 in Playpen. "מה זה" H2 plus Body. "דוגמה": a small light table (Glow, 16px radius, full-width 4:3 Paper canvas) over a 48px mini strip without edge print; reduced motion shows step buttons. "התרגיל": goal line plus "8 פריימים, 2 מוכנים" with lock and dashed cell glyphs; full-width primary CTA; previous/next tertiary links with flipping arrows. **Redline:** H1 to first H2 24, H2 to body 8, section to section 32, exercise line to CTA 24.

#### 7. Challenge
H1, then the theme on a **film slate**: Film card, 16px radius, striped Lamp/Film clapper band, theme in Playpen 39px On-film, "שבוע 39 · נשארו 6 ימים" in muted-on-film tabular. Primary CTA below. "האתגרים שלך": 64px stamp circles, 4 per row on phone, newest first; empty state is one dashed circle plus the planned line. **Redline:** H1 to slate 24, band to theme 16, theme to fields 8, slate to CTA 24, CTA to H2 48.

#### 8. Gallery
H1, banner slot, actions (primary "אנימציה חדשה", secondaries "ייבא קובץ", "גבה הכל"; two rows on phone). "התחל מ...": up to 4 starter cards, 120px, Glow, line drawings. "פרויקטים": 2/3/4 columns; Glow card, 16px radius, 8px sprocketed film band on top, Paper thumbnail, 2-line title, tabular frame count, Ink-outline kind chip, 44px menu. Empty: a still of the Home character plus the planned line and CTA. **Redline:** H1 to actions 24, actions to H2 32, H2 to row 16, thumbnail to title 8, title to meta 4.

#### 9. Settings
H1, three Glow cards (Storage, Help, About), 16px padding. Storage meter: 12px `#C9C4B8` track, Ink fill (Warn text fill at 80%+), "124 MB / 2.1 GB · 6%" tabular, protected yes/no as icon plus word. Secondary buttons. **Redline:** H1 to card 24, card to card 16, H2 to content 12.

**All screens:** Home is a sparse Z; Lessons, Gallery and Settings are held to the F diagnostic. Every tappable element (tool keys, 72x72 cells, swatches, menus, dismiss X, toast actions, text links) is 44x44 or larger; every hover has a pressed equivalent; playback bar, sheets and toasts pad `env(safe-area-inset-bottom)`.

---

### Paste-Ready Tokens

```css
:root{
  color-scheme: only light;
  --desk:#DAD6CC; --desk-rim:#C9C4B8; --glow:#FFFCF4; --glow-hover:#F3EEE2; --paper:#FFFFFF;
  --ink:#1F1E1B; --muted:#5E5A52; --disabled:#8A857B;
  --film:#1C1916; --on-film:#F1EBDD; --on-film-muted:#A89F8E; --edge-print:#C8B48A;
  --lamp:#F4B63F; --lamp-hover:#E3A21F;
  --success:#285E3C; --warn-text:#7A4B00; --warn-bg:#FBEFD3; --warn-rim:#E2C98F; --error:#B3261E;
  --onion-prev:#E0403A; --onion-next:#2F6BDB; --onion-a1:.30; --onion-a2:.15;
  --font-display:"Playpen Sans Hebrew","Rubik","Segoe UI",sans-serif;
  --font-ui:"Rubik","Segoe UI","Arial Hebrew","Noto Sans Hebrew",Arial,sans-serif;
  --fs-caption:.8125rem; --fs-body:1rem; --fs-h3:1.25rem; --fs-h2:1.5625rem;
  --fs-h1:clamp(1.563rem,1.43rem + .563vw,1.953rem);
  --fs-display:clamp(2.438rem,1.953rem + 2.066vw,3.813rem);
  --lh-body:1.7; --lh-head:1.25; --lh-ui:1.3;
  --s-4:4px; --s-8:8px; --s-16:16px; --s-24:24px; --s-32:32px; --s-48:48px; --s-64:64px;
  --r-canvas:4px; --r-control:12px; --r-card:16px; --r-sheet:20px; --r-pill:999px;
  --shadow-lift:0 1px 2px rgba(28,25,22,.12),0 4px 12px rgba(28,25,22,.10);
  --ease-enter:cubic-bezier(0,0,0,1); --ease-exit:cubic-bezier(.3,0,1,1);
  --ease-emph:cubic-bezier(.05,.7,.1,1);
  --t-press:100ms; --t-state:200ms; --t-sheet:300ms; --t-focal:240ms;
  --strip-h:72px; --cell-w:72px; --thumb-w:64px; --thumb-h:48px;
  --hole-w:6px; --hole-h:8px; --hole-pitch:12px; --tool:48px; --topbar:48px; --playbar:56px;
}
body{background:var(--desk);color:var(--ink);font:400 var(--fs-body)/var(--lh-body) var(--font-ui);letter-spacing:0}
:focus-visible{outline:3px solid var(--ink);outline-offset:2px}
.film :focus-visible{outline-color:var(--lamp)}
.num{font-variant-numeric:tabular-nums;direction:ltr;unicode-bidi:isolate}
@media (prefers-reduced-motion:reduce){
  *,*::before,*::after{animation-duration:1ms!important;transition-property:opacity,color,background-color!important;transition-duration:120ms!important}
  ::view-transition-group(*){animation:none!important}
}
```

---

**Checklist walkthrough (Round 20):** Visual identity 14/14 applicable (store icon/splash: not applicable, browser-only). Per-page 19/20 applicable (forms: only the title field and native Import picker exist; no validation styling beyond the planned error line). Build-readiness 6/6 (brand-file item met per the user's instruction: identity recorded here, `C-core/brand-visuals.md` untouched). **Self-review against the plan:** 9 sections = 8 screens plus 1 overlay, in order; Home's 6 sections, the Editor's 7 rows and 7 tools, 4 export cards, 12 lessons, 4 starters, W1 to W4 plus W2b and the timeline (frame 1 left, "+" right, film sliding leftward past a fixed gate) all match; no structure, content or CTA changed. 3-second check afterwards: 5/5.

### Open Questions and Notes for Site Planner
- **Flag (not changed here):** the one-time first-Play flourish needs a `firstPlaySeen` key in the existing `meta.settings` onboarding flags, reset with the other tips.
- Developer spot-checks Playpen Sans Hebrew after vendoring by rendering the longest lesson name; if any glyph falls back, display switches to Rubik 700 and nothing else changes.


---

# Part C: Binding Rulings

## Planning Coordination Note: FlipLoop

**Date:** 2026-09-28 · **Spawn:** Closing Check (Role 5.5), fresh · **Read:** 00-context-packet, 00b-kickoff, 01-researcher-brief, 02-site-planner-plan, 03-web-designer-visual-spec.

**Verdict:** CLEAN WITH RULINGS. No handback. Seven small items are settled below as binding for Developer, Copywriter and Gatekeeper. Where this note conflicts with 02 or 03, this note wins.

### Sequencing check
- **Kickoff to Researcher:** the brief opens with the 3 ranked load-bearing findings the kickoff asked for (GIF encoder, storage, MediaRecorder), plus competitor first-Play and print dimensions. Traced.
- **Researcher to Site Planner:** it shows real divergence first (a bottom tab bar weighed and rejected with a 250px canvas calculation). Research lands as decisions: holds become one GIF frame with a delay; frames are flattened on white; probe order and real-time video with Cancel; empty-Blob fallback to GIF; W1 "not protected" as the normal Safari case, returning after 7 days (the eviction rule); `persist()` after the first save; the project file as a first-class action; undo as rectangle patches under a byte budget (the 4.1 GB arithmetic); no setup dialog (Low/Feel); onion settings in place (Procreate); lesson mode in the same Editor (the Pixnote gap); card geometry from the flipbook sources.
- **Site Planner to Web Designer:** the Home flipbook is drawn at the printed card's 100x60 proportion, the Play choreography styles the planned Playing and Stop states, and the phone stack reproduces the planned 7 rows. Concept and Differentiation come first, with the palette derived against builds 33, 38 and 39.

### Coverage parity
I counted from the raw lists, not the summary lines (Round 12).
- **Screens:** 9 rows in the plan's screen table (8 screens + 1 overlay). 9 matching subsections in the spec, in the same order. No orphans in either direction.
- **Lessons:** 12 table rows, numbered 1 to 12. I re-added K + B frames per row against the stated frame count: 8, 10, 6, 12, 8, 9, 9, 8, 8, 8, 8, 6. All 12 sum correctly. Lesson 1's blanks are B2 to B4 and B6 to B8 = 6, which matches the "3/6 צוירו" sample in both files.
- **Editor:** 7 phone rows and 7 tool-row keys in the plan. The spec has 7 keys at 49px (7 x 49 = 343, which equals the canvas width). Stack height: 48+8+257+8+56+72+56 = 505, as the spec says. There are 7 Editor states. Playing, Stop, Loading, Not found and W2/W3/W4 are all styled. Moving and Exporting inherit the tool and overlay styling, which is acceptable.
- **Packet features, one by one:** canvas 480x360 plus square; onion red/blue, under the drawing, 0 to 2 each way, can be turned off; pencil in 3 widths with smoothing; eraser; fill; 12 swatches + picker; 50-step undo; duplicate, delete, reorder, move; 120-frame strip; 6/12/24 fps; loop and ping-pong; hold; 12 lessons with explanation, example and prepared exercise (ball, flower and stick figure all present); weekly challenge; gallery duplicate/edit; 3 exports; touch, mouse and pen pressure; autosave; storage warning; project import/export; the Home light table with its 3 buttons; the film-stock strip; the Play moment. Result: 25/25 land in both files. The one addition is a real PDF file (Ruling 2).
- **Accepted deviation:** keeping undo at 50 steps for non-current frames depends on the 64 MB budget. The Researcher's memory arithmetic justifies this. Developer states it in the report and does not hide it.

### Contradictions found
I checked the shared decisions directly against each other (Round 8):
- **Strip direction:** both files put frame 1 on the left and "+" on the right, with the film sliding leftward past a fixed center gate and the playback bar as an LTR island. Agree.
- **Onion colors:** red previous (#E0403A) and blue next (#2F6BDB) in both files. The Researcher's note that FlipaClip uses green was correctly not adopted.
- **First Play, one-time vs every time:** there is no conflict. The choreography runs on every Play with 2+ frames (both files). The lamp-flicker flourish runs once, on the first Play ever (spec only). The missing flag is settled in Ruling 4.
- **Nav, CTA, mobile order, lesson mode:** these agree. Home has one primary, New animation, with Lessons and Challenge after it. Play is the Editor's primary. Lesson mode runs inside the same Editor.
- **PDF method:** contradicted by the orchestrator ruling. Both files say print dialog only. Settled in Ruling 2.
- **Fonts:** the spec's vendored woff2 conflicts with the orchestrator ruling. The plan's "Google Fonts, no runtime calls" is internally inconsistent. Settled in Ruling 1.
- **Print margin (numeric, found by re-deriving):** the spec's `@page { margin: 10mm }` leaves 190mm of printable width on A4 (195.9mm on Letter). The plan's grid of 2 cards at 100mm needs 200mm. Settled in Ruling 3.

### Rulings (binding)
1. **Fonts.** Load Playpen Sans Hebrew and Rubik from the Google Fonts stylesheet `<link>` with `display=swap`. No font files go into the project. When offline, the spec's fallback stacks render. "Vendor" in spec lines 44, 68 and 202 now reads "link". Developer's glyph spot-check of the longest lesson name still runs, online.
2. **Print export, 3 paths.** (a) **Download PDF:** a real `.pdf` file built in-browser by an in-house minimal PDF writer. It has one page per sheet at the A4 or Letter point size and embeds that sheet's rendered 300 dpi image. It does not depend on Safari's print scaling. (b) **Download PNG:** per sheet, as already planned. (c) **Print:** `window.print()` with `@page`. Button hierarchy: Download PDF is primary, Print and PNG are secondary, and the per-sheet PNG buttons stay. Copywriter writes the labels. The GIF encoder is in-house (`js/gif/encoder.js`, as the plan already says). The Researcher's gifenc recommendation is superseded, and its behavioral findings (delay per hold, flatten on white, yield per frame) still apply.
3. **Print geometry.** Keep 100x60mm cards, 2 x 4. Set `@page` margins to 10mm top and bottom and 5mm left and right on A4, and 7.9mm left and right on Letter. Adjacent cards share one dashed cut line, so the grid is exactly 200 x 240mm. The PDF writer and the PNG render use the same geometry.
4. **`firstPlaySeen`** joins the `meta.settings` onboarding flags and resets with "הצג שוב טיפים".
5. **Lesson done rule for pre-drawn frames.** In lessons 3, 5, 8 and 11, frames the user must complete already hold P content, so "50+ non-transparent pixels" would pass untouched. For every frame the user must complete, "done" means 50+ pixels that differ from that frame's own rasterized prepared content, which is re-derivable from `lessons.js`. P frames the user must complete carry `lessonRole: "blank"`, with the prepared strokes baked in.
6. **Strip centering.** The strip carries half-viewport leading and trailing padding, so frame 1 and frame N can sit in the center gate.
7. **Drag-reorder look,** which the plan lists and the spec left unstyled: the lifted cell gets `--shadow-lift` and scale 1.05, a 2px Lamp insertion bar marks the drop point, and under reduced motion the cells do not move.

### Specialist strength check
The two load-bearing findings shaped real decisions: storage and eviction (W1 through W3, the undo budget, the placement of the backup action) and MediaRecorder behavior (the export states). None was cherry-picked, reshaped or vaguely referenced. The GIF library choice was overruled on purpose by the orchestrator, not dropped.

### Live-weakness check
- **Site Planner, Track B ownership:** avoided. All 6 decisions come first.
- **Web Designer, shallow pass / palette reuse:** avoided. The Play, the 375px layout and the light/dark stance get a deep pass, and the palette is fresh.
- **Researcher, buried findings:** avoided.
- **RTL timeline split:** avoided.
- **Lessons as content pages:** mostly avoided. The format is defined, and the P-frame edge case is closed by Ruling 5.
- **Research not reaching exports:** avoided.

### Checklist walkthrough
- Sequencing: 3/3 hand-offs traced, with divergence evidence.
- Coverage: 9/9 screens, 12/12 lessons, 25/25 packet features, all re-derived from the raw lists.
- Contradictions: 7/7 shared points checked. Track B screen mapping is applicable and agrees.
- Strength: 3/3 load-bearing findings traced.
- Live weakness: 6/6.
- The 3-second check ran after this walkthrough: 3/3.

### Handed back for revision
None. Proceed to Gatekeeper's Plan Gate with this note attached.

### Decider calls made
Ruling 3: I kept the card size and cut the side margins. The alternative I did not choose was shrinking the cards to fit a 10mm margin. Reason: 100x60mm traces to the Researcher's sources.

### For the loop
Re-derive physical print math (page width minus margins against the grid) whenever one role sets the card sizes and another sets `@page`.
