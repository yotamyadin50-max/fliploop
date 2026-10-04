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
import { closeAllSheets, sheetsOpen, closeTopSheet } from "./ui/dialog.js";
import { emit } from "./lib/bus.js";
import { registerServiceWorker, swVersion, takeResume } from "./pwa.js";
import { applyRescues, isRescueKey } from "./store/rescue.js";
import { storageState } from "./store/db.js";
import { purgeUntouched } from "./store/projects.js";
import { renameOldLessonTitles } from "./store/special-projects.js";
import { on } from "./lib/bus.js";

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

const hashNow = () => location.hash || "#/";
const sameParams = (a, b) => JSON.stringify(a) === JSON.stringify(b);

class Router {
  constructor(main) {
    this.main = main;
    this.current = null; // { name, params, screen, section }
    this.queue = Promise.resolve();
    this.previous = null;
    this.pending = 0; // navigations queued or running
    this.arrived = false; // a screen was mounted since the last "route" event
    this.resume = null; // { y, view } from before an update reload, for the first screen only
    // History rules (fix round R29, R30). Every in-app history entry carries, in history.state,
    // its index (i), the hash it was opened from (from) and that entry's own origin (from2).
    // A reload keeps the state, so the rules survive an update reload.
    if (!Number.isInteger(history.state?.i)) history.replaceState({ i: 0, from: null, from2: null }, "", location.href);
    this.entry = history.state; // state of the entry on screen
    this.hash = hashNow(); // hash of the entry on screen
    this.expect = null; // the hash a Back issued by the router itself must land on
    // A link click fires popstate and hashchange for one move; the second call is a no-op.
    addEventListener("hashchange", () => this.onHistory());
    addEventListener("popstate", () => this.onHistory());
    document.addEventListener("click", (e) => this.onBackClick(e));
    this.vt = null; // the view transition that is running, if any
    this.press = null; // the last pointerdown: where and when
    addEventListener("pointerdown", (e) => this.onPress(e), true);
  }

  /**
   * While a view transition runs, the browser sends every pointer event to the root element,
   * so a press in the first 0.3 s on a new screen reached nothing. The screen that just
   * arrived may take such a press itself (the Editor's canvas does: the first stroke lands).
   * The second press of a double click on whatever opened the screen is not handed over:
   * it would leave a dot on the drawing.
   */
  onPress(e) {
    const last = this.press;
    this.press = { x: e.clientX, y: e.clientY, t: e.timeStamp };
    if (!this.vt || e.target !== document.documentElement) return;
    if (last && e.timeStamp - last.t < 500 && Math.hypot(e.clientX - last.x, e.clientY - last.y) < 24) return;
    this.current?.screen.earlyPointer?.(e, this.vt);
  }

  /** True while a route change is queued or running (a screen may be saving or loading). */
  get busy() {
    return this.pending > 0;
  }

  setTitle(screen) {
    document.title = screen ? t("meta.title.pattern", { screen }) : t("meta.title.home");
  }

  onHistory() {
    const hash = hashNow();
    const state = history.state;
    let move;
    if (Number.isInteger(state?.i)) {
      if (state.i === this.entry.i && hash === this.hash) return; // already handled
      move = state.i < this.entry.i ? "back" : state.i > this.entry.i ? "forward" : "same";
    } else {
      // A new entry (a link, or location.hash = ...): record where it was opened from.
      history.replaceState({ i: this.entry.i + 1, from: this.hash, from2: this.entry.from }, "", location.href);
      move = "push";
    }
    this.entry = history.state;
    this.hash = hash;
    const expect = this.expect;
    this.expect = null;
    if (move === "back" && !expect && sheetsOpen()) {
      // R30: Back with a sheet open closes that sheet and the screen stays. The return to the
      // entry we just left arrives as a navigation to the route already on screen (a no-op).
      closeTopSheet();
      history.forward();
      return;
    }
    // A stale origin (the entry behind was replaced since): still land on the parent.
    if (expect && hash !== expect) return void this.replace(expect);
    this.go();
  }

  /** Replaces the entry on screen and keeps its place in history (index and origin). */
  replace(hash) {
    history.replaceState(history.state, "", hash);
    this.hash = hashNow();
    return this.go();
  }

  /** R29: an in-app Back link is "up" and never makes history longer. */
  up(parent) {
    const { i, from, from2 } = this.entry;
    if (i > 0 && from === parent) {
      this.expect = parent;
      history.back();
    } else if (i > 1 && from2 === parent && from?.startsWith(`${parent}/`)) {
      // Print was opened from the Export overlay of this Editor: step over the overlay too,
      // so a system Back after "לציור" reopens neither Print nor the overlay.
      this.expect = parent;
      history.go(-2);
    } else {
      this.replace(parent);
    }
  }

  onBackClick(e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const parent = e.target.closest?.("a.back")?.getAttribute("href");
    if (!parent?.startsWith("#")) return;
    e.preventDefault();
    this.up(parent);
  }

