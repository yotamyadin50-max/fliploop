// Control groups shared by the phone sheets and the desktop side panel:
// colours, onion skin, canvas size, pencil/eraser width, and the frame menu.
import { h } from "../lib/dom.js";
import { t } from "../lib/i18n.js";
import { iconEl } from "../ui/icons.js";

export const SWATCHES = ["#1F1E1B", "#7A766E", "#FFFFFF", "#E23B2E", "#F28C28", "#F5C518", "#2E9E4F", "#1F9E9A", "#2F6BDB", "#7A4BC9", "#E8619A", "#8A5A3B"];

// 10 hue rows x 7 steps, lightest first. `base` is the 0-based index into SWATCHES (hue name = color.{base+1});
// the cell equal to that swatch IS the base color. Generated in OKLCH, see _process/03d.
export const SHADE_ROWS = [
  { base: 1,  cells: ["#FCFAF6","#DCD9D3","#BCB8B1","#9B978F","#7A766E","#58544D","#35322D"] }, // gray
  { base: 3,  cells: ["#FFE0DA","#FFAC9F","#FF6E5D","#E23B2E","#BB110B","#8C0000","#5D0000"] }, // red
  { base: 4,  cells: ["#FFE2CC","#FFB67C","#F28C28","#D06F00","#AA5800","#854100","#612C00"] }, // orange
  { base: 5,  cells: ["#FFF6DF","#FFDE80","#F5C518","#CB9E00","#A17A00","#785800","#503900"] }, // yellow
  { base: 6,  cells: ["#B9FBC4","#8CDC9B","#5EBD73","#2E9E4F","#007932","#005320","#00300F"] }, // green
  { base: 7,  cells: ["#B4F7F3","#86D9D5","#57BCB7","#1F9E9A","#007A77","#005754","#003634"] }, // teal
  { base: 8,  cells: ["#E6EFFF","#B3CFFF","#80AEFF","#518BF7","#2F6BDB","#0C45AB","#00256F"] }, // blue
  { base: 9,  cells: ["#EAE3FF","#CDBBFF","#B390FF","#966DE6","#7A4BC9","#59289E","#3A0073"] }, // purple
  { base: 10, cells: ["#FFDEE8","#FF9CC1","#E8619A","#C5457E","#A32762","#820048","#58002F"] }, // pink
  { base: 11, cells: ["#EFCDB6","#D5AA90","#B08164","#8A5A3B","#693E20","#482202","#270E00"] }, // brown
];
const STEPS = 7;
const SHADE_AT = new Map(); // hex -> { row, step }
SHADE_ROWS.forEach((r, row) => r.cells.forEach((hex, step) => { if (!SHADE_AT.has(hex)) SHADE_AT.set(hex, { row, step }); }));
const hueName = (row) => t(`color.${SHADE_ROWS[row].base + 1}`);
const baseStep = (row) => SHADE_ROWS[row].cells.indexOf(SWATCHES[SHADE_ROWS[row].base]);

export const isBaseColor = (hex) => SWATCHES.includes(hex.toUpperCase());

/** Base name ("כחול"), shade name ("כחול 6"), or "צבע משלי". */
export function colorName(hex) {
  const up = hex.toUpperCase();
  const i = SWATCHES.indexOf(up);
  if (i >= 0) return t(`color.${i + 1}`);
  const at = SHADE_AT.get(up);
  if (at) return t("shade.name", { colorName: hueName(at.row), n: at.step + 1 });
  return t("color.custom");
}

const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
let uid = 0;

/** The shade chart: 10 strips of 7 tiles, roving tabindex, arrows follow the screen (RTL). */
function shadeGrid(ed, pick) {
  const current = ed.color.toUpperCase();
  const tiles = [];
  const strips = SHADE_ROWS.map((r, row) => {
    const bs = baseStep(row);
    return h("div", { class: "shades__strip", role: "group", "aria-label": hueName(row) },
      r.cells.map((hex, step) => {
        const isBase = step === bs;
        const label = isBase ? hueName(row)
          : t("shade.aria", { colorName: hueName(row), tone: t(step < bs ? "shade.tone.light" : "shade.tone.dark"), n: step + 1 });
        const tile = h("button", {
          type: "button", class: "shade" + (isBase ? " shade--base" : ""), "aria-pressed": String(hex === current),
          "aria-label": label, title: colorName(hex), tabindex: "-1", style: { "--swatch": hex },
          dataset: { row, step }, onclick: () => pick(hex),
        });
        tiles.push(tile);
        return tile;
      }));
  });
  const el = h("div", { class: "shades", role: "group", "aria-label": t("colors.shades.title") }, strips);
  let active = tiles.find((b) => b.getAttribute("aria-pressed") === "true") || tiles[0];
  active.tabIndex = 0;
  el.addEventListener("keydown", (e) => {
    const tile = e.target.closest?.(".shade");
    if (!tile) return;
    let row = +tile.dataset.row, step = +tile.dataset.step;
    const rtl = getComputedStyle(el).direction === "rtl";
    const ctrl = e.ctrlKey || e.metaKey;
    switch (e.key) {
      case "ArrowLeft": step += rtl ? 1 : -1; break;
      case "ArrowRight": step += rtl ? -1 : 1; break;
      case "ArrowUp": row -= 1; break;
      case "ArrowDown": row += 1; break;
      case "Home": if (ctrl) row = 0; step = 0; break;
      case "End": if (ctrl) row = SHADE_ROWS.length - 1; step = STEPS - 1; break;
      default: return;
    }
    e.preventDefault();
    e.stopPropagation();
    row = Math.max(0, Math.min(SHADE_ROWS.length - 1, row));
    step = Math.max(0, Math.min(STEPS - 1, step));
    const next = tiles[row * STEPS + step];
    if (next === tile) return;
    active.tabIndex = -1;
    active = next;
    active.tabIndex = 0;
    active.focus();
  });
  return { el, focusCurrent: () => active.focus(), current: () => active };
}

