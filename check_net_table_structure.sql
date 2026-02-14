-- Check the structure of net.http_request_queue table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'net' 
AND table_name = 'http_request_queue'
ORDER BY ordinal_position;
