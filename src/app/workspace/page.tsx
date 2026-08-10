import Link from "next/link";
import { requireTenantWorkspace } from "@/lib/tenant-auth";
import { createAdminClient } from "@/lib/supabase/admin";
export default async function Workspace() {
  const { tenantId } = await requireTenantWorkspace();
  const a = createAdminClient();
  const [applications, borrowers, loans, due] = await Promise.all([
    a
      .from("loan_applications")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .in("status", ["submitted", "under_review"]),
    a
      .from("borrowers")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
    a
      .from("loans")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .in("status", ["disbursed", "active", "past_due"]),
    a
      .from("loan_instalments")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .lte("due_date", new Date().toISOString().slice(0, 10)),
  ]);
  const failed = [applications, borrowers, loans, due].find((x) => x.error);
  if (failed?.error) throw failed.error;
  const cards = [
    [
      "Applications awaiting review",
      applications.count ?? 0,
      "/workspace/applications",
    ],
    ["Borrowers", borrowers.count ?? 0, "/workspace/borrowers"],
    ["Active loans", loans.count ?? 0, "/workspace/loans"],
    ["Instalments due", due.count ?? 0, "/workspace/repayments"],
  ] as const;
  return (
    <main className="p-6 lg:p-10">
      <p className="text-sm font-semibold text-[#16745f]">LENDER WORKSPACE</p>
      <h1 className="mt-2 text-3xl font-semibold">Overview</h1>
      <p className="mt-2 text-[#64746f]">
        Your organisation&apos;s live operational records.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([n, c, h]) => (
          <Link href={h} key={n} className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-[#64746f]">{n}</p>
            <p className="mt-4 text-4xl font-semibold">{c}</p>
            <p className="mt-4 text-xs font-semibold text-[#16745f]">Open →</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
