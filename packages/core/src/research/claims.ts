/**
 * Claim-evidence mapping for research brains — no LLM, purely structural.
 */
import { sharesSource } from "../graph/index.js";
import { tokenize } from "../embeddings/index.js";
import type { Atom, ID, Source } from "../types.js";

export interface EvidenceLink {
  atomId: ID;
  title: string;
  snippet: string;
  suggestedRelation: "supports" | "contradicts" | "related";
  score: number;
}

export interface ClaimView {
  atomId: ID;
  claim: string;
  body: string;
  sourceTitle?: string;
  sourceId?: ID;
  evidence: EvidenceLink[];
}

const CLAIM_SIGNAL =
  /\b(claim|argue|show|demonstrate|find|found|suggest|prove|evidence|therefore|thus|results indicate|we conclude|hypothesis)\b/i;
const CONTRADICT_SIGNAL =
  /\b(however|contradict|disagree|unlike|fail|refute|not support|in contrast|whereas|despite)\b/i;

export function extractClaims(atoms: Atom[], sources: Source[]): ClaimView[] {
  const sourceById = new Map(sources.map((s) => [s.id, s]));
  const candidates = atoms.filter(
    (a) => a.body.length >= 50 && (CLAIM_SIGNAL.test(a.body) || a.title.length > 10),
  );

  return candidates.slice(0, 15).map((atom) => {
    const src = atom.sourceIds[0] ? sourceById.get(atom.sourceIds[0]) : undefined;
    const evidence = findEvidence(atom, atoms);
    return {
      atomId: atom.id,
      claim: atom.title,
      body: atom.body,
      sourceTitle: src?.title,
      sourceId: src?.id,
      evidence,
    };
  });
}

function findEvidence(claimAtom: Atom, all: Atom[]): EvidenceLink[] {
  const claimTokens = new Set(tokenize(claimAtom.body));
  return all
    .filter((o) => o.id !== claimAtom.id && !sharesSource(claimAtom, o))
    .map((o) => {
      const overlap = tokenOverlap(claimTokens, tokenize(o.body));
      return {
        atomId: o.id,
        title: o.title,
        snippet: o.body.slice(0, 140),
        suggestedRelation: suggestRelation(claimAtom.body, o.body, overlap),
        score: overlap,
      };
    })
    .filter((e) => e.score >= 0.12)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}

function suggestRelation(
  claimText: string,
  otherText: string,
  overlap: number,
): "supports" | "contradicts" | "related" {
  if (CONTRADICT_SIGNAL.test(otherText) || CONTRADICT_SIGNAL.test(claimText)) {
    return overlap > 0.2 ? "contradicts" : "related";
  }
  return overlap >= 0.25 ? "supports" : "related";
}

function tokenOverlap(a: Set<string>, b: string[]): number {
  if (b.length === 0) return 0;
  let hit = 0;
  for (const t of b) if (a.has(t)) hit++;
  return hit / b.length;
}
