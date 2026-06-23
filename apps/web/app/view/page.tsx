"use client";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { decodeSharePack } from "@learn-anything/core";
import { Gate } from "@/components/Gate";
import { Header } from "@/components/Header";

export default function ViewBrainPage() {
  return (
    <Gate>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Viewer />
      </main>
    </Gate>
  );
}

function Viewer() {
  const params = useSearchParams();
  const pack = useMemo(() => {
    const token = params.get("pack");
    if (!token) return null;
    return decodeSharePack(token);
  }, [params]);

  if (!pack?.slice.brain) {
    return (
      <div className="card-surface rounded-2xl p-8 text-center text-sm text-[var(--color-muted)]">
        Invalid or missing share link.
      </div>
    );
  }

  const { brain, sources = [], atoms = [], cards = [], objectives = [] } = pack.slice;

  return (
    <div className="space-y-6">
      <div>
        <span className="chip">Read-only view</span>
        <h1 className="mt-2 text-2xl font-bold">{brain.name}</h1>
        {brain.goal && <p className="mt-1 text-[var(--color-text-secondary)]">{brain.goal}</p>}
      </div>

      <section className="card-surface rounded-2xl p-4">
        <h2 className="text-sm font-semibold">Sources ({sources.length})</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {sources.map((s) => (
            <li key={s.id} className="rounded-lg border p-2">
              <p className="font-medium">{s.title}</p>
              <p className="line-clamp-2 text-xs text-[var(--color-muted)]">{s.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="card-surface rounded-2xl p-4">
        <h2 className="text-sm font-semibold">Atoms ({atoms.length})</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {atoms.map((a) => (
            <li key={a.id}>
              <p className="font-medium">{a.title}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">{a.body.slice(0, 200)}…</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="card-surface rounded-2xl p-4">
        <h2 className="text-sm font-semibold">Cards ({cards.length}) · Objectives ({objectives.length})</h2>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          Import this brain from Settings to edit and review.
        </p>
      </section>
    </div>
  );
}
