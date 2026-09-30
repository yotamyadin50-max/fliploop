// Installable app (PWA pass): service worker registration, the update flow, and the
// install affordance state shared by Home and Settings.
// Update flow: a new version installs in the background and waits. The user gets one toast
// ("לרענן" activates it and reloads). If they ignore it, the waiting version takes over on
// the next launch: found at boot before any input, it is activated with one reload.
import { t } from "./lib/i18n.js";
import { emit, on } from "./lib/bus.js";
import { toast } from "./ui/toast.js";

let deferredPrompt = null;
let interacted = false;
let updateRequested = false;

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

function offerUpdate(worker) {
  toast(t("update.ready"), {
    id: "update",
    persistent: true,
    action: { label: t("update.action"), onClick: () => activate(worker) },
  });
}

function activate(worker) {
  updateRequested = true;
  worker.postMessage({ type: "SKIP_WAITING" });
}

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  let controlled = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    // The first install also claims the page: that must not reload it.
    if (updateRequested) location.reload();
    // Another tab activated a new version: this tab still runs the old code, so offer a reload.
    else if (controlled) toast(t("update.ready"), { id: "update", persistent: true, action: { label: t("update.action"), onClick: () => location.reload() } });
    controlled = true;
  });
  let reg;
  try {
    // Relative URL and scope: works at a domain root and under a subpath alike.
    reg = await navigator.serviceWorker.register("./sw.js", { scope: "./" });
  } catch (err) {
    console.warn("Service worker not registered", err);
    return null;
  }
  const watch = (worker) => {
    worker?.addEventListener("statechange", () => {
      if (worker.state === "installed" && navigator.serviceWorker.controller) offerUpdate(worker);
    });
  };
  if (reg.waiting && navigator.serviceWorker.controller) {
    // Left waiting by an earlier session: this is the "next launch".
    if (!interacted) activate(reg.waiting);
    else offerUpdate(reg.waiting);
  }
  watch(reg.installing);
  reg.addEventListener("updatefound", () => watch(reg.installing));
  // An installed app can stay open for days: look for a new version when it comes back.
  let lastCheck = Date.now();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible" || Date.now() - lastCheck < 30 * 60 * 1000) return;
    lastCheck = Date.now();
    reg.update().catch(() => {});
  });
  return reg;
}

/** QA helper: the active worker's precache version, or null. */
export function swVersion() {
  const sw = navigator.serviceWorker?.controller;
  if (!sw) return Promise.resolve(null);
  return new Promise((resolve) => {
    const ch = new MessageChannel();
    ch.port1.onmessage = (e) => resolve(e.data?.version ?? null);
    sw.postMessage({ type: "GET_VERSION" }, [ch.port2]);
    setTimeout(() => resolve(null), 2000);
  });
}
