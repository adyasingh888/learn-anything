"use client";
import { useRef, useState } from "react";
import { bibEntryToText, parseBibtex, parseCaptureInput } from "@learn-anything/core";
import { useBrain, useStore } from "@/lib/store";

function normalizeUrl(raw: string): string {
  let u = raw.trim();
  if (!u) return u;
  if (!/^https?:\/\//i.test(u) && (u.includes(".") || u.startsWith("www."))) {
    u = `https://${u}`;
  }
  return u;
}

export function SourcesTab({ brainId, onGoGraph }: { brainId: string; onGoGraph?: () => void }) {
  const { sources, cards, atoms } = useBrain(brainId);
  const { addSource, deleteSource, generateCardsFromSource, distillSourceToAtoms } = useStore();
  const [paste, setPaste] = useState("");
  const [bibPaste, setBibPaste] = useState("");
  const [showBib, setShowBib] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; action?: () => void; actionLabel?: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const finishCapture = (msg: string, atomCount: number) => {
    setPaste("");
    setToast({
      msg: atomCount > 0 ? `${msg} → ${atomCount} atoms in Graph` : msg,
      action: atomCount > 0 ? onGoGraph : undefined,
      actionLabel: atomCount > 0 ? "View atoms →" : undefined,
    });
  };

  const captureLink = async (rawUrl: string) => {
    const url = normalizeUrl(rawUrl);
    if (!/^https?:\/\//i.test(url)) {
      setToast({ msg: "Paste a full link (e.g. pbs.org/… or youtube.com/…)" });
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

      const source = await addSource(brainId, {
        kind: "link",
        title: data.title,
        url,
        text: data.text,
        meta: { ...data.meta, hint: data.hint },
      });

      const atomCount = await distillSourceToAtoms(source.id);
      let msg = `Saved “${data.title}”`;
      if (data.hint === "youtube-transcript") {
        msg += ". YouTube: add transcript/notes in a follow-up note for better cards.";
      } else if (data.hint === "thin-content") {
        msg += ". Little text extracted — try pasting the article body as a note.";
      }
      finishCapture(msg, atomCount);
    } catch {
      const source = await addSource(brainId, { kind: "link", url, text: url, title: url });
      const atomCount = await distillSourceToAtoms(source.id);
      finishCapture("Saved link (couldn't fetch full text — try pasting content as a note)", atomCount);
    } finally {
      setBusy(null);
    }
  };

  const captureResolved = async (body: { doi?: string; arxivId?: string }) => {
    setBusy("resolve");
    try {
      const res = await fetch("/api/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const source = await addSource(brainId, {
        kind: "link",
        title: data.title,
        url: data.url,
        text: data.text,
        meta: data.meta,
      });
      const atomCount = await distillSourceToAtoms(source.id);
      finishCapture(`Saved “${data.title}” (${data.meta?.source ?? "metadata"})`, atomCount);
    } catch {
      setToast({ msg: "Couldn't resolve identifier — try pasting the abstract as a note" });
    } finally {
      setBusy(null);
    }
  };

  const captureNote = async (text: string) => {
    if (!text.trim()) return;
    setBusy("note");
    const source = await addSource(brainId, { kind: "note", text: text.trim() });
    const atomCount = await distillSourceToAtoms(source.id);
    setBusy(null);
    finishCapture("Note saved", atomCount);
  };

  const importBibtex = async (raw: string) => {
    const entries = parseBibtex(raw);
    if (!entries.length) {
      setToast({ msg: "No BibTeX entries found — check format" });
      return;
    }
    setBusy("bib");
    let totalAtoms = 0;
    for (const entry of entries) {
      const text = bibEntryToText(entry);
      const source = await addSource(brainId, {
        kind: "file",
        title: entry.title ?? entry.key,
        text,
        url: entry.url ?? (entry.doi ? `https://doi.org/${entry.doi}` : undefined),
        meta: { bibKey: entry.key, bibType: entry.type, doi: entry.doi },
      });
      totalAtoms += await distillSourceToAtoms(source.id);
    }
    setBibPaste("");
    setShowBib(false);
    setBusy(null);
    finishCapture(`Imported ${entries.length} BibTeX entries`, totalAtoms);
  };

  const onSubmit = () => {
    const v = paste.trim();
    if (!v) return;
    const parsed = parseCaptureInput(v);
    if (parsed.kind === "doi" && parsed.doi) captureResolved({ doi: parsed.doi });
    else if (parsed.kind === "arxiv" && parsed.arxivId) captureResolved({ arxivId: parsed.arxivId });
    else if (parsed.kind === "url" && parsed.url) captureLink(parsed.url);
    else captureNote(v);
  };

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (/\.bib$/i.test(file.name)) {
        await importBibtex(await file.text());
        continue;
      }
      const isText = /\.(txt|md|markdown|csv|json)$/i.test(file.name) || file.type.startsWith("text");
      if (isText) {
        const text = await file.text();
        const source = await addSource(brainId, { kind: "file", title: file.name, text, meta: { mimeType: file.type } });
        await distillSourceToAtoms(source.id);
      } else if (file.type.startsWith("audio")) {
        await addSource(brainId, {
          kind: "audio",
          title: file.name,
          text: "(audio — paste transcript as a note for atoms & tutor)",
          meta: { mimeType: file.type, ref: URL.createObjectURL(file) },
        });
      } else {
        await addSource(brainId, { kind: "file", title: file.name, text: `(file: ${file.name})`, meta: { mimeType: file.type } });
      }
    }
    if (!busy) {
      setToast({ msg: "File(s) captured and distilled where possible", action: onGoGraph, actionLabel: "View Graph →" });
    }
  };

  return (
    <div className="space-y-5">
      <div className="card-surface rounded-2xl p-5">
        <h3 className="font-semibold">Capture</h3>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Paste a link, DOI, arXiv ID, or notes. Links and identifiers auto-distill into atoms on the{" "}
          <strong>Graph</strong> tab.
        </p>
        <textarea
          className="input mt-3 min-h-[88px] resize-y"
          placeholder="https://pbs.org/… · doi:10.1038/… · arXiv:2401.12345&#10;— or paste article text, transcript, your notes…"
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onSubmit();
          }}
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" onClick={onSubmit} disabled={!!busy || !paste.trim()}>
            {busy ? "Saving…" : "Save"}
          </button>
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
            Upload file
          </button>
          <button type="button" className="btn" onClick={() => setShowBib((s) => !s)}>
            {showBib ? "Hide BibTeX" : "Import BibTeX"}
          </button>
          {atoms.length > 0 && onGoGraph && (
            <button type="button" className="btn" onClick={onGoGraph}>
              Graph · {atoms.length} atoms
            </button>
          )}
        </div>
        {showBib && (
          <div className="mt-4 rounded-xl border border-[var(--color-border)] p-4">
            <p className="text-xs text-[var(--color-muted)]">
              Paste Zotero/Mendeley export or upload a <code>.bib</code> file. Each entry becomes a source.
            </p>
            <textarea
              className="input mt-2 min-h-[72px] resize-y font-mono text-xs"
              placeholder="@article{key, title={...}, author={...}, ...}"
              value={bibPaste}
              onChange={(e) => setBibPaste(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-primary mt-2 text-sm"
              disabled={!!busy || !bibPaste.trim()}
              onClick={() => importBibtex(bibPaste)}
            >
              Import entries
            </button>
          </div>
        )}
        {toast && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[var(--color-accent-2)]">
            <span>{toast.msg}</span>
            {toast.action && toast.actionLabel && (
              <button type="button" className="font-semibold underline" onClick={toast.action}>
                {toast.actionLabel}
              </button>
            )}
          </div>
        )}
        <input ref={fileRef} type="file" multiple accept=".bib,.txt,.md,.markdown,.csv,.json,audio/*" hidden onChange={(e) => onFiles(e.target.files)} />
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">{sources.length} source{sources.length === 1 ? "" : "s"}</h3>
        {sources.length === 0 && (
          <p className="text-sm text-[var(--color-muted)]">Nothing captured yet.</p>
        )}
        {sources
          .slice()
          .reverse()
          .map((s) => {
            const cardCount = cards.filter((c) => c.sourceIds.includes(s.id)).length;
            const atomCount = atoms.filter((a) => a.sourceIds.includes(s.id)).length;
            return (
              <div key={s.id} className="card-surface rounded-xl p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="chip">{s.kind}</span>
                  <p className="min-w-0 flex-1 truncate font-medium">{s.title}</p>
                </div>
                <p className="mt-2 line-clamp-3 text-sm text-[var(--color-text-secondary)]">{s.text.slice(0, 400)}</p>
                {s.url && (
                  <a href={s.url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-[var(--color-accent)]">
                    {s.url}
                  </a>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn text-xs"
                    disabled={!!busy}
                    onClick={async () => {
                      setBusy("cards");
                      const made = await generateCardsFromSource(s.id);
                      setBusy(null);
                      setToast({
                        msg: made.length ? `Created ${made.length} study cards → Learn tab` : "Not enough text for cards — add more content",
                      });
                    }}
                  >
                    ✨ Generate cards
                  </button>
                  <button
                    type="button"
                    className="btn text-xs"
                    disabled={!!busy}
                    onClick={async () => {
                      setBusy("distill");
                      const n = await distillSourceToAtoms(s.id);
                      setBusy(null);
                      setToast({
                        msg: n ? `Distilled ${n} atoms` : "Already distilled or too little text",
                        action: onGoGraph,
                        actionLabel: "View Graph →",
                      });
                    }}
                  >
                    🧩 Re-distill atoms
                  </button>
                  {atomCount > 0 && <span className="chip">{atomCount} atoms</span>}
                  {cardCount > 0 && <span className="chip">{cardCount} cards</span>}
                  <button type="button" className="btn text-xs" onClick={() => deleteSource(s.id)}>
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
