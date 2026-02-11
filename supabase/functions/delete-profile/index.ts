import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.10.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeleteProfileRequest {
  profileId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== DELETE PROFILE START ===");
    
    // Try to get JWT from Authorization header
    let authHeader = req.headers.get("Authorization");
    
    // If not in Authorization header, try apikey header (Supabase sometimes uses this)
    if (!authHeader) {
      const apikey = req.headers.get("apikey");
      if (apikey) {
        authHeader = `Bearer ${apikey}`;
      }
    }
    
    console.log("Auth header:", authHeader ? "present" : "missing");
    
    // Create Supabase admin client to get user by ID from JWT
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

    // If we have an auth header, try to verify it
    let userId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "").replace("bearer ", "");
      console.log("Token present, length:", token.length);
      
      // Try to get user from token
      const { data: { user }, error: userError } = await adminClient.auth.getUser(token);
      
      if (user) {
        userId = user.id;
        console.log("✅ User from token:", userId);
      } else {
        console.log("❌ Could not get user from token:", userError);
      }
    }
    
    // If we still don't have a user, return 401
    if (!userId) {
      console.error("❌ No authenticated user found");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    const { profileId }: DeleteProfileRequest = await req.json();
    console.log("Profile ID to delete:", profileId);

    if (!profileId) {
      return new Response(
        JSON.stringify({ error: "ID do perfil é obrigatório" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Check if user is admin or super_admin
    const { data: roleData, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "super_admin"])
      .maybeSingle();

    console.log("Role check:", roleData, roleError);

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: "Apenas administradores podem excluir perfis" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        }
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
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }

    // If not super_admin, verify the profile belongs to the admin's congregation
    const isSuperAdmin = roleData.role === "super_admin";
    if (!isSuperAdmin) {
      const { data: adminProfile } = await adminClient
        .from("profiles")
        .select("congregation_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (!adminProfile || adminProfile.congregation_id !== profile.congregation_id) {
        return new Response(
          JSON.stringify({ error: "Você só pode excluir perfis da sua congregação" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 403,
          }
        );
      }
    }

    console.log("✅ Authorization checks passed, deleting profile...");

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
      await adminClient.from("trips").delete().in("id", driverTrips.map((t: any) => t.id));
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

    console.log("✅ Profile deleted successfully");

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("❌ Error deleting profile:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
