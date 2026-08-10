"use client";

import { useActionState } from "react";
import { createLoanProduct, type ProductState } from "@/app/workspace/products/actions";

const initial: ProductState = { ok: false, message: "" };
const categories = [["employed", "Employed"], ["self_employed", "Self-employed"], ["business_owner", "Business owner"], ["pensioner", "Pensioner"], ["student", "Student"], ["unemployed", "Unemployed"]] as const;

export function LoanProductForm() {
  const [state, action, pending] = useActionState(createLoanProduct, initial);
  const field = "mt-2 w-full rounded-xl border border-[#cfdad6] bg-white px-3 py-3 outline-none focus:border-[#16745f] focus:ring-4 focus:ring-[#16745f]/10";
  return <form action={action} className="rounded-2xl bg-white p-6 shadow-sm">
    <h2 className="text-xl font-semibold">Create loan product</h2>
    <p className="mt-2 text-sm text-[#64746f]">Your organisation controls every term and credit decision.</p>
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      <label className="text-sm">Product code<input name="code" required placeholder="salary-loan" className={field}/></label>
      <label className="text-sm">Product name<input name="name" required className={field}/></label>
      <label className="text-sm sm:col-span-2">Plain-language description<textarea name="description" required minLength={10} className={`${field} min-h-24`}/></label>
      <label className="text-sm">Minimum amount (ZMW)<input name="minAmount" required inputMode="decimal" className={field}/></label>
      <label className="text-sm">Maximum amount (ZMW)<input name="maxAmount" required inputMode="decimal" className={field}/></label>
      <label className="text-sm">Minimum term (months)<input name="minTerm" type="number" min="1" max="120" required className={field}/></label>
      <label className="text-sm">Maximum term (months)<input name="maxTerm" type="number" min="1" max="120" required className={field}/></label>
      <label className="text-sm">Annual simple interest (%)<input name="annualInterest" type="number" min="0" max="100" step="0.01" required className={field}/></label>
      <label className="text-sm">Application fee (ZMW)<input name="applicationFee" defaultValue="0" required inputMode="decimal" className={field}/></label>
      <label className="text-sm">Required payslip months<input name="payslipMonths" type="number" min="0" max="12" defaultValue="3" required className={field}/></label>
      <label className="text-sm">Required statement months<input name="statementMonths" type="number" min="0" max="12" defaultValue="3" required className={field}/></label>
    </div>
    <fieldset className="mt-5"><legend className="text-sm font-medium">Eligible applicant categories</legend><div className="mt-3 grid gap-2 sm:grid-cols-2">{categories.map(([value,label])=><label key={value} className="flex items-center gap-3 rounded-xl border p-3 text-sm"><input type="checkbox" name="applicantCategories" value={value} defaultChecked={value==="employed"}/>{label}</label>)}</div></fieldset>
    <label className="mt-5 flex items-start gap-3 rounded-xl bg-[#eef6f3] p-4 text-sm"><input type="checkbox" name="published" className="mt-1"/>Publish immediately to your borrower page</label>
    <button disabled={pending} className="mt-5 w-full rounded-xl bg-[#123f35] px-5 py-3 font-semibold text-white disabled:opacity-60">{pending ? "Saving..." : "Create product"}</button>
    {state.message && <p role="status" className={`mt-4 rounded-xl p-3 text-sm ${state.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>{state.message}</p>}
  </form>;
}
