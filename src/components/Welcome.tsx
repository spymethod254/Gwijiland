"use client";

import { useRef } from "react";
import {
  FilePlus2,
  FolderGit2,
  Layers,
  Rocket,
  SquareTerminal,
  Upload,
} from "lucide-react";
import { GitHubMark } from "@/components/icons";
import { newTerminal, runInTerminal, uploadTo } from "@/store/actions";
import { openFileInEditor, useStore } from "@/store/useStore";

const SCAFFOLDS = [
  { label: "next.js", cmd: "npx create-next-app@latest" },
  { label: "vite + react", cmd: "npm create vite@latest" },
  { label: "astro", cmd: "npm create astro@latest" },
  { label: "hono api", cmd: "npm create hono@latest" },
];

function Card({
  icon,
  title,
  desc,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--panel)]/60 p-3 text-left transition-all hover:border-[var(--acc)]/40 hover:bg-[var(--panel2)]"
    >
      <span className="mt-0.5 text-[var(--dim)] transition-colors group-hover:text-[var(--acc)]">
        {icon}
      </span>
      <span>
        <span className="block text-[12px] font-semibold text-[var(--fg)]">{title}</span>
        <span className="mt-0.5 block text-[11px] leading-snug text-[var(--dim)]">{desc}</span>
      </span>
    </button>
  );
}

export default function Welcome() {
  const setSidebarTab = useStore((s) => s.setSidebarTab);
  const fileInput = useRef<HTMLInputElement>(null);

  const newFile = async () => {
    useStore.getState().setSidebarTab("files");
    const res = await fetch("/api/fs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "touch", path: "untitled.md" }),
    });
    if (res.ok) {
      await useStore.getState().refreshTree();
      void openFileInEditor("untitled.md");
    }
  };

  return (
    <div className="animate-fade-up flex h-full flex-col items-center overflow-y-auto px-6 py-10">
      <div className="font-vt glow text-[64px] leading-none tracking-[0.14em] text-[var(--acc)] sm:text-[84px]">
        GWIJILAND
      </div>
      <p className="mt-2 text-center text-[12px] text-[var(--dim)]">
        a GNU/Linux development environment living entirely in this tab —
        real <span className="text-[var(--fg)]">bash</span>, a real filesystem,{" "}
        <span className="text-[var(--fg)]">npm · pip · git</span> included.
      </p>

      <div className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-2.5 sm:grid-cols-2">
        <Card
          icon={<SquareTerminal size={18} />}
          title="spawn a terminal"
          desc="full interactive bash over a pty — run anything you would locally"
          onClick={() => void newTerminal()}
        />
        <Card
          icon={<GitHubMark width={18} height={18} />}
          title="clone / push github"
          desc="link a token, then clone, commit & push without leaving the tab"
          onClick={() => setSidebarTab("git")}
        />
        <Card
          icon={<Upload size={18} />}
          title="push local files"
          desc="drag anything into the explorer or pick files to upload them"
          onClick={() => fileInput.current?.click()}
        />
        <Card
          icon={<FilePlus2 size={18} />}
          title="new file"
          desc="create untitled.md in ~/gwijiland and start editing"
          onClick={() => void newFile()}
        />
      </div>

      <div className="mt-6 w-full max-w-2xl rounded-lg border border-[var(--border)] bg-[var(--panel)]/60 p-3">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold tracking-[0.2em] text-[var(--dim)] uppercase">
          <Rocket size={12} className="text-[var(--acc)]" /> scaffold a project
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SCAFFOLDS.map((s) => (
            <button
              key={s.label}
              onClick={() => void runInTerminal(s.cmd)}
              className="rounded-md border border-[var(--border)] px-2 py-2 font-mono text-[11px] text-[var(--dim)] transition-all hover:border-[var(--acc)]/50 hover:bg-[var(--acc)]/5 hover:text-[var(--acc)]"
            >
              $ {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[10px] text-[var(--dim)]">
        <span className="flex items-center gap-1">
          <Layers size={11} /> workspaces persist server-side
        </span>
        <span className="flex items-center gap-1">
          <span className="kbd">ctrl</span>+<span className="kbd">s</span> save file
        </span>
        <span className="flex items-center gap-1">
          <span className="kbd">ctrl</span>+<span className="kbd">⇧</span>+
          <span className="kbd">v</span> paste into tty
        </span>
        <span className="flex items-center gap-1">
          <FolderGit2 size={11} /> duplicated scrollback survives refresh
        </span>
      </div>

      <input
        ref={fileInput}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void uploadTo(".", e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
