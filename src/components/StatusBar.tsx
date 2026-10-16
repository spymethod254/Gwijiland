"use client";

import {
  FileCode2,
  Radio,
  Save,
  SquareTerminal,
  Wifi,
} from "lucide-react";
import { useStore } from "@/store/useStore";

const LAYOUT_LABEL = {
  collapsed: "hidden",
  panel: "panel",
  half: "50/50",
  full: "fullscreen",
} as const;

export default function StatusBar() {
  const sessions = useStore((s) => s.sessions);
  const activeFilePath = useStore((s) => s.activeFilePath);
  const openFiles = useStore((s) => s.openFiles);
  const theme = useStore((s) => s.theme);
  const selectedPath = useStore((s) => s.selectedPath);
  const termLayout = useStore((s) => s.termLayout);

  const alive = sessions.filter((s) => s.alive).length;
  const active = openFiles.find((f) => f.path === activeFilePath);
  const dirtyCount = openFiles.filter((f) => f.dirty).length;

  return (
    <footer className="no-select z-20 flex h-7 shrink-0 items-center gap-3 border-t border-[var(--border)] bg-[var(--panel)] px-3 text-[10px] text-[var(--dim)]">
      <span className="flex items-center gap-1.5">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            alive > 0 ? "animate-pulse-dot bg-[var(--acc)]" : "bg-red-500"
          }`}
        />
        <span className={alive > 0 ? "text-[var(--acc)]" : "text-red-400"}>
          {alive > 0 ? "linked" : "offline"}
        </span>
      </span>
      <span className="flex items-center gap-1">
        <Wifi size={10} /> {alive} tty
      </span>
      <span className="hidden items-center gap-1 md:flex">
        <Radio size={10} /> ~/gwijiland{selectedPath && selectedPath !== "." ? `/${selectedPath}` : ""}
      </span>
      <span className="hidden items-center gap-1 sm:flex">
        <SquareTerminal size={10} /> {LAYOUT_LABEL[termLayout]}
      </span>

      <span className="flex-1" />

      {active && (
        <span className="hidden items-center gap-1 sm:flex">
          <FileCode2 size={10} /> {active.path}
        </span>
      )}
      {dirtyCount > 0 && (
        <span className="flex items-center gap-1 text-[var(--acc)]">
          <Save size={10} /> {dirtyCount} unsaved
        </span>
      )}
      <span>utf-8 · lf</span>
      <span className="rounded border border-[var(--border)] px-1 py-px font-mono text-[9px] tracking-wider uppercase">
        {theme}
      </span>
    </footer>
  );
}
