/**
 * Device-local account identity (Phase 6 foundation).
 * No server required — sync layer can bind to this ID later.
 */
export interface LocalAccount {
  id: string;
  displayName: string;
  email?: string;
  createdAt: number;
  plan: "free" | "pro" | "team";
}

const ACCOUNT_KEY = "learn_anything_account_v1";

export function getAccount(): LocalAccount | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ACCOUNT_KEY);
    return raw ? (JSON.parse(raw) as LocalAccount) : null;
  } catch {
    return null;
  }
}

export function ensureAccount(displayName?: string): LocalAccount {
  const existing = getAccount();
  if (existing) return existing;
  const account: LocalAccount = {
    id: `user_${crypto.randomUUID().slice(0, 12)}`,
    displayName: displayName?.trim() || "Learner",
    createdAt: Date.now(),
    plan: "free",
  };
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
  return account;
}

export function updateAccount(patch: Partial<LocalAccount>): LocalAccount {
  const base = ensureAccount();
  const next = { ...base, ...patch };
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify(next));
  return next;
}

export function signOutAccount(): void {
  localStorage.removeItem(ACCOUNT_KEY);
}
