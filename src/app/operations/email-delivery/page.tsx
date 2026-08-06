import { requirePlatformPermission } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function EmailDelivery() {
  await requirePlatformPermission("billing.read");
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("email_outbox")
    .select("id,recipient,subject,message_type,status,attempt_count,last_error,created_at,sent_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;

  return (
    <main className="min-h-screen bg-[#f6f8f7] p-6 text-[#102a24]">
      <div className="mx-auto max-w-6xl">
        <header className="py-8">
          <p className="text-sm font-semibold text-[#16745f]">PLATFORM COMMUNICATIONS</p>
          <h1 className="mt-2 text-4xl font-semibold">Email delivery</h1>
          <p className="mt-3 text-[#64746f]">Resend acceptance and verified delivery outcomes.</p>
        </header>
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          {!data.length ? (
            <p className="p-10 text-center text-sm text-[#64746f]">No email messages have been queued.</p>
          ) : (
            <div className="divide-y">
              {data.map((message) => (
                <article className="grid gap-2 p-5 text-sm md:grid-cols-[1fr_220px_140px_100px]" key={message.id}>
                  <div>
                    <p className="font-medium">{message.subject}</p>
                    <p className="mt-1 text-xs text-[#64746f]">{message.recipient}</p>
                    {message.last_error && <p className="mt-2 text-xs text-rose-700">{message.last_error}</p>}
                  </div>
                  <span className="capitalize text-[#64746f]">{message.message_type.replaceAll("_", " ")}</span>
                  <span className="capitalize">{message.status.replaceAll("_", " ")}</span>
                  <span className="text-[#64746f]">{message.attempt_count} attempt{message.attempt_count === 1 ? "" : "s"}</span>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
