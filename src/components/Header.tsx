"use client";

import { useEffect, useRef, useState } from "react";
import {
  Maximize2,
  Minimize2,
  Palette,
  PanelBottom,
  PanelLeft,
  Plus,
  RectangleHorizontal,
  SquareTerminal,
  Upload,
} from "lucide-react";
import { GitHubMark } from "@/components/icons";
import { newTerminal, uploadTo } from "@/store/actions";
import { useStore, type ThemeId } from "@/store/useStore";

const THEME_LABEL: Record<ThemeId, string> = {
  phosphor: "phosphor",
  amber: "amber",
  ice: "ice",
};

const LAYOUT_ICONS = {
  collapsed: PanelBottom,
  panel: PanelBottom,
  half: RectangleHorizontal,
  full: Maximize2,
} as const;

const LAYOUT_LABELS = {
  collapsed: "show terminal",
  panel: "panel (resizable)",
  half: "half screen",
  full: "full screen",
} as const;

function IconBtn({
  title,
  onClick,
  active,
  children,
}: {
  title: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`flex h-7 items-center gap-1.5 rounded-md border px-2 text-[11px] transition-colors ${
        active
          ? "border-[color-mix(in_srgb,var(--acc)_45%,transparent)] bg-[color-mix(in_srgb,var(--acc)_12%,transparent)] text-[var(--acc)]"
          : "border-transparent text-[var(--dim)] hover:border-[var(--border)] hover:bg-[var(--panel2)] hover:text-[var(--fg)]"
      }`}
    >
      {children}
    </button>
  );
}

export default function Header() {
  const { theme, cycleTheme, sidebarOpen, toggleSidebar, sidebarTab, setSidebarTab } =
    useStore();
  const termLayout = useStore((s) => s.termLayout);
  const setTermLayout = useStore((s) => s.setTermLayout);
  const cycleTermLayout = useStore((s) => s.cycleTermLayout);
  const fileInput = useRef<HTMLInputElement>(null);
  const [clock, setClock] = useState("");

  useEffect(() => {
    const update = () =>
      setClock(
        new Date().toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  const LayoutIcon = LAYOUT_ICONS[termLayout];

  return (
    <header className="no-select z-20 flex h-11 shrink-0 items-center gap-1.5 border-b border-[var(--border)] bg-[var(--panel)] px-3">
      <div className="mr-1 flex items-center gap-2">
        <SquareTerminal size={17} className="glow-soft text-[var(--acc)]" />
        <span className="font-vt glow mt-0.5 text-[22px] tracking-[0.18em] text-[var(--acc)]">
          GWIJILAND
        </span>
        <span className="mt-1 hidden text-[9px] uppercase tracking-[0.2em] text-[var(--dim)] md:block">
          tty · v1.5
        </span>
      </div>

      <div className="mx-2 h-5 w-px bg-[var(--border)]" />

      <IconBtn title="New terminal (tty)" onClick={() => void newTerminal()}>
        <Plus size={13} />
        <span className="hidden sm:inline">terminal</span>
      </IconBtn>

      <IconBtn
        title="Toggle explorer"
        active={sidebarOpen && sidebarTab === "files"}
        onClick={() => (sidebarTab === "files" ? toggleSidebar() : setSidebarTab("files"))}
      >
        <PanelLeft size={13} />
      </IconBtn>

      <IconBtn
        title="GitHub panel"
        active={sidebarOpen && sidebarTab === "git"}
        onClick={() => (sidebarTab === "git" ? toggleSidebar() : setSidebarTab("git"))}
      >
        <GitHubMark width={13} height={13} />
      </IconBtn>

      <IconBtn title="Upload files to workspace" onClick={() => fileInput.current?.click()}>
        <Upload size={13} />
        <span className="hidden md:inline">push files</span>
      </IconBtn>

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

      <div className="flex-1" />

      <span className="mr-1 hidden font-mono text-[11px] text-[var(--dim)] lg:block">
        {clock}
      </span>

      <IconBtn title={`Theme: ${THEME_LABEL[theme]} — click to cycle`} onClick={cycleTheme}>
        <Palette size={13} />
        <span className="hidden sm:inline">{THEME_LABEL[theme]}</span>
      </IconBtn>

      {/* Terminal layout switcher — Codespaces style */}
      <div className="mx-0.5 h-5 w-px bg-[var(--border)]" />

      <IconBtn
        title={`Terminal: ${LAYOUT_LABELS[termLayout]} — click to cycle (Ctrl+\`)`}
        active={termLayout !== "collapsed"}
        onClick={cycleTermLayout}
      >
        <LayoutIcon size={13} />
        <span className="hidden sm:inline">{LAYOUT_LABELS[termLayout]}</span>
      </IconBtn>

      {/* Quick layout presets */}
      <div className="hidden items-center gap-0.5 md:flex">
        <button
          title="Hide terminal"
          onClick={() => setTermLayout("collapsed")}
          className={`rounded p-1 text-[10px] transition-colors ${
            termLayout === "collapsed"
              ? "text-[var(--acc)]"
              : "text-[var(--dim)] hover:text-[var(--fg)]"
          }`}
        >
          <Minimize2 size={11} />
        </button>
        <button
          title="Panel (resizable bottom panel)"
          onClick={() => setTermLayout("panel")}
          className={`rounded p-1 text-[10px] transition-colors ${
            termLayout === "panel"
              ? "text-[var(--acc)]"
              : "text-[var(--dim)] hover:text-[var(--fg)]"
          }`}
        >
          <PanelBottom size={11} />
        </button>
        <button
          title="Half screen (50/50 split)"
          onClick={() => setTermLayout("half")}
          className={`rounded p-1 text-[10px] transition-colors ${
            termLayout === "half"
              ? "text-[var(--acc)]"
              : "text-[var(--dim)] hover:text-[var(--fg)]"
          }`}
        >
          <RectangleHorizontal size={11} />
        </button>
        <button
          title="Full screen terminal"
          onClick={() => setTermLayout("full")}
          className={`rounded p-1 text-[10px] transition-colors ${
            termLayout === "full"
              ? "text-[var(--acc)]"
              : "text-[var(--dim)] hover:text-[var(--fg)]"
          }`}
        >
          <Maximize2 size={11} />
        </button>
      </div>
    </header>
  );
}
