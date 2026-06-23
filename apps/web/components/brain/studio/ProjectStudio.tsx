"use client";
import { useMemo, useState } from "react";
import { computePacing, isMastered, milestoneActivitySummary, nextObjective } from "@learn-anything/core";
import { useBrain, useStore } from "@/lib/store";

export function ProjectStudio({ brainId }: { brainId: string }) {
  const { brain, objectives, mastery, sources, activities } = useBrain(brainId);
  const { logActivity } = useStore();
  const [reflection, setReflection] = useState("");
  const [saved, setSaved] = useState(false);

  const masteryMap = useMemo(() => new Map(mastery.map((m) => [m.objectiveId, m])), [mastery]);
  const current = useMemo(() => nextObjective(objectives, masteryMap), [objectives, masteryMap]);
  const pacing = useMemo(() => computePacing(brain?.deadline, objectives, mastery), [brain?.deadline, objectives, mastery]);
  const milestoneLog = useMemo(() => milestoneActivitySummary(objectives, activities), [objectives, activities]);

  const recentWork = activities
    .filter((a) => ["tutor", "teach-back", "mock-exam", "review", "critique", "code"].includes(a.kind))
    .slice(-5)
    .reverse();

  const saveReflection = () => {
    if (!reflection.trim()) return;
    logActivity({
      brainId,
      kind: "project",
      score: 0.8,
      objectiveId: current?.id,
      payload: { reflection: reflection.trim() },
    });
    setReflection("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-[var(--color-muted)]">
        Project mode tracks milestones, deadline pacing, and weekly reflection.
      </p>

      {pacing.objectivesTotal > 0 && (
        <div className="card-surface rounded-2xl p-4">
          <h4 className="text-sm font-semibold">Pacing</h4>
          <p className={`mt-1 text-sm ${pacing.onTrack ? "text-emerald-600" : "text-amber-600"}`}>{pacing.message}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="chip">{pacing.objectivesMastered}/{pacing.objectivesTotal} mastered</span>
            {pacing.daysLeft != null && <span className="chip">{pacing.daysLeft} days left</span>}
          </div>
        </div>
      )}

      <div className="card-surface rounded-2xl p-4">
        <h4 className="text-sm font-semibold">Milestones</h4>
        {objectives.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Set a goal in Settings to auto-generate milestones.
          </p>
        ) : (
          <ol className="mt-3 space-y-2">
            {objectives.map((o, i) => {
              const m = masteryMap.get(o.id);
              const done = isMastered(m);
              const active = current?.id === o.id;
              return (
                <li
                  key={o.id}
                  className={`rounded-lg border p-3 text-sm ${active ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]/30" : ""}`}
                >
                  <span className="text-xs text-[var(--color-muted)]">Milestone {i + 1}</span>
                  <p className="font-medium">{done ? "✓ " : active ? "→ " : ""}{o.title}</p>
                  <p className="text-xs text-[var(--color-muted)]">{Math.round((m?.mastery ?? 0) * 100)}% mastery</p>
                  {(() => {
                    const log = milestoneLog.find((x) => x.objectiveId === o.id);
                    if (!log?.activityCount) return null;
                    return (
                      <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                        {log.activityCount} logged · {log.kinds.join(", ")}
                        {log.avgScore != null ? ` · avg ${Math.round(log.avgScore * 100)}%` : ""}
                      </p>
                    );
                  })()}
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <div className="card-surface rounded-2xl p-4">
        <h4 className="text-sm font-semibold">Weekly reflection</h4>
        <textarea
          className="input mt-2 min-h-[88px]"
          placeholder="What did you ship this week? What's blocked?"
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
        />
        <button type="button" className="btn btn-primary mt-2" disabled={!reflection.trim()} onClick={saveReflection}>
          {saved ? "Saved ✓" : "Save reflection"}
        </button>
      </div>

      <div className="card-surface rounded-2xl p-4">
        <h4 className="text-sm font-semibold">Project stats</h4>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <span className="chip">{sources.length} sources</span>
          <span className="chip">{activities.length} activities logged</span>
        </div>
        {recentWork.length > 0 && (
          <ul className="mt-3 space-y-1 text-xs text-[var(--color-text-secondary)]">
            {recentWork.map((a) => (
              <li key={a.id}>· {a.kind}{a.score != null ? ` (${Math.round(a.score * 100)}%)` : ""}</li>
            ))}
          </ul>
        )}
      </div>

      {!brain?.deadline && (
        <p className="text-xs text-[var(--color-muted)]">
          Tip: set a target date in Settings for deadline-aware pacing.
        </p>
      )}
    </div>
  );
}
