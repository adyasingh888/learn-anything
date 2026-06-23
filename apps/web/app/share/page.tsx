"use client";
import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Gate } from "@/components/Gate";
import { Header } from "@/components/Header";
import { useStore } from "@/lib/store";

/**
 * PWA share-target landing. On mobile, sharing a link/text to the installed app
 * lands here (see manifest share_target). Pick a brain and it's captured.
 */
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
  const { db, addSource } = useStore();
  const [saving, setSaving] = useState(false);

  const url = params.get("url") ?? "";
  const text = params.get("text") ?? "";
  const title = params.get("title") ?? "";
  const shared = url || text;

  const capture = async (brainId: string) => {
    setSaving(true);
    if (/^https?:\/\//i.test(shared)) {
      try {
        const res = await fetch("/api/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: shared }),
        });
        const data = await res.json();
        await addSource(brainId, { kind: "link", title: data.title ?? title, url: shared, text: data.text ?? shared, meta: data.meta });
      } catch {
        await addSource(brainId, { kind: "link", title: title || shared, url: shared, text: shared });
      }
    } else {
      await addSource(brainId, { kind: "note", title, text: shared });
    }
    router.push(`/brain/${brainId}`);
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-xl font-bold">Save to a Brain</h1>
      <div className="card-surface mt-3 rounded-xl p-3 text-sm">
        <p className="truncate text-[var(--color-muted)]">{shared || "(nothing shared)"}</p>
      </div>
      {db.brains.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--color-muted)]">Create a brain first.</p>
      ) : (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {db.brains.map((b) => (
            <button key={b.id} className="btn justify-start" disabled={saving} onClick={() => capture(b.id)}>
              {b.name}
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
