"use client";
import { useMemo, useState } from "react";
import { type Card } from "@learn-anything/core";
import { useBrain, useStore } from "@/lib/store";

interface Answer {
  card: Card;
  response: string;
  correct: boolean | null;
}

export function ExamStudio({ brainId }: { brainId: string }) {
  const { cards } = useBrain(brainId);
  const { logActivity } = useStore();
  const [running, setRunning] = useState(false);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [idx, setIdx] = useState(0);
  const [response, setResponse] = useState("");
  const [finished, setFinished] = useState(false);

  const pool = useMemo(() => cards.filter((c) => c.kind === "qa" || c.kind === "cloze"), [cards]);

  const start = () => {
    const picked = [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(10, pool.length));
    setAnswers(picked.map((card) => ({ card, response: "", correct: null })));
    setIdx(0);
    setResponse("");
    setRunning(true);
    setFinished(false);
  };

  const submit = () => {
    const current = answers[idx];
    // Auto-check via token overlap; learner can override on the review screen.
    const auto = overlap(response, current.card.back) > 0.5;
    const next = answers.map((a, i) => (i === idx ? { ...a, response, correct: auto } : a));
    setAnswers(next);
    setResponse("");
    if (idx + 1 < answers.length) {
      setIdx(idx + 1);
    } else {
      const score = next.filter((a) => a.correct).length / next.length;
      logActivity({ brainId, kind: "mock-exam", score, payload: { total: next.length } });
      setFinished(true);
      setRunning(false);
    }
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
    return (
      <div className="space-y-4">
        <div className="card-surface rounded-2xl p-6 text-center">
          <div className="text-3xl">{correct / answers.length >= 0.8 ? "🏆" : "📈"}</div>
          <h3 className="mt-2 text-2xl font-bold">
            {correct} / {answers.length}
          </h3>
          <p className="text-sm text-[var(--color-muted)]">{Math.round((correct / answers.length) * 100)}% — logged to your progress</p>
          <button className="btn btn-primary mx-auto mt-4" onClick={start}>Retake</button>
        </div>
        {wrong.length > 0 && (
          <div className="card-surface rounded-2xl p-4">
            <h4 className="text-sm font-semibold">Error log — review these</h4>
            <div className="mt-2 space-y-2">
              {wrong.map((a, i) => (
                <div key={i} className="rounded-lg border p-2 text-sm">
                  <p className="font-medium">{a.card.front}</p>
                  <p className="text-xs text-rose-400">You: {a.response || "(blank)"}</p>
                  <p className="text-xs text-emerald-400">Answer: {a.card.back}</p>
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
          {Math.min(10, pool.length)} questions drawn from your {pool.length} cards. Mastery learning targets 80%+.
        </p>
        <button className="btn btn-primary mx-auto mt-4" onClick={start}>Start</button>
      </div>
    );
  }

  const current = answers[idx];
  return (
    <div>
      <div className="mb-3 text-xs text-[var(--color-muted)]">Question {idx + 1} / {answers.length}</div>
      <div className="card-surface rounded-2xl p-6">
        <p className="text-lg">{current.card.front}</p>
        <textarea
          className="input mt-4 min-h-[80px]"
          placeholder="Your answer…"
          value={response}
          autoFocus
          onChange={(e) => setResponse(e.target.value)}
        />
        <button className="btn btn-primary mt-3" onClick={submit}>
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
