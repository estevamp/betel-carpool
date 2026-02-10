-- ============================================
-- TEST SCRIPT: Admin Assignment Restrictions
-- ============================================
-- This script tests the constraints that prevent admin assignment
-- before users have logged in for the first time

-- ============================================
-- SETUP: Create test data
-- ============================================

-- Create a test congregation
INSERT INTO public.congregations (name, location)
VALUES ('Congregação Teste', 'Cidade Teste')
RETURNING id;
-- Save the returned id as <test-congregation-id>

-- Create a test profile WITHOUT user_id (user hasn't logged in yet)
INSERT INTO public.profiles (full_name, email, congregation_id)
VALUES ('João Teste', 'joao.teste@example.com', '<test-congregation-id>')
RETURNING id;
-- Save the returned id as <test-profile-id-no-login>

-- Create a test auth user (simulating a logged-in user)
-- Note: This would normally be done by Supabase Auth, but for testing we can insert directly
-- In production, this happens when user signs up/logs in
-- For this test, we'll assume a user exists with id <test-user-id>

-- Create a test profile WITH user_id (user has logged in)
INSERT INTO public.profiles (full_name, email, user_id, congregation_id)
VALUES ('Maria Teste', 'maria.teste@example.com', '<test-user-id>', '<test-congregation-id>')
RETURNING id;
-- Save the returned id as <test-profile-id-with-login>

-- ============================================
-- TEST 1: Attempt to assign admin role to profile WITHOUT user_id
-- ============================================
-- Expected: Should FAIL with constraint violation

BEGIN;
  -- This should fail
  INSERT INTO public.congregation_administrators (profile_id, congregation_id)
  VALUES ('<test-profile-id-no-login>', '<test-congregation-id>');
  
  -- If we reach here, the test FAILED (constraint didn't work)
  RAISE EXCEPTION 'TEST FAILED: Constraint should have prevented this insert';
EXCEPTION
  WHEN OTHERS THEN
    -- Check if the error message is correct
    IF SQLERRM LIKE '%não fez login%' THEN
      RAISE NOTICE 'TEST 1 PASSED: Correctly prevented admin assignment before login';
      RAISE NOTICE 'Error message: %', SQLERRM;
    ELSE
      RAISE EXCEPTION 'TEST 1 FAILED: Wrong error message: %', SQLERRM;
    END IF;
END;
ROLLBACK;

-- ============================================
-- TEST 2: Attempt to assign admin role to profile WITH user_id
-- ============================================
-- Expected: Should SUCCEED

BEGIN;
  -- First, add the 'admin' role to user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES ('<test-user-id>', 'admin');
  
  -- This should succeed
  INSERT INTO public.congregation_administrators (profile_id, congregation_id)
  VALUES ('<test-profile-id-with-login>', '<test-congregation-id>');
  
  -- Verify the insert worked
  IF EXISTS (
    SELECT 1 FROM public.congregation_administrators
    WHERE profile_id = '<test-profile-id-with-login>'
    AND congregation_id = '<test-congregation-id>'
  ) THEN
    RAISE NOTICE 'TEST 2 PASSED: Successfully assigned admin after login';
  ELSE
    RAISE EXCEPTION 'TEST 2 FAILED: Insert did not create record';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'TEST 2 FAILED: Unexpected error: %', SQLERRM;
END;
ROLLBACK;

-- ============================================
-- TEST 3: Attempt to insert user_role with NULL user_id
-- ============================================
-- Expected: Should FAIL with constraint violation

BEGIN;
  -- This should fail
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NULL, 'admin');
  
  -- If we reach here, the test FAILED
  RAISE EXCEPTION 'TEST 3 FAILED: Constraint should have prevented NULL user_id';
EXCEPTION
  WHEN check_violation THEN
    RAISE NOTICE 'TEST 3 PASSED: Correctly prevented NULL user_id in user_roles';
    RAISE NOTICE 'Error message: %', SQLERRM;
  WHEN OTHERS THEN
    RAISE EXCEPTION 'TEST 3 FAILED: Wrong error type: %', SQLERRM;
END;
ROLLBACK;

-- ============================================
-- TEST 4: Simulate user login and then assign admin
-- ============================================
-- Expected: Should SUCCEED after user_id is linked

BEGIN;
  -- Start with profile without user_id
  INSERT INTO public.profiles (full_name, email, congregation_id)
  VALUES ('Pedro Teste', 'pedro.teste@example.com', '<test-congregation-id>')
  RETURNING id INTO <test-profile-id-pedro>;
  
  -- Try to assign admin (should fail)
  BEGIN
    INSERT INTO public.congregation_administrators (profile_id, congregation_id)
    VALUES ('<test-profile-id-pedro>', '<test-congregation-id>');
    RAISE EXCEPTION 'TEST 4a FAILED: Should have prevented admin assignment';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%não fez login%' THEN
        RAISE NOTICE 'TEST 4a PASSED: Correctly prevented admin assignment before login';
      ELSE
        RAISE EXCEPTION 'TEST 4a FAILED: Wrong error: %', SQLERRM;
      END IF;
  END;
  
  -- Simulate user login by linking user_id
  UPDATE public.profiles
  SET user_id = '<test-user-id-pedro>'
  WHERE id = '<test-profile-id-pedro>';
  
  -- Add admin role to user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES ('<test-user-id-pedro>', 'admin');
  
  -- Now try to assign admin (should succeed)
  INSERT INTO public.congregation_administrators (profile_id, congregation_id)
  VALUES ('<test-profile-id-pedro>', '<test-congregation-id>');
  
  -- Verify
  IF EXISTS (
    SELECT 1 FROM public.congregation_administrators
    WHERE profile_id = '<test-profile-id-pedro>'
  ) THEN
    RAISE NOTICE 'TEST 4b PASSED: Successfully assigned admin after login';
  ELSE
    RAISE EXCEPTION 'TEST 4b FAILED: Admin assignment did not work';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'TEST 4 FAILED: Unexpected error: %', SQLERRM;
END;
ROLLBACK;

-- ============================================
-- TEST 5: Verify trigger function exists and is active
-- ============================================

DO $$
DECLARE
  trigger_count INTEGER;
  function_count INTEGER;
BEGIN
  -- Check if trigger exists
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger
  WHERE tgname = 'validate_profile_linked_before_admin_assignment'
  AND tgrelid = 'public.congregation_administrators'::regclass
  AND tgenabled = 'O'; -- O = trigger is enabled
  
  IF trigger_count = 1 THEN
    RAISE NOTICE 'TEST 5a PASSED: Trigger exists and is enabled';
  ELSE
    RAISE EXCEPTION 'TEST 5a FAILED: Trigger not found or not enabled (count: %)', trigger_count;
  END IF;
  
  -- Check if function exists
  SELECT COUNT(*) INTO function_count
  FROM pg_proc
  WHERE proname = 'validate_profile_has_user_id'
  AND pronamespace = 'public'::regnamespace;
  
  IF function_count = 1 THEN
    RAISE NOTICE 'TEST 5b PASSED: Validation function exists';
  ELSE
    RAISE EXCEPTION 'TEST 5b FAILED: Validation function not found';
  END IF;
END;
$$;

-- ============================================
-- TEST 6: Verify constraints exist
-- ============================================

DO $$
DECLARE
  constraint_count INTEGER;
BEGIN
  -- Check user_roles constraint
  SELECT COUNT(*) INTO constraint_count
  FROM pg_constraint
  WHERE conname = 'user_roles_user_must_exist_check'
  AND conrelid = 'public.user_roles'::regclass;
  
  IF constraint_count = 1 THEN
    RAISE NOTICE 'TEST 6a PASSED: user_roles constraint exists';
  ELSE
    RAISE EXCEPTION 'TEST 6a FAILED: user_roles constraint not found';
  END IF;
  
  -- Check congregation_administrators constraint
  SELECT COUNT(*) INTO constraint_count
  FROM pg_constraint
  WHERE conname = 'congregation_administrators_profile_must_be_linked_check'
  AND conrelid = 'public.congregation_administrators'::regclass;
  
  IF constraint_count = 1 THEN
    RAISE NOTICE 'TEST 6b PASSED: congregation_administrators constraint exists';
  ELSE
    RAISE EXCEPTION 'TEST 6b FAILED: congregation_administrators constraint not found';
  END IF;
END;
$$;

-- ============================================
-- CLEANUP: Remove test data
-- ============================================

-- Note: In a real test environment, you would clean up the test data
-- For this script, we're using ROLLBACK in each test block
-- If you ran the tests without transactions, uncomment below:

/*
DELETE FROM public.congregation_administrators
WHERE congregation_id = '<test-congregation-id>';

DELETE FROM public.user_roles
WHERE user_id IN ('<test-user-id>', '<test-user-id-pedro>');

DELETE FROM public.profiles
WHERE email LIKE '%.teste@example.com';

DELETE FROM public.congregations
WHERE name = 'Congregação Teste';
*/

-- ============================================
-- SUMMARY
-- ============================================

RAISE NOTICE '========================================';
RAISE NOTICE 'TEST SUITE COMPLETED';
RAISE NOTICE '========================================';
RAISE NOTICE 'All tests should show PASSED status above';
RAISE NOTICE 'If any test shows FAILED, review the error messages';
RAISE NOTICE '========================================';
