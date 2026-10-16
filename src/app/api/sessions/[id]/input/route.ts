import { NextRequest } from "next/server";
import { db } from "@/db";
import { commandHistory } from "@/db/schema";
import { getSession, write } from "@/lib/pty";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SECRET_HINTS = ["token", "password", "passwd", "secret", "api_key", "apikey"];

function commitHistory(sessionId: string, cmd: string) {
  const clean = cmd.trim();
  if (!clean || clean.length > 500) return;
  const lower = clean.toLowerCase();
  if (SECRET_HINTS.some((h) => lower.includes(h))) return;
  db.insert(commandHistory)
    .values({ sessionId, command: clean })
    .catch(() => undefined);
}

/** Receives keystrokes from the browser terminal and forwards them to the pty. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = getSession(id);
  const body = (await req.json().catch(() => null)) as { d?: string } | null;
  if (!session || !body || typeof body.d !== "string") {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  // crude line tracking so we can persist command history
  for (const ch of body.d) {
    if (ch === "\r" || ch === "\n") {
      session.lineBuf = session.lineBuf.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "");
      commitHistory(id, session.lineBuf);
      session.lineBuf = "";
    } else if (ch === "\x7f" || ch === "\b") {
      session.lineBuf = session.lineBuf.slice(0, -1);
    } else if (ch === "\x03" || ch === "\x15") {
      session.lineBuf = "";
    } else if (ch >= " " && ch !== "\x7f") {
      session.lineBuf += ch;
    }
  }

  const ok = write(id, body.d);
  return Response.json({ ok });
}
