"use client";
import Link from "next/link";
import { useStore } from "@/lib/store";

export function Header() {
  const { meta } = useStore();
  return (
    <header className="sticky top-0 z-20 border-b bg-[var(--color-ink)]/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-2)] text-sm font-black text-white">
            L
          </span>
          <span className="font-semibold tracking-tight">Learn Anything</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="chip" title={meta.encrypted ? "End-to-end encrypted" : "Stored locally"}>
            {meta.encrypted ? "🔒 Encrypted" : "🟢 Local"}
          </span>
          <Link href="/settings" className="btn text-xs">
            Settings
          </Link>
        </div>
      </div>
    </header>
  );
}
