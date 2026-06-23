"use client";
import { useEffect, useMemo, useState } from "react";
import {
  HashingEmbedder,
  buildGradedChunks,
  gradeFreeRecall,
  pickRecallPrompt,
  retrieve,
  type ReadDifficulty,
} from "@learn-anything/core";
import { useBrain, useStore } from "@/lib/store";
import { TeachBackStudio } from "./TeachBackStudio";

const embedder = new HashingEmbedder(256);
const DIFF_COLOR: Record<ReadDifficulty, string> = {
  easy: "text-emerald-600",
  medium: "text-amber-600",
  hard: "text-rose-600",
};

type Tab = "recall" | "reader" | "teach";

export function FreeRecallStudio({ brainId }: { brainId: string }) {
  const { atoms, concepts, sources } = useBrain(brainId);
  const { logActivity } = useStore();
  const [tab, setTab] = useState<Tab>("recall");
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [grade, setGrade] = useState<ReturnType<typeof gradeFreeRecall> | null>(null);
  const [busy, setBusy] = useState(false);
  const [readerIdx, setReaderIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const chunks = useMemo(() => buildGradedChunks(sources), [sources]);
  const chunk = chunks[readerIdx];

  useEffect(() => {
    if (atoms.length + concepts.length > 0 && !prompt) {
      setPrompt(pickRecallPrompt(atoms, concepts));
    }
  }, [atoms, concepts, prompt]);

  const submitRecall = async () => {
    if (!answer.trim()) return;
    setBusy(true);
    try {
      const ctx = await retrieve(prompt, { embedder, atoms, sources, k: 6 });
      const context = ctx.promptContext || atoms.map((a) => a.body).join("\n");
      const g = gradeFreeRecall(prompt, answer, context);
      setGrade(g);
      logActivity({ brainId, kind: "free-recall", score: g.score, payload: { covered: g.covered.length } });
    } finally {
      setBusy(false);
    }
  };

  if (atoms.length === 0 && sources.length === 0) {
    return (
      <div className="card-surface rounded-2xl p-8 text-center text-sm text-[var(--color-muted)]">
        Capture material in Sources first — free recall and graded reading build on your library.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {(["recall", "reader", "teach"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            className={`chip ${tab === t ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white" : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "recall" ? "Free recall" : t === "reader" ? "Graded reader" : "Teach-back"}
          </button>
        ))}
      </div>

      {tab === "recall" && (
        <>
          <p className="text-sm text-[var(--color-muted)]">
            Close your notes. Write everything you remember — graded offline against your captures.
          </p>
          <div className="card-surface rounded-2xl p-4">
            <p className="text-sm font-medium">{prompt}</p>
            <button
              type="button"
              className="btn mt-2 text-xs"
              onClick={() => {
                setPrompt(pickRecallPrompt(atoms, concepts));
                setAnswer("");
                setGrade(null);
              }}
            >
              New prompt
            </button>
            <textarea
              className="input mt-3 min-h-[140px]"
              placeholder="Write from memory…"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />
            <button type="button" className="btn btn-primary mt-3" disabled={busy || !answer.trim()} onClick={submitRecall}>
              {busy ? "Grading…" : "Grade recall"}
            </button>
          </div>
          {grade && (
            <div className="card-surface rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Recall score</h4>
                <span className="chip">{Math.round(grade.score * 100)}%</span>
              </div>
              <p className="mt-2 text-sm">{grade.summary}</p>
            </div>
          )}
        </>
      )}

      {tab === "reader" && (
        <>
          <p className="text-sm text-[var(--color-muted)]">
            Read progressively harder sentences from your sources — build fluency before deep study.
          </p>
          {chunks.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">Add longer sources for graded reading chunks.</p>
          ) : (
            <div className="card-surface rounded-2xl p-4">
              <div className="flex items-center justify-between text-xs text-[var(--color-muted)]">
                <span>
                  {chunk.sourceTitle} · chunk {readerIdx + 1}/{chunks.length}
                </span>
                <span className={DIFF_COLOR[chunk.difficulty]}>{chunk.difficulty}</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed">{revealed ? chunk.text : "••• Read aloud or silently, then reveal."}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className="btn text-xs" onClick={() => setRevealed(true)}>
                  Reveal
                </button>
                <button
                  type="button"
                  className="btn text-xs"
                  onClick={() => {
                    setReaderIdx((i) => (i + 1) % chunks.length);
                    setRevealed(false);
                  }}
                >
                  Next →
                </button>
                <button
                  type="button"
                  className="btn btn-primary text-xs"
                  onClick={() =>
                    logActivity({ brainId, kind: "practice", score: 1, payload: { gradedReader: chunk.difficulty } })
                  }
                >
                  Done ✓
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {tab === "teach" && <TeachBackStudio brainId={brainId} />}
    </div>
  );
}
