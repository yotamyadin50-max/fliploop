// Modal surfaces on native <dialog> (focus trap, Esc, inert background for free):
// phone = bottom sheet, desktop = anchored popover (sheets) or centred dialog.
import { h } from "../lib/dom.js";
import { t } from "../lib/i18n.js";
import { isDesktop } from "../lib/util.js";
import { iconEl } from "./icons.js";

// Every open sheet, so the router can close them all before a screen is torn down
// (Critic F1: a sheet that outlived its screen erased a frame of a project off screen).
// The export overlay is route-bound and manages itself, so it is not registered here.
const openSheets = new Set();

// Where each sheet hands focus back to. A dialog opened from inside a sheet (Rename and Delete
// from a card menu) inherits that sheet's target: the menu item it was opened from is gone by
// the time the dialog closes (A8).
const returnTargets = new WeakMap();

/** Closes every open sheet at once (no exit animation). Returns how many were open. */
export function closeAllSheets() {
  const all = [...openSheets];
  all.forEach((s) => s.close(undefined, { immediate: true }));
  return all.length;
}

/** How many registered sheets are open. The router asks before it acts on a history Back (R30). */
export function sheetsOpen() {
  return openSheets.size;
}

/** Closes the sheet opened last, as a cancel. Returns false when none is open. */
export function closeTopSheet() {
  const top = [...openSheets].pop();
  top?.close();
  return !!top;
}

/**
 * openSheet({ title, body: Node, anchor?, side?, onClose?, kind: "sheet" | "dialog", className, owner? })
 * side (desktop only): an element to open beside, on the side of it that faces the canvas (the
 * middle of the window), top-aligned with `side`. Used by the shade chart popover (beside the
 * side panel) and the pencil-width popover (beside the tool rail), so neither covers its origin.
 * owner: the screen that opened it; once owner.disposed is set, every input in the sheet
 * is swallowed and the sheet closes, so a stale sheet can never write data.
 * Opening moves focus to the title (or to the dialog's own text field), never to the close
 * button: a screen reader starts at the title, and WebKit shows no ring after a tap (WK-W1).
 * Returns { close, dialog }.
 */
export function openSheet({ title, body, anchor = null, side = null, onClose, kind = "sheet", className = "", labelledTitle = true, owner = null }) {
  const titleId = "dlg-" + Math.random().toString(36).slice(2, 8);
  const popover = kind === "sheet" && anchor && isDesktop();
  const dialog = h("dialog", {
    class: `sheet sheet--${popover ? "popover" : kind} ${className}`,
    "aria-labelledby": labelledTitle && title ? titleId : null,
    tabindex: title ? null : "-1",
  });
  const titleEl = title ? h("h2", { class: "sheet__title", id: titleId, tabindex: "-1" }, title) : null;
  const header = h("div", { class: "sheet__header" },
    kind === "sheet" && !popover ? h("span", { class: "sheet__handle", "aria-hidden": "true" }) : null,
    titleEl,
    h("button", { class: "icon-btn sheet__close", type: "button", "aria-label": t("common.close"), onclick: () => close() }, iconEl("close")),
  );
  dialog.append(header, h("div", { class: "sheet__body" }, body));
  // Focus goes back to whatever had it. A side popover always hands it to its toggle, and so
  // does any sheet whose opener was clicked without taking focus (Safari does not focus a
  // button on click, so the active element is <body> then).
  const active = document.activeElement;
  const parentSheet = active?.closest?.("dialog.sheet");
  const opener = active && active !== document.body ? active : anchor;
  const returnFocus = side && anchor ? anchor : (parentSheet && returnTargets.get(parentSheet)) || opener;
  returnTargets.set(dialog, returnFocus);
  let closed = false;
  const entry = { close, owner };
  function close(result, { immediate = false } = {}) {
    if (closed) return;
    closed = true;
    openSheets.delete(entry);
    const finish = () => {
      if (dialog.open) dialog.close();
      dialog.remove();
      if (returnFocus && document.contains(returnFocus)) returnFocus.focus({ preventScroll: true });
      // The opener was rebuilt meanwhile (a renamed card): the screen heading, not <body>.
      else if (document.activeElement === document.body) document.querySelector(".screen h1[tabindex]")?.focus({ preventScroll: true });
      onClose?.(result);
    };
    if (immediate) return finish();
    dialog.classList.add("sheet--closing");
    setTimeout(finish, matchMedia("(prefers-reduced-motion: reduce)").matches ? 120 : 200);
  }
  const staleGuard = (e) => {
    if (!owner?.disposed) return;
    e.stopImmediatePropagation();
    e.preventDefault();
    close(undefined, { immediate: true });
  };
  for (const type of ["click", "input", "change", "keydown", "pointerdown"]) dialog.addEventListener(type, staleGuard, true);
  dialog.addEventListener("cancel", (e) => { e.preventDefault(); close(); });
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) {
      const r = dialog.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) close();
    }
  });
  document.body.append(dialog);
  dialog.showModal();
  (dialog.querySelector(".sheet__body input[type='text']") || titleEl || dialog).focus({ preventScroll: true });
  openSheets.add(entry);
  if (popover && side) placeBeside(dialog, side);
  else if (popover) placePopover(dialog, anchor);
  return { close, dialog };
}

