// Local rehearsal of the Netlify deploy: a static server that sends the response headers
// written in site/_headers (Content-Security-Policy included) and answers unknown paths with
// site/404.html and status 404, as Netlify does. `python -m http.server` sends none of them,
// so a policy mistake would otherwise first show up on the real deploy.
//   node tools/serve-headers.mjs [port=9445] [dir=site]
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, normalize, extname, resolve, sep } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.argv[2] || 9445);
const dir = resolve(process.argv[3] ? process.argv[3] : join(root, "site"));

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8",
};

/** Netlify _headers: a path line, then indented "Name: value" lines. "*" matches the rest of the path. */
function parseHeaders(text) {
  const rules = [];
  let current = null;
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim() || raw.trim().startsWith("#")) continue;
    if (!/^\s/.test(raw)) {
      current = { path: raw.trim(), headers: [] };
      rules.push(current);
    } else if (current) {
      const i = raw.indexOf(":");
      if (i > 0) current.headers.push([raw.slice(0, i).trim(), raw.slice(i + 1).trim()]);
    }
  }
  return rules;
}

function matches(rule, path) {
  if (rule.endsWith("*")) return path.startsWith(rule.slice(0, -1));
  return rule === path;
}

async function fileAt(path) {
  const full = normalize(join(dir, decodeURIComponent(path)));
  if (full !== dir && !full.startsWith(dir + sep)) return null; // no walking out of the folder
  try {
    const s = await stat(full);
    if (s.isDirectory()) return fileAt(`${path.replace(/\/$/, "")}/index.html`);
    return full;
  } catch {
    return null;
  }
}

createServer(async (req, res) => {
  const path = new URL(req.url, "http://x").pathname;
  let rules = [];
  try {
    rules = parseHeaders(await readFile(join(dir, "_headers"), "utf8")); // re-read: edits apply without a restart
  } catch { /* no _headers file: plain static server */ }
  let status = 200;
  let file = await fileAt(path);
  if (!file) {
    status = 404;
    file = await fileAt("/404.html");
  }
  const headers = { "Content-Type": file ? TYPES[extname(file)] || "application/octet-stream" : "text/plain; charset=utf-8" };
  for (const rule of rules) if (matches(rule.path, path)) for (const [name, value] of rule.headers) headers[name] = value;
  res.writeHead(status, headers);
  res.end(file ? await readFile(file) : "Not found");
}).listen(port, "127.0.0.1", () => console.log(`http://127.0.0.1:${port}/ serving ${dir} with the headers of _headers`));
