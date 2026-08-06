import { requirePlatformPermission } from "@/lib/auth";
import { formatMinorToZmw } from "@/lib/domain/billing";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function Reconciliation() {
  await requirePlatformPermission("billing.read");
  const admin = createAdminClient();
  const [{ data: collections, error: collectionsError }, { data: events, error: eventsError }] =
    await Promise.all([
      admin
        .from("lenco_collections")
        .select(
          "id,internal_reference,lenco_reference,provider,amount_minor,currency,status,created_at,last_queried_at,tenants(legal_name)",
        )
        .in("status", ["pending", "pay-offline", "failed"])
        .order("created_at", { ascending: false })
        .limit(100),
      admin
        .from("lenco_webhook_events")
        .select("id,reference,processing_error,verification_source,created_at")
        .not("processing_error", "is", null)
        .neq("processing_error", "ignored_event")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

  if (collectionsError) throw collectionsError;
  if (eventsError) throw eventsError;

  return (
    <main className="min-h-screen bg-[#f6f8f7] p-6 text-[#102a24]">
      <div className="mx-auto max-w-6xl">
        <header className="py-8">
          <p className="text-sm font-semibold text-[#16745f]">PLATFORM SUBSCRIPTION BILLING</p>
          <h1 className="mt-2 text-4xl font-semibold">Lenco reconciliation</h1>
          <p className="mt-3 text-[#64746f]">
            Review non-terminal collections and events that failed a verification rule. No borrower
            payments appear here.
          </p>
        </header>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Collections requiring attention</h2>
          {!collections?.length ? (
            <p className="mt-6 rounded-xl border border-dashed p-8 text-center text-sm text-[#64746f]">
              No pending or failed subscription collections.
            </p>
          ) : (
            <div className="mt-5 divide-y">
              {collections.map((row) => {
                const tenant = Array.isArray(row.tenants) ? row.tenants[0] : row.tenants;
                return (
                  <div
                    key={row.id}
                    className="grid gap-2 py-4 text-sm md:grid-cols-[1fr_160px_130px_150px]"
                  >
                    <div>
                      <p className="font-medium">{tenant?.legal_name}</p>
                      <p className="text-xs text-[#64746f]">{row.internal_reference}</p>
                    </div>
                    <span className="capitalize">
                      {row.provider} / {row.status.replaceAll("-", " ")}
                    </span>
                    <span>{formatMinorToZmw(row.amount_minor)}</span>
                    <span className="text-[#64746f]">
                      {row.last_queried_at
                        ? `Checked ${new Date(row.last_queried_at).toLocaleString("en-ZM", {
                            timeZone: "Africa/Lusaka",
                          })}`
                        : "Awaiting first poll"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Verification exceptions</h2>
          {!events?.length ? (
            <p className="mt-6 text-sm text-[#64746f]">No verification exceptions.</p>
          ) : (
            <div className="mt-5 divide-y">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="grid gap-2 py-3 text-sm md:grid-cols-[1fr_200px_160px]"
                >
                  <span>{event.reference}</span>
                  <span className="text-rose-700">
                    {event.processing_error?.replaceAll("_", " ")}
                  </span>
                  <span className="capitalize text-[#64746f]">
                    {event.verification_source.replaceAll("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
