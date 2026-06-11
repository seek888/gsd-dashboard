import { notFound } from "next/navigation";
import { PhaseDetailView } from "@/components/gsd/PhaseDetailView";
import { getPhaseDetail } from "@/lib/gsd-bridge";

export const dynamic = "force-dynamic";

export default async function PhasePage({
  params,
  searchParams,
}: {
  params: Promise<{ number: string }>;
  searchParams: Promise<{ project?: string }>;
}) {
  const [{ number }, { project }] = await Promise.all([params, searchParams]);
  const phaseNumber = Number(number);

  if (!Number.isInteger(phaseNumber) || phaseNumber < 1) {
    notFound();
  }

  const phase = await getPhaseDetail(phaseNumber, project);
  if (!phase) {
    notFound();
  }

  return <PhaseDetailView key={`${project ?? "default"}-${phase.number}`} initialPhase={phase} projectId={project} />;
}
