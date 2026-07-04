// Owner/super-admin only: creates a user with username + password.
// Only owner can create a super_admin.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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
    const roles = (myRoles ?? []).map(r => r.role as string);
    const iAmOwner = roles.includes("owner");
    const iAmSuper = iAmOwner || roles.includes("super_admin");
    if (!iAmSuper) return json({ error: "Forbidden: super admin only" }, 403);

    const body = await req.json();
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    const displayName = String(body.display_name || username).trim();
    const requestedRole = String(body.role || "viewer").trim() as "viewer" | "admin" | "manager" | "super_admin" | "owner";

    if (!username || !password) return json({ error: "username & password required" }, 400);
    if (password.length < 6) return json({ error: "Password must be at least 6 chars" }, 400);
    if (requestedRole === "owner") {
      return json({ error: "Owner role cannot be created from here" }, 403);
    }
    if (requestedRole === "super_admin" && !iAmOwner) {
      return json({ error: "Only Owner can create Super Admin users" }, 403);
    }

    const email = `${username.toLowerCase()}@nahdetmisr.local`;

    const { data: created, error } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { username, display_name: displayName },
    });
    if (error) throw error;

    await admin.from("user_roles").upsert(
      { user_id: created.user!.id, role: requestedRole },
      { onConflict: "user_id,role", ignoreDuplicates: true }
    );

    return json({ ok: true, user_id: created.user!.id });
  } catch (e) {
    console.error("admin-create-user error:", e);
    return json({ error: String((e as { message?: string })?.message || e) }, 500);
  }

  function json(payload: unknown, status = 200) {
    return new Response(JSON.stringify(payload), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
