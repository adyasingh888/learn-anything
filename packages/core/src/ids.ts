/**
 * Collision-resistant ids. Uses UUIDs always generated client-side so that
 * the E2E-encrypted sync layer never needs to coordinate primary keys across
 * devices (server sees opaque ids only).
 */
export function newId(prefix = ""): string {
  const uuid =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : fallbackUuid();
  return prefix ? `${prefix}_${uuid}` : uuid;
}

function fallbackUuid(): string {
  // RFC4122-ish fallback for environments without crypto.randomUUID.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const now = (): number => Date.now();
