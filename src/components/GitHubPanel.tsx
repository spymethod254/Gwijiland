"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BookMarked,
  Eye,
  EyeOff,
  GitBranch,
  GitCommitHorizontal,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Unplug,
} from "lucide-react";
import { GitHubMark } from "@/components/icons";
import { ensureActiveSession } from "@/store/actions";
import { useStore } from "@/store/useStore";

interface Repo {
  name: string;
  fullName: string;
  private: boolean;
  cloneUrl: string;
  defaultBranch: string;
  description: string | null;
  updatedAt: string;
  language: string | null;
}

interface LocalRepo {
  dir: string;
  branch: string;
  dirty: number;
  remote: string;
}

interface GhState {
  connected: boolean;
  error?: string;
  user?: { login: string; avatarUrl: string };
  repos?: Repo[];
  local: LocalRepo[];
}

export default function GitHubPanel() {
  const [state, setState] = useState<GhState | null>(null);
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [newRepo, setNewRepo] = useState("");
  const [commitMsg, setCommitMsg] = useState<Record<string, string>>({});
  const toast = useStore((s) => s.toast);
  const refreshTree = useStore((s) => s.refreshTree);
  const termLayout = useStore((s) => s.termLayout);
  const setTermLayout = useStore((s) => s.setTermLayout);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/github");
      const json = (await res.json()) as GhState;
      setState(json);
    } catch {
      setState({ connected: false, local: [], error: "network error" });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const connect = async () => {
    if (!token.trim()) return;
    setBusy("connect");
    const res = await fetch("/api/github", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save", token }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    if (res.ok) {
      setToken("");
      toast(`connected as @${json.login}`, "ok");
      void refresh();
    } else {
      toast(json.error || "connection failed", "err");
    }
  };

  const disconnect = async () => {
    setBusy("disconnect");
    await fetch("/api/github", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "disconnect" }),
    });
    setBusy(null);
    toast("github token removed from server", "info");
    void refresh();
  };

  const createRepo = async () => {
    if (!newRepo.trim()) return;
    setBusy("createRepo");
    const res = await fetch("/api/github", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "createRepo", name: newRepo.trim(), private: true }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    if (res.ok) {
      setNewRepo("");
      toast(`created ${json.repo.fullName} (private)`, "ok");
      void refresh();
    } else {
      toast(json.error || "failed to create repo", "err");
    }
  };

  const exec = async (
    key: string,
    body: Record<string, unknown>,
    doneMsg: string,
  ) => {
    setBusy(key);
    if (termLayout === "collapsed") setTermLayout("panel");
    const sessionId = await ensureActiveSession();
    const res = await fetch("/api/github/exec", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, ...body }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    if (res.ok && json.ok !== false) {
      toast(doneMsg, "ok");
    } else {
      toast(json.error || "operation failed — see terminal", "err");
    }
    void refresh();
    void refreshTree();
  };

  if (!state) {
    return (
      <div className="flex items-center gap-2 px-3 py-4 text-[11px] text-[var(--dim)]">
        <Loader2 size={12} className="animate-spin" /> contacting github…
      </div>
    );
  }

  if (!state.connected) {
    return (
      <div className="space-y-3 p-3 text-[12px]">
        <div className="flex items-center gap-2 text-[var(--fg)]">
          <GitHubMark width={16} height={16} className="text-[var(--dim)]" />
          <span className="font-semibold">connect github</span>
        </div>
        <p className="leading-relaxed text-[var(--dim)]">
          paste a{" "}
          <a
            href="https://github.com/settings/tokens?type=beta"
            target="_blank"
            rel="noreferrer"
            className="text-[var(--acc)] underline decoration-dotted underline-offset-2"
          >
            fine-grained token
          </a>{" "}
          (or classic PAT) with <code className="text-[var(--fg)]">repo</code> +{" "}
          <code className="text-[var(--fg)]">contents</code> access. it&apos;s stored
          server-side only — never in this browser.
        </p>
        {state.error && (
          <p className="rounded border border-red-500/30 bg-red-500/10 px-2 py-1 text-[11px] text-red-400">
            {state.error}
          </p>
        )}
        <div className="relative">
          <input
            type={showToken ? "text" : "password"}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void connect()}
            placeholder="github_pat_… / ghp_…"
            spellCheck={false}
            autoComplete="off"
            className="h-8 w-full rounded-md border border-[var(--border)] bg-black/30 px-2 pr-8 font-mono text-[11px] text-[var(--fg)] outline-none placeholder:text-[var(--dim)]/60 focus:border-[var(--acc)]/50"
          />
          <button
            onClick={() => setShowToken(!showToken)}
            className="absolute top-1/2 right-2 -translate-y-1/2 text-[var(--dim)] hover:text-[var(--fg)]"
          >
            {showToken ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        </div>
        <button
          onClick={() => void connect()}
          disabled={!!busy || !token.trim()}
          className="flex h-8 w-full items-center justify-center gap-2 rounded-md bg-[var(--acc)] text-[11px] font-bold tracking-wider text-[var(--acc-ink)] uppercase transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {busy === "connect" ? <Loader2 size={13} className="animate-spin" /> : null}
          connect
        </button>
        <LocalRepos local={state.local} busy={busy} exec={exec} commitMsg={commitMsg} setCommitMsg={setCommitMsg} />
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3 text-[12px]">
      {/* user card */}
      <div className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--panel2)] p-2">
        {state.user?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={state.user.avatarUrl} alt="" className="h-6 w-6 rounded-full" />
        ) : (
          <GitHubMark width={20} height={20} className="text-[var(--dim)]" />
        )}
        <div className="min-w-0">
          <div className="truncate text-[12px] font-semibold text-[var(--fg)]">
            @{state.user?.login}
          </div>
          <div className="text-[9px] tracking-wider text-[var(--acc)] uppercase">
            session linked
          </div>
        </div>
        <span className="flex-1" />
        <button
          title="Refresh"
          onClick={() => void refresh()}
          className="rounded p-1 text-[var(--dim)] hover:text-[var(--acc)]"
        >
          <RefreshCw size={12} className={busy === "refresh" ? "animate-spin" : ""} />
        </button>
        <button
          title="Disconnect"
          disabled={!!busy}
          onClick={() => void disconnect()}
          className="rounded p-1 text-[var(--dim)] hover:text-red-400"
        >
          <Unplug size={13} />
        </button>
      </div>

      {/* create repo */}
      <div className="flex gap-1.5">
        <input
          value={newRepo}
          onChange={(e) => setNewRepo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void createRepo()}
          placeholder="new private repo…"
          spellCheck={false}
          className="h-7 min-w-0 flex-1 rounded-md border border-[var(--border)] bg-black/30 px-2 font-mono text-[11px] text-[var(--fg)] outline-none placeholder:text-[var(--dim)]/60 focus:border-[var(--acc)]/50"
        />
        <button
          onClick={() => void createRepo()}
          disabled={!!busy || !newRepo.trim()}
          title="Create private repo"
          className="flex h-7 items-center gap-1 rounded-md border border-[var(--border)] px-2 text-[10px] text-[var(--dim)] hover:border-[var(--acc)]/40 hover:text-[var(--acc)] disabled:opacity-40"
        >
          {busy === "createRepo" ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
          create
        </button>
      </div>

      {/* remote repos */}
      <div className="space-y-1">
        <div className="text-[9px] font-semibold tracking-[0.18em] text-[var(--dim)] uppercase">
          your repositories
        </div>
        <div className="max-h-56 space-y-1 overflow-y-auto pr-0.5">
          {(state.repos || []).map((r) => (
            <div
              key={r.fullName}
              className="group flex items-center gap-2 rounded-md border border-transparent px-1.5 py-1.5 hover:border-[var(--border)] hover:bg-[var(--panel2)]"
            >
              <BookMarked size={13} className="shrink-0 text-[var(--dim)]" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[12px] text-[var(--fg)]">{r.name}</span>
                  {r.private && <Lock size={9} className="shrink-0 text-[var(--acc)]" />}
                </div>
                {r.description && (
                  <div className="truncate text-[10px] text-[var(--dim)]">{r.description}</div>
                )}
              </div>
              <button
                onClick={() =>
                  void exec(`clone:${r.fullName}`, { op: "clone", cloneUrl: r.cloneUrl }, `cloned ${r.fullName}`)
                }
                disabled={busy === `clone:${r.fullName}`}
                title={`Clone ${r.fullName} into ~/gwijiland`}
                className="flex shrink-0 items-center gap-1 rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-[var(--dim)] hover:border-[var(--acc)]/40 hover:text-[var(--acc)]"
              >
                {busy === `clone:${r.fullName}` ? (
                  <Loader2 size={10} className="animate-spin" />
                ) : (
                  <ArrowDownToLine size={10} />
                )}
                clone
              </button>
            </div>
          ))}
          {state.repos?.length === 0 && (
            <p className="px-1 py-2 text-[11px] text-[var(--dim)]">no repositories yet.</p>
          )}
        </div>
      </div>

      <LocalRepos local={state.local} busy={busy} exec={exec} commitMsg={commitMsg} setCommitMsg={setCommitMsg} />
    </div>
  );
}

