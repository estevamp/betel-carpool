import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const ONESIGNAL_APP_ID = "cb24512d-c95a-4533-a08b-259a5e289e0e";
const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BRT_TIMEZONE = "America/Sao_Paulo";

function toBrtDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BRT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function toHHMMSS(value: string): string {
  const [rawHours = "0", rawMinutes = "0", rawSeconds = "0"] = value.split(":");
  const hours = rawHours.padStart(2, "0");
  const minutes = rawMinutes.padStart(2, "0");
  const seconds = rawSeconds.padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function toBrtTimeKey(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: BRT_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function normalizeSecret(secret: string | undefined): string {
  return (secret ?? "").trim().replace(/^['"]|['"]$/g, "");
}

async function parseJsonSafely(response: Response): Promise<any> {
  const bodyText = await response.text();
  try {
    return JSON.parse(bodyText);
  } catch {
    return { raw: bodyText };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseSecretKey =
      Deno.env.get("SUPABASE_SECRET_KEY") ??
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
      "";
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
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
    const normalizedServiceKey = supabaseSecretKey.trim();
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
      const host = req.headers.get("host") || "";
      
      // pg_net uses "node" as user-agent and requests come from localhost or internal network
      const isInternalRequest =
        userAgent.includes("pg_net") ||
        userAgent.includes("supabase") ||
        userAgent.includes("node") ||
        host.includes("localhost");
      
      console.log("Internal request check:", {
        userAgent,
        host,
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

    // Get current day (0-6) and time in BRT
    const now = new Date();
    
    // Get Brazil Time (BRT)
    const brTimeStr = now.toLocaleString("en-US", { timeZone: BRT_TIMEZONE });
    const brDate = new Date(brTimeStr);
    
    const currentDay = brDate.getDay(); // 0-6
    const hours = String(brDate.getHours()).padStart(2, '0');
    const minutes = String(brDate.getMinutes()).padStart(2, '0');
    const seconds = String(brDate.getSeconds()).padStart(2, '0');
    const currentTime = toHHMMSS(`${hours}:${minutes}:${seconds}`);
    const currentDateKey = toBrtDateKey(now);

    console.log(`Running scheduler at ${currentTime} (BRT), day ${currentDay}, date ${currentDateKey}, UTC: ${now.toISOString()}`);

    const oneSignalApiKey = normalizeSecret(ONESIGNAL_REST_API_KEY);

    if (!oneSignalApiKey) {
      throw new Error("ONESIGNAL_REST_API_KEY is not set");
    }

    // Find settings that match today and are enabled
    // We need to check if the scheduled_days array contains the current day
    // Using a raw query because Supabase client doesn't have a good way to check array membership
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('notification_settings')
      .select('*, congregations(name)')
      .eq('is_enabled', true);

    if (settingsError) throw settingsError;

    // Filter settings to only those that include today in their scheduled_days
    const todaySettings = (settings || []).filter(setting =>
      setting.scheduled_days && setting.scheduled_days.includes(currentDay)
    );

    console.log(`Found ${todaySettings.length} notification settings for day ${currentDay} (${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][currentDay]})`);

    for (const setting of todaySettings) {
      const scheduledTime = toHHMMSS(String(setting.scheduled_time));
      const lastRun = setting.last_run_at ? new Date(setting.last_run_at) : null;
      const lastRunDateKey = lastRun ? toBrtDateKey(lastRun) : null;
      const lastRunTimeKey = lastRun ? toBrtTimeKey(lastRun) : null;
      const alreadyRanForThisSchedule =
        lastRunDateKey === currentDateKey &&
        !!lastRunTimeKey &&
        lastRunTimeKey >= scheduledTime;
      const shouldRun = currentTime >= scheduledTime && !alreadyRanForThisSchedule;

      console.log("Schedule check:", {
        settingId: setting.id,
        congregationId: setting.congregation_id,
        scheduledTimeRaw: setting.scheduled_time,
        scheduledTime,
        currentTime,
        currentDateKey,
        lastRunAt: setting.last_run_at,
        lastRunDateKey,
        lastRunTimeKey,
        alreadyRanForThisSchedule,
        shouldRun,
      });

      // If scheduled time has passed and we haven't run today
      // We use a 15-minute window to ensure we don't miss it if the cron runs slightly off
      // but the !isSameDay check is the primary guard against double-sending
      if (shouldRun) {
        console.log(`Sending scheduled notification for congregation: ${setting.congregations?.name} (${setting.congregation_id}). Scheduled: ${scheduledTime}, Current: ${currentTime}`);

        // Get all users from this congregation
        const { data: members, error: membersError } = await supabaseAdmin
          .from('profiles')
          .select('user_id')
          .eq('congregation_id', setting.congregation_id)
          .not('user_id', 'is', null);

        if (membersError) {
          console.error(`Error fetching members for congregation ${setting.congregation_id}:`, membersError);
          continue;
        }

        const userIds = members?.map((m: any) => m.user_id).filter(Boolean) || [];

        if (userIds.length > 0) {
          const payload = {
            app_id: ONESIGNAL_APP_ID,
            headings: {
              en: `Lembrete: ${setting.congregations?.name || 'Congregação'}`,
              pt: `Lembrete: ${setting.congregations?.name || 'Congregação'}`
            },
            contents: { en: setting.message, pt: setting.message },
            include_external_user_ids: userIds
          };

          console.log(`Sending scheduled notification to ${userIds.length} users for congregation ${setting.congregation_id}`);

          let response = await fetch("https://onesignal.com/api/v1/notifications", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Basic ${oneSignalApiKey}`,
            },
            body: JSON.stringify(payload),
          });

          let result = await parseJsonSafely(response);

          const authErrors = Array.isArray(result?.errors)
            ? result.errors.map((e: unknown) => String(e).toLowerCase())
            : [];
          const hasAuthError = authErrors.some(
            (msg: string) => msg.includes("access denied") || msg.includes("authorization")
          );

          // Some OneSignal keys require "Key" scheme instead of "Basic".
          if (!response.ok && hasAuthError) {
            response = await fetch("https://onesignal.com/api/v1/notifications", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Key ${oneSignalApiKey}`,
              },
              body: JSON.stringify(payload),
            });
            result = await parseJsonSafely(response);
          }

          console.log(`OneSignal response for ${setting.congregations?.name}:`, JSON.stringify(result));
          
          if (response.ok) {
            // Update last_run_at
            await supabaseAdmin
              .from('notification_settings')
              .update({ last_run_at: now.toISOString() })
              .eq('id', setting.id);
            
            console.log(`Notification sent successfully for ${setting.congregations?.name}. Result ID: ${result.id}`);
          } else {
            console.error(`OneSignal error for ${setting.congregation_id}:`, result);
          }
        } else {
          console.log(`No users found for congregation ${setting.congregation_id}, skipping notification.`);
          // Still update last_run_at to avoid re-checking this congregation until tomorrow
          await supabaseAdmin
            .from('notification_settings')
            .update({ last_run_at: now.toISOString() })
            .eq('id', setting.id);
        }
      } else {
        console.log(
          `Skipping setting ${setting.id}: scheduled=${scheduledTime}, current=${currentTime}, alreadyRanForThisSchedule=${alreadyRanForThisSchedule}, lastRun=${setting.last_run_at ?? "null"}`
        );
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

