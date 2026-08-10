"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/logger";
export type ComplaintState = { ok: boolean; message: string };
export async function submitComplaint(
  _: ComplaintState,
  form: FormData,
): Promise<ComplaintState> {
  const p = z
    .object({
      borrowerId: z.uuid(),
      subject: z.string().trim().min(5).max(150),
      description: z.string().trim().min(10).max(3000),
    })
    .safeParse(Object.fromEntries(form));
  if (!p.success)
    return { ok: false, message: "Enter a clear subject and description." };
  const { error } = await (
    await createClient()
  ).rpc("submit_borrower_complaint", {
    p_borrower_id: p.data.borrowerId,
    p_subject: p.data.subject,
    p_description: p.data.description,
  });
  if (error)
    return {
      ok: false,
      message: `Complaint could not be submitted. Reference: ${logError("complaint.submit", error)}`,
    };
  revalidatePath("/portal/complaints");
  return { ok: true, message: "Complaint submitted to the lender." };
}
