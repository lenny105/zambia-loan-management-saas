import { requireTenantWorkspace } from "@/lib/tenant-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ComplaintResolution } from "@/components/complaint-resolution";
export default async function Complaints() {
  const { tenantId } = await requireTenantWorkspace();
  const { data, error } = await createAdminClient()
    .from("borrower_complaints")
    .select(
      "id,subject,description,status,resolution,created_at,borrowers!complaints_borrower_tenant_fk(first_name,last_name)",
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (
    <main className="p-6 lg:p-10">
      <p className="text-sm font-semibold text-[#16745f]">CUSTOMER REDRESS</p>
      <h1 className="mt-2 text-3xl font-semibold">Complaints</h1>
      <section className="mt-8 space-y-4">
        {!data.length ? (
          <p className="rounded-2xl bg-white p-10 text-center text-sm text-[#64746f]">
            No borrower complaints.
          </p>
        ) : (
          data.map((x) => {
            const b = Array.isArray(x.borrowers) ? x.borrowers[0] : x.borrowers;
            return (
              <article
                key={x.id}
                className="rounded-2xl bg-white p-6 shadow-sm"
              >
                <div className="flex justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{x.subject}</h2>
                    <p className="mt-1 text-xs text-[#64746f]">
                      {b?.first_name} {b?.last_name}
                    </p>
                  </div>
                  <span className="text-sm capitalize">{x.status}</span>
                </div>
                <p className="mt-4 text-sm leading-6">{x.description}</p>
                {x.resolution && (
                  <p className="mt-3 rounded-lg bg-[#f2f6f4] p-3 text-sm">
                    {x.resolution}
                  </p>
                )}
                <ComplaintResolution id={x.id} />
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}
