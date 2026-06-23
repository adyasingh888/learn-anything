import { Suspense } from "react";
import { BrainView } from "@/components/brain/BrainView";

export default async function BrainPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<div className="p-8 text-center text-[var(--color-muted)]">Loading…</div>}>
      <BrainView brainId={id} />
    </Suspense>
  );
}
