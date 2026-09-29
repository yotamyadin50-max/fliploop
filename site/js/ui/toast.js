// Toasts (Part B: Film, On-film text, Lamp action) and the polite live region.
import { h } from "../lib/dom.js";
import { t } from "../lib/i18n.js";
import { iconEl } from "./icons.js";

let region;
let live;

function ensure() {
  if (region) return;
  region = h("div", { class: "toasts" });
  live = h("div", { class: "sr-only", "aria-live": "polite", "aria-atomic": "true" });
  document.body.append(region, live);
}

/** Announces text to screen readers without showing anything. */
export function announce(text) {
  ensure();
  live.textContent = "";
  setTimeout(() => { live.textContent = text; }, 30);
}

/**
 * toast(message, { lines, action: {label, onClick}, timerMs, persistent, closeLabel, icon, id })
 * Returns { close }.
 */
export function toast(message, opts = {}) {
  ensure();
  if (opts.id) region.querySelector(`[data-toast-id="${opts.id}"]`)?.remove();
  const text = h("div", { class: "toast__text" }, h("span", {}, message), ...(opts.lines || []).map((l) => h("span", { class: "toast__line" }, l)));
  const el = h("div", { class: "toast" + (opts.warn ? " toast--warn" : ""), role: "status", dataset: opts.id ? { toastId: opts.id } : {} });
  if (opts.icon) el.append(iconEl(opts.icon, { cls: "toast__icon" }));
  el.append(text);
  let timer;
  const close = () => {
    clearTimeout(timer);
    el.classList.add("toast--out");
    setTimeout(() => el.remove(), 200);
  };
  if (opts.action) {
    el.append(h("button", { class: "toast__action", type: "button", onclick: () => { close(); opts.action.onClick(); } }, opts.action.label));
  }
  if (opts.persistent) {
    el.append(h("button", { class: "toast__action toast__close-text", type: "button", onclick: close }, opts.closeLabel || t("common.gotIt")));
  }
  if (opts.timerMs) {
    const bar = h("span", { class: "toast__timer", style: { animationDuration: `${opts.timerMs}ms` } });
    el.append(bar);
  }
  region.append(el);
  announce([message, ...(opts.lines || [])].join(" "));
  if (!opts.persistent) timer = setTimeout(close, opts.timerMs || 4000);
  return { close, el };
}
