// Toasts (Part B: Film, On-film text, Lamp action) and the polite live region.
// One rule set (fix round R23):
//   1. Phone Editor: 8px above the tool row, never on the tools or the strip.
//   2. At most 3 on screen; the oldest one that is not persistent leaves first.
//   3. A toast with an `owner` belongs to that screen: it closes with it, and its action
//      does nothing once the owner is disposed.
//   4. An action toast that appears after keyboard input takes focus on its action; its
//      timer waits while it has focus or hover; Escape closes it and hands focus back.
//   5. While a modal <dialog> is open the rest of the page is inert, so the toast region
//      and the live region move into the top dialog and return when it closes.
//   6. One announcement per toast: the live region speaks, the toast itself has no role.
import { h } from "../lib/dom.js";
import { t } from "../lib/i18n.js";
import { on } from "../lib/bus.js";
import { iconEl } from "./icons.js";

const MAX_TOASTS = 3;
const open = new Set(); // { el, id, owner, persistent, close, resync }
let region;
let live;
let host = null; // the modal <dialog> both regions live in right now, or null for <body>
let hostWatch = null;
let lastInput = "pointer";

// Rule 4 needs to know how the last action was made. (Guarded: unit tests import UI modules in node.)
if (typeof document !== "undefined") {
  document.addEventListener("keydown", () => { lastInput = "keyboard"; }, true);
  document.addEventListener("pointerdown", () => { lastInput = "pointer"; }, true);
}

function ensure() {
  if (!region) {
    region = h("div", { class: "toasts" });
    live = h("div", { class: "sr-only", "aria-live": "polite", "aria-atomic": "true" });
    on("route", sweep);
    addEventListener("resize", place);
  }
  rehome();
}

/** The top modal dialog that is open and not on its way out. */
function topDialog() {
  const all = [...document.querySelectorAll("dialog[open]")].filter((d) => d.matches(":modal") && !d.classList.contains("sheet--closing"));
  return all.at(-1) || null;
}

function rehome() {
  const next = topDialog();
  if (next === host && region.isConnected) return;
  hostWatch?.disconnect();
  host?.removeEventListener("close", rehome);
  host = next;
  open.forEach((rec) => rec.el.classList.add("toast--shown")); // a moved toast must not fade in again
  (host || document.body).append(region, live);
  open.forEach((rec) => rec.resync());
  if (host) {
    host.addEventListener("close", rehome);
    hostWatch = new MutationObserver(rehome); // a closing sheet hands both regions back at once
    hostWatch.observe(host, { attributes: true, attributeFilter: ["class", "open"] });
  }
  place();
}

/** Rule 1. In the Editor the region sits 8px above whichever of the tool row, the strip and
 *  the playback bar lies under it (a side rail does not count). Elsewhere the stylesheet's
 *  own offset holds. */
function place() {
  if (!region) return;
  let bottom = "";
  const editor = host ? null : document.querySelector(".screen--editor.editor");
  if (host) bottom = "calc(var(--s-16) + var(--safe-b))";
  if (editor) {
    const r = region.getBoundingClientRect();
    const width = Math.min(r.width, 420);
    const left = r.left + (r.width - width) / 2;
    let top = innerHeight;
    for (const sel of [".tools", ".frames", ".playbar"]) {
      const q = editor.querySelector(sel)?.getBoundingClientRect();
      if (q && q.height && q.left < left + width && q.right > left) top = Math.min(top, q.top);
    }
    if (top < innerHeight) bottom = `${Math.round(innerHeight - top + 8)}px`;
  }
  region.style.bottom = bottom;
}

/** Rule 3: closes every toast whose screen is gone. */
function sweep() {
  for (const rec of [...open]) if (rec.owner?.disposed) rec.close();
}

/** Announces text to screen readers without showing anything. */
export function announce(text) {
  ensure();
  live.textContent = "";
  setTimeout(() => { live.textContent = text; }, 30);
}

/**
 * toast(message, { lines, action: {label, onClick}, timerMs, persistent, closeLabel, icon, warn, id,
 *   owner, returnFocus, announce, onClose })
 * owner: a screen object with `disposed`. returnFocus: () => element that takes focus when a
 * focused toast closes. announce: the text for screen readers when it differs from the
 * message. An action's onClick may return false to keep the toast open (the action was refused).
 * Returns { close, el }.
 */
