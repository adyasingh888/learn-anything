import { BrainView } from "@/components/brain/BrainView";

export default async function BrainPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BrainView brainId={id} />;
}
