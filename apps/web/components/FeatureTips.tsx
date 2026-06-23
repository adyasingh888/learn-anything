"use client";

const TIPS = [
  { emoji: "⌘K", title: "Global search", desc: "Find any source, atom, or card across all brains.", href: "/" },
  { emoji: "📄", title: "arXiv full text", desc: "Paste a DOI or arXiv ID in Sources — PDF body auto-fetches.", tab: "sources" },
  { emoji: "🗺️", title: "Graph canvas", desc: "Zoom, pan, and click nodes on the Graph tab.", tab: "graph" },
  { emoji: "🧠", title: "Socratic tutor", desc: "Concept & research brains ask questions before explaining.", tab: "tutor" },
  { emoji: "📝", title: "Mock exam drill", desc: "Exam brains: finish a mock, then drill your errors.", tab: "studio" },
  { emoji: "⬇", title: "Export Markdown", desc: "Settings tab → export brain as readable .md", tab: "settings" },
];

export function FeatureTips() {
  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold text-[var(--color-text-secondary)]">Try these features</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {TIPS.map((t) => (
          <div key={t.title} className="card-surface rounded-xl p-4">
            <span className="text-lg">{t.emoji}</span>
            <p className="mt-1 font-medium text-sm">{t.title}</p>
            <p className="mt-0.5 text-xs text-[var(--color-muted)]">{t.desc}</p>
            {t.tab && (
              <p className="mt-2 text-[10px] text-[var(--color-accent)]">Open any brain → {t.tab} tab</p>
            )}
            {t.href && (
              <p className="mt-2 text-[10px] text-[var(--color-accent)]">Press Search in the header</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
