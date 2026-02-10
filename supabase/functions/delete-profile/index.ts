import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("Não autorizado");
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
      throw new Error("Não autorizado");
    }

    const { data: roleData } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "super_admin"])
      .maybeSingle();

    if (!roleData) {
      throw new Error("Apenas administradores podem excluir perfis");
    }

    const isSuperAdmin = roleData.role === "super_admin";

    const { profileId } = await req.json();
    if (!profileId) {
      throw new Error("ID do perfil é obrigatório");
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get the profile to find user_id, spouse, and congregation
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id, user_id, spouse_id, congregation_id")
      .eq("id", profileId)
      .maybeSingle();

    if (profileError || !profile) {
      throw new Error("Perfil não encontrado");
    }

    // If not super_admin, verify the profile belongs to the admin's congregation
    if (!isSuperAdmin) {
      const { data: adminProfile } = await userClient
        .from("profiles")
        .select("congregation_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!adminProfile || adminProfile.congregation_id !== profile.congregation_id) {
        throw new Error("Você só pode excluir perfis da sua congregação");
      }
    }

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

    // Get future trips where this profile is the driver
    const { data: driverTrips, error: driverTripsError } = await adminClient
      .from("trips")
      .select("id")
      .eq("driver_id", profileId)
      .gte("date", new Date().toISOString());

    if (driverTripsError) {
      console.error("Error fetching driver trips:", driverTripsError);
    } else if (driverTrips && driverTrips.length > 0) {
      // Delete future trips where they are the driver
      const tripIds = driverTrips.map((trip: any) => trip.id);
      const { error: deleteTripsError } = await adminClient
        .from("trips")
        .delete()
        .in("id", tripIds);
      
      if (deleteTripsError) {
        console.error("Error deleting driver trips:", deleteTripsError);
      }
    }

    // Remove as passenger from future trips
    const { data: passengerTrips, error: passengerTripsError } = await adminClient
      .from("trip_passengers")
      .select("trip_id, trips!inner(date)")
      .eq("passenger_id", profileId);

    if (passengerTripsError) {
      console.error("Error fetching passenger trips:", passengerTripsError);
    } else if (passengerTrips && passengerTrips.length > 0) {
      // Filter for future trips
      const futurePassengerTrips = passengerTrips.filter((tp: any) => {
        const tripDate = new Date(tp.trips.date);
        return tripDate >= new Date();
      });

      if (futurePassengerTrips.length > 0) {
        const { error: removePassengerError } = await adminClient
          .from("trip_passengers")
          .delete()
          .eq("passenger_id", profileId)
          .in("trip_id", futurePassengerTrips.map((tp: any) => tp.trip_id));
        
        if (removePassengerError) {
          console.error("Error removing as passenger:", removePassengerError);
        }
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
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
