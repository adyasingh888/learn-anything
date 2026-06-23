"use client";
import Link from "next/link";
import { GlobalSearch } from "@/components/GlobalSearch";
import { useStore } from "@/lib/store";

export function Header() {
  const { meta } = useStore();
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--color-line)] bg-[var(--color-bg-soft)]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--color-accent)] text-sm font-black text-white shadow-sm">
            L
          </span>
          <span className="page-title text-lg font-bold text-[var(--color-text)]">Learn Anything</span>
        </Link>
        <div className="flex items-center gap-2">
          <GlobalSearch />
          <span className="chip" title={meta.encrypted ? "End-to-end encrypted" : "Stored locally on this device"}>
            {meta.encrypted ? "🔒 Encrypted" : "📱 Local"}
          </span>
          <Link href="/settings" className="btn text-xs">
            Settings
          </Link>
        </div>
      </div>
    </header>
  );
}
