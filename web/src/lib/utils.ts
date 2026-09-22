import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Status, Severity } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDate(iso);
}

export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

export const STATUS_LABELS: Record<Status, string> = {
  draft: "Draft",
  analyzing: "Analyzing",
  diagnosed: "Diagnosed",
  repairing: "Repairing",
  complete: "Complete",
};

export const STATUS_COLORS: Record<Status, string> = {
  draft: "bg-border/50 text-text-secondary",
  analyzing: "bg-primary-tint text-primary",
  diagnosed: "bg-primary-tint text-primary",
  repairing: "bg-warning-tint text-warning",
  complete: "bg-success-tint text-success",
};

export const SEVERITY_COLORS: Record<Severity, string> = {
  low: "bg-success-tint text-success",
  medium: "bg-warning-tint text-warning",
  high: "bg-destructive-tint text-destructive",
};
