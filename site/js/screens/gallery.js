// Gallery (plan 8): banners, actions (new, import, back up), unlocked starters, projects.
// Fix round 2026-10: a failed read is its own state with a retry (never the empty Gallery);
// the list follows the bus event "projects-changed" (import, duplicate, delete, undo, rename),
// so an undo pressed after leaving and coming back shows on whichever Gallery is on screen.
import { h, clear } from "../lib/dom.js";
import { t, tp } from "../lib/i18n.js";
import { on } from "../lib/bus.js";
import { makeCanvas } from "../lib/util.js";
import { busyWhile } from "../lib/busy.js";
import { drawStrokes } from "../lib/raster.js";
import { iconEl } from "../ui/icons.js";
import { toast } from "../ui/toast.js";
import { openSheet, confirmDialog } from "../ui/dialog.js";
import { screenHeader } from "./common.js";
import { lightTableSvg } from "./home-art.js";
import { listProjects, duplicateProject, renameProject, deleteProjectWithUndo, TITLE_MAX } from "../store/projects.js";
import { downloadProjectFile, parseImport, importEntries, estimateImportBytes, ImportError } from "../store/project-file.js";
import { hasRoomFor, isFull } from "../store/storage.js";
import { openDb } from "../store/db.js";
import { getProgress, loadSettings } from "../store/settings.js";
import { STARTERS, getLesson, exampleFrames } from "../data/lessons.js";
import { unlockedStarters } from "../editor/lesson-mode.js";
import { createStarterProject } from "../store/special-projects.js";
import { w1Banner, w2GalleryBanner, showW2b, backupNow, reportFailure, storageStateBanner } from "../ui/warnings.js";

export function importButton(label, onDone, cls = "btn btn--secondary") {
  const input = h("input", { type: "file", accept: ".json,application/json", class: "sr-only", tabindex: "-1", "aria-hidden": "true" });
  const btn = h("button", { class: cls, type: "button", "aria-label": t("gallery.import.aria"), onclick: () => input.click() }, iconEl("upload"), label);
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    input.value = "";
    if (file) await busyWhile(() => runImport(file, onDone)); // an update reload waits for it
  });
  return h("span", { class: "import-wrap" }, btn, input);
}

export async function runImport(file, onDone) {
  try {
    const { entries, bad, progress } = parseImport(await file.text());
    if (!(await hasRoomFor(estimateImportBytes(entries)))) throw new ImportError("tooBig");
    const summary = await importEntries(entries, { progress });
    reportImport({ ...summary, bad });
    onDone?.();
  } catch (err) {
    if (err instanceof ImportError) {
      if (err.code === "tooBig") return showW2b();
      toast(t(err.code === "newer" ? "import.error.newer" : "import.error.invalid"));
      return;
    }
    reportFailure(err);
  }
}

/** One truthful toast for an import: what came in, what was already here, what could not be read (R6). */
function reportImport(r) {
  const n = r.titles.length;
  const oneFile = r.total === 1 && !r.bad;
  const notes = [];
  if (r.copies) notes.push(oneFile ? t("import.done.copy") : tp("import.copies", r.copies));
  if (r.clashes) notes.push(tp("import.clash", r.clashes));
  if (r.bad + r.unreadable) notes.push(tp("import.bad", r.bad + r.unreadable));
  if (r.blankFrames) notes.push(tp("import.frames.blank", r.blankFrames));
  if (r.stopped) {
    toast(t(r.stopped === "quota" ? "import.partial" : "import.stopped", { n, total: r.total }), { lines: notes });
    if (r.stopped === "quota") showW2b();
    return;
  }
  if (!n) {
    if (r.unreadable && !r.same && !r.stamps) return void toast(tp("import.error.unreadable", r.lostFrames));
    if (r.stamps && !r.same) return void toast(t("import.stamps"), { lines: notes });
    if (r.stamps) notes.push(t("import.stamps"));
    return void toast(t(r.total === 1 ? "import.none.one" : "import.none.other"), { lines: notes });
  }
  if (r.same) notes.unshift(tp("import.skipped", r.same));
  if (r.stamps) notes.push(t("import.stamps"));
  toast(n === 1 ? t("import.done.one", { title: r.titles[0] }) : t("import.done.other", { n }), { lines: notes });
}

