"use client";
import { useMemo, useState } from "react";
import {
  DOMAIN_CATALOG,
  DOMAIN_INTENTS,
  getDomainInfo,
  getMode,
  type DomainIntent,
  type DomainType,
} from "@learn-anything/core";
import { useStore } from "@/lib/store";

interface Props {
  onClose: () => void;
}

export function NewBrainModal({ onClose }: Props) {
  const { createBrain } = useStore();
  const [step, setStep] = useState<1 | 2>(1);
  const [domain, setDomain] = useState<DomainType>("general");
  const [intentId, setIntentId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");

  const info = getDomainInfo(domain)!;
  const mode = useMemo(() => getMode(undefined, domain), [domain]);
  const intents = DOMAIN_INTENTS[domain] ?? [];

  const activeIntent: DomainIntent | undefined = intents.find((i) => i.id === intentId);

  const namePh = activeIntent?.namePlaceholder ?? info.namePlaceholder;
  const goalPh = activeIntent?.goalPlaceholder ?? info.goalPlaceholder;

  const pickDomain = (type: DomainType) => {
    setDomain(type);
    setIntentId(null);
    setStep(2);
  };

  const pickIntent = (intent: DomainIntent) => {
    setIntentId(intent.id === intentId ? null : intent.id);
  };

  const create = () => {
    if (!name.trim()) return;
    const b = createBrain(name.trim(), domain, goal.trim() || undefined);
    onClose();
    window.location.href = `/brain/${b.id}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-brain-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-stone-900/30 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-[var(--color-bg-soft)] shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-[var(--color-line)] px-5 py-4">
          <div>
            <h2 id="new-brain-title" className="page-title text-xl font-bold">
              {step === 1 ? "What are you learning?" : "Name your brain"}
            </h2>
            <p className="mt-0.5 text-sm text-[var(--color-muted)]">
              {step === 1
                ? "Each type uses a different learning approach — pick what fits."
                : "You can change the mode later in Settings."}
            </p>
          </div>
          <button type="button" className="btn px-3 py-2 text-lg leading-none" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {step === 1 ? (
            <ul className="space-y-2.5" role="listbox" aria-label="Learning type">
              {DOMAIN_CATALOG.map((d) => (
                <li key={d.type}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={domain === d.type}
                    className={`domain-card ${domain === d.type ? "selected" : ""}`}
                    onClick={() => pickDomain(d.type)}
                  >
                    <span className="domain-check" aria-hidden>✓</span>
                    <div className="flex items-start gap-3 pr-6">
                      <span className="text-2xl leading-none" aria-hidden>
                        {d.emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-[var(--color-text)]">{d.label}</span>
                          <span className="chip chip-accent">{d.modeName}</span>
                        </div>
                        <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">{d.tagline}</p>
                        <p className="mt-1.5 text-xs text-[var(--color-muted)]">
                          <span className="font-medium">Examples:</span> {d.examples}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {d.useCases.map((u) => (
                            <span key={u} className="chip">
                              {u}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="space-y-5">
              <button
                type="button"
                className="text-sm font-medium text-[var(--color-accent)] hover:underline"
                onClick={() => setStep(1)}
              >
                ← Change type ({info.label})
              </button>

              <div className="card-surface rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{info.emoji}</span>
                  <div>
                    <p className="font-semibold">{info.label}</p>
                    <p className="text-sm text-[var(--color-muted)]">
                      Mode: <strong className="text-[var(--color-accent-2)]">{mode.name}</strong> — {mode.tagline}
                    </p>
                  </div>
                </div>
              </div>

              {intents.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-secondary)]">
                    What&apos;s your situation? <span className="font-normal text-[var(--color-muted)]">(optional)</span>
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {intents.map((intent) => (
                      <button
                        key={intent.id}
                        type="button"
                        className={`chip cursor-pointer px-3 py-1.5 text-sm transition ${
                          intentId === intent.id ? "chip-accent ring-2 ring-[var(--color-accent)] ring-offset-1" : ""
                        }`}
                        onClick={() => pickIntent(intent)}
                      >
                        {intent.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <label className="block">
                  <span className="text-sm font-medium text-[var(--color-text-secondary)]">Name</span>
                  <input
                    className="input mt-1"
                    placeholder={namePh}
                    value={name}
                    autoFocus
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-[var(--color-text-secondary)]">
                    Goal <span className="font-normal text-[var(--color-muted)]">(optional)</span>
                  </span>
                  <input
                    className="input mt-1"
                    placeholder={goalPh}
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        {step === 2 && (
          <div className="flex gap-2 border-t border-[var(--color-line)] bg-[var(--color-surface)] px-5 py-4">
            <button type="button" className="btn flex-1 justify-center" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary flex-[2] justify-center"
              disabled={!name.trim()}
              onClick={create}
            >
              Create brain
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
