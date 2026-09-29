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
