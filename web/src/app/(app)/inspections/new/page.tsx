"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useInspectionSession } from "@/hooks/use-inspection-session";
import { TopBar } from "@/components/layout/top-bar";
import { PhotoUpload } from "@/components/inspection/photo-upload";
import { QuestionForm } from "@/components/inspection/question-form";
import { DiagnosisPanel } from "@/components/inspection/diagnosis-panel";
import { EvidencePanel } from "@/components/inspection/evidence-panel";
import { RepairPlanPanel } from "@/components/inspection/repair-plan-panel";
import { Checklist } from "@/components/inspection/checklist";
import { LoadingScreen } from "@/components/shared/loading-screen";
import { ErrorState } from "@/components/shared/error-state";
import { uploadPhoto } from "@/lib/supabase/storage";
import * as api from "@/lib/api/inspections";
import * as machinesApi from "@/lib/api/machines";
import { ApiException } from "@/lib/api/client";
import type { Department, Machine, Problem, AnswerEntry } from "@/lib/types";

type SelectionState = {
  departments: Department[];
  machines: Machine[];
  problems: Problem[];
  departmentId: string | null;
  machineId: string | null;
  problemId: string | null;
};

type WizardStep =
  | "select"
  | "photo"
  | "vision"
  | "questions"
  | "diagnose"
  | "repair"
  | "checklist"
  | "report"
  | "done";

