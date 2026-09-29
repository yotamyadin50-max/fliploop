// Control groups shared by the phone sheets and the desktop side panel:
// colours, onion skin, canvas size, pencil/eraser width, and the frame menu.
import { h } from "../lib/dom.js";
import { t } from "../lib/i18n.js";
import { iconEl } from "../ui/icons.js";

export const SWATCHES = ["#1F1E1B", "#7A766E", "#FFFFFF", "#E23B2E", "#F28C28", "#F5C518", "#2E9E4F", "#1F9E9A", "#2F6BDB", "#7A4BC9", "#E8619A", "#8A5A3B"];

export function colorName(hex) {
  const i = SWATCHES.indexOf(hex.toUpperCase());
  return i >= 0 ? t(`color.${i + 1}`) : t("color.custom");
}

/** ed: { color, recentColor, setColor(hex, {custom}) } */
export function colorPanel(ed, { onPick } = {}) {
  const grid = h("div", { class: "swatches", role: "group", "aria-label": t("colors.title") });
  const render = () => {
    grid.replaceChildren();
    const all = ed.recentColor ? [...SWATCHES, ed.recentColor] : SWATCHES;
    all.forEach((hex, i) => {
      const selected = hex.toUpperCase() === ed.color.toUpperCase();
      const isRecent = i === SWATCHES.length;
      const label = isRecent ? t("colors.recent.aria") : selected ? t("colors.selected.aria", { colorName: colorName(hex) }) : colorName(hex);
      grid.append(h("button", {
        class: "swatch" + (isRecent ? " swatch--recent" : ""), type: "button", "aria-pressed": String(selected),
        "aria-label": label, title: colorName(hex), style: { "--swatch": hex },
        onclick: () => { ed.setColor(hex); render(); onPick?.(); },
      }));
    });
  };
  render();
  const picker = h("input", { type: "color", class: "picker__input", value: ed.color.toLowerCase(), "aria-label": t("colors.picker.aria") });
  picker.addEventListener("change", () => { ed.setColor(picker.value.toUpperCase(), { custom: true }); render(); onPick?.(); });
  const pickerLabel = h("label", { class: "picker" }, picker, h("span", {}, t("colors.picker")));
  return h("div", { class: "panel-group" }, grid, pickerLabel);
}

function segmented(options, value, onChange, { label, cls = "" } = {}) {
  const group = h("div", { class: `segmented ${cls}`, role: "group", "aria-label": label || null });
  const buttons = options.map((o) => h("button", {
    type: "button", class: "segmented__btn", "aria-pressed": String(o.value === value), "aria-label": o.aria || null,
    onclick: () => { buttons.forEach((b, i) => b.setAttribute("aria-pressed", String(options[i].value === o.value))); onChange(o.value); },
  }, o.label));
  group.append(...buttons);
  return group;
}

/** ed: { doc, setOnion(patch) } */
export function onionPanel(ed) {
  const o = ed.doc.project.onion;
  const toggle = h("button", { class: "switch", type: "button", role: "switch", "aria-checked": String(o.enabled), title: t("onion.toggle.tooltip") },
    h("span", { class: "switch__track", "aria-hidden": "true" }, h("span", { class: "switch__thumb" })),
    h("span", { class: "switch__label" }, iconEl("onion", { size: 20 }), t("onion.toggle")));
  const setToggleLabel = () => toggle.setAttribute("aria-label", t(ed.doc.project.onion.enabled ? "onion.toggle.on.aria" : "onion.toggle.off.aria"));
  setToggleLabel();
  toggle.addEventListener("click", () => {
    const enabled = !ed.doc.project.onion.enabled;
    toggle.setAttribute("aria-checked", String(enabled));
    ed.setOnion({ enabled });
    setToggleLabel();
  });
  const counts = (key, labelKey, ariaKey) => h("div", { class: "onion-count" },
    h("span", { class: "onion-count__label" }, t(labelKey)),
    segmented([0, 1, 2].map((v) => ({ value: v, label: String(v), aria: t(ariaKey, { n: v }) })), o[key], (v) => ed.setOnion({ [key]: v }), { cls: "segmented--small num" }));
  return h("div", { class: "panel-group" },
    h("h3", { class: "panel-title" }, t("onion.title")),
    toggle,
    counts("prev", "onion.prev", "onion.prev.aria"),
    counts("next", "onion.next", "onion.next.aria"),
    h("p", { class: "hint" }, t("onion.hint")));
}

