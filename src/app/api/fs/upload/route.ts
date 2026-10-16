import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";
import { safeJoin, toRel } from "@/lib/workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_FILE = 50 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const dir = (form.get("dir") as string) || ".";
    const files = form.getAll("files").filter((f): f is File => f instanceof File);
    if (!files.length) return Response.json({ error: "no files" }, { status: 400 });

    const targetDir = safeJoin(dir);
    fs.mkdirSync(targetDir, { recursive: true });

    const saved: string[] = [];
    for (const file of files) {
      if (file.size > MAX_FILE) {
        return Response.json({ error: `${file.name} exceeds 50MB limit` }, { status: 413 });
      }
      const buf = Buffer.from(await file.arrayBuffer());
      const dest = safeJoin(path.posix.join(toRel(targetDir), path.basename(file.name)));
      fs.writeFileSync(dest, buf);
      saved.push(toRel(dest));
    }
    return Response.json({ ok: true, saved });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 400 });
  }
}