export default function NewInspectionPage() {
  const router = useRouter();
  const { session } = useAuth();
  const { session: insp, update, toggleChecklistItem } = useInspectionSession();
  const [sel, setSel] = useState<SelectionState>({
    departments: [], machines: [], problems: [],
    departmentId: null, machineId: null, problemId: null,
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<WizardStep>("select");

  // Load departments on mount
  useEffect(() => {
    machinesApi.getDepartments()
      .then((depts) => {
        setSel((s) => ({ ...s, departments: depts }));
        if (depts.length === 1) {
          handleDeptSelect(depts[0].id, depts);
        }
      })
      .catch(() => setError("Failed to load departments"));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDeptSelect(deptId: string, _depts?: Department[]) {
    setSel((s) => ({ ...s, departmentId: deptId, machines: [], problems: [], machineId: null, problemId: null }));
    try {
      const machines = await machinesApi.getMachines(deptId);
      setSel((s) => ({ ...s, machines }));
      if (machines.length === 1) {
        await handleMachineSelect(machines[0].id);
      }
    } catch {
      setError("Failed to load machines");
    }
  }

  async function handleMachineSelect(machineId: string) {
    setSel((s) => ({ ...s, machineId, problems: [], problemId: null }));
    try {
      const problems = await machinesApi.getProblems(machineId);
      setSel((s) => ({ ...s, problems }));
    } catch {
      setError("Failed to load problems");
    }
  }

  function handleFileSelected(file: File) {
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleStartInspection() {
    if (!sel.machineId || !sel.problemId) return;
    setLoading(true);
    setError(null);
    try {
      const inspection = await api.createInspection({
        machine_id: sel.machineId,
        problem_id: sel.problemId,
      });
      update({ inspectionId: inspection.id });
      setStep("photo");
    } catch (e) {
      setError(e instanceof ApiException ? e.message : "Failed to create inspection");
    } finally {
      setLoading(false);
    }
  }

  async function handleUploadAndAnalyze() {
    if (!photoFile || !insp.inspectionId || !session) return;
    setLoading(true);
    setError(null);
    setStep("vision");
    try {
      const url = await uploadPhoto(photoFile, session.user.id, insp.inspectionId);
      update({ photoUrl: url });
      const vision = await api.runVisionAnalysis(insp.inspectionId, { photo_url: url });
      if (!vision.machine_confirmed) {
        setError("The AI could not confirm this is an electric motor. Please retake the photo.");
        setStep("photo");
        setLoading(false);
        return;
      }
      update({ visionResult: vision });
      const qs = await api.getQuestions(insp.inspectionId);
      update({ questionSet: qs });
      setStep("questions");
    } catch (e) {
      setError(e instanceof ApiException ? e.message : "Vision analysis failed");
      setStep("photo");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitAnswers(answers: AnswerEntry[]) {
    if (!insp.inspectionId) return;
    setLoading(true);
    setError(null);
    setStep("diagnose");
    try {
      await api.submitAnswers(insp.inspectionId, { answers });
      const diagnosis = await api.runDiagnosis(insp.inspectionId);
      update({ diagnosisResult: diagnosis });
      setStep("repair");
      const repairPlan = await api.getRepairPlan(insp.inspectionId);
      const checklist = repairPlan.steps.map((s) => ({
        step: s.instruction,
        checked: false,
      }));
      update({ repairPlan, checklist });
      setStep("checklist");
    } catch (e) {
      setError(e instanceof ApiException ? e.message : "Diagnosis failed");
      setStep("questions");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateReport() {
    if (!insp.inspectionId) return;
    setLoading(true);
    setError(null);
    setStep("report");
    try {
      await api.generateReport(insp.inspectionId, {
        checklist_state: insp.checklist,
      });
      setStep("done");
      setTimeout(() => router.push(`/inspections/${insp.inspectionId}`), 1000);
    } catch (e) {
      setError(e instanceof ApiException ? e.message : "Report generation failed");
      setStep("checklist");
    } finally {
      setLoading(false);
    }
  }

  const STEP_LABELS: Record<WizardStep, string> = {
    select: "Select Equipment",
    photo: "Upload Photo",
    vision: "Analyzing Photo",
    questions: "Investigation",
    diagnose: "Diagnosing",
    repair: "Building Repair Plan",
    checklist: "Repair Checklist",
    report: "Generating Report",
    done: "Complete",
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="New Inspection"
        subtitle={STEP_LABELS[step]}
        actions={
          <button
            onClick={() => router.push("/inspections")}
            className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Cancel
          </button>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-xl space-y-4">
          {error && (
            <ErrorState
              message={error}
              onRetry={() => setError(null)}
            />
          )}

          {/* Step: Select equipment */}
          {step === "select" && (
            <div className="space-y-4">
              {sel.departments.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">Department</p>
                  <div className="grid gap-2">
                    {sel.departments.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => handleDeptSelect(d.id)}
                        className={`rounded-card border p-4 text-left text-sm font-medium transition-colors ${
                          sel.departmentId === d.id
                            ? "border-primary bg-primary-tint text-primary"
                            : "border-border bg-surface hover:border-primary/50"
                        }`}
                      >
                        {d.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {sel.machines.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">Machine</p>
                  <div className="grid gap-2">
                    {sel.machines.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => handleMachineSelect(m.id)}
                        className={`rounded-card border p-4 text-left text-sm font-medium transition-colors ${
                          sel.machineId === m.id
                            ? "border-primary bg-primary-tint text-primary"
                            : "border-border bg-surface hover:border-primary/50"
                        }`}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {sel.problems.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">Problem</p>
                  <div className="grid gap-2">
                    {sel.problems.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setSel((s) => ({ ...s, problemId: p.id }))}
                        className={`rounded-card border p-4 text-left transition-colors ${
                          sel.problemId === p.id
                            ? "border-primary bg-primary-tint"
                            : "border-border bg-surface hover:border-primary/50"
                        }`}
                      >
                        <p className={`text-sm font-medium ${sel.problemId === p.id ? "text-primary" : "text-text-primary"}`}>
                          {p.name}
                        </p>
                        {p.description && (
                          <p className="text-xs text-text-secondary mt-0.5">{p.description}</p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {sel.machineId && sel.problemId && (
                <button
                  onClick={handleStartInspection}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-button bg-primary py-3 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60 transition-colors"
                >
                  {loading ? "Starting…" : "Start Inspection"}
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </button>
              )}
            </div>
          )}

          {/* Step: Photo */}
          {step === "photo" && (
            <div className="space-y-4">
              <PhotoUpload
                onFileSelected={handleFileSelected}
                preview={photoPreview}
                onRemove={() => { setPhotoFile(null); setPhotoPreview(null); }}
              />
              {photoFile && (
                <button
                  onClick={handleUploadAndAnalyze}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-button bg-primary py-3 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60 transition-colors"
                >
                  Analyze Photo <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          {/* Step: Vision loading */}
          {step === "vision" && (
            <LoadingScreen
              title="Analyzing Inspection"
              description="The AI is examining your photo and identifying possible faults."
              steps={[
                { label: "Uploading photo", done: !!insp.photoUrl, active: !insp.photoUrl },
                { label: "Vision analysis — detecting components and abnormalities", done: !!insp.visionResult, active: !insp.visionResult && !!insp.photoUrl },
                { label: "Generating investigation questions", done: !!insp.questionSet, active: !insp.questionSet && !!insp.visionResult },
              ]}
            />
          )}

          {/* Step: Questions */}
          {step === "questions" && insp.questionSet && (
            <div className="space-y-4">
              {insp.visionResult && (
                <div className="rounded-card border border-border bg-surface p-4">
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">Observed</p>
                  {insp.visionResult.visible_issues.length > 0 && (
                    <ul className="space-y-1">
                      {insp.visionResult.visible_issues.map((issue, i) => (
                        <li key={i} className="text-sm text-text-primary flex items-start gap-2">
                          <span className="text-primary mt-1">·</span>
                          {issue}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <QuestionForm
                questions={insp.questionSet.questions}
                onSubmit={handleSubmitAnswers}
                loading={loading}
              />
            </div>
          )}

          {/* Step: Diagnose/repair loading */}
          {(step === "diagnose" || step === "repair") && (
            <LoadingScreen
              title="Running Diagnosis"
              description="Correlating observations, evidence, and technical knowledge."
              steps={[
                { label: "Investigation — generating hypotheses", done: step === "repair" || !!insp.diagnosisResult, active: step === "diagnose" && !insp.diagnosisResult },
                { label: "Knowledge retrieval — searching technical database", done: step === "repair" || !!insp.diagnosisResult, active: step === "diagnose" },
                { label: "Root cause reasoning — evaluating evidence", done: !!insp.diagnosisResult, active: step === "diagnose" && !insp.diagnosisResult },
                { label: "Repair plan — generating instructions", done: !!insp.repairPlan, active: step === "repair" },
              ]}
            />
          )}

          {/* Step: Checklist */}
          {step === "checklist" && insp.diagnosisResult && insp.repairPlan && (
            <div className="space-y-4">
              <DiagnosisPanel diagnosis={insp.diagnosisResult} />
              <EvidencePanel citedSources={insp.diagnosisResult.cited_sources} />
              <div className="rounded-card border border-border bg-surface p-5">
                <h3 className="text-sm font-semibold text-text-primary mb-4">Repair Checklist</h3>
                <Checklist
                  items={insp.checklist}
                  onToggle={toggleChecklistItem}
                />
              </div>
              <button
                onClick={handleGenerateReport}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-button bg-primary py-3 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60 transition-colors"
              >
                Generate Report <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Step: Report */}
          {step === "report" && (
            <LoadingScreen
              title="Generating Report"
              description="Assembling the inspection report PDF."
            />
          )}

          {/* Step: Done */}
          {step === "done" && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CheckCircle2 className="h-12 w-12 text-success mb-4" />
              <h2 className="text-base font-semibold text-text-primary mb-1">Inspection Complete</h2>
              <p className="text-sm text-text-secondary">Redirecting to your inspection…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
