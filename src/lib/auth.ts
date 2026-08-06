import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function requireUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/auth/sign-in");
  return user;
}

export async function requirePlatformUser() {
  const user = await requireUser();
  const admin = createAdminClient();
  const { data, error } = await admin.from("platform_users").select("id,mfa_required,active").eq("profile_id", user.id).maybeSingle();
  if (error || !data?.active) redirect("/unauthorised");
  const aal = (user.aud && user.user_metadata) ? await (await createClient()).auth.mfa.getAuthenticatorAssuranceLevel() : null;
  if (data.mfa_required && aal?.data?.currentLevel !== "aal2") redirect("/auth/mfa");
  return { user, platformUserId: data.id };
}
