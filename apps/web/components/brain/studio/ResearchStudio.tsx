"use client";
import { useState } from "react";
import {
  HashingEmbedder,
  buildGroundedPrompt,
  gradeQuality,
  makeArtifact,
  retrieve,
  type BloomLevel,
} from "@learn-anything/core";
import { useBrain, useStore } from "@/lib/store";
import { getProvider } from "@/lib/llm";

const embedder = new HashingEmbedder(256);

export function ResearchStudio({ brainId }: { brainId: string }) {
  const { brain, atoms, sources, artifacts } = useBrain(brainId);
  const { addArtifact } = useStore();
  const [topic, setTopic] = useState(brain?.goal ?? "");
  const [busy, setBusy] = useState(false);

  const allowCloud = brain?.privacy.aiProcessing === "cloud" && brain.privacy.allowCloudGeneration;

  const synthesize = async () => {
    const q = topic.trim() || "the central themes across these sources";
    setBusy(true);
    try {
      const ctx = await retrieve(q, { embedder, atoms, sources, k: 8 });
      const provider = getProvider({ allowCloud: !!allowCloud });
      const prompt = buildGroundedPrompt(
        `Write a concise literature synthesis on "${q}". Group sources by theme, note agreements/disagreements, and end with open gaps. Cite passages as [[n]].`,
        ctx.promptContext || "(no captured context yet)",
        { persona: "You are a meticulous research advisor.", bloomTarget: "evaluate" as BloomLevel },
      );
      const body = await provider.complete(prompt);
      const citations = ctx.passages.map((p) => p.citation);
      const quality = gradeQuality(body, citations, ctx.promptContext, ["analyze", "evaluate"]);
      const artifact = makeArtifact("lesson", brainId, `Synthesis: ${q}`, body, citations, quality);
      addArtifact(artifact);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="card-surface rounded-2xl p-4">
        <h3 className="text-sm font-semibold">Literature synthesis</h3>
        <p className="mt-0.5 text-xs text-[var(--color-muted)]">
          Grounded in your {sources.length} sources + {atoms.length} atoms. Every claim is checked and cited.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            className="input"
            placeholder="Focus / research question (optional)"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
          <button className="btn btn-primary whitespace-nowrap" onClick={synthesize} disabled={busy}>
            {busy ? "Synthesizing…" : "Generate"}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {artifacts
          .slice()
          .reverse()
          .map((a) => (
            <div key={a.id} className="card-surface rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">{a.title}</h4>
                <QualityBadge score={a.quality.score} verified={a.quality.verified} />
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm">{a.body}</p>
              {a.quality.flags.length > 0 && (
                <p className="mt-2 text-xs text-amber-400">⚠ {a.quality.flags.join(", ")}</p>
              )}
              <p className="mt-2 text-xs text-[var(--color-muted)]">
                {a.citations.length} citations · Bloom: {a.quality.bloomCoverage.join(", ")}
              </p>
            </div>
          ))}
      </div>
    </div>
  );
}

function QualityBadge({ score, verified }: { score: number; verified: boolean }) {
  const pct = Math.round(score * 100);
  const tone = pct >= 70 ? "text-emerald-400" : pct >= 50 ? "text-amber-400" : "text-rose-400";
  return (
    <span className="chip">
      <span className={tone}>{verified ? "✓ verified" : "unverified"}</span> · {pct}%
    </span>
  );
}
