-- Fix the trigger_process_scheduled_notifications function
-- Remove the problematic cleanup code that references non-existent column

CREATE OR REPLACE FUNCTION public.trigger_process_scheduled_notifications()
RETURNS void AS $$
DECLARE
  v_url TEXT;
  v_key TEXT;
  v_request_id BIGINT;
BEGIN
  -- Get credentials from settings table
  SELECT value INTO v_url FROM public.settings WHERE key = 'supabase_url' LIMIT 1;
  SELECT value INTO v_key FROM public.settings WHERE key = 'supabase_service_role_key' LIMIT 1;

  IF v_url IS NOT NULL AND v_key IS NOT NULL AND v_url <> '' AND v_key <> '' THEN
    -- Make the HTTP request
    SELECT INTO v_request_id
      net.http_post(
        url := v_url || '/functions/v1/process-scheduled-notifications',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_key
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 5000
      );
    
    RAISE NOTICE 'Scheduled notification request sent with ID: %', v_request_id;
  ELSE
    RAISE WARNING 'Scheduled notifications skipped: supabase_url or supabase_service_role_key not configured in public.settings';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in trigger_process_scheduled_notifications: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.trigger_process_scheduled_notifications IS 'Triggers the Edge Function to process scheduled notifications. Requires supabase_url and supabase_service_role_key in settings table.';
