import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    if (!authHeader) {
      console.error("Missing Authorization header");
      return new Response(
        JSON.stringify({ error: "Não autorizado: Cabeçalho de autorização ausente" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 1. Create a client with the user's own JWT to verify they are who they say they are
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
          apikey: supabaseAnonKey
        }
      },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    
    if (authError || !user) {
      console.error("Auth error from userClient:", authError?.message || authError);
      console.error("Auth header present:", !!authHeader);
      console.error("Supabase URL:", supabaseUrl);
      return new Response(
        JSON.stringify({
          error: authError?.message || "Não autorizado: Token inválido",
          details: "Verifique se você está autenticado e tente novamente"
        }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 2. Create an admin client for database operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify caller is admin
    const { data: roleData, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "super_admin"])
      .maybeSingle();

    if (roleError) {
      console.error("Error checking roles:", roleError);
      throw roleError;
    }

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Apenas administradores podem excluir perfis" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { profileId } = await req.json();
    if (!profileId) {
      return new Response(
        JSON.stringify({ error: "ID do perfil é obrigatório" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get the profile to find user_id and congregation
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id, user_id, spouse_id, congregation_id")
      .eq("id", profileId)
      .maybeSingle();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "Perfil não encontrado" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // If not super_admin, verify the profile belongs to the admin's congregation
    const isSuperAdmin = roleData.role === "super_admin";
    if (!isSuperAdmin) {
      const { data: adminProfile } = await adminClient
        .from("profiles")
        .select("congregation_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!adminProfile || adminProfile.congregation_id !== profile.congregation_id) {
        return new Response(
          JSON.stringify({ error: "Você só pode excluir perfis da sua congregação" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Delete related records
    await adminClient.from("absences").delete().eq("profile_id", profileId);
    await adminClient.from("ride_requests").delete().eq("profile_id", profileId);
    await adminClient.from("trip_passengers").delete().eq("passenger_id", profileId);
    await adminClient.from("transactions").delete().or(`debtor_id.eq.${profileId},creditor_id.eq.${profileId}`);
    await adminClient.from("transfers").delete().or(`debtor_id.eq.${profileId},creditor_id.eq.${profileId}`);

    if (profile.spouse_id) {
      await adminClient
        .from("profiles")
        .update({ spouse_id: null, is_married: false })
        .eq("id", profile.spouse_id);
    }

    await adminClient.from("congregation_administrators").delete().eq("profile_id", profileId);

    // Delete future trips
    const { data: driverTrips } = await adminClient
      .from("trips")
      .select("id")
      .eq("driver_id", profileId)
      .gte("date", new Date().toISOString());

    if (driverTrips && driverTrips.length > 0) {
      await adminClient.from("trips").delete().in("id", driverTrips.map(t => t.id));
    }

    // Delete Auth User if exists, otherwise delete profile directly
    if (profile.user_id) {
      const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(profile.user_id);
      if (deleteAuthError) {
        console.error("Error deleting auth user, falling back to profile delete:", deleteAuthError);
        const { error: deleteProfileError } = await adminClient.from("profiles").delete().eq("id", profileId);
        if (deleteProfileError) throw deleteProfileError;
      }
    } else {
      const { error: deleteProfileError } = await adminClient.from("profiles").delete().eq("id", profileId);
      if (deleteProfileError) throw deleteProfileError;
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Error in delete-profile:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
