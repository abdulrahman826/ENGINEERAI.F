import Link from "next/link";
import { Plus, ChevronRight } from "lucide-react";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TopBar } from "@/components/layout/top-bar";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatRelativeDate } from "@/lib/utils";
import type { InspectionSummary, Status } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function getServerInspections(token: string): Promise<InspectionSummary[]> {
  try {
    const res = await fetch(`${API_URL}/inspections`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

function countByStatus(inspections: InspectionSummary[]) {
  const counts: Record<Status, number> = {
    draft: 0, analyzing: 0, diagnosed: 0, repairing: 0, complete: 0,
  };
  for (const i of inspections) counts[i.status]++;
  return counts;
}

export default async function DashboardPage() {
  const supabase = getSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const inspections = await getServerInspections(session.access_token);
  const counts = countByStatus(inspections);

  const stats = {
    total: inspections.length,
    active: counts.analyzing + counts.diagnosed + counts.repairing,
    diagnosed: counts.diagnosed,
    complete: counts.complete,
  };

  const recent = inspections.slice(0, 8);

  const STAT_DEFS = [
    { label: "Total Inspections", value: stats.total },
    { label: "Active", value: stats.active },
    { label: "Diagnosed", value: stats.diagnosed },
    { label: "Complete", value: stats.complete },
  ];

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Dashboard"
        subtitle="Field inspection overview"
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

      <div className="p-6 space-y-6 flex-1 overflow-auto">
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4">
          {STAT_DEFS.map(({ label, value }) => (
            <div key={label} className="rounded-card border border-border bg-surface p-4">
              <p className="text-xs text-text-secondary font-medium uppercase tracking-wide mb-1">{label}</p>
              <p className="text-2xl font-semibold text-text-primary">{value}</p>
            </div>
          ))}
        </div>

        {/* Recent inspections */}
        <div className="rounded-card border border-border bg-surface overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-text-primary">Recent Inspections</h2>
            <Link
              href="/inspections"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          {recent.length === 0 ? (
            <EmptyState
              title="No inspections yet"
              description="Start your first AI-guided inspection."
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
                  <th className="px-5 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wide">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wide">ID</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wide"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recent.map((insp) => (
                  <tr key={insp.id} className="hover:bg-background/60 transition-colors">
                    <td className="px-5 py-3">
                      <StatusBadge status={insp.status} />
                    </td>
                    <td className="px-5 py-3 text-text-secondary">
                      {formatRelativeDate(insp.created_at)}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-text-secondary">
                      {insp.id.slice(0, 8)}…
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/inspections/${insp.id}`}
                        className="text-xs text-primary hover:underline"
                      >
                        View →
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
