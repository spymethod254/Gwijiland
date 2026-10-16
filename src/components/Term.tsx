"use client";

import { useEffect, useRef } from "react";
import { Terminal as XTerm, type ITheme } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { useStore, type ThemeId } from "@/store/useStore";
import "@xterm/xterm/css/xterm.css";

const THEMES: Record<ThemeId, ITheme> = {
  phosphor: {
    background: "#050805",
    foreground: "#c7d9c9",
    cursor: "#4ade80",
    cursorAccent: "#052e16",
    selectionBackground: "rgba(74, 222, 128, 0.28)",
    black: "#0a0f0a",
    red: "#f87171",
    green: "#4ade80",
    yellow: "#facc15",
    blue: "#60a5fa",
    magenta: "#c084fc",
    cyan: "#22d3ee",
    white: "#d7e2d9",
    brightBlack: "#47534a",
    brightRed: "#fca5a5",
    brightGreen: "#86efac",
    brightYellow: "#fde047",
    brightBlue: "#93c5fd",
    brightMagenta: "#d8b4fe",
    brightCyan: "#67e8f9",
    brightWhite: "#f8fafc",
  },
  amber: {
    background: "#080604",
    foreground: "#d8caa9",
    cursor: "#fbbf24",
    cursorAccent: "#451a03",
    selectionBackground: "rgba(251, 191, 36, 0.28)",
    black: "#120d06",
    red: "#f87171",
    green: "#a3e635",
    yellow: "#fbbf24",
    blue: "#7dd3fc",
    magenta: "#f0abfc",
    cyan: "#5eead4",
    white: "#e6d8bc",
    brightBlack: "#5c5140",
    brightRed: "#fca5a5",
    brightGreen: "#bef264",
    brightYellow: "#fde047",
    brightBlue: "#bae6fd",
    brightMagenta: "#f5d0fe",
    brightCyan: "#99f6e4",
    brightWhite: "#faf6ea",
  },
  ice: {
    background: "#04070a",
    foreground: "#c2d4e4",
    cursor: "#38bdf8",
    cursorAccent: "#082f49",
    selectionBackground: "rgba(56, 189, 248, 0.28)",
    black: "#0a0f16",
    red: "#fb7185",
    green: "#34d399",
    yellow: "#fbbf24",
    blue: "#38bdf8",
    magenta: "#a78bfa",
    cyan: "#22d3ee",
    white: "#d3e2ef",
    brightBlack: "#48586b",
    brightRed: "#fda4af",
    brightGreen: "#6ee7b7",
    brightYellow: "#fcd34d",
    brightBlue: "#7dd3fc",
    brightMagenta: "#c4b5fd",
    brightCyan: "#67e8f9",
    brightWhite: "#f1f5f9",
  },
};

export default function Term({ id, active }: { id: string; active: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const theme = useStore((s) => s.theme);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const term = new XTerm({
      cursorBlink: true,
      cursorStyle: "bar",
      cursorInactiveStyle: "outline",
      fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: 13,
      lineHeight: 1.25,
      letterSpacing: 0.2,
      scrollback: 12000,
      tabStopWidth: 4,
      drawBoldTextInBrightColors: true,
      theme: THEMES[useStore.getState().theme],
      allowTransparency: true,
      rightClickSelectsWord: true,
      macOptionIsMeta: true,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(host);
    termRef.current = term;
    fitRef.current = fit;

    const sendResize = () => {
      fetch(`/api/sessions/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resize", cols: term.cols, rows: term.rows }),
      }).catch(() => undefined);
    };
    const fitTimer = setTimeout(() => {
      try {
        fit.fit();
        sendResize();
      } catch {
        /* host hidden */
      }
    }, 40);

    const es = new EventSource(`/api/sessions/${id}/stream`);
    es.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as
          | { t: "replay"; d: string; alive: boolean; title: string }
          | { t: "out"; d: string }
          | { t: "exit"; code: number }
          | { t: "ping" };
        if (msg.t === "replay") {
          term.reset();
          if (msg.d) term.write(msg.d);
          if (!msg.alive) useStore.getState().updateSession(id, { alive: false });
        } else if (msg.t === "out") {
          term.write(msg.d);
        } else if (msg.t === "exit") {
          useStore.getState().updateSession(id, { alive: false });
          term.write(`\r\n\x1b[38;5;245m[press + to spawn a fresh tty]\x1b[0m\r\n`);
        }
      } catch {
        /* malformed frame */
      }
    };

    const dataSub = term.onData((d) => {
      fetch(`/api/sessions/${id}/input`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ d }),
      }).catch(() => undefined);
    });

    const titleSub = term.onTitleChange((title) => {
      if (!title) return;
      useStore.getState().updateSession(id, { title });
      fetch(`/api/sessions/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rename", title }),
      }).catch(() => undefined);
    });

    term.attachCustomKeyEventHandler((e) => {
      if (e.type !== "keydown") return true;
      if (e.ctrlKey && e.shiftKey && e.code === "KeyC" && term.hasSelection()) {
        void navigator.clipboard.writeText(term.getSelection()).catch(() => undefined);
        return false;
      }
      if (e.ctrlKey && e.shiftKey && e.code === "KeyV") {
        void navigator.clipboard
          .readText()
          .then((text) => {
            if (text) {
              fetch(`/api/sessions/${id}/input`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ d: text }),
              }).catch(() => undefined);
            }
          })
          .catch(() => undefined);
        return false;
      }
      return true;
    });

    const ro = new ResizeObserver(() => {
      try {
        fit.fit();
        sendResize();
      } catch {
        /* hidden */
      }
    });
    ro.observe(host);

    return () => {
      clearTimeout(fitTimer);
      es.close();
      ro.disconnect();
      dataSub.dispose();
      titleSub.dispose();
      term.dispose();
      termRef.current = null;
    };
  }, [id]);

  useEffect(() => {
    const term = termRef.current;
    if (term) term.options.theme = THEMES[theme];
  }, [theme]);

  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => {
      try {
        fitRef.current?.fit();
      } catch {
        /* ignore */
      }
      termRef.current?.focus();
    }, 40);
    return () => clearTimeout(t);
  }, [active]);

  return (
    <div
      role="presentation"
      onClick={() => termRef.current?.focus()}
      className={`absolute inset-0 overflow-hidden bg-[var(--term-bg)] ${
        active ? "" : "invisible"
      }`}
    >
      <div ref={hostRef} className="h-full w-full" />
    </div>
  );
}
