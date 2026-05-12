// Idempotently ensures the bootstrap admin user (Abdo123) exists.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_USERNAME = "Abdo123";
const ADMIN_PASSWORD = "123123Aa";
const ADMIN_EMAIL = `${ADMIN_USERNAME.toLowerCase()}@nahdetmisr.local`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if user exists
    const { data: list } = await supabase.auth.admin.listUsers();
    let user = list?.users?.find((u) => u.email === ADMIN_EMAIL);

    if (!user) {
      const { data: created, error } = await supabase.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: { username: ADMIN_USERNAME, display_name: "Admin" },
      });
      if (error) throw error;
      user = created.user!;
    }

    // Ensure admin role
    await supabase.from("user_roles").upsert(
      { user_id: user.id, role: "admin" },
      { onConflict: "user_id,role", ignoreDuplicates: true }
    );

    // Ensure profile exists
    await supabase.from("profiles").upsert(
      { user_id: user.id, username: ADMIN_USERNAME, display_name: "Admin" },
      { onConflict: "user_id", ignoreDuplicates: true }
    );

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ensure-admin error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
