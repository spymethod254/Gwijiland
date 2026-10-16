"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";

const LINES: Array<{ txt: string; ok?: boolean; dim?: boolean }> = [
  { txt: "GNU/Web GwijiLand 1.4.2 LTS — kernel 6.1.158-gwijiland", dim: true },
  { txt: "[    0.000000] Linux version 6.1.158 (gcc 12.2.0) #1 SMP gwijiland", dim: true },
  { txt: "[  OK  ] Reached target GwijiLand Kernel", ok: true },
  { txt: "[  OK  ] Mounted /dev/gwfs on /home/guest", ok: true },
  { txt: "[  OK  ] Started Session Manager daemon", ok: true },
  { txt: "[  OK  ] Started OpenSSH-compatible pty broker", ok: true },
  { txt: "[  OK  ] Reached target Multi-User Environment", ok: true },
  { txt: "[  OK  ] Started Getty on tty1", ok: true },
  { txt: "" },
  { txt: "gwijiland login: guest", dim: true },
  { txt: "Password: •••••••••• (autologin)", dim: true },
  { txt: "spawning session …", dim: true },
];

export default function Boot() {
  const setBooted = useStore((s) => s.setBooted);
  const [count, setCount] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    LINES.forEach((_, i) => timers.push(setTimeout(() => setCount(i + 1), 90 * i + 120)));
    timers.push(
      setTimeout(() => setLeaving(true), 90 * LINES.length + 700),
      setTimeout(() => setBooted(), 90 * LINES.length + 1150),
    );
    return () => timers.forEach(clearTimeout);
  }, [setBooted]);

  const done = count >= LINES.length;

  return (
    <div
      onClick={() => setBooted()}
      onKeyDown={() => setBooted()}
      role="button"
      tabIndex={0}
      className={`fixed inset-0 z-50 flex cursor-pointer flex-col overflow-hidden bg-[var(--term-bg)] p-6 transition-all duration-500 sm:p-10 ${
        leaving ? "-translate-y-3 opacity-0" : "opacity-100"
      }`}
    >
      <div className="scanbeam" />
      <div className="font-vt glow mb-6 text-5xl tracking-widest text-[var(--acc)] sm:text-7xl">
        GWIJILAND<span className="animate-blink">▮</span>
      </div>
      <div className="max-w-3xl space-y-1 text-[13px] leading-relaxed">
        {LINES.slice(0, count).map((l, i) => (
          <div key={i} className={l.dim ? "text-[var(--dim)]" : "text-[var(--fg)]"}>
            {l.ok ? (
              <>
                <span className="text-[var(--acc)]">[  OK  ]</span>
                <span>{l.txt.slice(8)}</span>
              </>
            ) : (
              l.txt || "\u00A0"
            )}
          </div>
        ))}
        {done && (
          <div className="pt-2 text-[var(--acc)]">
            <span className="glow-soft">➜ guest@gwijiland:~$ </span>
            <span className="animate-blink">▊</span>
          </div>
        )}
      </div>
      <div className="mt-auto flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-[var(--dim)]">
        <span>press any key to skip</span>
        <span>pty bridge · node 22 · bash 5.2</span>
      </div>
    </div>
  );
}
