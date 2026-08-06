import type { ReactNode } from "react";
import Link from "next/link";
import { requirePlatformUser } from "@/lib/auth";
import { OperationsNav } from "@/components/operations-nav";
export const dynamic="force-dynamic";
export default async function OperationsLayout({children}:{children:ReactNode}){await requirePlatformUser();return <div className="min-h-screen bg-[#f6f8f7] text-[#102a24] lg:grid lg:grid-cols-[260px_minmax(0,1fr)]"><aside className="bg-[#102f28] px-5 py-5 text-white lg:sticky lg:top-0 lg:h-screen lg:px-6 lg:py-7"><div className="flex items-center justify-between lg:block"><div><p className="text-xs font-semibold uppercase tracking-[.2em] text-[#8fd1bd]">ZamLoan</p><p className="mt-1 text-lg font-semibold">EZER-X Operations</p></div><Link href="/" className="text-xs text-white/60 hover:text-white">Public site</Link></div><OperationsNav/></aside><div className="min-w-0">{children}</div></div>}
