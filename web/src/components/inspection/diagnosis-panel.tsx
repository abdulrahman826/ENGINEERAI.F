import { ConfidenceBadge } from "@/components/shared/confidence-badge";
import type { DiagnosisResult } from "@/lib/types";

interface DiagnosisPanelProps {
  diagnosis: DiagnosisResult;
}

export function DiagnosisPanel({ diagnosis }: DiagnosisPanelProps) {
  return (
    <div className="space-y-4">
      {/* Root cause */}
      <div className="rounded-card border border-border bg-surface p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <h3 className="text-sm font-semibold text-text-primary">Root Cause</h3>
          <ConfidenceBadge confidence={diagnosis.confidence} />
        </div>
        <p className="text-base font-medium text-text-primary mb-2">{diagnosis.root_cause}</p>
        <p className="text-sm text-text-secondary leading-relaxed">{diagnosis.explanation}</p>
      </div>

      {/* Ruled out */}
      {diagnosis.ruled_out.length > 0 && (
        <div className="rounded-card border border-border bg-surface p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Ruled Out</h3>
          <div className="space-y-2">
            {diagnosis.ruled_out.map((ro, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-border flex-shrink-0" />
                <div>
                  <span className="text-sm font-medium text-text-primary">{ro.cause}</span>
                  <span className="text-sm text-text-secondary"> — {ro.reason}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
