// W0 banner (storage blocked or unreadable), W1 banner (Home, Gallery), W2 banner (Gallery),
// W2b modal (adding while full), and the shared "say what failed" helpers.
import { h } from "../lib/dom.js";
import { t } from "../lib/i18n.js";
import { iconEl } from "./icons.js";
import { toast } from "./toast.js";
import { openSheet } from "./dialog.js";
import { updateSettings } from "../store/settings.js";
import { downloadBackup, downloadDocFile, downloadProjectFile } from "../store/project-file.js";
import { listProjects } from "../store/projects.js";
import { persisted, shouldShowW1, checkNearlyFull } from "../store/storage.js";
import { storageState, reportStorageError } from "../store/db.js";

/**
 * A failed action: a storage error gets the one global message (app.js listens for
 * "storage-error"), anything else the generic toast. Never silent, never an unhandled rejection.
 */
export function reportFailure(err) {
  console.error(err);
  if (err?.storage) reportStorageError(err, { force: true }); // even if a lower layer muted it
  else toast(t("common.error.generic"));
}

function storageBanner(titleKey, bodyKey) {
  // Fixed: no dismiss. It stays for as long as it is true; "try again" reloads the app.
  return h("div", { class: "banner banner--warn banner--storage", role: "alert" },
    iconEl("warn", { cls: "banner__icon" }),
    h("div", { class: "banner__text" }, h("strong", {}, t(titleKey)), h("p", {}, t(bodyKey))),
    h("button", { class: "btn btn--secondary btn--compact", type: "button", onclick: () => location.reload() }, t("storage.readFailed.retry")));
}

/** W0: the browser blocks storage (R4). Nothing drawn here would be saved, and the app says so. */
export const w0Banner = () => storageBanner("w0.title", "w0.body");

/** Storage works but this read failed: nothing was deleted. */
export const readFailedBanner = () => storageBanner("storage.readFailed.title", "storage.readFailed.body");

/** The banner for the current storage state, or null when storage is healthy. */
export function storageStateBanner() {
  return storageState() === "blocked" ? w0Banner() : null;
}

/** Downloads the full backup and says what happened. Resolves true when a file was made. */
export async function backupNow() {
  try {
    const name = await downloadBackup();
    toast(name ? t("backup.done", { filename: name }) : t("backup.empty"));
    return !!name;
  } catch (err) {
    reportFailure(err);
    return false;
  }
}

/**
 * The warning slot of Home and Gallery: the storage banner when storage is unhealthy (never
 * "all is well" on top of a fault), otherwise W1 when the work is not protected.
 */
export async function w1Banner() {
  if (storageState() === "blocked") return w0Banner();
  let projects;
  try {
    projects = await listProjects();
  } catch {
    return storageState() === "blocked" ? w0Banner() : readFailedBanner();
  }
  if (!shouldShowW1(projects, await persisted())) return null;
  const banner = h("div", { class: "banner banner--warn", role: "region", "aria-label": t("w1.title") },
    iconEl("shield", { cls: "banner__icon" }),
    h("div", { class: "banner__text" }, h("strong", {}, t("w1.title")), h("p", {}, t("w1.body"))),
    h("button", { class: "btn btn--secondary btn--compact", type: "button", onclick: async () => {
      if (await backupNow()) banner.remove(); // the backup is the dismissal (R7)
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
  const onGallery = location.hash === "#/gallery"; // a button to the screen you are on is no way out (S9)
  const body = h("div", { class: "dialog__content" },
    h("p", {}, t("w2b.body")),
    h("p", { class: "muted" }, t("w2b.hint")),
    h("div", { class: "dialog__actions" },
      docOrId ? h("button", { class: "btn btn--primary btn--sheet", type: "button", onclick: async () => {
        try {
          const file = typeof docOrId === "string"
            ? await downloadProjectFile(docOrId)
            : { name: downloadDocFile(docOrId), title: docOrId.project.title };
          toast(t("export.done.project", { filename: file.name, title: file.title })); // K6: both
        } catch (err) {
          reportFailure(err);
        }
        s.close();
      } }, iconEl("download"), t("w2b.action")) : null,
      onGallery ? null : h("a", { class: "btn btn--secondary btn--sheet", href: "#/gallery", onclick: () => s.close() }, t("w2b.gallery")),
      h("button", { class: onGallery ? "btn btn--secondary btn--sheet" : "btn btn--tertiary", type: "button", onclick: () => s.close() }, t("w2b.close"))));
  const s = openSheet({ title: t("w2b.title"), body, kind: "dialog" });
  return s;
}
