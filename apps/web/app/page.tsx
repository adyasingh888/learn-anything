"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { DOMAIN_CATALOG, getMode, type DomainType } from "@learn-anything/core";
import { Gate } from "@/components/Gate";
import { Header } from "@/components/Header";
import { dueCount, useStore } from "@/lib/store";

export default function HomePage() {
  return (
    <Gate>
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-6">
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
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your Brains</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Capture anything, connect it automatically, then actually learn it.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>
          + New Brain
        </button>
      </div>

      {creating && <NewBrain onClose={() => setCreating(false)} />}

      {db.brains.length === 0 && !creating ? (
        <EmptyState onCreate={() => setCreating(true)} />
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {db.brains.map((b) => {
            const cards = db.cards.filter((c) => c.brainId === b.id);
            const due = dueCount(cards);
            const mode = getMode(b.modeId, b.domainType);
            const domain = DOMAIN_CATALOG.find((d) => d.type === b.domainType);
            return (
              <Link
                key={b.id}
                href={`/brain/${b.id}`}
                className="card-surface group rounded-2xl p-4 transition hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between">
                  <span className="text-2xl">{domain?.emoji ?? "🧠"}</span>
                  {due > 0 && (
                    <span className="rounded-full bg-[var(--color-accent)] px-2 py-0.5 text-xs font-bold text-white">
                      {due} due
                    </span>
                  )}
                </div>
                <h3 className="mt-3 font-semibold">{b.name}</h3>
                <p className="mt-0.5 text-xs text-[var(--color-muted)]">{mode.name}</p>
                <div className="mt-3 flex flex-wrap gap-1 text-xs text-[var(--color-muted)]">
                  <span className="chip">{db.sources.filter((s) => s.brainId === b.id).length} sources</span>
                  <span className="chip">{cards.length} cards</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="card-surface mt-8 rounded-2xl p-10 text-center">
      <div className="text-4xl">🧠</div>
      <h2 className="mt-3 text-lg font-semibold">Create your first Brain</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-[var(--color-muted)]">
        A Brain is a topic workspace. Its kind picks a learning mode — language
        learning works differently from a dissertation or an instrument.
      </p>
      <button className="btn btn-primary mx-auto mt-4" onClick={onCreate}>
        + New Brain
      </button>
    </div>
  );
}

function NewBrain({ onClose }: { onClose: () => void }) {
  const { createBrain } = useStore();
  const [name, setName] = useState("");
  const [domain, setDomain] = useState<DomainType>("general");
  const [goal, setGoal] = useState("");
  const mode = useMemo(() => getMode(undefined, domain), [domain]);

  return (
    <div className="card-surface mt-5 rounded-2xl p-5">
      <h2 className="font-semibold">New Brain</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <input
            className="input"
            placeholder="Brain name (e.g. Spanish, My Dissertation, Guitar)"
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="input"
            placeholder="Goal (optional) — e.g. Hold a 10-min conversation"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
          />
          <div className="card-surface rounded-xl p-3 text-sm">
            <p className="font-medium">{mode.name}</p>
            <p className="mt-1 text-xs text-[var(--color-muted)]">{mode.tagline}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {mode.practice.slice(0, 5).map((p) => (
                <span key={p} className="chip">{p}</span>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="btn btn-primary"
              disabled={!name.trim()}
              onClick={() => {
                const b = createBrain(name.trim(), domain, goal.trim() || undefined);
                onClose();
                window.location.href = `/brain/${b.id}`;
              }}
            >
              Create Brain
            </button>
            <button className="btn" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {DOMAIN_CATALOG.map((d) => (
            <button
              key={d.type}
              onClick={() => setDomain(d.type)}
              className={`rounded-xl border p-3 text-left transition ${
                domain === d.type
                  ? "border-[var(--color-accent)] bg-[var(--color-panel-2)]"
                  : "border-[var(--color-line)] hover:border-[var(--color-accent)]/50"
              }`}
            >
              <div className="text-xl">{d.emoji}</div>
              <div className="mt-1 text-sm font-medium">{d.label}</div>
              <div className="text-[11px] text-[var(--color-muted)]">{d.examples}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
