"use client";
import Link from "next/link";
import { dueCount } from "@learn-anything/core";
import { useStore } from "@/lib/store";

export function ReviewBanner() {
  const { db } = useStore();
  const dueBrains = db.brains
    .map((b) => ({
      brain: b,
      due: dueCount(db.cards.filter((c) => c.brainId === b.id)),
    }))
    .filter((x) => x.due > 0);

  const totalDue = dueBrains.reduce((s, x) => s + x.due, 0);
  if (totalDue === 0) return null;

  return (
    <div className="mb-6 rounded-2xl border border-[var(--color-accent)]/30 bg-[var(--color-accent-soft)] p-4">
      <p className="font-semibold text-[var(--color-text)]">
        {totalDue} card{totalDue === 1 ? "" : "s"} due for review
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {dueBrains.slice(0, 4).map(({ brain, due }) => (
          <Link key={brain.id} href={`/brain/${brain.id}?tab=learn`} className="btn btn-primary text-xs">
            {brain.name} · {due}
          </Link>
        ))}
      </div>
    </div>
  );
}
