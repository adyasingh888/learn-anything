"use client";
import { useMemo, useState } from "react";
import { newId, now } from "@learn-anything/core";
import { useBrain, useStore } from "@/lib/store";
import { useRecorder } from "../StudioTab";

const RUBRIC = [
  { id: "structure", label: "Clear structure (beginning, middle, end)" },
  { id: "clarity", label: "Ideas expressed clearly" },
  { id: "voice", label: "Distinct voice or perspective" },
  { id: "grounding", label: "Grounded in exemplar material" },
];

export function CreativeStudio({ brainId }: { brainId: string }) {
  const { sources, atoms } = useBrain(brainId);
  const { logActivity, addArtifact } = useStore();
  const rec = useRecorder();
  const [exemplarIdx, setExemplarIdx] = useState(0);
  const [draft, setDraft] = useState("");
  const [checks, setChecks] = useState<Record<string, boolean>>({});

  const exemplars = useMemo(() => {
    const fromSources = sources.filter((s) => s.text.length > 80).map((s) => ({ title: s.title, text: s.text.slice(0, 600) }));
    const fromAtoms = atoms.map((a) => ({ title: a.title, text: a.body }));
    return [...fromSources, ...fromAtoms].slice(0, 20);
  }, [sources, atoms]);

  const exemplar = exemplars[exemplarIdx];
  const score = RUBRIC.filter((r) => checks[r.id]).length / RUBRIC.length;

  const submit = () => {
    logActivity({ brainId, kind: "critique", score, payload: { rubric: checks } });
    addArtifact({
      id: newId("art"),
      brainId,
      kind: "critique",
      title: `Creative draft — ${exemplar?.title ?? "untitled"}`,
      body: draft,
      citations: [],
      quality: {
        grounded: score >= 0.5,
        verified: true,
        bloomCoverage: [],
        flags: [],
        score,
      },
      createdAt: now(),
    });
  };

  if (exemplars.length === 0) {
    return (
      <div className="card-surface rounded-2xl p-8 text-center text-sm text-[var(--color-muted)]">
        Capture exemplar material in Sources first — creative practice imitates and responds to your library.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--color-muted)]">
        Exemplar → imitate → self-critique. Study a piece from your brain, then create in response.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card-surface rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Exemplar</h4>
            <button type="button" className="btn text-xs" onClick={() => setExemplarIdx((i) => (i + 1) % exemplars.length)}>
              Next →
            </button>
          </div>
          <p className="mt-2 font-medium">{exemplar.title}</p>
          <p className="mt-2 max-h-48 overflow-y-auto text-sm text-[var(--color-text-secondary)]">{exemplar.text}</p>
        </div>
        <div className="card-surface rounded-2xl p-4">
          <h4 className="text-sm font-semibold">Your draft</h4>
          <textarea
            className="input mt-2 min-h-[140px]"
            placeholder="Write in response to the exemplar…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="mt-2 flex gap-2">
            {!rec.recording ? (
              <button type="button" className="btn text-xs" onClick={() => rec.start()}>🎙️ Record read-aloud</button>
            ) : (
              <button type="button" className="btn text-xs" onClick={() => rec.stop()}>⏹ Stop</button>
            )}
          </div>
          {rec.url && <audio controls src={rec.url} className="mt-2 w-full" />}
        </div>
      </div>
      <div className="card-surface rounded-2xl p-4">
        <h4 className="text-sm font-semibold">Rubric self-check</h4>
        <ul className="mt-2 space-y-2">
          {RUBRIC.map((r) => (
            <li key={r.id}>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!checks[r.id]}
                  onChange={(e) => setChecks((c) => ({ ...c, [r.id]: e.target.checked }))}
                />
                {r.label}
              </label>
            </li>
          ))}
        </ul>
        <button type="button" className="btn btn-primary mt-4" disabled={!draft.trim()} onClick={submit}>
          Save critique ({Math.round(score * 100)}% rubric)
        </button>
      </div>
    </div>
  );
}
