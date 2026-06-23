"use client";
import { useMemo, useState } from "react";
import {
  buildConceptMap,
  computeModeMetrics,
  getMode,
  gradeActivity,
  pickRecallPrompt,
  socraticTurn,
} from "@learn-anything/core";
import { useBrain, useStore } from "@/lib/store";
import { ConceptMapPanel } from "../ConceptMapPanel";
import { TeachBackStudio } from "./TeachBackStudio";

type Tab = "map" | "socratic" | "recall" | "teach" | "metrics";

export function ConceptMasteryStudio({ brainId }: { brainId: string }) {
  const { brain, atoms, edges, concepts, activities, cards, mastery } = useBrain(brainId);
  const { logActivity } = useStore();
  const [tab, setTab] = useState<Tab>("map");
  const [socraticQ, setSocraticQ] = useState("What is the central idea?");
  const [socraticA, setSocraticA] = useState("");
  const [socraticReply, setSocraticReply] = useState<string | null>(null);
  const [recallPrompt, setRecallPrompt] = useState("");
  const [recallAnswer, setRecallAnswer] = useState("");
  const [recallGrade, setRecallGrade] = useState<number | null>(null);

  const mode = getMode(brain?.modeId, brain?.domainType ?? "concept");
  const map = useMemo(() => buildConceptMap(atoms, edges, concepts), [atoms, edges, concepts]);
  const nodeCount = map.reduce((s, r) => s + 1 + r.children.length, 0);
  const metrics = useMemo(
    () => computeModeMetrics(mode, activities, cards, mastery),
    [mode, activities, cards, mastery],
  );

  const context = atoms.map((a) => a.body).join("\n");

  const askSocratic = () => {
    const turn = socraticTurn(socraticQ, context, socraticA || undefined);
    setSocraticReply(turn.content);
    if (socraticA.trim()) {
      const g = gradeActivity(mode, { response: socraticA, context, topic: socraticQ });
      logActivity({ brainId, kind: "tutor", score: g.score });
    }
  };

  const gradeRecall = () => {
    const g = gradeActivity(mode, { provider: "text-grade", response: recallAnswer, context, topic: recallPrompt });
    setRecallGrade(g.score);
    logActivity({ brainId, kind: "free-recall", score: g.score });
  };

  if (atoms.length < 2) {
    return (
      <div className="card-surface rounded-2xl p-8 text-center text-sm text-[var(--color-muted)]">
        Capture and distill at least two atoms — concept mastery needs a connected graph.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {(["map", "socratic", "recall", "teach", "metrics"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            className={`chip ${tab === t ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white" : ""}`}
            onClick={() => {
              setTab(t);
              if (t === "recall" && !recallPrompt) setRecallPrompt(pickRecallPrompt(atoms, concepts));
            }}
          >
            {t === "map" ? "Concept map" : t === "socratic" ? "Socratic" : t === "recall" ? "Free recall" : t === "teach" ? "Teach-back" : "Metrics"}
          </button>
        ))}
      </div>

      {tab === "map" && (
        <>
          <p className="text-sm text-[var(--color-muted)]">
            {map.length} concept clusters · {nodeCount} nodes — confirm edges in Graph tab.
          </p>
          <ConceptMapPanel brainId={brainId} />
        </>
      )}

      {tab === "socratic" && (
        <div className="card-surface rounded-2xl p-4 space-y-3">
          <input className="input" value={socraticQ} onChange={(e) => setSocraticQ(e.target.value)} placeholder="Your question" />
          <textarea className="input min-h-[80px]" value={socraticA} onChange={(e) => setSocraticA(e.target.value)} placeholder="Your answer (optional)" />
          <button type="button" className="btn btn-primary" onClick={askSocratic}>Probe deeper</button>
          {socraticReply && <p className="text-sm whitespace-pre-wrap">{socraticReply}</p>}
        </div>
      )}

      {tab === "recall" && (
        <div className="card-surface rounded-2xl p-4 space-y-3">
          <p className="font-medium">{recallPrompt}</p>
          <textarea className="input min-h-[100px]" value={recallAnswer} onChange={(e) => setRecallAnswer(e.target.value)} placeholder="From memory…" />
          <button type="button" className="btn btn-primary" disabled={!recallAnswer.trim()} onClick={gradeRecall}>Grade</button>
          {recallGrade != null && <span className="chip">{Math.round(recallGrade * 100)}%</span>}
        </div>
      )}

      {tab === "teach" && <TeachBackStudio brainId={brainId} />}

      {tab === "metrics" && (
        <div className="card-surface rounded-2xl p-4">
          <h4 className="text-sm font-semibold">Mode success metrics</h4>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {Object.entries(metrics).map(([k, v]) => (
              <div key={k} className="rounded-lg border border-[var(--color-border)] p-3 text-sm">
                <p className="text-xs text-[var(--color-muted)]">{k}</p>
                <p className="font-semibold">{typeof v === "number" && v < 2 ? `${Math.round(v * 100)}%` : Math.round(v)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
