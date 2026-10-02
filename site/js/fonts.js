// Web fonts without a blank first screen (PWA-P1). index.html only preloads the Google Fonts
// stylesheet; this module adds it as a stylesheet. A <link rel="stylesheet"> written in the
// HTML holds back the first paint until the fonts host answers (8 s on a network that stalls
// it); a preload does not, and neither does a stylesheet added by script. The text shows in
// the fallback fonts first and swaps (display=swap), as it already did while a font file loaded.
const preload = document.querySelector('link[rel="preload"][as="style"][href^="https://fonts.googleapis.com/"]');
if (preload) {
  const sheet = document.createElement("link");
  sheet.rel = "stylesheet";
  sheet.href = preload.href;
  sheet.crossOrigin = preload.crossOrigin ?? "anonymous"; // same CORS mode, so the preloaded response is reused
  preload.after(sheet);
}
