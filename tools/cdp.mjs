// Minimal Chrome DevTools Protocol harness for real-browser tests (no dependencies).
// Launches the installed Chrome headless, connects with Node's built-in WebSocket.
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";

export async function launch({ port = 9333, profile, headless = true } = {}) {
  mkdirSync(profile, { recursive: true });
  const args = [
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    "--no-first-run", "--no-default-browser-check", "--autoplay-policy=no-user-gesture-required",
    "--window-size=1280,860", "about:blank",
  ];
  if (headless) args.unshift("--headless=new");
  const proc = spawn(CHROME, args, { stdio: "ignore" });
  let targets;
  for (let i = 0; i < 50; i++) {
    try {
      targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      if (targets.some((t) => t.type === "page")) break;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  const page = targets.find((t) => t.type === "page");
  const cdp = await connect(page.webSocketDebuggerUrl);
  cdp.proc = proc;
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  cdp.close = async () => { try { await cdp.send("Browser.close"); } catch { proc.kill(); } };
  return cdp;
}

async function connect(url) {
  const ws = new WebSocket(url);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  const pending = new Map();
  const listeners = [];
  const logs = [];
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    } else if (msg.method) {
      if (msg.method === "Runtime.consoleAPICalled") logs.push(`${msg.params.type}: ${msg.params.args.map((a) => a.value ?? a.description).join(" ")}`);
      if (msg.method === "Runtime.exceptionThrown") logs.push(`EXCEPTION: ${msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text}`);
      listeners.forEach((l) => l(msg));
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const mid = ++id;
    pending.set(mid, { resolve, reject });
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
  return {
    send,
    logs,
    on: (fn) => listeners.push(fn),
    async eval(expression, { timeout = 120000 } = {}) {
      const r = await send("Runtime.evaluate", { expression: `(async () => { ${expression} })()`, awaitPromise: true, returnByValue: true, timeout, userGesture: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result.value;
    },
    async goto(url) {
      await send("Page.navigate", { url });
      await new Promise((r) => setTimeout(r, 1200));
    },
    async screenshot(path) {
      const { data } = await send("Page.captureScreenshot", { format: "png" });
      writeFileSync(path, Buffer.from(data, "base64"));
      return path;
    },
    async mobile(on = true) {
      if (on) {
        await send("Emulation.setDeviceMetricsOverride", { width: 375, height: 812, deviceScaleFactor: 2, mobile: true });
        await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
        await send("Emulation.setUserAgentOverride", { userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36" });
      } else {
        await send("Emulation.clearDeviceMetricsOverride");
        await send("Emulation.setTouchEmulationEnabled", { enabled: false });
      }
    },
    async downloadsTo(dir) {
      mkdirSync(dir, { recursive: true });
      await send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: dir, eventsEnabled: true });
    },
  };
}

export const SCRATCH = "C:/Users/yotam/AppData/Local/Temp/claude/C--Users-yotam-Documents-yotam12-the-system/7442ab68-ca56-46b2-a1bc-49b59e5ddbf4/scratchpad";
export const out = (name) => join(SCRATCH, name);
