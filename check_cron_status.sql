-- Run this query in Supabase SQL Editor to check cron job status
-- This will show you all current cron jobs and their configuration

SELECT 
    jobid,
    jobname,
    schedule,
    command,
    nodename,
    nodeport,
    database,
    username,
    active,
    jobid
FROM cron.job
ORDER BY jobname;

-- To see the last run times and results:
SELECT 
    runid,
    jobid,
    job_pid,
    database,
    username,
    command,
    status,
    return_message,
    start_time,
    end_time
FROM cron.job_run_details
WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname = 'process-notifications')
ORDER BY start_time DESC
LIMIT 20;
