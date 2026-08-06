import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function ContinueAfterSignIn() {
  const user = await requireUser();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("platform_users")
    .select("active")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (error) throw error;
  redirect(data?.active ? "/operations" : "/onboarding");
}
