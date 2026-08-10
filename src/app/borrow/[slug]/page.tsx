import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMinorToZmw } from "@/lib/domain/billing";
export default async function Lender({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const slug = (await params).slug;
  const a = createAdminClient();
  const { data: profile, error } = await a
    .from("lender_public_profiles")
    .select(
      "tenant_id,slug,public_name,summary,service_areas,support_email,support_phone,complaints_email,privacy_url,terms_url,primary_colour,accent_colour,tenants(status)",
    )
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (error || !profile) notFound();
  const tenant = Array.isArray(profile.tenants)
    ? profile.tenants[0]
    : profile.tenants;
  if (tenant?.status !== "active") notFound();
  const { data: products, error: productError } = await a
    .from("loan_products")
    .select(
      "id,name,description,min_amount_minor,max_amount_minor,min_term_months,max_term_months,annual_interest_rate_bps,application_fee_minor,applicant_categories",
    )
    .eq("tenant_id", profile.tenant_id)
    .eq("active", true)
    .eq("published", true)
    .order("name");
  if (productError) throw productError;
  return (
    <main className="min-h-screen bg-[#f6f7f2] text-[#102a24]">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl justify-between px-5 py-5">
          <Link href="/borrow">← All active lenders</Link>
          <Link href="/auth/sign-in" className="font-semibold">
            Borrower sign in
          </Link>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-5 py-14">
        <p className="text-xs font-semibold uppercase tracking-[.2em]" style={{color:profile.accent_colour}}>
          Active lender
        </p>
        <h1 className="mt-3 text-4xl font-semibold">{profile.public_name}</h1>
        {profile.summary && (
          <p className="mt-4 max-w-3xl text-lg leading-8 text-[#64746f]">
            {profile.summary}
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-4 text-sm">
          {profile.privacy_url && (
            <a
              href={profile.privacy_url}
              rel="noopener noreferrer"
              target="_blank"
              className="underline"
            >
              Privacy notice
            </a>
          )}
          {profile.terms_url && (
            <a
              href={profile.terms_url}
              rel="noopener noreferrer"
              target="_blank"
              className="underline"
            >
              Terms
            </a>
          )}
          {profile.complaints_email && (
            <a
              href={`mailto:${profile.complaints_email}`}
              className="underline"
            >
              Complaints contact
            </a>
          )}
        </div>
        <h2 className="mt-12 text-2xl font-semibold">
          Available loan products
        </h2>
        {!products?.length ? (
          <p className="mt-5 rounded-2xl bg-white p-8 text-[#64746f]">
            This lender has no products open for online application.
          </p>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {products.map((p) => (
              <article
                key={p.id}
                className="rounded-2xl bg-white p-6 shadow-sm"
              >
                <h3 className="text-xl font-semibold">{p.name}</h3>
                <p className="mt-2 text-sm text-[#64746f]">{p.description}</p>
                <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-[#64746f]">Amount</dt>
                    <dd>
                      {formatMinorToZmw(p.min_amount_minor)} –{" "}
                      {formatMinorToZmw(p.max_amount_minor)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#64746f]">Term</dt>
                    <dd>
                      {p.min_term_months}–{p.max_term_months} months
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#64746f]">Annual simple interest</dt>
                    <dd>{(p.annual_interest_rate_bps / 100).toFixed(2)}%</dd>
                  </div>
                  <div>
                    <dt className="text-[#64746f]">Application fee</dt>
                    <dd>{formatMinorToZmw(p.application_fee_minor)}</dd>
                  </div>
                </dl>
                <Link
                  href={`/borrow/${slug}/apply?product=${p.id}`}
                  className="mt-6 block rounded-xl px-5 py-3 text-center font-semibold text-white"
                  style={{backgroundColor:profile.primary_colour}}
                >
                  Start application
                </Link>
              </article>
            ))}
          </div>
        )}
        <aside className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
          You are applying directly to {profile.public_name}. EZER-X provides
          software only and does not recommend this product or make the credit
          decision.
        </aside>
      </section>
    </main>
  );
}
