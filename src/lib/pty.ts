import { spawn as ptySpawn, type IPty } from "@homebridge/node-pty-prebuilt-multiarch";
import { execFile } from "child_process";
import { WORKSPACE } from "./workspace";

export interface TermSession {
  id: string;
  title: string;
  cwd: string;
  createdAt: number;
  alive: boolean;
  exitCode: number | null;
  scrollback: string;
  proc: IPty | null;
  listeners: Set<(d: string) => void>;
  exitListeners: Set<(info: { code: number }) => void>;
  /** line buffer for command-history capture */
  lineBuf: string;
}

interface Registry {
  sessions: Map<string, TermSession>;
  seq: number;
}

const g = globalThis as unknown as { __gwijiland?: Registry };
if (!g.__gwijiland) g.__gwijiland = { sessions: new Map(), seq: 0 };
const registry = g.__gwijiland;

export const SCROLLBACK_CAP = 800_000;

const PS1 =
  "\\[\\e[38;5;42;1m\\]➜ \\[\\e[0m\\]\\[\\e[38;5;51;1m\\]\\u@gwijiland\\[\\e[0m\\]:\\[\\e[38;5;33;1m\\]\\w\\[\\e[0m\\] \\[\\e[38;5;245m\\]$\\[\\e[0m\\] ";

function id(): string {
  registry.seq += 1;
  return `t${Date.now().toString(36)}${registry.seq.toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

export function createSession(cwd?: string, title?: string): TermSession {
  const sessionCwd = cwd && cwd.startsWith(WORKSPACE) ? cwd : WORKSPACE;
  const sid = id();
  const sess: TermSession = {
    id: sid,
    title: title || `tty-${registry.seq}`,
    cwd: sessionCwd,
    createdAt: Date.now(),
    alive: true,
    exitCode: null,
    scrollback: "",
    proc: null,
    listeners: new Set(),
    exitListeners: new Set(),
    lineBuf: "",
  };

  const env: Record<string, string> = {
    ...(process.env as Record<string, string>),
    TERM: "xterm-256color",
    COLORTERM: "truecolor",
    FORCE_COLOR: "1",
    CLICOLOR: "1",
    PS1,
    GWIJILAND: "1",
  };

  const proc = ptySpawn("/bin/bash", ["--norc", "-i"], {
    name: "xterm-256color",
    cols: 100,
    rows: 28,
    cwd: sessionCwd,
    env,
  });
  sess.proc = proc;

  proc.onData((d) => {
    sess.scrollback += d;
    if (sess.scrollback.length > SCROLLBACK_CAP) {
      sess.scrollback = sess.scrollback.slice(-SCROLLBACK_CAP / 2);
    }
    for (const fn of sess.listeners) {
      try {
        fn(d);
      } catch {
        /* stream closed */
      }
    }
  });

  proc.onExit(({ exitCode }) => {
    sess.alive = false;
    sess.exitCode = exitCode;
    const msg = `\r\n\x1b[38;5;245m── session ${sid} exited (code ${exitCode}) ──\x1b[0m\r\n`;
    emit(sid, msg);
    for (const fn of sess.exitListeners) {
      try {
        fn({ code: exitCode });
      } catch {
        /* noop */
      }
    }
  });

  registry.sessions.set(sid, sess);
  return sess;
}

export function getSession(sid: string): TermSession | undefined {
  return registry.sessions.get(sid);
}

export function listSessions(): Array<{
  id: string;
  title: string;
  cwd: string;
  createdAt: number;
  alive: boolean;
}> {
  return [...registry.sessions.values()].map((s) => ({
    id: s.id,
    title: s.title,
    cwd: s.cwd,
    createdAt: s.createdAt,
    alive: s.alive,
  }));
}

/** Inject raw bytes into a session (visible in every connected browser terminal). */
export function emit(sid: string, data: string): void {
  const s = registry.sessions.get(sid);
  if (!s) return;
  s.scrollback += data;
  if (s.scrollback.length > SCROLLBACK_CAP) {
    s.scrollback = s.scrollback.slice(-SCROLLBACK_CAP / 2);
  }
  for (const fn of s.listeners) {
    try {
      fn(data);
    } catch {
      /* ignore */
    }
  }
}

/** Send keystrokes as if the user typed them. */
export function write(sid: string, data: string): boolean {
  const s = registry.sessions.get(sid);
  if (!s || !s.proc || !s.alive) return false;
  s.proc.write(data);
  return true;
}

export function resize(sid: string, cols: number, rows: number): void {
  const s = registry.sessions.get(sid);
  if (s?.proc && s.alive) {
    try {
      s.proc.resize(Math.max(20, cols), Math.max(4, rows));
    } catch {
      /* ignore */
    }
  }
}

export function kill(sid: string): boolean {
  const s = registry.sessions.get(sid);
  if (!s) return false;
  try {
    s.proc?.kill();
  } catch {
    /* already dead */
  }
  s.alive = false;
  for (const fn of s.exitListeners) {
    try {
      fn({ code: s.exitCode ?? 0 });
    } catch {
      /* noop */
    }
  }
  return true;
}

/**
 * Run a non-interactive command server-side (used for authenticated git ops)
 * and stream its output into a browser terminal session in real time.
 */
export function execIntoSession(
  sid: string,
  command: string,
  opts: { cwd?: string; env?: Record<string, string>; echo?: string } = {},
): Promise<{ code: number; out: string }> {
  const cwd = opts.cwd && opts.cwd.startsWith(WORKSPACE) ? opts.cwd : WORKSPACE;
  if (opts.echo !== undefined) {
    emit(sid, `\x1b[38;5;42;1m➜\x1b[0m \x1b[38;5;245m${opts.echo}\x1b[0m\r\n`);
  }
  return new Promise((resolve) => {
    let out = "";
    const child = execFile(
      "/bin/bash",
      ["-c", command],
      {
        cwd,
        env: {
          ...process.env,
          TERM: "xterm-256color",
          FORCE_COLOR: "1",
          GIT_TERMINAL_PROMPT: "0",
          ...(opts.env || {}),
        } as NodeJS.ProcessEnv,
        maxBuffer: 10 * 1024 * 1024,
      },
      (err, stdout, stderr) => {
        const code = err && typeof err.code === "number" ? err.code : 0;
        resolve({ code, out });
      },
    );
    const onChunk = (buf: Buffer) => {
      const text = buf.toString("utf8");
      out += text;
      emit(sid, text.replace(/\n/g, "\r\n"));
    };
    child.stdout?.on("data", onChunk);
    child.stderr?.on("data", onChunk);
  });
}

export { WORKSPACE };
