// Writes the precache list, a content-hash version and the Google Fonts CSS URL into
// site/sw.js (between the @precache markers), from the files actually in site/.
// Run after ANY change under site/:   node tools/build-sw-manifest.mjs
// CI / pre-deploy check (exit 1 if sw.js is stale):   node tools/build-sw-manifest.mjs --check
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const site = join(root, "site");
const swPath = join(site, "sw.js");

// Not part of the offline app: the worker itself, host config, share/install-UI images, QA code.
const EXCLUDE = [/^sw\.js$/, /^_headers$/, /^_redirects$/, /^assets\/og-image\.png$/, /^assets\/screenshots\//, /^js\/dev\//, /(^|\/)\./];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const files = walk(site)
  .map((p) => relative(site, p).split("\\").join("/"))
  .filter((rel) => !EXCLUDE.some((re) => re.test(rel)))
  .sort();

// The app shell document is precached as "./" (the directory URL every static host serves).
const precache = ["./", ...files.filter((f) => f !== "index.html")];

const hash = createHash("sha256");
// Text files hash with LF endings, so a Windows (CRLF) checkout and the Linux deploy agree.
const TEXT = /\.(html|css|js|mjs|json|webmanifest|svg|txt)$/;
for (const f of files) {
  const bytes = readFileSync(join(site, f));
  hash.update(f + "\0").update(TEXT.test(f) ? bytes.toString("utf8").replace(/\r\n/g, "\n") : bytes).update("\0");
}
const version = hash.digest("hex").slice(0, 12);

const html = readFileSync(join(site, "index.html"), "utf8");
const fontHref = html.match(/<link[^>]+href="(https:\/\/fonts\.googleapis\.com\/css2[^"]+)"/);
if (!fontHref) throw new Error("Google Fonts stylesheet link not found in index.html");
const fontCss = fontHref[1].replace(/&amp;/g, "&");

const block = [
  "// @precache-start",
  `const VERSION = ${JSON.stringify(version)};`,
  `const PRECACHE = ${JSON.stringify(precache, null, 2)};`,
  `const FONT_CSS = ${JSON.stringify(fontCss)};`,
  "// @precache-end",
].join("\n");

const sw = readFileSync(swPath, "utf8");
const re = /\/\/ @precache-start[\s\S]*?\/\/ @precache-end/;
if (!re.test(sw)) throw new Error("precache markers not found in sw.js");
const next = sw.replace(re, block);

if (process.argv.includes("--check")) {
  const lf = (s) => s.replace(/\r\n/g, "\n");
  if (lf(next) !== lf(sw)) {
    console.error("site/sw.js is stale: run node tools/build-sw-manifest.mjs");
    process.exit(1);
  }
  console.log(`sw.js up to date (version ${version}, ${precache.length} files)`);
} else {
  writeFileSync(swPath, next);
  const bytes = files.reduce((n, f) => n + statSync(join(site, f)).size, 0);
  console.log(`sw.js version ${version}: ${precache.length} files, ${(bytes / 1024).toFixed(0)} KB precached`);
}
