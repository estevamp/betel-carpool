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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Missing Authorization header");
      return new Response(JSON.stringify({ success: false, error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract the JWT token from the Authorization header
    const token = authHeader.replace("Bearer ", "");

    // Create admin client for database operations (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    // Verify the user's JWT token by passing it directly to getUser()
    // This avoids the AuthSessionMissingError
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error("User verification failed:", userError);
      return new Response(JSON.stringify({ success: false, error: "Unauthorized", details: userError?.message }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { message, congregationId } = await req.json();
    if (!message || !congregationId) throw new Error("Message and congregationId are required");

    // Verify if user is admin of this congregation or super admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, is_super_admin')
      .eq('user_id', user.id)
      .single();

    const { data: isAdmin } = await supabaseAdmin
      .from('congregation_administrators')
      .select('id')
      .eq('congregation_id', congregationId)
      .eq('profile_id', profile?.id)
      .maybeSingle();

    if (!profile?.is_super_admin && !isAdmin) {
      throw new Error("Forbidden: You are not an admin of this congregation");
    }

    // Get all users from this congregation
    const { data: members, error: membersError } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('congregation_id', congregationId)
      .not('user_id', 'is', null);

    if (membersError) throw membersError;

    const userIds = members.map(m => m.user_id);
    if (userIds.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No members to notify" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send via OneSignal
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
