import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type PipelineStep = {
  id: string;
  label: string;
  description: string;
  status: "pending" | "running" | "done" | "error";
};

const PIPELINE_STEPS: Omit<PipelineStep, "status">[] = [
  { id: "vision", label: "Vision Analysis", description: "Detecting visible components and abnormalities" },
  { id: "investigation", label: "Investigation", description: "Generating possible causes" },
  { id: "questions", label: "Guided Questions", description: "Collecting technician observations" },
  { id: "knowledge", label: "Knowledge Retrieval", description: "Searching technical knowledge base" },
  { id: "reasoning", label: "Root Cause Reasoning", description: "Evaluating evidence" },
  { id: "repair", label: "Repair Plan", description: "Generating step-by-step repair instructions" },
  { id: "report", label: "Report", description: "Assembling inspection report" },
];

export function PipelineTracker({ steps }: { steps: PipelineStep[] }) {
  const stepMap = new Map(steps.map((s) => [s.id, s]));

  return (
    <div className="space-y-3">
      {PIPELINE_STEPS.map((def, i) => {
        const step = stepMap.get(def.id) ?? { ...def, status: "pending" as const };
        return (
          <div key={def.id} className="flex items-start gap-3">
            <div className="mt-0.5 flex-shrink-0">
              {step.status === "done" && <CheckCircle2 className="h-4 w-4 text-success" />}
              {step.status === "running" && <Loader2 className="h-4 w-4 text-primary animate-spin" />}
              {step.status === "pending" && <Circle className="h-4 w-4 text-border" />}
              {step.status === "error" && <Circle className="h-4 w-4 text-destructive" />}
            </div>
            <div className="min-w-0">
              <p className={cn(
                "text-sm font-medium",
                step.status === "done" && "text-text-primary",
                step.status === "running" && "text-primary",
                step.status === "pending" && "text-text-secondary",
                step.status === "error" && "text-destructive",
              )}>
                {String(i + 1).padStart(2, "0")}  {def.label}
              </p>
              <p className="text-xs text-text-secondary mt-0.5">{def.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
