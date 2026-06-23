/**
 * Ingest helpers shared by every capture surface (extension, mobile share,
 * paste, file/audio upload). The heavy fetch + readability extraction runs on
 * the server route (apps/web/app/api/ingest); these are the pure transforms.
 */
import { tokenize } from "../embeddings/index.js";

/** Split long text into overlapping chunks for embedding + RAG. */
export function chunkText(text: string, targetChars = 900, overlap = 150): string[] {
  const clean = text.replace(/\s+\n/g, "\n").trim();
  if (clean.length <= targetChars) return clean ? [clean] : [];
  const paragraphs = clean.split(/\n{2,}/);
  const chunks: string[] = [];
  let buf = "";
  for (const p of paragraphs) {
    if ((buf + "\n\n" + p).length > targetChars && buf) {
      chunks.push(buf.trim());
      buf = buf.slice(Math.max(0, buf.length - overlap)) + "\n\n" + p;
    } else {
      buf = buf ? buf + "\n\n" + p : p;
    }
  }
  if (buf.trim()) chunks.push(buf.trim());
  return chunks;
}

/**
 * Cheap, offline keyphrase extraction (frequency + capitalization signal).
 * Used to seed graph concepts before (or instead of) an LLM extraction pass.
 */
export function extractKeyphrases(text: string, max = 12): string[] {
  const freq = new Map<string, number>();
  for (const tok of tokenize(text)) {
    freq.set(tok, (freq.get(tok) ?? 0) + 1);
  }
  // Bias toward proper-noun-like multi-word phrases from the raw text.
  const phraseFreq = new Map<string, number>();
  const phraseRegex = /\b([A-Z][\p{L}]+(?:\s+[A-Z][\p{L}]+){0,2})\b/gu;
  let m: RegExpExecArray | null;
  while ((m = phraseRegex.exec(text))) {
    const key = m[1].toLowerCase();
    phraseFreq.set(key, (phraseFreq.get(key) ?? 0) + 2);
  }
  const scored = new Map<string, number>();
  for (const [k, v] of freq) scored.set(k, v);
  for (const [k, v] of phraseFreq) scored.set(k, (scored.get(k) ?? 0) + v);
  return [...scored.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([k]) => k);
}

/** Rough title from text when a capture has none. */
export function deriveTitle(text: string, fallback = "Untitled"): string {
  const firstLine = text.trim().split("\n")[0]?.trim() ?? "";
  if (!firstLine) return fallback;
  return firstLine.length > 80 ? firstLine.slice(0, 77) + "…" : firstLine;
}
