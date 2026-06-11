import { ArrowRight } from "lucide-react";
import type { WaveGroup } from "@/lib/types";
import { cn } from "@/lib/utils";
import { statusDot } from "./status";

interface WaveDiagramProps {
  waves: WaveGroup[];
}

export function WaveDiagram({ waves }: WaveDiagramProps) {
  if (waves.length === 0) {
    return <div className="rounded-lg border border-white/10 bg-slate-900/60 p-5 text-sm text-slate-400">暂无 Wave 数据。</div>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-white/10 bg-slate-900/60 p-4">
      <div className="flex min-w-max items-stretch gap-3">
        {waves.map((wave, index) => (
          <div key={wave.wave} className="flex items-center gap-3">
            <section className="min-w-56 rounded-lg border border-white/10 bg-slate-950/70 p-3">
              <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Wave {wave.wave}</div>
              <div className="mt-3 space-y-2">
                {wave.plans.map((plan) => (
                  <div key={plan.id} className="flex items-center gap-2 rounded-md border border-white/10 bg-slate-900 px-3 py-2">
                    <span className={cn("size-2 rounded-full", statusDot(plan.status))} />
                    <span className="font-mono text-xs text-slate-500">P{plan.number}</span>
                    <span className="max-w-36 truncate text-sm text-slate-200">{plan.title}</span>
                  </div>
                ))}
              </div>
            </section>
            {index < waves.length - 1 ? <ArrowRight className="size-5 shrink-0 text-slate-600" /> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
