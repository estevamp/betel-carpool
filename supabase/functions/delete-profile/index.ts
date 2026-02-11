import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await userClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { data: roleData } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "super_admin"])
      .maybeSingle();

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

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get the profile to find user_id and spouse
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
      const { data: adminProfile } = await userClient
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

    // Delete related records to avoid foreign key violations
    // 1. Absences
    await adminClient.from("absences").delete().eq("profile_id", profileId);

    // 2. Ride Requests
    await adminClient.from("ride_requests").delete().eq("profile_id", profileId);

    // 3. Trip Passengers
    await adminClient.from("trip_passengers").delete().eq("passenger_id", profileId);

    // 4. Transactions
    await adminClient.from("transactions").delete().or(`debtor_id.eq.${profileId},creditor_id.eq.${profileId}`);

    // 5. Transfers
    await adminClient.from("transfers").delete().or(`debtor_id.eq.${profileId},creditor_id.eq.${profileId}`);

    // Clear spouse link if exists
    if (profile.spouse_id) {
      await adminClient
        .from("profiles")
        .update({ spouse_id: null, is_married: false })
        .eq("id", profile.spouse_id);
    }

    // Remove from congregation_administrators if they are an admin
    const { error: removeAdminError } = await adminClient
      .from("congregation_administrators")
      .delete()
      .eq("profile_id", profileId);
    
    if (removeAdminError) {
      console.error("Error removing from congregation_administrators:", removeAdminError);
    }

    // Delete future trips where this profile is the driver
    const { data: driverTrips, error: driverTripsError } = await adminClient
      .from("trips")
      .select("id")
      .eq("driver_id", profileId)
      .gte("date", new Date().toISOString());

    if (driverTripsError) {
      console.error("Error fetching driver trips:", driverTripsError);
    } else if (driverTrips && driverTrips.length > 0) {
      const tripIds = driverTrips.map((trip: any) => trip.id);
      const { error: deleteTripsError } = await adminClient
        .from("trips")
        .delete()
        .in("id", tripIds);
      
      if (deleteTripsError) {
        console.error("Error deleting driver trips:", deleteTripsError);
      }
    }

    // If profile has a linked auth user, delete the auth user (cascade will delete profile)
    if (profile.user_id) {
      const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(profile.user_id);
      if (deleteAuthError) {
        console.error("Error deleting auth user:", deleteAuthError);
        // Fall back to just deleting the profile
        const { error: deleteProfileError } = await adminClient
          .from("profiles")
          .delete()
          .eq("id", profileId);
        if (deleteProfileError) throw deleteProfileError;
      }
      // auth user deletion cascades to profile, so no need to delete profile separately
    } else {
      // No auth user, just delete the profile
      const { error: deleteProfileError } = await adminClient
        .from("profiles")
        .delete()
        .eq("id", profileId);
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
