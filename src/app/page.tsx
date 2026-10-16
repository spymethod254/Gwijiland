"use client";

import { useEffect, useRef } from "react";
import Boot from "@/components/Boot";
import EditorArea from "@/components/Editor";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import StatusBar from "@/components/StatusBar";
import TerminalPanel from "@/components/TerminalPanel";
import { syncSessions } from "@/store/actions";
import { fetchSessions, saveFile, useStore } from "@/store/useStore";

function Toasts() {
  const toasts = useStore((s) => s.toasts);
  if (!toasts.length) return null;
  return (
    <div className="no-select fixed right-4 bottom-12 z-[100] flex flex-col items-end gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`animate-fade-up rounded-md border px-3 py-1.5 text-[11px] shadow-lg shadow-black/40 panel-glass ${
            t.kind === "ok"
              ? "border-[color-mix(in_srgb,var(--acc)_50%,transparent)] text-[var(--acc)]"
              : t.kind === "err"
                ? "border-red-500/40 text-red-400"
                : "border-[var(--border)] text-[var(--fg)]"
          }`}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}

export default function Page() {
  const booted = useStore((s) => s.booted);
  const theme = useStore((s) => s.theme);
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const termLayout = useStore((s) => s.termLayout);
  const termHeight = useStore((s) => s.termHeight);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    void syncSessions();
    void useStore.getState().loadDir(".");
    const t = setInterval(() => {
      void fetchSessions().then((list) =>
        useStore.getState().setSessions(list.filter((s) => s.alive)),
      );
    }, 20_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        const p = useStore.getState().activeFilePath;
        if (p) void saveFile(p);
      }
      // Ctrl+` to cycle terminal layout (like Codespaces)
      if ((e.metaKey || e.ctrlKey) && e.key === "`") {
        e.preventDefault();
        useStore.getState().cycleTermLayout();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!booted) return <Boot />;

  const showEditor = termLayout !== "full";
  const showTerminal = termLayout !== "collapsed";

  const onSplitterDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (termLayout === "full" || termLayout === "collapsed") return;
    const el = e.currentTarget;
    el.classList.add("active");
    const container = mainRef.current;
    if (!container) return;
    const move = (ev: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      useStore.getState().setTermHeight(rect.bottom - ev.clientY);
    };
    const up = () => {
      el.classList.remove("active");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  // Compute terminal section height
  const termSection =
    termLayout === "full"
      ? "flex-1"
      : termLayout === "half"
        ? "flex-1"
        : // "panel" mode uses fixed pixel height
          undefined;

  return (
    <div className="scanlines vignette relative flex h-dvh flex-col overflow-hidden">
      <div className="scanbeam" />
      <Header />
      <div className="flex min-h-0 flex-1">
        {sidebarOpen && termLayout !== "full" && <Sidebar />}
        <main ref={mainRef} className="flex min-w-0 flex-1 flex-col">
          {/* Editor area — shown unless terminal is full-screen */}
          {showEditor && (
            <div
              className={`relative min-h-0 ${
                termLayout === "half" ? "flex-1" : "flex-1"
              }`}
              style={
                termLayout === "panel" && showTerminal
                  ? { flex: `1 1 0`, minHeight: 80 }
                  : undefined
              }
            >
              <EditorArea />
            </div>
          )}

          {/* Drag splitter — shown in "panel" and "half" modes */}
          {showTerminal && showEditor && (
            <div
              onPointerDown={onSplitterDown}
              className="drag-x relative h-[7px] shrink-0 border-t border-[var(--border)] bg-[var(--panel)]"
            >
              <div className="drag-bar absolute top-1/2 left-1/2 h-[3px] w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--border)] transition-colors" />
            </div>
          )}

          {/* Terminal section */}
          {showTerminal && (
            <div
              className={`shrink-0 overflow-hidden ${termSection || ""}`}
              style={
                termLayout === "panel"
                  ? { height: termHeight, flexShrink: 0 }
                  : termLayout === "full"
                    ? { flex: "1 1 0" }
                    : undefined
              }
            >
              <TerminalPanel />
            </div>
          )}
        </main>
      </div>
      <StatusBar />
      <Toasts />
    </div>
  );
}