function placePopover(dialog, anchor) {
  const a = anchor.getBoundingClientRect();
  const d = dialog.getBoundingClientRect();
  const margin = 8;
  let top = a.top - d.height - margin;
  if (top < margin) top = Math.min(a.bottom + margin, innerHeight - d.height - margin);
  let left = a.left + a.width / 2 - d.width / 2;
  left = Math.max(margin, Math.min(left, innerWidth - d.width - margin));
  // right/bottom "auto": under dir=rtl the UA's inset for <dialog> would otherwise win over
  // "left" and pin every popover to the right edge, away from its anchor.
  Object.assign(dialog.style, { position: "fixed", margin: "0", top: `${top}px`, left: `${left}px`, right: "auto", bottom: "auto" });
}

/** Beside `side`, on the side of it that faces the middle of the window (the canvas), with
 *  both tops level, clamped to the window. The entry slide comes from `side` (data-from). */
function placeBeside(dialog, side) {
  const p = side.getBoundingClientRect();
  const d = dialog.getBoundingClientRect();
  const margin = 8;
  const sideIsLeft = p.left + p.width / 2 < innerWidth / 2;
  let left = sideIsLeft ? p.right + margin : p.left - margin - d.width;
  left = Math.max(margin, Math.min(left, innerWidth - d.width - margin));
  const top = Math.max(margin, Math.min(p.top, innerHeight - d.height - margin));
  dialog.dataset.from = sideIsLeft ? "left" : "right";
  Object.assign(dialog.style, { position: "fixed", margin: "0", top: `${top}px`, left: `${left}px`, right: "auto", bottom: "auto" });
}

/** Confirmation dialog. Resolves true when confirmed. */
export function confirmDialog({ title, body, confirmLabel, cancelLabel = t("common.cancel"), destructive = false, extra = [], owner = null }) {
  return new Promise((resolve) => {
    let result = false;
    const actions = h("div", { class: "dialog__actions" },
      h("button", { class: `btn ${destructive ? "btn--danger" : "btn--primary"} btn--sheet`, type: "button", onclick: () => { result = true; s.close(); } }, confirmLabel),
      h("button", { class: "btn btn--secondary btn--sheet", type: "button", onclick: () => s.close() }, cancelLabel),
    );
    const content = h("div", { class: "dialog__content" },
      ...(Array.isArray(body) ? body : [body]).map((b) => (typeof b === "string" ? h("p", {}, b) : b)),
      ...extra, actions);
    const s = openSheet({ title, body: content, kind: "dialog", owner, onClose: () => resolve(result) });
  });
}
