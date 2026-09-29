# WebKit (Safari engine) Check: FlipLoop

**Date:** 2026-09-28 · **Run by:** Adam (orchestrator), after Developer's `07-developer-notes.md`.
**Engine:** Playwright WebKit 18.2 (build v2104) on Windows 11, headless. UA reports Safari 18.2.
**Honest scope:** this is Safari's rendering and JS engine, NOT real Safari on a Mac or iPhone. The Windows WebKit build ships without `MediaRecorder`, so real Safari's video path (MP4) cannot be exercised here.
(Newest Playwright WebKit build v2359 failed to launch on this PC, exit 0xC0E90002; v2104 works.)

## Results

| Check | Desktop 1280x800 | iPhone 13 profile (touch, 120 frames) |
|---|---|---|
| Title + H1 "FlipLoop" | pass | pass |
| All screens load (Home, Editor, Lessons, Challenge, Gallery, Settings) | pass, 0 errors | pass, 0 errors |
| GIF full (ping-pong) | GIF89a, NETSCAPE loop, 22/22 frames, delays exact | 238/238 frames, 1008 cs total exact, 426 KB, 4.0 s |
| GIF half (loop) | 240x180, 12/12 frames | 120/120 frames, 111 KB |
| PDF A4 FlateDecode | valid, 0 bad xref offsets, 2 pages, 595.28x841.89 | valid, 16 pages, 3.1 MB, 5.7 s |
| PDF Letter | 612x792 pass | pass |
| PDF JPEG fallback | DCTDecode pass | pass |
| PNG A4 | 2480x3508, card 100 mm | same |
| Video | no MediaRecorder in this build: export card shows "הדפדפן הזה לא יודע להקליט וידאו. נסו GIF." and disables the button | same, graceful |
| Draw + export route + reload | n/a | stroke drawn, `#/editor/{id}/export` survives reload, 0 errors |

Note: `OffscreenCanvas` undefined here and nothing broke, so the no-OffscreenCanvas path is proven.
Cosmetic: on Windows WebKit the custom-colour input renders as a text box ("f1e1b"). Real Safari has a native colour picker, so this is expected to be engine-build specific, flagged for a real-device look.

## Still NOT DONE (needs the user's hardware)
- Real Safari on Mac/iPhone, incl. MP4 video recording.
- Real phone with 120 frames (touch feel, memory, play smoothness).
- Real pen with pressure.
