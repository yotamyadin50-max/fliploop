// Gallery (plan 8): banners, actions (new, import, back up), unlocked starters, projects.
import { h, clear } from "../lib/dom.js";
import { t, tp } from "../lib/i18n.js";
import { makeCanvas } from "../lib/util.js";
import { busyWhile } from "../lib/busy.js";
import { drawStrokes } from "../lib/raster.js";
import { iconEl } from "../ui/icons.js";
import { toast } from "../ui/toast.js";
import { openSheet, confirmDialog } from "../ui/dialog.js";
import { screenHeader } from "./common.js";
import { lightTableSvg } from "./home-art.js";
import { listProjects, duplicateProject, renameProject, deleteProjectWithUndo, TITLE_MAX } from "../store/projects.js";
import { downloadProjectFile, downloadBackup, parseImport, importEntries, estimateImportBytes, ImportError } from "../store/project-file.js";
import { hasRoomFor, isFull } from "../store/storage.js";
import { STARTERS, getLesson, exampleFrames } from "../data/lessons.js";
import { unlockedStarters } from "../editor/lesson-mode.js";
import { createStarterProject } from "../store/special-projects.js";
import { w1Banner, w2GalleryBanner, showW2b } from "../ui/warnings.js";

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
    const entries = parseImport(await file.text());
    if (!(await hasRoomFor(estimateImportBytes(entries)))) throw new ImportError("tooBig");
    const results = await importEntries(entries);
    const anyCopy = results.some((r) => r.copied);
    const msg = results.length === 1 ? t("import.done.one", { title: results[0].title }) : t("import.done.other", { n: results.length });
    toast(msg, { lines: anyCopy ? [t("import.done.copy")] : [] });
    onDone?.();
  } catch (err) {
    if (err instanceof ImportError && err.code === "tooBig") return showW2b();
    const key = err instanceof ImportError && err.code === "newer" ? "import.error.newer" : "import.error.invalid";
    if (!(err instanceof ImportError)) console.error(err);
    toast(t(key));
  }
}

export async function runBackup() {
  const name = await busyWhile(downloadBackup);
  toast(name ? t("backup.done", { filename: name }) : t("backup.empty"));
}

export class GalleryScreen {
  constructor(section, router) {
    this.section = section;
    this.router = router;
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
          h("button", { class: "btn btn--secondary", type: "button", onclick: () => runBackup() }, iconEl("download"), t("gallery.backup"))),
        this.body));
    await this.refresh();
  }

  async newProject() {
    if (await isFull()) return showW2b();
    location.hash = "#/new";
  }

  async refresh() {
    const projects = await listProjects().catch(() => []);
    if (this.disposed) return;
    clear(this.banners);
    const w1 = await w1Banner();
    const w2 = await w2GalleryBanner();
    if (w1) this.banners.append(w1);
    if (w2) this.banners.append(w2);
    clear(this.body);
    this.body.removeAttribute("aria-busy");
    this.body.removeAttribute("aria-label");
    const unlocked = unlockedStarters();
    if (unlocked.length) {
      this.body.append(h("section", { class: "gallery__section", "aria-labelledby": "starters-h2" },
        h("h2", { id: "starters-h2", class: "h2" }, t("gallery.starters.h2")),
        h("div", { class: "starters" }, STARTERS.filter((s) => unlocked.includes(s.id)).map((s) => this.starterCard(s)))));
    }
    if (!projects.length) {
      this.body.append(h("div", { class: "empty" },
        h("div", { class: "empty__art", html: lightTableSvg({ withPencil: false }) }),
        h("h2", { class: "h2" }, t("gallery.empty.title")),
        h("p", { class: "muted" }, t("gallery.empty.body")),
        h("a", { class: "btn btn--primary", href: "#/new" }, iconEl("pencil"), t("gallery.empty.cta"))));
      return;
    }
    this.body.append(h("section", { class: "gallery__section", "aria-labelledby": "projects-h2" },
      h("h2", { id: "projects-h2", class: "h2" }, t("gallery.projects.h2")),
      h("ul", { class: "grid" }, projects.map((p) => this.projectCard(p)))));
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
    return h("button", { class: "starter", type: "button", "aria-label": t("gallery.starter.aria", { starter: label }), onclick: async () => {
      if (await isFull()) return showW2b();
      const p = await createStarterProject(s);
      location.hash = `#/editor/${p.id}`;
    } }, c, h("span", { class: "starter__name" }, label));
  }

  projectCard(p) {
    const img = h("img", { class: "project-card__thumb", alt: "", width: 160, height: Math.round((160 * p.height) / p.width) });
    if (p.thumbBlob) {
      img.src = URL.createObjectURL(p.thumbBlob);
      img.onload = () => URL.revokeObjectURL(img.src);
    }
    const kind = p.kind === "lesson" ? t("common.kind.lesson") : p.kind === "challenge" ? t("common.kind.challenge") : null;
    const menuBtn = h("button", { class: "icon-btn project-card__menu", type: "button", "aria-label": t("gallery.card.menu.aria", { title: p.title }),
      onclick: (e) => this.openMenu(p, e.currentTarget) }, iconEl("menu"));
    return h("li", { class: "project-card" },
      h("a", { class: "project-card__open", href: `#/editor/${p.id}` },
        h("span", { class: "project-card__film", "aria-hidden": "true" }),
        img,
        h("span", { class: "project-card__title" }, p.title)),
      h("div", { class: "project-card__meta" },
        h("span", { class: "muted num-mix" }, tp("common.frames", p.frameOrder.length)),
        kind ? h("span", { class: "chip chip--outline" }, kind) : null,
        menuBtn));
  }

  openMenu(p, anchor) {
    const item = (iconName, label, fn, danger = false) => h("button", { class: "menu-item" + (danger ? " menu-item--danger" : ""), type: "button",
      onclick: () => { s.close(); fn(); } }, iconEl(iconName), h("span", {}, label));
    const s = openSheet({
      title: p.title,
      anchor,
      owner: this,
      body: h("div", { class: "frame-menu" },
        item("pencil", t("gallery.menu.open"), () => { location.hash = `#/editor/${p.id}`; }),
        item("duplicate", t("gallery.menu.duplicate"), () => this.duplicate(p)),
        item("file", t("gallery.menu.rename"), () => this.rename(p)),
        item("download", t("gallery.menu.download"), async () => {
          const name = await downloadProjectFile(p.id);
          toast(t("export.done.project", { filename: name }));
        }),
        item("trash", t("gallery.menu.delete"), () => this.remove(p), true)),
    });
  }

  async duplicate(p) {
    if (await isFull()) return showW2b(p.id);
    const copy = await duplicateProject(p.id);
    toast(t("gallery.duplicate.done", { title: copy.title }), { lines: p.kind !== "free" ? [t("gallery.duplicate.freeNote")] : [] });
    this.refresh();
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
      await renameProject(p.id, input.value);
      s.close();
      this.refresh();
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
    if (p.kind !== "free") body.push(t("delete.stampNote"));
    const ok = await confirmDialog({ title: t("delete.title", { title: p.title }), body, confirmLabel: t("delete.confirm"), cancelLabel: t("delete.cancel"), destructive: true, owner: this });
    if (!ok || this.disposed) return;
    const undo = await deleteProjectWithUndo(p.id);
    this.refresh();
    toast(t("delete.done", { title: p.title }), { timerMs: 5000, action: { label: t("common.undo"), onClick: async () => { await undo(); this.refresh(); } } });
  }

  unmount() {
    this.disposed = true;
  }
}
