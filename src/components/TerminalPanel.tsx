"use client";

import {
  Maximize2,
  Minimize2,
  PanelBottom,
  Plus,
  RectangleHorizontal,
  SquareTerminal,
  X,
} from "lucide-react";
import Term from "@/components/Term";
import { killTerminal, newTerminal } from "@/store/actions";
import { useStore } from "@/store/useStore";

const LAYOUT_CYCLE: Record<string, "collapsed" | "panel" | "half" | "full"> = {
  panel: "half",
  half: "full",
  full: "panel",
};

export default function TerminalPanel() {
  const sessions = useStore((s) => s.sessions);
  const activeSessionId = useStore((s) => s.activeSessionId);
  const setActiveSession = useStore((s) => s.setActiveSession);
  const termLayout = useStore((s) => s.termLayout);
  const setTermLayout = useStore((s) => s.setTermLayout);

  return (
    <div className="flex h-full flex-col">
      {/* tab strip */}
      <div className="no-select flex h-8 shrink-0 items-stretch border-b border-[var(--border)] bg-[var(--panel)]">
        <div className="flex items-center gap-1.5 border-r border-[var(--border)] px-2.5 text-[10px] font-semibold tracking-[0.18em] text-[var(--dim)] uppercase">
          <SquareTerminal size={12} className="text-[var(--acc)]" /> tty
        </div>
        <div className="flex min-w-0 flex-1 items-stretch overflow-x-auto">
          {sessions.map((s) => {
            const isActive = s.id === activeSessionId;
            return (
              <div
                key={s.id}
                onClick={() => setActiveSession(s.id)}
                className={`group flex cursor-pointer items-center gap-1.5 border-r border-[var(--border)] px-2.5 text-[11px] whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-[color-mix(in_srgb,var(--acc)_10%,transparent)] text-[var(--fg)]"
                    : "text-[var(--dim)] hover:bg-[var(--panel2)] hover:text-[var(--fg)]"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    s.alive
                      ? "animate-pulse-dot bg-[var(--acc)]"
                      : "bg-[var(--dim)] opacity-50"
                  }`}
                />
                <span className="max-w-[140px] truncate font-mono">{s.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    void killTerminal(s.id);
                  }}
                  className="rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/40 hover:text-red-400"
                  title="Kill session"
                >
                  <X size={10} />
                </button>
              </div>
            );
          })}
          <button
            onClick={() => void newTerminal()}
            title="New terminal"
            className="flex items-center gap-1 px-2.5 text-[var(--dim)] transition-colors hover:bg-[var(--panel2)] hover:text-[var(--acc)]"
          >
            <Plus size={13} />
          </button>
        </div>

        {/* Right side: info + layout controls */}
        <div className="flex items-center gap-1.5 px-2.5">
          <span className="hidden font-mono text-[10px] text-[var(--dim)] sm:block">
            bash · ~/gwijiland
          </span>

          {/* Layout mode indicator + quick toggles */}
          <div className="ml-1 flex items-center gap-0.5 rounded border border-[var(--border)] bg-[var(--panel2)] px-1">
            <button
              title="Panel mode"
              onClick={() => setTermLayout("panel")}
              className={`rounded p-0.5 ${
                termLayout === "panel" ? "text-[var(--acc)]" : "text-[var(--dim)] hover:text-[var(--fg)]"
              }`}
            >
              <PanelBottom size={11} />
            </button>
            <button
              title="Half screen"
              onClick={() => setTermLayout("half")}
              className={`rounded p-0.5 ${
                termLayout === "half" ? "text-[var(--acc)]" : "text-[var(--dim)] hover:text-[var(--fg)]"
              }`}
            >
              <RectangleHorizontal size={11} />
            </button>
            <button
              title="Full screen"
              onClick={() => setTermLayout("full")}
              className={`rounded p-0.5 ${
                termLayout === "full" ? "text-[var(--acc)]" : "text-[var(--dim)] hover:text-[var(--fg)]"
              }`}
            >
              <Maximize2 size={11} />
            </button>
            <div className="mx-0.5 h-3 w-px bg-[var(--border)]" />
            <button
              title="Minimize terminal"
              onClick={() => setTermLayout("collapsed")}
              className="rounded p-0.5 text-[var(--dim)] hover:text-red-400"
            >
              <Minimize2 size={11} />
            </button>
          </div>
        </div>
      </div>

      {/* terminal surfaces */}
      <div className="relative min-h-0 flex-1">
        {sessions.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 bg-[var(--term-bg)] text-[var(--dim)]">
            <SquareTerminal size={26} className="text-[var(--acc)]/50" />
            <p className="text-[11px]">no live terminals</p>
            <button
              onClick={() => void newTerminal()}
              className="flex items-center gap-1.5 rounded-md border border-[var(--acc)]/40 px-3 py-1.5 text-[11px] text-[var(--acc)] transition-colors hover:bg-[var(--acc)]/10"
            >
              <Plus size={12} /> spawn tty
            </button>
          </div>
        ) : (
          sessions.map((s) => <Term key={s.id} id={s.id} active={s.id === activeSessionId} />)
        )}
      </div>
    </div>
  );
}
