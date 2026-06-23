"use client";
import { useMemo, useState } from "react";
import { useBrain, useStore } from "@/lib/store";
import { useRecorder } from "../StudioTab";

export function LanguageStudio({ brainId }: { brainId: string }) {
  const { cards, atoms, sources } = useBrain(brainId);
  const { logActivity } = useStore();
  const rec = useRecorder();
  const [idx, setIdx] = useState(0);

  // Build speaking prompts from cards / atoms / source sentences.
  const prompts = useMemo(() => {
    const fromCards = cards.map((c) => c.back || c.front);
    const fromAtoms = atoms.map((a) => a.title);
    const fromText = sources
      .flatMap((s) => s.text.split(/(?<=[.!?])\s+/))
      .filter((s) => s.length > 12 && s.length < 120);
    const all = [...fromCards, ...fromAtoms, ...fromText].filter(Boolean);
    return Array.from(new Set(all)).slice(0, 50);
  }, [cards, atoms, sources]);

  const phrase = prompts[idx];

  const speak = () => {
    if (!phrase || typeof window === "undefined" || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(phrase);
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  };

  if (prompts.length === 0) {
    return (
      <div className="card-surface rounded-2xl p-8 text-center text-sm text-[var(--color-muted)]">
        Capture some text or generate cards first — speaking practice is built from your material.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-[var(--color-muted)]">
        Comprehensible input + shadowing: hear it, say it, record yourself, compare.
      </p>

      <div className="card-surface rounded-2xl p-6 text-center">
        <p className="text-xs text-[var(--color-muted)]">Prompt {idx + 1} / {prompts.length}</p>
        <p className="mt-2 text-xl">{phrase}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button className="btn" onClick={speak}>🔊 Hear it</button>
          {!rec.recording ? (
            <button className="btn btn-primary" onClick={() => rec.start()}>🎙️ Shadow it</button>
          ) : (
            <button
              className="btn"
              onClick={() => {
                rec.stop();
                logActivity({ brainId, kind: "speak", durationSec: rec.seconds });
              }}
            >
              ⏹ Stop ({rec.seconds}s)
            </button>
          )}
          <button
            className="btn"
            onClick={() => {
              setIdx((i) => (i + 1) % prompts.length);
            }}
          >
            Next →
          </button>
        </div>
        {rec.url && <audio controls src={rec.url} className="mx-auto mt-4 w-full max-w-sm" />}
      </div>
    </div>
  );
}