/** ed: { doc, requestResize(w, h) } */
export function sizePanel(ed) {
  const square = ed.doc.width === ed.doc.height;
  return h("div", { class: "panel-group" },
    h("h3", { class: "panel-title" }, t("canvasSize.title")),
    segmented([
      { value: "wide", label: h("span", { class: "num" }, t("canvasSize.wide")), aria: t("canvasSize.wide.aria") },
      { value: "square", label: t("canvasSize.square"), aria: t("canvasSize.square.aria") },
    ], square ? "square" : "wide", (v) => ed.requestResize(v === "square" ? 360 : 480, 360)));
}

export function clearButton(ed) {
  return h("button", { class: "btn btn--secondary btn--block", type: "button", "aria-label": t("clearFrame.aria"), onclick: () => ed.clearFrame() },
    iconEl("clear"), t("clearFrame"));
}

export function moveButton(ed, { onDone } = {}) {
  return h("div", { class: "panel-group" },
    h("button", { class: "btn btn--secondary btn--block", type: "button", "aria-pressed": String(ed.tool === "move"), title: t("more.move.tooltip"),
      onclick: () => { ed.setTool("move"); onDone?.(); } }, iconEl("move"), t("more.move")),
    h("p", { class: "hint" }, t("more.move.hint")));
}

/** Pencil / eraser width chooser. */
export function widthPanel(ed, which, { onDone } = {}) {
  const current = which === "eraser" ? ed.eraserWidth : ed.pencilWidth;
  const opt = (k, px) => h("button", {
    class: "width-opt", type: "button", "aria-pressed": String(current === k), "aria-label": which === "eraser" ? null : t(`tool.pencil.${k}.aria`),
    title: t(`tool.pencil.${k}.tooltip`),
    onclick: () => { ed.setWidth(which, k); onDone?.(); },
  }, h("span", { class: "width-opt__dot", style: { width: `${px + 6}px`, height: `${px + 6}px` }, "aria-hidden": "true" }), h("span", {}, t(`tool.pencil.${k}`)));
  return h("div", { class: "width-panel" }, opt("s", 2), opt("m", 5), opt("l", 10));
}

/** Frame menu: duplicate, insert blank after, hold x1..x12, delete. */
export function frameMenu(ed, index, { onDone } = {}) {
  const f = ed.doc.frames[index];
  const lesson = ed.doc.isLesson;
  const holdAllowed = !lesson || ed.lessonMode?.lesson.holdsUnlocked;
  const holdValue = h("span", { class: "stepper__value num", "aria-live": "polite" });
  const setHoldLabel = () => {
    holdValue.textContent = t("strip.hold.badge", { hold: f.hold });
    holdValue.setAttribute("aria-label", f.hold === 1 ? t("frameMenu.hold.value.aria.one") : t("frameMenu.hold.value.aria.other", { hold: f.hold }));
  };
  setHoldLabel();
  const step = (d) => { ed.setHold(index, Math.max(1, Math.min(12, f.hold + d))); setHoldLabel(); };
  const holdRow = h("div", { class: "menu-hold" },
    h("div", { class: "menu-hold__head" }, iconEl("hold"), h("span", {}, t("frameMenu.hold"))),
    h("div", { class: "stepper", role: "group", "aria-label": t("frameMenu.hold") },
      h("button", { class: "stepper__btn", type: "button", disabled: !holdAllowed, onclick: () => step(-1) }, "-"),
      holdValue,
      h("button", { class: "stepper__btn", type: "button", disabled: !holdAllowed, onclick: () => step(1) }, "+")),
    h("p", { class: "hint" }, holdAllowed ? t("frameMenu.hold.hint") : t("lessonMode.holdDisabled")));
  const onlyOne = ed.doc.count <= 1;
  const item = (iconName, label, fn, { disabled = false, reason = null, danger = false, title = null } = {}) =>
    h("button", { class: "menu-item" + (danger ? " menu-item--danger" : ""), type: "button", disabled, title: reason || title, "aria-description": reason,
      onclick: () => { onDone?.(); fn(); } }, iconEl(iconName), h("span", {}, label));
  const full = ed.doc.count >= 120;
  return h("div", { class: "frame-menu" },
    item("duplicate", t("frameMenu.duplicate"), () => ed.duplicateFrame(index), { disabled: lesson || full, reason: lesson ? t("lessonMode.addDisabled") : full ? t("w4.add.disabled") : null, title: t("frameMenu.duplicate.tooltip") }),
    item("insert", t("frameMenu.insertBlank"), () => ed.insertBlank(index), { disabled: lesson || full, reason: lesson ? t("lessonMode.addDisabled") : full ? t("w4.add.disabled") : null }),
    holdRow,
    item("trash", t("frameMenu.delete"), () => ed.deleteFrame(index), { disabled: lesson || onlyOne, reason: lesson ? t("lessonMode.addDisabled") : onlyOne ? t("frameMenu.delete.disabled") : null, danger: true }),
  );
}
