// App-wide events: "w2", "w5", "save-status", "progress", "settings".
export const bus = new EventTarget();

export function emit(type, detail) {
  bus.dispatchEvent(new CustomEvent(type, { detail }));
}

export function on(type, fn) {
  const handler = (e) => fn(e.detail);
  bus.addEventListener(type, handler);
  return () => bus.removeEventListener(type, handler);
}
