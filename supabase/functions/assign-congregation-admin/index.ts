import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.10.0";

serve(async (req) => {
  const { profile_id, congregation_id } = await req.json();

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
  );

  // Check if the user is a super_admin
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      headers: { "Content-Type": "application/json" },
      status: 401,
    });
  }

  const { data: roleData, error: roleError } = await supabaseClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "super_admin")
    .single();

  if (roleError || !roleData) {
    return new Response(JSON.stringify({ error: "Forbidden: Not a super admin" }), {
      headers: { "Content-Type": "application/json" },
      status: 403,
    });
  }

  // Get the user_id from the profile_id
  const { data: profileData, error: profileError } = await supabaseClient
    .from("profiles")
    .select("user_id")
    .eq("id", profile_id)
    .single();

  if (profileError || !profileData?.user_id) {
    return new Response(JSON.stringify({ error: "Profile not found or has no user_id" }), {
      headers: { "Content-Type": "application/json" },
      status: 404,
    });
  }

  // Add 'admin' role to the user if not already present
  const { error: insertRoleError } = await supabaseClient
    .from("user_roles")
    .insert({ user_id: profileData.user_id, role: "admin" })
    .select();

  if (insertRoleError && insertRoleError.code !== "23505") { // 23505 is unique_violation
    return new Response(JSON.stringify({ error: insertRoleError.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }

  // Assign the profile as a congregation administrator
  const { data, error } = await supabaseClient
    .from("congregation_administrators")
    .insert({ profile_id, congregation_id })
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }

  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
    status: 201,
  });
});
