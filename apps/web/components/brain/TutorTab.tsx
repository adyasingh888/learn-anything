"use client";
import { useRef, useState } from "react";
import { HashingEmbedder, buildGroundedPrompt, getMode, retrieve } from "@learn-anything/core";
import { useBrain, useStore } from "@/lib/store";
import { getProvider } from "@/lib/llm";

const embedder = new HashingEmbedder(256);

interface Msg {
  role: "user" | "assistant";
  content: string;
  citations?: { label: string }[];
}

export function TutorTab({ brainId }: { brainId: string }) {
  const { brain, atoms, sources } = useBrain(brainId);
  const { logActivity } = useStore();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const mode = getMode(brain?.modeId, brain?.domainType ?? "general");
  const allowCloud = brain?.privacy.aiProcessing === "cloud" && brain.privacy.allowCloudGeneration;

  const ask = async (q: string) => {
    if (!q.trim()) return;
    setMessages((m) => [...m, { role: "user", content: q }]);
    setInput("");
    setBusy(true);
    try {
      const ctx = await retrieve(q, { embedder, atoms, sources, k: 6 });
      const provider = getProvider({ allowCloud: !!allowCloud });
      const persona =
        mode.id === "research-scholar"
          ? "You are a sharp research advisor. Challenge claims and surface gaps."
          : mode.id === "language-immersion"
            ? "You are a patient language tutor. Use simple language slightly above the learner's level."
            : "You are a rigorous, encouraging Socratic tutor.";
      const prompt = buildGroundedPrompt(q, ctx.promptContext || "(no captured context yet)", {
        persona,
      });
      const text = await provider.complete(prompt);
      const citations = ctx.passages.slice(0, 4).map((p, i) => ({
        label: `[[${i + 1}]] ${sources.find((s) => s.id === p.citation.sourceId)?.title ?? atoms.find((a) => a.id === p.citation.atomId)?.title ?? "source"}`,
      }));
      setMessages((m) => [...m, { role: "assistant", content: text, citations }]);
      logActivity({ brainId, kind: "tutor" });
    } finally {
      setBusy(false);
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));
    }
  };

  return (
    <div className="flex flex-col">
      <div className="card-surface rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Tutor</h3>
          <span className="chip">{allowCloud ? "☁️ Cloud AI" : "📵 On-device"}</span>
        </div>
        <p className="mt-0.5 text-xs text-[var(--color-muted)]">
          Grounded in this brain's {sources.length} sources + {atoms.length} atoms. Answers cite what they use.
        </p>
      </div>

      <div className="mt-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {suggestions(mode.id).map((s) => (
              <button key={s} className="btn text-xs" onClick={() => ask(s)}>
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[88%] rounded-2xl p-3 text-sm ${
              m.role === "user"
                ? "ml-auto bg-[var(--color-accent)] text-white"
                : "card-surface"
            }`}
          >
            <p className="whitespace-pre-wrap">{m.content}</p>
            {m.citations && m.citations.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1 border-t border-white/10 pt-2">
                {m.citations.map((c, j) => (
                  <span key={j} className="chip text-[10px]">{c.label}</span>
                ))}
              </div>
            )}
          </div>
        ))}
        {busy && <p className="text-xs text-[var(--color-muted)]">Thinking…</p>}
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
          placeholder="Ask anything about this brain…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="btn btn-primary" disabled={busy}>
          Send
        </button>
      </form>
    </div>
  );
}

function suggestions(modeId: string): string[] {
  switch (modeId) {
    case "research-scholar":
      return ["Summarize the key claims so far", "What gaps exist in my sources?", "Steelman the opposing view"];
    case "language-immersion":
      return ["Quiz me on recent vocabulary", "Make a short dialogue", "Explain a grammar point simply"];
    case "concept-mastery":
      return ["Explain the core idea simply", "How do these concepts connect?", "Ask me a hard question"];
    default:
      return ["Summarize what I've captured", "Quiz me", "What should I learn next?"];
  }
}
