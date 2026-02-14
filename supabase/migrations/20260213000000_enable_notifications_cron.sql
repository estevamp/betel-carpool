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

-- Ensure the primary key is recognized for ON CONFLICT
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'settings_pkey') THEN
        ALTER TABLE public.settings ADD PRIMARY KEY (key);
    END IF;
EXCEPTION
    WHEN others THEN NULL;
END $$;

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

  IF v_url IS NOT NULL AND v_key IS NOT NULL AND v_url <> '' AND v_key <> '' THEN
    PERFORM
      net.http_post(
        url := v_url || '/functions/v1/process-scheduled-notifications',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_key
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 5000
      );
    
    -- Cleanup old successful requests to prevent memory bloat in pg_net
    DELETE FROM net.http_request_queue WHERE id IN (
        SELECT id FROM net.http_request_queue
        WHERE created_at < now() - interval '1 hour'
        LIMIT 100
    );
  ELSE
    RAISE WARNING 'Scheduled notifications skipped: supabase_url or supabase_service_role_key not found or empty in public.settings';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 4. Schedule the cron job (every 1 minute)
-- We use a more robust way to ensure the job is updated
DO $$
BEGIN
    -- Remove if exists
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'process-notifications';
    
    -- Schedule new
    PERFORM cron.schedule('process-notifications', '* * * * *', 'SELECT public.trigger_process_scheduled_notifications()');
END $$;

-- 5. Insert placeholder settings if they don't exist
-- We use a simpler approach to avoid ON CONFLICT issues if the table was created without PK initially
INSERT INTO public.settings (key, value, type)
SELECT 'supabase_url', '', 'string'
WHERE NOT EXISTS (SELECT 1 FROM public.settings WHERE key = 'supabase_url');

INSERT INTO public.settings (key, value, type)
SELECT 'supabase_service_role_key', '', 'string'
WHERE NOT EXISTS (SELECT 1 FROM public.settings WHERE key = 'supabase_service_role_key');

COMMENT ON FUNCTION public.trigger_process_scheduled_notifications IS 'Triggers the Edge Function to process scheduled notifications. Requires supabase_url and supabase_service_role_key in settings table.';
