import { requireTenantWorkspace } from "@/lib/tenant-auth";
import { createAdminClient } from "@/lib/supabase/admin";
export default async function Borrowers() {
  const { tenantId } = await requireTenantWorkspace();
  const { data, error } = await createAdminClient()
    .from("borrowers")
    .select(
      "id,first_name,last_name,phone_e164,created_at,loan_applications(id,status)",
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (
    <main className="p-6 lg:p-10">
      <p className="text-sm font-semibold text-[#16745f]">CUSTOMERS</p>
      <h1 className="mt-2 text-3xl font-semibold">Borrowers</h1>
      <section className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm">
        {!data.length ? (
          <p className="p-10 text-center text-sm text-[#64746f]">
            Borrowers appear after they deliberately start an application with
            your organisation.
          </p>
        ) : (
          <div className="divide-y">
            {data.map((x) => (
              <article
                key={x.id}
                className="grid gap-2 p-5 text-sm md:grid-cols-[1fr_180px_140px]"
              >
                <p className="font-medium">
                  {x.first_name} {x.last_name}
                </p>
                <span>{x.phone_e164}</span>
                <span>
                  {x.loan_applications.length} application
                  {x.loan_applications.length === 1 ? "" : "s"}
                </span>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
