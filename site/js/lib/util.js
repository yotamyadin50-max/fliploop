export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function uuid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 15) | 64;
  b[8] = (b[8] & 63) | 128;
  const hex = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Yields go through a MessageChannel, not setTimeout(0): browsers slow timers down to about
// one per second in a hidden tab, which would stretch a long GIF from seconds to minutes.
// Created on first use, so importing this module (node tests) opens no port.
let yieldPort = null;
const yieldQueue = [];

/** Yields to the event loop so long jobs keep the page responsive. */
export function yieldToMain() {
  if (typeof MessageChannel !== "function") return new Promise((r) => setTimeout(r, 0));
  if (!yieldPort) {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => yieldQueue.shift()?.();
    yieldPort = channel.port2;
  }
  return new Promise((resolve) => {
    yieldQueue.push(resolve);
    yieldPort.postMessage(0);
  });
}

export function reducedMotion() {
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isDesktop() {
  return matchMedia("(min-width: 1024px)").matches;
}

/** Triggers a real file download for a Blob. */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

const FILE_NAME_MAX = 60; // characters, counted as the user sees them
// Device names Windows refuses as a file name, with or without an extension.
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³])(\.|$)/i;

/**
 * File-name-safe version of a title (keeps Hebrew and emoji). The result is a name a browser
 * saves as given on Windows, macOS, Android and iOS, so the name the app reports is the name
 * on disk: no path or wildcard characters, no control or bidi-control characters (a bidi
 * override can disguise an extension), no leading dot (hidden file), no trailing dot or
 * space, no Windows device name.
 */
export function safeFileName(title) {
  const strip = (s) => s.replace(/^[.\s]+/, "").replace(/[.\s]+$/, "");
  let s = String(title ?? "")
    .replace(/[‎‏‪-‮⁦-⁩؜﻿]/g, "")
    .replace(/[\\/:*?"<>|\u0000-\u001f\u007f-\u009f]+/g, " ")
    .replace(/\s+/g, " ");
  s = strip([...strip(s)].slice(0, FILE_NAME_MAX).join(""));
  if (WINDOWS_RESERVED.test(s)) s = `_${s}`;
  return s || "FlipLoop";
}

export function formatBytes(bytes) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${Math.round(bytes / 1024 ** 2)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// Export file size: KB under 1 MB (a small GIF read "0.00 MB"), one decimal in MB above.
export function formatFileSize(bytes) {
  const kb = Math.round(bytes / 1024);
  if (kb < 1000) return `${Math.max(1, kb)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

export function dateDMY(ts) {
  const d = new Date(ts);
  return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
}

export function dateISO(ts = Date.now()) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function truncate(s, max) {
  const chars = [...s];
  return chars.length <= max ? s : chars.slice(0, max).join("");
}

export function canvasToBlob(canvas, type = "image/png", quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob returned null"))), type, quality);
  });
}

export function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

export async function dataURLToBlob(url) {
  const res = await fetch(url); // data: URL, decoded locally, no network
  return res.blob();
}

export function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

export function ctx2d(canvas) {
  return canvas.getContext("2d", { willReadFrequently: true });
}

export const easing = {
  standardDecelerate: (t) => cubicBezier(0, 0, 0, 1)(t),
  standardAccelerate: (t) => cubicBezier(0.3, 0, 1, 1)(t),
  emphasizedDecelerate: (t) => cubicBezier(0.05, 0.7, 0.1, 1)(t),
};

/** CSS-equivalent cubic-bezier timing function for rAF-driven motion. */
export function cubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sampleX = (t) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t) => ((ay * t + by) * t + cy) * t;
  const dX = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = sampleX(t) - x;
      const d = dX(t);
      if (Math.abs(err) < 1e-5 || Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    t = clamp(t, 0, 1);
    return sampleY(t);
  };
}
