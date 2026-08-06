import { requireUser } from "@/lib/auth";import { MfaEnrolment } from "@/components/mfa-enrolment";
export const dynamic="force-dynamic";export default async function Mfa(){await requireUser();return <main className="grid min-h-screen place-items-center bg-[#f6f8f7] p-6"><MfaEnrolment/></main>}
