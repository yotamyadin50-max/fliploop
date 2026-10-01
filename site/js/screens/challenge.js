// This week's challenge (plan 7): deterministic theme by week number, film slate, stamps.
import { h, clear } from "../lib/dom.js";
import { t } from "../lib/i18n.js";
import { iconEl } from "../ui/icons.js";
import { screenHeader } from "./common.js";
import { weekInfo } from "../core/challenge.js";
import { THEMES } from "../data/themes.js";
import { getProgress } from "../store/settings.js";
import { findChallengeProject } from "../store/projects.js";
import { openChallengeProject } from "../store/special-projects.js";
import { isFull } from "../store/storage.js";
import { showW2b } from "../ui/warnings.js";

export function challengeMeta(info) {
  const { daysLeft, weekLabel, hasWeekNumber } = info;
  const base = hasWeekNumber ? "challenge.meta.days" : "challenge.meta.noWeek";
  const variant = daysLeft === 1 ? "last" : daysLeft === 2 ? "two" : "other";
  return t(`${base}.${variant}`, { week: weekLabel, days: daysLeft });
}

export class ChallengeScreen {
  constructor(section, router) {
    this.section = section;
    this.router = router;
  }

  async mount() {
    this.router.setTitle(t("meta.title.challenge"));
    clear(this.section);
    const info = weekInfo(new Date());
    const theme = THEMES[info.themeIndex];
    this.cta = h("button", { class: "btn btn--primary btn--block", type: "button", onclick: () => this.start(info, theme) }, iconEl("pencil"), t("challenge.cta.start"));
    this.stampRule = h("p", { class: "muted small", hidden: true }, t("challenge.stampRule"));
    const weeks = [...getProgress().challengeWeeks].sort((a, b) => b - a);
    this.emptyLine = weeks.length ? null : h("p", { class: "muted" }, t("challenge.stamps.empty"));
    const stamps = weeks.length
      ? h("ul", { class: "stamps" }, weeks.map((w) => {
        const wt = THEMES[((w % 52) + 52) % 52];
        return h("li", { class: "stamp-circle", role: "img", "aria-label": t("challenge.stamp.aria", { week: w + 1, theme: wt }) },
          iconEl("stamp", { size: 26 }), h("span", { class: "num" }, String(w + 1)));
      }))
      : h("div", { class: "stamps-empty" }, h("span", { class: "stamp-circle stamp-circle--empty", "aria-hidden": "true" }), this.emptyLine);
    this.section.append(
      screenHeader("#/", "common.back.home", "common.back.home.aria"),
      h("div", { class: "page challenge" },
        h("h1", { class: "screen-h1", tabindex: "-1" }, t("challenge.h1")),
        h("div", { class: "slate film" },
          h("div", { class: "slate__band", "aria-hidden": "true" }),
          h("h2", { class: "slate__theme" }, t("challenge.theme", { theme })),
          h("p", { class: "slate__meta num-mix" }, challengeMeta(info))),
        this.cta,
        h("p", { class: "muted small" }, t("challenge.rule")),
        this.stampRule,
        h("h2", { class: "h2 challenge__h2" }, t("challenge.stamps.h2")),
        stamps));
    const project = await findChallengeProject(info.weekIndex).catch(() => null);
    if (this.disposed || !project) return;
    this.cta.replaceChildren(iconEl("pencil"), t("challenge.cta.resume"));
    if (getProgress().challengeWeeks.includes(info.weekIndex)) return;
    // Joined, not stamped yet. With no stamps at all, the list's empty line stops inviting to
    // join and says what is still missing; otherwise the rule sits under the button.
    if (this.emptyLine) this.emptyLine.textContent = t("challenge.stampRule");
    else this.stampRule.hidden = false;
  }

  async start(info, theme) {
    this.cta.disabled = true;
    try {
      const existing = await findChallengeProject(info.weekIndex);
      if (!existing && (await isFull())) { showW2b(); return; }
      const p = existing || (await openChallengeProject(info.weekIndex, theme));
      location.hash = `#/editor/${p.id}`;
    } catch (err) {
      // Storage failures are reported once, app-wide (contract K1); nothing more to do here.
      console.error("Challenge could not be opened", err);
    } finally {
      this.cta.disabled = false;
    }
  }

  unmount() {
    this.disposed = true;
  }
}
