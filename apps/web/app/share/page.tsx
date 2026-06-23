"use client";
import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { parseCaptureInput } from "@learn-anything/core";
import { Gate } from "@/components/Gate";
import { Header } from "@/components/Header";
import { useStore } from "@/lib/store";

export default function SharePage() {
  return (
    <Gate>
      <Header />
      <Suspense fallback={null}>
        <ShareInner />
      </Suspense>
    </Gate>
  );
}

function ShareInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { db, addSource, distillSourceToAtoms } = useStore();
  const [saving, setSaving] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const url = params.get("url") ?? "";
  const text = params.get("text") ?? "";
  const title = params.get("title") ?? "";
  const shared = url || text;

  const capture = async (brainId: string) => {
    setSaving(brainId);
    setStatus("Capturing…");
    try {
      const parsed = parseCaptureInput(shared);
      let source;

      if (parsed.kind === "doi" || parsed.kind === "arxiv") {
        setStatus("Resolving paper metadata + full text…");
        const res = await fetch("/api/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            doi: parsed.doi,
            arxivId: parsed.arxivId,
            fetchFullText: true,
          }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        source = await addSource(brainId, {
          kind: "link",
          title: data.title,
          url: data.url,
          text: data.text,
          meta: data.meta,
        });
      } else if (parsed.kind === "url" || /^https?:\/\//i.test(shared)) {
        setStatus("Fetching article…");
        const link = parsed.url ?? shared;
        try {
          const res = await fetch("/api/ingest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: link }),
          });
          const data = await res.json();
          source = await addSource(brainId, {
            kind: "link",
            title: data.title ?? title,
            url: link,
            text: data.text ?? shared,
            meta: data.meta,
          });
        } catch {
          source = await addSource(brainId, { kind: "link", title: title || link, url: link, text: shared });
        }
      } else {
        source = await addSource(brainId, { kind: "note", title: title || undefined, text: shared });
      }

      setStatus("Distilling atoms…");
      const atoms = await distillSourceToAtoms(source.id);
      setStatus(atoms > 0 ? `Saved → ${atoms} atoms` : "Saved");
      router.push(`/brain/${brainId}?tab=${atoms > 0 ? "graph" : "sources"}`);
    } catch {
      setStatus("Saved (partial — open brain to retry)");
      router.push(`/brain/${brainId}`);
    } finally {
      setSaving(null);
    }
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-xl font-bold">Save to a Brain</h1>
      <p className="mt-1 text-sm text-[var(--color-muted)]">Auto-distills into atoms after capture.</p>
      <div className="card-surface mt-3 rounded-xl p-3 text-sm">
        <p className="truncate text-[var(--color-muted)]">{shared || "(nothing shared)"}</p>
      </div>
      {status && <p className="mt-2 text-sm text-[var(--color-accent)]">{status}</p>}
      {db.brains.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--color-muted)]">Create a brain first.</p>
      ) : (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {db.brains.map((b) => (
            <button
              key={b.id}
              type="button"
              className="btn justify-start"
              disabled={!!saving}
              onClick={() => capture(b.id)}
            >
              {saving === b.id ? "Saving…" : b.name}
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
