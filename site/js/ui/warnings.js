// W1 banner (Home, Gallery), W2 banner (Gallery), W2b modal (adding while full).
import { h } from "../lib/dom.js";
import { t } from "../lib/i18n.js";
import { iconEl } from "./icons.js";
import { toast } from "./toast.js";
import { openSheet } from "./dialog.js";
import { updateSettings } from "../store/settings.js";
import { downloadBackup, downloadDocFile, downloadProjectFile } from "../store/project-file.js";
import { listProjects } from "../store/projects.js";
import { persisted, shouldShowW1, checkNearlyFull } from "../store/storage.js";

export async function w1Banner() {
  const projects = await listProjects().catch(() => []);
  if (!shouldShowW1(projects, await persisted())) return null;
  const banner = h("div", { class: "banner banner--warn", role: "region", "aria-label": t("w1.title") },
    iconEl("shield", { cls: "banner__icon" }),
    h("div", { class: "banner__text" }, h("strong", {}, t("w1.title")), h("p", {}, t("w1.body"))),
    h("button", { class: "btn btn--secondary btn--compact", type: "button", onclick: async () => {
      const name = await downloadBackup();
      if (name) { toast(t("backup.done", { filename: name })); banner.remove(); }
      else toast(t("backup.empty"));
    } }, iconEl("download", { size: 20 }), t("w1.action")),
    h("button", { class: "icon-btn banner__dismiss", type: "button", "aria-label": t("w1.dismiss.aria"), onclick: () => {
      updateSettings({ w1DismissedAt: Date.now() });
      banner.remove();
    } }, iconEl("close")));
  return banner;
}

export async function w2GalleryBanner() {
  const e = await checkNearlyFull({ force: true });
  if (!e || e.ratio < 0.8) return null;
  return h("div", { class: "banner banner--warn", role: "status" },
    iconEl("warn", { cls: "banner__icon" }),
    h("div", { class: "banner__text" },
      h("strong", {}, t("w2.text", { percent: Math.round(e.ratio * 100) })),
      h("p", {}, t("w2.gallery.hint"))));
}

/** W2b: storage is full. doc = the open Editor document, or a project id, or null. */
export function showW2b(docOrId = null) {
  const body = h("div", { class: "dialog__content" },
    h("p", {}, t("w2b.body")),
    h("p", { class: "muted" }, t("w2b.hint")),
    h("div", { class: "dialog__actions" },
      docOrId ? h("button", { class: "btn btn--primary btn--sheet", type: "button", onclick: async () => {
        const name = typeof docOrId === "string" ? await downloadProjectFile(docOrId) : downloadDocFile(docOrId);
        toast(t("export.done.project", { filename: name }));
        s.close();
      } }, iconEl("download"), t("w2b.action")) : null,
      h("a", { class: "btn btn--secondary btn--sheet", href: "#/gallery", onclick: () => s.close() }, t("w2b.gallery")),
      h("button", { class: "btn btn--tertiary", type: "button", onclick: () => s.close() }, t("w2b.close"))));
  const s = openSheet({ title: t("w2b.title"), body, kind: "dialog" });
  return s;
}
