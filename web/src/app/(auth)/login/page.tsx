"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, ArrowRight, Shield, Activity, FileText } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const FEATURES = [
  { icon: Activity, text: "AI-guided fault diagnosis" },
  { icon: Shield, text: "Step-by-step repair instructions" },
  { icon: FileText, text: "Automated inspection reports" },
];

export default function LoginPage() {
  const { signInAnonymously } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    setLoading(true);
    setError(null);
    try {
      await signInAnonymously();
      router.push("/dashboard");
    } catch (e) {
      setError("Unable to start session. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary shadow-sm">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-text-primary">EngineerAI</h1>
            <p className="text-xs text-text-secondary">Field Service Copilot</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-card border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-text-primary mb-1">
            Start inspecting
          </h2>
          <p className="text-sm text-text-secondary mb-6">
            No account needed. Your session and inspection history are saved automatically.
          </p>

          <ul className="space-y-3 mb-6">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2.5 text-sm text-text-secondary">
                <Icon className="h-4 w-4 text-primary flex-shrink-0" />
                {text}
              </li>
            ))}
          </ul>

          {error && (
            <p className="text-sm text-destructive mb-4 rounded-md bg-destructive-tint px-3 py-2">
              {error}
            </p>
          )}

          <button
            onClick={handleContinue}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-button bg-primary px-4 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-dark disabled:opacity-60"
          >
            {loading ? "Starting session…" : "Continue"}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </button>
        </div>

        <p className="text-xs text-text-secondary text-center mt-4">
          Your data is scoped to this device session.
        </p>
      </div>
    </div>
  );
}
