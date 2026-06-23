"use client";
import { useRouter } from "next/navigation";
import { allModes, getMode } from "@learn-anything/core";
import { useBrain, useStore } from "@/lib/store";

export function BrainSettings({ brainId }: { brainId: string }) {
  const { brain } = useBrain(brainId);
  const { updateBrain, deleteBrain } = useStore();
  const router = useRouter();
  if (!brain) return null;

  const mode = getMode(brain.modeId, brain.domainType);
  const compatible = allModes().filter((m) => m.domainTypes.includes(brain.domainType));
  const modeOptions = compatible.length > 1 ? compatible : allModes();

  return (
    <div className="space-y-5">
      <div className="card-surface rounded-2xl p-4">
        <h3 className="text-sm font-semibold">Goal</h3>
        <input
          className="input mt-2"
          defaultValue={brain.goal ?? ""}
          placeholder="What do you want to achieve?"
          onBlur={(e) => updateBrain(brainId, { goal: e.target.value })}
        />
        <label className="mt-3 block text-xs text-[var(--color-muted)]">Target date</label>
        <input
          type="date"
          className="input mt-1"
          defaultValue={brain.deadline ?? ""}
          onChange={(e) => updateBrain(brainId, { deadline: e.target.value })}
        />
      </div>

      <div className="card-surface rounded-2xl p-4">
        <h3 className="text-sm font-semibold">Learning mode</h3>
        <p className="mt-0.5 text-xs text-[var(--color-muted)]">{mode.tagline}</p>
        <select
          className="input mt-2"
          value={brain.modeId}
          onChange={(e) => updateBrain(brainId, { modeId: e.target.value })}
        >
          {modeOptions.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <Detail label="Target retention" value={`${Math.round(mode.scheduler.targetRetention * 100)}%`} />
          <Detail label="Interleave" value={mode.scheduler.interleave ? "Yes" : "No"} />
          <Detail label="Practice" value={mode.practice.join(", ")} />
          <Detail label="Feedback" value={mode.feedback.join(", ")} />
        </div>
      </div>

      <div className="card-surface rounded-2xl p-4">
        <h3 className="text-sm font-semibold">Privacy for this brain</h3>
        <div className="mt-3 space-y-3 text-sm">
          <label className="flex items-center justify-between">
            <span>AI processing</span>
            <select
              className="input w-auto"
              value={brain.privacy.aiProcessing}
              onChange={(e) =>
                updateBrain(brainId, {
                  privacy: { ...brain.privacy, aiProcessing: e.target.value as "device" | "cloud" },
                })
              }
            >
              <option value="device">On-device only</option>
              <option value="cloud">Cloud (zero-retention)</option>
            </select>
          </label>
          <label className="flex items-center justify-between">
            <span>Allow cloud generation</span>
            <input
              type="checkbox"
              checked={brain.privacy.allowCloudGeneration}
              onChange={(e) =>
                updateBrain(brainId, {
                  privacy: { ...brain.privacy, allowCloudGeneration: e.target.checked },
                })
              }
            />
          </label>
          <p className="text-xs text-[var(--color-muted)]">
            On-device only never sends this brain's content over the network; the offline tutor + generators are used instead.
          </p>
        </div>
      </div>

      <div className="card-surface rounded-2xl border-rose-500/30 p-4">
        <h3 className="text-sm font-semibold text-rose-400">Danger zone</h3>
        <button
          className="btn mt-2 border-rose-500/40 text-rose-400"
          onClick={() => {
            if (confirm(`Delete "${brain.name}" and all its data?`)) {
              deleteBrain(brainId);
              router.push("/");
            }
          }}
        >
          Delete brain
        </button>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-2">
      <div className="text-[var(--color-muted)]">{label}</div>
      <div className="mt-0.5 font-medium">{value}</div>
    </div>
  );
}
