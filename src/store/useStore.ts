"use client";

import { create } from "zustand";

export type ThemeId = "phosphor" | "amber" | "ice";

export interface FsEntry {
  name: string;
  path: string;
  type: "dir" | "file";
  size: number;
  mtime: number;
  isRepo?: boolean;
}

export interface SessionMeta {
  id: string;
  title: string;
  cwd: string;
  createdAt: number;
  alive: boolean;
}

export interface OpenFile {
  path: string;
  name: string;
  content: string;
  dirty: boolean;
  binary?: boolean;
  tooLarge?: boolean;
  size?: number;
}

export interface Toast {
  id: number;
  text: string;
  kind: "ok" | "err" | "info";
}

interface Store {
  booted: boolean;
  setBooted: () => void;

  theme: ThemeId;
  cycleTheme: () => void;

  sidebarOpen: boolean;
  sidebarTab: "files" | "git";
  setSidebarTab: (t: "files" | "git") => void;
  toggleSidebar: () => void;

  expanded: Record<string, boolean>;
  tree: Record<string, FsEntry[]>;
  treeLoading: boolean;
  selectedPath: string | null;
  setSelectedPath: (p: string | null) => void;
  toggleDir: (p: string) => void;
  loadDir: (p: string) => Promise<void>;
  refreshTree: () => Promise<void>;

  sessions: SessionMeta[];
  activeSessionId: string | null;
  setSessions: (s: SessionMeta[]) => void;
  setActiveSession: (id: string | null) => void;
  updateSession: (id: string, patch: Partial<SessionMeta>) => void;

  openFiles: OpenFile[];
  activeFilePath: string | null;
  setActiveFile: (p: string | null) => void;
  upsertFile: (f: OpenFile) => void;
  updateFileContent: (p: string, content: string) => void;
  markSaved: (p: string) => void;
  closeFile: (p: string) => void;

  termHeight: number;
  termLayout: "collapsed" | "panel" | "half" | "full";
  setTermHeight: (h: number) => void;
  setTermLayout: (l: "collapsed" | "panel" | "half" | "full") => void;
  cycleTermLayout: () => void;
  /** compat shim — used by actions that just want terminal visible */
  setTermCollapsed: (c: boolean) => void;

  toasts: Toast[];
  toast: (text: string, kind?: Toast["kind"]) => void;
  dismissToast: (id: number) => void;
}

let toastSeq = 0;

