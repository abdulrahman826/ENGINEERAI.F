"use client";

import { useState } from "react";
import type {
  ChecklistItem,
  DiagnosisResult,
  QuestionSet,
  RepairPlan,
  VisionResult,
} from "@/lib/types";

export type WizardStep =
  | "select"
  | "photo"
  | "vision"
  | "questions"
  | "diagnose"
  | "repair"
  | "checklist"
  | "report"
  | "done";

interface InspectionSession {
  inspectionId: string | null;
  photoUrl: string | null;
  visionResult: VisionResult | null;
  questionSet: QuestionSet | null;
  diagnosisResult: DiagnosisResult | null;
  repairPlan: RepairPlan | null;
  checklist: ChecklistItem[];
  step: WizardStep;
}

const INITIAL: InspectionSession = {
  inspectionId: null,
  photoUrl: null,
  visionResult: null,
  questionSet: null,
  diagnosisResult: null,
  repairPlan: null,
  checklist: [],
  step: "select",
};

export function useInspectionSession() {
  const [session, setSession] = useState<InspectionSession>(INITIAL);

  const update = (patch: Partial<InspectionSession>) =>
    setSession((s) => ({ ...s, ...patch }));

  const toggleChecklistItem = (index: number) =>
    setSession((s) => ({
      ...s,
      checklist: s.checklist.map((item, i) =>
        i === index ? { ...item, checked: !item.checked } : item
      ),
    }));

  const reset = () => setSession(INITIAL);

  return { session, update, toggleChecklistItem, reset };
}
