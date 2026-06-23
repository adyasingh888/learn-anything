/**
 * Retrieval-Augmented Generation context builder. Everything the tutor and the
 * content generators say is grounded in the brain's own captured material via
 * this retrieval step, so generation cites provenance instead of hallucinating.
 */
import type { Embedder } from "../embeddings/index.js";
import { nearest } from "../graph/index.js";
import type { Atom, Citation, Source } from "../types.js";

export interface RetrievedContext {
  passages: { text: string; citation: Citation; score: number }[];
  /** Concatenated, citation-tagged context ready to drop into a prompt. */
  promptContext: string;
}

export async function retrieve(
  query: string,
  opts: { embedder: Embedder; atoms: Atom[]; sources: Source[]; k?: number },
): Promise<RetrievedContext> {
  const { embedder, atoms, sources, k = 6 } = opts;
  const q = await embedder.embed(query);

  const atomHits = nearest(q, atoms, k).map((h) => ({
    text: `${h.item.title}\n${h.item.body}`,
    citation: { atomId: h.item.id, sourceId: h.item.sourceIds[0] } as Citation,
    score: h.score,
  }));

  // Fall back to source text when there aren't enough atoms yet.
  let sourceHits: RetrievedContext["passages"] = [];
  if (atomHits.length < k) {
    const embedded = await Promise.all(
      sources.map(async (s) => ({
        s,
        e: await embedder.embed(`${s.title}\n${s.text.slice(0, 1200)}`),
      })),
    );
    sourceHits = nearest(q, embedded.map((x) => ({ ...x, embedding: x.e })), k - atomHits.length)
      .map((h) => ({
        text: `${h.item.s.title}\n${h.item.s.text.slice(0, 800)}`,
        citation: { sourceId: h.item.s.id } as Citation,
        score: h.score,
      }));
  }

  const passages = [...atomHits, ...sourceHits].sort((a, b) => b.score - a.score);
  const promptContext = passages
    .map((p, i) => `[[${i + 1}]] ${p.text}`)
    .join("\n\n---\n\n");

  return { passages, promptContext };
}
