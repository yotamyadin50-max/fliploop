## Research Brief: FlipLoop (Hebrew frame-by-frame animation web app, no server)

**Date checked:** 2026-09-28 · **Web:** ON · **Audience note:** `C-core/icp-profile.md` describes small Israeli business owners who need a website. That is this system's customer, not FlipLoop's user. This brief uses the context packet's audience instead: Hebrew-speaking kids and teens (the builder is 14) plus a broad public, drawing for fun on phone or laptop.

---

### Load-bearing for Site Planner / Web Designer (ranked, max 3)

**1. GIF: use gifenc, vendored locally. Do not use gif.js.** (Fact)
- gif.js needs a separate `gif.worker.js` loaded from the same origin. It breaks when loaded from a CDN, and its last release was years ago. [gif.js repo](https://github.com/jnordberg/gif.js/), [worker failure PR](https://github.com/REllwood/why-converter/pull/13)
- gifenc (MIT, about 9 KB) has no worker and makes no network request, so it works offline from a static folder. The pipeline is `quantize`, then `applyPalette`, then `writeFrame`, with a **delay per frame in ms**. It has no dithering, which suits flat line drawings. [gifenc repo](https://github.com/mattdesl/gifenc), [npm](https://www.npmjs.com/package/gifenc)
- **What this changes:** "hold N frames" becomes one GIF frame with `delay = N x 1000/fps`, not N duplicate frames, so the file is smaller. Ping-pong writes the frame sequence forward, then back. Before quantizing, flatten every frame onto opaque white and leave onion skin out. Vendor the ESM build into `site/js/vendor/`. ES modules need `http://`, not `file://`, and the packet already targets `python -m http.server`. Encode on the main thread and yield between frames so the progress bar can update. A worker is optional.

**2. Storage: RAM and Safari eviction are the real limits, not quota.** (Fact, except where marked)
- `estimate()` on Chrome and Safari 17+ reports a quota of about 60% of total disk ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria), [WebKit, 2023-08-10](https://webkit.org/blog/14403/updates-to-storage-policy/)). On a normal phone a "near quota" warning will almost never fire. WebKit also says the quota can change with usage and visit frequency.
- `persist()` shows **no prompt** in Chrome or Safari. The browser decides silently. Chrome grants it after a bookmark, high engagement, a home screen install, or notification permission ([web.dev](https://web.dev/articles/persistent-storage)). WebKit grants it based on heuristics such as whether the site is opened as a Home Screen web app. Expect `false` in a normal Safari tab.
- **Safari's 7-day rule:** if a site gets no user interaction during 7 days of browser use, Safari deletes everything the site's scripts stored, IndexedDB included ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)). A kid who stops using FlipLoop for two weeks on an iPhone can come back to an empty gallery.
- **Memory arithmetic (Fact, calculated):** one 480x360 RGBA frame is 691,200 bytes. 120 frames come to about 83 MB. Undo stored as raw snapshots, 50 per frame across 120 frames, would need about 4.1 GB, which crashes a phone tab.
- **What this changes:**
  - Keep undo as compressed PNG blobs or stroke records, capped by total bytes, and drop the history of frames that are not active.
  - Store frames in IndexedDB as PNG Blobs.
  - The storage warning needs three states: near quota (rare); **not persisted** (the normal case on Safari: prompt "save a backup file"); and a memory or write failure (catch `QuotaExceededError`).
  - "Export project file" becomes a first-class, visible action, not something buried in settings.
  - Request `persist()` after the first real save, as the kickoff says, and show the result honestly.

**3. MediaRecorder: prefer MP4, fall back to WebM, and record in real time from a visible canvas.** (Fact, except where marked)
- Chrome 126+ records `video/mp4;codecs=avc1` natively ([Chrome Status](https://chromestatus.com/feature/5163469011943424)). Safari records MP4 with H.264, and records WebM with VP8/VP9 only from 18.4 (March 2025) ([MDN isTypeSupported](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/isTypeSupported_static), [WebKit](https://webkit.org/blog/11353/mediarecorder-api/)). **Probe order:** `video/mp4;codecs=avc1`, then `video/mp4`, then `video/webm;codecs=vp9`, then `video/webm`. Choose the file extension from the type that worked.
- Signal: on Safari 15, `canvas.captureStream()` recordings came out blank. That bug was closed as a duplicate of a later fix, but reports continued into 2024 ([WebKit 229611](https://bugs.webkit.org/show_bug.cgi?id=229611)). A Chrome 126 issue also reports MP4 files that some players cannot open ([crbug 348923066](https://issues.chromium.org/issues/348923066)).
- **What this changes:**
  - Video export takes as long as the animation plays. 120 frames at 6 fps is 20 s, and ping-pong doubles it. The export state needs a real-time progress bar and a cancel button.
  - Record from a visible, on-page canvas, drawing each frame on a timer.
  - If Safari produces an empty Blob, the fallback message should point to GIF.
  - The Safari export test is NOT done on this machine and must be reported that way.

**Competitor first-Play and onion skin** (the kickoff's third item, folded in here): FlipaClip colors onion skin red for previous and **green** for next, with separate opacity sliders ([FlipaClip KB](https://support.flipaclip.com/article/17-onion-skinning)). Brush Ninja previews on the spacebar ([Brush Ninja](https://brush.ninja/create/animation-maker/)). Pixnote's Flipbook Note shows only the previous frame ([Pixnote](https://pixnote.net/en/learn/flipbook/)). Signal: none of these documents a staged first Play. In the sources checked, Play is a utility button in every one. That gap is FlipLoop's Create cell.

---

### Best Angles (3 + 1 surprise)
1. **"Press Play. Your drawing moves for the first time."** It leads with the moment, not the feature list, and the user named this moment himself. News values: Human interest, Impact, Unexpectedness.
2. **From screen to paper you can staple.** FlipLoop prints numbered cards with a staple margin, so an animation becomes an object you can hold. Pixnote also prints to A4, so this is not unique. The edge is proper flipbook sizing plus a staple margin. News values: Impact, Human interest, Proximity.
3. **Nothing leaves your device.** No sign-up, no ads, no AI. Brush Ninja's free tier shows ads and FlipaClip sells a subscription. News values: Conflict, Impact.

**Surprise:** the lesson comes half drawn. Pixnote's bouncing-ball lesson sends readers to an empty editor with a suggested "8-12 frames per bounce" ([Pixnote lesson](https://pixnote.net/en/learn/animate-bouncing-ball/)). In FlipLoop the exercise opens with the key frames already there, and you draw the missing in-betweens. This corrects what people assume a lesson is: reading plus a blank page. News values: Unexpectedness, Impact, Human interest.

### Key facts
- FlipaClip on the US App Store: 4.6 from 267K ratings. Plus subscription tiers are $5.99, $29.99 and $39.99. Export options are MP4, GIF and PNG ([App Store](https://apps.apple.com/us/app/1101848914)). Fact. The rating distribution was not visible, so the review quality behind that average is unknown.
- Flipnote Studio 3D was removed from the eShop on 2023-03-27. Fan services (Sudomemo, Kaeru Gallery) still keep the community going ([Wikipedia](https://en.wikipedia.org/wiki/Flipnote_Studio_3D), [Sudomemo archive](https://archive.sudomemo.net/history/)). Fact. The Flipnote-style niche has no official home now.
- Signal: Hebrew-language search surfaced no Hebrew-native animation tool, only FlipaClip listings.

### Competitors & Conventions
**How they were found:** English and Hebrew web searches plus the store listing. Round 10's local-map search does not apply to a software tool, so it was skipped for that reason.
- **FlipaClip** (mobile app): Raise: polished onion controls, 10 layers. Reduce: paywall and churn from layout changes. Signal from a single 2-3 star review: "forced to relearn" after a redesign. It is also called poor value for money.
- **Brush Ninja** (browser): Eliminate: sign-up. Its weaknesses are ads and a utilitarian UI.
- **Pixnote Flipbook Note** (browser): offers GIF, MP4 and printable A4 PDF, plus principle-based lesson articles. It is the closest match. Its weak spot is that lessons are articles cut off from the editor.
- **Conventions users expect:** onion skin on by default, a thumbnail strip, a spacebar play toggle, fps presets, GIF as the default share format.
- **Underserved job:** "Teach me while I animate, in my language, without an account."
- **Site Planner:** lesson mode inside the same Editor, with prepared frames loaded and marked, and a clear route from a lesson back into a free project.
- **Copywriter:** the half-drawn lesson and "moves for the first time" lines.

### Visual & Appearance Direction
A warm, backlit light table: paper white glowing over a soft neutral. The strip is dark film stock with sprocket holes, and the canvas stays the calmest, largest surface on screen. Keep UI accents away from the onion red (previous) and blue (next). A neutral warm accent such as lamp amber or graphite will not compete. Hand-drawn line icons fit the paper feel, but no reuse of palettes from earlier builds. **Web Designer:** derive the palette fresh. Treat the film strip as the signature element and the Play transition as the motion showpiece, with a reduced-motion version.

### Competitor Apps, Pricing & ASO Keywords
- FlipaClip: freemium plus subscription (above).
- Brush Ninja: free with ads, plus a premium membership.
- Pixnote: free in the browser.
- FlipLoop: free, and that is part of angle 3.
- ASO: not applicable, since this is a local web app with no store listing.

### Recommended lead
Angle 1. It is the moment the user designed the product around, and no competitor stages it.

### Purchase-Decision Involvement
Signal: **Low involvement / Feel** (self-satisfaction). It costs nothing, needs no account, and the reward is emotional. **Site Planner:** "New animation" goes straight to a drawable canvas with no setup dialog in the way, since near-zero friction is the rule here. **Copywriter:** lead with delight and the moment, and keep explanations short.

### Aspirational Reference
**Procreate Dreams, Flipbook mode** (Signal). It is a dedicated, simplified mode styled on traditional cel animation, and reviewers call its onion-skin controls intuitive ([Creative Bloq](https://www.creativebloq.com/reviews/procreate-dreams), [help](https://help.procreate.com/articles/dvpjed-onion-skins)). Reviews also say playback speed cannot be changed in Performance mode, and FlipLoop's 6/12/24 fps covers that.
- **Site Planner:** a focused drawing mode where the onion-skin settings open in place, next to the canvas, not on a separate screen.
- **Web Designer:** the craft is in making onion ghosts feel like real translucent paper. Adapt that tactile feel, not the layout.

### Flipbook Print Dimensions
Sources: DIY guidance suggests about 5x7 cm to 7x10 cm pages ([videotoflip](https://www.videotoflip.com/blog/diy-flipbook-guide)). Commercial blank flipbooks measure 4.5x2.5 in (about 114x64 mm) ([Amazon listing](https://www.amazon.com/PRIMBEEKS-Flipbooks-Animation-Sketching-Creation/dp/B07Q4TNLRN)). Fliptomania's large flipbook is 4x6 in. For binding, general guidance is at least 1/2 in (12.7 mm) on the binding edge ([printfinishblog](https://printfinishblog.com/2017/06/dont-forget-margins-graphic-designers-primer-on-binding-machine/)). Tutorials say to keep the drawing away from the bound left edge and put numbers on each page. Thick 160-250 gsm card flips best.

**Recommended spec (Signal, derived from the above):**
- Each card is 100x60 mm, with a 20 mm staple margin on the left.
- The 4:3 image area is 72x54 mm with 4 mm padding. The square option is 54x54 mm.
- The frame number goes inside the staple margin.
- Dashed cut lines, laid out 2 across by 4 down on A4 or Letter: 8 cards per sheet, so 120 frames take 15 sheets.
- The binding stays on the left in the Hebrew UI, because thumb-flipping is physical and has nothing to do with reading direction.

### Market Price Range
Not a paid product. The competitor anchor is FlipaClip Plus at $5.99 to $39.99, depending on the tier (Fact, one listing, 2026-09-28).

### Category Market Health (Round 7)
Skipped on purpose: this is a personal project with a spec fixed by the user, not a bet on a category, and I did not check live charts. The one data point is FlipaClip's 267K ratings, which suggests the category is active (Signal).

### 11-Star Bar walkthrough
- Base: 3/3.
- Web-research gate: 2/3. Trace was done against primary sources (WebKit, MDN, Chrome Status, GitHub). Review lines are single-source and labeled Signal. The rating distribution was not observable, and the brief says so.
- Website gate: 4/5. Round 10's local-map search does not apply to a software tool, so it is a legitimate skip.
- Track B gate: 0/1. Round 7 was skipped as explained above.
- Total: 9/12, and both skips are explained.
