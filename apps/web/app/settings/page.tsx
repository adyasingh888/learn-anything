"use client";
import { useState } from "react";
import { Gate } from "@/components/Gate";
import { Header } from "@/components/Header";
import { useStore } from "@/lib/store";

export default function SettingsPage() {
  return (
    <Gate>
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <Privacy />
        <DataSection />
      </main>
    </Gate>
  );
}

function Privacy() {
  const { meta, enableEncryption, disableEncryption } = useStore();
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <section className="card-surface mt-5 rounded-2xl p-4">
      <h2 className="text-sm font-semibold">Vault encryption</h2>
      <p className="mt-0.5 text-xs text-[var(--color-muted)]">
        Encrypt all data on this device with a passphrase (AES-256-GCM, PBKDF2). The passphrase is never stored
        and cannot be recovered — this is real end-to-end encryption.
      </p>

      {meta.encrypted ? (
        <div className="mt-3">
          <span className="chip">🔒 Encryption enabled</span>
          <button className="btn mt-3" onClick={() => { disableEncryption(); setMsg("Encryption disabled."); }}>
            Disable encryption
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <input
            type="password"
            className="input"
            placeholder="New passphrase"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
          />
          <input
            type="password"
            className="input"
            placeholder="Confirm passphrase"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <button
            className="btn btn-primary"
            disabled={pass.length < 6 || pass !== confirm}
            onClick={async () => {
              await enableEncryption(pass);
              setPass("");
              setConfirm("");
              setMsg("Encryption enabled. Keep your passphrase safe — there is no recovery.");
            }}
          >
            Enable encryption
          </button>
          {pass && pass !== confirm && <p className="text-xs text-rose-400">Passphrases don't match.</p>}
        </div>
      )}
      {msg && <p className="mt-2 text-xs text-[var(--color-accent-2)]">{msg}</p>}
    </section>
  );
}

function DataSection() {
  const { exportVault } = useStore();
  const download = () => {
    const blob = new Blob([exportVault()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `learn-anything-export-${Date.now()}.json`;
    a.click();
  };
  return (
    <section className="card-surface mt-5 rounded-2xl p-4">
      <h2 className="text-sm font-semibold">Your data</h2>
      <p className="mt-0.5 text-xs text-[var(--color-muted)]">
        Everything lives on this device. Export a portable copy any time.
      </p>
      <button className="btn mt-3" onClick={download}>
        ⬇ Export vault (JSON)
      </button>
    </section>
  );
}
