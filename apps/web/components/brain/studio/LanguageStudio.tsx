"use client";
import { useMemo, useState } from "react";
import { dialogueFollowUp, generateDialogueTurn, mineVocab, scorePronunciation } from "@learn-anything/core";
import { useBrain, useStore } from "@/lib/store";
import { useRecorder } from "../StudioTab";

type Mode = "speak" | "listen" | "vocab" | "conversation";

export function LanguageStudio({ brainId }: { brainId: string }) {
  const { cards, atoms, sources } = useBrain(brainId);
  const { logActivity, generateVocabCards } = useStore();
  const rec = useRecorder();
  const [mode, setMode] = useState<Mode>("speak");
  const [idx, setIdx] = useState(0);
  const [heard, setHeard] = useState(false);
  const [typed, setTyped] = useState("");
  const [checked, setChecked] = useState<boolean | null>(null);
  const [mining, setMining] = useState(false);
  const [dialogue, setDialogue] = useState("");
  const [reply, setReply] = useState("");
  const [pronScore, setPronScore] = useState<number | null>(null);

  const contextText = useMemo(() => sources.map((s) => s.text).join("\n").slice(0, 4000), [sources]);

  const vocab = useMemo(() => mineVocab(sources, 16), [sources]);

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
    const pron = scorePronunciation(typed, phrase);
    const blended = (score + pron.score) / 2;
    const ok = blended >= 0.55;
    setChecked(ok);
    logActivity({ brainId, kind: "listen", score: blended, payload: { mode: "dictation" } });
  };

  const next = () => {
    setIdx((i) => (i + 1) % prompts.length);
    setHeard(false);
    setTyped("");
    setChecked(null);
  };

  if (prompts.length === 0 && vocab.length === 0) {
    return (
      <div className="card-surface rounded-2xl p-8 text-center text-sm text-[var(--color-muted)]">
        Capture some text first — speaking and vocab mining need source material.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <button type="button" className={`btn text-sm ${mode === "speak" ? "btn-primary" : ""}`} onClick={() => setMode("speak")}>
          Shadowing
        </button>
        <button type="button" className={`btn text-sm ${mode === "listen" ? "btn-primary" : ""}`} onClick={() => setMode("listen")}>
          Listen & type
        </button>
        <button type="button" className={`btn text-sm ${mode === "vocab" ? "btn-primary" : ""}`} onClick={() => setMode("vocab")}>
          Vocab ({vocab.length})
        </button>
        <button type="button" className={`btn text-sm ${mode === "conversation" ? "btn-primary" : ""}`} onClick={() => { setMode("conversation"); setDialogue(generateDialogueTurn(contextText)); }}>
          Conversation
        </button>
      </div>

      {mode === "conversation" ? (
        <div className="card-surface rounded-2xl p-4 space-y-3">
          <p className="text-sm whitespace-pre-wrap">{dialogue}</p>
          <textarea className="input min-h-[80px]" placeholder="Your response…" value={reply} onChange={(e) => setReply(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" disabled={!reply.trim()} onClick={() => {
              const follow = dialogueFollowUp(reply, contextText);
              setDialogue(follow);
              const p = scorePronunciation(reply, phrase);
              setPronScore(p.score);
              logActivity({ brainId, kind: "speak", score: p.score, payload: { conversation: true } });
              setReply("");
            }}>Send</button>
            <button type="button" className="btn" onClick={() => setDialogue(generateDialogueTurn(contextText))}>New topic</button>
          </div>
          {pronScore != null && <p className="text-xs text-[var(--color-accent)]">Overlap score: {Math.round(pronScore * 100)}%</p>}
        </div>
      ) : mode === "vocab" ? (
        <div className="card-surface rounded-2xl p-4">
          <h4 className="text-sm font-semibold">Mined vocabulary</h4>
          <p className="mt-1 text-xs text-[var(--color-muted)]">From your sources — turn into cloze cards for Learn.</p>
          <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto text-sm">
            {vocab.map((v) => (
              <li key={v.term} className="flex justify-between gap-2">
                <span className="font-medium">{v.term}</span>
                <span className="truncate text-xs text-[var(--color-muted)]">{v.context.slice(0, 50)}…</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn btn-primary mt-4"
            disabled={mining || !vocab.length}
            onClick={async () => {
              setMining(true);
              const made = await generateVocabCards(brainId);
              setMining(false);
              logActivity({ brainId, kind: "practice", score: 1, payload: { vocabCards: made.length } });
            }}
          >
            {mining ? "Creating…" : `Create ${Math.min(vocab.length, 15)} cloze cards → Learn`}
          </button>
        </div>
      ) : mode === "speak" ? (
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
