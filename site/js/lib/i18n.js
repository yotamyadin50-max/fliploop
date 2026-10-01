import { STRINGS } from "../data/strings.js";

/** Approved string by key, with {placeholders} filled. Missing keys throw in development. */
export function t(key, params = {}) {
  const s = STRINGS[key];
  if (s === undefined) {
    console.error("Missing string key:", key);
    return "";
  }
  return s.replace(/\{(\w+)\}/g, (m, name) => (name in params ? String(params[name]) : m));
}

/** Plural keys end in .one / .two / .other (ui-copy conventions). */
export function tp(base, n, params = {}) {
  const all = { n, ...params };
  if (n === 1 && STRINGS[base + ".one"] !== undefined) return t(base + ".one", all);
  if (n === 2 && STRINGS[base + ".two"] !== undefined) return t(base + ".two", all);
  return t(base + ".other", all);
}