/** "בחרתם לאחרונה": up to 7 round chips; the whole block is hidden while the list is empty. */
function recentBlock(ed, pick) {
  const list = ed.recentColors || [];
  const current = ed.color.toUpperCase();
  const capId = `recent-cap-${++uid}`;
  const row = h("div", { class: "recent-row", role: "group", "aria-labelledby": capId },
    list.map((hex) => h("button", {
      type: "button", class: "swatch", "aria-pressed": String(hex.toUpperCase() === current), "aria-label": colorName(hex),
      title: colorName(hex), style: { "--swatch": hex }, onclick: () => pick(hex),
    })));
  return h("div", { class: "recent-block", hidden: list.length === 0 },
    h("p", { class: "shades-caption", id: capId }, t("colors.shades.recent")), row);
}

/**
 * ed: { color, recentColors, setColor(hex), shadesOpen, setShadesOpen(open), openShadesPopover(toggle, body, onClose) }
 * context "sheet": phone and landscape bottom sheet, the chart expands in place.
 * context "panel": desktop side panel, the chart opens as a popover beside the panel.
 */
export function colorPanel(ed, { onPick, context = "sheet" } = {}) {
  const grid = h("div", { class: "swatches", role: "group", "aria-label": t("colors.title") });
  const render = () => {
    grid.replaceChildren();
    const recent = ed.recentColors?.[0];
    const all = recent ? [...SWATCHES, recent] : SWATCHES;
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
  const panelId = `shades-${++uid}`;
  const toggle = h("button", {
    type: "button", class: "shades-toggle", "aria-expanded": "false", "aria-controls": panelId,
    "aria-haspopup": context === "panel" ? "dialog" : null,
  }, iconEl("chevron", { size: 20 }), h("span", {}, t("colors.shades.more")));

  if (context === "panel") {
    // Desktop: the toggle gets its own full-width row; the chart opens beside the panel.
    toggle.addEventListener("click", () => {
      let pop = null;
      const pick = (hex) => { ed.setColor(hex); render(); pop?.close(); };
      const sg = shadeGrid(ed, pick);
      const body = h("div", { class: "shades-pop", id: panelId }, recentBlock(ed, pick), sg.el);
      toggle.setAttribute("aria-expanded", "true");
      pop = ed.openShadesPopover(toggle, body, () => toggle.setAttribute("aria-expanded", "false"));
      sg.focusCurrent();
    });
    return h("div", { class: "colors colors--panel" }, grid, toggle, pickerLabel);
  }

  // Phone / landscape sheet: the chart expands in place under the toggle row.
  const pick = (hex) => { ed.setColor(hex); render(); onPick?.(); };
  const sg = shadeGrid(ed, pick);
  const recentReveal = h("div", { class: "reveal" }, h("div", { class: "reveal__inner" }, recentBlock(ed, pick)));
  const shadesPanel = h("div", { class: "reveal shades-panel", id: panelId }, h("div", { class: "reveal__inner" }, sg.el));
  const main = h("div", { class: "colors__main" }, grid, h("div", { class: "colors__row" }, toggle, pickerLabel), recentReveal);
  const root = h("div", { class: "colors" }, main, shadesPanel);
  const setOpen = (open, { animate = true } = {}) => {
    toggle.setAttribute("aria-expanded", String(open));
    root.classList.toggle("is-expanded", open);
    for (const r of [recentReveal, shadesPanel]) { r.classList.toggle("is-open", open); r.inert = !open; }
    root.closest("dialog")?.classList.toggle("sheet--tall", open);
    if (open && animate) {
      const rm = reducedMotion();
      setTimeout(() => { if (shadesPanel.isConnected) shadesPanel.scrollIntoView({ block: "nearest", behavior: rm ? "auto" : "smooth" }); }, rm ? 0 : 250);
    }
  };
  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") !== "true";
    setOpen(open);
    ed.setShadesOpen?.(open);
  });
  setOpen(!!ed.shadesOpen, { animate: false });
  /** Called once the sheet is in the DOM: an already-expanded chart scrolls its selected tile into view. */
  root.afterOpen = () => {
    if (!ed.shadesOpen) return;
    root.closest("dialog")?.classList.add("sheet--tall");
    const cur = sg.current();
    if (cur.getAttribute("aria-pressed") === "true") requestAnimationFrame(() => cur.scrollIntoView({ block: "nearest", behavior: "auto" }));
  };
  return root;
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
