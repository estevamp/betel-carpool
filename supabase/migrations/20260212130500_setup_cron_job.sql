-- This migration enables pg_cron and schedules the notification processor
-- Note: pg_cron is usually pre-installed on Supabase but needs to be enabled in the 'extensions' schema or 'public'

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the function to run every 10 minutes
-- We use net.http_post to call the edge function securely
-- You need to replace [PROJECT_REF] and [SERVICE_ROLE_KEY] or use a vault/secret if available.
-- However, a cleaner way in Supabase is to use a wrapper function or call it via SQL if possible.
-- Since we can't easily put the SERVICE_ROLE_KEY here, we'll create a postgres function that calls the edge function.

CREATE OR REPLACE FUNCTION public.trigger_process_scheduled_notifications()
RETURNS void AS $$
BEGIN
  PERFORM
    net.http_post(
      url := (SELECT value FROM settings WHERE key = 'supabase_url' LIMIT 1) || '/functions/v1/process-scheduled-notifications',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT value FROM settings WHERE key = 'supabase_service_role_key' LIMIT 1)
      ),
      body := '{}'::jsonb
    );
END;
$$ LANGUAGE plpgsql;

-- If the 'net' extension (pg_net) is not available, we can use a simpler approach 
-- if the user has configured the vault or we can just provide the cron command for the dashboard.

-- For now, we provide the SQL to schedule it assuming pg_net is available (standard on Supabase)
-- SELECT cron.schedule('process-notifications', '*/10 * * * *', 'SELECT public.trigger_process_scheduled_notifications()');

-- Since I don't have the keys, I will create a migration that at least sets up the structure 
-- and I'll inform the user they might need to add the keys to the 'settings' table or use the Dashboard.

INSERT INTO public.settings (key, value, type)
VALUES 
('supabase_url', '', 'string'),
('supabase_service_role_key', '', 'string')
ON CONFLICT (key) DO NOTHING;

COMMENT ON FUNCTION public.trigger_process_scheduled_notifications IS 'Triggers the Edge Function to process scheduled notifications. Requires supabase_url and supabase_service_role_key in settings table.';
