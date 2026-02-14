-- Update the cron job to run every 1 minute instead of every 10 minutes
-- This migration ensures the process-notifications job runs every minute

DO $$
BEGIN
    -- Remove existing job if it exists
    PERFORM cron.unschedule(jobid) 
    FROM cron.job 
    WHERE jobname = 'process-notifications';
    
    -- Schedule new job to run every 1 minute
    PERFORM cron.schedule(
        'process-notifications', 
        '* * * * *',  -- Every 1 minute
        'SELECT public.trigger_process_scheduled_notifications()'
    );
    
    RAISE NOTICE 'Cron job process-notifications updated to run every 1 minute';
END $$;
