"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
const items = [
  ["Overview", "/workspace"],
  ["Applications", "/workspace/applications"],
  ["Borrowers", "/workspace/borrowers"],
  ["Loan products", "/workspace/products"],
  ["Loans", "/workspace/loans"],
  ["Repayments", "/workspace/repayments"],
  ["Complaints", "/workspace/complaints"],
  ["Collateral", "/workspace/collateral"],
  ["Branches", "/workspace/branches"],
  ["Team & roles", "/workspace/team"],
  ["Branding", "/workspace/branding"],
] as const;
export function WorkspaceNav() {
  const path = usePathname(),
    router = useRouter();
  async function out() {
    await createClient().auth.signOut();
    router.replace("/auth/sign-in");
    router.refresh();
  }
  return (
    <>
      <nav className="mt-6 flex gap-2 overflow-x-auto pb-2 lg:block lg:space-y-1">
        {items.map(([name, href]) => {
          const active =
            href === "/workspace" ? path === href : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`block whitespace-nowrap rounded-xl px-3 py-2.5 text-sm ${active ? "bg-white text-[#102f28]" : "text-white/70 hover:bg-white/10 hover:text-white"}`}
            >
              {name}
            </Link>
          );
        })}
      </nav>
      <button
        onClick={out}
        className="mt-4 rounded-xl border border-white/15 px-3 py-2 text-sm text-white/70 lg:w-full lg:text-left"
      >
        Sign out
      </button>
    </>
  );
}
