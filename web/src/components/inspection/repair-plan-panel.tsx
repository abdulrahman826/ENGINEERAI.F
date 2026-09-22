import { AlertTriangle } from "lucide-react";
import type { RepairPlan } from "@/lib/types";

interface RepairPlanPanelProps {
  plan: RepairPlan;
}

export function RepairPlanPanel({ plan }: RepairPlanPanelProps) {
  return (
    <div className="space-y-4">
      {/* Meta */}
      <div className="flex flex-wrap gap-3">
        <div className="rounded-md border border-border bg-surface px-3 py-2 text-sm">
          <span className="text-text-secondary">Est. time: </span>
          <span className="font-medium text-text-primary">{plan.est_minutes} min</span>
        </div>
        {plan.tools.map((t) => (
          <div key={t} className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-secondary">
            {t}
          </div>
        ))}
      </div>

      {/* Safety warnings */}
      {plan.safety_warnings.length > 0 && (
        <div className="rounded-card border-l-4 border-warning bg-warning-tint p-4 space-y-1">
          {plan.safety_warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
              <p className="text-sm text-warning-dark">{w}</p>
            </div>
          ))}
        </div>
      )}

      {/* Steps */}
      <div className="space-y-2">
        {plan.steps.map((step) => (
          <div key={step.step_number} className="rounded-card border border-border bg-surface p-4">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary-tint text-xs font-semibold text-primary">
                {step.step_number}
              </span>
              <div className="flex-1">
                <p className="text-sm text-text-primary">{step.instruction}</p>
                {step.safety_warning && (
                  <p className="mt-1.5 text-xs text-warning-dark bg-warning-tint rounded px-2 py-1">
                    ⚠ {step.safety_warning}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Spare parts */}
      {plan.spare_parts.length > 0 && (
        <div className="rounded-card border border-border bg-surface overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h4 className="text-sm font-medium text-text-primary">Spare Parts</h4>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-background/50">
                <th className="px-5 py-2 text-left text-xs font-medium text-text-secondary">Part</th>
                <th className="px-5 py-2 text-left text-xs font-medium text-text-secondary">Specification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {plan.spare_parts.map((p, i) => (
                <tr key={i}>
                  <td className="px-5 py-2 text-text-primary">{p.part_name}</td>
                  <td className="px-5 py-2 text-text-secondary">{p.spec}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
