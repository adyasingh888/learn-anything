"use client";
import { useState } from "react";
import { parseCaptureInput } from "@learn-anything/core";
import { useStore } from "@/lib/store";

export function QuickCapture() {
  const { db, addSource, distillSourceToAtoms } = useStore();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [brainId, setBrainId] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const save = async () => {
    const bid = brainId || db.brains[0]?.id;
    if (!bid || !text.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const parsed = parseCaptureInput(text);
      let source;
      if (parsed.kind === "doi" || parsed.kind === "arxiv") {
        const res = await fetch("/api/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ doi: parsed.doi, arxivId: parsed.arxivId, fetchFullText: true }),
        });
        const data = await res.json();
        source = await addSource(bid, { kind: "link", title: data.title, url: data.url, text: data.text, meta: data.meta });
      } else if (parsed.kind === "url") {
        const res = await fetch("/api/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: parsed.url }),
        });
        const data = await res.json();
        source = await addSource(bid, { kind: "link", title: data.title, url: parsed.url, text: data.text, meta: data.meta });
      } else {
        source = await addSource(bid, { kind: "note", text: text.trim() });
      }
      const n = await distillSourceToAtoms(source.id);
      setMsg(`Saved → ${n} atoms`);
      setText("");
      setTimeout(() => setOpen(false), 800);
    } catch {
      setMsg("Saved (distill may have failed)");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button type="button" className="btn btn-primary text-xs" onClick={() => setOpen(true)} disabled={!db.brains.length}>
        + Capture
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 pt-[15vh]" onClick={() => setOpen(false)}>
      <div className="card-surface w-full max-w-md rounded-2xl p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold">Quick capture</h3>
        <select className="input mt-2" value={brainId} onChange={(e) => setBrainId(e.target.value)}>
          <option value="">Pick brain…</option>
          {db.brains.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <textarea
          className="input mt-2 min-h-[72px]"
          placeholder="Link, DOI, arXiv, or notes…"
          value={text}
          autoFocus
          onChange={(e) => setText(e.target.value)}
        />
        <div className="mt-2 flex gap-2">
          <button type="button" className="btn btn-primary" disabled={busy || !text.trim()} onClick={save}>
            {busy ? "Saving…" : "Save & distill"}
          </button>
          <button type="button" className="btn" onClick={() => setOpen(false)}>Cancel</button>
        </div>
        {msg && <p className="mt-2 text-xs text-[var(--color-accent)]">{msg}</p>}
      </div>
    </div>
  );
}
