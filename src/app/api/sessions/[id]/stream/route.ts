import { NextRequest } from "next/server";
import { getSession } from "@/lib/pty";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Server-Sent Events stream for a terminal session.
 * On connect: sends a `replay` message with current scrollback (client resets).
 * Then: `out` chunks live, `exit` when the process dies, `ping` keepalives.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = getSession(id);
  if (!session) {
    return Response.json({ error: "session not found" }, { status: 404 });
  }

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (obj: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        } catch {
          closed = true;
        }
      };

      send({
        t: "replay",
        d: session.scrollback,
        alive: session.alive,
        title: session.title,
      });

      const onData = (d: string) => send({ t: "out", d });
      const onExit = ({ code }: { code: number }) => send({ t: "exit", code });
      const ping = setInterval(() => send({ t: "ping" }), 15_000);

      session.listeners.add(onData);
      session.exitListeners.add(onExit);

      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(ping);
        session.listeners.delete(onData);
        session.exitListeners.delete(onExit);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
