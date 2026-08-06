import Link from "next/link";

export default function Home() {
  return <main className="min-h-screen bg-[#f6f8f7] text-[#102a24]">
    <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6"><span className="text-lg font-semibold">Lender Operations</span><Link className="rounded-full border border-[#c7d8d2] px-5 py-2 text-sm" href="/auth/sign-in">Sign in</Link></nav>
    <section className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
      <div><p className="mb-5 text-sm font-semibold uppercase tracking-[.2em] text-[#16745f]">Built for verified Zambian lenders</p><h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl">Run lending operations with clarity and control.</h1><p className="mt-7 max-w-2xl text-lg leading-8 text-[#526a63]">Secure software for compliance, subscriptions and lender-managed loan operations. EZER-X does not lend, approve loans, disburse funds or collect borrower repayments.</p><div className="mt-9 flex flex-wrap gap-3"><Link href="/onboarding" className="rounded-full bg-[#123f35] px-6 py-3 font-medium text-white">Create lender account</Link><Link href="/status" className="rounded-full bg-white px-6 py-3 font-medium shadow-sm">Check application status</Link></div></div>
      <aside className="rounded-[2rem] bg-[#123f35] p-8 text-white shadow-2xl shadow-[#123f35]/15"><p className="text-sm text-[#a9d4c8]">Activation requirements</p><ol className="mt-7 space-y-5">{["Verified business and lender authority","Current licence reviewed by compliance","Active monthly or annual subscription","Tenant account in good standing"].map((item,i)=><li className="flex gap-4" key={item}><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm">{i+1}</span><span>{item}</span></li>)}</ol></aside>
    </section>
  </main>;
}
