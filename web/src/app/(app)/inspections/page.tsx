import Link from "next/link";
import { Plus } from "lucide-react";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TopBar } from "@/components/layout/top-bar";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/utils";
import type { InspectionSummary } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default async function InspectionsPage() {
  const supabase = getSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  let inspections: InspectionSummary[] = [];
  try {
    const res = await fetch(`${API_URL}/inspections`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: "no-store",
    });
    if (res.ok) inspections = await res.json();
  } catch {}

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Inspections"
        subtitle={`${inspections.length} total`}
        actions={
          <Link
            href="/inspections/new"
            className="flex items-center gap-1.5 rounded-button bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-dark transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Inspection
          </Link>
        }
      />

      <div className="p-6 flex-1 overflow-auto">
        <div className="rounded-card border border-border bg-surface overflow-hidden">
          {inspections.length === 0 ? (
            <EmptyState
              title="No inspections"
              description="Start your first AI-guided inspection to see it here."
              action={
                <Link
                  href="/inspections/new"
                  className="inline-flex items-center gap-1.5 rounded-button bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-dark transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  New Inspection
                </Link>
              }
            />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background/50">
                  <th className="px-5 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wide w-8">#</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wide">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wide">Inspection ID</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {inspections.map((insp, i) => (
                  <tr key={insp.id} className="hover:bg-background/60 transition-colors">
                    <td className="px-5 py-3 text-text-secondary text-xs">{i + 1}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={insp.status} />
                    </td>
                    <td className="px-5 py-3 text-text-secondary">{formatDate(insp.created_at)}</td>
                    <td className="px-5 py-3 font-mono text-xs text-text-secondary">{insp.id}</td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/inspections/${insp.id}`}
                        className="text-xs text-primary hover:underline"
                      >
                        Open →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
