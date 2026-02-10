import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.10.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  // This is needed for CORS support
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Extract and validate auth token
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 401,
    });
  }

  const token = authHeader.replace("Bearer ", "");

  const { profile_id, congregation_id } = await req.json();

  // Use service role for admin operations
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  );

  // Check if the user is a super_admin - pass token explicitly for Lovable Cloud
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
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
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 403,
    });
  }

  // Get the user_id from the profile_id
  const { data: profileData, error: profileError } = await supabaseClient
    .from("profiles")
    .select("user_id, full_name, email")
    .eq("id", profile_id)
    .single();

  if (profileError) {
    return new Response(JSON.stringify({ error: "Perfil não encontrado" }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 404,
    });
  }

  // Add 'admin' role to the user if they have a user_id (already accepted invite)
  // If no user_id, we still allow congregation admin assignment - they'll get the role when they login
  if (profileData?.user_id) {
    const { error: insertRoleError } = await supabaseClient
      .from("user_roles")
      .insert({ user_id: profileData.user_id, role: "admin" });

    // If role assignment fails due to unique violation (role already exists), that's OK
    // But if it fails for other reasons, we should know about it
    if (insertRoleError && !insertRoleError.message.includes("duplicate key")) {
      console.error(`Error assigning 'admin' role to user ${profileData.user_id}: ${insertRoleError.message}`);
      // Still continue - the congregation_administrators entry is more important
      // The role can be fixed manually or granted upon next login
    } else if (insertRoleError) {
      console.log(`User ${profileData.user_id} already has admin role`);
    } else {
      console.log(`Successfully assigned admin role to user ${profileData.user_id}`);
    }
  }

  // Assign the profile as a congregation administrator
  const { error } = await supabaseClient
    .from("congregation_administrators")
    .insert({ profile_id, congregation_id });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 400,
    });
  }

  // Return a simple success message as we are not selecting the data anymore.
  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
    status: 201,
  });
});
