"use client";
import { useMemo } from "react";
import { pickResurfaceItems } from "@learn-anything/core";
import { useBrain, useStore } from "@/lib/store";

export function CaptureDigestStudio({ brainId }: { brainId: string }) {
  const { brain, sources, atoms, cards, activities } = useBrain(brainId);
  const { distillSourceToAtoms, runModeStage, logActivity } = useStore();

  const resurface = useMemo(
    () =>
      brain
        ? pickResurfaceItems([{ id: brain.id, name: brain.name }], atoms, sources, activities, { limit: 6 })
        : [],
    [brain, sources, atoms, activities],
  );

  const handleDistillAll = async () => {
    for (const s of sources.slice(0, 5)) {
      await distillSourceToAtoms(s.id);
    }
    logActivity({ brainId, kind: "practice", score: 1, payload: { distillBatch: true } });
  };

  const handleSummarize = async () => {
    await runModeStage(brainId, "distill");
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-[var(--color-muted)]">
        Capture & Digest — distill sources into atoms, resurface stale material, then review in Learn.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card-surface rounded-xl p-4 text-center">
          <p className="text-2xl font-bold">{sources.length}</p>
          <p className="text-xs text-[var(--color-muted)]">sources</p>
        </div>
        <div className="card-surface rounded-xl p-4 text-center">
          <p className="text-2xl font-bold">{atoms.length}</p>
          <p className="text-xs text-[var(--color-muted)]">atoms</p>
        </div>
        <div className="card-surface rounded-xl p-4 text-center">
          <p className="text-2xl font-bold">{cards.length}</p>
          <p className="text-xs text-[var(--color-muted)]">cards</p>
        </div>
      </div>

      <div className="card-surface rounded-2xl p-4">
        <h4 className="text-sm font-semibold">Distill pipeline</h4>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          Mode loop: summarize → atomize (from {brain?.modeId ?? "capture-digest"})
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" disabled={!sources.length} onClick={handleDistillAll}>
            Distill all sources
          </button>
          <button type="button" className="btn" disabled={!sources.length} onClick={handleSummarize}>
            Run summarize stage
          </button>
        </div>
      </div>

      {resurface.length > 0 && (
        <div className="card-surface rounded-2xl p-4">
          <h4 className="text-sm font-semibold">Resurface queue</h4>
          <ul className="mt-2 space-y-2 text-sm">
            {resurface.map((r) => (
              <li key={`${r.type}-${r.id}`} className="rounded-lg border border-[var(--color-border)] p-2">
                <span className="text-xs text-[var(--color-muted)]">{r.type} · {r.daysSince}d</span>
                <p className="font-medium">{r.title}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
