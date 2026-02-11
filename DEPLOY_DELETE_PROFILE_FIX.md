# Deploy Delete Profile CORS Fix

## Problem
The `delete-profile` edge function was returning CORS errors because:
1. The CORS headers configuration didn't match other working edge functions
2. The OPTIONS preflight response format was incorrect
3. Error responses were using `throw` instead of returning proper HTTP responses with CORS headers

## Changes Made
Updated [`supabase/functions/delete-profile/index.ts`](supabase/functions/delete-profile/index.ts):

1. **Fixed CORS headers** - Removed `Access-Control-Allow-Methods` to match working functions
2. **Fixed OPTIONS response** - Changed from `new Response("ok", { status: 200, headers: corsHeaders })` to `new Response(null, { headers: corsHeaders })`
3. **Improved error handling** - Replaced `throw new Error()` with proper HTTP responses:
   - 401 for authentication errors
   - 403 for authorization errors
   - 404 for not found errors
   - 400 for bad requests
   - 500 for unexpected errors

## Deployment Steps

### Option 1: Deploy via Supabase CLI (Recommended)
```bash
npx supabase functions deploy delete-profile
```

### Option 2: Deploy via Supabase Dashboard
1. Go to https://supabase.com/dashboard/project/lipkaxjfwwamwlscgujt/functions
2. Find the `delete-profile` function
3. Click "Deploy new version"
4. Copy the contents of `supabase/functions/delete-profile/index.ts`
5. Paste and deploy

### Option 3: Deploy all functions
```bash
npx supabase functions deploy
```

## Verification
After deployment, test by:
1. Go to the Betelitas page
2. Try to delete a betelita profile
3. The CORS error should be resolved

## Error Before Fix
```
Access to fetch at 'https://lipkaxjfwwamwlscgujt.supabase.co/functions/v1/delete-profile' 
from origin 'https://id-preview--072eb106-3197-4f9d-94b3-798fdd2a6cf4.lovable.app' 
has been blocked by CORS policy: Response to preflight request doesn't pass access control check: 
It does not have HTTP ok status.
```

## Expected Result After Fix
The delete operation should work without CORS errors, and proper error messages should be displayed to the user when applicable.
