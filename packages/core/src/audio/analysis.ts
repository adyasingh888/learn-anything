/**
 * On-device audio analysis helpers.
 */
export interface RecordingMeta {
  durationSec?: number;
  pitchHz?: number;
  targetBpm?: number;
  noteStability?: number;
}

export function analyzeRecordingMeta(meta: RecordingMeta): {
  score: number;
  summary: string;
  tempoMatch?: number;
  durationOk?: boolean;
} {
  let score = 0.5;
  const parts: string[] = [];

  if (meta.durationSec != null) {
    const ok = meta.durationSec >= 5;
    if (ok) {
      score += 0.15;
      parts.push(`${meta.durationSec}s recorded`);
    } else parts.push("Try a longer take (5s+)");
  }

  if (meta.pitchHz && meta.pitchHz > 0) {
    score += 0.15;
    parts.push(`avg pitch ~${Math.round(meta.pitchHz)} Hz`);
  }

  if (meta.targetBpm && meta.durationSec) {
    const expectedBeats = (meta.durationSec / 60) * meta.targetBpm;
    const tempoMatch = Math.min(1, expectedBeats / Math.max(expectedBeats, 1));
    score += 0.2 * tempoMatch;
    parts.push(`~${Math.round(expectedBeats)} beats at ${meta.targetBpm} bpm`);
  }

  if (meta.noteStability != null) {
    score += 0.2 * meta.noteStability;
    parts.push(`pitch stability ${Math.round(meta.noteStability * 100)}%`);
  }

  return {
    score: clamp01(score),
    summary: parts.length ? parts.join(" · ") : "Record a take to analyze",
    durationOk: (meta.durationSec ?? 0) >= 5,
  };
}

export function freqToMidi(freq: number): number {
  return Math.round(12 * Math.log2(freq / 440) + 69);
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}
