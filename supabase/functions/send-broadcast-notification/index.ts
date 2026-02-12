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
    
    // Create admin client
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
      
      // Verify JWT manually using the service role client
      // This is the most robust way when "Verify JWT" is off
      const { data: { user: verifiedUser }, error: userError } = await supabaseAdmin.auth.getUser(token);
      
      if (userError) {
        console.error("Auth error:", userError.message, userError.status);
        return new Response(
          JSON.stringify({ success: false, error: "Authentication failed", details: userError.message }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      user = verifiedUser;
    }

    if (!user) {
      const apiKey = req.headers.get("apikey");
      if (apiKey !== supabaseServiceKey) {
        return new Response(
          JSON.stringify({ success: false, error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const { message, congregationId } = await req.json();
    if (!message || !congregationId) throw new Error("Message and congregationId are required");

    if (user) {
      // Check permissions using the admin client but passing the user's token for the RPC
      // Or just use the admin client to check roles directly to avoid RPC context issues
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      // Check super admin role directly from user_roles table
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
        throw new Error("Forbidden: You are not an admin of this congregation");
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

    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        headings: { en: "Aviso da Congregação", pt: "Aviso da Congregação" },
        contents: { en: message, pt: message },
        include_external_user_ids: userIds,
      }),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.errors?.[0] || "OneSignal error");

    return new Response(JSON.stringify({ success: true, result }), {
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
