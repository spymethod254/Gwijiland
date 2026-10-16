import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { terminalSessions } from "@/db/schema";
import { getSession, kill, resize, write } from "@/lib/pty";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST: resize {cols,rows} | type {data} (programmatic typing, e.g. quick actions) */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = getSession(id);
  if (!session) return Response.json({ error: "not found" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as {
    action?: string;
    cols?: number;
    rows?: number;
    data?: string;
    title?: string;
  } | null;

  switch (body?.action) {
    case "resize":
      resize(id, body.cols ?? 100, body.rows ?? 28);
      return Response.json({ ok: true });
    case "type":
      if (typeof body.data === "string") write(id, body.data);
      return Response.json({ ok: true });
    case "rename":
      if (body.title) session.title = body.title.slice(0, 60);
      return Response.json({ ok: true });
    default:
      return Response.json({ error: "unknown action" }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  kill(id);
  try {
    await db
      .update(terminalSessions)
      .set({ alive: false, closedAt: new Date() })
      .where(eq(terminalSessions.id, id));
  } catch {
    /* best-effort */
  }
  return Response.json({ ok: true });
}
