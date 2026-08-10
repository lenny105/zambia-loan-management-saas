import Image from "next/image";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const requested = (await searchParams).next;
  const nextPath =
    requested && !requested.startsWith("//") && (requested.startsWith("/borrow/") || requested.startsWith("/invite/"))
      ? requested
      : undefined;
  const borrower = Boolean(nextPath?.startsWith("/borrow/"));

  return (
    <main className="min-h-screen bg-[#eef3ef] p-3 text-[#102a24] sm:p-5">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1500px] overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-[#103f35]/10 sm:min-h-[calc(100vh-2.5rem)] lg:grid-cols-[1.08fr_.92fr]">
        <section className="relative hidden min-h-[720px] overflow-hidden lg:block">
          <Image src="/images/zamloan-client-review.png" alt="A lending professional meeting with a client" fill priority className="object-cover" sizes="55vw" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#092b24] via-[#0b3128]/35 to-transparent" />
          <Link href="/" className="absolute left-10 top-9 flex items-center gap-3 text-white">
            <span className="grid size-11 place-items-center rounded-xl bg-white/15 font-bold backdrop-blur">ZL</span>
            <span><strong className="block text-lg">ZamLoan</strong><span className="text-[10px] uppercase tracking-[.2em] text-white/70">by EZER-X</span></span>
          </Link>
          <div className="absolute inset-x-0 bottom-0 p-10 text-white xl:p-14">
            <p className="text-xs font-bold uppercase tracking-[.2em] text-[#9ed4c7]">Secure access</p>
            <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">{borrower ? "Continue your application with the lender you selected." : "One secure doorway to your lending workspace."}</h1>
            <p className="mt-5 max-w-xl leading-7 text-white/75">Passwordless email verification and securely separated account records keep access simple and private.</p>
            <div className="mt-8 flex flex-wrap gap-3 text-xs">
              <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur">Private by design</span>
              <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur">Audited access</span>
              <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur">Built for Zambia</span>
            </div>
          </div>
        </section>
        <section className="flex min-h-[700px] flex-col px-6 py-7 sm:px-10 lg:px-12 xl:px-20">
          <div className="flex items-center justify-between lg:justify-end">
            <Link href="/" className="flex items-center gap-2 font-semibold lg:hidden"><span className="grid size-9 place-items-center rounded-lg bg-[#123f35] text-xs text-white">ZL</span>ZamLoan</Link>
            <Link href="/" className="text-sm font-medium text-[#526a63] hover:text-[#123f35]">← Back to home</Link>
          </div>
          <div className="my-auto py-12">
            <div className="mx-auto max-w-md">
              <p className="text-xs font-bold uppercase tracking-[.2em] text-[#16745f]">{borrower ? "Borrower portal" : "Account access"}</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight">{borrower ? "Continue your application" : "Welcome back"}</h2>
              <p className="mt-3 leading-7 text-[#64746f]">{borrower ? "Verify your email to return securely to the selected lender and product." : "Sign in securely to continue to your account."}</p>
              <AuthForm nextPath={nextPath} />
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <Link href="/borrow" className="rounded-xl border border-[#d7e1dd] p-4 text-sm transition hover:border-[#16745f]"><strong className="block">Looking for a loan?</strong><span className="mt-1 block text-xs text-[#64746f]">Find an active lender</span></Link>
                <Link href="/onboarding" className="rounded-xl border border-[#d7e1dd] p-4 text-sm transition hover:border-[#16745f]"><strong className="block">New lender?</strong><span className="mt-1 block text-xs text-[#64746f]">Create an organisation account</span></Link>
              </div>
            </div>
          </div>
          <p className="text-center text-xs leading-5 text-[#7b8b86]">EZER-X provides software and is not a lender, broker, disburser or borrower repayment collector.</p>
        </section>
      </div>
    </main>
  );
}
