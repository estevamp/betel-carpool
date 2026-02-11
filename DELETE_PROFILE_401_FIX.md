# Fix for 401 Unauthorized Error in delete-profile Edge Function

## Problem
The `delete-profile` Edge Function was returning a 401 Unauthorized error when called from the frontend.

## Root Cause
The Edge Function was not properly authenticating users due to:
1. Overly complex CORS headers that weren't needed
2. Incorrect client initialization pattern
3. Missing error handling in the frontend

## Changes Made

### 1. Edge Function (`supabase/functions/delete-profile/index.ts`)

**Simplified CORS Headers:**
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
```

**Simplified Client Creation:**
- Removed unnecessary `apikey` from headers in the client initialization
- Matched the pattern used in other working Edge Functions like `transfer-user-congregation`
- Simplified error messages

**Before:**
```typescript
const userClient = createClient(supabaseUrl, supabaseAnonKey, {
  global: { 
    headers: { 
      Authorization: authHeader,
      apikey: supabaseAnonKey  // Not needed!
    } 
  },
});
```

**After:**
```typescript
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  global: { headers: { Authorization: authHeader } },
});
```

### 2. Frontend (`src/pages/BetelitasPage.tsx`)

**Added Better Error Handling:**
```typescript
if (!response.ok) {
  const errorText = await response.text();
  console.error("Delete profile error:", response.status, errorText);
  throw new Error(`Erro ao excluir: ${response.status}`);
}
```

This will help debug any future issues by logging the actual error response.

## Deployment Steps

1. **Deploy the updated Edge Function via Supabase Dashboard:**
   - Go to your Supabase project dashboard
   - Navigate to Edge Functions
   - Find `delete-profile` function
   - Deploy the updated code from `supabase/functions/delete-profile/index.ts`

2. **Deploy the frontend changes:**
   ```bash
   npm run build
   # Deploy to your hosting platform (Vercel, Netlify, etc.)
   ```

## Testing

After deployment, test the delete functionality:
1. Log in as an admin user
2. Go to the Betelitas page
3. Try to delete a profile
4. Check the browser console for any errors
5. Verify the profile is deleted successfully

## Additional Notes

- The Edge Function now follows the same authentication pattern as other working functions in the project
- CORS headers have been simplified to only include what's necessary
- Better error logging has been added to help diagnose future issues
- The frontend now properly handles non-200 responses before trying to parse JSON

## If the Error Persists

If you still get a 401 error after deploying these changes, check:

1. **Session validity:** Make sure the user's session hasn't expired
   - Try logging out and logging back in
   
2. **Environment variables:** Verify in Supabase Dashboard that these are set:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

3. **User roles:** Verify the user has admin or super_admin role in the `user_roles` table

4. **Check Edge Function logs:** In Supabase Dashboard > Edge Functions > delete-profile > Logs
   - Look for the console.error messages we added
   - This will show exactly where the authentication is failing
