// Owner/super-admin only: deletes a user. Only owner can delete a super_admin. Owner cannot be deleted.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (p: unknown, status = 200) =>
    new Response(JSON.stringify(p), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(url, serviceKey);
    const { data: myRoles } = await admin.from("user_roles").select("role").eq("user_id", userData.user.id);
    const iAmOwner = (myRoles ?? []).some(r => r.role === "owner");
    const iAmSuper = iAmOwner || (myRoles ?? []).some(r => r.role === "super_admin");
    if (!iAmSuper) return json({ error: "Forbidden" }, 403);

    const { target_user_id } = await req.json();
    if (!target_user_id) return json({ error: "target_user_id required" }, 400);
    if (target_user_id === userData.user.id) return json({ error: "Can't delete yourself" }, 400);

    const { data: targetRoles } = await admin.from("user_roles").select("role").eq("user_id", target_user_id);
    const targetIsOwner = (targetRoles ?? []).some(r => r.role === "owner");
    const targetIsSuper = (targetRoles ?? []).some(r => r.role === "super_admin");
    if (targetIsOwner) return json({ error: "Owner can't be deleted" }, 403);
    if (targetIsSuper && !iAmOwner) return json({ error: "Only Owner can delete a Super Admin" }, 403);

    const { error } = await admin.auth.admin.deleteUser(target_user_id);
    if (error) throw error;
    return json({ ok: true });
  } catch (e) {
    return json({ error: String((e as { message?: string })?.message || e) }, 500);
  }
});
