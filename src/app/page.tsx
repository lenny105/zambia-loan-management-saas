import Image from "next/image";
import Link from "next/link";

const features = [
  {
    number: "01",
    title: "Compliance-led onboarding",
    copy: "Bring business details, licensing evidence and declarations into one controlled review process.",
  },
  {
    number: "02",
    title: "Clear portfolio operations",
    copy: "Keep teams aligned around applications, accounts and operational decisions with auditable records.",
  },
  {
    number: "03",
    title: "Built for local realities",
    copy: "ZMW-native billing and support for MTN, Airtel and Zamtel subscription payments through Lenco.",
  },
];

const activationSteps = [
  ["01", "Create your organisation profile", "Tell us about your registered lending business and authorised team."],
  ["02", "Complete compliance review", "Submit current licensing evidence for secure platform verification."],
  ["03", "Choose your subscription", "Select a monthly or annual plan and pay through supported mobile money."],
  ["04", "Start operating", "Invite your team and manage your lender-owned workflows from one workspace."],
];

function ArrowIcon() {
  return (
    <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 20 20">
      <path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 20 20">
      <path d="m5 10 3 3 7-7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

export default function Home() {
  return (
    <main className="overflow-hidden bg-[#f6f7f2] text-[#102a24]">
      <header className="absolute inset-x-0 top-0 z-30">
        <nav className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
          <Link href="/" className="flex items-center gap-3" aria-label="ZamLoan home">
            <span className="grid size-10 place-items-center rounded-xl bg-[#123f35] text-sm font-bold text-white shadow-lg shadow-[#123f35]/15">ZL</span>
            <span>
              <span className="block text-lg font-semibold leading-none tracking-tight">ZamLoan</span>
              <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[.22em] text-[#47675e]">by EZER-X</span>
            </span>
          </Link>
          <div className="hidden items-center gap-8 text-sm font-medium text-[#294b42] md:flex">
            <a href="#platform" className="transition hover:text-[#0f755f]">Platform</a>
            <a href="#how-it-works" className="transition hover:text-[#0f755f]">How it works</a>
            <a href="#trust" className="transition hover:text-[#0f755f]">Trust & compliance</a>
          </div>
          <Link className="rounded-full border border-[#123f35]/20 bg-white/75 px-5 py-2.5 text-sm font-semibold backdrop-blur-md transition hover:bg-white" href="/auth/sign-in">
            Sign in
          </Link>
        </nav>
      </header>

      <section className="relative mx-auto min-h-[820px] max-w-[1600px] lg:min-h-[900px]">
        <Image
          src="/images/zamloan-team-hero.png"
          alt="A Zambian lending team reviewing business performance together"
          fill
          priority
          className="object-cover object-[69%_center]"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(246,247,242,.99)_0%,rgba(246,247,242,.94)_32%,rgba(246,247,242,.38)_58%,rgba(246,247,242,.04)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#f6f7f2] to-transparent" />
        <div className="relative z-10 mx-auto flex min-h-[820px] max-w-[1400px] items-center px-5 pb-20 pt-32 sm:px-8 lg:min-h-[900px] lg:px-12">
          <div className="max-w-[700px]">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#1b715e]/15 bg-white/70 px-4 py-2 text-xs font-bold uppercase tracking-[.17em] text-[#146b57] shadow-sm backdrop-blur-md">
              <span className="size-2 rounded-full bg-[#e7a63a]" />
              Built for verified Zambian lenders
            </div>
            <h1 className="text-[3.3rem] font-semibold leading-[.97] tracking-[-.055em] text-[#0d3028] sm:text-7xl lg:text-[5.6rem]">
              Lending operations,<br />with <span className="text-[#16806a]">clarity.</span>
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-8 text-[#48645c] sm:text-xl">
              A secure operating platform that helps licensed lenders organise compliance, teams and customer workflows in one trusted workspace.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link href="/onboarding" className="inline-flex items-center justify-center gap-3 rounded-full bg-[#123f35] px-7 py-4 font-semibold text-white shadow-xl shadow-[#123f35]/20 transition hover:-translate-y-0.5 hover:bg-[#0d332b]">
                Create lender account <ArrowIcon />
              </Link>
              <Link href="/onboarding/status" className="inline-flex items-center justify-center rounded-full border border-[#123f35]/15 bg-white/80 px-7 py-4 font-semibold text-[#123f35] backdrop-blur transition hover:bg-white">
                Check application status
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-[#47675e]">
              {["Secure by design", "ZMW-native", "Locally relevant"].map((item) => (
                <span key={item} className="flex items-center gap-2"><span className="grid size-5 place-items-center rounded-full bg-[#dcebe5] text-[#16745f]"><CheckIcon /></span>{item}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="platform" className="relative z-10 mx-auto max-w-[1400px] px-5 pb-28 sm:px-8 lg:px-12">
        <div className="grid overflow-hidden rounded-[2rem] bg-[#103f35] text-white shadow-2xl shadow-[#103f35]/15 lg:grid-cols-[.82fr_1.18fr]">
          <div className="flex flex-col justify-between p-8 sm:p-12 lg:p-16">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.2em] text-[#91c8ba]">One operational foundation</p>
              <h2 className="mt-5 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Built around responsible lending teams.</h2>
              <p className="mt-6 max-w-lg leading-7 text-[#bdd8d1]">Give your people a consistent way to work while preserving the lender&apos;s authority over every credit decision and customer relationship.</p>
            </div>
            <div className="mt-10 flex items-center gap-3 text-sm text-[#dcece8]"><span className="h-px w-10 bg-[#e8ac49]" />Purpose-built for Zambia</div>
          </div>
          <div className="relative min-h-[420px] lg:min-h-[600px]">
            <Image src="/images/zamloan-business-owner.png" alt="A Zambian business owner using mobile and laptop tools" fill className="object-cover" sizes="(min-width: 1024px) 58vw, 100vw" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#103f35]/25 to-transparent lg:from-[#103f35]/45" />
            <div className="absolute bottom-6 left-6 rounded-2xl border border-white/20 bg-white/90 p-5 text-[#123f35] shadow-xl backdrop-blur sm:bottom-10 sm:left-10">
              <p className="text-xs font-bold uppercase tracking-[.16em] text-[#16745f]">Designed to simplify</p>
              <p className="mt-2 max-w-[260px] font-semibold">Less operational noise. More time for the work that matters.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 lg:px-12">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#16745f]">A clearer way to operate</p>
          <h2 className="mt-5 text-4xl font-semibold leading-tight tracking-[-.035em] sm:text-6xl">Confidence at every stage.</h2>
        </div>
        <div className="mt-14 grid gap-px overflow-hidden rounded-[2rem] border border-[#d9e2dd] bg-[#d9e2dd] lg:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.number} className="bg-[#fbfcf9] p-8 sm:p-10">
              <span className="text-sm font-bold text-[#d1922d]">{feature.number}</span>
              <h3 className="mt-12 text-2xl font-semibold tracking-tight">{feature.title}</h3>
              <p className="mt-4 leading-7 text-[#5b6f69]">{feature.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="trust" className="mx-auto grid max-w-[1400px] gap-12 px-5 py-28 sm:px-8 lg:grid-cols-2 lg:items-center lg:px-12">
        <div className="relative min-h-[520px] overflow-hidden rounded-[2rem] sm:min-h-[650px]">
          <Image src="/images/zamloan-client-review.png" alt="A lender meeting with a client in a professional office" fill className="object-cover object-center" sizes="(min-width: 1024px) 50vw, 100vw" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0d3028]/90 to-transparent p-8 pt-32 text-white sm:p-10 sm:pt-40">
            <p className="max-w-md text-2xl font-medium leading-snug">Technology should support responsible decisions, not make them for you.</p>
          </div>
        </div>
        <div className="lg:pl-12">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#16745f]">Trust by design</p>
          <h2 className="mt-5 text-4xl font-semibold leading-tight tracking-[-.035em] sm:text-6xl">Your lending authority stays yours.</h2>
          <p className="mt-7 text-lg leading-8 text-[#566d66]">ZamLoan provides secure operations software. EZER-X does not lend, set interest rates, approve borrowers, disburse loans, control collateral or collect borrower repayments.</p>
          <div className="mt-10 space-y-5">
            {["Tenant-separated data and role-based access", "Traceable compliance and operational activity", "Private evidence and billing document storage"].map((item) => (
              <div key={item} className="flex items-center gap-4 border-b border-[#dce4df] pb-5 font-medium"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#dcebe5] text-[#16745f]"><CheckIcon /></span>{item}</div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-[#e9eee9] py-28">
        <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12">
          <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.2em] text-[#16745f]">Getting started</p>
              <h2 className="mt-5 max-w-md text-4xl font-semibold leading-tight tracking-[-.035em] sm:text-6xl">From application to active workspace.</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {activationSteps.map(([number, title, copy]) => (
                <article key={number} className="rounded-2xl bg-white p-7 shadow-sm">
                  <span className="text-sm font-bold text-[#d1922d]">{number}</span>
                  <h3 className="mt-8 text-xl font-semibold">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#60736d]">{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 py-28 sm:px-8 lg:px-12">
        <div className="relative overflow-hidden rounded-[2rem] bg-[#103f35] px-7 py-16 text-white sm:px-12 lg:px-16 lg:py-24">
          <Image src="/images/zamloan-lender-team.png" alt="Two lending professionals collaborating on a laptop" fill className="object-cover object-[72%_center] opacity-55" sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b3128] via-[#0b3128]/90 to-[#0b3128]/15" />
          <div className="relative max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[.2em] text-[#9fd0c4]">Ready when you are</p>
            <h2 className="mt-5 text-4xl font-semibold leading-tight tracking-[-.035em] sm:text-6xl">Give your lending team room to grow.</h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[#c7ddd7]">Start with a verified organisation profile and build a more organised, accountable operation.</p>
            <Link href="/onboarding" className="mt-9 inline-flex items-center gap-3 rounded-full bg-[#f3b451] px-7 py-4 font-semibold text-[#193d34] transition hover:-translate-y-0.5 hover:bg-[#ffc469]">Create lender account <ArrowIcon /></Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#dce3de] bg-[#f6f7f2]">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-8 px-5 py-10 sm:px-8 md:flex-row md:items-end md:justify-between lg:px-12">
          <div>
            <p className="text-xl font-semibold">ZamLoan <span className="text-sm font-normal text-[#6a7b76]">by EZER-X</span></p>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#6a7b76]">Operations software for verified Zambian lenders. EZER-X is a technology provider and not a lender.</p>
          </div>
          <div className="flex gap-6 text-sm font-medium"><Link href="/auth/sign-in">Sign in</Link><Link href="/onboarding">Apply</Link></div>
        </div>
      </footer>
    </main>
  );
}
