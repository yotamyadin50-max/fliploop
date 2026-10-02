// Installable app (PWA pass): service worker registration, the update flow, and the
// install affordance state shared by Home and Settings.
//
// Update flow (Auto-update pass): a new version installs in the background and waits. It is
// then applied WITHOUT the user doing anything, at the first safe moment: SKIP_WAITING, one
// reload, same route, same frame. A moment is safe when the app is visible and nothing would
// be lost or cut short: everything is saved, no stroke, no playback, no export or print
// render, no open sheet or dialog, no file picker open.
//   - arriving on a screen, or launching: applied at once (nothing has been started yet)
//   - coming back to the foreground, or sitting still: after a pause without input
//     (20 s in the Editor or with a text field focused, 3 s elsewhere)
// The toast ("לרענן") is the fallback when no safe moment comes (e.g. continuous drawing).
// It appears after 30 s and stays until tapped; tapping it saves first, then reloads.
// At most one automatic reload per version in a session (sessionStorage), so a version that
// fails to take over can never cause a reload loop: after that only the toast is offered.
import { t } from "./lib/i18n.js";
import { emit, on } from "./lib/bus.js";
import { isHeld } from "./lib/busy.js";
import { toast } from "./ui/toast.js";

let deferredPrompt = null;
let interacted = false;

// Captured as early as possible: the event can fire right after the module graph runs.
addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault(); // our own button instead of the mini-infobar
  deferredPrompt = e;
  emit("install");
});
addEventListener("appinstalled", () => {
  deferredPrompt = null;
  emit("install");
  toast(t("install.done"));
});
for (const type of ["pointerdown", "keydown"]) addEventListener(type, () => { interacted = true; }, { once: true, capture: true });

const standaloneQuery = matchMedia("(display-mode: standalone), (display-mode: fullscreen), (display-mode: minimal-ui), (display-mode: window-controls-overlay)");
standaloneQuery.addEventListener?.("change", () => emit("install"));

export function isInstalled() {
  return standaloneQuery.matches || navigator.standalone === true;
}

export function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/** "installed" | "prompt" (our button works) | "ios" (Share hint) | "menu" (browser menu hint). */
export function installState() {
  if (isInstalled()) return "installed";
  if (deferredPrompt) return "prompt";
  if (isIOS()) return "ios";
  return "menu";
}

export function onInstallChange(fn) {
  return on("install", fn);
}

export async function promptInstall() {
  const prompt = deferredPrompt;
  if (!prompt) return;
  deferredPrompt = null; // a prompt event can be used once
  emit("install");
  try {
    await prompt.prompt();
    await prompt.userChoice;
  } catch { /* dismissed or unsupported: the menu hint stays available */ }
}

// ---------- updates ----------
const CHECK_EVERY = 5 * 60 * 1000; // an open app asks the server for a new version this often
const EDITOR_IDLE = 20 * 1000; // Editor, or a focused text field: this long without input, and everything saved
const BROWSE_IDLE = 3 * 1000; // other screens: a short pause, so no tap lands on a reloading page
const TOAST_AFTER = 30 * 1000; // no safe moment by then: offer the update by hand as well
const AUTO_KEY = "fliploop-auto-update"; // sessionStorage: the version this session already reloaded for
const RESUME_KEY = "fliploop-resume"; // sessionStorage: where the user was, carried across the reload

// What the app shell tells the updater (set by registerServiceWorker).
let host = { screen: () => null, busy: () => false, view: () => null, flush: () => true };
let reg = null;
let pending = null; // a new version is ready: { stale, version, arrival, at, shown }
let request = null; // { auto, at } from SKIP_WAITING until the new worker takes control
let ticker = 0;
let toastTimer = 0;
let lastCheck = 0;
let lastInput = Date.now();
let pickerOpen = false;
const pointers = new Set();

