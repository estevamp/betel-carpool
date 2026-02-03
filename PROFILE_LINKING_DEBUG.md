# Profile Linking Debug Guide

## Current Issue
The debug logs show: `[DEBUG] Any profile with this email: null`

This means **NO profile exists in the database** with the email `estevampalombi@gmail.com`.

## Possible Causes

1. **Profile was never created**: The admin needs to create a profile with this email first
2. **Email mismatch**: The profile exists but with a different email (typo, case difference, etc.)
3. **Profile was deleted**: The profile existed but was removed from the database

## How to Fix

### Option 1: Create the Profile (Recommended)
The admin should:
1. Log in as admin/super-admin
2. Go to the Betelitas page
3. Create a new profile with:
   - Email: `estevampalombi@gmail.com` (exact match)
   - Full name and other required fields
   - **Important**: Leave the user_id as NULL (don't link it yet)

### Option 2: Check for Email Mismatch
1. Navigate to `/debug-profiles` while logged in as super-admin
2. Look for a profile with a similar email (e.g., different case, typo)
3. If found, update that profile's email to match exactly: `estevampalombi@gmail.com`

### Option 3: Direct Database Query (Super-Admin Only)
If you have access to Supabase dashboard:

```sql
-- Check if profile exists with any variation of the email
SELECT id, full_name, email, user_id, congregation_id, created_at
FROM profiles
WHERE LOWER(email) LIKE '%estevampalombi%'
ORDER BY created_at DESC;

-- Check all unlinked profiles
SELECT id, full_name, email, user_id, congregation_id, created_at
FROM profiles
WHERE user_id IS NULL
ORDER BY created_at DESC;
```

## Expected Flow

1. **Admin creates profile**:
   ```sql
   INSERT INTO profiles (full_name, email, congregation_id, user_id)
   VALUES ('Estevam Palombi', 'estevampalombi@gmail.com', '<congregation_id>', NULL);
   ```

2. **User logs in for first time**:
   - Auth creates auth.user with email `estevampalombi@gmail.com`
   - AuthContext searches for unlinked profile with matching email
   - AuthContext links the profile by setting user_id

3. **User logs in subsequently**:
   - AuthContext finds profile by user_id
   - No linking needed

## Current RLS Policy

The SELECT policy allows viewing unlinked profiles:
```sql
CREATE POLICY "Profiles are viewable by authenticated users"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        public.is_super_admin()
        OR congregation_id = public.get_current_congregation_id()
        OR (user_id IS NULL AND email = auth.email())
    );
```

This means:
- Super-admins can see all profiles
- Regular users can see profiles in their congregation
- **Any authenticated user can see unlinked profiles with their email**

## Next Steps

1. Check `/debug-profiles` to see what profiles exist
2. If no profile exists, have an admin create one
3. If profile exists with wrong email, update the email
4. Try logging in again after the profile is created/fixed
