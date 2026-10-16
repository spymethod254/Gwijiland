import { NextRequest } from "next/server";
import { askpassEnv, getCreds } from "@/lib/github";
import { createSession, execIntoSession, getSession } from "@/lib/pty";
import { safeJoin, toRel } from "@/lib/workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const shq = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;

/**
 * Runs an authenticated git operation server-side and streams stdout/stderr
 * into a live terminal session via SSE. The token travels only through
 * GIT_ASKPASS env vars + a 0700 helper script — never in argv or output.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    sessionId?: string;
    op?: "clone" | "pull" | "push" | "commitPush";
    cloneUrl?: string;
    dir?: string;
    message?: string;
  } | null;
  if (!body?.op) return Response.json({ error: "op required" }, { status: 400 });

  const creds = await getCreds();
  if (!creds) return Response.json({ error: "GitHub not connected" }, { status: 401 });

  const sessionId =
    body.sessionId && getSession(body.sessionId)
      ? body.sessionId
      : createSession().id;

  let command = "";
  let echo = "";

  switch (body.op) {
    case "clone": {
      if (!body.cloneUrl) return Response.json({ error: "cloneUrl required" }, { status: 400 });
      command = `git clone ${shq(body.cloneUrl)}`;
      echo = `git clone ${body.cloneUrl}`;
      break;
    }
    case "pull": {
      const dir = safeJoin(body.dir || ".");
      command = `git -C ${shq(dir)} pull --no-edit`;
      echo = `git -C ${toRel(dir)} pull`;
      break;
    }
    case "push": {
      const dir = safeJoin(body.dir || ".");
      command = `git -C ${shq(dir)} push`;
      echo = `git -C ${toRel(dir)} push`;
      break;
    }
    case "commitPush": {
      const dir = safeJoin(body.dir || ".");
      const msg = (body.message || `update from gwijiland`).slice(0, 200);
      command =
        `git -C ${shq(dir)} add -A && ` +
        `{ git -C ${shq(dir)} commit -m ${shq(msg)} || true; } && ` +
        `git -C ${shq(dir)} push`;
      echo = `git -C ${toRel(dir)} add -A && git commit -m "${msg}" && git push`;
      break;
    }
    default:
      return Response.json({ error: "unknown op" }, { status: 400 });
  }

  const { code } = await execIntoSession(sessionId, command, {
    env: askpassEnv(creds),
    echo,
  });
  return Response.json({ ok: code === 0, code, sessionId });
}
