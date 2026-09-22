// Mirrors backend/app/models/schemas.py exactly.
// Do not diverge from these field names — the API returns them verbatim.

export type Status = "draft" | "analyzing" | "diagnosed" | "repairing" | "complete";
export type Severity = "low" | "medium" | "high";
export type QuestionType = "multiple_choice" | "free_text";

// ── Reference tables ──────────────────────────────────────────────────────────

export interface Department {
  id: string;
  name: string;
}

export interface Machine {
  id: string;
  department_id: string;
  name: string;
  image_url: string | null;
}

export interface Problem {
  id: string;
  machine_id: string;
  name: string;
  description: string | null;
}

// ── AI module outputs ─────────────────────────────────────────────────────────

export interface VisionResult {
  visible_issues: string[];
  damaged_components: string[];
  severity_estimate: Severity;
  machine_confirmed: boolean;
}

export interface Hypothesis {
  cause: string;
  confidence: number; // 0–1
  reasoning: string;
}

export interface Question {
  text: string;
  question_type: QuestionType;
  options: string[] | null;
}

export interface QuestionSet {
  questions: Question[];
}

export interface AnswerEntry {
  question: string;
  answer: string;
}

export interface AnswersPayload {
  answers: AnswerEntry[];
}

export interface RuledOutHypothesis {
  cause: string;
  reason: string;
}

export interface DiagnosisResult {
  hypotheses: Hypothesis[];
  root_cause: string;
  confidence: number; // 0–1
  explanation: string;
  ruled_out: RuledOutHypothesis[];
  cited_sources: string[];
}

export interface RepairStep {
  step_number: number;
  instruction: string;
  safety_warning: string | null;
}

export interface SparePart {
  part_name: string;
  spec: string;
}

export interface RepairPlan {
  steps: RepairStep[];
  tools: string[];
  est_minutes: number;
  safety_warnings: string[];
  spare_parts: SparePart[];
}

export interface ChecklistItem {
  step: string;
  checked: boolean;
}

// ── Inspection rows ───────────────────────────────────────────────────────────

export interface Inspection {
  id: string;
  user_id: string;
  machine_id_fk: string;
  problem_id_fk: string;
  photo_url: string | null;
  answers: AnswersPayload | null;
  vision_result: VisionResult | null;
  diagnosis: DiagnosisResult | null;
  repair_plan: RepairPlan | null;
  checklist_state: ChecklistItem[] | null;
  pdf_url: string | null;
  status: Status;
  created_at: string;
  updated_at: string;
}

export interface InspectionSummary {
  id: string;
  machine_id_fk: string;
  problem_id_fk: string;
  status: Status;
  created_at: string;
  updated_at: string;
}

// ── Request/response wrappers ─────────────────────────────────────────────────

export interface CreateInspectionRequest {
  machine_id: string;
  problem_id: string;
}

export interface VisionAnalysisRequest {
  photo_url: string;
}

export interface ReportRequest {
  checklist_state: ChecklistItem[];
}

export interface ReportResponse {
  pdf_url: string;
}

export interface ApiError {
  error_code: string;
  message: string;
}
