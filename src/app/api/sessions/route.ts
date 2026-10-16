import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { terminalSessions } from "@/db/schema";
import { createSession, kill, listSessions } from "@/lib/pty";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return Response.json({ sessions: listSessions() });
}

export async function POST(req: NextRequest) {
  let body: { cwd?: string; title?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* empty body ok */
  }
  const sess = createSession(body.cwd, body.title);
  try {
    await db
      .insert(terminalSessions)
      .values({
        id: sess.id,
        title: sess.title,
        cwd: sess.cwd,
        pid: sess.proc?.pid ?? null,
        alive: true,
      })
      .onConflictDoNothing();
  } catch {
    /* db best-effort */
  }
  return Response.json({
    session: {
      id: sess.id,
      title: sess.title,
      cwd: sess.cwd,
      createdAt: sess.createdAt,
      alive: sess.alive,
    },
  });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (id) kill(id);
  try {
    if (id) {
      await db
        .update(terminalSessions)
        .set({ alive: false, closedAt: new Date() })
        .where(eq(terminalSessions.id, id));
    }
  } catch {
    /* best-effort */
  }
  return Response.json({ ok: true });
}
