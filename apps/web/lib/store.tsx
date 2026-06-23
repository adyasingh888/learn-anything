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
  type Activity,
  type Artifact,
  type Atom,
  type Brain,
  type Card,
  type Concept,
  type DomainType,
  type Edge,
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
  /** Remove same-source edge suggestions (legacy noise). */
  pruneSameSourceEdges: (brainId: string) => void;
  // generation
  generateCardsFromSource: (sourceId: string) => Promise<Card[]>;
  // review
  gradeCard: (cardId: string, grade: ReviewGrade) => void;
  // activities / mastery
  logActivity: (a: Omit<Activity, "id" | "at"> & { at?: number }) => Activity;
  addArtifact: (a: Artifact) => void;
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
      commit((p) => ({ ...p, brains: [...p.brains, brain] }));
      return brain;
    },
    [commit],
  );

  const updateBrain = useCallback(
    (id: string, patch: Partial<Brain>) =>
      commit((p) => ({
        ...p,
        brains: p.brains.map((b) => (b.id === id ? { ...b, ...patch, updatedAt: now() } : b)),
      })),
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
      createBrain,
      updateBrain,
      deleteBrain,
      addSource,
      deleteSource,
      addAtom,
      distillSourceToAtoms,
      confirmEdge,
      rejectEdge,
      pruneSameSourceEdges,
      generateCardsFromSource,
      gradeCard,
      logActivity,
      addArtifact,
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
      createBrain,
      updateBrain,
      deleteBrain,
      addSource,
      deleteSource,
      addAtom,
      distillSourceToAtoms,
      confirmEdge,
      rejectEdge,
      pruneSameSourceEdges,
      generateCardsFromSource,
      gradeCard,
      logActivity,
      addArtifact,
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
    return { brain, sources, atoms, concepts, edges, cards, activities, artifacts };
  }, [db, brainId]);
}

export { dueCount, buildSession, getMode, newCardState };
