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
export * from "./research/claims.js";
export * from "./drill/code-tests.js";

export * from "./modes/types.js";
export * from "./modes/registry.js";
export * from "./modes/catalog.js";
