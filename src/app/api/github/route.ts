import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { NextRequest } from "next/server";
import { askpassEnv, clearCreds, getCreds, ghApi, saveCreds } from "@/lib/github";
import { toRel, WORKSPACE } from "@/lib/workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function git(args: string[], cwd: string): Promise<string> {
  return new Promise((resolve) => {
    execFile(
      "git",
      args,
      { cwd, timeout: 8000, env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } },
      (err, stdout) => resolve(err ? "" : stdout.trim()),
    );
  });
}

interface LocalRepo {
  dir: string;
  branch: string;
  dirty: number;
  remote: string;
}

async function scanLocalRepos(): Promise<LocalRepo[]> {
  const repos: LocalRepo[] = [];
  const candidates: string[] = [WORKSPACE];
  try {
    for (const name of fs.readdirSync(WORKSPACE)) {
      if (name === ".system" || name.startsWith(".")) continue;
      const full = path.join(WORKSPACE, name);
      try {
        if (fs.statSync(full).isDirectory()) candidates.push(full);
      } catch {
        /* skip */
      }
    }
  } catch {
    /* empty workspace */
  }
  for (const dir of candidates) {
    if (!fs.existsSync(path.join(dir, ".git"))) continue;
    const [branch, status, remote] = await Promise.all([
      git(["rev-parse", "--abbrev-ref", "HEAD"], dir),
      git(["status", "--porcelain"], dir),
      git(["config", "--get", "remote.origin.url"], dir),
    ]);
    repos.push({
      dir: toRel(dir),
      branch: branch || "(no branch)",
      dirty: status ? status.split("\n").filter(Boolean).length : 0,
      remote: remote.replace(/\/\/[^@]*@/, "//***@"),
    });
  }
  return repos;
}

export async function GET() {
  const local = await scanLocalRepos();
  const creds = await getCreds();
  if (!creds) return Response.json({ connected: false, local });

  const [userRes, reposRes] = await Promise.all([
    ghApi("/user", creds.token),
    ghApi("/user/repos?sort=updated&per_page=50&affiliation=owner,collaborator", creds.token),
  ]);
  if (userRes.status === 401 || reposRes.status === 401) {
    return Response.json({ connected: false, error: "token rejected", local });
  }
  const user = (await userRes.json()) as Record<string, unknown>;
  const rawRepos = (await reposRes.json()) as Array<Record<string, unknown>>;
  const repos = (Array.isArray(rawRepos) ? rawRepos : []).map((r) => ({
    name: r.name,
    fullName: r.full_name,
    private: r.private,
    cloneUrl: r.clone_url,
    defaultBranch: r.default_branch,
    description: r.description,
    updatedAt: r.updated_at,
    language: r.language,
  }));
  return Response.json({
    connected: true,
    user: { login: user.login || creds.login, avatarUrl: user.avatar_url || creds.avatarUrl },
    repos,
    local,
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    action?: string;
    token?: string;
    name?: string;
    private?: boolean;
  } | null;

  switch (body?.action) {
    case "save": {
      const token = (body.token || "").trim();
      if (!token) return Response.json({ error: "token required" }, { status: 400 });
      const res = await ghApi("/user", token);
      if (!res.ok) {
        return Response.json(
          { error: `GitHub rejected the token (HTTP ${res.status})` },
          { status: 401 },
        );
      }
      const user = (await res.json()) as Record<string, unknown>;
      await saveCreds({
        token,
        login: String(user.login || ""),
        avatarUrl: String(user.avatar_url || ""),
      });
      return Response.json({ ok: true, login: user.login });
    }
    case "disconnect":
      await clearCreds();
      return Response.json({ ok: true });
    case "createRepo": {
      const creds = await getCreds();
      if (!creds) return Response.json({ error: "not connected" }, { status: 401 });
      const name = (body.name || "").trim();
      if (!/^[\w.-]+$/.test(name)) {
        return Response.json({ error: "invalid repo name" }, { status: 400 });
      }
      const res = await ghApi("/user/repos", creds.token, {
        method: "POST",
        body: { name, private: !!body.private, auto_init: true },
      });
      const json = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        return Response.json(
          { error: String((json as { message?: string }).message || "failed") },
          { status: res.status },
        );
      }
      return Response.json({ ok: true, repo: { fullName: json.full_name, cloneUrl: json.clone_url } });
    }
    default:
      return Response.json({ error: "unknown action" }, { status: 400 });
  }
}

export { askpassEnv };
