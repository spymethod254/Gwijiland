import fs from "fs";
import path from "path";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { WORKSPACE } from "./workspace";

export interface GhCreds {
  token: string;
  login: string;
  avatarUrl: string;
}

export async function getCreds(): Promise<GhCreds | null> {
  try {
    const rows = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "github"))
      .limit(1);
    if (!rows[0]) return null;
    const parsed = JSON.parse(rows[0].value) as Partial<GhCreds>;
    if (!parsed.token) return null;
    return {
      token: parsed.token,
      login: parsed.login || "",
      avatarUrl: parsed.avatarUrl || "",
    };
  } catch {
    return null;
  }
}

export async function saveCreds(creds: GhCreds): Promise<void> {
  await db
    .insert(settings)
    .values({ key: "github", value: JSON.stringify(creds), updatedAt: new Date() })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: JSON.stringify(creds), updatedAt: new Date() },
    });
}

export async function clearCreds(): Promise<void> {
  await db.delete(settings).where(eq(settings.key, "github"));
}

export async function ghApi(
  endpoint: string,
  token: string,
  init: { method?: string; body?: unknown } = {},
): Promise<Response> {
  return fetch(`https://api.github.com${endpoint}`, {
    method: init.method || "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "gwijiland-terminal",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
}

/**
 * Writes (once) a GIT_ASKPASS helper that reads credentials from env vars, so
 * `git clone/push/pull https://...` commands never contain the token in argv
 * or terminal output. Returns the env vars to combine with spawned commands.
 */
export function askpassEnv(creds: GhCreds): Record<string, string> {
  const scriptPath = path.join(WORKSPACE, ".system", "git-askpass.sh");
  const script = [
    "#!/bin/sh",
    'case "$1" in',
    '  *sername*|*[Uu]ser*) printf "%s" "$GWIJILAND_GH_USER" ;;',
    '  *) printf "%s" "$GWIJILAND_GH_TOKEN" ;;',
    "esac",
    "",
  ].join("\n");
  try {
    const existing = fs.existsSync(scriptPath) ? fs.readFileSync(scriptPath, "utf8") : "";
    if (existing !== script) fs.writeFileSync(scriptPath, script, { mode: 0o700 });
    else fs.chmodSync(scriptPath, 0o700);
  } catch {
    /* best effort */
  }
  return {
    GIT_ASKPASS: scriptPath,
    GIT_TERMINAL_PROMPT: "0",
    GWIJILAND_GH_TOKEN: creds.token,
    GWIJILAND_GH_USER: creds.login || creds.token,
  };
}