const isFileInput = (e) => e.target instanceof HTMLInputElement && e.target.type === "file";
const noteInput = () => { lastInput = Date.now(); };
const quiet = { capture: true, passive: true };
for (const type of ["pointermove", "keydown", "wheel", "scroll", "input"]) addEventListener(type, noteInput, quiet);
addEventListener("pointerdown", (e) => { pointers.add(e.pointerId); pickerOpen = false; noteInput(); }, quiet);
for (const type of ["pointerup", "pointercancel"]) addEventListener(type, (e) => { pointers.delete(e.pointerId); noteInput(); }, quiet);
// A native file picker is open from the click until "change" or "cancel" (or the next touch).
addEventListener("click", (e) => { if (isFileInput(e)) pickerOpen = true; }, true);
for (const type of ["change", "cancel"]) addEventListener(type, (e) => { if (isFileInput(e)) pickerOpen = false; }, true);
addEventListener("blur", () => pointers.clear());

function typing() {
  const el = document.activeElement;
  if (!el) return false;
  if (el.isContentEditable || el.tagName === "TEXTAREA" || el.tagName === "SELECT") return true;
  return el.tagName === "INPUT" && !["checkbox", "radio", "range", "button"].includes(el.type);
}

/** Nothing on screen that a reload would lose or cut short. */
function safe(trigger) {
  if (document.visibilityState !== "visible") return false;
  if (pointers.size || pickerOpen || isHeld() || document.querySelector("dialog[open]")) return false;
  if (host.busy()) return false;
  if (trigger === "arrival") return true;
  // A focused text field is not a blocker by itself (drawing leaves the title field focused):
  // every keystroke counts as input, so it only asks for the longer pause.
  return Date.now() - lastInput >= (host.screen() === "editor" || typing() ? EDITOR_IDLE : BROWSE_IDLE);
}

function versionOf(worker) {
  if (!worker) return Promise.resolve(null);
  return new Promise((resolve) => {
    const ch = new MessageChannel();
    ch.port1.onmessage = (e) => resolve(e.data?.version ?? null);
    worker.postMessage({ type: "GET_VERSION" }, [ch.port2]);
    setTimeout(() => resolve(null), 2000);
  });
}

/** True when this session already reloaded by itself for `version` (or cannot remember that it did). */
function autoDone(version) {
  try {
    return sessionStorage.getItem(AUTO_KEY) === String(version);
  } catch {
    return true; // no storage, no loop guard: leave the update to the toast
  }
}

/** A new version is ready. stale: it already controls this page (another tab activated it). */
function found({ stale = false, arrival = false } = {}) {
  const mine = { stale, arrival, at: Date.now(), version: undefined, shown: !!pending?.shown };
  pending = mine;
  clearInterval(ticker);
  if (!mine.shown && !toastTimer) toastTimer = setTimeout(offerUpdate, TOAST_AFTER);
  versionOf(stale ? navigator.serviceWorker.controller : reg.waiting).then((version) => {
    if (pending !== mine) return;
    mine.version = version;
    if (autoDone(version)) return offerUpdate();
    ticker = setInterval(() => attempt("idle"), 2000);
    // Found waiting at launch, before any input: nothing has been started, so go at once.
    attempt(mine.arrival && lastInput <= mine.at ? "arrival" : "idle");
  });
}

function attempt(trigger) {
  if (!pending || request || pending.version === undefined || autoDone(pending.version)) return;
  if (!safe(trigger)) return;
  if (pending.stale) return reloadNow(true);
  const worker = reg.waiting;
  if (!worker) return;
  request = { auto: true, at: Date.now() };
  worker.postMessage({ type: "SKIP_WAITING" });
}

function reloadNow(auto) {
  try {
    if (auto) sessionStorage.setItem(AUTO_KEY, String(pending?.version));
    sessionStorage.setItem(RESUME_KEY, JSON.stringify({ hash: location.hash, y: Math.round(scrollY), view: host.view() }));
  } catch { /* storage unavailable: the route (hash) still survives the reload */ }
  location.reload();
}

