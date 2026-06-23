"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getDomainInfo, getMode, computePacing, nextObjective, isMastered } from "@learn-anything/core";
import { Gate } from "@/components/Gate";
import { Header } from "@/components/Header";
import { dueCount, useBrain, useStore } from "@/lib/store";
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
  const { brain, cards, objectives, mastery } = useBrain(brainId);
  const { ensureObjectives } = useStore();
  const masteryMap = useMemo(() => new Map(mastery.map((m) => [m.objectiveId, m])), [mastery]);
  const currentObjective = useMemo(
    () => nextObjective(objectives, masteryMap),
    [objectives, masteryMap],
  );
  const pacing = useMemo(
    () => computePacing(brain?.deadline, objectives, mastery),
    [brain?.deadline, objectives, mastery],
  );
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab") as Tab | null;
  const [tab, setTab] = useState<Tab>(tabParam && isTab(tabParam) ? tabParam : "sources");

  useEffect(() => {
    if (tabParam && isTab(tabParam)) setTab(tabParam);
  }, [tabParam]);

  useEffect(() => {
    if (brain?.goal) ensureObjectives(brainId);
  }, [brainId, brain?.goal, ensureObjectives]);

  const goTab = (t: Tab) => {
    setTab(t);
    router.replace(`/brain/${brainId}?tab=${t}`, { scroll: false });
  };

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
  const domain = getDomainInfo(brain.domainType);
  const due = dueCount(cards);
  const avgMastery =
    mastery.length > 0
      ? Math.round((mastery.reduce((s, m) => s + m.mastery, 0) / mastery.length) * 100)
      : null;

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
          <h1 className="page-title text-xl font-bold tracking-tight">{brain.name}</h1>
          <p className="text-xs text-[var(--color-muted)]">
            {mode.name} · {mode.tagline}
          </p>
        </div>
      </div>
      {brain.goal && (
        <p className="mt-2 text-sm text-[var(--color-muted)]">🎯 {brain.goal}</p>
      )}
      {avgMastery != null && objectives.length > 0 && (
        <p className="mt-1 text-xs text-[var(--color-accent)]">
          Mastery: {avgMastery}% across {objectives.length} objective{objectives.length === 1 ? "" : "s"}
        </p>
      )}
      {objectives.length > 0 && (
        <p className={`mt-1 text-xs ${pacing.onTrack ? "text-[var(--color-muted)]" : "text-amber-600"}`}>
          📅 {pacing.message}
        </p>
      )}
      {currentObjective && !isMastered(masteryMap.get(currentObjective.id)) && (
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
          Up next: {currentObjective.title}
        </p>
      )}

      <nav className="mt-5 flex gap-1 overflow-x-auto border-b pb-px">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => goTab(t.id)}
            className={`whitespace-nowrap rounded-t-lg px-3 py-2 text-sm font-medium transition ${
              tab === t.id
                ? "border-b-2 border-[var(--color-accent)] text-[var(--color-text)]"
                : "text-[var(--color-muted)] hover:text-[var(--color-text-secondary)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="py-5">
        {tab === "sources" && <SourcesTab brainId={brainId} onGoGraph={() => goTab("graph")} />}
        {tab === "graph" && <GraphTab brainId={brainId} />}
        {tab === "learn" && <LearnTab brainId={brainId} />}
        {tab === "tutor" && <TutorTab brainId={brainId} />}
        {tab === "studio" && <StudioTab brainId={brainId} />}
        {tab === "settings" && <BrainSettings brainId={brainId} />}
      </div>
    </main>
  );
}

function isTab(x: string): x is Tab {
  return ["sources", "graph", "learn", "tutor", "studio", "settings"].includes(x);
}

function studioLabel(domain: string): string {
  switch (domain) {
    case "language":
      return "Speak";
    case "performance":
      return "Studio";
    case "exam":
      return "Mock Exam";
    case "procedural":
      return "Drill";
    case "creative":
      return "Create";
    case "memory":
      return "Memory";
    case "project":
      return "Project";
    case "research":
      return "Synthesis";
    default:
      return "Studio";
  }
}
