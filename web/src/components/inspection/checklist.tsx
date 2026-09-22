"use client";

import { CheckSquare, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChecklistItem } from "@/lib/types";

interface ChecklistProps {
  items: ChecklistItem[];
  onToggle: (index: number) => void;
  disabled?: boolean;
}

export function Checklist({ items, onToggle, disabled }: ChecklistProps) {
  const done = items.filter((i) => i.checked).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
          <div
            className="h-full bg-success rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs text-text-secondary flex-shrink-0">{done}/{items.length}</span>
      </div>

      {/* Steps */}
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <button
            key={i}
            onClick={() => !disabled && onToggle(i)}
            disabled={disabled}
            className={cn(
              "flex w-full items-start gap-3 rounded-card border px-4 py-3 text-left transition-colors",
              item.checked
                ? "border-success/30 bg-success-tint"
                : "border-border bg-surface hover:bg-background",
              disabled && "pointer-events-none"
            )}
          >
            {item.checked ? (
              <CheckSquare className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
            ) : (
              <Square className="h-5 w-5 text-border flex-shrink-0 mt-0.5" />
            )}
            <span className={cn(
              "text-sm",
              item.checked ? "line-through text-text-secondary" : "text-text-primary"
            )}>
              {item.step}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
