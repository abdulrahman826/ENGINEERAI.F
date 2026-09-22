"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface EvidencePanelProps {
  citedSources: string[];
}

export function EvidencePanel({ citedSources }: EvidencePanelProps) {
  const [open, setOpen] = useState(false);

  if (citedSources.length === 0) return null;

  return (
    <div className="rounded-card border border-border bg-surface overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-background/60 transition-colors"
      >
        <span className="text-sm font-medium text-text-primary">
          Evidence ({citedSources.length} source{citedSources.length !== 1 ? "s" : ""})
        </span>
        {open ? (
          <ChevronDown className="h-4 w-4 text-text-secondary" />
        ) : (
          <ChevronRight className="h-4 w-4 text-text-secondary" />
        )}
      </button>
      {open && (
        <div className="border-t border-border px-5 py-3 space-y-2">
          {citedSources.map((source, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-0.5 text-xs text-text-secondary flex-shrink-0">▸</span>
              <div>
                <p className="text-sm text-text-primary">{source.replace(/-/g, " ").replace(".md", "")}</p>
                <p className="text-xs text-text-secondary font-mono">{source}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
