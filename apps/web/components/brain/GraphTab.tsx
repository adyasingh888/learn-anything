"use client";
import { useMemo, useState } from "react";
import { components } from "@learn-anything/core";
import { useBrain, useStore } from "@/lib/store";

export function GraphTab({ brainId }: { brainId: string }) {
  const { atoms, concepts, edges } = useBrain(brainId);
  const { addAtom, confirmEdge, rejectEdge } = useStore();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const proposed = edges.filter((e) => e.weight < 1);
  const confirmed = edges.filter((e) => e.weight >= 1);

  const clusters = useMemo(() => {
    const nodeIds = atoms.map((a) => a.id);
    return components(nodeIds, edges).filter((c) => c.length > 1);
  }, [atoms, edges]);

  const atomById = useMemo(() => new Map(atoms.map((a) => [a.id, a])), [atoms]);

  return (
    <div className="space-y-6">
      <div className="card-surface rounded-2xl p-4">
        <h3 className="text-sm font-semibold">Add an atom</h3>
        <p className="mt-0.5 text-xs text-[var(--color-muted)]">
          An atom is one idea in your own words. It auto-links to related atoms.
        </p>
        <div className="mt-3 space-y-2">
          <input className="input" placeholder="Atom title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea
            className="input min-h-[70px]"
            placeholder="Restate the idea in your own words…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <button
            className="btn btn-primary"
            disabled={!title.trim() || !body.trim()}
            onClick={async () => {
              await addAtom(brainId, title.trim(), body.trim());
              setTitle("");
              setBody("");
            }}
          >
            Add atom
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Atoms" value={atoms.length} />
        <Stat label="Concepts" value={concepts.length} />
        <Stat label="Connections" value={confirmed.length} />
      </div>

      {proposed.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold">Suggested connections</h3>
          <p className="text-xs text-[var(--color-muted)]">Confirm the ones that make sense; the graph learns from your choices.</p>
          <div className="mt-2 space-y-2">
            {proposed.map((e) => (
              <div key={e.id} className="card-surface flex items-center justify-between gap-3 rounded-xl p-3">
                <p className="text-sm">
                  <span className="font-medium">{atomById.get(e.from)?.title ?? "?"}</span>
                  <span className="mx-2 text-[var(--color-muted)]">↔ {Math.round(e.weight * 100)}%</span>
                  <span className="font-medium">{atomById.get(e.to)?.title ?? "?"}</span>
                </p>
                <div className="flex gap-2">
                  <button className="btn text-xs" onClick={() => confirmEdge(e.id)}>✓ Link</button>
                  <button className="btn text-xs" onClick={() => rejectEdge(e.id)}>✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {clusters.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold">Clusters</h3>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {clusters.map((c, i) => (
              <div key={i} className="card-surface rounded-xl p-3">
                <p className="text-xs text-[var(--color-muted)]">Cluster {i + 1} · {c.length} atoms</p>
                <ul className="mt-1 space-y-0.5 text-sm">
                  {c.slice(0, 5).map((id) => (
                    <li key={id} className="truncate">• {atomById.get(id)?.title}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {concepts.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold">Concepts</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {concepts.map((c) => (
              <span key={c.id} className="chip">{c.label}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card-surface rounded-xl p-3 text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-[var(--color-muted)]">{label}</div>
    </div>
  );
}
