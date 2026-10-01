// Work a page reload would cut short (an import, a backup, a PDF or PNG render).
// The automatic updater (js/pwa.js) waits while any of it is running.
let held = 0;

/** Runs fn (sync or async) and counts as busy until it settles. Returns fn's result. */
export async function busyWhile(fn) {
  held++;
  try {
    return await fn();
  } finally {
    held--;
  }
}

export function isHeld() {
  return held > 0;
}
