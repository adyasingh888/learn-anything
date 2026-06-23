"use client";
import { useMemo } from "react";
import { memoryPalaceRooms, suggestMnemonics } from "@learn-anything/core";
import { useBrain, useStore } from "@/lib/store";

export function MemoryStudio({ brainId }: { brainId: string }) {
  const { atoms, cards } = useBrain(brainId);
  const { logActivity } = useStore();

  const rooms = useMemo(() => memoryPalaceRooms(atoms), [atoms]);
  const mnemonics = useMemo(() => suggestMnemonics(atoms, 6), [atoms]);
  const clozeDue = cards.filter((c) => c.kind === "cloze" || c.kind === "qa").length;

  if (atoms.length === 0) {
    return (
      <div className="card-surface rounded-2xl p-8 text-center text-sm text-[var(--color-muted)]">
        Capture facts or paste lists in Sources — memory mode builds palaces and mnemonics from your atoms.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-[var(--color-muted)]">
        Memory palace + mnemonics + spaced cards. Walk each room in order, then drill in Learn.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {rooms.map((r) => (
          <div key={r.room} className="card-surface rounded-xl p-4">
            <p className="text-xs font-medium text-[var(--color-accent)]">Room {r.room}</p>
            <p className="mt-1 text-sm font-semibold">{r.label}</p>
            <ul className="mt-2 space-y-1 text-sm text-[var(--color-text-secondary)]">
              {r.atoms.map((a) => (
                <li key={a.id}>📍 {a.title}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="card-surface rounded-2xl p-4">
        <h4 className="text-sm font-semibold">Mnemonic hooks</h4>
        <div className="mt-3 space-y-3">
          {mnemonics.map((m) => (
            <div key={m.atomId} className="rounded-lg border border-[var(--color-border)] p-3 text-sm">
              <p className="font-medium">{m.fact}</p>
              {m.acronym && <p className="mt-1 text-xs text-[var(--color-accent)]">Acronym: {m.acronym}</p>}
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{m.imageHook}</p>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="btn btn-primary mt-4"
          onClick={() => logActivity({ brainId, kind: "practice", score: 1, payload: { memoryPalace: true } })}
        >
          Log palace walk ✓
        </button>
      </div>

      {clozeDue > 0 && (
        <p className="text-center text-sm text-[var(--color-muted)]">
          {clozeDue} cards ready in <strong>Learn</strong> for spaced drill.
        </p>
      )}
    </div>
  );
}
