-- This migration ensures pg_cron and pg_net are enabled, creates the settings table,
-- and sets up the function and cron job for scheduled notifications.

-- 1. Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Ensure settings table exists
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    type TEXT DEFAULT 'string',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Create the trigger function
CREATE OR REPLACE FUNCTION public.trigger_process_scheduled_notifications()
RETURNS void AS $$
DECLARE
  v_url TEXT;
  v_key TEXT;
BEGIN
  -- Get credentials from settings table
  SELECT value INTO v_url FROM public.settings WHERE key = 'supabase_url' LIMIT 1;
  SELECT value INTO v_key FROM public.settings WHERE key = 'supabase_service_role_key' LIMIT 1;

  IF v_url IS NOT NULL AND v_key IS NOT NULL THEN
    PERFORM
      net.http_post(
        url := v_url || '/functions/v1/process-scheduled-notifications',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_key
        ),
        body := '{}'::jsonb
      );
  ELSE
    RAISE WARNING 'Scheduled notifications skipped: supabase_url or supabase_service_role_key not found in public.settings';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 4. Schedule the cron job (every 10 minutes)
-- We use DO block to avoid error if job already exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-notifications') THEN
        PERFORM cron.schedule('process-notifications', '*/10 * * * *', 'SELECT public.trigger_process_scheduled_notifications()');
    END IF;
END $$;

-- 5. Insert placeholder settings if they don't exist
INSERT INTO public.settings (key, value, type)
VALUES 
('supabase_url', '', 'string'),
('supabase_service_role_key', '', 'string')
ON CONFLICT (key) DO NOTHING;

COMMENT ON FUNCTION public.trigger_process_scheduled_notifications IS 'Triggers the Edge Function to process scheduled notifications. Requires supabase_url and supabase_service_role_key in settings table.';