export const useStore = create<Store>((set, get) => ({
  booted: false,
  setBooted: () => set({ booted: true }),

  theme: "phosphor",
  cycleTheme: () =>
    set((s) => ({
      theme: s.theme === "phosphor" ? "amber" : s.theme === "amber" ? "ice" : "phosphor",
    })),

  sidebarOpen: true,
  sidebarTab: "files",
  setSidebarTab: (t) => set({ sidebarTab: t, sidebarOpen: true }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  expanded: { ".": true },
  tree: {},
  treeLoading: false,
  selectedPath: null,
  setSelectedPath: (p) => set({ selectedPath: p }),
  toggleDir: (p) =>
    set((s) => ({ expanded: { ...s.expanded, [p]: !s.expanded[p] } })),
  loadDir: async (p) => {
    set({ treeLoading: true });
    try {
      const res = await fetch(`/api/fs?dir=${encodeURIComponent(p)}`);
      const json = await res.json();
      if (res.ok) {
        set((s) => ({ tree: { ...s.tree, [p]: json.entries as FsEntry[] } }));
      }
    } finally {
      set({ treeLoading: false });
    }
  },
  refreshTree: async () => {
    const { expanded, loadDir } = get();
    const dirs = Object.keys(expanded).filter((k) => expanded[k]);
    for (const d of [".", ...dirs.filter((d) => d !== ".")]) {
      await loadDir(d);
    }
  },

  sessions: [],
  activeSessionId: null,
  setSessions: (sessions) => {
    set((s) => ({
      sessions,
      activeSessionId:
        s.activeSessionId && sessions.some((x) => x.id === s.activeSessionId)
          ? s.activeSessionId
          : (sessions.filter((x) => x.alive).at(-1)?.id ?? sessions.at(-1)?.id ?? null),
    }));
  },
  setActiveSession: (id) => set({ activeSessionId: id }),
  updateSession: (id, patch) =>
    set((s) => ({
      sessions: s.sessions.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    })),

  openFiles: [],
  activeFilePath: null,
  setActiveFile: (p) => set({ activeFilePath: p }),
  upsertFile: (f) =>
    set((s) => {
      const idx = s.openFiles.findIndex((x) => x.path === f.path);
      const openFiles =
        idx >= 0 ? s.openFiles.map((x, i) => (i === idx ? f : x)) : [...s.openFiles, f];
      return { openFiles, activeFilePath: f.path };
    }),
  updateFileContent: (p, content) =>
    set((s) => ({
      openFiles: s.openFiles.map((x) =>
        x.path === p ? { ...x, content, dirty: true } : x,
      ),
    })),
  markSaved: (p) =>
    set((s) => ({
      openFiles: s.openFiles.map((x) => (x.path === p ? { ...x, dirty: false } : x)),
    })),
  closeFile: (p) =>
    set((s) => {
      const openFiles = s.openFiles.filter((x) => x.path !== p);
      const activeFilePath =
        s.activeFilePath === p ? (openFiles.at(-1)?.path ?? null) : s.activeFilePath;
      return { openFiles, activeFilePath };
    }),

  termHeight: 260,
  termLayout: "panel" as "collapsed" | "panel" | "half" | "full",
  setTermHeight: (h) => set({ termHeight: Math.max(140, Math.min(h, 640)) }),
  setTermLayout: (l) => set({ termLayout: l }),
  cycleTermLayout: () =>
    set((s) => {
      const order: Array<"collapsed" | "panel" | "half" | "full"> = [
        "collapsed",
        "panel",
        "half",
        "full",
      ];
      const idx = order.indexOf(s.termLayout);
      return { termLayout: order[(idx + 1) % order.length] };
    }),
  setTermCollapsed: (c) => set({ termLayout: c ? "collapsed" : "panel" }),

  toasts: [],
  toast: (text, kind = "info") => {
    const id = ++toastSeq;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, text, kind }] }));
    setTimeout(() => get().dismissToast(id), 3600);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/* ---------- shared async helpers ---------- */

export async function fetchSessions(): Promise<SessionMeta[]> {
  const res = await fetch("/api/sessions");
  const json = await res.json();
  return (json.sessions || []) as SessionMeta[];
}

export async function spawnSession(cwd?: string): Promise<SessionMeta | null> {
  const res = await fetch("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cwd }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.session as SessionMeta;
}

export async function typeToSession(id: string, data: string): Promise<void> {
  await fetch(`/api/sessions/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "type", data }),
  });
}

export async function killSessionApi(id: string): Promise<void> {
  await fetch(`/api/sessions/${id}`, { method: "DELETE" });
}

export async function openFileInEditor(path: string): Promise<void> {
  const store = useStore.getState();
  const existing = store.openFiles.find((f) => f.path === path);
  if (existing) {
    store.setActiveFile(path);
    return;
  }
  const res = await fetch(`/api/fs/file?path=${encodeURIComponent(path)}`);
  const json = await res.json();
  if (!res.ok) {
    store.toast(json.error || "failed to open file", "err");
    return;
  }
  store.upsertFile({
    path,
    name: path.split("/").pop() || path,
    content: json.content || "",
    dirty: false,
    binary: json.binary,
    tooLarge: json.tooLarge,
    size: json.size,
  });
}

export async function saveFile(path: string): Promise<boolean> {
  const store = useStore.getState();
  const f = store.openFiles.find((x) => x.path === path);
  if (!f) return false;
  const res = await fetch("/api/fs/file", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, content: f.content }),
  });
  if (res.ok) {
    store.markSaved(path);
    store.toast(`saved ${path}`, "ok");
    return true;
  }
  store.toast(`failed to save ${path}`, "err");
  return false;
}
