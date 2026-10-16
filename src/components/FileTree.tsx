"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  Download,
  File,
  FileCode2,
  FileJson2,
  FilePlus2,
  FileTerminal,
  FileText,
  Folder,
  FolderPlus,
  GitBranch,
  Image,
  Loader2,
  Pencil,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { uploadTo } from "@/store/actions";
import { openFileInEditor, useStore, type FsEntry } from "@/store/useStore";

const CODE_EXTS = new Set([
  "js", "jsx", "ts", "tsx", "mjs", "cjs", "py", "rb", "go", "rs", "java", "c", "h",
  "cpp", "cc", "cs", "php", "swift", "kt", "lua", "pl", "vue", "svelte", "css", "scss",
  "html", "htm", "sql",
]);

function FileIcon({ entry, open }: { entry: FsEntry; open?: boolean }) {
  const cls = "shrink-0";
  const dim = "text-[var(--dim)]";
  if (entry.type === "dir") {
    return (
      <span className="relative">
        <Folder
          size={14}
          className={`${cls} ${open ? "text-[var(--acc)]" : dim}`}
          fill={open ? "color-mix(in srgb, var(--acc) 18%, transparent)" : "transparent"}
        />
        {entry.isRepo && (
          <GitBranch size={8} className="absolute -right-1 -bottom-1 text-[var(--acc)]" />
        )}
      </span>
    );
  }
  const ext = entry.name.split(".").pop()?.toLowerCase() || "";
  if (CODE_EXTS.has(ext)) return <FileCode2 size={14} className={`${cls} ${dim}`} />;
  if (ext === "json" || entry.name.endsWith(".jsonc"))
    return <FileJson2 size={14} className={`${cls} ${dim}`} />;
  if (["sh", "bash", "zsh"].includes(ext))
    return <FileTerminal size={14} className={`${cls} ${dim}`} />;
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "ico"].includes(ext))
    return <Image size={14} className={`${cls} ${dim}`} />;
  if (["md", "txt", "log", "env"].includes(ext))
    return <FileText size={14} className={`${cls} ${dim}`} />;
  return <File size={14} className={`${cls} ${dim}`} />;
}

interface Pending {
  mode: "file" | "dir" | "rename";
  parent: string;
  target?: FsEntry;
}

function parentOf(p: string): string {
  const parts = p.split("/");
  parts.pop();
  return parts.length ? parts.join("/") : ".";
}

async function fsOp(action: string, path: string, to?: string): Promise<boolean> {
  const res = await fetch("/api/fs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, path, to }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    useStore.getState().toast(j.error || "file operation failed", "err");
    return false;
  }
  return true;
}

function InlineInput({
  pending,
  depth,
  onDone,
}: {
  pending: Pending;
  depth: number;
  onDone: () => void;
}) {
  const [val, setVal] = useState(pending.target?.name || "");
  const [busy, setBusy] = useState(false);
  const loadDir = useStore((s) => s.loadDir);

  const submit = async () => {
    const name = val.trim();
    if (!name || busy) return onDone();
    if (name.includes("/") || name.includes("\\")) {
      useStore.getState().toast("name cannot contain slashes", "err");
      return;
    }
    setBusy(true);
    const base = pending.parent === "." ? "" : pending.parent + "/";
    let ok = false;
    if (pending.mode === "rename" && pending.target) {
      ok =
        name === pending.target.name || (await fsOp("rename", pending.target.path, base + name));
      if (ok) {
        const store = useStore.getState();
        store.closeFile(pending.target.path);
        onDone();
        await store.refreshTree();
        return;
      }
    } else if (pending.mode === "dir") {
      ok = await fsOp("mkdir", base + name);
    } else {
      ok = await fsOp("touch", base + name);
      if (ok) void openFileInEditor(base + name);
    }
    onDone();
    if (ok) await loadDir(pending.parent);
    setBusy(false);
  };

  return (
    <div
      className="flex items-center gap-1.5 px-2 py-[3px]"
      style={{ paddingLeft: 8 + depth * 12 }}
    >
      <input
        autoFocus
        value={val}
        disabled={busy}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void submit();
          if (e.key === "Escape") onDone();
        }}
        onBlur={() => void submit()}
        className="h-5 w-full rounded border border-[var(--acc)]/50 bg-black/40 px-1.5 text-[12px] text-[var(--fg)] outline-none"
      />
      {busy && <Loader2 size={12} className="animate-spin text-[var(--acc)]" />}
    </div>
  );
}

