import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface DeleteProfileRequest {
  profileId: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header to verify admin status
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("Não autorizado");
    }

    // Create client with user's token to verify admin role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    
    if (userError || !user) {
      throw new Error("Usuário não autenticado");
    }

    // Create admin client with service role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if user is admin or super_admin
    const { data: roleData, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "super_admin"])
      .maybeSingle();

    if (roleError || !roleData) {
      throw new Error("Apenas administradores podem excluir perfis");
    }

    // Parse request body
    const { profileId }: DeleteProfileRequest = await req.json();

    if (!profileId) {
      throw new Error("ID do perfil é obrigatório");
    }

    // Get the profile to find user_id and congregation
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id, user_id, spouse_id, congregation_id")
      .eq("id", profileId)
      .maybeSingle();

    if (profileError || !profile) {
      throw new Error("Perfil não encontrado");
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
        throw new Error("Você só pode excluir perfis da sua congregação");
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
      await adminClient.from("trips").delete().in("id", driverTrips.map((t: { id: string }) => t.id));
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
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (error: any) {
    console.error("Error in delete-profile function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
