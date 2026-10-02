// One BroadcastChannel between the tabs of this origin (fix round R3). A tab that saved a
// project tells the others; a tab that has the same project open with nothing unsaved then
// reloads its document by itself, so the stale copy never gets the chance to overwrite.
let channel = null;
try {
  channel = new BroadcastChannel("fliploop");
  channel.unref?.(); // Node only (unit tests): an open channel must not keep the process alive
} catch { /* no BroadcastChannel: the write-time check in db.saveProject still protects the data */ }

export function announceSaved(projectId, updatedAt) {
  try {
    channel?.postMessage({ type: "saved", projectId, updatedAt });
  } catch { /* channel closed */ }
}

/** fn({ type, projectId, updatedAt }) for messages from other tabs. Returns an unsubscribe function. */
export function onPeerMessage(fn) {
  if (!channel) return () => {};
  const handler = (e) => { if (e.data && typeof e.data === "object") fn(e.data); };
  channel.addEventListener("message", handler);
  return () => channel.removeEventListener("message", handler);
}
