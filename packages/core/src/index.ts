/**
 * @learn-anything/core — domain logic shared by every surface (web, mobile,
 * extension). Pure TypeScript, no UI, no platform assumptions.
 */
export * from "./types.js";
export * from "./ids.js";

export * from "./srs/fsrs.js";
export * from "./embeddings/index.js";
export * from "./ingest/index.js";
export * from "./ingest/distill.js";
export * from "./ingest/bibtex.js";
export * from "./ingest/identifiers.js";
export * from "./graph/index.js";
export * from "./graph/related-reading.js";
export * from "./graph/concept-map.js";
export * from "./resurface/index.js";
export * from "./rag/index.js";
export * from "./generation/index.js";
export * from "./session/index.js";
export * from "./session/objectives.js";
export * from "./session/pacing.js";
export * from "./session/paths.js";
export * from "./search/vault.js";
export * from "./generation/socratic.js";
export * from "./export/markdown.js";
export * from "./session/weak-cards.js";
export * from "./search/vault-semantic.js";
export * from "./generation/teach-back-grade.js";
export * from "./domain/vocab.js";
export * from "./domain/viva.js";
export * from "./domain/free-recall.js";
export * from "./domain/graded-reader.js";
export * from "./generation/problem-set.js";
export * from "./generation/lit-synthesis.js";
export * from "./generation/critique.js";
export * from "./session/curriculum.js";
export * from "./session/metrics.js";
export * from "./session/project.js";
export * from "./exam/blueprint.js";
export * from "./exam/error-log.js";
export * from "./audio/analysis.js";
export * from "./audio/pronunciation.js";
export * from "./audio/dialogue.js";
export * from "./share/permissions.js";
export * from "./share/pack.js";
export * from "./reminders/schedule.js";
export * from "./import/brain-pack.js";
export * from "./memory/mnemonics.js";
export * from "./research/claims.js";
export * from "./drill/code-tests.js";

export * from "./modes/index.js";
