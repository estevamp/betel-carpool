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
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    console.log("Auth header present:", !!authHeader);
    
    // Try to verify the user from the JWT token
    let user = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      console.log("Token length:", token.length);
      
      // Create a client with the user's token to verify it
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        {
          global: {
            headers: { Authorization: authHeader },
          },
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        }
      );
      
      const { data, error: userError } = await supabaseClient.auth.getUser();
      
      if (userError) {
        console.error("Auth error:", userError.message, userError.status);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Authentication failed",
            details: userError.message
          }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      if (data?.user) {
        user = data.user;
        console.log("User authenticated:", user.id);
      }
    }

    // If no auth header, check if it's a service role call (e.g. from cron)
    if (!user) {
      const apiKey = req.headers.get("apikey");
      const isServiceRole = apiKey === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      
      if (!isServiceRole) {
        console.error("No valid authentication found");
        return new Response(
          JSON.stringify({
            success: false,
            error: "Unauthorized - No valid authentication provided"
          }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      console.log("Service role authentication successful");
      // For service role, we don't have a specific user, but we allow the operation
    }

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

    const { message, congregationId } = await req.json();
    if (!message || !congregationId) throw new Error("Message and congregationId are required");

    // If we have a user, verify if they are admin of this congregation or super admin
    if (user) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      // Check if user is super admin using the helper function
      const { data: isSuperAdmin } = await supabaseAdmin
        .rpc('is_super_admin');

      const { data: isAdmin } = await supabaseAdmin
        .from('congregation_administrators')
        .select('id')
        .eq('congregation_id', congregationId)
        .eq('profile_id', profile?.id)
        .maybeSingle();

      if (!isSuperAdmin && !isAdmin) {
        throw new Error("Forbidden: You are not an admin of this congregation");
      }
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