function Row({
  entry,
  depth,
  pending,
  setPending,
}: {
  entry: FsEntry;
  depth: number;
  pending: Pending | null;
  setPending: (p: Pending | null) => void;
}) {
  const expanded = useStore((s) => s.expanded);
  const toggleDir = useStore((s) => s.toggleDir);
  const loadDir = useStore((s) => s.loadDir);
  const selectedPath = useStore((s) => s.selectedPath);
  const setSelectedPath = useStore((s) => s.setSelectedPath);
  const activeFilePath = useStore((s) => s.activeFilePath);
  const children = useStore((s) => s.tree[entry.path]);

  const isDir = entry.type === "dir";
  const isOpen = !!expanded[entry.path];
  const selected = selectedPath === entry.path;
  const isActiveFile = activeFilePath === entry.path;

  const open = () => {
    setSelectedPath(entry.path);
    if (isDir) {
      toggleDir(entry.path);
      if (!children) void loadDir(entry.path);
    } else {
      void openFileInEditor(entry.path);
    }
  };

  const remove = async () => {
    if (!(await fsOp("delete", entry.path))) return;
    useStore.getState().closeFile(entry.path);
    void useStore.getState().refreshTree();
  };

  const glyph =
    isDir ? (
      <ChevronRight
        size={11}
        className={`shrink-0 text-[var(--dim)] transition-transform ${isOpen ? "rotate-90" : ""}`}
      />
    ) : (
      <span className="w-[11px] shrink-0" />
    );

  return (
    <div>
      <div
        onClick={open}
        className={`group no-select flex h-[26px] cursor-pointer items-center gap-1 pr-1 text-[12px] transition-colors ${
          isActiveFile
            ? "bg-[color-mix(in_srgb,var(--acc)_14%,transparent)] text-[var(--acc)]"
            : selected
              ? "bg-[var(--panel2)] text-[var(--fg)]"
              : "text-[var(--fg)]/85 hover:bg-[var(--panel2)]"
        }`}
        style={{ paddingLeft: 6 + depth * 12 }}
      >
        {glyph}
        <FileIcon entry={entry} open={isOpen} />
        <span className="truncate">{entry.name}</span>
        <span className="flex-1" />
        <span className="hidden items-center gap-0.5 group-hover:flex">
          {isDir && (
            <>
              <button
                title="New file here"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isOpen) {
                    toggleDir(entry.path);
                    void loadDir(entry.path);
                  }
                  setPending({ mode: "file", parent: entry.path });
                }}
                className="rounded p-0.5 text-[var(--dim)] hover:text-[var(--acc)]"
              >
                <FilePlus2 size={12} />
              </button>
              <button
                title="New folder here"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isOpen) {
                    toggleDir(entry.path);
                    void loadDir(entry.path);
                  }
                  setPending({ mode: "dir", parent: entry.path });
                }}
                className="rounded p-0.5 text-[var(--dim)] hover:text-[var(--acc)]"
              >
                <FolderPlus size={12} />
              </button>
            </>
          )}
          {!isDir && (
            <a
              title="Download"
              href={`/api/fs/download?path=${encodeURIComponent(entry.path)}`}
              onClick={(e) => e.stopPropagation()}
              className="rounded p-0.5 text-[var(--dim)] hover:text-[var(--acc)]"
            >
              <Download size={12} />
            </a>
          )}
          <button
            title="Rename"
            onClick={(e) => {
              e.stopPropagation();
              setPending({ mode: "rename", parent: parentOf(entry.path), target: entry });
            }}
            className="rounded p-0.5 text-[var(--dim)] hover:text-[var(--acc)]"
          >
            <Pencil size={12} />
          </button>
          <button
            title="Delete"
            onClick={(e) => {
              e.stopPropagation();
              void remove();
            }}
            className="rounded p-0.5 text-[var(--dim)] hover:text-red-400"
          >
            <Trash2 size={12} />
          </button>
        </span>
      </div>

      {isDir && isOpen && (
        <div>
          {pending && pending.parent === entry.path && (pending.mode !== "rename" || !pending.target) && (
            <InlineInput pending={pending} depth={depth + 1} onDone={() => setPending(null)} />
          )}
          {pending?.mode === "rename" &&
            pending.target &&
            (children || [])
              .filter((c) => c.path === pending.target!.path)
              .map((c) => (
                <InlineInput
                  key={c.path}
                  pending={pending}
                  depth={depth + 1}
                  onDone={() => setPending(null)}
                />
              ))}
          {(children || [])
            .filter((c) => !(pending?.mode === "rename" && pending.target?.path === c.path))
            .map((c) => (
              <Row key={c.path} entry={c} depth={depth + 1} pending={pending} setPending={setPending} />
            ))}
          {children && children.length === 0 && !pending && (
            <div
              className="py-[3px] text-[10px] text-[var(--dim)]"
              style={{ paddingLeft: 22 + (depth + 1) * 12 }}
            >
              empty
            </div>
          )}
          {!children && (
            <div className="px-6 py-1">
              <Loader2 size={11} className="animate-spin text-[var(--dim)]" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function FileTree() {
  const rootEntries = useStore((s) => s.tree["."]);
  const treeLoading = useStore((s) => s.treeLoading);
  const loadDir = useStore((s) => s.loadDir);
  const refreshTree = useStore((s) => s.refreshTree);
  const [pending, setPending] = useState<Pending | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const uploading = useRef(false);

  useEffect(() => {
    if (!rootEntries) void loadDir(".");
  }, [rootEntries, loadDir]);

  return (
    <div
      className={`relative min-h-full ${dragOver ? "bg-[color-mix(in_srgb,var(--acc)_8%,transparent)]" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (uploading.current) return;
        if (e.dataTransfer.files.length) {
          uploading.current = true;
          void uploadTo(".", e.dataTransfer.files).finally(() => {
            uploading.current = false;
          });
        }
      }}
    >
      <div className="no-select sticky top-0 z-10 flex h-8 items-center gap-1 border-b border-[var(--border)] bg-[var(--panel)] px-2">
        <span className="text-[10px] font-semibold tracking-[0.18em] text-[var(--dim)] uppercase">
          workspace
        </span>
        <span className="flex-1" />
        <button
          title="New file"
          onClick={() => setPending({ mode: "file", parent: "." })}
          className="rounded p-1 text-[var(--dim)] hover:bg-[var(--panel2)] hover:text-[var(--acc)]"
        >
          <FilePlus2 size={13} />
        </button>
        <button
          title="New folder"
          onClick={() => setPending({ mode: "dir", parent: "." })}
          className="rounded p-1 text-[var(--dim)] hover:bg-[var(--panel2)] hover:text-[var(--acc)]"
        >
          <FolderPlus size={13} />
        </button>
        <button
          title="Refresh"
          onClick={() => void refreshTree()}
          className="rounded p-1 text-[var(--dim)] hover:bg-[var(--panel2)] hover:text-[var(--acc)]"
        >
          <RefreshCw size={12} className={treeLoading ? "animate-spin" : ""} />
        </button>
      </div>

      {pending && pending.parent === "." && pending.mode !== "rename" && (
        <InlineInput pending={pending} depth={0} onDone={() => setPending(null)} />
      )}
      {pending?.mode === "rename" &&
        pending.target &&
        (rootEntries || [])
          .filter((c) => c.path === pending.target!.path)
          .map((c) => (
            <InlineInput key={c.path} pending={pending} depth={0} onDone={() => setPending(null)} />
          ))}
      {(rootEntries || [])
        .filter((c) => !(pending?.mode === "rename" && pending.target?.path === c.path))
        .map((e) => (
          <Row key={e.path} entry={e} depth={0} pending={pending} setPending={setPending} />
        ))}

      {rootEntries?.length === 0 && !pending && (
        <div className="space-y-1 px-3 py-4 text-[11px] text-[var(--dim)]">
          <p>empty workspace.</p>
          <p>drop files here to push them, or create something new.</p>
        </div>
      )}
      {!rootEntries && (
        <div className="flex items-center gap-2 px-3 py-4 text-[11px] text-[var(--dim)]">
          <Loader2 size={12} className="animate-spin" /> reading /home/guest…
        </div>
      )}
      {dragOver && (
        <div className="pointer-events-none absolute inset-2 rounded-md border-2 border-dashed border-[var(--acc)]/60" />
      )}
    </div>
  );
}
