-- Fix Out of Memory in pg_net/pg_cron by adding a timeout and cleanup logic
-- This migration updates the trigger function to be more memory-efficient and populates settings

-- 1. Ensure the settings table has a primary key constraint
-- We do this in a separate step to ensure it's committed before the INSERT
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'settings_pkey') THEN
        ALTER TABLE public.settings ADD PRIMARY KEY (key);
    END IF;
EXCEPTION
    WHEN others THEN 
        -- If it fails, it might be because of duplicate keys or already existing PK with different name
        RAISE NOTICE 'Could not add primary key: %', SQLERRM;
END $$;

-- 2. Populate settings using a more robust approach that doesn't rely on ON CONFLICT if it fails
DELETE FROM public.settings WHERE key IN ('supabase_url', 'supabase_service_role_key');

INSERT INTO public.settings (key, value, type)
VALUES 
  ('supabase_url', 'https://lipkaxjfwwamwlscgujt.supabase.co', 'string'),
  ('supabase_service_role_key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpcGtheGpmd3dhbXdsc2NndWp0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDE1MDMxOCwiZXhwIjoyMDg1NzI2MzE4fQ.us-5Gs7jbzNROD0C0M1dq4tx7og_x-xivVszgDtDBJc', 'string');

-- 3. Update the trigger function
CREATE OR REPLACE FUNCTION public.trigger_process_scheduled_notifications()
RETURNS void AS $$
DECLARE
  v_url TEXT;
  v_key TEXT;
BEGIN
  -- Get credentials from settings table
  SELECT value INTO v_url FROM public.settings WHERE key = 'supabase_url' LIMIT 1;
  SELECT value INTO v_key FROM public.settings WHERE key = 'supabase_service_role_key' LIMIT 1;

  -- Check if credentials exist and are not empty
  IF v_url IS NOT NULL AND v_key IS NOT NULL AND v_url <> '' AND v_key <> '' THEN
    -- Use net.http_post with a explicit timeout to prevent hanging connections
    -- We use TRIM to ensure no hidden spaces/newlines cause auth failure
    -- We also log the attempt for debugging (visible in postgres logs)
    RAISE NOTICE 'Triggering notification function at %', TRIM(v_url);
    
    PERFORM
      net.http_post(
        url := TRIM(v_url) || '/functions/v1/process-scheduled-notifications',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || TRIM(v_key),
          'apikey', TRIM(v_key)
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 5000
      );
    
    -- Cleanup old requests from pg_net queue to prevent memory bloat
    -- Note: pg_net uses 'id' (bigserial) which is roughly chronological
    -- We delete records that are not in the most recent 1000 to keep the table small
    DELETE FROM net.http_request_queue
    WHERE id NOT IN (
        SELECT id FROM net.http_request_queue
        ORDER BY id DESC
        LIMIT 1000
    );
    
  ELSE
    RAISE WARNING 'Scheduled notifications skipped: supabase_url or supabase_service_role_key not found or empty in public.settings';
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.trigger_process_scheduled_notifications IS 'Triggers the Edge Function to process scheduled notifications with memory safety and cleanup.';
