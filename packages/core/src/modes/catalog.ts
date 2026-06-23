import type { DomainType } from "../types.js";

/** Human-facing catalog — used by the "New Brain" picker. */
export interface DomainInfo {
  type: DomainType;
  label: string;
  /** One-line pitch shown on the card. */
  tagline: string;
  /** Example topics (not an exhaustive list). */
  examples: string;
  emoji: string;
  /** The learning mode that activates for this domain. */
  modeName: string;
  /** Concrete situations — helps people self-identify. */
  useCases: string[];
  /** Default goal placeholder when this domain is selected. */
  goalPlaceholder: string;
  /** Suggested brain names. */
  namePlaceholder: string;
}

export interface DomainIntent {
  id: string;
  label: string;
  goalPlaceholder: string;
  namePlaceholder?: string;
}

export const DOMAIN_CATALOG: DomainInfo[] = [
  {
    type: "general",
    label: "Curiosity & links",
    tagline: "Save what catches your eye — articles, threads, rabbit holes.",
    examples: "News, essays, podcasts, random Wikipedia",
    emoji: "✨",
    modeName: "Capture & Digest",
    useCases: ["Daily reading", "Save for later", "Connect ideas across topics"],
    goalPlaceholder: "e.g. Revisit and actually remember what I save",
    namePlaceholder: "e.g. Interesting reads, Rabbit holes",
  },
  {
    type: "language",
    label: "Any language",
    tagline: "Vocab, grammar, listening, speaking — not just European or East Asian.",
    examples: "French, Arabic, Hindi, Korean, Swahili, Portuguese, Urdu, German…",
    emoji: "🌍",
    modeName: "Language Immersion",
    useCases: ["Travel fluency", "Heritage language", "Reading literature", "Work relocation"],
    goalPlaceholder: "e.g. Hold a 15-minute conversation, read the news",
    namePlaceholder: "e.g. French, Hindi, Korean",
  },
  {
    type: "concept",
    label: "Concepts & theory",
    tagline: "Understand the why, map connections, recall on demand.",
    examples: "Physics, history, biology, economics, philosophy",
    emoji: "🔬",
    modeName: "Concept Mastery",
    useCases: ["University course", "Self-study textbook", "Explain to someone else"],
    goalPlaceholder: "e.g. Master thermodynamics before the exam",
    namePlaceholder: "e.g. Quantum basics, Roman history",
  },
  {
    type: "procedural",
    label: "Practice & problems",
    tagline: "Worked examples, then faded practice with instant feedback.",
    examples: "Math, programming, engineering, data science",
    emoji: "🧮",
    modeName: "Practice & Drill",
    useCases: ["Problem sets", "Leetcode / interviews", "Lab calculations"],
    goalPlaceholder: "e.g. Solve integrals without looking up formulas",
    namePlaceholder: "e.g. Linear algebra, Python",
  },
  {
    type: "research",
    label: "Research & writing",
    tagline: "Dissertation, lit review, assignments, viva — more than “scholar mode”.",
    examples: "PhD thesis, MSc dissertation, journal paper, policy brief",
    emoji: "📚",
    modeName: "Research & Scholar",
    useCases: ["Dissertation / thesis", "Literature review", "Essay or assignment", "Viva / oral defense"],
    goalPlaceholder: "e.g. Finish chapter 3 draft by March",
    namePlaceholder: "e.g. My dissertation, Climate policy review",
  },
  {
    type: "performance",
    label: "Instrument & performance",
    tagline: "Deliberate practice — chunk it, slow it down, record, review.",
    examples: "Guitar, piano, voice, dance, sport, public speaking",
    emoji: "🎻",
    modeName: "Practice Studio",
    useCases: ["Daily instrument practice", "Audition prep", "Presentation rehearsal"],
    goalPlaceholder: "e.g. Play this piece at full tempo cleanly",
    namePlaceholder: "e.g. Guitar, Voice, TED talk",
  },
  {
    type: "creative",
    label: "Creative work",
    tagline: "Study exemplars, create, get structured critique.",
    examples: "Fiction, poetry, drawing, UI design, music composition",
    emoji: "🎨",
    modeName: "Studio & Critique",
    useCases: ["Daily writing habit", "Portfolio piece", "Imitate then innovate"],
    goalPlaceholder: "e.g. Finish a short story draft",
    namePlaceholder: "e.g. Novel draft, Sketchbook",
  },
  {
    type: "memory",
    label: "Memorization",
    tagline: "High-volume facts with spaced repetition and mnemonics.",
    examples: "Anatomy, law, medical terms, geography, trivia",
    emoji: "🃏",
    modeName: "Memory",
    useCases: ["Exam cram (with spacing)", "Professional terminology", "Language vocab bulk"],
    goalPlaceholder: "e.g. Know all cranial nerves cold",
    namePlaceholder: "e.g. Anatomy, Bar exam facts",
  },
  {
    type: "exam",
    label: "Exam & certification",
    tagline: "Mock tests, error log, weakness targeting — mastery before moving on.",
    examples: "USMLE, bar exam, SAT, GRE, AWS, driving theory",
    emoji: "📝",
    modeName: "Exam Prep",
    useCases: ["Standardized test", "Professional license", "Course final"],
    goalPlaceholder: "e.g. Score 90%+ on practice tests",
    namePlaceholder: "e.g. GRE prep, AWS SAA",
  },
  {
    type: "project",
    label: "Project & how-to",
    tagline: "Learn by doing — just-in-time lessons toward a real deliverable.",
    examples: "Cooking, photography, woodworking, startup skills, gardening",
    emoji: "🛠️",
    modeName: "Project & Apprenticeship",
    useCases: ["Build something real", "Pick up a hobby", "Side project at work"],
    goalPlaceholder: "e.g. Cook 10 dishes from memory, ship a portfolio site",
    namePlaceholder: "e.g. Sourdough, Portrait photography",
  },
];

