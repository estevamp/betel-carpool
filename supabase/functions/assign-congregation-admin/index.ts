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
  console.log(`Assigning admin: profile_id=${profile_id}, congregation_id=${congregation_id}`);

  // Create admin client with service role key to bypass RLS after authorization
  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  // Check if the user is a super_admin - pass token explicitly for Lovable Cloud
  const { data: { user }, error: authError } = await adminClient.auth.getUser(token);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 401,
    });
  }

  const { data: roleData, error: roleError } = await adminClient
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
  const { data: profileData, error: profileError } = await adminClient
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

  // CRITICAL: Validate that the profile has a linked user_id (user has logged in at least once)
  if (!profileData?.user_id) {
    return new Response(
      JSON.stringify({
        error: "Não é possível designar um administrador para um perfil que ainda não fez login. O usuário deve fazer login pelo menos uma vez antes de ser designado como administrador.",
        profile_email: profileData?.email,
        profile_name: profileData?.full_name
      }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 400,
      }
    );
  }

  // Add 'admin' role to the user (they have a user_id, so they've logged in)
  if (profileData.user_id) {
    console.log(`Adding 'admin' role to user_id=${profileData.user_id}`);
    // Use upsert with onConflict to prevent duplicates and handle race conditions
    const { error: insertRoleError } = await adminClient
      .from("user_roles")
      .upsert(
        { user_id: profileData.user_id, role: "admin" },
        { onConflict: 'user_id,role' }
      );

    if (insertRoleError) {
      console.error(`Error assigning 'admin' role to user ${profileData.user_id}: ${insertRoleError.message}`);
    } else {
      console.log(`Successfully assigned 'admin' role to user ${profileData.user_id}`);
    }
  }

  // Assign the profile as a congregation administrator
  console.log(`Inserting into congregation_administrators: profile_id=${profile_id}, congregation_id=${congregation_id}`);
  
  // Use upsert with onConflict to prevent duplicates and handle race conditions
  const { error: insertError } = await adminClient
    .from("congregation_administrators")
    .upsert(
      { profile_id, congregation_id },
      { onConflict: 'profile_id,congregation_id' }
    );

  if (insertError) {
    return new Response(JSON.stringify({ error: insertError.message }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 400,
    });
  }

  // Return a simple success message as we are not selecting the data anymore.
  console.log(`Successfully completed assignment for profile_id=${profile_id}`);
  return new Response(JSON.stringify({
    success: true,
    message: "Administrador designado com sucesso",
    details: {
      profile_id,
      congregation_id,
      user_id: profileData.user_id
    }
  }), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
    status: 200,
  });
});
