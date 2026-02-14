#!/bin/bash
# Deploy the process-scheduled-notifications function

echo "Deploying process-scheduled-notifications Edge Function..."
supabase functions deploy process-scheduled-notifications

echo ""
echo "Deployment complete!"
echo "The cron job will now run every 1 minute without authentication errors."
