import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const ONESIGNAL_APP_ID = "cb24512d-c95a-4533-a08b-259a5e289e0e";
const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
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

    // Authentication check for the scheduler
    // Since this is called by pg_cron via pg_net, we need to check for the service role key
    const authHeader = req.headers.get("Authorization");
    const apiKey = req.headers.get("apikey");
    
    // Normalize keys for comparison (remove whitespace)
    const normalizedServiceKey = supabaseServiceKey.trim();
    const normalizedApiKey = apiKey?.trim();
    const normalizedAuthToken = authHeader?.replace(/^Bearer\s+/i, "").trim();

    // Log all headers for debugging
    console.log("Request Headers:", {
      authorization: authHeader ? `Bearer ${authHeader.substring(7, 20)}...` : "none",
      apikey: apiKey ? `${apiKey.substring(0, 20)}...` : "none",
      host: req.headers.get("host"),
      "x-real-ip": req.headers.get("x-real-ip"),
      "x-forwarded-for": req.headers.get("x-forwarded-for"),
      "user-agent": req.headers.get("user-agent")
    });

    // Log auth check details
    console.log("Auth Check:", {
      hasApiKey: !!normalizedApiKey,
      hasAuthToken: !!normalizedAuthToken,
      apiKeyMatch: normalizedApiKey === normalizedServiceKey,
      tokenMatch: normalizedAuthToken === normalizedServiceKey,
      serviceKeyPrefix: normalizedServiceKey.substring(0, 20)
    });

    const isServiceRole =
      (normalizedApiKey && normalizedApiKey === normalizedServiceKey) ||
      (normalizedAuthToken && normalizedAuthToken === normalizedServiceKey);

    if (!isServiceRole) {
      // Check if this is an internal request from pg_net/pg_cron
      // These requests come from within the Supabase infrastructure
      const userAgent = req.headers.get("user-agent") || "";
      const isInternalRequest = userAgent.includes("pg_net") || userAgent.includes("supabase");
      
      console.log("Internal request check:", {
        userAgent,
        isInternalRequest
      });
      
      if (!isInternalRequest) {
        console.error("Unauthorized: Scheduler must be called with service role key or from internal network");
        return new Response(
          JSON.stringify({ success: false, error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log("Authorized via internal request (pg_net/pg_cron)");
    } else {
      console.log("Authorized via service role key");
    }

    // Get current day (0-6) and time (HH:mm)
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.toTimeString().split(' ')[0]; // HH:mm:ss

    console.log(`Running scheduler at ${currentTime}, day ${currentDay}`);

    // Find settings that match today and are enabled
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('notification_settings')
      .select('*, congregations(name)')
      .eq('is_enabled', true)
      .contains('scheduled_days', [currentDay]);

    if (settingsError) throw settingsError;

    for (const setting of settings) {
      const scheduledTime = setting.scheduled_time;
      const lastRun = setting.last_run_at ? new Date(setting.last_run_at) : null;
      const isSameDay = lastRun && lastRun.toDateString() === now.toDateString();

      // If scheduled time has passed and we haven't run today
      if (currentTime >= scheduledTime && !isSameDay) {
        console.log(`Sending scheduled notification for congregation: ${setting.congregations?.name}`);

        // Get all users from this congregation
        const { data: members } = await supabaseAdmin
          .from('profiles')
          .select('user_id')
          .eq('congregation_id', setting.congregation_id)
          .not('user_id', 'is', null);

        const userIds = members?.map((m: any) => m.user_id) || [];

        if (userIds.length > 0) {
          const response = await fetch("https://onesignal.com/api/v1/notifications", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
            },
            body: JSON.stringify({
              app_id: ONESIGNAL_APP_ID,
              headings: { en: "Lembrete da Congregação", pt: "Lembrete da Congregação" },
              contents: { en: setting.message, pt: setting.message },
              include_external_user_ids: userIds,
            }),
          });

          if (response.ok) {
            // Update last_run_at
            await supabaseAdmin
              .from('notification_settings')
              .update({ last_run_at: now.toISOString() })
              .eq('id', setting.id);
            
            console.log(`Notification sent to ${userIds.length} users`);
          } else {
            const err = await response.json();
            console.error(`OneSignal error for ${setting.congregation_id}:`, err);
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Scheduler error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
