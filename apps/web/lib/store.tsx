"use client";
/**
 * Local-first store. All learner data lives in the browser (localStorage),
 * optionally encrypted at rest with a passphrase (see lib/crypto). This is the
 * runnable stand-in for the production E2EE sync layer (Jazz/Evolu): the shape
 * of the repository API is what the rest of the app depends on, so swapping the
 * persistence backend later does not touch the UI.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DEFAULT_PRIVACY_POLICY,
  HashingEmbedder,
  buildSession,
  createScheduler,
  defaultModeId,
  deriveTitle,
  dueCount,
  extractKeyphrases,
  distillToAtomDrafts,
  generateFlashcardsHeuristic,
  getMode,
  newCardState,
  newId,
  now,
  review as fsrsReview,
  suggestEdges,
  updateMastery,
  upsertConcept,
  objectivesFromGoal,
  brainToMarkdown,
  pathFromObjectives,
  type Activity,
  type Artifact,
  type Atom,
  type Brain,
  type Card,
  type Concept,
  type DomainType,
  type Edge,
  type EdgeRelation,
  type MasteryState,
  type Objective,
  type Path,
  type ReviewGrade,
  type Source,
  type SourceKind,
} from "@learn-anything/core";
import { decryptJSON, encryptJSON, isEncryptedBlob } from "./crypto";

interface Database {
  brains: Brain[];
  sources: Source[];
  atoms: Atom[];
  concepts: Concept[];
  edges: Edge[];
  cards: Card[];
  activities: Activity[];
  objectives: Objective[];
  mastery: MasteryState[];
  paths: Path[];
  artifacts: Artifact[];
}

const EMPTY_DB: Database = {
  brains: [],
  sources: [],
  atoms: [],
  concepts: [],
  edges: [],
  cards: [],
  activities: [],
  objectives: [],
  mastery: [],
  paths: [],
  artifacts: [],
};

const STORAGE_KEY = "learn_anything_vault_v1";
const META_KEY = "learn_anything_meta_v1";
const embedder = new HashingEmbedder(256);

interface VaultMeta {
  encrypted: boolean;
}

interface StoreContext {
  ready: boolean;
  locked: boolean;
  db: Database;
  // vault / privacy
  meta: VaultMeta;
  unlock: (passphrase: string) => Promise<boolean>;
  enableEncryption: (passphrase: string) => Promise<void>;
  disableEncryption: () => void;
  exportVault: () => string;
  importVault: (json: string, mode?: "merge" | "replace") => boolean;
  exportBrain: (brainId: string) => string;
  exportBrainMarkdown: (brainId: string) => string;
  enrichSourceText: (sourceId: string) => Promise<boolean>;
  // brains
  createBrain: (name: string, domainType: DomainType, goal?: string) => Brain;
  updateBrain: (id: string, patch: Partial<Brain>) => void;
  deleteBrain: (id: string) => void;
  // capture
  addSource: (
    brainId: string,
    input: { kind: SourceKind; title?: string; url?: string; text: string; meta?: Record<string, unknown> },
  ) => Promise<Source>;
  deleteSource: (id: string) => void;
  // atoms + graph
  addAtom: (brainId: string, title: string, body: string, sourceIds?: string[]) => Promise<Atom>;
  /** Split one source into multiple atoms (Graph tab). Returns count created. */
  distillSourceToAtoms: (sourceId: string) => Promise<number>;
  confirmEdge: (id: string) => void;
  rejectEdge: (id: string) => void;
  setEdgeRelation: (id: string, relation: EdgeRelation) => void;
  addTypedEdge: (brainId: string, from: string, to: string, relation: EdgeRelation) => void;
  /** Remove same-source edge suggestions (legacy noise). */
  pruneSameSourceEdges: (brainId: string) => void;
  // generation
  generateCardsFromSource: (sourceId: string) => Promise<Card[]>;
  setCardSuspended: (cardId: string, suspended: boolean) => void;
  // review
  gradeCard: (cardId: string, grade: ReviewGrade) => void;
  // activities / mastery
  logActivity: (a: Omit<Activity, "id" | "at"> & { at?: number }) => Activity;
  addArtifact: (a: Artifact) => void;
  /** Backfill objectives for brains created before objective tracking. */
  ensureObjectives: (brainId: string) => void;
}

const Ctx = createContext<StoreContext | null>(null);