function LocalRepos({
  local,
  busy,
  exec,
  commitMsg,
  setCommitMsg,
}: {
  local: LocalRepo[];
  busy: string | null;
  exec: (key: string, body: Record<string, unknown>, doneMsg: string) => Promise<void>;
  commitMsg: Record<string, string>;
  setCommitMsg: (m: Record<string, string>) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="text-[9px] font-semibold tracking-[0.18em] text-[var(--dim)] uppercase">
        local clones · ~/gwijiland
      </div>
      {local.length === 0 && (
        <p className="px-1 py-1 text-[11px] text-[var(--dim)]">
          nothing cloned yet — use <code>git clone</code> or a clone button above.
        </p>
      )}
      {local.map((r) => (
        <div
          key={r.dir}
          className="space-y-1.5 rounded-md border border-[var(--border)] bg-[var(--panel2)] p-2"
        >
          <div className="flex items-center gap-1.5">
            <GitBranch size={12} className="shrink-0 text-[var(--acc)]" />
            <span className="truncate font-mono text-[11px] text-[var(--fg)]">
              {r.dir === "." ? "~/gwijiland (root)" : r.dir}
            </span>
            <span className="rounded border border-[var(--border)] px-1 py-px text-[9px] text-[var(--dim)]">
              {r.branch}
            </span>
            <span className="flex-1" />
            {r.dirty > 0 && (
              <span className="text-[9px] text-[var(--acc)]">{r.dirty} changed</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <input
              value={commitMsg[r.dir] || ""}
              onChange={(e) => setCommitMsg({ ...commitMsg, [r.dir]: e.target.value })}
              placeholder="commit message…"
              spellCheck={false}
              className="h-6 min-w-0 flex-1 rounded border border-[var(--border)] bg-black/30 px-1.5 font-mono text-[10px] text-[var(--fg)] outline-none placeholder:text-[var(--dim)]/60 focus:border-[var(--acc)]/50"
            />
            <button
              title="Pull latest"
              disabled={!!busy}
              onClick={() => void exec(`pull:${r.dir}`, { op: "pull", dir: r.dir }, `pulled ${r.dir}`)}
              className="flex h-6 items-center gap-1 rounded border border-[var(--border)] px-1.5 text-[10px] text-[var(--dim)] hover:border-[var(--acc)]/40 hover:text-[var(--acc)] disabled:opacity-40"
            >
              {busy === `pull:${r.dir}` ? <Loader2 size={10} className="animate-spin" /> : <ArrowDownToLine size={10} />}
              pull
            </button>
            <button
              title="git add -A && commit && push"
              disabled={!!busy}
              onClick={() =>
                void exec(
                  `push:${r.dir}`,
                  { op: "commitPush", dir: r.dir, message: commitMsg[r.dir] || undefined },
                  `pushed ${r.dir} → origin`,
                )
              }
              className="flex h-6 items-center gap-1 rounded border border-[var(--acc)]/40 px-1.5 text-[10px] font-semibold text-[var(--acc)] hover:bg-[var(--acc)]/10 disabled:opacity-40"
            >
              {busy === `push:${r.dir}` ? (
                <Loader2 size={10} className="animate-spin" />
              ) : (
                <GitCommitHorizontal size={10} />
              )}
              {busy === `push:${r.dir}` ? "" : <ArrowUpFromLine size={10} />}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
