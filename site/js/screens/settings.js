// Storage and settings (plan 9).
import { h, clear } from "../lib/dom.js";
import { t } from "../lib/i18n.js";
import { formatBytes, dateDMY } from "../lib/util.js";
import { iconEl } from "../ui/icons.js";
import { toast } from "../ui/toast.js";
import { screenHeader } from "./common.js";
import { estimate, refreshPersisted } from "../store/storage.js";
import { getSettings, resetTips } from "../store/settings.js";
import { importButton, runBackup } from "./gallery.js";

export class SettingsScreen {
  constructor(section, router) {
    this.section = section;
    this.router = router;
  }

  async mount() {
    this.router.setTitle(t("meta.title.settings"));
    clear(this.section);
    this.storage = h("div", { class: "storage" });
    const credit = t("settings.about.credit");
    const title = "The Illusion of Life";
    const [before, after] = credit.split(title);
    this.section.append(
      screenHeader("#/", "common.back.home", "common.back.home.aria"),
      h("div", { class: "page settings" },
        h("h1", { class: "screen-h1", tabindex: "-1" }, t("settings.h1")),
        h("section", { class: "card" }, h("h2", { class: "h3" }, t("settings.storage.h2")), this.storage,
          h("div", { class: "row-actions" },
            h("button", { class: "btn btn--secondary", type: "button", onclick: async () => { await runBackup(); this.renderStorage(); } }, iconEl("download"), t("settings.backup")),
            importButton(t("settings.import"), () => this.renderStorage()))),
        h("section", { class: "card" }, h("h2", { class: "h3" }, t("settings.help.h2")),
          h("button", { class: "btn btn--secondary", type: "button", onclick: async () => { await resetTips(); toast(t("settings.tips.done")); } }, t("settings.tips.reset")),
          h("p", { class: "muted" }, t("settings.undoNote")),
          h("p", { class: "muted" }, t("settings.motionNote"))),
        h("section", { class: "card" }, h("h2", { class: "h3" }, t("settings.about.h2")),
          h("p", { class: "about__name" }, t("settings.about.name")),
          h("p", {}, t("settings.about.privacy")),
          h("p", { class: "muted" }, before, h("i", { dir: "ltr", lang: "en" }, title), after))));
    await this.renderStorage();
  }

  async renderStorage() {
    const e = await estimate();
    const granted = await refreshPersisted();
    if (this.disposed) return;
    clear(this.storage);
    if (e) {
      const pct = Math.round(e.ratio * 100);
      this.storage.append(
        h("div", { class: "meter" + (e.ratio >= 0.8 ? " meter--warn" : ""), role: "meter", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(pct),
          "aria-label": t("settings.storage.meter.aria", { used: formatBytes(e.usage), quota: formatBytes(e.quota), percent: pct }) },
          h("span", { class: "meter__fill", style: { width: `${Math.max(1, pct)}%` } })),
        h("p", { class: "num" }, t("settings.storage.meter", { used: formatBytes(e.usage), quota: formatBytes(e.quota), percent: pct })));
    } else {
      this.storage.append(h("p", { class: "muted" }, t("settings.storage.unknown")));
    }
    this.storage.append(
      h("p", { class: "protected" }, iconEl(granted ? "shield" : "warn", { size: 20 }),
        h("span", {}, t("settings.protected.label"), " "), h("strong", {}, t(granted ? "settings.protected.yes" : "settings.protected.no"))),
      h("p", { class: "muted small" }, t(granted ? "settings.protected.yes.hint" : "settings.protected.no.hint")));
    const last = getSettings().lastBackupAt;
    this.storage.append(h("p", { class: "num-mix" }, last ? t("settings.lastBackup", { date: dateDMY(last) }) : t("settings.lastBackup.never")));
  }

  unmount() {
    this.disposed = true;
  }
}