export function toast(message, opts = {}) {
  ensure();
  sweep();
  if (opts.id) for (const rec of [...open]) if (rec.id === opts.id) rec.close();
  const lines = opts.lines || [];
  const el = h("div", { class: "toast" + (opts.warn ? " toast--warn" : ""), dataset: opts.id ? { toastId: opts.id } : {} });
  if (opts.icon) el.append(iconEl(opts.icon, { cls: "toast__icon" }));
  el.append(h("div", { class: "toast__text" }, h("span", {}, message), ...lines.map((l) => h("span", { class: "toast__line" }, l))));

  const life = opts.persistent ? 0 : opts.timerMs || 4000;
  const prevFocus = document.activeElement;
  let left = life;
  let since = 0;
  let timer = 0;
  let closed = false;
  let hovered = false;
  let focused = false;
  let focusTry = 0;
  let bar = null;

  const run = () => {
    if (!life || closed || hovered || focused || timer) return;
    since = performance.now();
    timer = setTimeout(close, left);
    el.classList.remove("toast--paused");
  };
  const pause = () => {
    if (!timer) return;
    clearTimeout(timer);
    timer = 0;
    left = Math.max(1000, left - (performance.now() - since));
    el.classList.add("toast--paused");
  };
  const refocus = () => {
    const target = opts.returnFocus?.() || (prevFocus !== document.body && prevFocus?.isConnected ? prevFocus : null);
    target?.focus?.({ preventScroll: true });
  };
  function close() {
    if (closed) return;
    closed = true;
    clearTimeout(timer);
    clearInterval(focusTry);
    open.delete(rec);
    const hadFocus = el.contains(document.activeElement);
    el.classList.add("toast--out");
    if (hadFocus) refocus();
    setTimeout(() => { el.remove(); place(); }, 200);
    opts.onClose?.();
  }
  const rec = {
    el, id: opts.id, owner: opts.owner || null, persistent: !!opts.persistent, close,
    // A CSS animation starts over when its element moves in the document: put the bar back in step.
    resync() { if (bar) bar.style.animationDelay = `${-(life - (timer ? left - (performance.now() - since) : left))}ms`; },
  };

  let actionBtn = null;
  if (opts.action) {
    actionBtn = h("button", { class: "toast__action", type: "button", onclick: () => {
      if (rec.owner?.disposed) return close();
      let keep = false;
      try {
        keep = opts.action.onClick() === false;
      } finally {
        if (!keep) close();
      }
    } }, opts.action.label);
    el.append(actionBtn);
  }
  if (opts.persistent) {
    el.append(h("button", { class: "toast__action toast__close-text", type: "button", onclick: () => close() }, opts.closeLabel || t("common.gotIt")));
  }
  if (opts.timerMs) {
    bar = h("span", { class: "toast__timer", style: { animationDuration: `${opts.timerMs}ms` } });
    el.append(bar);
  }
  el.addEventListener("pointerenter", () => { hovered = true; pause(); });
  el.addEventListener("pointerleave", () => { hovered = false; run(); });
  el.addEventListener("focusin", () => { focused = true; pause(); });
  el.addEventListener("focusout", () => { focused = false; run(); });
  el.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    e.preventDefault();
    e.stopPropagation();
    close();
  });

  open.add(rec);
  region.append(el);
  setTimeout(() => el.classList.add("toast--shown"), 220);
  const others = [...open].filter((r) => r !== rec && !r.persistent);
  while (open.size > MAX_TOASTS && others.length) others.shift().close();
  place();
  announce(opts.announce || [message, ...lines].join(" "));
  run();

  // Rule 4: after keyboard input the action takes focus. A sheet that is still closing keeps
  // the page inert for a moment and then hands focus to its own opener, so try a few times.
  if (actionBtn && lastInput === "keyboard") {
    let tries = 0;
    const tryFocus = () => {
      if (closed || ++tries > 12 || document.activeElement === actionBtn) return clearInterval(focusTry);
      actionBtn.focus({ preventScroll: true });
    };
    focusTry = setInterval(tryFocus, 60);
    tryFocus();
  }
  return { close, el };
}