/** The full backup, with its own message for success, nothing to back up, and failure. */
export async function runBackup() {
  return busyWhile(backupNow);
}

export class GalleryScreen {
  constructor(section, router) {
    this.section = section;
    this.router = router;
    this.refreshToken = 0;
  }

  async mount() {
    this.router.setTitle(t("meta.title.gallery"));
    clear(this.section);
    this.banners = h("div", { class: "banners" });
    this.body = h("div", { class: "gallery__body", "aria-busy": "true", "aria-label": t("gallery.loading.aria") },
      h("div", { class: "grid" }, Array.from({ length: 4 }, () => h("div", { class: "project-card project-card--skeleton" }))));
    this.section.append(
      screenHeader("#/", "common.back.home", "common.back.home.aria"),
      h("div", { class: "page gallery" },
        h("h1", { class: "screen-h1", tabindex: "-1" }, t("gallery.h1")),
        this.banners,
        h("div", { class: "gallery__actions" },
          h("button", { class: "btn btn--primary", type: "button", onclick: () => this.newProject() }, iconEl("pencil"), t("gallery.cta.new")),
          importButton(t("gallery.import"), () => this.refresh()),
          h("button", { class: "btn btn--secondary", type: "button", onclick: async () => { await runBackup(); this.refresh(); } }, iconEl("download"), t("gallery.backup"))),
        this.body));
    this.off = on("projects-changed", () => this.refresh());
    await this.refresh();
  }

  async newProject() {
    if (await isFull()) return showW2b();
    location.hash = "#/new";
  }

  async refresh() {
    // Overlapping calls (an import that finishes during a delete): only the newest one renders.
    const token = ++this.refreshToken;
    let projects = null;
    try {
      projects = await listProjects();
    } catch { /* shown below as its own state */ }
    // With a failed read the state below is the message; only blocked storage adds its banner.
    const w1 = projects ? await w1Banner() : storageStateBanner();
    const w2 = projects ? await w2GalleryBanner() : null;
    if (this.disposed || token !== this.refreshToken) return;
    clear(this.banners);
    if (w1) this.banners.append(w1);
    if (w2) this.banners.append(w2);
    clear(this.body);
    this.body.removeAttribute("aria-busy");
    this.body.removeAttribute("aria-label");
    if (!projects) return this.renderReadError();
    const unlocked = unlockedStarters();
    if (unlocked.length) {
      this.body.append(h("section", { class: "gallery__section", "aria-labelledby": "starters-h2" },
        h("h2", { id: "starters-h2", class: "h2" }, t("gallery.starters.h2")),
        h("div", { class: "starters" }, STARTERS.filter((s) => unlocked.includes(s.id)).map((s) => this.starterCard(s)))));
    }
    if (!projects.length) {
      // One primary action per screen: "אנימציה חדשה" is in the action row above (DS-08).
      this.body.append(h("div", { class: "empty" },
        h("div", { class: "empty__art", html: lightTableSvg({ withPencil: false }) }),
        h("h2", { class: "h2" }, t("gallery.empty.title")),
        h("p", { class: "muted" }, t("gallery.empty.body"))));
      return;
    }
    this.body.append(h("section", { class: "gallery__section", "aria-labelledby": "projects-h2" },
      h("h2", { id: "projects-h2", class: "h2" }, t("gallery.projects.h2")),
      h("ul", { class: "grid" }, projects.map((p) => this.projectCard(p)))));
  }

