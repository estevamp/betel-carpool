import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.10.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 401,
    });
  }

  const token = authHeader.replace("Bearer ", "");
  const { profile_id, congregation_id, action = 'assign' } = await req.json();

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

  const { data: { user }, error: authError } = await adminClient.auth.getUser(token);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 401,
    });
  }

  // Check if requester is super_admin or admin of the target congregation
  const { data: requesterRoles } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  
  const isSuperAdmin = requesterRoles?.some(r => r.role === 'super_admin');
  const isAdmin = requesterRoles?.some(r => r.role === 'admin');

  if (!isSuperAdmin) {
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: Not an admin" }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 403,
      });
    }

    // Check if admin belongs to the congregation
    const { data: requesterProfile } = await adminClient
      .from("profiles")
      .select("congregation_id")
      .eq("user_id", user.id)
      .single();

    if (requesterProfile?.congregation_id !== congregation_id) {
      return new Response(JSON.stringify({ error: "Forbidden: Not an admin of this congregation" }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 403,
      });
    }
  }

  if (action === 'assign') {
    // Get the user_id from the profile_id
    const { data: profileData, error: profileError } = await adminClient
      .from("profiles")
      .select("user_id, full_name, email, congregation_id")
      .eq("id", profile_id)
      .single();

    if (profileError) {
      return new Response(JSON.stringify({ error: "Perfil não encontrado" }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 404,
      });
    }

    // Ensure the profile belongs to the same congregation
    // Use the profile's congregation if not provided (e.g. when called from Betelitas list)
    const targetCongregationId = congregation_id || profileData.congregation_id;

    if (!targetCongregationId) {
        return new Response(JSON.stringify({ error: "Congregação não especificada" }), {
            headers: { "Content-Type": "application/json", ...corsHeaders },
            status: 400,
        });
    }

    if (profileData.congregation_id && profileData.congregation_id !== targetCongregationId) {
        console.log(`Congregation mismatch: profile.congregation_id=${profileData.congregation_id}, requested congregation_id=${targetCongregationId}`);
        return new Response(JSON.stringify({ error: "O betelita deve pertencer à mesma congregação" }), {
            headers: { "Content-Type": "application/json", ...corsHeaders },
            status: 400,
        });
    }

    if (!profileData?.user_id) {
      return new Response(
        JSON.stringify({
          error: "Não é possível designar um administrador para um perfil que ainda não fez login.",
        }),
        {
          headers: { "Content-Type": "application/json", ...corsHeaders },
          status: 400,
        }
      );
    }

    // Add 'admin' role
    const { data: existingRole } = await adminClient
      .from("user_roles")
      .select("id")
      .eq("user_id", profileData.user_id)
      .eq("role", "admin")
      .maybeSingle();

    if (!existingRole) {
      await adminClient.from("user_roles").insert({ user_id: profileData.user_id, role: "admin" });
    }

    // Assign as congregation administrator
    const { data: existingAdmin } = await adminClient
      .from("congregation_administrators")
      .select("id")
      .eq("profile_id", profile_id)
      .eq("congregation_id", targetCongregationId)
      .maybeSingle();

    if (!existingAdmin) {
      const { error: insertError } = await adminClient
        .from("congregation_administrators")
        .insert({ profile_id, congregation_id: targetCongregationId });

      if (insertError) {
        return new Response(JSON.stringify({ error: insertError.message }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
          status: 400,
        });
      }
    }

    return new Response(JSON.stringify({ success: true, message: "Administrador designado com sucesso" }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 200,
    });

  } else if (action === 'remove') {
    // Get the profile's congregation if not provided
    let targetCongregationId = congregation_id;
    if (!targetCongregationId) {
      const { data: profileData } = await adminClient
        .from("profiles")
        .select("congregation_id")
        .eq("id", profile_id)
        .single();
      targetCongregationId = profileData?.congregation_id;
    }

    if (!targetCongregationId) {
      return new Response(JSON.stringify({ error: "Congregação não encontrada para este perfil" }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 400,
      });
    }

    // Check if it's the last admin
    const { count, error: countError } = await adminClient
      .from("congregation_administrators")
      .select("*", { count: 'exact', head: true })
      .eq("congregation_id", targetCongregationId);

    if (countError) throw countError;
    if (count && count <= 1) {
      return new Response(JSON.stringify({ error: "A congregação deve ter pelo menos um administrador." }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 400,
      });
    }

    // Remove from congregation_administrators
    const { error: deleteError } = await adminClient
      .from("congregation_administrators")
      .delete()
      .eq("profile_id", profile_id)
      .eq("congregation_id", targetCongregationId);

    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 400,
      });
    }

    // Check if user is admin in ANY other congregation
    const { data: otherAdmins } = await adminClient
      .from("congregation_administrators")
      .select("id")
      .eq("profile_id", profile_id)
      .limit(1);

    if (!otherAdmins || otherAdmins.length === 0) {
      // Remove 'admin' role if not admin anywhere else
      const { data: profileData } = await adminClient
        .from("profiles")
        .select("user_id")
        .eq("id", profile_id)
        .single();

      if (profileData?.user_id) {
        await adminClient
          .from("user_roles")
          .delete()
          .eq("user_id", profileData.user_id)
          .eq("role", "admin");
      }
    }

    return new Response(JSON.stringify({ success: true, message: "Administrador removido com sucesso" }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 200,
    });
  }

  return new Response(JSON.stringify({ error: "Invalid action" }), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
    status: 400,
  });
});
