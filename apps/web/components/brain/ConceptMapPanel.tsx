"use client";
import { buildConceptMap } from "@learn-anything/core";
import { useBrain } from "@/lib/store";

export function ConceptMapPanel({ brainId }: { brainId: string }) {
  const { atoms, edges, concepts } = useBrain(brainId);
  const map = buildConceptMap(atoms, edges, concepts);

  if (atoms.length === 0) {
    return null;
  }

  return (
    <section>
      <h3 className="text-sm font-semibold">Concept map</h3>
      <p className="mt-0.5 text-xs text-[var(--color-muted)]">
        Clusters from confirmed cross-source links — no AI, purely from your graph.
      </p>
      <div className="mt-3 space-y-3">
        {map.map((root) => (
          <div key={root.id} className="card-surface rounded-xl p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold">{root.label}</p>
              <span className="chip">{root.sourceCount} sources</span>
            </div>
            <ul className="mt-3 space-y-2 border-l-2 border-[var(--color-accent)]/40 pl-4">
              {root.children.map((child) => (
                <li key={child.id}>
                  <p className="text-sm font-medium">{child.label}</p>
                  {child.children.length > 0 && (
                    <ul className="mt-1 space-y-0.5 pl-3 text-xs text-[var(--color-text-secondary)]">
                      {child.children.map((gc) => (
                        <li key={gc.id}>↳ {gc.label}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
