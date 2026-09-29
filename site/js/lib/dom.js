// Tiny element builder. Text always goes through textContent; only trusted, code-authored
// SVG markup (icons, the Home art) is ever assigned as markup.

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else if (k === "html") el.innerHTML = v; // trusted, code-authored markup only
    else if (k === "style" && typeof v === "object") {
      // Object.assign drops custom properties (--swatch), so those go through setProperty.
      for (const [p, val] of Object.entries(v)) {
        if (p.startsWith("--")) el.style.setProperty(p, val);
        else el.style[p] = val;
      }
    }
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k === "dataset") Object.assign(el.dataset, v);
    else if (v === true) el.setAttribute(k, "");
    else el.setAttribute(k, v);
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export function clear(el) {
  while (el.firstChild) el.firstChild.remove();
  return el;
}

/** A number/counter isolate (Part B `.num`: tabular, LTR). */
export function num(text) {
  return h("span", { class: "num", dir: "ltr" }, text);
}

/** Renders a string that contains digits/Latin runs so each run sits in an LTR isolate. */
export function richText(text) {
  const frag = document.createDocumentFragment();
  const re = /([0-9]+(?:[/.:×][0-9]+)*%?|[A-Za-z][A-Za-z0-9 .+]*[A-Za-z0-9])/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) frag.append(text.slice(last, m.index));
    const isLatin = /[A-Za-z]/.test(m[0]);
    const span = h("span", { dir: "ltr", class: isLatin ? "ltr" : "num" }, m[0]);
    if (isLatin && /^[A-Za-z .]+$/.test(m[0]) && m[0].length > 3 && m[0] !== "FlipLoop") span.lang = "en";
    frag.append(span);
    last = m.index + m[0].length;
  }
  if (last < text.length) frag.append(text.slice(last));
  return frag;
}

export function qs(sel, root = document) {
  return root.querySelector(sel);
}

export function qsa(sel, root = document) {
  return [...root.querySelectorAll(sel)];
}
