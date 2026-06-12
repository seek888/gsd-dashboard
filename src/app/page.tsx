import { DashboardOverview } from "@/components/gsd/DashboardOverview";
import { OnboardingWizard } from "@/components/gsd/OnboardingWizard";
import { getConfiguredProjects } from "@/lib/gsd-bridge";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const { project } = await searchParams;
  const projects = await getConfiguredProjects();

  // 如果没有配置任何项目 → 显示引导
  if (projects.length === 0) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <OnboardingWizard
          onComplete={() => {
            // 刷新页面加载新配置
            if (typeof window !== "undefined") {
              window.location.href = "/";
            }
          }}
        />
      </div>
    );
  }

  // 动态导入 getDashboardStatus 以支持 onboarding 后刷新
  const { getDashboardStatus } = await import("@/lib/gsd-bridge");
  const status = await getDashboardStatus(project);

  return <DashboardOverview key={status.activeProject.id} initialStatus={status} />;
}
