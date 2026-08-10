import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMinorToZmw } from "@/lib/domain/billing";
export default async function Portal() {
  const user = await requireUser();
  const a = createAdminClient();
  const { data: borrowers, error: bError } = await a
    .from("borrowers")
    .select("id")
    .eq("profile_id", user.id);
  if (bError) throw bError;
  const ids = (borrowers ?? []).map((x) => x.id);
  const { data, error } = ids.length
    ? await a
        .from("loan_applications")
        .select(
          "id,status,requested_amount_minor,created_at,loan_products!applications_product_tenant_fk(name),tenants(legal_name,trading_name)",
        )
        .in("borrower_id", ids)
        .order("created_at", { ascending: false })
    : { data: [], error: null };
  if (error) throw error;
  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <p className="text-sm font-semibold text-[#16745f]">BORROWER PORTAL</p>
      <h1 className="mt-2 text-3xl font-semibold">Your applications</h1>
      <p className="mt-2 text-[#64746f]">
        Each application remains separated within the lender you selected.
      </p>
      <section className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm">
        {!data?.length ? (
          <div className="p-10 text-center">
            <p className="font-medium">No applications yet</p>
            <Link
              href="/borrow"
              className="mt-4 inline-block rounded-xl bg-[#123f35] px-5 py-3 text-white"
            >
              Find an active lender
            </Link>
          </div>
        ) : (
          <div className="divide-y">
            {data.map((x) => {
              const p = Array.isArray(x.loan_products)
                  ? x.loan_products[0]
                  : x.loan_products,
                t = Array.isArray(x.tenants) ? x.tenants[0] : x.tenants;
              return (
                <Link
                  href={`/portal/applications/${x.id}`}
                  key={x.id}
                  className="grid gap-2 p-5 text-sm hover:bg-[#f8faf9] md:grid-cols-[1fr_180px_150px]"
                >
                  <div>
                    <p className="font-medium">{p?.name}</p>
                    <p className="text-xs text-[#64746f]">
                      {t?.trading_name || t?.legal_name}
                    </p>
                  </div>
                  <span>{formatMinorToZmw(x.requested_amount_minor)}</span>
                  <span className="capitalize">
                    {x.status.replaceAll("_", " ")} →
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