export function useStore(): StoreContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<Database>(EMPTY_DB);
  const [meta, setMeta] = useState<VaultMeta>({ encrypted: false });
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(false);
  const passphraseRef = useRef<string | null>(null);

  // Load on mount.
  useEffect(() => {
    try {
      const rawMeta = localStorage.getItem(META_KEY);
      const m: VaultMeta = rawMeta ? JSON.parse(rawMeta) : { encrypted: false };
      setMeta(m);
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setReady(true);
        return;
      }
      const parsed = JSON.parse(raw);
      if (isEncryptedBlob(parsed) || m.encrypted) {
        setLocked(true);
        setReady(true);
        return;
      }
      setDb({ ...EMPTY_DB, ...parsed });
    } catch {
      /* fall through to empty */
    }
    setReady(true);
  }, []);

  // Persist on change (skipped while locked).
  const persist = useCallback(
    async (next: Database) => {
      try {
        if (meta.encrypted && passphraseRef.current) {
          const blob = await encryptJSON(next, passphraseRef.current);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(blob));
        } else {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        }
      } catch {
        /* storage full / unavailable */
      }
    },
    [meta.encrypted],
  );

  const commit = useCallback(
    (updater: (prev: Database) => Database) => {
      setDb((prev) => {
        const next = updater(prev);
        void persist(next);
        return next;
      });
    },
    [persist],
  );

  const unlock = useCallback(async (passphrase: string) => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        passphraseRef.current = passphrase;
        setLocked(false);
        return true;
      }
      const parsed = JSON.parse(raw);
      if (!isEncryptedBlob(parsed)) return false;
      const data = await decryptJSON<Database>(parsed, passphrase);
      passphraseRef.current = passphrase;
      setDb({ ...EMPTY_DB, ...data });
      setLocked(false);
      return true;
    } catch {
      return false;
    }
  }, []);

  const enableEncryption = useCallback(
    async (passphrase: string) => {
      passphraseRef.current = passphrase;
      const m = { encrypted: true };
      setMeta(m);
      localStorage.setItem(META_KEY, JSON.stringify(m));
      const blob = await encryptJSON(db, passphrase);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(blob));
    },
    [db],
  );

  const disableEncryption = useCallback(() => {
    passphraseRef.current = null;
    const m = { encrypted: false };
    setMeta(m);
    localStorage.setItem(META_KEY, JSON.stringify(m));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }, [db]);

  const exportVault = useCallback(() => JSON.stringify(db, null, 2), [db]);

  const exportBrain = useCallback(
    (brainId: string) => {
      const slice = {
        brain: db.brains.find((b) => b.id === brainId),
        sources: db.sources.filter((s) => s.brainId === brainId),
        atoms: db.atoms.filter((a) => a.brainId === brainId),
        concepts: db.concepts.filter((c) => c.brainId === brainId),
        edges: db.edges.filter((e) => e.brainId === brainId),
        cards: db.cards.filter((c) => c.brainId === brainId),
        activities: db.activities.filter((a) => a.brainId === brainId),
        objectives: db.objectives.filter((o) => o.brainId === brainId),
        mastery: db.mastery.filter((m) => m.brainId === brainId),
        paths: db.paths.filter((p) => p.brainId === brainId),
        artifacts: db.artifacts.filter((a) => a.brainId === brainId),
        exportedAt: now(),
      };
      return JSON.stringify(slice, null, 2);
    },
    [db],
  );

  const exportBrainMarkdown = useCallback(
    (brainId: string) =>
      brainToMarkdown({
        brain: db.brains.find((b) => b.id === brainId),
        sources: db.sources.filter((s) => s.brainId === brainId),
        atoms: db.atoms.filter((a) => a.brainId === brainId),
        edges: db.edges.filter((e) => e.brainId === brainId),
        cards: db.cards.filter((c) => c.brainId === brainId),
        objectives: db.objectives.filter((o) => o.brainId === brainId),
      }),
    [db],
  );

  const enrichSourceText = useCallback(
    async (sourceId: string) => {
      const source = db.sources.find((s) => s.id === sourceId);
      const pdfUrl = source?.meta?.openAccessPdf as string | undefined;
      const url = pdfUrl ?? source?.url;
      if (!source || !url) return false;
      try {
        const res = await fetch("/api/ingest/fulltext", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        if (!res.ok) return false;
        const data = (await res.json()) as { text?: string };
        if (!data.text || data.text.length < source.text.length) return false;
        commit((p) => ({
          ...p,
          sources: p.sources.map((s) =>
            s.id === sourceId
              ? { ...s, text: `${s.text}\n\n---\n\n${data.text}`, meta: { ...s.meta, fullText: true } }
              : s,
          ),
        }));
        return true;
      } catch {
        return false;
      }
    },
    [db.sources, commit],
  );

  const importVault = useCallback(
    (json: string, mode: "merge" | "replace" = "merge") => {
      try {
        const parsed = JSON.parse(json) as Partial<Database>;
        if (!parsed.brains || !Array.isArray(parsed.brains)) return false;
        commit((p) => {
          if (mode === "replace") {
            return { ...EMPTY_DB, ...parsed } as Database;
          }
          const mergeUnique = <T extends { id: string }>(a: T[], b: T[]) => {
            const ids = new Set(a.map((x) => x.id));
            return [...a, ...b.filter((x) => !ids.has(x.id))];
          };
          const mergeMastery = (a: MasteryState[], b: MasteryState[]) => {
            const keys = new Set(a.map((x) => x.objectiveId));
            return [...a, ...b.filter((x) => !keys.has(x.objectiveId))];
          };
          return {
            brains: mergeUnique(p.brains, parsed.brains ?? []),
            sources: mergeUnique(p.sources, parsed.sources ?? []),
            atoms: mergeUnique(p.atoms, parsed.atoms ?? []),
            concepts: mergeUnique(p.concepts, parsed.concepts ?? []),
            edges: mergeUnique(p.edges, parsed.edges ?? []),
            cards: mergeUnique(p.cards, parsed.cards ?? []),
            activities: mergeUnique(p.activities, parsed.activities ?? []),
            objectives: mergeUnique(p.objectives, parsed.objectives ?? []),
            mastery: mergeMastery(p.mastery, parsed.mastery ?? []),
            paths: mergeUnique(p.paths, parsed.paths ?? []),
            artifacts: mergeUnique(p.artifacts, parsed.artifacts ?? []),
          };
        });
        return true;
      } catch {
        return false;
      }
    },
    [commit],
  );

  // ---- Brains ----
  const createBrain = useCallback(
    (name: string, domainType: DomainType, goal?: string) => {
      const brain: Brain = {
        id: newId("brain"),
        name,
        domainType,
        modeId: defaultModeId(domainType),
        goal,
        privacy: { ...DEFAULT_PRIVACY_POLICY },
        createdAt: now(),
        updatedAt: now(),
      };
      const objectives = goal ? objectivesFromGoal(brain.id, goal) : [];
      const mastery: MasteryState[] = objectives.map((o) => ({
        objectiveId: o.id,
        brainId: brain.id,
        mastery: 0,
        lastUpdated: now(),
      }));
      const paths = objectives.length ? [pathFromObjectives(brain.id, objectives)] : [];
      commit((p) => ({
        ...p,
        brains: [...p.brains, brain],
        objectives: [...p.objectives, ...objectives],
        mastery: [...p.mastery, ...mastery],
        paths: [...p.paths, ...paths],
      }));
      return brain;
    },
    [commit],
  );

  const updateBrain = useCallback(
    (id: string, patch: Partial<Brain>) =>
      commit((p) => {
        const prev = p.brains.find((b) => b.id === id);
        let objectives = p.objectives;
        let mastery = p.mastery;
        if (patch.goal !== undefined && patch.goal !== prev?.goal && patch.goal?.trim()) {
          objectives = [
            ...p.objectives.filter((o) => o.brainId !== id),
            ...objectivesFromGoal(id, patch.goal),
          ];
          const newObjs = objectives.filter((o) => o.brainId === id);
          mastery = [
            ...p.mastery.filter((m) => m.brainId !== id),
            ...newObjs.map((o) => ({
              objectiveId: o.id,
              brainId: id,
              mastery: 0,
              lastUpdated: now(),
            })),
          ];
          const paths = [
            ...p.paths.filter((path) => path.brainId !== id),
            pathFromObjectives(id, newObjs),
          ];
          return {
            ...p,
            objectives,
            mastery,
            paths,
            brains: p.brains.map((b) => (b.id === id ? { ...b, ...patch, updatedAt: now() } : b)),
          };
        }
        return {
          ...p,
          objectives,
          mastery,
          brains: p.brains.map((b) => (b.id === id ? { ...b, ...patch, updatedAt: now() } : b)),
        };
      }),
    [commit],
  );

  const deleteBrain = useCallback(
    (id: string) =>
      commit((p) => ({
        ...p,
        brains: p.brains.filter((b) => b.id !== id),
        sources: p.sources.filter((s) => s.brainId !== id),
        atoms: p.atoms.filter((a) => a.brainId !== id),
        concepts: p.concepts.filter((c) => c.brainId !== id),
        edges: p.edges.filter((e) => e.brainId !== id),
        cards: p.cards.filter((c) => c.brainId !== id),
        activities: p.activities.filter((a) => a.brainId !== id),
        objectives: p.objectives.filter((o) => o.brainId !== id),
        mastery: p.mastery.filter((m) => m.brainId !== id),
        paths: p.paths.filter((path) => path.brainId !== id),
        artifacts: p.artifacts.filter((a) => a.brainId !== id),
      })),
    [commit],
  );

  // ---- Capture ----
  const addSource = useCallback<StoreContext["addSource"]>(
    async (brainId, input) => {
      const title = input.title?.trim() || deriveTitle(input.text, input.url ?? "Untitled");
      const source: Source = {
        id: newId("src"),
        brainId,
        kind: input.kind,
        title,
        url: input.url,
        text: input.text,
        meta: input.meta ?? {},
        capturedAt: now(),
        status: "ready",
      };
      // Seed concepts from keyphrases so the graph is populated immediately.
      const phrases = extractKeyphrases(`${title}\n${input.text}`, 6);
      commit((p) => {
        let concepts = [...p.concepts];
        for (const ph of phrases) {
          const { concept, created } = upsertConcept(concepts, brainId, ph);
          if (created) concepts = [...concepts, concept];
        }
        return { ...p, sources: [...p.sources, source], concepts };
      });
      return source;
    },
    [commit],
  );

  const deleteSource = useCallback(
    (id: string) => commit((p) => ({ ...p, sources: p.sources.filter((s) => s.id !== id) })),
    [commit],
  );

  // ---- Atoms + graph auto-linking ----
  const addAtom = useCallback<StoreContext["addAtom"]>(
    async (brainId, title, body, sourceIds = []) => {
      const embedding = await embedder.embed(`${title}\n${body}`);
      const phrases = extractKeyphrases(`${title}\n${body}`, 4);
      const atom: Atom = {
        id: newId("atom"),
        brainId,
        title,
        body,
        sourceIds,
        embedding,
        conceptIds: [],
        createdAt: now(),
        updatedAt: now(),
      };
      commit((p) => {
        let concepts = [...p.concepts];
        const conceptIds: string[] = [];
        for (const ph of phrases) {
          const { concept, created } = upsertConcept(concepts, brainId, ph);
          if (created) concepts = [...concepts, concept];
          conceptIds.push(concept.id);
        }
        atom.conceptIds = conceptIds;
        const brainAtoms = p.atoms.filter((a) => a.brainId === brainId);
        const proposed = suggestEdges(atom, brainAtoms, { brainId });
        return {
          ...p,
          atoms: [...p.atoms, atom],
          concepts,
          edges: [...p.edges, ...proposed],
        };
      });
      return atom;
    },
    [commit],
  );

  const confirmEdge = useCallback(
    (id: string) =>
      commit((p) => ({
        ...p,
        edges: p.edges.map((e) => (e.id === id ? { ...e, weight: 1 } : e)),
      })),
    [commit],
  );
  const rejectEdge = useCallback(
    (id: string) => commit((p) => ({ ...p, edges: p.edges.filter((e) => e.id !== id) })),
    [commit],
  );

  const setEdgeRelation = useCallback(
    (id: string, relation: EdgeRelation) =>
      commit((p) => ({
        ...p,
        edges: p.edges.map((e) => (e.id === id ? { ...e, relation, weight: 1 } : e)),
      })),
    [commit],
  );

  const addTypedEdge = useCallback(
    (brainId: string, from: string, to: string, relation: EdgeRelation) =>
      commit((p) => {
        const exists = p.edges.some(
          (e) =>
            e.brainId === brainId &&
            ((e.from === from && e.to === to) || (e.from === to && e.to === from)),
        );
        if (exists) return p;
        const edge: Edge = {
          id: newId("edge"),
          brainId,
          from,
          to,
          relation,
          weight: 1,
        };
        return { ...p, edges: [...p.edges, edge] };
      }),
    [commit],
  );

  const setCardSuspended = useCallback(
    (cardId: string, suspended: boolean) =>
      commit((p) => ({
        ...p,
        cards: p.cards.map((c) => (c.id === cardId ? { ...c, suspended } : c)),
      })),
    [commit],
  );

  const pruneSameSourceEdges = useCallback(
    (brainId: string) =>
      commit((p) => {
        const atomsById = new Map(p.atoms.map((a) => [a.id, a]));
        const shares = (e: Edge) => {
          const a = atomsById.get(e.from);
          const b = atomsById.get(e.to);
          if (!a || !b) return false;
          return a.sourceIds.some((id) => b.sourceIds.includes(id));
        };
        return {
          ...p,
          edges: p.edges.filter((e) => e.brainId !== brainId || e.weight >= 1 || !shares(e)),
        };
      }),
    [commit],
  );

  const distillSourceToAtoms = useCallback(
    async (sourceId: string) => {
      const source = db.sources.find((s) => s.id === sourceId);
      if (!source || source.text.length < 20) return 0;

      const drafts = distillToAtomDrafts(source.text, source.title);
      if (!drafts.length) return 0;

      const embedded = await Promise.all(
        drafts.map(async (d) => ({
          ...d,
          embedding: await embedder.embed(`${d.title}\n${d.body}`),
        })),
      );

      commit((p) => {
        let concepts = [...p.concepts];
        const newAtoms: Atom[] = [];
        const newEdges: Edge[] = [];
        const existing = p.atoms.filter((a) => a.brainId === source.brainId);

        for (const d of embedded) {
          const phrases = extractKeyphrases(`${d.title}\n${d.body}`, 4);
          const conceptIds: string[] = [];
          for (const ph of phrases) {
            const { concept, created } = upsertConcept(concepts, source.brainId, ph);
            if (created) concepts = [...concepts, concept];
            conceptIds.push(concept.id);
          }
          const atom: Atom = {
            id: newId("atom"),
            brainId: source.brainId,
            title: d.title,
            body: d.body,
            sourceIds: [source.id],
            embedding: d.embedding,
            conceptIds,
            createdAt: now(),
            updatedAt: now(),
          };
          newAtoms.push(atom);
          newEdges.push(...suggestEdges(atom, [...existing, ...newAtoms.slice(0, -1)], { brainId: source.brainId }));
        }

        return {
          ...p,
          atoms: [...p.atoms, ...newAtoms],
          concepts,
          edges: [...p.edges, ...newEdges],
        };
      });

      return drafts.length;
    },
    [db.sources, commit],
  );

  // ---- Generation ----
  const generateCardsFromSource = useCallback(
    async (sourceId: string): Promise<Card[]> => {
      const source = db.sources.find((s) => s.id === sourceId);
      if (!source) return [];
      const brain = db.brains.find((b) => b.id === source.brainId);
      const mode = getMode(brain?.modeId, brain?.domainType ?? "general");

      let cards: Card[] = [];
      try {
        const res = await fetch("/api/generate-cards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: source.text,
            title: source.title,
            brainId: source.brainId,
            sourceId: source.id,
            bloomTargets: mode.bloomTargets,
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as { cards?: Card[] };
          cards = (data.cards ?? []).map((c) => ({
            ...c,
            id: newId("card"),
            fsrs: newCardState(),
            createdAt: now(),
            atomIds: c.atomIds ?? [],
            conceptIds: c.conceptIds ?? [],
          }));
        }
      } catch {
        /* use heuristic */
      }

      if (!cards.length) {
        cards = generateFlashcardsHeuristic(source.text, {
          brainId: source.brainId,
          sourceIds: [source.id],
          maxCards: 12,
          bloomTargets: mode.bloomTargets,
        });
      }

      if (cards.length) commit((p) => ({ ...p, cards: [...p.cards, ...cards] }));
      return cards;
    },
    [db.sources, db.brains, commit],
  );

  // ---- Review ----
  const gradeCard = useCallback(
    (cardId: string, grade: ReviewGrade) => {
      commit((p) => {
        const card = p.cards.find((c) => c.id === cardId);
        if (!card) return p;
        const brain = p.brains.find((b) => b.id === card.brainId);
        const mode = getMode(brain?.modeId, brain?.domainType ?? "general");
        const scheduler = createScheduler({ targetRetention: mode.scheduler.targetRetention });
        const nextFsrs = fsrsReview(scheduler, card.fsrs, grade);
        const activity: Activity = {
          id: newId("act"),
          brainId: card.brainId,
          kind: "review",
          cardId,
          score: grade === "again" ? 0 : grade === "hard" ? 0.5 : grade === "good" ? 0.8 : 1,
          at: now(),
        };
        return {
          ...p,
          cards: p.cards.map((c) => (c.id === cardId ? { ...c, fsrs: nextFsrs } : c)),
          activities: [...p.activities, activity],
        };
      });
    },
    [commit],
  );

  const logActivity = useCallback<StoreContext["logActivity"]>(
    (a) => {
      const activity: Activity = { ...a, id: newId("act"), at: a.at ?? now() };
      commit((p) => {
        let mastery = p.mastery;
        if (activity.objectiveId) {
          const prev = p.mastery.find((m) => m.objectiveId === activity.objectiveId);
          const updated = updateMastery(prev, activity);
          mastery = prev
            ? p.mastery.map((m) => (m.objectiveId === activity.objectiveId ? updated : m))
            : [...p.mastery, updated];
        }
        return { ...p, activities: [...p.activities, activity], mastery };
      });
      return activity;
    },
    [commit],
  );

  const addArtifact = useCallback(
    (a: Artifact) => commit((p) => ({ ...p, artifacts: [...p.artifacts, a] })),
    [commit],
  );

  const ensureObjectives = useCallback(
    (brainId: string) =>
      commit((p) => {
        const brain = p.brains.find((b) => b.id === brainId);
        if (!brain?.goal?.trim()) return p;
        if (p.objectives.some((o) => o.brainId === brainId)) return p;
        const objectives = objectivesFromGoal(brainId, brain.goal);
        const mastery: MasteryState[] = objectives.map((o) => ({
          objectiveId: o.id,
          brainId,
          mastery: 0,
          lastUpdated: now(),
        }));
        const paths = [pathFromObjectives(brainId, objectives)];
        return {
          ...p,
          objectives: [...p.objectives, ...objectives],
          mastery: [...p.mastery, ...mastery],
          paths: [...p.paths, ...paths],
        };
      }),
    [commit],
  );

  const value = useMemo<StoreContext>(
    () => ({
      ready,
      locked,
      db,
      meta,
      unlock,
      enableEncryption,
      disableEncryption,
      exportVault,
      importVault,
      exportBrain,
      exportBrainMarkdown,
      enrichSourceText,
      createBrain,
      updateBrain,
      deleteBrain,
      addSource,
      deleteSource,
      addAtom,
      distillSourceToAtoms,
      confirmEdge,
      rejectEdge,
      setEdgeRelation,
      addTypedEdge,
      pruneSameSourceEdges,
      generateCardsFromSource,
      setCardSuspended,
      gradeCard,
      logActivity,
      addArtifact,
      ensureObjectives,
    }),
    [
      ready,
      locked,
      db,
      meta,
      unlock,
      enableEncryption,
      disableEncryption,
      exportVault,
      importVault,
      exportBrain,
      exportBrainMarkdown,
      enrichSourceText,
      createBrain,
      updateBrain,
      deleteBrain,
      addSource,
      deleteSource,
      addAtom,
      distillSourceToAtoms,
      confirmEdge,
      rejectEdge,
      setEdgeRelation,
      addTypedEdge,
      pruneSameSourceEdges,
      generateCardsFromSource,
      setCardSuspended,
      gradeCard,
      logActivity,
      addArtifact,
      ensureObjectives,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// ---- Selectors / helpers ----
export function useBrain(brainId: string) {
  const { db } = useStore();
  return useMemo(() => {
    const brain = db.brains.find((b) => b.id === brainId);
    const sources = db.sources.filter((s) => s.brainId === brainId);
    const atoms = db.atoms.filter((a) => a.brainId === brainId);
    const concepts = db.concepts.filter((c) => c.brainId === brainId);
    const edges = db.edges.filter((e) => e.brainId === brainId);
    const cards = db.cards.filter((c) => c.brainId === brainId);
    const activities = db.activities.filter((a) => a.brainId === brainId);
    const artifacts = db.artifacts.filter((a) => a.brainId === brainId);
    const objectives = db.objectives.filter((o) => o.brainId === brainId);
    const mastery = db.mastery.filter((m) => m.brainId === brainId);
    const paths = db.paths.filter((p) => p.brainId === brainId);
    return { brain, sources, atoms, concepts, edges, cards, activities, artifacts, objectives, mastery, paths };
  }, [db, brainId]);
}

export { dueCount, buildSession, getMode, newCardState };
