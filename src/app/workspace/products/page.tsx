import { requireTenantWorkspace } from "@/lib/tenant-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMinorToZmw } from "@/lib/domain/billing";
import { LoanProductForm } from "@/components/loan-product-form";
export default async function Products() {
  const { tenantId } = await requireTenantWorkspace();
  const { data, error } = await createAdminClient()
    .from("loan_products")
    .select(
      "id,code,name,min_amount_minor,max_amount_minor,min_term_months,max_term_months,annual_interest_rate_bps,published,active",
    )
    .eq("tenant_id", tenantId)
    .order("name");
  if (error) throw error;
  return (
    <main className="p-6 lg:p-10">
      <p className="text-sm font-semibold text-[#16745f]">LENDER-OWNED TERMS</p>
      <h1 className="mt-2 text-3xl font-semibold">Loan products</h1>
      <p className="mt-2 text-[#64746f]">
        Your organisation—not EZER-X—sets and approves every product term.
      </p>
      <div className="mt-8 grid gap-7 xl:grid-cols-[minmax(0,1fr)_440px]">
      <section className="grid content-start gap-4 lg:grid-cols-2 xl:grid-cols-1">
        {!data.length ? (
          <div className="rounded-2xl bg-white p-10 text-center text-sm text-[#64746f]">
            No products configured. Use the product builder to publish your first borrower offer.
          </div>
        ) : (
          data.map((x) => (
            <article key={x.id} className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{x.name}</h2>
                  <p className="text-sm text-[#64746f]">{x.code}</p>
                </div>
                <span className="text-sm">
                  {x.published ? "Published" : "Private"}
                </span>
              </div>
              <p className="mt-5">
                {formatMinorToZmw(x.min_amount_minor)} –{" "}
                {formatMinorToZmw(x.max_amount_minor)}
              </p>
              <p className="mt-2 text-sm text-[#64746f]">
                {x.min_term_months}–{x.max_term_months} months ·{" "}
                {(x.annual_interest_rate_bps / 100).toFixed(2)}% annual simple
                interest
              </p>
            </article>
          ))
        )}
      </section>
      <aside><LoanProductForm /></aside>
      </div>
    </main>
  );
}
