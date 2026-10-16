"use client";

import { FolderTree, House, RefreshCw } from "lucide-react";
import FileTree from "@/components/FileTree";
import GitHubPanel from "@/components/GitHubPanel";
import { GitHubMark } from "@/components/icons";
import { useStore } from "@/store/useStore";

export default function Sidebar() {
  const sidebarTab = useStore((s) => s.sidebarTab);
  const setSidebarTab = useStore((s) => s.setSidebarTab);
  const refreshTree = useStore((s) => s.refreshTree);

  return (
    <aside className="flex w-[272px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--panel)]">
      <div className="no-select flex h-9 shrink-0 items-stretch gap-1 border-b border-[var(--border)] p-1">
        <button
          onClick={() => setSidebarTab("files")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded text-[11px] transition-colors ${
            sidebarTab === "files"
              ? "bg-[var(--panel2)] text-[var(--acc)]"
              : "text-[var(--dim)] hover:text-[var(--fg)]"
          }`}
        >
          <FolderTree size={13} /> files
        </button>
        <button
          onClick={() => setSidebarTab("git")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded text-[11px] transition-colors ${
            sidebarTab === "git"
              ? "bg-[var(--panel2)] text-[var(--acc)]"
              : "text-[var(--dim)] hover:text-[var(--fg)]"
          }`}
        >
          <GitHubMark width={12} height={12} /> git
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {sidebarTab === "files" ? <FileTree /> : <GitHubPanel />}
      </div>

      <div className="no-select flex h-8 shrink-0 items-center gap-1.5 border-t border-[var(--border)] px-2 text-[10px] text-[var(--dim)]">
        <House size={11} />
        <span className="truncate font-mono">~/gwijiland</span>
        <span className="flex-1" />
        <button
          title="Refresh tree"
          onClick={() => void refreshTree()}
          className="rounded p-1 hover:bg-[var(--panel2)] hover:text-[var(--fg)]"
        >
          <RefreshCw size={11} />
        </button>
      </div>
    </aside>
  );
}
