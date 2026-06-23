"use client";
import { useState } from "react";
import { encodeSharePack } from "@learn-anything/core";
import { useBrain, useStore } from "@/lib/store";
import { hasFeature } from "@/lib/billing";
import { getAccount } from "@/lib/auth";

export function ShareBrainModal({ brainId, onClose }: { brainId: string; onClose: () => void }) {
  const { brain } = useBrain(brainId);
  const { exportBrainSlice } = useStore();
  const [link, setLink] = useState<string | null>(null);
  const account = getAccount();
  const allowed = hasFeature(account, "share-links");

  const createLink = () => {
    const slice = exportBrainSlice(brainId);
    if (!slice.brain) return;
    const token = encodeSharePack(slice);
    const url = `${window.location.origin}/view?pack=${encodeURIComponent(token)}`;
    setLink(url);
  };

  const copy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="card-surface max-w-md rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold">Share brain</h3>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Read-only link — encoded in the URL, no server storage. {brain?.name}
        </p>
        {!allowed ? (
          <p className="mt-3 text-sm text-amber-600">Upgrade to Pro for share links (demo: set plan in Settings → Account).</p>
        ) : (
          <div className="mt-4 space-y-2">
            <button type="button" className="btn btn-primary w-full" onClick={createLink}>
              Generate link
            </button>
            {link && (
              <>
                <input className="input text-xs" readOnly value={link} />
                <button type="button" className="btn w-full" onClick={copy}>
                  Copy link
                </button>
              </>
            )}
          </div>
        )}
        <button type="button" className="btn mt-4 w-full" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
