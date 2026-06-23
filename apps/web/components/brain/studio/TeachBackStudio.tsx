"use client";
import { useMemo, useState } from "react";
import { HashingEmbedder, buildGroundedPrompt, retrieve } from "@learn-anything/core";
import { useBrain, useStore } from "@/lib/store";
import { getProvider } from "@/lib/llm";

const embedder = new HashingEmbedder(256);

export function TeachBackStudio({ brainId }: { brainId: string }) {
  const { brain, atoms, concepts, sources } = useBrain(brainId);
  const { logActivity } = useStore();
  const [target, setTarget] = useState("");
  const [explanation, setExplanation] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const topics = useMemo(
    () => [...concepts.map((c) => c.label), ...atoms.map((a) => a.title)].slice(0, 12),
    [concepts, atoms],
  );

  const allowCloud = brain?.privacy.aiProcessing === "cloud" && brain.privacy.allowCloudGeneration;

  const grade = async () => {
    if (!explanation.trim()) return;
    setBusy(true);
    try {
      const ctx = await retrieve(target || explanation, { embedder, atoms, sources, k: 5 });
      const provider = getProvider({ allowCloud: !!allowCloud });
      const prompt = buildGroundedPrompt(
        `The learner is using the Feynman technique to explain "${target || "this topic"}". Their explanation:\n"""${explanation}"""\n\nUsing ONLY the context, point out (1) what they got right, (2) gaps or errors, and (3) one question to deepen understanding. Be concise and encouraging.`,
        ctx.promptContext || "(no captured context yet)",
        { persona: "You are a supportive tutor applying the Feynman technique." },
      );
      const text = await provider.complete(prompt);
      setFeedback(text);
      logActivity({ brainId, kind: "teach-back" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-[var(--color-muted)]">
        The fastest way to find the holes in your understanding: explain it simply, as if teaching a beginner.
      </p>

      {topics.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {topics.map((t) => (
            <button
              key={t}
              className={`chip ${target === t ? "border-[var(--color-accent)] text-white" : ""}`}
              onClick={() => setTarget(t)}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      <div className="card-surface rounded-2xl p-4">
        <input
          className="input"
          placeholder="What are you explaining?"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        />
        <textarea
          className="input mt-2 min-h-[140px]"
          placeholder="Explain it in your own words…"
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
        />
        <button className="btn btn-primary mt-3" onClick={grade} disabled={busy || !explanation.trim()}>
          {busy ? "Reviewing…" : "Check my understanding"}
        </button>
      </div>

      {feedback && (
        <div className="card-surface rounded-2xl p-4">
          <h4 className="text-sm font-semibold">Feedback</h4>
          <p className="mt-2 whitespace-pre-wrap text-sm">{feedback}</p>
        </div>
      )}
    </div>
  );
}
