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
  if(data?.active)redirect("/operations");
  const {data:membership,error:membershipError}=await admin.from("tenant_memberships").select("tenants(status)").eq("profile_id",user.id).eq("active",true).limit(1).maybeSingle();
  if(membershipError)throw membershipError;
  const tenant=membership&&(Array.isArray(membership.tenants)?membership.tenants[0]:membership.tenants);
  redirect(tenant?.status==="active"?"/workspace":tenant?"/onboarding/status":"/onboarding");
}
