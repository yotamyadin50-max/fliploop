// One custom inline SVG set: 24 px grid, 2 px stroke, round caps and joins, one small
// deliberate wobble per path so it reads hand-drawn. Code-authored, trusted markup.

const P = {
  // LTR drawing; every one of these carries .icon--flip-rtl, so in Hebrew Back points right.
  back: "M14.6 5.2 8 12.1l6.5 6.7",
  arrowPrev: "M14.6 5.2 8 12.1l6.5 6.7",
  arrowNext: "M9.4 5.2 16 12l-6.5 6.8",
  pencil: "M4.2 19.8l1.1-4.3L15.6 5.2a2 2 0 0 1 2.9.1l.3.2a2 2 0 0 1 0 2.9L8.5 18.7z M13.7 7.1l3.2 3.2",
  eraser: "M8.6 19.6h11 M4.9 15.3l8.9-8.9a2 2 0 0 1 2.8.1l2.4 2.3a2 2 0 0 1 0 2.8l-7.3 7.4H9l-4.1-4.1a1.9 1.9 0 0 1 0-2.6z M9.4 10.8l4.8 4.9",
  fill: "M5.2 12.1 11 6.3l6.7 6.6-5.9 5.9a1.8 1.8 0 0 1-2.5 0l-4.1-4.1a1.8 1.8 0 0 1 0-2.6z M5.4 12.3h12.2 M8.6 3.6l2.5 2.6 M19.6 15.6s1.6 2 1.6 3.1a1.6 1.6 0 0 1-3.2.1c0-1.2 1.6-3.2 1.6-3.2z",
  undo: "M9 7.2 4.8 11.4 9 15.4 M5.3 11.3h9.2a4.7 4.7 0 0 1 0 9.4h-2.2",
  redo: "M15 7.2l4.2 4.2-4.2 4 M18.7 11.3H9.5a4.7 4.7 0 0 0 .1 9.4h2.2",
  move: "M12 3.2v17.6 M3.2 12.1h17.6 M9.3 5.9 12 3.2l2.7 2.7 M9.3 18.1 12 20.8l2.7-2.7 M5.9 9.3 3.2 12l2.7 2.7 M18.1 9.3l2.7 2.7-2.7 2.7",
  plus: "M12 5v14.1 M5 12h14",
  minus: "M5 12.1h14",
  // Fix round (K7): "לפתוח" and "לשנות שם" get glyphs of their own, so the pencil keeps one
  // meaning (a new animation) and the file icon another (the project file).
  open: "M13.4 4.3h6.3v6.4 M19.5 4.5 11.2 12.9 M17.6 13.6v4.9a1.5 1.5 0 0 1-1.5 1.5H5.5A1.5 1.5 0 0 1 4 18.5V8a1.5 1.5 0 0 1 1.5-1.5h5",
  rename: "M6.3 15.6l.9-3.5 7.6-7.6a1.7 1.7 0 0 1 2.4.1l.3.3a1.7 1.7 0 0 1 0 2.4l-7.7 7.5z M4 20.1h16.1",
  lock: "M6.5 10.8h11a1 1 0 0 1 1 1v7.1a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-7.1a1 1 0 0 1 1-1z M8.3 10.8V8a3.7 3.7 0 0 1 7.4.1v2.7",
  export: "M12 14.8V3.7 M8 7.4l4-3.9 4 3.9 M5 11.6v7.3a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5v-7.2",
  gallery: "M4 4.2h6.5v6.5H4z M13.6 4h6.5v6.6h-6.5z M4 13.5h6.6V20H4z M13.5 13.4h6.5v6.7h-6.5z",
  settings: "M4 7h9 M17 7.1h3 M4 17h3 M11 17h9 M15 4.8v4.4 M9 14.8v4.5",
  shield: "M12 3.4 19 6v5.6c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6.1z M8.8 12.2l2.2 2.2 4.2-4.3",
  stamp: "M12 3.5a8.5 8.5 0 1 0 .1 0z M8.3 12.3l2.5 2.5 4.9-5",
  close: "M6.3 6.2l11.4 11.6 M17.7 6.3 6.3 17.7",
  download: "M12 4v11.1 M7.8 11l4.2 4.2 4.2-4.2 M5 19.8h14",
  install: "M8.1 3.4h7.8a1.6 1.6 0 0 1 1.6 1.6v14a1.6 1.6 0 0 1-1.6 1.6H8.1A1.6 1.6 0 0 1 6.5 19V5a1.6 1.6 0 0 1 1.6-1.6z M12 7.2v6.9 M9.3 11.5l2.7 2.7 2.7-2.6 M10.6 17.5h2.8",
  upload: "M12 15V4.1 M7.8 8.2 12 4l4.2 4.2 M5 19.8h14",
  share: "M8.6 10.6l6.8-3.8 M8.6 13.4l6.8 3.9 M6 14.6a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2z M18 9a2.6 2.6 0 1 0 0-5.2A2.6 2.6 0 0 0 18 9z M18 20.2a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2z",
  print: "M7 9V4h10v5.1 M7 17H5a1.5 1.5 0 0 1-1.5-1.5v-5A1.5 1.5 0 0 1 5 9h14a1.5 1.5 0 0 1 1.5 1.5v5A1.5 1.5 0 0 1 19 17h-2 M7 14h10v6.1H7z",
  file: "M6.5 3.5h7.5l4 4v12.4a.6.6 0 0 1-.6.6H6.5a.6.6 0 0 1-.6-.6V4.1a.6.6 0 0 1 .6-.6z M13.8 3.6v4h4.1",
  gif: "M3.6 6h16.8v12.1H3.6z M3.6 9.5h16.8 M8 6v3.5 M12.1 6v3.5 M16 6v3.5 M10 12.3v4.2l3.6-2.1z",
  video: "M3.5 7.2h11a1 1 0 0 1 1 1v7.6a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V8.2a1 1 0 0 1 1-1z M15.5 10.4l5-2.8v8.9l-5-2.9",
  trash: "M4.5 6.8h15 M9.5 6.6V4.4h5v2.3 M6.6 6.9l.8 12.2a1 1 0 0 0 1 .9h7.2a1 1 0 0 0 1-.9l.8-12.3",
  duplicate: "M8.5 8.5h11v11.1h-11z M15.5 8.4V5a.6.6 0 0 0-.6-.6H5a.6.6 0 0 0-.6.6v9.9a.6.6 0 0 0 .6.6h3.4",
  hold: "M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17z M12 7.3V12l3.1 2",
  insert: "M4.5 5h9.1v14h-9.1z M19.2 8.8v6.4 M16 12h6.4",
  warn: "M12 4.1 21 19.5H3z M12 10v4.2 M12 17.2h.01",
  book: "M4 5.5c2.7-1 5.3-1 8 .8 2.7-1.8 5.3-1.8 8-.8v13c-2.7-1-5.3-1-8 .8-2.7-1.8-5.3-1.8-8-.7z M12 6.3v13.2",
  flag: "M5.5 21V4 M5.5 4.5h11l-2 4.1 2 4h-11",
  check: "M5.2 12.4l4.3 4.3 9.3-9.5",
  clear: "M5 5.2h14v13.9H5z M9 9.1l6 5.9 M15 9 9 15",
  size: "M4 6h16v12.1H4z M8 10h8v4.1H8z",
  chevron: "M6.2 9.3l5.8 5.9 5.9-5.8", // points down; rotated by CSS (up when open, toward the popover on desktop)
};

