"use client";
import { useMemo, useState } from "react";
import {
  buildSession,
  createScheduler,
  getMode,
  previewIntervals,
  type Card,
  type ReviewGrade,
} from "@learn-anything/core";
import { useBrain, useStore } from "@/lib/store";

const GRADES: { grade: ReviewGrade; label: string; tone: string }[] = [
  { grade: "again", label: "Again", tone: "text-rose-400" },
  { grade: "hard", label: "Hard", tone: "text-amber-400" },
  { grade: "good", label: "Good", tone: "text-emerald-400" },
  { grade: "easy", label: "Easy", tone: "text-sky-400" },
];

export function LearnTab({ brainId }: { brainId: string }) {
  const { brain, cards } = useBrain(brainId);
  const { gradeCard } = useStore();
  const [sessionIds, setSessionIds] = useState<string[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(0);

  const mode = getMode(brain?.modeId, brain?.domainType ?? "general");
  const scheduler = useMemo(
    () => createScheduler({ targetRetention: mode.scheduler.targetRetention }),
    [mode.scheduler.targetRetention],
  );

  const queue = useMemo(() => {
    if (!sessionIds) return [] as Card[];
    return sessionIds.map((id) => cards.find((c) => c.id === id)).filter(Boolean) as Card[];
  }, [sessionIds, cards]);

  const startSession = () => {
    const session = buildSession(cards, { mode, limit: 20 });
    if (!session.length) return;
    setSessionIds(session.map((c) => c.id));
    setIdx(0);
    setRevealed(false);
    setDone(0);
  };

  if (cards.length === 0) {
    return (
      <div className="card-surface rounded-2xl p-8 text-center">
        <div className="text-3xl">🃏</div>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          No cards yet. Go to <b>Sources</b> and hit "Generate cards", or add atoms in <b>Graph</b>.
        </p>
      </div>
    );
  }

  if (!sessionIds) {
    const dueNow = buildSession(cards, { mode, limit: 999 }).length;
    return (
      <div className="card-surface rounded-2xl p-8 text-center">
        <div className="text-3xl">📚</div>
        <h3 className="mt-2 text-lg font-semibold">{dueNow} cards ready</h3>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Spaced repetition (FSRS-6) at {Math.round(mode.scheduler.targetRetention * 100)}% target retention
          {mode.scheduler.interleave ? ", interleaved across concepts." : "."}
        </p>
        <button className="btn btn-primary mx-auto mt-4" onClick={startSession} disabled={dueNow === 0}>
          {dueNow === 0 ? "All caught up 🎉" : "Start review"}
        </button>
      </div>
    );
  }

  const card = queue[idx];
  if (!card) {
    return (
      <div className="card-surface rounded-2xl p-8 text-center">
        <div className="text-3xl">🎉</div>
        <h3 className="mt-2 text-lg font-semibold">Session complete</h3>
        <p className="mt-1 text-sm text-[var(--color-muted)]">Reviewed {done} cards.</p>
        <button className="btn btn-primary mx-auto mt-4" onClick={() => setSessionIds(null)}>
          Done
        </button>
      </div>
    );
  }

  const intervals = previewIntervals(scheduler, card.fsrs);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-xs text-[var(--color-muted)]">
        <span>
          Card {idx + 1} / {queue.length}
        </span>
        <span className="chip">{card.kind} · {card.bloom}</span>
      </div>
      <div className="card-surface min-h-[180px] rounded-2xl p-6">
        <p className="text-lg">{card.front}</p>
        {revealed && (
          <div className="mt-4 border-t border-[var(--color-line)] pt-4">
            <p className="text-[var(--color-accent-2)]">{card.back}</p>
          </div>
        )}
      </div>

      {!revealed ? (
        <button className="btn btn-primary mt-4 w-full justify-center" onClick={() => setRevealed(true)}>
          Show answer
        </button>
      ) : (
        <div className="mt-4 grid grid-cols-4 gap-2">
          {GRADES.map((g) => (
            <button
              key={g.grade}
              className="btn flex-col py-2"
              onClick={() => {
                gradeCard(card.id, g.grade);
                setRevealed(false);
                setIdx((i) => i + 1);
                setDone((d) => d + 1);
              }}
            >
              <span className={g.tone}>{g.label}</span>
              <span className="text-[10px] text-[var(--color-muted)]">
                {intervals[g.grade] === 0 ? "<1d" : `${intervals[g.grade]}d`}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
