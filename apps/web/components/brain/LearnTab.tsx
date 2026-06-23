"use client";
import { useMemo, useState } from "react";
import {
  buildModeSession,
  buildWeaknessSession,
  createScheduler,
  getMode,
  getWeakCardIds,
  nextObjective,
  previewIntervals,
  type Card,
  type CardKind,
  type ReviewGrade,
} from "@learn-anything/core";
import { useBrain, useStore } from "@/lib/store";

const GRADES: { grade: ReviewGrade; label: string; tone: string }[] = [
  { grade: "again", label: "Again", tone: "text-rose-400" },
  { grade: "hard", label: "Hard", tone: "text-amber-400" },
  { grade: "good", label: "Good", tone: "text-emerald-400" },
  { grade: "easy", label: "Easy", tone: "text-sky-400" },
];

const OPEN_KINDS: CardKind[] = ["free-recall", "teach-back", "problem", "speak", "produce"];

export function LearnTab({ brainId }: { brainId: string }) {
  const { brain, cards, objectives, mastery, activities } = useBrain(brainId);
  const { gradeCard } = useStore();
  const [sessionIds, setSessionIds] = useState<string[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(0);
  const [selfAnswer, setSelfAnswer] = useState("");

  const mode = getMode(brain?.modeId, brain?.domainType ?? "general");
  const masteryMap = useMemo(() => new Map(mastery.map((m) => [m.objectiveId, m])), [mastery]);
  const currentObjective = useMemo(() => nextObjective(objectives, masteryMap), [objectives, masteryMap]);
  const scheduler = useMemo(
    () => createScheduler({ targetRetention: mode.scheduler.targetRetention }),
    [mode.scheduler.targetRetention],
  );

  const queue = useMemo(() => {
    if (!sessionIds) return [] as Card[];
    return sessionIds.map((id) => cards.find((c) => c.id === id)).filter(Boolean) as Card[];
  }, [sessionIds, cards]);

  const weakCount = getWeakCardIds(activities, brainId).length;

  const startSession = () => {
    const session = buildModeSession(cards, mode, objectives, mastery, { limit: 20 });
    if (!session.length) return;
    setSessionIds(session.map((c) => c.id));
    setIdx(0);
    setRevealed(false);
    setSelfAnswer("");
    setDone(0);
  };

  const startWeakSession = () => {
    const session = buildWeaknessSession(cards, activities, brainId, { mode, limit: 20 });
    if (!session.length) return;
    setSessionIds(session.map((c) => c.id));
    setIdx(0);
    setRevealed(false);
    setSelfAnswer("");
    setDone(0);
  };

  const advance = (grade: ReviewGrade) => {
    if (!card) return;
    gradeCard(card.id, grade);
    setRevealed(false);
    setSelfAnswer("");
    setIdx((i) => i + 1);
    setDone((d) => d + 1);
  };

  if (cards.length === 0) {
    return (
      <div className="card-surface rounded-2xl p-8 text-center">
        <div className="text-3xl">🃏</div>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          No cards yet. Go to <b>Sources</b> and hit &quot;Generate cards&quot;, or add atoms in <b>Graph</b>.
        </p>
      </div>
    );
  }

  if (!sessionIds) {
    const dueNow = buildModeSession(cards, mode, objectives, mastery, { limit: 999 }).length;
    return (
      <div className="card-surface rounded-2xl p-8 text-center">
        <div className="text-3xl">📚</div>
        <h3 className="mt-2 text-lg font-semibold">{dueNow} cards ready</h3>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Spaced repetition (FSRS-6) at {Math.round(mode.scheduler.targetRetention * 100)}% target retention
          {mode.scheduler.interleave ? ", interleaved across concepts." : "."}
        </p>
        {currentObjective && (
          <p className="mt-2 text-xs text-[var(--color-accent)]">Current objective: {currentObjective.title}</p>
        )}
        <div className="mx-auto mt-4 flex flex-wrap justify-center gap-2">
          <button className="btn btn-primary" onClick={startSession} disabled={dueNow === 0}>
            {dueNow === 0 ? "All caught up 🎉" : "Start review"}
          </button>
          {weakCount > 0 && (
            <button className="btn" onClick={startWeakSession}>
              Drill {weakCount} weak
            </button>
          )}
        </div>
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
  const isOpen = OPEN_KINDS.includes(card.kind);
  const kindHint = kindLabel(card.kind);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-xs text-[var(--color-muted)]">
        <span>
          Card {idx + 1} / {queue.length}
        </span>
        <span className="chip">{card.kind} · {card.bloom}</span>
      </div>
      <div className="card-surface min-h-[180px] rounded-2xl p-6">
        {kindHint && <p className="mb-2 text-xs text-[var(--color-accent)]">{kindHint}</p>}
        <CardFront card={card} />
        {isOpen && !revealed && (
          <textarea
            className="input mt-4 min-h-[88px]"
            placeholder="Type your answer before revealing…"
            value={selfAnswer}
            onChange={(e) => setSelfAnswer(e.target.value)}
          />
        )}
        {revealed && (
          <div className="mt-4 border-t border-[var(--color-line)] pt-4">
            <p className="text-xs text-[var(--color-muted)]">Reference answer</p>
            <p className="mt-1 whitespace-pre-wrap text-[var(--color-accent-2)]">{card.back}</p>
            {isOpen && selfAnswer.trim() && (
              <p className="mt-3 text-xs text-[var(--color-text-secondary)]">
                Your answer: {selfAnswer.slice(0, 300)}{selfAnswer.length > 300 ? "…" : ""}
              </p>
            )}
          </div>
        )}
      </div>

      {!revealed ? (
        <button
          className="btn btn-primary mt-4 w-full justify-center"
          onClick={() => setRevealed(true)}
          disabled={isOpen && !selfAnswer.trim() && card.kind !== "cloze"}
        >
          {isOpen && !selfAnswer.trim() ? "Write something first" : "Show answer"}
        </button>
      ) : (
        <div className="mt-4 grid grid-cols-4 gap-2">
          {GRADES.map((g) => (
            <button key={g.grade} className="btn flex-col py-2" onClick={() => advance(g.grade)}>
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

function CardFront({ card }: { card: Card }) {
  if (card.kind === "cloze") {
    return <p className="text-lg" dangerouslySetInnerHTML={{ __html: formatCloze(card.front) }} />;
  }
  if (card.kind === "problem") {
    return <p className="whitespace-pre-wrap text-lg">{card.front}</p>;
  }
  return <p className="text-lg">{card.front}</p>;
}

function formatCloze(front: string): string {
  return front.replace(/\*\*\[…\]\*\*/g, '<span class="rounded bg-[var(--color-accent-soft)] px-1">____</span>');
}

function kindLabel(kind: CardKind): string | null {
  switch (kind) {
    case "free-recall":
      return "Free recall — answer from memory before revealing.";
    case "teach-back":
      return "Teach-back — explain as if to a beginner.";
    case "problem":
      return "Problem — work it out, then check the solution.";
    case "cloze":
      return "Cloze — fill in the blank mentally.";
    default:
      return null;
  }
}
