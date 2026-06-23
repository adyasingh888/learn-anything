"use client";
import { useRef, useState } from "react";
import { useBrain, useStore } from "@/lib/store";

export function SourcesTab({ brainId }: { brainId: string }) {
  const { sources, cards } = useBrain(brainId);
  const { addSource, deleteSource, generateCardsFromSource, addAtom } = useStore();
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const captureLink = async () => {
    if (!/^https?:\/\//i.test(url)) {
      setToast("Enter a full URL (https://…)");
      return;
    }
    setBusy("link");
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      await addSource(brainId, {
        kind: "link",
        title: data.title,
        url,
        text: data.text,
        meta: data.meta,
      });
      setUrl("");
      setToast("Link captured and indexed");
    } catch {
      // Still store the link even if extraction failed (offline-friendly).
      await addSource(brainId, { kind: "link", url, text: url, title: url });
      setToast("Saved link (couldn't fetch contents)");
    } finally {
      setBusy(null);
    }
  };

  const captureNote = async () => {
    if (!note.trim()) return;
    setBusy("note");
    await addSource(brainId, { kind: "note", text: note.trim() });
    setNote("");
    setBusy(null);
    setToast("Note saved");
  };

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      const isText = /\.(txt|md|markdown|csv|json)$/i.test(file.name) || file.type.startsWith("text");
      if (isText) {
        const text = await file.text();
        await addSource(brainId, { kind: "file", title: file.name, text, meta: { mimeType: file.type } });
      } else if (file.type.startsWith("audio")) {
        const ref = URL.createObjectURL(file);
        await addSource(brainId, {
          kind: "audio",
          title: file.name,
          text: "(audio — transcription runs on-device in the mobile build)",
          meta: { mimeType: file.type, ref },
        });
      } else {
        await addSource(brainId, { kind: "file", title: file.name, text: `(binary file: ${file.name})`, meta: { mimeType: file.type } });
      }
    }
    setToast("File(s) captured");
  };

  return (
    <div className="space-y-5">
      <div className="card-surface rounded-2xl p-4">
        <h3 className="text-sm font-semibold">Capture</h3>
        <p className="mt-0.5 text-xs text-[var(--color-muted)]">
          Paste a link, jot a note, or drop a file/audio. Everything gets embedded and connected.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            className="input"
            placeholder="https://article-you-found.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && captureLink()}
          />
          <button className="btn btn-primary whitespace-nowrap" onClick={captureLink} disabled={busy === "link"}>
            {busy === "link" ? "Fetching…" : "Save link"}
          </button>
        </div>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <textarea
            className="input min-h-[44px] resize-y"
            placeholder="Write a note, an idea, audio transcript…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex gap-2">
            <button className="btn whitespace-nowrap" onClick={captureNote} disabled={busy === "note"}>
              Add note
            </button>
            <button className="btn whitespace-nowrap" onClick={() => fileRef.current?.click()}>
              Upload
            </button>
            <input ref={fileRef} type="file" multiple hidden onChange={(e) => onFiles(e.target.files)} />
          </div>
        </div>
        {toast && <p className="mt-2 text-xs text-[var(--color-accent-2)]">{toast}</p>}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">
          {sources.length} source{sources.length === 1 ? "" : "s"}
        </h3>
        {sources.length === 0 && (
          <p className="text-sm text-[var(--color-muted)]">Nothing captured yet. Start above.</p>
        )}
        {sources
          .slice()
          .reverse()
          .map((s) => {
            const cardCount = cards.filter((c) => c.sourceIds.includes(s.id)).length;
            return (
              <div key={s.id} className="card-surface rounded-xl p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="chip">{s.kind}</span>
                      <p className="truncate text-sm font-medium">{s.title}</p>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-[var(--color-muted)]">
                      {s.text.slice(0, 220)}
                    </p>
                    {s.url && (
                      <a href={s.url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-[var(--color-accent)]">
                        {s.url}
                      </a>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    className="btn text-xs"
                    onClick={() => {
                      const made = generateCardsFromSource(s.id);
                      setToast(made.length ? `Generated ${made.length} cards` : "Couldn't extract cards from this");
                    }}
                  >
                    ✨ Generate cards
                  </button>
                  <button
                    className="btn text-xs"
                    onClick={async () => {
                      await addAtom(brainId, s.title, s.text.slice(0, 400), [s.id]);
                      setToast("Distilled into an atom and linked into the graph");
                    }}
                  >
                    🧩 Distill to atom
                  </button>
                  {cardCount > 0 && <span className="chip">{cardCount} cards</span>}
                  <button className="btn text-xs" onClick={() => deleteSource(s.id)}>
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