const FILLED = {
  play: "M7.6 5.3v13.4L18.6 12z",
  stop: "M7.2 7h9.7a.3.3 0 0 1 .3.3v9.5a.3.3 0 0 1-.3.3H7.2a.3.3 0 0 1-.3-.3V7.3a.3.3 0 0 1 .3-.3z",
  stepPrev: "M17.2 6.2 9.8 12l7.4 5.8z",
  stepNext: "M6.8 6.2 14.2 12l-7.4 5.8z",
};

const EXTRA = {
  stepPrev: '<path d="M6.8 6v12"/>',
  stepNext: '<path d="M17.2 6v12"/>',
  more: '<path d="M6 12h.01M12 12.1h.01M18 12h.01" stroke-width="3.2"/>',
  menu: '<path d="M12 6h.01M12 12.1h.01M12 18h.01" stroke-width="3.2"/>',
  onion: '<rect x="3.4" y="4.6" width="11.4" height="11.4" rx="2" stroke="#E0403A"/><rect x="9.2" y="8" width="11.4" height="11.5" rx="2" stroke="#2F6BDB"/>',
  loop: '<path d="M4.5 12a7.5 7.5 0 0 1 12.9-5.2M19.5 12.1a7.5 7.5 0 0 1-12.9 5.1M17.6 3.4v3.6H14M6.4 20.6V17h3.7"/>',
  pingpong: '<path d="M3.5 9h14.8M15 5.7l3.3 3.3-3.3 3.3M20.5 15.1H5.7M9 11.7 5.7 15 9 18.3"/>',
};

export function icon(name, { size = 24, cls = "" } = {}) {
  const attrs = `class="icon icon--${name} ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;
  let body = "";
  if (P[name]) body += `<path d="${P[name]}"/>`;
  if (FILLED[name]) body += `<path d="${FILLED[name]}" fill="currentColor" stroke="none"/>`;
  if (EXTRA[name]) body += EXTRA[name];
  return `<svg ${attrs}>${body}</svg>`;
}

export function iconEl(name, opts) {
  const span = document.createElement("span");
  span.className = "icon-wrap";
  span.innerHTML = icon(name, opts); // code-authored markup
  return span.firstChild;
}
