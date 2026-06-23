/**
 * Embeddings are computed and stored on-device so the knowledge graph never
 * leaves the device in plaintext (see plan section 5).
 *
 * `Embedder` is the contract. In production the web app plugs in a real model
 * (transformers.js / a native embedding model). For offline-first behaviour and
 * zero-dependency tests we ship `HashingEmbedder`: a deterministic bag-of-words
 * hashing embedder. It is not as good as a transformer, but it gives stable,
 * meaningful cosine similarity for free with no network and no model download.
 */
export interface Embedder {
  readonly dim: number;
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

const STOPWORDS = new Set(
  "the a an and or but of to in on for with at by from is are was were be been being this that these those it its as into than then so if".split(
    " ",
  ),
);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/** Deterministic FNV-1a hash → bucket, with sub-word features for robustness. */
function hashToken(token: string, dim: number, seed = 0): number {
  let h = 2166136261 ^ seed;
  for (let i = 0; i < token.length; i++) {
    h ^= token.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % dim;
}

export class HashingEmbedder implements Embedder {
  constructor(public readonly dim = 256) {}

  async embed(text: string): Promise<number[]> {
    const vec = new Array<number>(this.dim).fill(0);
    const tokens = tokenize(text);
    for (const tok of tokens) {
      // Two hashes per token reduces collisions; sign hash de-correlates buckets.
      vec[hashToken(tok, this.dim, 1)] += 1;
      vec[hashToken(tok, this.dim, 2)] += hashToken(tok, 2, 7) === 0 ? 1 : -1;
      // Trigram features capture morphology (useful for language learning).
      for (let i = 0; i + 3 <= tok.length; i++) {
        vec[hashToken(tok.slice(i, i + 3), this.dim, 3)] += 0.5;
      }
    }
    return l2normalize(vec);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((t) => this.embed(t)));
  }
}

export function l2normalize(vec: number[]): number[] {
  const norm = Math.sqrt(vec.reduce((s, x) => s + x * x, 0)) || 1;
  return vec.map((x) => x / norm);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  for (let i = 0; i < n; i++) dot += a[i] * b[i];
  return dot; // vectors are L2-normalized
}