/** Optional sub-intent chips — narrows goal/name placeholders for common situations. */
export const DOMAIN_INTENTS: Partial<Record<DomainType, DomainIntent[]>> = {
  general: [
    { id: "daily", label: "Daily curiosity", goalPlaceholder: "Review saved links every week", namePlaceholder: "Daily reads" },
    { id: "deep", label: "Deep dive", goalPlaceholder: "Become fluent in this one topic", namePlaceholder: "Deep dive: …" },
  ],
  language: [
    { id: "speak", label: "Speaking focus", goalPlaceholder: "Hold a 15-min conversation", namePlaceholder: "e.g. Conversational Arabic" },
    { id: "read", label: "Reading focus", goalPlaceholder: "Read a novel without a dictionary", namePlaceholder: "e.g. Reading Korean" },
    { id: "heritage", label: "Heritage / family", goalPlaceholder: "Talk with relatives comfortably", namePlaceholder: "e.g. Heritage Hindi" },
  ],
  research: [
    {
      id: "dissertation",
      label: "Dissertation / thesis",
      goalPlaceholder: "Complete and defend my thesis by …",
      namePlaceholder: "e.g. PhD dissertation",
    },
    {
      id: "lit-review",
      label: "Literature review",
      goalPlaceholder: "Map and synthesize papers on …",
      namePlaceholder: "e.g. Lit review — climate policy",
    },
    {
      id: "assignment",
      label: "Essay / assignment",
      goalPlaceholder: "Write and submit … by …",
      namePlaceholder: "e.g. MSc essay — methods",
    },
    {
      id: "viva",
      label: "Viva / oral defense",
      goalPlaceholder: "Defend methodology and answer examiner questions",
      namePlaceholder: "e.g. Viva prep",
    },
    {
      id: "paper",
      label: "Journal / conference paper",
      goalPlaceholder: "Submit draft to …",
      namePlaceholder: "e.g. Paper — user study",
    },
  ],
  project: [
    { id: "hobby", label: "Hobby", goalPlaceholder: "Make something I'm proud of", namePlaceholder: "e.g. Home cooking" },
    { id: "work", label: "Work skill", goalPlaceholder: "Use this skill on the job", namePlaceholder: "e.g. Product analytics" },
    { id: "build", label: "Build & ship", goalPlaceholder: "Ship a finished deliverable", namePlaceholder: "e.g. Portfolio website" },
  ],
  exam: [
    { id: "cert", label: "Professional cert", goalPlaceholder: "Pass the exam on first attempt", namePlaceholder: "e.g. AWS Solutions Architect" },
    { id: "school", label: "School / university", goalPlaceholder: "Ace the final exam", namePlaceholder: "e.g. Organic chem final" },
  ],
};

export function getDomainInfo(type: DomainType): DomainInfo | undefined {
  return DOMAIN_CATALOG.find((d) => d.type === type);
}
