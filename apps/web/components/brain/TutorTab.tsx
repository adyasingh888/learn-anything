"use client";
import { useRef, useState } from "react";
import { HashingEmbedder, buildGroundedPrompt, getMode, retrieve, socraticTurn } from "@learn-anything/core";
import { useBrain, useStore } from "@/lib/store";
import { getProvider } from "@/lib/llm";

const embedder = new HashingEmbedder(256);

interface Msg {
  role: "user" | "assistant";
  content: string;
  citations?: { label: string }[];
  offline?: boolean;
  socratic?: boolean;
}

export function TutorTab({ brainId }: { brainId: string }) {
  const { brain, atoms, sources } = useBrain(brainId);
  const { logActivity } = useStore();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [awaitingAnswer, setAwaitingAnswer] = useState(false);
  const lastQuestionRef = useRef<string>("");
  const endRef = useRef<HTMLDivElement>(null);

  const mode = getMode(brain?.modeId, brain?.domainType ?? "general");
  const allowCloud = brain?.privacy.aiProcessing === "cloud" && brain?.privacy.allowCloudGeneration;
  const useSocratic =
    !allowCloud &&
    (mode.id === "concept-mastery" || mode.id === "research-scholar" || mode.id === "capture-digest");

  const buildRichContext = async (query: string) => {
    const rag = await retrieve(query, { embedder, atoms, sources, k: 8 });
    const sourceBlock = sources
      .slice(0, 4)
      .map((s, i) => `[[S${i + 1}]] ${s.title}\n${s.text.slice(0, 1500)}`)
      .join("\n\n---\n\n");
    const promptContext = [rag.promptContext, sourceBlock].filter(Boolean).join("\n\n---\n\n");
    return { ...rag, promptContext };
  };

  const ask = async (q: string) => {
    if (!q.trim()) return;
    setMessages((m) => [...m, { role: "user", content: q }]);
    setInput("");
    setBusy(true);
    try {
      const ctx = await buildRichContext(q);
      const context = ctx.promptContext || "(no captured context yet)";

      if (useSocratic) {
        const priorAnswer = awaitingAnswer ? q : undefined;
        const turn = socraticTurn(lastQuestionRef.current || q, context, priorAnswer);
        lastQuestionRef.current = q;
        setAwaitingAnswer(turn.expectsAnswer);
        setMessages((m) => [
          ...m,
          { role: "assistant", content: turn.content, offline: true, socratic: true },
        ]);
        logActivity({ brainId, kind: "tutor", payload: { socratic: true } });
        return;
      }

      const provider = getProvider({ allowCloud: !!allowCloud });
      const persona =
        mode.id === "research-scholar"
          ? "You are a sharp research advisor. Explain clearly, challenge claims, surface gaps."
          : mode.id === "concept-mastery" || mode.id === "capture-digest"
            ? "You are a patient tutor. Explain concepts simply with examples from the context."
            : "You are a rigorous, encouraging Socratic tutor.";
      const prompt = buildGroundedPrompt(q, context, { persona });
      const text = await provider.complete(prompt);
      const usedOffline = provider.local || text.includes("don't have enough material");
      const citations = ctx.passages.slice(0, 4).map((p, i) => ({
        label: `[[${i + 1}]] ${sources.find((s) => s.id === p.citation.sourceId)?.title ?? atoms.find((a) => a.id === p.citation.atomId)?.title ?? "source"}`,
      }));
      setMessages((m) => [...m, { role: "assistant", content: text, citations, offline: usedOffline }]);
      logActivity({ brainId, kind: "tutor" });
    } finally {
      setBusy(false);
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));
    }
  };

  const hasMaterial = sources.length > 0 || atoms.length > 0;

  return (
    <div className="flex flex-col">
      <div className="card-surface rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Tutor</h3>
          <span className="chip">
            {allowCloud ? "☁️ Cloud AI" : useSocratic ? "🧠 Socratic" : "📱 On-device"}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-[var(--color-muted)]">
          Grounded in {sources.length} sources and {atoms.length} atoms.
          {useSocratic && " Offline Socratic mode asks you questions before explaining."}
        </p>
        {!hasMaterial && (
          <p className="mt-2 rounded-lg bg-[var(--color-accent-soft)] p-2 text-xs">
            Capture a link in Sources first — the tutor reads your material, not the open web.
          </p>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {suggestions(mode.id).map((s) => (
              <button key={s} type="button" className="btn text-xs" onClick={() => ask(s)}>
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[92%] rounded-2xl p-3 text-sm ${
              m.role === "user" ? "ml-auto bg-[var(--color-accent)] text-white" : "card-surface"
            }`}
          >
            <p className="whitespace-pre-wrap">{m.content}</p>
            {m.socratic && m.role === "assistant" && (
              <p className="mt-2 text-[10px] text-[var(--color-muted)]">Socratic tutor · answer before continuing</p>
            )}
            {m.offline && !m.socratic && m.role === "assistant" && (
              <p className="mt-2 text-[10px] text-[var(--color-muted)]">On-device tutor · grounded in your captures</p>
            )}
            {m.citations && m.citations.length > 0 && (
              <div className={`mt-2 flex flex-wrap gap-1 border-t pt-2 ${m.role === "user" ? "border-white/20" : "border-[var(--color-line)]"}`}>
                {m.citations.map((c, j) => (
                  <span key={j} className="chip text-[10px]">{c.label}</span>
                ))}
              </div>
            )}
          </div>
        ))}
        {busy && <p className="text-xs text-[var(--color-muted)]">Reading your sources…</p>}
        <div ref={endRef} />
      </div>

      <form
        className="sticky bottom-2 mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
      >
        <input
          className="input"
          placeholder={awaitingAnswer ? "Your answer to the question…" : "Explain the main concept to me…"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => ask(input)}>
          Send
        </button>
      </form>
    </div>
  );
}

function suggestions(modeId: string): string[] {
  switch (modeId) {
    case "research-scholar":
      return ["Explain the main argument simply", "What gaps exist in my sources?", "How do my sources disagree?"];
    case "concept-mastery":
      return ["Explain the core concept simply", "How do these ideas connect?", "Quiz me on the hardest part"];
    default:
      return ["Explain the main concept to me", "Summarize what I've captured", "What should I read next?"];
  }
}
