/**
 * Heuristic mnemonics from atoms — no LLM.
 */
import { extractKeyphrases } from "../ingest/index.js";
import type { Atom } from "../types.js";

export interface MnemonicSuggestion {
  atomId: string;
  fact: string;
  acronym?: string;
  imageHook: string;
  rhyme?: string;
}

export function suggestMnemonics(atoms: Atom[], limit = 8): MnemonicSuggestion[] {
  return atoms.slice(0, limit).map((atom) => {
    const keys = extractKeyphrases(atom.body, 4);
    const acronym = keys.length >= 2 ? keys.map((k) => k[0]?.toUpperCase() ?? "").join("") : undefined;
    const firstWord = keys[0] ?? atom.title.split(" ")[0];
    return {
      atomId: atom.id,
      fact: atom.title,
      acronym: acronym && acronym.length >= 2 ? acronym : undefined,
      imageHook: `Picture **${firstWord}** in a vivid, exaggerated scene tied to: ${atom.title.slice(0, 60)}`,
      rhyme: keys[0] ? `"${keys[0]}" → link it to something you already know vividly.` : undefined,
    };
  });
}

/** Group atoms into memory-palace "rooms" (clusters of 3–5). */
export function memoryPalaceRooms(atoms: Atom[]): { room: number; label: string; atoms: Atom[] }[] {
  const rooms: { room: number; label: string; atoms: Atom[] }[] = [];
  const chunk = 4;
  for (let i = 0; i < atoms.length; i += chunk) {
    const slice = atoms.slice(i, i + chunk);
    const label = slice.map((a) => a.title.split(" ")[0]).join(" · ");
    rooms.push({ room: Math.floor(i / chunk) + 1, label, atoms: slice });
  }
  return rooms.slice(0, 8);
}
