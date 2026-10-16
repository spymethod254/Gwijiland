import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";
import { safeJoin } from "@/lib/workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const p = new URL(req.url).searchParams.get("path");
  try {
    const abs = safeJoin(p);
    const st = fs.statSync(abs);
    if (st.isDirectory()) throw new Error("cannot download a directory");
    const buf = fs.readFileSync(abs);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(
          path.basename(abs),
        )}"`,
        "Content-Length": String(buf.length),
      },
    });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 400 });
  }
}
