"use client";
import Link from "next/link";
import { useState } from "react";
import { DOMAIN_CATALOG, getMode } from "@learn-anything/core";
import { Gate } from "@/components/Gate";
import { Header } from "@/components/Header";
import { dueCount, useBrain } from "@/lib/store";
import { SourcesTab } from "./SourcesTab";
import { GraphTab } from "./GraphTab";
import { LearnTab } from "./LearnTab";
import { TutorTab } from "./TutorTab";
import { StudioTab } from "./StudioTab";
import { BrainSettings } from "./BrainSettings";

type Tab = "sources" | "graph" | "learn" | "tutor" | "studio" | "settings";

export function BrainView({ brainId }: { brainId: string }) {
  return (
    <Gate>
      <Header />
      <Inner brainId={brainId} />
    </Gate>
  );
}

function Inner({ brainId }: { brainId: string }) {
  const { brain, cards } = useBrain(brainId);
  const [tab, setTab] = useState<Tab>("sources");

  if (!brain) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10 text-center">
        <p className="text-[var(--color-muted)]">Brain not found.</p>
        <Link href="/" className="btn mt-4 inline-flex">
          Back home
        </Link>
      </main>
    );
  }

  const mode = getMode(brain.modeId, brain.domainType);
  const domain = DOMAIN_CATALOG.find((d) => d.type === brain.domainType);
  const due = dueCount(cards);

  const tabs: { id: Tab; label: string }[] = [
    { id: "sources", label: "Sources" },
    { id: "graph", label: "Graph" },
    { id: "learn", label: due > 0 ? `Learn · ${due}` : "Learn" },
    { id: "tutor", label: "Tutor" },
    { id: "studio", label: studioLabel(brain.domainType) },
    { id: "settings", label: "Settings" },
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex items-center gap-3">
        <span className="text-3xl">{domain?.emoji ?? "🧠"}</span>
        <div>
          <h1 className="text-xl font-bold tracking-tight">{brain.name}</h1>
          <p className="text-xs text-[var(--color-muted)]">
            {mode.name} · {mode.tagline}
          </p>
        </div>
      </div>
      {brain.goal && (
        <p className="mt-2 text-sm text-[var(--color-muted)]">🎯 {brain.goal}</p>
      )}

      <nav className="mt-5 flex gap-1 overflow-x-auto border-b pb-px">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`whitespace-nowrap rounded-t-lg px-3 py-2 text-sm font-medium transition ${
              tab === t.id
                ? "border-b-2 border-[var(--color-accent)] text-white"
                : "text-[var(--color-muted)] hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="py-5">
        {tab === "sources" && <SourcesTab brainId={brainId} />}
        {tab === "graph" && <GraphTab brainId={brainId} />}
        {tab === "learn" && <LearnTab brainId={brainId} />}
        {tab === "tutor" && <TutorTab brainId={brainId} />}
        {tab === "studio" && <StudioTab brainId={brainId} />}
        {tab === "settings" && <BrainSettings brainId={brainId} />}
      </div>
    </main>
  );
}

function studioLabel(domain: string): string {
  switch (domain) {
    case "language":
      return "Speak";
    case "performance":
      return "Studio";
    case "exam":
      return "Mock Exam";
    case "research":
      return "Synthesis";
    default:
      return "Studio";
  }
}
