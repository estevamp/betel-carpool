import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const ONESIGNAL_APP_ID = "cb24512d-c95a-4533-a08b-259a5e289e0e";
const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const authHeader = req.headers.get("Authorization");
    let user = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      
      // The invocation log shows a valid ES256 JWT with subject (user_id)
      // We use the admin client to get the user from this token
      const { data: { user: verifiedUser }, error: userError } = await supabaseAdmin.auth.getUser(token);
      
      if (userError) {
        console.error("Auth error:", userError.message, userError.status);
        // If it fails, we check if it's the service key
        if (token === supabaseServiceKey) {
           console.log("Authenticated via Service Key");
        } else {
          return new Response(
            JSON.stringify({ success: false, error: "Authentication failed", details: userError.message }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
      user = verifiedUser;
    }

    // Fallback to apikey header if no auth header
    if (!user) {
      const apiKey = req.headers.get("apikey");
      if (apiKey === supabaseServiceKey) {
        console.log("Authenticated via apikey header");
      } else if (!authHeader) {
        return new Response(
          JSON.stringify({ success: false, error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const { message, congregationId } = await req.json();
    if (!message || !congregationId) throw new Error("Message and congregationId are required");

    if (user) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      const { data: superAdminRole } = await supabaseAdmin
        .from('user_roles')
        .select('id')
        .eq('user_id', user.id)
        .eq('role', 'super_admin')
        .maybeSingle();

      const { data: isAdmin } = await supabaseAdmin
        .from('congregation_administrators')
        .select('id')
        .eq('congregation_id', congregationId)
        .eq('profile_id', profile?.id)
        .maybeSingle();

      if (!superAdminRole && !isAdmin) {
        return new Response(
          JSON.stringify({ success: false, error: "Forbidden: You are not an admin of this congregation" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const { data: members, error: membersError } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('congregation_id', congregationId)
      .not('user_id', 'is', null);

    if (membersError) throw membersError;

    const userIds = members.map((m: any) => m.user_id);
    if (userIds.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No members to notify" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const primaryPayload = {
      app_id: ONESIGNAL_APP_ID,
      channel_for_external_user_ids: "push",
      headings: { en: "Aviso da Congregação", pt: "Aviso da Congregação" },
      contents: { en: message, pt: message },
      include_external_user_ids: userIds,
    };

    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(primaryPayload),
    });

    const result = await response.json();

    if (!response.ok) throw new Error(result.errors?.[0] || "OneSignal error");

    return new Response(JSON.stringify({ success: true, result, delivery_mode: "external_user_ids" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
