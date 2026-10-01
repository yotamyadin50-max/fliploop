// Home (plan 1): header links, display H1, the light table, one primary action and two
// secondary cards, "continue" link, W1 slot.
import { h, clear } from "../lib/dom.js";
import { t, tp } from "../lib/i18n.js";
import { reducedMotion } from "../lib/util.js";
import { iconEl } from "../ui/icons.js";
import { lightTableSvg, animateFlipbook } from "./home-art.js";
import { lessonsDoneCount } from "../store/settings.js";
import { listProjects } from "../store/projects.js";
import { weekInfo } from "../core/challenge.js";
import { THEMES } from "../data/themes.js";
import { w1Banner } from "../ui/warnings.js";
import { installState, onInstallChange, promptInstall } from "../pwa.js";

/** Home only: shown while the browser offers install; hidden once installed. */
function installLink() {
  const btn = h("button", { class: "nav-link nav-link--install", type: "button", "aria-label": t("home.nav.install.aria"), onclick: () => promptInstall() },
    iconEl("install", { size: 22 }), h("span", {}, t("home.nav.install")));
  const sync = () => { btn.hidden = installState() !== "prompt"; };
  sync();
  btn.dispose = onInstallChange(sync);
  return btn;
}

export function siteHeader({ home = false } = {}) {
  const install = home ? installLink() : null;
  const header = h("header", { class: "site-header" },
    h("a", { class: "wordmark", href: "#/", hidden: home }, "FlipLoop"),
    install,
    h("nav", { class: "site-header__nav" },
      h("a", { class: "nav-link", href: "#/gallery" }, iconEl("gallery", { size: 22 }), h("span", {}, t("home.nav.gallery"))),
      h("a", { class: "nav-link", href: "#/settings" }, iconEl("settings", { size: 22 }), h("span", {}, t("home.nav.settings")))));
  header.dispose = () => install?.dispose();
  return header;
}

export class HomeScreen {
  constructor(section, router) {
    this.section = section;
    this.router = router;
  }

  async mount() {
    this.router.setTitle(null);
    clear(this.section);
    const done = lessonsDoneCount();
    const theme = THEMES[weekInfo(new Date()).themeIndex];
    // The flipbook loops for as long as Home is open, so it can be paused (R37, WCAG 2.2.2):
    // the art itself is the toggle button. With reduced motion nothing moves by itself, so
    // it stays plain art that flips one page per tap, as before.
    const reduced = reducedMotion();
    const art = reduced
      ? h("div", { class: "home__table", html: lightTableSvg() })
      : h("button", { class: "home__table home__table--toggle", type: "button", "aria-label": t("home.art.pause.aria"), html: lightTableSvg(),
        onclick: () => this.toggleFlip() });
    if (!reduced) art.append(h("span", { class: "home__paused", "aria-hidden": "true" }, iconEl("play", { size: 20 })));
    this.art = art;
    const w1Slot = h("div", { class: "home__w1" });
    this.continueSlot = h("div", { class: "home__continue" });
    this.header = siteHeader({ home: true });
    this.section.append(
      this.header,
      h("div", { class: "page home" },
        h("div", { class: "home__text" },
          h("h1", { class: "display" }, t("home.h1")),
          h("p", { class: "home__subtitle muted" }, t("home.subtitle"))),
        art,
        h("div", { class: "home__actions" },
          h("a", { class: "btn btn--primary btn--hero", href: "#/new", "aria-label": t("home.cta.new.aria") }, iconEl("pencil"), t("home.cta.new")),
          h("div", { class: "home__cards" },
            h("a", { class: "home-card", href: "#/lessons", "aria-label": tp("home.cta.lessons.aria", done, { done }) },
              h("span", { class: "home-card__title" }, iconEl("book", { size: 18 }), t("home.cta.lessons")),
              // The stamp glyph means "completed" on the Lessons path, so it is Success only once a lesson is done (J-C3).
              h("span", { class: "home-card__meta" + (done ? " home-card__meta--done" : "") }, iconEl("stamp", { size: 18 }), h("span", { class: "num" }, t("home.cta.lessons.progress", { done })))),
            h("a", { class: "home-card", href: "#/challenge", "aria-label": t("home.cta.challenge.aria", { theme }) },
              h("span", { class: "home-card__title" }, iconEl("flag", { size: 18 }), t("home.cta.challenge")),
              h("span", { class: "home-card__meta muted" }, t("home.cta.challenge.theme", { theme })))),
          this.continueSlot,
          w1Slot)));
    this.flip = animateFlipbook(art.querySelector("svg"), { reduced });
    const projects = await listProjects().catch(() => []);
    if (this.disposed) return;
    const last = projects[0];
    if (last) {
      this.continueSlot.append(h("a", { class: "btn btn--tertiary", href: `#/editor/${last.id}`, "aria-label": t("home.continue.aria", { title: last.title }) },
        t("home.continue", { title: last.title })));
    }
    const banner = await w1Banner();
    if (banner && !this.disposed) w1Slot.append(banner);
  }

  toggleFlip() {
    const paused = !this.flip.paused;
    this.flip.setPaused(paused);
    this.art.classList.toggle("is-paused", paused);
    this.art.setAttribute("aria-label", t(paused ? "home.art.play.aria" : "home.art.pause.aria"));
  }

  unmount() {
    this.disposed = true;
    this.flip?.stop();
    this.header?.dispose();
  }
}