  /** The work could not be read. Nothing is said about "no work yet", and nothing invites starting over. */
  renderReadError() {
    const retry = h("button", { class: "btn btn--secondary", type: "button", onclick: async () => {
      retry.disabled = true;
      // A new connection, and the settings and stamps that the failed launch could not read.
      await openDb({ retry: true }).then(() => loadSettings(), (err) => { if (err && typeof err === "object") err.handled = true; });
      this.refresh();
    } }, t("storage.readFailed.retry"));
    this.body.append(h("div", { class: "empty storage-error", role: "alert" },
      iconEl("warn", { size: 32 }),
      h("h2", { class: "h2" }, t("storage.readFailed.title")),
      h("p", { class: "muted" }, t("storage.readFailed.body")),
      retry));
  }

  starterCard(s) {
    const lesson = getLesson(s.lesson);
    const frame = exampleFrames(lesson)[0];
    const c = makeCanvas(240, 180);
    const g = c.getContext("2d");
    g.fillStyle = "#FFFFFF";
    g.fillRect(0, 0, 240, 180);
    drawStrokes(g, frame.strokes, 0.5);
    c.className = "starter__art";
    c.setAttribute("aria-hidden", "true");
    const label = t(s.labelKey);
    const card = h("button", { class: "starter", type: "button", "aria-label": t("gallery.starter.aria", { starter: label }), onclick: () => this.startFrom(s, card) },
      c, h("span", { class: "starter__name" }, label));
    return card;
  }

  /** One project per tap: while a starter is being made, every starter card is off and this one shows busy. */
  async startFrom(s, card) {
    if (this.starting) return;
    this.starting = true;
    const all = [...this.section.querySelectorAll(".starter")];
    all.forEach((b) => { b.disabled = true; });
    card.setAttribute("aria-busy", "true");
    let opened = false;
    try {
      if (await isFull()) return void showW2b();
      const p = await busyWhile(() => createStarterProject(s));
      opened = true;
      location.hash = `#/editor/${p.id}`;
    } catch (err) {
      reportFailure(err);
    } finally {
      if (!opened) { // the Editor is not opening: the cards work again
        this.starting = false;
        all.forEach((b) => { b.disabled = false; });
        card.removeAttribute("aria-busy");
      }
    }
  }

  projectCard(p) {
    const img = h("img", { class: "project-card__thumb", alt: "", width: 160, height: Math.round((160 * p.height) / p.width) });
    if (p.thumbBlob) {
      const url = URL.createObjectURL(p.thumbBlob);
      img.onload = img.onerror = () => URL.revokeObjectURL(url); // also when it cannot be decoded
      img.src = url;
    }
    const kind = p.kind === "lesson" ? t("common.kind.lesson") : p.kind === "challenge" ? t("common.kind.challenge") : null;
    const menuBtn = h("button", { class: "icon-btn project-card__menu", type: "button", "aria-label": t("gallery.card.menu.aria", { title: p.title }),
      onclick: (e) => this.openMenu(p, e.currentTarget) }, iconEl("more"));
    const card = h("li", { class: "project-card" },
      h("a", { class: "project-card__open", href: `#/editor/${p.id}`, onclick: () => card.classList.add("is-opening") }, // K10
        h("span", { class: "project-card__film", "aria-hidden": "true" }),
        img,
        h("span", { class: "project-card__title" }, p.title)),
      h("div", { class: "project-card__meta" },
        h("span", { class: "muted num-mix" }, tp("common.frames", p.frameOrder.length)),
        kind ? h("span", { class: "chip chip--outline" }, kind) : null,
        menuBtn));
    return card;
  }

  openMenu(p, anchor) {
    const item = (iconName, label, fn, danger = false) => h("button", { class: "menu-item" + (danger ? " menu-item--danger" : ""), type: "button",
      onclick: () => { s.close(); fn(); } }, iconEl(iconName), h("span", {}, label));
    const s = openSheet({
      title: p.title,
      anchor,
      owner: this,
      body: h("div", { class: "frame-menu" },
        item("open", t("gallery.menu.open"), () => { location.hash = `#/editor/${p.id}`; }),
        item("duplicate", t("gallery.menu.duplicate"), () => this.duplicate(p)),
        item("rename", t("gallery.menu.rename"), () => this.rename(p)),
        item("download", t("gallery.menu.download"), () => this.download(p)),
        item("trash", t("gallery.menu.delete"), () => this.remove(p), true)),
    });
  }

