import { notFound, redirect } from "next/navigation";
import { Download } from "lucide-react";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { StatusBadge } from "@/components/shared/status-badge";
import { DiagnosisPanel } from "@/components/inspection/diagnosis-panel";
import { EvidencePanel } from "@/components/inspection/evidence-panel";
import { RepairPlanPanel } from "@/components/inspection/repair-plan-panel";
import { Checklist } from "@/components/inspection/checklist";
import { PipelineTracker, type PipelineStep } from "@/components/shared/pipeline-tracker";
import { formatDate } from "@/lib/utils";
import type { Inspection } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function getInspection(id: string, token: string): Promise<Inspection | null> {
  try {
    const res = await fetch(`${API_URL}/inspections/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error();
    return res.json();
  } catch {
    return null;
  }
}

function buildPipelineSteps(insp: Inspection): PipelineStep[] {
  const hasDiagnosis = !!insp.diagnosis?.root_cause;
  return [
    { id: "vision",        status: insp.vision_result ? "done" : insp.status === "analyzing" ? "running" : "pending" },
    { id: "investigation", status: hasDiagnosis ? "done" : insp.status === "analyzing" ? "running" : "pending" },
    { id: "questions",     status: insp.answers ? "done" : "pending" },
    { id: "knowledge",     status: hasDiagnosis ? "done" : "pending" },
    { id: "reasoning",     status: hasDiagnosis ? "done" : "pending" },
    { id: "repair",        status: insp.repair_plan ? "done" : "pending" },
    { id: "report",        status: insp.pdf_url ? "done" : "pending" },
  ];
}

export default async function InspectionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = getSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const insp = await getInspection(params.id, session.access_token);
  if (!insp) notFound();

  const pipelineSteps = buildPipelineSteps(insp);

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Inspection"
        subtitle={`#${insp.id.slice(0, 8)}  ·  ${formatDate(insp.created_at)}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={insp.status} />
            {insp.pdf_url && (
              <a
                href={insp.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-button border border-border bg-surface px-3 py-2 text-sm font-medium text-text-primary hover:bg-background transition-colors"
              >
                <Download className="h-4 w-4" />
                Report
              </a>
            )}
          </div>
        }
      />

      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-3 h-full">
          {/* Left panel — photo + pipeline + Q&A */}
          <div className="border-r border-border p-6 space-y-6 overflow-y-auto">
            {insp.photo_url && (
              <div>
                <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-3">
                  Photo
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={insp.photo_url}
                  alt="Inspection photo"
                  className="w-full rounded-card border border-border object-cover max-h-56"
                />
              </div>
            )}

            <div>
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-3">
                Inspection Pipeline
              </p>
              <PipelineTracker steps={pipelineSteps} />
            </div>

            {insp.answers && insp.answers.answers.length > 0 && (
              <div>
                <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-3">
                  Technician Answers
                </p>
                <div className="space-y-2">
                  {insp.answers.answers.map((a, i) => (
                    <div key={i} className="rounded-md border border-border bg-surface p-3">
                      <p className="text-xs text-text-secondary mb-1">{a.question}</p>
                      <p className="text-sm text-text-primary font-medium">{a.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Middle panel — diagnosis + evidence */}
          <div className="border-r border-border p-6 space-y-4 overflow-y-auto">
            {insp.diagnosis?.root_cause ? (
              <>
                <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  Diagnosis
                </p>
                <DiagnosisPanel diagnosis={insp.diagnosis} />
                <EvidencePanel citedSources={insp.diagnosis.cited_sources} />
              </>
            ) : (
              <div className="flex items-center justify-center h-32 text-sm text-text-secondary">
                Diagnosis not available yet.
              </div>
            )}
          </div>

          {/* Right panel — repair plan + checklist */}
          <div className="p-6 space-y-4 overflow-y-auto">
            {insp.repair_plan ? (
              <>
                <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  Repair Plan
                </p>
                <RepairPlanPanel plan={insp.repair_plan} />

                {insp.checklist_state && insp.checklist_state.length > 0 && (
                  <div className="rounded-card border border-border bg-surface p-4">
                    <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-3">
                      Checklist
                    </p>
                    <Checklist
                      items={insp.checklist_state}
                      onToggle={() => {}}
                      disabled
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-32 text-sm text-text-secondary">
                Repair plan not available yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
