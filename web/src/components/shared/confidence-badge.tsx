import { cn, formatConfidence } from "@/lib/utils";

function confidenceColor(confidence: number): string {
  if (confidence >= 0.75) return "bg-success-tint text-success";
  if (confidence >= 0.5) return "bg-warning-tint text-warning";
  return "bg-destructive-tint text-destructive";
}

export function ConfidenceBadge({ confidence }: { confidence: number }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-chip px-2.5 py-0.5 text-xs font-medium",
        confidenceColor(confidence)
      )}
    >
      {formatConfidence(confidence)}
    </span>
  );
}
