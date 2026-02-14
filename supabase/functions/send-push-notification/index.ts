import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const ONESIGNAL_APP_ID = "cb24512d-c95a-4533-a08b-259a5e289e0e";
const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY");

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
  ios_attachments?: Record<string, string>;
  android_accent_color?: string;
  small_icon?: string;
  large_icon?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    // Create admin client for manual verification and DB operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    let user = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      
      // Verify JWT manually using the service role client
      // This is the most robust way when "Verify JWT" is off
      const { data: { user: verifiedUser }, error: userError } = await supabaseAdmin.auth.getUser(token);
      
      if (userError) {
        console.error("Auth error:", userError.message, userError.status);
        
        // Fallback: check if it's the service role key being passed as a token
        if (token === supabaseServiceKey) {
          console.log("Authenticated via Service Key in Auth header");
        } else {
          return new Response(
            JSON.stringify({ success: false, error: "Authentication failed", details: userError.message }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
      user = verifiedUser;
    }

    // Fallback to apikey header if no user found via auth header
    if (!user) {
      const apiKey = req.headers.get("apikey");
      if (apiKey !== supabaseServiceKey) {
        console.error("Unauthorized: No valid authentication provided");
        return new Response(
          JSON.stringify({ success: false, error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log("Authenticated via apikey header");
    }

    // Parse the request body
    const body: NotificationRequest = await req.json();
    const { userId, userIds, title, message, url, data } = body;

    // Validate required fields
    if (!title || !message) {
      throw new Error("Title and message are required");
    }

    if (!userId && (!userIds || userIds.length === 0)) {
      throw new Error("Either userId or userIds must be provided");
    }

    // Prepare the OneSignal notification payload
    const notificationPayload: any = {
      app_id: ONESIGNAL_APP_ID,
      target_channel: "push",
      headings: { en: title, pt: title },
      contents: { en: message, pt: message },
    };

    // Add target users
    if (userId) {
      notificationPayload.include_aliases = {
        external_id: [userId]
      };
    } else if (userIds && userIds.length > 0) {
      notificationPayload.include_aliases = {
        external_id: userIds
      };
    }

    // Add optional fields
    if (url) {
      notificationPayload.url = url;
    }

    if (data) {
      notificationPayload.data = data;
    }

    console.log("Sending notification with payload:", JSON.stringify(notificationPayload, null, 2));

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
  } catch (error: any) {
    console.error("Error sending push notification:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: error.message === "Unauthorized" ? 401 : 400,
      }
    );
  }
});

