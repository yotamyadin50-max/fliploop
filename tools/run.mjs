// Keeps one headless Chrome alive and runs page scripts sent over a tiny local HTTP API,
// so tests can be written step by step: POST /eval (body = JS), GET /shot?name=, /mobile?on=
import { createServer } from "node:http";
import { launch, out, SCRATCH } from "./cdp.mjs";

const cdp = await launch({ profile: `${SCRATCH}/cdp-profile` });
await cdp.downloadsTo(`${SCRATCH}/downloads`);
const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  let body = "";
  for await (const c of req) body += c;
  try {
    let result;
    if (url.pathname === "/eval") result = await cdp.eval(body);
    else if (url.pathname === "/goto") result = await cdp.goto(body);
    else if (url.pathname === "/shot") result = await cdp.screenshot(out(url.searchParams.get("name") || "shot.png"));
    else if (url.pathname === "/mobile") result = await cdp.mobile(url.searchParams.get("on") !== "0");
    else if (url.pathname === "/send") { const { method, params } = JSON.parse(body); result = await cdp.send(method, params); }
    else if (url.pathname === "/logs") { result = cdp.logs.splice(0); }
    else if (url.pathname === "/quit") { res.end("bye"); await cdp.close(); process.exit(0); }
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: true, result }, null, 1));
  } catch (err) {
    res.end(JSON.stringify({ ok: false, error: String(err.message || err) }));
  }
});
server.listen(9400, "127.0.0.1", () => console.log("cdp runner on 9400"));
