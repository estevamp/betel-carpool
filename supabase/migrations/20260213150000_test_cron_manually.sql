-- Manual trigger for testing the scheduled notifications cron job
-- Run this SQL to test the cron job immediately without waiting for the schedule

-- Execute the trigger function directly
SELECT public.trigger_process_scheduled_notifications();

-- Alternative: Check the cron job status
SELECT * FROM cron.job WHERE jobname = 'process-notifications';

-- View recent cron job runs
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-notifications')
ORDER BY start_time DESC 
LIMIT 10;
