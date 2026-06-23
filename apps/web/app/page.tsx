"use client";
import Link from "next/link";
import { useState } from "react";
import { getDomainInfo, getMode } from "@learn-anything/core";
import { Gate } from "@/components/Gate";
import { Header } from "@/components/Header";
import { NewBrainModal } from "@/components/NewBrainModal";
import { ResurfacePanel } from "@/components/ResurfacePanel";
import { FeatureTips } from "@/components/FeatureTips";
import { dueCount, useStore } from "@/lib/store";

export default function HomePage() {
  return (
    <Gate>
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Dashboard />
      </main>
    </Gate>
  );
}

function Dashboard() {
  const { db } = useStore();
  const [creating, setCreating] = useState(false);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title text-3xl font-bold tracking-tight text-[var(--color-text)]">Your brains</h1>
          <p className="mt-1.5 text-[var(--color-text-secondary)]">
            Capture anything, connect it automatically, then actually learn it.
          </p>
        </div>
        <button type="button" className="btn btn-primary shrink-0" onClick={() => setCreating(true)}>
          + New brain
        </button>
      </div>

      {creating && <NewBrainModal onClose={() => setCreating(false)} />}

      {db.brains.length === 0 && !creating ? (
        <EmptyState onCreate={() => setCreating(true)} />
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {db.brains.map((b) => {
            const cards = db.cards.filter((c) => c.brainId === b.id);
            const due = dueCount(cards);
            const mastery = db.mastery.filter((m) => m.brainId === b.id);
            const masteryPct =
              mastery.length > 0
                ? Math.round((mastery.reduce((s, m) => s + m.mastery, 0) / mastery.length) * 100)
                : null;
            const mode = getMode(b.modeId, b.domainType);
            const domain = getDomainInfo(b.domainType);
            return (
              <Link
                key={b.id}
                href={`/brain/${b.id}`}
                className="card-surface group rounded-2xl p-5 transition hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between">
                  <span className="text-2xl">{domain?.emoji ?? "🧠"}</span>
                  <div className="flex flex-col items-end gap-1">
                    {due > 0 && (
                      <span className="rounded-full bg-[var(--color-accent)] px-2.5 py-0.5 text-xs font-bold text-white">
                        {due} due
                      </span>
                    )}
                    {masteryPct != null && (
                      <span className="chip">{masteryPct}% mastery</span>
                    )}
                  </div>
                </div>
                <h3 className="mt-3 font-semibold text-[var(--color-text)]">{b.name}</h3>
                <p className="mt-0.5 text-xs text-[var(--color-muted)]">{mode.name}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="chip">{db.sources.filter((s) => s.brainId === b.id).length} sources</span>
                  <span className="chip">{cards.length} cards</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <ResurfacePanel />
      <FeatureTips />
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="card-surface mt-10 rounded-2xl p-12 text-center">
      <div className="text-5xl">🧠</div>
      <h2 className="page-title mt-4 text-xl font-bold">Create your first brain</h2>
      <p className="mx-auto mt-2 max-w-md text-[var(--color-text-secondary)]">
        A brain is a topic workspace. Dissertation prep, any language, guitar practice, exam cram —
        each uses a different learning mode.
      </p>
      <button type="button" className="btn btn-primary mx-auto mt-6" onClick={onCreate}>
        + New brain
      </button>
    </div>
  );
}
