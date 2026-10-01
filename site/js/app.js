// FlipLoop app shell: hash router (plan b), screen lifecycle, titles, view transitions,
// error capture. Hub-and-spoke: every screen has one Back control to its parent.
import { t } from "./lib/i18n.js";
import { h } from "./lib/dom.js";
import { reducedMotion } from "./lib/util.js";
import { openDb } from "./store/db.js";
import { loadSettings } from "./store/settings.js";
import { createProject } from "./store/projects.js";
import { refreshPersisted, checkNearlyFull, isFull } from "./store/storage.js";
import { HomeScreen } from "./screens/home.js";
import { GalleryScreen } from "./screens/gallery.js";
import { SettingsScreen } from "./screens/settings.js";
import { LessonsScreen, LessonScreen } from "./screens/lessons.js";
import { ChallengeScreen } from "./screens/challenge.js";
import { PrintScreen } from "./screens/print.js";
import { EditorScreen } from "./editor/editor.js";
import { showW2b } from "./ui/warnings.js";
import { toast } from "./ui/toast.js";
import { closeAllSheets } from "./ui/dialog.js";
import { emit } from "./lib/bus.js";
import { registerServiceWorker, swVersion, takeResume } from "./pwa.js";

const SCREENS = {
  home: HomeScreen,
  gallery: GalleryScreen,
  settings: SettingsScreen,
  lessons: LessonsScreen,
  lesson: LessonScreen,
  challenge: ChallengeScreen,
  print: PrintScreen,
  editor: EditorScreen,
};

