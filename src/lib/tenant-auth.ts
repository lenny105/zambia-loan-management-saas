import "server-only";
import {redirect} from "next/navigation";
import {requireUser} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
export async function requireTenantWorkspace(){const user=await requireUser();const admin=createAdminClient();const{data,error}=await admin.from("tenant_memberships").select("tenant_id,role_id,tenants(id,legal_name,trading_name,status),tenant_roles(code)").eq("profile_id",user.id).eq("active",true).limit(1).maybeSingle();if(error)throw error;if(!data)redirect("/onboarding");const tenant=Array.isArray(data.tenants)?data.tenants[0]:data.tenants;if(!tenant)redirect("/onboarding");if(tenant.status!=="active")redirect("/onboarding/status");return{user,tenantId:data.tenant_id,tenant,role:Array.isArray(data.tenant_roles)?data.tenant_roles[0]:data.tenant_roles}}