  async download(p) {
    try {
      const { name, title } = await downloadProjectFile(p.id);
      toast(t("export.done.project", { filename: name, title })); // K6: both, the string picks one
    } catch (err) {
      reportFailure(err);
    }
  }

  async duplicate(p) {
    try {
      if (await isFull()) return void showW2b(p.id);
      const copy = await duplicateProject(p.id);
      if (!copy) return;
      toast(t("gallery.duplicate.done", { title: copy.title }), { lines: p.kind !== "free" ? [t("gallery.duplicate.freeNote")] : [] });
    } catch (err) {
      reportFailure(err);
    }
  }

  rename(p) {
    const error = h("p", { class: "field__error", id: "rename-err", role: "alert" });
    const input = h("input", { class: "input", type: "text", value: p.title, maxlength: TITLE_MAX, id: "rename-input", "aria-describedby": "rename-hint rename-err", autocomplete: "off" });
    const save = async () => {
      if (!input.value.trim()) {
        error.textContent = t("rename.error.empty");
        input.setAttribute("aria-invalid", "true");
        input.focus();
        return;
      }
      try {
        await renameProject(p.id, input.value);
      } catch (err) {
        reportFailure(err); // the dialog stays open with the name typed in
        return;
      }
      s.close();
    };
    input.addEventListener("input", () => { if (input.value.trim()) { error.textContent = ""; input.removeAttribute("aria-invalid"); } });
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") save(); });
    const s = openSheet({
      title: t("rename.title"),
      kind: "dialog",
      owner: this,
      body: h("div", { class: "dialog__content" },
        h("label", { class: "field__label", for: "rename-input" }, t("rename.label")),
        input,
        h("p", { class: "hint", id: "rename-hint" }, t("rename.hint")),
        error,
        h("div", { class: "dialog__actions" },
          h("button", { class: "btn btn--primary btn--sheet", type: "button", onclick: save }, t("rename.save")),
          h("button", { class: "btn btn--secondary btn--sheet", type: "button", onclick: () => s.close() }, t("rename.cancel")))),
    });
    setTimeout(() => input.select(), 50);
  }

  async remove(p) {
    const n = p.frameOrder.length;
    const body = [n === 1 ? t("delete.body.one") : t("delete.body.other", { n })];
    // "The stamp stays" only when there is a stamp (G-09).
    const progress = getProgress();
    const stamped = p.kind === "lesson" ? !!progress.lessonsDone[p.lessonId]
      : p.kind === "challenge" ? progress.challengeWeeks.includes(p.challengeWeek) : false;
    if (stamped) body.push(t("delete.stampNote"));
    const ok = await confirmDialog({ title: t("delete.title", { title: p.title }), body, confirmLabel: t("delete.confirm"), cancelLabel: t("delete.cancel"), destructive: true, owner: this });
    if (!ok || this.disposed) return;
    let undo;
    try {
      undo = await deleteProjectWithUndo(p.id);
    } catch (err) {
      return void reportFailure(err);
    }
    // A global toast: it does not belong to this screen object. The undo writes the project back
    // and "projects-changed" refreshes whichever Gallery is on screen by then (G-03, K13).
    toast(t("delete.done", { title: p.title }), {
      timerMs: 5000,
      returnFocus: () => document.querySelector(`.project-card__open[href="#/editor/${p.id}"]`) || document.querySelector('[data-screen="gallery"] h1'), // K3
      action: { label: t("common.undo"), onClick: async () => {
        try {
          const { asCopy } = await undo();
          if (asCopy) toast(t("delete.restoredAsCopy"));
        } catch (err) {
          reportFailure(err);
        }
      } },
    });
  }

  unmount() {
    this.disposed = true;
    this.off?.();
  }
}
