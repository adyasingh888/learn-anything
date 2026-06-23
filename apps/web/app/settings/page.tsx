"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Gate } from "@/components/Gate";
import { Header } from "@/components/Header";
import { ReviewReminderToggle } from "@/components/ReviewReminders";
import { useStore } from "@/lib/store";

export default function SettingsPage() {
  return (
    <Gate>
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <section className="card-surface mt-5 rounded-2xl p-4 text-sm text-[var(--color-text-secondary)]">
          <strong>No API keys required.</strong> Capture, atoms, graph, Semantic Scholar papers, Jina article
          reading, YouTube transcripts, on-device tutor, and FSRS review all work free. Optional server keys
          (`LLM_API_KEY`, `JINA_API_KEY`) only improve generation quality and rate limits — see{" "}
          <a href="https://github.com/adyasingh888/learn-anything/blob/main/docs/FREE_TIER.md" className="text-[var(--color-accent)] underline">
            docs/FREE_TIER.md
          </a>
          .
        </section>
        <Privacy />
        <DataSection />
        <BrainImportSection />
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
  const { exportVault, importVault } = useStore();
  const [msg, setMsg] = useState<string | null>(null);
  const download = () => {
    const blob = new Blob([exportVault()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `learn-anything-export-${Date.now()}.json`;
    a.click();
  };
  const onImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const ok = importVault(await file.text(), "merge");
      setMsg(ok ? "Vault merged successfully." : "Invalid vault file.");
    } catch {
      setMsg("Could not read file.");
    }
  };
  return (
    <section className="card-surface mt-5 rounded-2xl p-4">
      <h2 className="text-sm font-semibold">Your data</h2>
      <p className="mt-0.5 text-xs text-[var(--color-muted)]">
        Everything lives on this device. Export or merge a portable copy any time.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn" onClick={download}>
          ⬇ Export vault (JSON)
        </button>
        <label className="btn cursor-pointer">
          ⬆ Import / merge vault
          <input type="file" accept="application/json,.json" hidden onChange={(e) => onImport(e.target.files?.[0])} />
        </label>
      </div>
      {msg && <p className="mt-2 text-xs text-[var(--color-accent-2)]">{msg}</p>}
      <div className="mt-3">
        <ReviewReminderToggle />
      </div>
    </section>
  );
}

function BrainImportSection() {
  const { importBrain } = useStore();
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const brain = importBrain(await file.text());
      setMsg(brain ? `Imported “${brain.name}”.` : "Invalid brain pack JSON.");
      if (brain) router.push(`/brain/${brain.id}`);
    } catch {
      setMsg("Could not read file.");
    }
  };

  return (
    <section className="card-surface mt-5 rounded-2xl p-4">
      <h2 className="text-sm font-semibold">Import a brain</h2>
      <p className="mt-0.5 text-xs text-[var(--color-muted)]">
        Import a per-brain JSON export as a new workspace (IDs are remapped).
      </p>
      <label className="btn mt-3 cursor-pointer">
        ⬆ Import brain JSON
        <input type="file" accept="application/json,.json" hidden onChange={(e) => onImport(e.target.files?.[0])} />
      </label>
      {msg && <p className="mt-2 text-xs text-[var(--color-accent-2)]">{msg}</p>}
    </section>
  );
}
