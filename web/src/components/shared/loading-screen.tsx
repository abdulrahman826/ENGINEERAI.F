import { Loader2 } from "lucide-react";

interface LoadingScreenProps {
  title: string;
  description?: string;
  steps?: Array<{ label: string; done: boolean; active: boolean }>;
}

export function LoadingScreen({ title, description, steps }: LoadingScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <Loader2 className="h-8 w-8 text-primary animate-spin mb-6" />
      <h2 className="text-base font-semibold text-text-primary mb-1">{title}</h2>
      {description && (
        <p className="text-sm text-text-secondary mb-6 max-w-sm">{description}</p>
      )}
      {steps && (
        <div className="text-left space-y-2 mt-2 w-full max-w-xs">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              {s.done ? (
                <span className="text-success font-medium">✓</span>
              ) : s.active ? (
                <Loader2 className="h-3 w-3 text-primary animate-spin" />
              ) : (
                <span className="text-border">○</span>
              )}
              <span className={s.active ? "text-primary" : s.done ? "text-text-secondary" : "text-border"}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
