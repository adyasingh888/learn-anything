"use client";
import { useEffect, useState } from "react";
import { extractKeyphrases } from "@learn-anything/core";
import { useBrain, useStore } from "@/lib/store";

interface ScholarPaper {
  paperId: string;
  title: string;
  abstract?: string;
  year?: number;
  citationCount?: number;
  url?: string;
  authors?: string[];
  openAccessPdf?: string;
  venue?: string;
}

interface WebResult {
  title: string;
  url: string;
  snippet: string;
}

export function RelatedReadingPanel({ brainId }: { brainId: string }) {
  const { sources, concepts, atoms } = useBrain(brainId);
  const { addSource, distillSourceToAtoms } = useStore();
  const [papers, setPapers] = useState<ScholarPaper[]>([]);
  const [web, setWeb] = useState<WebResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const seedTitles = sources.map((s) => s.title);
  const conceptLabels = concepts.map((c) => c.label);
  const sampleText = [...sources.map((s) => s.text.slice(0, 400)), ...atoms.map((a) => a.body.slice(0, 200))].join(" ");

  useEffect(() => {
    if (sources.length === 0) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const query =
          conceptLabels.slice(0, 3).join(" ") ||
          extractKeyphrases(sampleText, 4).join(" ") ||
          seedTitles[0];

        const [paperRes, webRes] = await Promise.all([
          fetch("/api/papers/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query,
              seedTitles,
              excludeTitles: seedTitles,
              limit: 6,
            }),
          }),
          fetch("/api/search/web", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: `${query} research article` }),
          }),
        ]);

        if (!cancelled && paperRes.ok) {
          const data = (await paperRes.json()) as { papers?: ScholarPaper[] };
          setPapers(data.papers ?? []);
        }
        if (!cancelled && webRes.ok) {
          const data = (await webRes.json()) as { results?: WebResult[] };
          const captured = new Set(sources.map((s) => s.url).filter(Boolean));
          setWeb((data.results ?? []).filter((r) => !captured.has(r.url)).slice(0, 5));
        }
      } catch {
        if (!cancelled) setError("Could not fetch suggestions — try again later.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [brainId, sources.length, conceptLabels.join(","), seedTitles.join("|")]);

  const savePaper = async (paper: ScholarPaper) => {
    setSaving(paper.paperId);
    try {
      const text = [
        paper.title,
        paper.authors?.length ? `Authors: ${paper.authors.slice(0, 5).join(", ")}` : "",
        paper.venue ? `Venue: ${paper.venue}` : "",
        paper.year ? `Year: ${paper.year}` : "",
        paper.citationCount != null ? `Citations: ${paper.citationCount}` : "",
        "",
        paper.abstract ?? "(No abstract in Semantic Scholar)",
      ]
        .filter(Boolean)
        .join("\n");
      const source = await addSource(brainId, {
        kind: "link",
        title: paper.title,
        url: paper.openAccessPdf ?? paper.url,
        text,
        meta: { paperId: paper.paperId, source: "semantic-scholar" },
      });
      await distillSourceToAtoms(source.id);
    } finally {
      setSaving(null);
    }
  };

  const captureUrl = async (item: WebResult) => {
    setSaving(item.url);
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: item.url }),
      });
      const data = await res.json();
      const source = await addSource(brainId, {
        kind: "link",
        title: data.title ?? item.title,
        url: item.url,
        text: data.text ?? item.snippet,
        meta: data.meta,
      });
      await distillSourceToAtoms(source.id);
    } finally {
      setSaving(null);
    }
  };

  if (sources.length === 0) {
    return (
      <p className="text-sm text-[var(--color-muted)]">Capture at least one source to get suggestions.</p>
    );
  }

  return (
    <div className="space-y-4">
      {loading && <p className="text-sm text-[var(--color-muted)]">Searching papers & web…</p>}
      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

      {papers.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-[var(--color-text-secondary)]">
            Academic papers (Semantic Scholar · free API)
          </p>
          {papers.map((p) => (
            <div key={p.paperId} className="card-surface rounded-xl p-4">
              <p className="font-medium leading-snug">{p.title}</p>
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                {[p.year, p.citationCount != null ? `${p.citationCount} citations` : "", p.authors?.slice(0, 2).join(", ")]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {p.abstract && (
                <p className="mt-2 line-clamp-3 text-sm text-[var(--color-text-secondary)]">{p.abstract}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-primary text-xs"
                  disabled={saving === p.paperId}
                  onClick={() => savePaper(p)}
                >
                  {saving === p.paperId ? "Saving…" : "+ Save to brain"}
                </button>
                {p.url && (
                  <a href={p.url} target="_blank" rel="noreferrer" className="btn text-xs">
                    Open ↗
                  </a>
                )}
                {p.openAccessPdf && (
                  <a href={p.openAccessPdf} target="_blank" rel="noreferrer" className="btn text-xs">
                    PDF ↗
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {web.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-[var(--color-text-secondary)]">
            Web results (Jina Search · free)
          </p>
          {web.map((w) => (
            <div key={w.url} className="card-surface rounded-xl p-3">
              <p className="text-sm font-medium">{w.title}</p>
              {w.snippet && <p className="mt-1 line-clamp-2 text-xs text-[var(--color-muted)]">{w.snippet}</p>}
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  className="btn btn-primary text-xs"
                  disabled={saving === w.url}
                  onClick={() => captureUrl(w)}
                >
                  {saving === w.url ? "Capturing…" : "Capture link"}
                </button>
                <a href={w.url} target="_blank" rel="noreferrer" className="btn text-xs">
                  Open ↗
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {sources.length === 1 && (
        <p className="rounded-lg bg-[var(--color-accent-soft)] p-3 text-xs text-[var(--color-text-secondary)]">
          Save a suggested paper above to get <strong>cross-source links</strong> in your graph.
        </p>
      )}

      {!loading && papers.length === 0 && !error && (
        <p className="text-xs text-[var(--color-muted)]">
          No paper results right now — your concepts may be too niche, or Semantic Scholar rate-limited. Try capturing more text first.
        </p>
      )}
    </div>
  );
}
