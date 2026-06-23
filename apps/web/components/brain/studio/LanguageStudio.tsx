"use client";
import { useMemo, useState } from "react";
import { useBrain, useStore } from "@/lib/store";
import { useRecorder } from "../StudioTab";

type Mode = "speak" | "listen";

export function LanguageStudio({ brainId }: { brainId: string }) {
  const { cards, atoms, sources } = useBrain(brainId);
  const { logActivity } = useStore();
  const rec = useRecorder();
  const [mode, setMode] = useState<Mode>("speak");
  const [idx, setIdx] = useState(0);
  const [heard, setHeard] = useState(false);
  const [typed, setTyped] = useState("");
  const [checked, setChecked] = useState<boolean | null>(null);

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
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(phrase);
    u.rate = mode === "listen" ? 0.85 : 0.9;
    u.onend = () => setHeard(true);
    window.speechSynthesis.speak(u);
  };

  const checkDictation = () => {
    const score = overlap(typed, phrase);
    const ok = score >= 0.55;
    setChecked(ok);
    logActivity({ brainId, kind: "listen", score, payload: { mode: "dictation" } });
  };

  const next = () => {
    setIdx((i) => (i + 1) % prompts.length);
    setHeard(false);
    setTyped("");
    setChecked(null);
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
      <div className="flex gap-2">
        <button type="button" className={`btn text-sm ${mode === "speak" ? "btn-primary" : ""}`} onClick={() => setMode("speak")}>
          Shadowing
        </button>
        <button type="button" className={`btn text-sm ${mode === "listen" ? "btn-primary" : ""}`} onClick={() => setMode("listen")}>
          Listen & type
        </button>
      </div>

      {mode === "speak" ? (
        <div className="card-surface rounded-2xl p-6 text-center">
          <p className="text-xs text-[var(--color-muted)]">Prompt {idx + 1} / {prompts.length}</p>
          <p className="mt-2 text-xl">{phrase}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button type="button" className="btn" onClick={speak}>🔊 Hear it</button>
            {!rec.recording ? (
              <button type="button" className="btn btn-primary" onClick={() => rec.start()}>🎙️ Shadow it</button>
            ) : (
              <button
                type="button"
                className="btn"
                onClick={() => {
                  rec.stop();
                  logActivity({ brainId, kind: "speak", durationSec: rec.seconds });
                }}
              >
                ⏹ Stop ({rec.seconds}s)
              </button>
            )}
            <button type="button" className="btn" onClick={next}>Next →</button>
          </div>
          {rec.url && <audio controls src={rec.url} className="mx-auto mt-4 w-full max-w-sm" />}
        </div>
      ) : (
        <div className="card-surface rounded-2xl p-6">
          <p className="text-xs text-[var(--color-muted)]">Dictation {idx + 1} / {prompts.length}</p>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Listen without reading, then type what you heard.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" onClick={speak}>🔊 Play audio</button>
            {heard && <span className="text-xs text-[var(--color-muted)] self-center">Played</span>}
          </div>
          <textarea
            className="input mt-4 min-h-[72px]"
            placeholder="Type what you heard…"
            value={typed}
            onChange={(e) => { setTyped(e.target.value); setChecked(null); }}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" disabled={!typed.trim()} onClick={checkDictation}>
              Check
            </button>
            <button type="button" className="btn" onClick={next}>Next →</button>
          </div>
          {checked !== null && (
            <p className={`mt-3 text-sm ${checked ? "text-emerald-600" : "text-amber-600"}`}>
              {checked ? "Close enough — good!" : "Partial match — compare:"}
            </p>
          )}
          {checked === false && (
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{phrase}</p>
          )}
        </div>
      )}
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
