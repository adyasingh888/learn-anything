"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";

/** Renders a loading state, an unlock screen for encrypted vaults, or content. */
export function Gate({ children }: { children: React.ReactNode }) {
  const { ready, locked, unlock } = useStore();
  const [pass, setPass] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-[var(--color-muted)]">
        Loading your vault…
      </div>
    );
  }

  if (locked) {
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <div className="card-surface w-full max-w-sm rounded-2xl p-6">
          <h1 className="text-lg font-semibold">Unlock your vault</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Your data is end-to-end encrypted on this device. Enter your passphrase to decrypt it.
          </p>
          <form
            className="mt-4 space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              const ok = await unlock(pass);
              setBusy(false);
              setError(!ok);
            }}
          >
            <input
              type="password"
              className="input"
              placeholder="Passphrase"
              value={pass}
              autoFocus
              onChange={(e) => setPass(e.target.value)}
            />
            {error && <p className="text-xs text-rose-400">Wrong passphrase. Try again.</p>}
            <button className="btn btn-primary w-full justify-center" disabled={busy}>
              {busy ? "Decrypting…" : "Unlock"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
