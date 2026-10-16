"use client";

import dynamic from "next/dynamic";
import { AlertTriangle, Download, Save, X } from "lucide-react";
import Welcome from "@/components/Welcome";
import { saveFile, useStore } from "@/store/useStore";

const CodeEditor = dynamic(() => import("@uiw/react-textarea-code-editor"), {
  ssr: false,
});

const LANGS: Record<string, string> = {
  js: "javascript", mjs: "javascript", cjs: "javascript", jsx: "jsx",
  ts: "typescript", tsx: "tsx", json: "json", jsonc: "json", css: "css",
  scss: "css", less: "css", html: "markup", htm: "markup", xml: "markup",
  svg: "markup", md: "markdown", mdx: "markdown", py: "python",
  sh: "bash", bash: "bash", zsh: "bash", yml: "yaml", yaml: "yaml",
  sql: "sql", c: "c", h: "c", cpp: "cpp", cc: "cpp", hpp: "cpp",
  go: "go", rs: "rust", java: "java", rb: "ruby", php: "php",
  toml: "toml", ini: "ini", env: "bash", dockerfile: "docker",
};

function langOf(name: string): string {
  const lower = name.toLowerCase();
  if (lower === "dockerfile" || lower.startsWith("dockerfile.")) return "docker";
  const ext = lower.split(".").pop() || "";
  return LANGS[ext] || "text";
}

const fmtSize = (n?: number) =>
  n === undefined ? "" : n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`;

export default function EditorArea() {
  const openFiles = useStore((s) => s.openFiles);
  const activeFilePath = useStore((s) => s.activeFilePath);
  const setActiveFile = useStore((s) => s.setActiveFile);
  const closeFile = useStore((s) => s.closeFile);
  const updateFileContent = useStore((s) => s.updateFileContent);

  if (openFiles.length === 0) return <Welcome />;

  const active = openFiles.find((f) => f.path === activeFilePath) || openFiles[0];

  return (
    <div className="flex h-full flex-col">
      {/* tab strip */}
      <div className="no-select flex h-9 shrink-0 items-stretch overflow-x-auto border-b border-[var(--border)] bg-[var(--panel)]">
        {openFiles.map((f) => {
          const isActive = f.path === active.path;
          return (
            <div
              key={f.path}
              onClick={() => setActiveFile(f.path)}
              className={`group flex cursor-pointer items-center gap-1.5 border-r border-[var(--border)] px-3 text-[11px] whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-[var(--panel2)] text-[var(--acc)] shadow-[inset_0_2px_0_var(--acc)]"
                  : "text-[var(--dim)] hover:bg-[var(--panel2)]/60 hover:text-[var(--fg)]"
              }`}
            >
              <span className="font-mono">{f.name}</span>
              {f.dirty && <span className="h-1.5 w-1.5 rounded-full bg-[var(--acc)]" />}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeFile(f.path);
                }}
                className="rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/30 hover:text-red-400"
              >
                <X size={11} />
              </button>
            </div>
          );
        })}
        <div className="flex flex-1 items-center justify-end gap-2 px-3">
          <span className="hidden truncate font-mono text-[10px] text-[var(--dim)] md:block">
            ~/{active.path === "." ? "" : active.path} {active.size ? `· ${fmtSize(active.size)}` : ""}
          </span>
          <button
            onClick={() => void saveFile(active.path)}
            disabled={!active.dirty}
            className="flex h-6 items-center gap-1 rounded border border-[var(--border)] px-2 text-[10px] text-[var(--dim)] transition-colors hover:border-[var(--acc)]/40 hover:text-[var(--acc)] disabled:opacity-30"
          >
            <Save size={11} /> save
          </button>
        </div>
      </div>

      {/* content */}
      <div className="min-h-0 flex-1 overflow-auto bg-[var(--panel)]/30">
        {active.binary || active.tooLarge ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-[var(--dim)]">
            <AlertTriangle size={28} className="text-[var(--acc)]/60" />
            <p className="text-[12px]">
              {active.tooLarge
                ? `file too large to edit (${fmtSize(active.size)})`
                : "binary file — cannot render in the editor"}
            </p>
            <a
              href={`/api/fs/download?path=${encodeURIComponent(active.path)}`}
              className="flex items-center gap-1.5 rounded-md border border-[var(--border)] px-3 py-1.5 text-[11px] hover:border-[var(--acc)]/40 hover:text-[var(--acc)]"
            >
              <Download size={12} /> download {active.name}
            </a>
          </div>
        ) : (
          <CodeEditor
            value={active.content}
            language={langOf(active.name)}
            onChange={(e) => updateFileContent(active.path, e.target.value)}
            padding={16}
            data-color-mode="dark"
            spellCheck={false}
            style={{
              backgroundColor: "transparent",
              minHeight: "100%",
              caretColor: "var(--acc)",
            }}
          />
        )}
      </div>
    </div>
  );
}
