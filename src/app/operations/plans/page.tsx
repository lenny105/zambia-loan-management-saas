import { requirePlatformPermission } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMinorToZmw } from "@/lib/domain/billing";
import { PlanForm } from "@/components/plan-form";

export const dynamic = "force-dynamic";

export default async function Plans() {
  await requirePlatformPermission("plans.manage");
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("subscription_plans")
    .select("id,code,name,active,plan_versions(id,version,monthly_price_minor,annual_price_minor,effective_from,publicly_available,grace_days)")
    .order("created_at");
  if (error) throw error;

  return (
    <main className="p-6 text-[#102a24] lg:p-10">
      <div className="mx-auto max-w-6xl">
        <header>
          <p className="text-sm font-semibold text-[#16745f]">OPERATIONS · COMMERCIAL</p>
          <h1 className="mt-2 text-4xl font-semibold">Plans and pricing</h1>
          <p className="mt-3 max-w-3xl text-[#64746f]">Create at least one public plan before approving lenders so they can choose a subscription immediately after compliance approval.</p>
        </header>

        <section className="mt-7 rounded-2xl border border-[#d7e1dd] bg-[#eaf4f0] p-6">
          <h2 className="font-semibold">How lender activation works</h2>
          <ol className="mt-4 grid gap-3 text-sm md:grid-cols-4">
            {["1. Operations accepts licence evidence", "2. Compliance approves the lender", "3. Lender chooses a public plan", "4. Verified payment activates the workspace"].map(step => <li key={step} className="rounded-xl bg-white p-4">{step}</li>)}
          </ol>
        </section>

        <div className="mt-7 grid gap-7 lg:grid-cols-[1fr_420px]">
          <section>
            <h2 className="text-xl font-semibold">Available lender plans</h2>
            <div className="mt-4 space-y-4">
              {!data.length ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8">
                  <p className="font-semibold text-amber-950">No subscription plan exists yet</p>
                  <p className="mt-2 text-sm leading-6 text-amber-900">Use the form beside this message to create the first plan. Approved lenders will then see it automatically on their plan-selection screen.</p>
                </div>
              ) : data.map(plan => {
                const version = plan.plan_versions[0];
                return (
                  <article key={plan.id} className="rounded-2xl bg-white p-6 shadow-sm">
                    <div className="flex justify-between gap-4">
                      <div><h3 className="text-xl font-semibold">{plan.name}</h3><p className="text-sm text-[#64746f]">{plan.code}</p></div>
                      <span className="text-sm">{plan.active ? "Active" : "Inactive"}</span>
                    </div>
                    {version && <div className="mt-5 grid grid-cols-2 gap-4"><div><p className="text-xs text-[#64746f]">Monthly</p><p className="font-medium">{formatMinorToZmw(version.monthly_price_minor)}</p></div><div><p className="text-xs text-[#64746f]">Annual</p><p className="font-medium">{formatMinorToZmw(version.annual_price_minor)}</p></div></div>}
                  </article>
                );
              })}
            </div>
          </section>
          <aside><PlanForm /></aside>
        </div>
      </div>
    </main>
  );
}
