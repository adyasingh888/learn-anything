"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { searchVault } from "@learn-anything/core";
import { useStore } from "@/lib/store";

export function GlobalSearch() {
  const { db } = useStore();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const hits = q.length >= 2
    ? searchVault(db.brains, db.sources, db.atoms, db.cards, q, 14)
    : [];

  if (!open) {
    return (
      <button type="button" className="btn text-xs" onClick={() => setOpen(true)}>
        Search ⌘K
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 pt-[12vh]" onClick={() => setOpen(false)}>
      <div
        className="card-surface w-full max-w-lg rounded-2xl p-3 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          className="input"
          autoFocus
          placeholder="Search brains, sources, atoms, cards…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="mt-2 max-h-[50vh] overflow-y-auto">
          {q.length < 2 && (
            <p className="px-2 py-4 text-center text-xs text-[var(--color-muted)]">Type 2+ characters</p>
          )}
          {q.length >= 2 && hits.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-[var(--color-muted)]">No matches</p>
          )}
          {hits.map((h) => (
            <Link
              key={`${h.type}-${h.id}`}
              href={linkFor(h)}
              className="block rounded-lg px-3 py-2 hover:bg-[var(--color-accent-soft)]"
              onClick={() => setOpen(false)}
            >
              <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
                <span className="chip">{h.type}</span>
                <span>{h.brainName}</span>
              </div>
              <p className="mt-0.5 text-sm font-medium">{h.title}</p>
              <p className="line-clamp-1 text-xs text-[var(--color-text-secondary)]">{h.snippet}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function linkFor(h: { brainId: string; type: string }): string {
  if (h.type === "brain") return `/brain/${h.brainId}`;
  const tab =
    h.type === "source" ? "sources" : h.type === "atom" ? "graph" : h.type === "card" ? "learn" : "sources";
  return `/brain/${h.brainId}?tab=${tab}`;
}
