import { DashboardOverview } from "@/components/gsd/DashboardOverview";
import { getDashboardStatus } from "@/lib/gsd-bridge";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const { project } = await searchParams;
  const status = await getDashboardStatus(project);

  return <DashboardOverview key={status.activeProject.id} initialStatus={status} />;
}
