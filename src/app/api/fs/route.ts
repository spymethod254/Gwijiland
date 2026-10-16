import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";
import { safeJoin, toRel, WORKSPACE } from "@/lib/workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export interface FsEntryDto {
  name: string;
  path: string;
  type: "dir" | "file";
  size: number;
  mtime: number;
  isRepo?: boolean;
}

const SKIP_DIRS = new Set([".git", ".system"]);
const LIST_CAP = 400;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dir = searchParams.get("dir") || ".";
  try {
    const abs = safeJoin(dir);
    const st = fs.statSync(abs);
    if (!st.isDirectory()) {
      return Response.json({ error: "not a directory" }, { status: 400 });
    }
    const names = fs.readdirSync(abs).filter((n) => !SKIP_DIRS.has(n));
    const entries: FsEntryDto[] = [];
    for (const name of names.slice(0, LIST_CAP)) {
      const full = path.join(abs, name);
      try {
        const s = fs.statSync(full);
        const isDir = s.isDirectory();
        entries.push({
          name,
          path: toRel(full),
          type: isDir ? "dir" : "file",
          size: isDir ? 0 : s.size,
          mtime: s.mtimeMs,
          isRepo: isDir ? fs.existsSync(path.join(full, ".git")) : undefined,
        });
      } catch {
        /* vanished */
      }
    }
    entries.sort((a, b) =>
      a.type !== b.type ? (a.type === "dir" ? -1 : 1) : a.name.localeCompare(b.name),
    );
    return Response.json({
      dir: toRel(abs),
      entries,
      truncated: names.length > LIST_CAP,
      root: toRel(WORKSPACE),
    });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    action?: "mkdir" | "touch" | "rename" | "delete";
    path?: string;
    to?: string;
  } | null;
  if (!body?.action || !body.path) {
    return Response.json({ error: "action + path required" }, { status: 400 });
  }
  try {
    const abs = safeJoin(body.path);
    switch (body.action) {
      case "mkdir":
        fs.mkdirSync(abs, { recursive: true });
        break;
      case "touch":
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.closeSync(fs.openSync(abs, "a"));
        break;
      case "rename": {
        if (!body.to) throw new Error("missing destination");
        const dest = safeJoin(body.to);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.renameSync(abs, dest);
        break;
      }
      case "delete":
        if (abs === WORKSPACE) throw new Error("cannot delete workspace root");
        fs.rmSync(abs, { recursive: true, force: true });
        break;
    }
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 400 });
  }
}
