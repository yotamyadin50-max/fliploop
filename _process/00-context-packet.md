# Context Packet: 40, FlipLoop (frame-by-frame animation drawing site)

**Date:** 2026-09-28
**Track:** website, Track B (personal web app / creative tool, not a marketing site)
**Folder:** `O-output/40-fliploop/`
**Web:** ON (website track default).
**Build:** full, real working code (Developer runs). Local preview only. Never deployed, never pushed.
**Distribution:** browser-only static site, no server, no build step. Works from a plain static server (`python -m http.server`).

---

## 1. Who the user is

- 14, Israeli, talks in Hebrew. Builds this for himself, a personal project for a broad public audience (not for a client).
- Quality bar: the highest achievable, never a stripped MVP. Always organised files.
- No em dash (U+2014), no en dash (U+2013), no unbacked superlatives. Accessible language without losing substance.
- UI language: Hebrew (RTL). Site name is Latin: **FlipLoop**, used as the main heading AND the page `<title>`.
- Standing rule [developer]/[all]: verify real functional correctness in the real running browser before declaring done.

## 2. The request (the user's own spec, condensed but complete)

**Editor**
- Canvas at a fixed size: default 480x360, square option also available. Each frame is its own separate drawing layer.
- Onion skin: previous frame in faint red, next frame in faint blue, drawn UNDER the current drawing. Show up to 2 frames each direction, and can be turned off.
- Tools: pencil in 3 widths with line smoothing, eraser, flood fill, 12 swatches + color picker, undo/redo of 50 steps PER FRAME, duplicate frame, delete frame, drag to reorder, move (translate) the whole drawing inside a frame.
- Frame strip at the bottom with thumbnails, up to 120 frames.
- Playback: 6 / 12 / 24 fps, loop or ping-pong, and "hold" a frame for several frames.

**Lessons**
- 12 short lessons, one per the 12 principles of animation from *The Illusion of Life* by Frank Thomas and Ollie Johnston (1981): squash and stretch, anticipation, staging, straight ahead vs pose to pose, follow through and overlapping action, slow in and slow out, arcs, secondary action, timing, exaggeration, solid drawing, appeal.
- Each: a 2-sentence explanation, a small animated example, and an exercise with partially prepared frames (bouncing ball, flower opening, stick figure jumping).

**More**
- Weekly challenge: a theme from a fixed list, chosen by the week number, identical for everyone (deterministic, no server).
- Personal gallery with duplicate and edit.
- Export 3 ways:
  1. GIF via a small library that runs in the browser (no server).
  2. Video: WebM or MP4 via MediaRecorder, whichever the browser supports.
  3. PDF or PNG print sheet of all frames, numbered, at flipbook size, with cut lines and a staple margin.
- Edge cases: drawing with touch, mouse, and pen (with pressure when available); autosave to IndexedDB every few seconds; a clear message if device storage/memory approaches its limit.
- No server, no sign-up, no AI. Everything stored on device, with project file export and import.

**Light design direction (from the user)**
- Home: a light table seen from above, with a drawn flipbook flipping by itself showing a small waving character, and 3 buttons: New animation, Lessons, This week's challenge.
- Editor: big canvas in the middle, tools on the side, frame strip at the bottom that looks like film stock.
- **The selling moment:** the first press of Play. The onion skin disappears, the strip starts running like film in a projector, and your drawing moves for the first time.

## 3. Verification the user explicitly asked for

- Real test of all 3 export types in Chrome and Safari.
- Test of 120 frames on a phone.
- Working code with a live preview.

**Environment honesty (orchestrator note):** this machine is Windows 11. There is no Safari here and no physical phone attached. Available: the built-in Chromium browser pane with mobile viewport + touch emulation. Plan: real Chrome tests of all 3 exports, 120 frames under mobile emulation, and code paths written defensively for Safari (MP4 MediaRecorder, no `OffscreenCanvas` dependence, blob handling in IndexedDB). Safari and real-phone runs must be reported as NOT done, never claimed.

## 4. Banned / constraints

- No server, no accounts, no analytics, no AI, no external API calls at runtime (Google Fonts optional, must degrade gracefully offline).
- No em/en dashes in any user-facing copy.
- Copyright: lesson text is original writing about the principles, no quoting the book.
