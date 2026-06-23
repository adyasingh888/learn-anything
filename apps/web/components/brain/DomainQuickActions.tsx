"use client";
import Link from "next/link";
import type { DomainType } from "@learn-anything/core";

const ACTIONS: Partial<
  Record<DomainType, { label: string; tab: string; hint: string }[]>
> = {
  research: [
    { label: "Claim map", tab: "graph", hint: "Tag supports/contradicts" },
    { label: "Synthesis", tab: "studio", hint: "Lit review draft" },
    { label: "Socratic tutor", tab: "tutor", hint: "Viva prep" },
  ],
  exam: [
    { label: "Mock exam", tab: "studio", hint: "Timed practice" },
    { label: "Drill weak", tab: "learn", hint: "After mock exam" },
    { label: "Generate cards", tab: "sources", hint: "From sources" },
  ],
  language: [
    { label: "Shadowing", tab: "studio", hint: "Speak tab" },
    { label: "Mine vocab", tab: "studio", hint: "Auto cloze cards" },
    { label: "Review", tab: "learn", hint: "Spaced vocab" },
  ],
  procedural: [
    { label: "Code drills", tab: "studio", hint: "JS sandbox" },
    { label: "Cards", tab: "learn", hint: "Problem sets" },
  ],
  memory: [
    { label: "Memory palace", tab: "studio", hint: "Walk rooms" },
    { label: "Mnemonic cards", tab: "studio", hint: "Auto-generate" },
    { label: "Drill", tab: "learn", hint: "Cloze cards" },
  ],
  performance: [
    { label: "Metronome", tab: "studio", hint: "Slow practice" },
    { label: "Record", tab: "studio", hint: "Pitch feedback" },
  ],
  creative: [
    { label: "Exemplar study", tab: "studio", hint: "Imitate & critique" },
  ],
  project: [
    { label: "Milestones", tab: "studio", hint: "Track progress" },
    { label: "Reflect", tab: "studio", hint: "Weekly log" },
  ],
  general: [
    { label: "Free recall", tab: "studio", hint: "Memory drill" },
    { label: "Capture", tab: "sources", hint: "Link or note" },
    { label: "Review", tab: "learn", hint: "FSRS" },
  ],
  concept: [
    { label: "Free recall", tab: "studio", hint: "From memory" },
    { label: "Concept map", tab: "graph", hint: "See clusters" },
    { label: "Tutor", tab: "tutor", hint: "Socratic" },
  ],
};

export function DomainQuickActions({ brainId, domain }: { brainId: string; domain: DomainType }) {
  const actions = ACTIONS[domain] ?? ACTIONS.general!;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {actions.map((a) => (
        <Link
          key={a.label}
          href={`/brain/${brainId}?tab=${a.tab}`}
          className="rounded-full border border-[var(--color-line)] px-3 py-1 text-xs transition hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]"
          title={a.hint}
        >
          {a.label}
        </Link>
      ))}
    </div>
  );
}
