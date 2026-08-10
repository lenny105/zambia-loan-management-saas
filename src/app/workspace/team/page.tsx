import { requireTenantWorkspace } from "@/lib/tenant-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { TeamInviteForm } from "@/components/team-invite-form";
export default async function Team() {
  const { tenantId } = await requireTenantWorkspace(),
    a = createAdminClient();
  const [
    { data: members, error },
    { data: roles },
    { data: branches },
    { data: invites },
  ] = await Promise.all([
    a
      .from("tenant_memberships")
      .select(
        "id,active,created_at,profiles(email),tenant_roles(name,code),tenant_member_branches!tenant_member_branches_membership_id_tenant_id_fkey(tenant_branches!tenant_member_branches_branch_id_tenant_id_fkey(name))",
      )
      .eq("tenant_id", tenantId)
      .order("created_at"),
    a
      .from("tenant_roles")
      .select("id,name,code")
      .eq("tenant_id", tenantId)
      .neq("code", "owner")
      .order("name"),
    a
      .from("tenant_branches")
      .select("id,name")
      .eq("tenant_id", tenantId)
      .eq("active", true)
      .order("name"),
    a
      .from("tenant_invitations")
      .select("id,email,status,expires_at,created_at,tenant_roles!tenant_invitations_role_id_tenant_id_fkey(name)")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false }),
  ]);
  if (error) throw error;
  return (
    <main className="p-6 lg:p-10">
      <p className="text-sm font-semibold text-[#16745f]">ACCESS CONTROL</p>
      <h1 className="mt-2 text-3xl font-semibold">Team and roles</h1>
      <p className="mt-2 text-[#64746f]">
        Invite staff with least-privilege roles and optional branch assignments.
      </p>
      <div className="mt-8 grid gap-7 xl:grid-cols-[1fr_400px]">
        <div className="space-y-7">
          <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <h2 className="p-5 font-semibold">Active members</h2>
            {members.map((m) => {
              const profile = Array.isArray(m.profiles)
                  ? m.profiles[0]
                  : m.profiles,
                role = Array.isArray(m.tenant_roles)
                  ? m.tenant_roles[0]
                  : m.tenant_roles;
              return (
                <article
                  key={m.id}
                  className="grid gap-2 border-t p-5 text-sm md:grid-cols-[1fr_180px_120px]"
                >
                  <span>{profile?.email}</span>
                  <span>{role?.name}</span>
                  <span>{m.active ? "Active" : "Disabled"}</span>
                </article>
              );
            })}
          </section>
          <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <h2 className="p-5 font-semibold">Invitations</h2>
            {!invites?.length ? (
              <p className="border-t p-5 text-sm text-[#64746f]">
                No invitations sent.
              </p>
            ) : (
              (invites ?? []).map((i) => (
                <article
                  key={i.id}
                  className="grid gap-2 border-t p-5 text-sm md:grid-cols-[1fr_160px_140px]"
                >
                  <span>{i.email}</span>
                  <span className="capitalize">{i.status}</span>
                  <span>
                    Expires {new Date(i.expires_at).toLocaleDateString("en-ZM")}
                  </span>
                </article>
              ))
            )}
          </section>
        </div>
        <TeamInviteForm roles={roles ?? []} branches={branches ?? []} />
      </div>
    </main>
  );
}
