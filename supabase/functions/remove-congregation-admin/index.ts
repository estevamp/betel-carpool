import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.10.0";

serve(async (req) => {
  const { admin_id } = await req.json(); // admin_id refers to the ID in congregation_administrators table

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

  // Get the profile_id and user_id associated with the admin_id
  const { data: adminProfileData, error: adminProfileError } = await supabaseClient
    .from("congregation_administrators")
    .select("profile_id")
    .eq("id", admin_id)
    .single();

  if (adminProfileError || !adminProfileData?.profile_id) {
    return new Response(JSON.stringify({ error: "Congregation administrator not found" }), {
      headers: { "Content-Type": "application/json" },
      status: 404,
    });
  }

  const { data: profileData, error: profileError } = await supabaseClient
    .from("profiles")
    .select("user_id")
    .eq("id", adminProfileData.profile_id)
    .single();

  if (profileError || !profileData?.user_id) {
    return new Response(JSON.stringify({ error: "Profile associated with admin not found or has no user_id" }), {
      headers: { "Content-Type": "application/json" },
      status: 404,
    });
  }

  // Remove the administrator from the congregation_administrators table
  const { error: deleteAdminError } = await supabaseClient
    .from("congregation_administrators")
    .delete()
    .eq("id", admin_id);

  if (deleteAdminError) {
    return new Response(JSON.stringify({ error: deleteAdminError.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }

  // Check if the user has any other admin roles
  const { data: otherAdminRoles, error: otherRolesError } = await supabaseClient
    .from("congregation_administrators")
    .select("id")
    .eq("profile_id", adminProfileData.profile_id);

  if (otherRolesError) {
    return new Response(JSON.stringify({ error: otherRolesError.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }

  // If no other admin roles, remove the 'admin' app_role
  if (!otherAdminRoles || otherAdminRoles.length === 0) {
    const { error: removeRoleError } = await supabaseClient
      .from("user_roles")
      .delete()
      .eq("user_id", profileData.user_id)
      .eq("role", "admin");

    if (removeRoleError) {
      return new Response(JSON.stringify({ error: removeRoleError.message }), {
        headers: { "Content-Type": "application/json" },
        status: 500,
      });
    }
  }

  return new Response(JSON.stringify({ message: "Administrator removido com sucesso" }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});