  /** Leaves the export overlay: back in history when it was opened in-app, else replace. */
  closeOverlay(hash) {
    if (this.entry.i > 0 && this.entry.from === hash) {
      this.expect = hash;
      history.back();
    } else {
      this.replace(hash);
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
    const route = parseRoute(location.hash);
    if (route.redirect) return void this.replace(route.redirect);
    if (route.name === "new") return this.createNew();
    const cur = this.current;
    if (cur && cur.name === route.name && sameParams(cur.params, route.params)) {
      // Already on screen (a Back that only closed a sheet, a #/new that could not start):
      // nothing to rebuild, and the sheets under the closed one stay.
      this.runAfterNavigate();
      return;
    }
    // Sheets belong to the screen that opened them: close them (as cancel) before any
    // route change, so none survives onto another screen (Critic F1).
    closeAllSheets();
    if (cur && cur.name === "editor" && route.name === "editor" && cur.params.id === route.params.id) {
      cur.params = route.params;
      await cur.screen.update(route.params);
      return;
    }
    if (cur) {
      // The outgoing screen saves BEFORE the view transition starts: a transition pauses
      // rendering, and canvas.toBlob then waits about a second per frame (PERF-P-01).
      // Inert, so no input reaches a screen that is already on its way out.
      cur.section.inert = true;
      try {
        await cur.screen.unmount();
      } catch (err) {
        console.error("Screen could not close cleanly", err);
      }
    }
    const swap = async () => {
      cur?.section.remove();
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
      this.runAfterNavigate();
    };
    if (document.startViewTransition && !reducedMotion() && cur && document.visibilityState === "visible") {
      const vt = document.startViewTransition(swap);
      vt.ready.catch(() => {});
      // onPress() hands a press made during this transition to the new screen. For a finger
      // that needs `touch-action: none` on the root while the Editor arrives (style.css).
      const root = document.documentElement;
      this.vt = vt;
      root.classList.toggle("vt-editor", route.name === "editor");
      vt.finished.catch(() => {}).then(() => {
        if (this.vt !== vt) return; // a newer transition owns the class now
        this.vt = null;
        root.classList.remove("vt-editor");
      });
      await vt.updateCallbackDone;
    } else {
      await swap();
    }
  }

  runAfterNavigate() {
    const after = this.afterNavigate;
    this.afterNavigate = null;
    after?.();
  }

  /** `#/new` is never a screen: its history entry becomes the new project's Editor. */
  async createNew() {
    try {
      if (await isFull()) {
        this.afterNavigate = () => showW2b(); // shown on the Gallery, after its route change
        this.replace("#/gallery");
        return;
      }
      const project = await createProject({});
      this.replace(`#/editor/${project.id}`);
    } catch (err) {
      // R31: never stay on #/new, or the next tap on "אנימציה חדשה" changes nothing.
      console.error("Could not start a new animation", err);
      if (!err?.storage) toast(t("common.error.generic")); // storage errors have their own message (K1)
      const { i, from } = this.entry;
      if (i > 0 && from && from !== "#/new") {
        this.expect = from;
        history.back();
      } else {
        this.replace("#/");
      }
    }
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

/**
 * One message for any storage failure nobody else reported (store/db.js, contract K1): which
 * action it was does not matter, the reason does. Blocked storage and a passing fault read
 * differently.
 */
function watchStorageErrors() {
  let last = 0;
  on("storage-error", () => {
    if (Date.now() - last < 1500) return; // one failed action can fail several reads
    last = Date.now();
    toast(t(storageState() === "blocked" ? "storage.blocked.toast" : "storage.failed.toast"), { id: "storage-error", icon: "warn", warn: true });
  });
}

/**
 * Another tab left its unsaved strokes in a rescue record (it was closed, or hidden, inside
 * the save delay). They go into IndexedDB now, not at the next launch, so whatever this tab
 * saves next is saved on top of them (Gatekeeper note G-01). The Editor follows by itself.
 */
function watchRescues() {
  addEventListener("storage", (e) => {
    if (!isRescueKey(e.key) || !e.newValue) return;
    applyRescues({ waitMs: 30000 }).catch((err) => console.warn("Rescue records were not applied", err));
  });
}

async function boot() {
  captureErrors();
  watchStorageErrors();
  document.documentElement.classList.replace("no-js", "js");
  const main = document.getElementById("main");
  main.replaceChildren();
  let storageUp = true;
  try {
    await openDb(); // answers within 3 s, or the app starts in the "cannot save here" state (R4)
  } catch (err) {
    storageUp = false;
    if (err && typeof err === "object") err.handled = true; // the storage banner on Home is the message
    console.error("IndexedDB unavailable", err);
  }
  // Work that an unload cut off (store/rescue.js) goes back into IndexedDB before any screen reads it.
  if (storageUp) watchRescues(); // before the first pass, so a record written during it is not missed
  if (storageUp) await applyRescues().catch((err) => console.warn("Rescue records were not applied", err));
  await loadSettings();
  // Blank projects nobody drew in for a day are removed (R5).
  if (storageUp) await purgeUntouched().catch((err) => { if (err && typeof err === "object") err.handled = true; });
  // A lesson that was renamed: its project made before the rename gets the new default title.
  if (storageUp) await renameOldLessonTitles().catch((err) => { if (err && typeof err === "object") err.handled = true; });
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
  }).catch((err) => console.warn("Service worker setup failed", err));
}

boot();
