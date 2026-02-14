-- Check and fix the cron job configuration
-- This migration will show current cron jobs and ensure the correct configuration

-- First, let's see what cron jobs exist
DO $$
DECLARE
    job_record RECORD;
BEGIN
    RAISE NOTICE '=== Current Cron Jobs ===';
    FOR job_record IN 
        SELECT jobid, jobname, schedule, command, active
        FROM cron.job
    LOOP
        RAISE NOTICE 'Job ID: %, Name: %, Schedule: %, Active: %', 
            job_record.jobid, 
            job_record.jobname, 
            job_record.schedule, 
            job_record.active;
    END LOOP;
END $$;

-- Remove ALL existing process-notifications jobs (in case there are duplicates)
DO $$
DECLARE
    job_id BIGINT;
BEGIN
    FOR job_id IN 
        SELECT jobid FROM cron.job WHERE jobname = 'process-notifications'
    LOOP
        PERFORM cron.unschedule(job_id);
        RAISE NOTICE 'Removed cron job with ID: %', job_id;
    END LOOP;
END $$;

-- Ensure pg_cron extension is enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Ensure pg_net extension is enabled (needed for http_post)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Recreate the trigger function with better error handling
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
    
    -- Cleanup old requests to prevent memory bloat
    DELETE FROM net.http_request_queue WHERE id IN (
        SELECT id FROM net.http_request_queue
        WHERE created_at < now() - interval '1 hour'
        LIMIT 100
    );
  ELSE
    RAISE WARNING 'Scheduled notifications skipped: supabase_url or supabase_service_role_key not configured in public.settings';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in trigger_process_scheduled_notifications: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule the cron job to run every 1 minute
DO $$
DECLARE
    new_job_id BIGINT;
BEGIN
    -- Schedule new job
    SELECT cron.schedule(
        'process-notifications', 
        '* * * * *',  -- Every 1 minute
        'SELECT public.trigger_process_scheduled_notifications()'
    ) INTO new_job_id;
    
    RAISE NOTICE 'Cron job process-notifications created with ID: % (runs every 1 minute)', new_job_id;
END $$;

-- Verify the job was created
DO $$
DECLARE
    job_record RECORD;
BEGIN
    RAISE NOTICE '=== Verification: Current Cron Jobs After Setup ===';
    FOR job_record IN 
        SELECT jobid, jobname, schedule, command, active
        FROM cron.job
        WHERE jobname = 'process-notifications'
    LOOP
        RAISE NOTICE 'Job ID: %, Name: %, Schedule: %, Active: %', 
            job_record.jobid, 
            job_record.jobname, 
            job_record.schedule, 
            job_record.active;
    END LOOP;
    
    IF NOT FOUND THEN
        RAISE WARNING 'No process-notifications job found after setup!';
    END IF;
END $$;
