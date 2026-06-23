/**
 * Spaced resurfacing — serendipitously bring back atoms/sources you haven't
 * visited recently, separate from FSRS card review.
 */
import type { Activity, Atom, Source } from "../types.js";

export interface ResurfaceItem {
  type: "atom" | "source";
  id: string;
  brainId: string;
  brainName?: string;
  title: string;
  snippet: string;
  reason: string;
  daysSince: number;
}

const MS_DAY = 86_400_000;

export function pickResurfaceItems(
  brains: { id: string; name: string }[],
  atoms: Atom[],
  sources: Source[],
  activities: Activity[],
  opts: { limit?: number; minDays?: number } = {},
): ResurfaceItem[] {
  const limit = opts.limit ?? 5;
  const minDays = opts.minDays ?? 3;
  const now = Date.now();
  const brainNames = new Map(brains.map((b) => [b.id, b.name]));

  const lastTouched = new Map<string, number>();
  for (const a of activities) {
    const ids = [a.cardId, a.payload?.atomId as string, a.payload?.sourceId as string].filter(Boolean);
    for (const id of ids) {
      lastTouched.set(id!, Math.max(lastTouched.get(id!) ?? 0, a.at));
    }
  }

  type Scored = ResurfaceItem & { score: number };
  const scored: Scored[] = [];

  for (const atom of atoms) {
    const base = atom.updatedAt ?? atom.createdAt;
    const touched = lastTouched.get(atom.id) ?? base;
    const daysSince = (now - touched) / MS_DAY;
    if (daysSince < minDays) continue;
    scored.push({
      type: "atom",
      id: atom.id,
      brainId: atom.brainId,
      brainName: brainNames.get(atom.brainId),
      title: atom.title,
      snippet: atom.body.slice(0, 180),
      reason: daysSince >= 14 ? "Haven't revisited in 2+ weeks" : "Due for a refresh",
      daysSince: Math.floor(daysSince),
      score: daysSince + (atom.body.length > 100 ? 2 : 0),
    });
  }

  for (const src of sources) {
    if (src.text.length < 40) continue;
    const touched = lastTouched.get(src.id) ?? src.capturedAt;
    const daysSince = (now - touched) / MS_DAY;
    if (daysSince < minDays) continue;
    scored.push({
      type: "source",
      id: src.id,
      brainId: src.brainId,
      brainName: brainNames.get(src.brainId),
      title: src.title,
      snippet: src.text.slice(0, 180),
      reason: "Captured a while ago — worth another look",
      daysSince: Math.floor(daysSince),
      score: daysSince * 0.9,
    });
  }

  // Slight shuffle among top candidates for serendipity.
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, limit * 2);
  for (let i = top.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [top[i], top[j]] = [top[j], top[i]];
  }
  return top.slice(0, limit);
}
