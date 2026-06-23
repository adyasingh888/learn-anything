"use client";
import Link from "next/link";
import { pickResurfaceItems } from "@learn-anything/core";
import { useStore } from "@/lib/store";

export function ResurfacePanel() {
  const { db } = useStore();
  const items = pickResurfaceItems(db.brains, db.atoms, db.sources, db.activities, { limit: 4, minDays: 2 });

  if (items.length === 0 || db.brains.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold text-[var(--color-text-secondary)]">Worth revisiting</h2>
      <p className="mt-0.5 text-xs text-[var(--color-muted)]">
        Spaced resurfacing — old atoms and sources you haven&apos;t touched lately.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <Link
            key={`${item.type}-${item.id}`}
            href={`/brain/${item.brainId}?tab=${item.type === "atom" ? "graph" : "sources"}`}
            className="card-surface rounded-xl p-4 transition hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
              <span className="chip">{item.type}</span>
              {item.brainName && <span>{item.brainName}</span>}
              <span>· {item.daysSince}d ago</span>
            </div>
            <p className="mt-2 font-medium leading-snug">{item.title}</p>
            <p className="mt-1 line-clamp-2 text-sm text-[var(--color-text-secondary)]">{item.snippet}</p>
            <p className="mt-2 text-xs text-[var(--color-accent)]">{item.reason}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
