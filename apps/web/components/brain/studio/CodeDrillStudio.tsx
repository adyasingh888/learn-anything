"use client";
import { useMemo, useState } from "react";
import { parseCodeTests, runCodeTests } from "@learn-anything/core";
import { useBrain, useStore } from "@/lib/store";

export function CodeDrillStudio({ brainId }: { brainId: string }) {
  const { cards, sources } = useBrain(brainId);
  const { logActivity } = useStore();
  const [idx, setIdx] = useState(0);
  const [code, setCode] = useState("function solution() {\n  // your code\n}\n");
  const [results, setResults] = useState<ReturnType<typeof runCodeTests> | null>(null);

  const drills = useMemo(() => {
    const fromCards = cards.filter((c) => c.kind === "problem");
    if (fromCards.length) return fromCards;
    return sources
      .filter((s) => /function|algorithm|implement|code|javascript/i.test(s.text))
      .slice(0, 5)
      .map((s, i) => ({
        id: `src-${i}`,
        kind: "problem" as const,
        front: `From “${s.title}”: implement the described approach in JavaScript.`,
        back: "TEST: typeof solution === 'function'\nHINT: Re-read the source",
        brainId,
        bloom: "apply" as const,
        atomIds: [],
        sourceIds: [s.id],
        conceptIds: [],
        fsrs: { due: 0, stability: 0, difficulty: 0, elapsedDays: 0, scheduledDays: 0, reps: 0, lapses: 0, state: 0 as const },
        createdAt: Date.now(),
      }));
  }, [cards, sources, brainId]);

  const card = drills[idx];
  const parsed = card ? parseCodeTests(card.back) : { tests: [], hint: undefined };

  const run = () => {
    const r = runCodeTests(code, parsed.tests);
    setResults(r);
    const pass = r.length > 0 && r.every((x) => x.pass);
    logActivity({
      brainId,
      kind: "code",
      score: pass ? 1 : r.filter((x) => x.pass).length / Math.max(r.length, 1),
      payload: { tests: r.length, passed: r.filter((x) => x.pass).length },
    });
  };

  if (drills.length === 0) {
    return (
      <div className="card-surface rounded-2xl p-8 text-center text-sm text-[var(--color-muted)]">
        Generate cards from procedural sources (Sources → Generate cards) or capture material with code/algorithms.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--color-muted)]">
        In-browser JavaScript drills — runs locally, no cloud sandbox. Define <code>solution</code>.
      </p>
      <div className="card-surface rounded-2xl p-5">
        <p className="text-xs text-[var(--color-muted)]">Drill {idx + 1} / {drills.length}</p>
        <p className="mt-2 whitespace-pre-wrap font-medium">{card.front}</p>
        {parsed.hint && <p className="mt-2 text-xs text-[var(--color-accent)]">Hint: {parsed.hint}</p>}
        <textarea
          className="input mt-4 min-h-[140px] font-mono text-sm"
          value={code}
          spellCheck={false}
          onChange={(e) => {
            setCode(e.target.value);
            setResults(null);
          }}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" onClick={run}>
            Run tests
          </button>
          <button type="button" className="btn" onClick={() => { setIdx((i) => (i + 1) % drills.length); setResults(null); }}>
            Next drill →
          </button>
        </div>
        {results && (
          <ul className="mt-4 space-y-1 text-sm">
            {results.map((r) => (
              <li key={r.expr} className={r.pass ? "text-emerald-600" : "text-rose-500"}>
                {r.pass ? "✓" : "✗"} {r.expr}
                {r.error && <span className="text-xs text-[var(--color-muted)]"> — {r.error}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
