"use client";
import { useMemo, useState } from "react";
import { MASTERY_THRESHOLD, type Card } from "@learn-anything/core";
import { useBrain, useStore } from "@/lib/store";

interface Answer {
  card: Card;
  response: string;
  correct: boolean | null;
}

export function ExamStudio({ brainId }: { brainId: string }) {
  const { cards, objectives } = useBrain(brainId);
  const { logActivity, setCardSuspended } = useStore();
  const [running, setRunning] = useState(false);
  const [timed, setTimed] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [idx, setIdx] = useState(0);
  const [response, setResponse] = useState("");
  const [finished, setFinished] = useState(false);
  const [drillMode, setDrillMode] = useState(false);

  const pool = useMemo(() => cards.filter((c) => c.kind === "qa" || c.kind === "cloze" || c.kind === "free-recall"), [cards]);
  const applyObjective = objectives[objectives.length - 1]?.id;

  const start = (onlyWrong?: Card[]) => {
    const base = onlyWrong ?? [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(10, pool.length));
    setAnswers(base.map((card) => ({ card, response: "", correct: null })));
    setIdx(0);
    setResponse("");
    setRunning(true);
    setFinished(false);
    setDrillMode(!!onlyWrong);
    if (timed && !onlyWrong) {
      setSecondsLeft(base.length * 90);
      const t = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            clearInterval(t);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
  };

  const submit = () => {
    const current = answers[idx];
    const auto = overlap(response, current.card.back) > 0.5;
    const next = answers.map((a, i) => (i === idx ? { ...a, response, correct: auto } : a));
    setAnswers(next);
    setResponse("");
    if (idx + 1 < answers.length) {
      setIdx(idx + 1);
    } else {
      finishExam(next);
    }
  };

  const finishExam = (next: Answer[]) => {
    const score = next.filter((a) => a.correct).length / next.length;
      logActivity({
        brainId,
        kind: "mock-exam",
        score,
        objectiveId: applyObjective,
        payload: {
          total: next.length,
          drill: drillMode,
          wrongCardIds: next.filter((a) => !a.correct).map((a) => a.card.id),
        },
      });
    for (const a of next.filter((x) => !x.correct)) {
      setCardSuspended(a.card.id, false);
    }
    setFinished(true);
    setRunning(false);
  };

  if (pool.length === 0) {
    return (
      <div className="card-surface rounded-2xl p-8 text-center text-sm text-[var(--color-muted)]">
        Generate some Q/A or cloze cards first (Sources → Generate cards), then take a mock exam.
      </div>
    );
  }

  if (finished) {
    const correct = answers.filter((a) => a.correct).length;
    const wrong = answers.filter((a) => !a.correct);
    const pct = Math.round((correct / answers.length) * 100);
    return (
      <div className="space-y-4">
        <div className="card-surface rounded-2xl p-6 text-center">
          <div className="text-3xl">{pct >= MASTERY_THRESHOLD * 100 ? "🏆" : "📈"}</div>
          <h3 className="mt-2 text-2xl font-bold">
            {correct} / {answers.length}
          </h3>
          <p className="text-sm text-[var(--color-muted)]">
            {pct}% — {pct >= MASTERY_THRESHOLD * 100 ? "mastery threshold met" : `target ${MASTERY_THRESHOLD * 100}%`}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button type="button" className="btn btn-primary" onClick={() => start()}>Retake</button>
            {wrong.length > 0 && (
              <button type="button" className="btn" onClick={() => start(wrong.map((w) => w.card))}>
                Drill {wrong.length} errors
              </button>
            )}
          </div>
        </div>
        {wrong.length > 0 && (
          <div className="card-surface rounded-2xl p-4">
            <h4 className="text-sm font-semibold">Error log</h4>
            <div className="mt-2 space-y-2">
              {wrong.map((a, i) => (
                <div key={i} className="rounded-lg border p-2 text-sm">
                  <p className="font-medium">{a.card.front}</p>
                  <p className="text-xs text-rose-400">You: {a.response || "(blank)"}</p>
                  <p className="text-xs text-emerald-600">Answer: {a.card.back}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!running) {
    return (
      <div className="card-surface rounded-2xl p-8 text-center">
        <div className="text-3xl">📝</div>
        <h3 className="mt-2 text-lg font-semibold">Mock exam</h3>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          {Math.min(10, pool.length)} questions from your {pool.length} cards.
        </p>
        <label className="mt-4 flex items-center justify-center gap-2 text-sm">
          <input type="checkbox" checked={timed} onChange={(e) => setTimed(e.target.checked)} />
          Timed mode (~90s per question)
        </label>
        <button type="button" className="btn btn-primary mx-auto mt-4" onClick={() => start()}>Start</button>
      </div>
    );
  }

  const current = answers[idx];
  return (
    <div>
      <div className="mb-3 flex justify-between text-xs text-[var(--color-muted)]">
        <span>Question {idx + 1} / {answers.length}{drillMode ? " · error drill" : ""}</span>
        {timed && secondsLeft > 0 && <span>{Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}</span>}
      </div>
      <div className="card-surface rounded-2xl p-6">
        <p className="text-lg">{current.card.front}</p>
        <textarea
          className="input mt-4 min-h-[80px]"
          placeholder="Your answer…"
          value={response}
          autoFocus
          onChange={(e) => setResponse(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && response.trim()) submit();
          }}
        />
        <button type="button" className="btn btn-primary mt-3" onClick={submit} disabled={!response.trim()}>
          {idx + 1 < answers.length ? "Next" : "Finish"}
        </button>
      </div>
    </div>
  );
}

function overlap(a: string, b: string): number {
  const ta = new Set(a.toLowerCase().match(/\p{L}+/gu) ?? []);
  const tb = new Set(b.toLowerCase().match(/\p{L}+/gu) ?? []);
  if (tb.size === 0) return 0;
  let hit = 0;
  for (const t of tb) if (ta.has(t)) hit++;
  return hit / tb.size;
}