export function parseRoute(hash) {
  const path = hash.replace(/^#/, "") || "/";
  let m;
  if (path === "/") return { name: "home", params: {} };
  if (path === "/new") return { name: "new", params: {} };
  if ((m = path.match(/^\/editor\/([\w-]+)(\/export)?$/))) return { name: "editor", params: { id: m[1], overlay: m[2] ? "export" : null } };
  if ((m = path.match(/^\/print\/([\w-]+)$/))) return { name: "print", params: { id: m[1] } };
  if (path === "/lessons") return { name: "lessons", params: {} };
  if ((m = path.match(/^\/lesson\/(\d+)$/))) {
    const n = Number(m[1]);
    return n >= 1 && n <= 12 ? { name: "lesson", params: { n } } : { redirect: "#/lessons" };
  }
  if (path === "/challenge") return { name: "challenge", params: {} };
  if (path === "/gallery") return { name: "gallery", params: {} };
  if (path === "/settings") return { name: "settings", params: {} };
  return { redirect: "#/" };
}

class Router {
  constructor(main) {
    this.main = main;
    this.current = null; // { name, params, screen, section }
    this.queue = Promise.resolve();
    this.previous = null;
    this.pending = 0; // navigations queued or running
    this.arrived = false; // a screen was mounted since the last "route" event
    this.resume = null; // { y, view } from before an update reload, for the first screen only
    addEventListener("hashchange", () => this.go());
  }

  /** True while a route change is queued or running (a screen may be saving or loading). */
  get busy() {
    return this.pending > 0;
  }

  setTitle(screen) {
    document.title = screen ? t("meta.title.pattern", { screen }) : t("meta.title.home");
  }

  /** Leaves the export overlay: back in history when it was opened in-app, else replace. */
  closeOverlay(hash) {
    if (this.overlayFromEditor) {
      this.overlayFromEditor = false;
      history.back();
    } else {
      location.replace(hash);
    }
  }

  go() {
    this.pending++;
    this.queue = this.queue.then(() => this.navigate()).catch((err) => {
      console.error("Navigation failed", err);
      toast(t("common.error.generic"));
    }).then(() => {
      this.pending--;
      if (this.pending || !this.arrived) return;
      // Settled on a freshly mounted screen: a safe moment for a waiting update (js/pwa.js).
      this.arrived = false;
      emit("route", this.current?.name);
    });
    return this.queue;
  }

  async navigate() {
    // Sheets belong to the screen that opened them: close them (as cancel) before any
    // route change, so none survives onto another screen (Critic F1).
    closeAllSheets();
    const route = parseRoute(location.hash);
    if (route.redirect) return location.replace(route.redirect);
    if (route.name === "new") return this.createNew();
    const cur = this.current;
    if (cur && cur.name === "editor" && route.name === "editor" && cur.params.id === route.params.id) {
      this.overlayFromEditor = route.params.overlay === "export" && !cur.params.overlay;
      cur.params = route.params;
      await cur.screen.update(route.params);
      return;
    }
    const swap = async () => {
      if (cur) {
        await cur.screen.unmount();
        cur.section.remove();
      }
      const section = h("section", { class: `screen screen--${route.name}`, "data-screen": route.name });
      this.main.append(section);
      const screen = new SCREENS[route.name](section, this);
      this.current = { name: route.name, params: route.params, screen, section };
      scrollTo(0, 0);
      const resume = this.resume;
      this.resume = null;
      await screen.mount(route.params, resume?.view ?? null);
      if (resume?.y) restoreScroll(resume.y);
      this.arrived = true;
      if (route.name !== "editor") section.querySelector("h1")?.focus({ preventScroll: true });
      const after = this.afterNavigate;
      this.afterNavigate = null;
      after?.();
    };
    if (document.startViewTransition && !reducedMotion() && cur && document.visibilityState === "visible") {
      const vt = document.startViewTransition(swap);
      vt.ready.catch(() => {});
      vt.finished.catch(() => {});
      await vt.updateCallbackDone;
    } else {
      await swap();
    }
  }

  async createNew() {
    if (await isFull()) {
      this.afterNavigate = () => showW2b(); // shown on the Gallery, after its route change
      location.replace("#/gallery");
      return;
    }
    const project = await createProject({});
    location.replace(`#/editor/${project.id}`);
  }
}

/** Back to where the user was before an update reload. A screen that fills in late (print
 *  previews) gets a few seconds to grow tall enough; any input from the user ends it. */
function restoreScroll(y) {
  const until = Date.now() + 8000;
  let done = false;
  const stop = () => { done = true; };
  for (const type of ["pointerdown", "wheel", "keydown", "touchstart"]) addEventListener(type, stop, { once: true, capture: true, passive: true });
  const tick = () => {
    if (done) return;
    scrollTo(0, y);
    if (Math.abs(scrollY - y) > 2 && Date.now() < until) setTimeout(tick, 150);
  };
  tick();
}

function captureErrors() {
  const log = (entry) => {
    try {
      const key = "fliploop-errors";
      const list = JSON.parse(localStorage.getItem(key) || "[]");
      list.push({ at: new Date().toISOString(), ...entry });
      localStorage.setItem(key, JSON.stringify(list.slice(-20)));
    } catch { /* storage unavailable: nothing else to do */ }
  };
  addEventListener("error", (e) => log({ message: String(e.message), source: e.filename, line: e.lineno }));
  addEventListener("unhandledrejection", (e) => log({ message: String(e.reason?.message || e.reason) }));
}

async function boot() {
  captureErrors();
  document.documentElement.classList.replace("no-js", "js");
  const main = document.getElementById("main");
  main.replaceChildren();
  try {
    await openDb();
  } catch (err) {
    console.error("IndexedDB unavailable", err);
  }
  await loadSettings();
  refreshPersisted();
  checkNearlyFull({ force: true });
  const router = new Router(main);
  router.resume = takeResume();
  window.__fliploop = {
    router,
    version: 1,
    swVersion,
    // Scripted export check for QA (Chrome and Playwright WebKit); loaded only when called.
    selfTest: async (options) => (await import("./dev/selftest.js")).run(options),
  };
  await router.go();
  // After the first screen is up, so the worker's precache never competes with first paint.
  // The updater applies a new version by itself, but only when the current screen says a
  // reload costs nothing; it carries the screen's view state across that reload.
  const screen = () => router.current?.screen;
  registerServiceWorker({
    screen: () => router.current?.name ?? null,
    busy: () => router.busy || !!screen()?.isBusy?.(),
    view: () => screen()?.viewState?.() ?? null,
    flush: () => screen()?.flush?.() ?? true,
  });
}

boot();
