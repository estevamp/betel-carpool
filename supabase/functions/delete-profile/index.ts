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

    const { profileId } = await req.json();
    if (!profileId) {
      throw new Error("ID do perfil é obrigatório");
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get the profile to find user_id and spouse
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id, user_id, spouse_id")
      .eq("id", profileId)
      .maybeSingle();

    if (profileError || !profile) {
      throw new Error("Perfil não encontrado");
    }

    // Clear spouse link if exists
    if (profile.spouse_id) {
      await adminClient
        .from("profiles")
        .update({ spouse_id: null, is_married: false })
        .eq("id", profile.spouse_id);
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
