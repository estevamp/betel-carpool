import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const ONESIGNAL_APP_ID = "cb24512d-c95a-4533-a08b-259a5e289e0e";
const ONESIGNAL_REST_API_KEY = "os_v2_app_zmsfclojljcthielewnf4ke6b2ua6pacgb2uhlfqyn7uaeecng7jp3c7hw4lpw63ztxaxlrvovcbqdftxkeagf4dk257vzpgukdhqly";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  userId?: string;
  userIds?: string[];
  title: string;
  message: string;
  url?: string;
  data?: Record<string, any>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Create Supabase client to verify the user
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify the user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Parse the request body
    const body: NotificationRequest = await req.json();
    const { userId, userIds, title, message, url, data } = body;

    // Validate required fields
    if (!title || !message) {
      throw new Error("Title and message are required");
    }

    if (!userId && !userIds) {
      throw new Error("Either userId or userIds must be provided");
    }

    // Prepare the OneSignal notification payload
    const notificationPayload: any = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: title },
      contents: { en: message },
    };

    // Add target users
    if (userId) {
      notificationPayload.include_external_user_ids = [userId];
    } else if (userIds && userIds.length > 0) {
      notificationPayload.include_external_user_ids = userIds;
    }

    // Add optional fields
    if (url) {
      notificationPayload.url = url;
    }

    if (data) {
      notificationPayload.data = data;
    }

    // Send notification via OneSignal REST API
    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(notificationPayload),
    });

    const result = await response.json();

    // Check if OneSignal request was successful
    if (!response.ok) {
      console.error("OneSignal API error:", result);
      throw new Error(result.errors?.[0] || "Failed to send notification");
    }

    console.log("Notification sent successfully:", result);

    return new Response(
      JSON.stringify({
        success: true,
        id: result.id,
        recipients: result.recipients,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error("Error sending push notification:", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    return new Response(
      JSON.stringify({
        success: false,
        error: message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: message === "Unauthorized" ? 401 : 500,
      }
    );
  }
});
