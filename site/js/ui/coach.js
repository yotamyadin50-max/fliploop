// Coach marks (Part B): Film bubble, one line, 44px close, two Lamp rings pulse on the
// target three times. Never blocks input: only the close button takes pointer events.
import { h } from "../lib/dom.js";
import { t } from "../lib/i18n.js";
import { iconEl } from "./icons.js";
import { announce } from "./toast.js";

/**
 * clearOf: () => elements the bubble must not cover. With placement "above", the bubble
 * rises until its arrow tip clears the highest of them that lies under it, so it points
 * down at the target from over the canvas instead of hiding the strip or the tool row
 * (Critic F4). A thin leader (--lead) then carries the arrow tip down to the target itself.
 * A toast counts the same way, so a toast never lands on an open tip.
 * keepBelow: () => an element the bubble must stay under (the Editor's top bar, so a short
 * landscape screen keeps its title and Export button).
 */
export function showCoach(target, text, { onClose, placement = "above", timeoutMs = 0, closable = true, className = "", clearOf = null, keepBelow = null } = {}) {
  let raf = 0;
  let timer = 0;
  let closed = false;
  const bubble = h("div", { class: `coach coach--${placement} ${className}`, role: "note" },
    h("span", { class: "coach__text" }, text),
    closable ? h("button", { class: "coach__close", type: "button", "aria-label": t("coach.close.aria"), onclick: () => close(true) }, iconEl("close", { size: 18 })) : null,
  );
  const rings = h("span", { class: "coach-rings", "aria-hidden": "true" }, h("span"), h("span"));
  document.body.append(bubble, rings);
  announce(text);
  const place = () => {
    if (closed) return;
    if (!target.isConnected) return close(false);
    const r = target.getBoundingClientRect();
    const b = bubble.getBoundingClientRect();
    let left = r.left + r.width / 2 - b.width / 2;
    left = Math.max(8, Math.min(left, innerWidth - b.width - 8));
    let top = placement === "below" ? r.bottom + 12 : r.top - b.height - 12;
    if (placement === "above") {
      const lift = (el) => {
        if (!el?.isConnected) return;
        const c = el.getBoundingClientRect();
        if (c.width && c.height && c.left < left + b.width && c.right > left) top = Math.min(top, c.top - b.height - 8);
      };
      if (clearOf) clearOf().forEach(lift);
      document.querySelectorAll(".toast:not(.toast--out)").forEach(lift);
    }
    const roof = keepBelow?.();
    top = Math.max(roof?.isConnected ? roof.getBoundingClientRect().bottom + 4 : 8, top);
    bubble.style.left = `${left}px`;
    bubble.style.top = `${top}px`;
    // Lifted clear of other UI: extend the arrow with a leader so its tip still lands on the target.
    const lead = placement === "above" ? Math.max(0, r.top - 12 - (top + b.height)) : 0;
    bubble.style.setProperty("--lead", `${lead}px`);
    bubble.classList.toggle("coach--lead", lead > 0);
    bubble.style.setProperty("--arrow-x", `${r.left + r.width / 2 - left}px`);
    Object.assign(rings.style, { left: `${r.left + r.width / 2}px`, top: `${r.top + r.height / 2}px`, width: `${Math.max(r.width, 44)}px`, height: `${Math.max(r.height, 44)}px` });
    raf = requestAnimationFrame(place);
  };
  place();
  if (!closed && timeoutMs) timer = setTimeout(() => close(false), timeoutMs);
  function close(byUser) {
    if (closed) return;
    closed = true;
    cancelAnimationFrame(raf);
    clearTimeout(timer);
    bubble.classList.add("coach--out");
    setTimeout(() => { bubble.remove(); rings.remove(); }, 250);
    onClose?.(byUser);
  }
  return { close };
}
