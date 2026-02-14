-- Check the execution history of the cron job
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
    end_time,
    end_time - start_time as duration
FROM cron.job_run_details
WHERE jobid = 8  -- The jobid from your previous query
ORDER BY start_time DESC
LIMIT 20;

-- Also check if there are any pending or failed requests in pg_net
SELECT 
    id,
    method,
    url,
    headers,
    body,
    timeout_milliseconds,
    created_at,
    error_msg
FROM net.http_request_queue
ORDER BY created_at DESC
LIMIT 20;
