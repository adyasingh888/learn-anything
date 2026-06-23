"use client";
import { extractClaims, type EdgeRelation } from "@learn-anything/core";
import { useBrain, useStore } from "@/lib/store";

export function ClaimEvidencePanel({ brainId }: { brainId: string }) {
  const { atoms, sources, edges } = useBrain(brainId);
  const { addTypedEdge, setEdgeRelation } = useStore();
  const claims = extractClaims(atoms, sources);

  if (atoms.length < 2) {
    return (
      <p className="text-sm text-[var(--color-muted)]">
        Capture at least two sources to map claims against evidence.
      </p>
    );
  }

  if (claims.length === 0) {
    return (
      <p className="text-sm text-[var(--color-muted)]">
        No claim-like atoms yet — distill more sources or add atoms with findings/arguments.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {claims.map((c) => (
        <div key={c.atomId} className="card-surface rounded-xl p-4">
          <p className="font-medium">{c.claim}</p>
          <p className="mt-1 line-clamp-2 text-sm text-[var(--color-text-secondary)]">{c.body}</p>
          {c.sourceTitle && (
            <p className="mt-1 text-xs text-[var(--color-muted)]">Source: {c.sourceTitle}</p>
          )}
          {c.evidence.length > 0 ? (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-medium text-[var(--color-text-secondary)]">Cross-source evidence</p>
              {c.evidence.map((e) => {
                const existing = edges.find(
                  (edge) =>
                    edge.weight >= 1 &&
                    ((edge.from === c.atomId && edge.to === e.atomId) ||
                      (edge.from === e.atomId && edge.to === c.atomId)),
                );
                return (
                  <div key={e.atomId} className="rounded-lg border border-[var(--color-border)] p-2 text-sm">
                    <p className="font-medium">{e.title}</p>
                    <p className="mt-0.5 text-xs text-[var(--color-muted)]">{e.snippet}…</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(["supports", "contradicts", "related"] as EdgeRelation[]).map((rel) => (
                        <button
                          key={rel}
                          type="button"
                          className={`btn text-xs ${existing?.relation === rel ? "btn-primary" : ""}`}
                          onClick={() => {
                            if (existing) setEdgeRelation(existing.id, rel);
                            else addTypedEdge(brainId, c.atomId, e.atomId, rel);
                          }}
                        >
                          {rel}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-2 text-xs text-[var(--color-muted)]">No cross-source evidence found yet.</p>
          )}
        </div>
      ))}
    </div>
  );
}
