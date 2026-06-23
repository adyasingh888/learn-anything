"use client";
import { useEffect, useMemo, useState } from "react";
import { components, sharesSource } from "@learn-anything/core";
import { useBrain, useStore } from "@/lib/store";
import { RelatedReadingPanel } from "./RelatedReadingPanel";

export function GraphTab({ brainId }: { brainId: string }) {
  const { atoms, concepts, edges, sources } = useBrain(brainId);
  const { addAtom, confirmEdge, rejectEdge, pruneSameSourceEdges } = useStore();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    pruneSameSourceEdges(brainId);
  }, [brainId, pruneSameSourceEdges]);

  const atomById = useMemo(() => new Map(atoms.map((a) => [a.id, a])), [atoms]);
  const sourceById = useMemo(() => new Map(sources.map((s) => [s.id, s])), [sources]);

  const proposed = edges.filter((e) => {
    if (e.weight >= 1) return false;
    const a = atomById.get(e.from);
    const b = atomById.get(e.to);
    return a && b && !sharesSource(a, b);
  });

  const confirmed = edges.filter((e) => e.weight >= 1);

  const clusters = useMemo(() => {
    const nodeIds = atoms.map((a) => a.id);
    return components(nodeIds, edges).filter((c) => c.length > 1);
  }, [atoms, edges]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Atoms (your ideas)" value={atoms.length} highlight />
        <Stat label="Concepts" value={concepts.length} />
        <Stat label="Cross-source links" value={confirmed.length} />
      </div>

      {/* Atoms — the main thing distill creates */}
      <section>
        <h3 className="text-sm font-semibold">Your atoms</h3>
        <p className="mt-0.5 text-xs text-[var(--color-muted)]">
          Each atom is one idea distilled from a source. Capture a link in Sources — atoms appear here automatically.
        </p>
        {atoms.length === 0 ? (
          <div className="card-surface mt-3 rounded-xl p-6 text-center text-sm text-[var(--color-muted)]">
            No atoms yet. Save a link or note in <strong>Sources</strong> — it will split into atoms here.
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {atoms
              .slice()
              .reverse()
              .map((a) => {
                const src = a.sourceIds[0] ? sourceById.get(a.sourceIds[0]) : undefined;
                return (
                  <div key={a.id} className="card-surface rounded-xl p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{a.title}</p>
                      {src && <span className="chip">from: {src.title.slice(0, 40)}{src.title.length > 40 ? "…" : ""}</span>}
                    </div>
                    <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{a.body}</p>
                  </div>
                );
              })}
          </div>
        )}
      </section>

      {/* External reading — what user asked for */}
      <section>
        <h3 className="text-sm font-semibold">Suggested reading (outside your library)</h3>
        <p className="mt-0.5 text-xs text-[var(--color-muted)]">
          Real papers from Semantic Scholar + web results — save any into your brain with one click.
        </p>
        <div className="mt-3">
          <RelatedReadingPanel brainId={brainId} />
        </div>
      </section>

      {proposed.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold">Links across sources</h3>
          <p className="text-xs text-[var(--color-muted)]">
            Connections between ideas from <em>different</em> papers — not chunks from the same article.
          </p>
          <div className="mt-2 space-y-2">
            {proposed.map((e) => {
              const from = atomById.get(e.from);
              const to = atomById.get(e.to);
              const fromSrc = from?.sourceIds[0] ? sourceById.get(from.sourceIds[0])?.title : "?";
              const toSrc = to?.sourceIds[0] ? sourceById.get(to.sourceIds[0])?.title : "?";
              return (
                <div key={e.id} className="card-surface flex flex-col gap-2 rounded-xl p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm">
                    <p>
                      <span className="font-medium">{from?.title}</span>
                      <span className="mx-2 text-[var(--color-muted)]">↔</span>
                      <span className="font-medium">{to?.title}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                      {fromSrc} ↔ {toSrc}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="btn text-xs" onClick={() => confirmEdge(e.id)}>✓ Link</button>
                    <button type="button" className="btn text-xs" onClick={() => rejectEdge(e.id)}>✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="card-surface rounded-2xl p-4">
        <h3 className="text-sm font-semibold">Add an atom manually</h3>
        <div className="mt-3 space-y-2">
          <input className="input" placeholder="Atom title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea
            className="input min-h-[70px]"
            placeholder="Restate one idea in your own words…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <button
            type="button"
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

      {concepts.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold">Concepts</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {concepts.map((c) => (
              <span key={c.id} className="chip">{c.label}</span>
            ))}
          </div>
        </section>
      )}

      {clusters.length > 1 && (
        <section>
          <h3 className="text-sm font-semibold">Topic clusters</h3>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {clusters.slice(0, 4).map((c, i) => (
              <div key={i} className="card-surface rounded-xl p-3">
                <p className="text-xs text-[var(--color-muted)]">{c.length} connected atoms</p>
                <ul className="mt-1 space-y-0.5 text-sm">
                  {c.slice(0, 4).map((id) => (
                    <li key={id} className="truncate">• {atomById.get(id)?.title}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`card-surface rounded-xl p-3 text-center ${highlight ? "ring-2 ring-[var(--color-accent)]/30" : ""}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-[var(--color-muted)]">{label}</div>
    </div>
  );
}
