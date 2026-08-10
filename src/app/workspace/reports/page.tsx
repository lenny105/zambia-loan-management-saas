import { requireTenantWorkspace } from "@/lib/tenant-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMinorToZmw } from "@/lib/domain/billing";
import { portfolioMetrics } from "@/lib/domain/portfolio";

export default async function Reports() {
  const { tenantId } = await requireTenantWorkspace();
  const admin = createAdminClient();
  const reportDate = new Date();
  const today = reportDate.toISOString().slice(0, 10);
  const thirtyDate = new Date(reportDate);
  thirtyDate.setUTCDate(thirtyDate.getUTCDate() - 30);
  const thirty = thirtyDate.toISOString().slice(0, 10);
  const [loans, instalments, repayments, applications] = await Promise.all([
    admin.from("loans").select("id,status").eq("tenant_id", tenantId),
    admin.from("loan_instalments").select("due_date,principal_minor,interest_minor,fees_minor,paid_minor").eq("tenant_id", tenantId),
    admin.from("loan_repayments").select("amount_minor,reversed_at").eq("tenant_id", tenantId),
    admin.from("loan_applications").select("status").eq("tenant_id", tenantId),
  ]);
  const failed = [loans, instalments, repayments, applications].find((x) => x.error);
  if (failed?.error) throw failed.error;
  const schedule = instalments.data ?? [];
  const metrics = portfolioMetrics(schedule, repayments.data ?? [], today, thirty);
  const cards = [
    ["Gross outstanding", formatMinorToZmw(metrics.outstandingMinor)],
    ["Past due", formatMinorToZmw(metrics.pastDueMinor)],
    ["PAR 30", `${metrics.par30Percent.toFixed(1)}%`],
    ["Repayments received", formatMinorToZmw(metrics.receivedMinor)],
  ];
  const statuses = new Map<string, number>();
  for (const row of applications.data ?? []) statuses.set(row.status, (statuses.get(row.status) ?? 0) + 1);
  return <main className="p-6 lg:p-10">
    <p className="text-sm font-semibold text-[#16745f]">PORTFOLIO ANALYTICS</p>
    <h1 className="mt-2 text-3xl font-semibold">Portfolio reports</h1>
    <p className="mt-2 text-[#64746f]">Live totals from your tenant ledger as at {reportDate.toLocaleDateString("en-ZM")}.</p>
    <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value]) => <div key={label} className="rounded-2xl bg-white p-6 shadow-sm"><p className="text-sm text-[#64746f]">{label}</p><p className="mt-3 text-3xl font-semibold">{value}</p></div>)}</div>
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold">Loan book</h2><dl className="mt-4 space-y-3">{["disbursed", "active", "past_due", "settled"].map((status) => <div className="flex justify-between border-b pb-3" key={status}><dt className="capitalize">{status.replaceAll("_", " ")}</dt><dd>{(loans.data ?? []).filter((row) => row.status === status).length}</dd></div>)}</dl></section>
      <section className="rounded-2xl bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold">Applications</h2>{!statuses.size ? <p className="mt-4 text-sm text-[#64746f]">No applications recorded.</p> : <dl className="mt-4 space-y-3">{[...statuses.entries()].map(([status, count]) => <div className="flex justify-between border-b pb-3" key={status}><dt className="capitalize">{status.replaceAll("_", " ")}</dt><dd>{count}</dd></div>)}</dl>}</section>
    </div>
    <p className="mt-6 text-xs text-[#64746f]">PAR 30 is the share of scheduled outstanding value more than 30 days past its due date. Reversed repayments are excluded.</p>
  </main>;
}
