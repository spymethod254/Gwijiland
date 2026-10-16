"use client";

import {
  fetchSessions,
  killSessionApi,
  spawnSession,
  typeToSession,
  useStore,
} from "./useStore";

/** Load sessions from the server; spawn tty-1 on a fresh boot. */
export async function syncSessions(): Promise<void> {
  const store = useStore.getState();
  let sessions = await fetchSessions();
  const alive = sessions.filter((s) => s.alive);
  if (alive.length === 0) {
    const fresh = await spawnSession();
    if (fresh) sessions = [...sessions, fresh];
  }
  store.setSessions(sessions.filter((s) => s.alive));
}

/** Spawn a new terminal session and focus it. Returns the id. */
export async function newTerminal(cwd?: string): Promise<string | null> {
  const store = useStore.getState();
  const sess = await spawnSession(cwd);
  if (!sess) {
    store.toast("failed to spawn terminal", "err");
    return null;
  }
  const sessions = [...useStore.getState().sessions, sess];
  useStore.getState().setSessions(sessions);
  useStore.getState().setActiveSession(sess.id);
  // If terminal is collapsed, show it in panel mode
  if (useStore.getState().termLayout === "collapsed") {
    useStore.getState().setTermLayout("panel");
  }
  return sess.id;
}

export async function killTerminal(id: string): Promise<void> {
  await killSessionApi(id);
  const store = useStore.getState();
  const sessions = store.sessions.filter((s) => s.id !== id);
  store.setSessions(sessions);
}

/** An alive, focused session id — spawns one if needed. */
export async function ensureActiveSession(): Promise<string | null> {
  const store = useStore.getState();
  const active = store.sessions.find(
    (s) => s.id === store.activeSessionId && s.alive !== false,
  );
  if (active) return active.id;
  const anyAlive = store.sessions.find((s) => s.alive !== false);
  if (anyAlive) {
    store.setActiveSession(anyAlive.id);
    return anyAlive.id;
  }
  return newTerminal();
}

/** Type a command into a terminal (as if typed by hand) and press Enter. */
export async function runInTerminal(command: string, cwd?: string): Promise<void> {
  const id = await ensureActiveSession();
  if (!id) return;
  if (cwd) await typeToSession(id, `cd ${JSON.stringify(cwd)}\n`);
  await typeToSession(id, `${command}\n`);
  if (useStore.getState().termLayout === "collapsed") {
    useStore.getState().setTermLayout("panel");
  }
}

/** Upload browser-picked files into a workspace directory. */
export async function uploadTo(dir: string, files: FileList | File[]): Promise<void> {
  const store = useStore.getState();
  const form = new FormData();
  form.set("dir", dir);
  for (const f of Array.from(files)) form.append("files", f);
  store.toast(`uploading ${form.getAll("files").length} file(s)…`, "info");
  const res = await fetch("/api/fs/upload", { method: "POST", body: form });
  const json = await res.json().catch(() => ({}));
  if (res.ok) {
    store.toast(`pushed ${json.saved?.length ?? 0} file(s) → ~/${dir === "." ? "" : dir}`, "ok");
    await store.refreshTree();
  } else {
    store.toast(json.error || "upload failed", "err");
  }
}
