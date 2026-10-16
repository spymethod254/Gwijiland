import fs from "fs";
import os from "os";
import path from "path";

/** Root of the user's virtual home. Everything the terminal/FS API touches lives here. */
export const WORKSPACE = process.env.GWIJILAND_HOME || path.join(os.homedir(), "gwijiland");

fs.mkdirSync(WORKSPACE, { recursive: true });
fs.mkdirSync(path.join(WORKSPACE, ".system"), { recursive: true });

/** Join a client-supplied relative path inside the workspace, refusing traversal. */
export function safeJoin(rel: string | null | undefined): string {
  const clean = (rel || ".").replace(/^[/\\]+/, "");
  const abs = path.normalize(path.join(WORKSPACE, clean));
  if (abs !== WORKSPACE && !abs.startsWith(WORKSPACE + path.sep)) {
    throw new Error(`Forbidden path: ${rel}`);
  }
  return abs;
}

/** Workspace path back to a display-friendly relative path. */
export function toRel(abs: string): string {
  const rel = path.relative(WORKSPACE, abs);
  return rel === "" ? "." : rel.split(path.sep).join("/");
}

export const isBinaryBuffer = (buf: Buffer) => {
  const n = Math.min(buf.length, 2000);
  for (let i = 0; i < n; i++) if (buf[i] === 0) return true;
  return false;
};