function offerUpdate() {
  clearTimeout(toastTimer);
  toastTimer = 0;
  if (!pending || pending.shown) return;
  pending.shown = true;
  toast(t("update.ready"), { id: "update", persistent: true, action: { label: t("update.action"), onClick: applyByHand } });
}

/** The toast's "לרענן": the user asked, so save whatever is unsaved first, then go. */
async function applyByHand() {
  let saved = true;
  try {
    saved = (await host.flush()) !== false;
  } catch {
    saved = false;
  }
  if (!pending) return;
  if (!saved) {
    // The save failed (the Editor is showing its own warning): keep the work, keep the offer.
    pending.shown = false;
    return offerUpdate();
  }
  if (pending.stale || !reg?.waiting) return reloadNow(false);
  request = { auto: false, at: Date.now() };
  reg.waiting.postMessage({ type: "SKIP_WAITING" });
}

/** Asks the server for a new version: at most every 5 minutes, and only while visible. */
export function checkForUpdate({ force = false } = {}) {
  if (!reg) return Promise.resolve(false);
  if (!force && (document.visibilityState !== "visible" || Date.now() - lastCheck < CHECK_EVERY)) return Promise.resolve(false);
  lastCheck = Date.now();
  return reg.update().then(() => true, () => false); // offline: the next check tries again
}

/** The place the user was in before an update reload, once: { y, view } or null. */
export function takeResume() {
  try {
    const raw = sessionStorage.getItem(RESUME_KEY);
    sessionStorage.removeItem(RESUME_KEY);
    const resume = raw ? JSON.parse(raw) : null;
    return resume && resume.hash === location.hash ? resume : null;
  } catch {
    return null;
  }
}

/**
 * app: { screen(): current screen name, busy(): true while a reload would cost something,
 *        view(): screen state to restore after the reload, flush(): saves, resolves false on failure }
 */
export async function registerServiceWorker(app = {}) {
  if (!("serviceWorker" in navigator)) return null;
  host = { ...host, ...app };
  let controlled = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    const first = !controlled;
    controlled = true;
    if (first) return; // the first install claims the page: nothing to reload
    const req = request;
    request = null;
    if (req && !req.auto) return reloadNow(false);
    // Automatic: reload only if nothing was touched since we asked (a fraction of a second ago).
    if (req && lastInput <= req.at && safe("arrival")) return reloadNow(true);
    // Otherwise (the user just started something, or another tab activated the version) this
    // page still runs the old code: reload at the next safe moment, with the toast as fallback.
    found({ stale: true });
  });
  try {
    // Relative URL and scope: works at a domain root and under a subpath alike.
    reg = await navigator.serviceWorker.register("./sw.js", { scope: "./" });
  } catch (err) {
    console.warn("Service worker not registered", err);
    return null;
  }
  // A harness that blocks service workers resolves register() with undefined: nothing to watch.
  if (!reg) return null;
  const watch = (worker) => {
    worker?.addEventListener("statechange", () => {
      if (worker.state === "installed" && navigator.serviceWorker.controller) found();
    });
  };
  // Left waiting by an earlier session: this is the "next launch".
  if (reg.waiting && controlled) found({ arrival: !interacted });
  watch(reg.installing);
  reg.addEventListener("updatefound", () => watch(reg.installing));

  // Safe moments: arriving on a screen, coming back to the foreground, sitting still (ticker).
  on("route", () => {
    attempt("arrival");
    checkForUpdate();
  });
  document.addEventListener("visibilitychange", () => {
    pointers.clear();
    if (document.visibilityState !== "visible") return;
    attempt("idle");
    checkForUpdate();
  });
  // An installed app can stay open for days: keep asking, so a deploy reaches it within minutes.
  setInterval(() => checkForUpdate(), 60 * 1000);
  if (controlled) checkForUpdate({ force: true });
  else lastCheck = Date.now(); // first install: this worker is the newest there is
  return reg;
}

/** QA helper: the active worker's precache version, or null. */
export function swVersion() {
  return versionOf(navigator.serviceWorker?.controller);
}
