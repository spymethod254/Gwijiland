import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";
import { isBinaryBuffer, safeJoin, toRel } from "@/lib/workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_EDIT_BYTES = 1_500_000;

export async function GET(req: NextRequest) {
  const p = new URL(req.url).searchParams.get("path");
  try {
    const abs = safeJoin(p);
    const st = fs.statSync(abs);
    if (st.isDirectory()) throw new Error("is a directory");
    if (st.size > MAX_EDIT_BYTES) {
      return Response.json({
        path: toRel(abs),
        tooLarge: true,
        size: st.size,
        content: "",
      });
    }
    const buf = fs.readFileSync(abs);
    if (isBinaryBuffer(buf)) {
      return Response.json({ path: toRel(abs), binary: true, size: st.size, content: "" });
    }
    return Response.json({ path: toRel(abs), size: st.size, content: buf.toString("utf8") });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    path?: string;
    content?: string;
  } | null;
  if (!body?.path || typeof body.content !== "string") {
    return Response.json({ error: "path + content required" }, { status: 400 });
  }
  try {
    const abs = safeJoin(body.path);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, body.content, "utf8");
    return Response.json({ ok: true, path: toRel(abs) });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 400 });
  }
}
