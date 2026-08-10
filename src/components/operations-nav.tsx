"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const items = [
  ["Overview", "/operations"],
  ["Verification queue", "/operations/verifications"],
  ["Plans & pricing", "/operations/plans"],
  ["Subscriptions", "/operations/subscriptions"],
  ["Invoices", "/operations/invoices"],
  ["Lenco payments", "/operations/payments"],
  ["Reconciliation", "/operations/reconciliation"],
  ["Email delivery", "/operations/email-delivery"],
  ["Audit", "/operations/audit"],
  ["Support", "/operations/support"],
] as const;

export function OperationsNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/auth/sign-in");
    router.refresh();
  }

  return (
    <>
      <nav aria-label="Operations navigation" className="mt-6 space-y-1">
        {items.map(([name, href]) => {
          const active = href === "/operations" ? pathname === href : pathname.startsWith(href);
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`block rounded-xl px-3 py-2.5 text-sm transition ${active ? "bg-white text-[#102f28] shadow-sm" : "text-white/70 hover:bg-white/10 hover:text-white"}`}>
              {name}
            </Link>
          );
        })}
      </nav>
      <button type="button" onClick={signOut} className="mt-4 w-full rounded-xl border border-white/15 px-3 py-2 text-left text-sm text-white/70 hover:bg-white/10 hover:text-white">Sign out</button>
    </>
  );
}
