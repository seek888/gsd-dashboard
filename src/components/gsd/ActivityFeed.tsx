import { Clock3 } from "lucide-react";
import type { ActivityItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { statusDot, statusLabel } from "./status";

interface ActivityFeedProps {
  activities: ActivityItem[];
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-slate-900/60 p-5 text-sm text-slate-400">
        暂无 SUMMARY 活动记录。
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div key={activity.id} className="rounded-lg border border-white/10 bg-slate-900/60 p-4">
          <div className="flex items-start gap-3">
            <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", statusDot(activity.status))} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>Phase {activity.phaseNumber}</span>
                <span>Plan {activity.planNumber}</span>
                <span>{statusLabel(activity.status)}</span>
              </div>
              <div className="mt-1 text-sm font-medium text-slate-100">{activity.title}</div>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                <Clock3 className="size-3.5" />
                {formatTime(activity.timestamp)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatTime(timestamp: string | null): string {
  if (!timestamp) return "时间未知";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
