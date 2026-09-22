import { apiFetch } from "./client";
import type {
  AnswersPayload,
  CreateInspectionRequest,
  DiagnosisResult,
  Inspection,
  InspectionSummary,
  QuestionSet,
  RepairPlan,
  ReportRequest,
  ReportResponse,
  VisionAnalysisRequest,
  VisionResult,
} from "@/lib/types";

export const createInspection = (body: CreateInspectionRequest) =>
  apiFetch<Inspection>("/inspections", { method: "POST", body: JSON.stringify(body) });

export const listInspections = () =>
  apiFetch<InspectionSummary[]>("/inspections");

export const getInspection = (id: string) =>
  apiFetch<Inspection>(`/inspections/${id}`);

export const runVisionAnalysis = (id: string, body: VisionAnalysisRequest) =>
  apiFetch<VisionResult>(`/inspections/${id}/vision-analysis`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const getQuestions = (id: string) =>
  apiFetch<QuestionSet>(`/inspections/${id}/questions`, { method: "POST" });

export const submitAnswers = (id: string, body: AnswersPayload) =>
  apiFetch<AnswersPayload>(`/inspections/${id}/answers`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const runDiagnosis = (id: string) =>
  apiFetch<DiagnosisResult>(`/inspections/${id}/diagnose`, { method: "POST" });

export const getRepairPlan = (id: string) =>
  apiFetch<RepairPlan>(`/inspections/${id}/repair-plan`, { method: "POST" });

export const generateReport = (id: string, body: ReportRequest) =>
  apiFetch<ReportResponse>(`/inspections/${id}/report`, {
    method: "POST",
    body: JSON.stringify(body),
  });
