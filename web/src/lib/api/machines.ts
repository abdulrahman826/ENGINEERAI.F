import { apiFetch } from "./client";
import type { Department, Machine, Problem } from "@/lib/types";

export const getDepartments = () =>
  apiFetch<Department[]>("/departments");

export const getMachines = (departmentId: string) =>
  apiFetch<Machine[]>(`/departments/${departmentId}/machines`);

export const getProblems = (machineId: string) =>
  apiFetch<Problem[]>(`/machines/${machineId}/problems`);
