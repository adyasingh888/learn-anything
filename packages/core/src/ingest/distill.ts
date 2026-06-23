/**
 * Split a source into atom-sized ideas (one per chunk). Each chunk becomes its
 * own atom with a title derived from its opening line / key phrase.
 */
import { chunkText, deriveTitle, extractKeyphrases } from "./index.js";

export interface AtomDraft {
  title: string;
  body: string;
}

/** Turn captured text into multiple atomic notes — not one blob. */
export function distillToAtomDrafts(text: string, sourceTitle: string, maxAtoms = 8): AtomDraft[] {
  const clean = text.trim();
  if (!clean || clean.length < 80) {
    if (!clean) return [];
    const keys = extractKeyphrases(clean, 1);
    return [{ title: keys[0] ?? deriveTitle(clean, sourceTitle), body: clean }];
  }

  const chunks = chunkText(clean, 550, 60);
  const drafts: AtomDraft[] = [];

  for (let i = 0; i < Math.min(chunks.length, maxAtoms); i++) {
    const chunk = chunks[i];
    const keys = extractKeyphrases(chunk, 2);
    const title =
      keys[0] ??
      deriveTitle(chunk, `${sourceTitle} · part ${i + 1}`);
    drafts.push({ title, body: chunk });
  }

  return drafts;
}
