import { h } from "../lib/dom.js";
import { t } from "../lib/i18n.js";
import { iconEl } from "../ui/icons.js";

/** Top bar for secondary screens: labelled Back control at the start, wordmark. */
export function screenHeader(href, labelKey, ariaKey, ariaParams) {
  return h("header", { class: "site-header site-header--screen" },
    h("a", { class: "back", href, "aria-label": t(ariaKey, ariaParams) }, iconEl("back", { cls: "icon--flip-rtl" }), h("span", {}, t(labelKey))),
    h("a", { class: "wordmark", href: "#/" }, "FlipLoop"));
}
