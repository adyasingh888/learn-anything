"use client";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { searchVault } from "@learn-anything/core";
import { useStore } from "@/lib/store";

export function GlobalSearch() {
  const { db } = useStore();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);

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

  const hits = q.length >= 2 ? searchVault(db.brains, db.sources, db.atoms, db.cards, q, 16) : [];

  useEffect(() => {
    setActiveIdx(0);
  }, [q]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, hits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && hits[activeIdx]) {
      window.location.href = linkFor(hits[activeIdx]);
      setOpen(false);
    }
  };

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
          onKeyDown={onKeyDown}
        />
        <div className="mt-2 max-h-[50vh] overflow-y-auto">
          {q.length < 2 && (
            <div className="px-2 py-4 text-center text-xs text-[var(--color-muted)]">
              <p>Type 2+ characters</p>
              <p className="mt-2">↑↓ navigate · Enter open · Esc close</p>
            </div>
          )}
          {q.length >= 2 && hits.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-[var(--color-muted)]">No matches</p>
          )}
          {hits.map((h, i) => (
            <Link
              key={`${h.type}-${h.id}`}
              href={linkFor(h)}
              className={`block rounded-lg px-3 py-2 ${i === activeIdx ? "bg-[var(--color-accent-soft)]" : "hover:bg-[var(--color-accent-soft)]"}`}
              onClick={() => setOpen(false)}
              onMouseEnter={() => setActiveIdx(i)}
            >
              <div className="flex items-center justify-between gap-2 text-xs text-[var(--color-muted)]">
                <span className="flex items-center gap-2">
                  <span className="chip">{h.type}</span>
                  <span>{h.brainName}</span>
                </span>
                <span>{Math.round(h.score * 100)}%</span>
              </div>
              <p className="mt-0.5 text-sm font-medium">{highlight(h.title, q)}</p>
              <p className="line-clamp-2 text-xs text-[var(--color-text-secondary)]">{highlight(h.snippet, q)}</p>
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

function highlight(text: string, query: string): ReactNode {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return text;
  const lower = text.toLowerCase();
  let best = -1;
  let len = 0;
  for (const t of terms) {
    const i = lower.indexOf(t);
    if (i >= 0 && (best < 0 || i < best)) {
      best = i;
      len = t.length;
    }
  }
  if (best < 0) return text;
  return (
    <>
      {text.slice(0, best)}
      <mark className="rounded bg-[var(--color-accent-soft)] px-0.5">{text.slice(best, best + len)}</mark>
      {text.slice(best + len)}
    </>
  );
}
