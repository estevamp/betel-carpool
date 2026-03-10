


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "hypopg" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "index_advisor" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."app_role" AS ENUM (
    'admin',
    'user',
    'super_admin'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE TYPE "public"."sex_type" AS ENUM (
    'Homem',
    'Mulher'
);


ALTER TYPE "public"."sex_type" OWNER TO "postgres";


CREATE TYPE "public"."trip_type" AS ENUM (
    'Ida e Volta',
    'Apenas Ida',
    'Apenas Volta'
);


ALTER TYPE "public"."trip_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_assign_congregation_to_absence"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- If congregation_id is not set, use the profile's congregation
    IF NEW.congregation_id IS NULL THEN
        NEW.congregation_id := (
            SELECT congregation_id 
            FROM public.profiles 
            WHERE id = NEW.profile_id
        );
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_assign_congregation_to_absence"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_assign_congregation_to_evacuation_car"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- If congregation_id is not set, use the driver's congregation
    IF NEW.congregation_id IS NULL THEN
        NEW.congregation_id := (
            SELECT congregation_id 
            FROM public.profiles 
            WHERE id = NEW.driver_id
        );
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_assign_congregation_to_evacuation_car"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_assign_congregation_to_ride_request"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- If congregation_id is not set, use the profile's congregation
    IF NEW.congregation_id IS NULL THEN
        NEW.congregation_id := (
            SELECT congregation_id 
            FROM public.profiles 
            WHERE id = NEW.profile_id
        );
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_assign_congregation_to_ride_request"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_assign_congregation_to_transaction"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- If congregation_id is not set, use the debtor's congregation
    IF NEW.congregation_id IS NULL THEN
        NEW.congregation_id := (
            SELECT congregation_id 
            FROM public.profiles 
            WHERE id = NEW.debtor_id
        );
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_assign_congregation_to_transaction"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_assign_congregation_to_transfer"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- If congregation_id is not set, use the debtor's congregation
    IF NEW.congregation_id IS NULL THEN
        NEW.congregation_id := (
            SELECT congregation_id 
            FROM public.profiles 
            WHERE id = NEW.debtor_id
        );
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_assign_congregation_to_transfer"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_assign_congregation_to_trip"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- If congregation_id is not set, use the driver's congregation
    IF NEW.congregation_id IS NULL THEN
        NEW.congregation_id := (
            SELECT congregation_id 
            FROM public.profiles 
            WHERE id = NEW.driver_id
        );
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_assign_congregation_to_trip"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_access_congregation"("_congregation_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT (
        public.is_super_admin()
        OR public.get_current_congregation_id() = _congregation_id
        OR public.is_congregation_admin(_congregation_id)
    )
$$;


ALTER FUNCTION "public"."can_access_congregation"("_congregation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_user_signup"("user_email" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  profile_exists BOOLEAN;
  normalized_email TEXT;
BEGIN
  -- Normalize email
  normalized_email := LOWER(TRIM(user_email));
  
  -- Check if a profile exists with this email
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE LOWER(TRIM(email)) = normalized_email
  ) INTO profile_exists;
  
  RETURN profile_exists;
END;
$$;


ALTER FUNCTION "public"."can_user_signup"("user_email" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."can_user_signup"("user_email" "text") IS 'Checks if a user with the given email can sign up (i.e., has a pre-existing profile created by an admin invite)';



CREATE OR REPLACE FUNCTION "public"."can_view_trip"("trip_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.trips t
        LEFT JOIN public.congregation_administrators ca
            ON t.congregation_id = ca.congregation_id
            AND ca.profile_id = public.get_profile_id_from_user_id(auth.uid())
        WHERE t.id = trip_id
        AND (
            public.is_super_admin()
            OR t.driver_id = public.get_profile_id_from_user_id(auth.uid())
            OR EXISTS (
                SELECT 1
                FROM public.trip_passengers tp
                WHERE tp.trip_id = t.id
                  AND tp.passenger_id = public.get_profile_id_from_user_id(auth.uid())
            )
            OR (t.congregation_id = public.get_current_congregation_id() AND auth.role() = 'authenticated')
        )
    );
END;
$$;


ALTER FUNCTION "public"."can_view_trip"("trip_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_default_settings_for_congregation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO public.settings (key, value, type, congregation_id) VALUES
        ('trip_value',          '15.00', 'decimal',  NEW.id),
        ('show_transport_help', 'true',  'boolean',  NEW.id),
        ('max_passengers',      '4',     'integer',  NEW.id),
        ('closing_day',         '31',    'integer',  NEW.id),
        ('trip_lock_enabled',   'false', 'boolean',  NEW.id),
        ('trip_lock_hours',     '2',     'integer',  NEW.id)
    ON CONFLICT (key, congregation_id) DO NOTHING;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_default_settings_for_congregation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_auth_user_email"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$;


ALTER FUNCTION "public"."get_auth_user_email"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_congregation_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT congregation_id FROM public.profiles WHERE user_id = auth.uid()
$$;


ALTER FUNCTION "public"."get_current_congregation_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_profile_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
$$;


ALTER FUNCTION "public"."get_current_profile_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_user_email"() RETURNS "text"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Return NULL if no user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  -- Try to get email from JWT first (most reliable for OAuth)
  BEGIN
    SELECT auth.jwt() ->> 'email' INTO user_email;
  EXCEPTION WHEN OTHERS THEN
    user_email := NULL;
  END;

  -- If not in JWT, try from auth.users table
  IF user_email IS NULL THEN
    BEGIN
      SELECT email INTO user_email
      FROM auth.users
      WHERE id = auth.uid();
    EXCEPTION WHEN OTHERS THEN
      user_email := NULL;
    END;
  END IF;

  RETURN LOWER(user_email);
END;
$$;


ALTER FUNCTION "public"."get_current_user_email"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_profile"() RETURNS TABLE("id" "uuid", "user_id" "uuid", "full_name" "text", "email" "text", "sex" "text", "is_exempt" boolean, "pix_key" "text", "is_married" boolean, "is_driver" boolean, "show_tips" boolean, "spouse_id" "uuid", "congregation_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Return the profile for the current authenticated user
    -- SECURITY DEFINER allows this to bypass RLS
    RETURN QUERY
    SELECT 
        p.id,
        p.user_id,
        p.full_name,
        p.email,
        p.sex,
        p.is_exempt,
        p.pix_key,
        p.is_married,
        p.is_driver,
        p.show_tips,
        p.spouse_id,
        p.congregation_id
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
    LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_my_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_profile_by_email"("user_email" "text") RETURNS TABLE("id" "uuid", "user_id" "uuid", "full_name" "text", "email" "text", "sex" "text", "is_exempt" boolean, "pix_key" "text", "is_married" boolean, "is_driver" boolean, "show_tips" boolean, "spouse_id" "uuid", "congregation_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Return the profile matching the email
    -- SECURITY DEFINER allows this to bypass RLS
    -- Only return if the email matches the current user's email
    IF LOWER(user_email) = LOWER((SELECT auth.email())) THEN
        RETURN QUERY
        SELECT 
            p.id,
            p.user_id,
            p.full_name,
            p.email,
            p.sex,
            p.is_exempt,
            p.pix_key,
            p.is_married,
            p.is_driver,
            p.show_tips,
            p.spouse_id,
            p.congregation_id
        FROM public.profiles p
        WHERE LOWER(p.email) = LOWER(user_email)
        LIMIT 1;
    END IF;
END;
$$;


ALTER FUNCTION "public"."get_profile_by_email"("user_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_profile_id_from_user_id"("p_user_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    profile_id uuid;
BEGIN
    SELECT id INTO profile_id FROM public.profiles WHERE user_id = p_user_id;
    RETURN profile_id;
END;
$$;


ALTER FUNCTION "public"."get_profile_id_from_user_id"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
        AND role::text = _role
    )
$$;


ALTER FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
        AND role = _role
    )
$$;


ALTER FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_congregation_admin"("_congregation_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.congregation_administrators ca
        WHERE ca.profile_id = public.get_current_profile_id()
        AND ca.congregation_id = _congregation_id
    )
$$;


ALTER FUNCTION "public"."is_congregation_admin"("_congregation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_super_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT public.has_role(auth.uid(), 'super_admin')
$$;


ALTER FUNCTION "public"."is_super_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_process_scheduled_notifications"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_url TEXT;
  v_key TEXT;
  v_request_id BIGINT;
BEGIN
  -- Get credentials from settings table
  SELECT value INTO v_url FROM public.settings WHERE key = 'supabase_url' LIMIT 1;
  SELECT value INTO v_key FROM public.settings WHERE key = 'supabase_service_role_key' LIMIT 1;

  IF v_url IS NOT NULL AND v_key IS NOT NULL AND v_url <> '' AND v_key <> '' THEN
    -- Make the HTTP request
    SELECT INTO v_request_id
      net.http_post(
        url := v_url || '/functions/v1/process-scheduled-notifications',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_key
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 5000
      );

    RAISE NOTICE 'Scheduled notification request sent with ID: %', v_request_id;
  ELSE
    RAISE WARNING 'Scheduled notifications skipped: supabase_url or supabase_service_role_key not configured in public.settings';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in trigger_process_scheduled_notifications: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."trigger_process_scheduled_notifications"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."trigger_process_scheduled_notifications"() IS 'Triggers the Edge Function to process scheduled notifications. Requires supabase_url and supabase_service_role_key in settings table.';



CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_profile_has_user_id"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  profile_user_id UUID;
BEGIN
  -- Get the user_id from the profile
  SELECT user_id INTO profile_user_id
  FROM public.profiles
  WHERE id = NEW.profile_id;

  -- Check if profile has a linked user_id
  IF profile_user_id IS NULL THEN
    RAISE EXCEPTION 'Não é possível designar um administrador para um perfil que ainda não fez login. O usuário deve fazer login pelo menos uma vez antes de ser designado como administrador.';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_profile_has_user_id"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."absences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "congregation_id" "uuid",
    "start_date" timestamp with time zone NOT NULL,
    "end_date" timestamp with time zone NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."absences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."congregation_administrators" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "congregation_id" "uuid" NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."congregation_administrators" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."congregations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."congregations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."evacuation_cars" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "driver_id" "uuid" NOT NULL,
    "congregation_id" "uuid",
    "destination" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."evacuation_cars" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."evacuation_passengers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "evacuation_car_id" "uuid" NOT NULL,
    "passenger_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."evacuation_passengers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."faq" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question" "text" NOT NULL,
    "answer" "text" NOT NULL,
    "order_index" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."faq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "congregation_id" "uuid" NOT NULL,
    "message" "text" DEFAULT 'Não se esqueça de informar seus arranjos de transporte para a congregação.'::"text" NOT NULL,
    "scheduled_days" integer[] DEFAULT '{}'::integer[],
    "scheduled_time" time without time zone DEFAULT '08:00:00'::time without time zone,
    "is_enabled" boolean DEFAULT false,
    "last_run_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notification_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "full_name" "text" NOT NULL,
    "email" "text",
    "sex" "public"."sex_type",
    "is_exempt" boolean DEFAULT false,
    "pix_key" "text",
    "is_married" boolean DEFAULT false,
    "is_driver" boolean DEFAULT false,
    "show_tips" boolean DEFAULT true,
    "spouse_id" "uuid",
    "congregation_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ride_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "congregation_id" "uuid",
    "requested_date" timestamp with time zone NOT NULL,
    "is_fulfilled" boolean DEFAULT false,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ride_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "value" "text" NOT NULL,
    "type" "text" DEFAULT 'string'::"text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "congregation_id" "uuid" NOT NULL
);


ALTER TABLE "public"."settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "creditor_id" "uuid" NOT NULL,
    "debtor_id" "uuid" NOT NULL,
    "trip_id" "uuid",
    "congregation_id" "uuid",
    "amount" numeric NOT NULL,
    "month" "text" NOT NULL,
    "trip_type" "public"."trip_type",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transfers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "creditor_id" "uuid" NOT NULL,
    "debtor_id" "uuid" NOT NULL,
    "congregation_id" "uuid",
    "amount" numeric NOT NULL,
    "month" "text" NOT NULL,
    "is_paid" boolean DEFAULT false,
    "paid_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."transfers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trip_passengers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "passenger_id" "uuid" NOT NULL,
    "trip_type" "public"."trip_type" DEFAULT 'Ida e Volta'::"public"."trip_type",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."trip_passengers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trips" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "driver_id" "uuid" NOT NULL,
    "congregation_id" "uuid",
    "departure_at" timestamp with time zone NOT NULL,
    "return_at" timestamp with time zone,
    "max_passengers" integer DEFAULT 4,
    "is_urgent" boolean DEFAULT false,
    "is_betel_car" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."trips" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."app_role" DEFAULT 'user'::"public"."app_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."absences"
    ADD CONSTRAINT "absences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."congregation_administrators"
    ADD CONSTRAINT "congregation_administrators_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."congregations"
    ADD CONSTRAINT "congregations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."evacuation_cars"
    ADD CONSTRAINT "evacuation_cars_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."evacuation_passengers"
    ADD CONSTRAINT "evacuation_passengers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."faq"
    ADD CONSTRAINT "faq_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_settings"
    ADD CONSTRAINT "notification_settings_congregation_id_key" UNIQUE ("congregation_id");



ALTER TABLE ONLY "public"."notification_settings"
    ADD CONSTRAINT "notification_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ride_requests"
    ADD CONSTRAINT "ride_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_key_congregation_unique" UNIQUE ("key", "congregation_id");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transfers"
    ADD CONSTRAINT "transfers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trip_passengers"
    ADD CONSTRAINT "trip_passengers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trips"
    ADD CONSTRAINT "trips_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_settings_congregation_id" ON "public"."settings" USING "btree" ("congregation_id");



CREATE OR REPLACE TRIGGER "create_default_settings_on_congregation_insert" AFTER INSERT ON "public"."congregations" FOR EACH ROW EXECUTE FUNCTION "public"."create_default_settings_for_congregation"();



CREATE OR REPLACE TRIGGER "set_notification_settings_updated_at" BEFORE UPDATE ON "public"."notification_settings" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



ALTER TABLE ONLY "public"."absences"
    ADD CONSTRAINT "absences_congregation_id_fkey" FOREIGN KEY ("congregation_id") REFERENCES "public"."congregations"("id");



ALTER TABLE ONLY "public"."absences"
    ADD CONSTRAINT "absences_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."congregation_administrators"
    ADD CONSTRAINT "congregation_administrators_congregation_id_fkey" FOREIGN KEY ("congregation_id") REFERENCES "public"."congregations"("id");



ALTER TABLE ONLY "public"."congregation_administrators"
    ADD CONSTRAINT "congregation_administrators_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."evacuation_cars"
    ADD CONSTRAINT "evacuation_cars_congregation_id_fkey" FOREIGN KEY ("congregation_id") REFERENCES "public"."congregations"("id");



ALTER TABLE ONLY "public"."evacuation_cars"
    ADD CONSTRAINT "evacuation_cars_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."evacuation_passengers"
    ADD CONSTRAINT "evacuation_passengers_evacuation_car_id_fkey" FOREIGN KEY ("evacuation_car_id") REFERENCES "public"."evacuation_cars"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."evacuation_passengers"
    ADD CONSTRAINT "evacuation_passengers_passenger_id_fkey" FOREIGN KEY ("passenger_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."notification_settings"
    ADD CONSTRAINT "notification_settings_congregation_id_fkey" FOREIGN KEY ("congregation_id") REFERENCES "public"."congregations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_congregation_id_fkey" FOREIGN KEY ("congregation_id") REFERENCES "public"."congregations"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_spouse_id_fkey" FOREIGN KEY ("spouse_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."ride_requests"
    ADD CONSTRAINT "ride_requests_congregation_id_fkey" FOREIGN KEY ("congregation_id") REFERENCES "public"."congregations"("id");



ALTER TABLE ONLY "public"."ride_requests"
    ADD CONSTRAINT "ride_requests_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_congregation_id_fkey" FOREIGN KEY ("congregation_id") REFERENCES "public"."congregations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_congregation_id_fkey" FOREIGN KEY ("congregation_id") REFERENCES "public"."congregations"("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_creditor_id_fkey" FOREIGN KEY ("creditor_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_debtor_id_fkey" FOREIGN KEY ("debtor_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id");



ALTER TABLE ONLY "public"."transfers"
    ADD CONSTRAINT "transfers_congregation_id_fkey" FOREIGN KEY ("congregation_id") REFERENCES "public"."congregations"("id");



ALTER TABLE ONLY "public"."transfers"
    ADD CONSTRAINT "transfers_creditor_id_fkey" FOREIGN KEY ("creditor_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."transfers"
    ADD CONSTRAINT "transfers_debtor_id_fkey" FOREIGN KEY ("debtor_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."trip_passengers"
    ADD CONSTRAINT "trip_passengers_passenger_id_fkey" FOREIGN KEY ("passenger_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."trip_passengers"
    ADD CONSTRAINT "trip_passengers_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id");



ALTER TABLE ONLY "public"."trips"
    ADD CONSTRAINT "trips_congregation_id_fkey" FOREIGN KEY ("congregation_id") REFERENCES "public"."congregations"("id");



ALTER TABLE ONLY "public"."trips"
    ADD CONSTRAINT "trips_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "public"."profiles"("id");



CREATE POLICY "Absences are viewable by congregation members" ON "public"."absences" FOR SELECT TO "authenticated" USING (("public"."is_super_admin"() OR ("congregation_id" = "public"."get_current_congregation_id"())));



CREATE POLICY "Admins and super admins can manage FAQ" ON "public"."faq" TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))) OR "public"."is_super_admin"()));



CREATE POLICY "Admins and super admins can manage settings" ON "public"."settings" TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))) OR "public"."is_super_admin"()));



CREATE POLICY "Admins can delete congregation administrators" ON "public"."congregation_administrators" FOR DELETE TO "authenticated" USING (("public"."has_role"("auth"."uid"(), 'super_admin'::"text") OR ("public"."has_role"("auth"."uid"(), 'admin'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."congregation_id" = "congregation_administrators"."congregation_id")))))));



CREATE POLICY "Admins can delete their congregation settings" ON "public"."settings" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."congregation_administrators"
  WHERE (("congregation_administrators"."congregation_id" = "settings"."congregation_id") AND ("congregation_administrators"."profile_id" = ( SELECT "profiles"."id"
           FROM "public"."profiles"
          WHERE ("profiles"."user_id" = "auth"."uid"())))))) OR "public"."is_super_admin"()));



CREATE POLICY "Admins can insert congregation administrators" ON "public"."congregation_administrators" FOR INSERT TO "authenticated" WITH CHECK (("public"."has_role"("auth"."uid"(), 'super_admin'::"text") OR ("public"."has_role"("auth"."uid"(), 'admin'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."congregation_id" = "congregation_administrators"."congregation_id")))))));



CREATE POLICY "Admins can insert their congregation notification settings" ON "public"."notification_settings" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."congregation_administrators"
  WHERE (("congregation_administrators"."congregation_id" = "notification_settings"."congregation_id") AND ("congregation_administrators"."profile_id" = ( SELECT "profiles"."id"
           FROM "public"."profiles"
          WHERE ("profiles"."user_id" = "auth"."uid"())))))) OR "public"."is_super_admin"()));



CREATE POLICY "Admins can insert their congregation settings" ON "public"."settings" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."congregation_administrators"
  WHERE (("congregation_administrators"."congregation_id" = "settings"."congregation_id") AND ("congregation_administrators"."profile_id" = ( SELECT "profiles"."id"
           FROM "public"."profiles"
          WHERE ("profiles"."user_id" = "auth"."uid"())))))) OR "public"."is_super_admin"()));



CREATE POLICY "Admins can manage evacuation passengers" ON "public"."evacuation_passengers" TO "authenticated" USING (("public"."is_super_admin"() OR "public"."has_role"("auth"."uid"(), 'admin'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."evacuation_cars" "ec"
  WHERE (("ec"."id" = "evacuation_passengers"."evacuation_car_id") AND "public"."is_congregation_admin"("ec"."congregation_id")))))) WITH CHECK (("public"."is_super_admin"() OR "public"."has_role"("auth"."uid"(), 'admin'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."evacuation_cars" "ec"
  WHERE (("ec"."id" = "evacuation_passengers"."evacuation_car_id") AND "public"."is_congregation_admin"("ec"."congregation_id"))))));



CREATE POLICY "Admins can update congregation administrators" ON "public"."congregation_administrators" FOR UPDATE TO "authenticated" USING (("public"."has_role"("auth"."uid"(), 'super_admin'::"text") OR ("public"."has_role"("auth"."uid"(), 'admin'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."congregation_id" = "congregation_administrators"."congregation_id")))))));



CREATE POLICY "Admins can update congregation profiles" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("public"."is_super_admin"() OR ("public"."has_role"("auth"."uid"(), 'admin'::"text") AND ("congregation_id" = "public"."get_current_congregation_id"()))));



CREATE POLICY "Admins can update their congregation notification settings" ON "public"."notification_settings" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."congregation_administrators"
  WHERE (("congregation_administrators"."congregation_id" = "notification_settings"."congregation_id") AND ("congregation_administrators"."profile_id" = ( SELECT "profiles"."id"
           FROM "public"."profiles"
          WHERE ("profiles"."user_id" = "auth"."uid"())))))) OR "public"."is_super_admin"()));



CREATE POLICY "Admins can update their congregation settings" ON "public"."settings" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."congregation_administrators"
  WHERE (("congregation_administrators"."congregation_id" = "settings"."congregation_id") AND ("congregation_administrators"."profile_id" = ( SELECT "profiles"."id"
           FROM "public"."profiles"
          WHERE ("profiles"."user_id" = "auth"."uid"())))))) OR "public"."is_super_admin"()));



CREATE POLICY "Admins can view their congregation notification settings" ON "public"."notification_settings" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."congregation_administrators"
  WHERE (("congregation_administrators"."congregation_id" = "notification_settings"."congregation_id") AND ("congregation_administrators"."profile_id" = ( SELECT "profiles"."id"
           FROM "public"."profiles"
          WHERE ("profiles"."user_id" = "auth"."uid"())))))) OR "public"."is_super_admin"()));



CREATE POLICY "Allow select for owner" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR ("lower"("email") = "lower"(("auth"."jwt"() ->> 'email'::"text")))));



CREATE POLICY "Allow select for owner and superadmin" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR ("email" = "auth"."email"()) OR (EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'super_admin'::"public"."app_role"))))));



CREATE POLICY "Allow superadmin to see all" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'super_admin'::"public"."app_role")))));



CREATE POLICY "Allow users to read their own roles" ON "public"."user_roles" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Authorized users can insert profiles" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) OR "public"."is_super_admin"() OR ("public"."has_role"("auth"."uid"(), 'admin'::"text") AND ("congregation_id" = "public"."get_current_congregation_id"())) OR "public"."is_congregation_admin"("congregation_id")));



CREATE POLICY "Congregation administrators are viewable by authenticated users" ON "public"."congregation_administrators" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'super_admin'::"public"."app_role")))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."congregation_id" = "congregation_administrators"."congregation_id") AND (EXISTS ( SELECT 1
           FROM "public"."user_roles"
          WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))))))));



CREATE POLICY "Congregation members can add passengers to evacuation cars" ON "public"."evacuation_passengers" FOR INSERT TO "authenticated" WITH CHECK (("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."is_super_admin"() OR (("passenger_id" = "public"."get_current_profile_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."evacuation_cars" "ec"
  WHERE (("ec"."id" = "evacuation_passengers"."evacuation_car_id") AND (("ec"."congregation_id" = "public"."get_current_congregation_id"()) OR "public"."is_super_admin"()))))) OR (EXISTS ( SELECT 1
   FROM "public"."evacuation_cars" "ec"
  WHERE (("ec"."id" = "evacuation_passengers"."evacuation_car_id") AND ("ec"."driver_id" = "public"."get_current_profile_id"()))))));



CREATE POLICY "Congregation members can remove passengers from evacuation cars" ON "public"."evacuation_passengers" FOR DELETE TO "authenticated" USING (("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."is_super_admin"() OR ("passenger_id" = "public"."get_current_profile_id"()) OR (EXISTS ( SELECT 1
   FROM "public"."evacuation_cars" "ec"
  WHERE (("ec"."id" = "evacuation_passengers"."evacuation_car_id") AND ("ec"."driver_id" = "public"."get_current_profile_id"()))))));



CREATE POLICY "Congregations are viewable by authenticated users" ON "public"."congregations" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'super_admin'::"public"."app_role")))) OR ("id" IN ( SELECT "profiles"."congregation_id"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"()))) OR ("id" IN ( SELECT "ca"."congregation_id"
   FROM ("public"."congregation_administrators" "ca"
     JOIN "public"."profiles" "p" ON (("ca"."profile_id" = "p"."id")))
  WHERE ("p"."user_id" = "auth"."uid"())))));



CREATE POLICY "Drivers and admins can delete trips" ON "public"."trips" FOR DELETE TO "authenticated" USING (((("driver_id" = "public"."get_current_profile_id"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"text") OR "public"."is_super_admin"()) AND ("public"."is_super_admin"() OR ("congregation_id" = "public"."get_current_congregation_id"()))));



CREATE POLICY "Drivers and admins can update trips" ON "public"."trips" FOR UPDATE TO "authenticated" USING (((("driver_id" = "public"."get_current_profile_id"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"text") OR "public"."is_super_admin"()) AND ("public"."is_super_admin"() OR ("congregation_id" = "public"."get_current_congregation_id"()))));



CREATE POLICY "Drivers can add passengers to their cars" ON "public"."evacuation_passengers" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."evacuation_cars" "ec"
  WHERE (("ec"."id" = "evacuation_passengers"."evacuation_car_id") AND ("ec"."driver_id" = "public"."get_current_profile_id"())))));



CREATE POLICY "Drivers can create trips" ON "public"."trips" FOR INSERT TO "authenticated" WITH CHECK (((("driver_id" = "public"."get_current_profile_id"()) OR ("public"."is_congregation_admin"("congregation_id") AND (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "trips"."driver_id") AND ("p"."congregation_id" = "trips"."congregation_id"))))) OR "public"."is_super_admin"()) AND ("public"."is_super_admin"() OR ("congregation_id" = "public"."get_current_congregation_id"()))));



CREATE POLICY "Drivers can delete their evacuation cars" ON "public"."evacuation_cars" FOR DELETE TO "authenticated" USING (((("driver_id" = "public"."get_current_profile_id"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) AND ("public"."is_super_admin"() OR ("congregation_id" = "public"."get_current_congregation_id"()))));



CREATE POLICY "Drivers can insert their evacuation cars" ON "public"."evacuation_cars" FOR INSERT TO "authenticated" WITH CHECK (((("driver_id" = "public"."get_current_profile_id"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) AND ("public"."is_super_admin"() OR ("congregation_id" IS NULL) OR ("congregation_id" = "public"."get_current_congregation_id"()))));



CREATE POLICY "Drivers can manage their evacuation cars" ON "public"."evacuation_cars" TO "authenticated" USING ((("driver_id" = "public"."get_current_profile_id"()) OR "public"."is_super_admin"() OR "public"."has_role"("auth"."uid"(), 'admin'::"text") OR "public"."is_congregation_admin"("congregation_id"))) WITH CHECK ((("driver_id" = "public"."get_current_profile_id"()) OR "public"."is_super_admin"() OR "public"."has_role"("auth"."uid"(), 'admin'::"text") OR "public"."is_congregation_admin"("congregation_id")));



CREATE POLICY "Drivers can remove passengers from their cars" ON "public"."evacuation_passengers" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."evacuation_cars" "ec"
  WHERE (("ec"."id" = "evacuation_passengers"."evacuation_car_id") AND ("ec"."driver_id" = "public"."get_current_profile_id"())))));



CREATE POLICY "Drivers can update their evacuation cars" ON "public"."evacuation_cars" FOR UPDATE TO "authenticated" USING (((("driver_id" = "public"."get_current_profile_id"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) AND ("public"."is_super_admin"() OR ("congregation_id" = "public"."get_current_congregation_id"()))));



CREATE POLICY "Evacuation cars are viewable by congregation members" ON "public"."evacuation_cars" FOR SELECT TO "authenticated" USING (("public"."is_super_admin"() OR ("congregation_id" = "public"."get_current_congregation_id"()) OR "public"."is_congregation_admin"("congregation_id") OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."congregation_id" = "evacuation_cars"."congregation_id"))))));



CREATE POLICY "Evacuation passengers are viewable by authenticated users" ON "public"."evacuation_passengers" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Profiles are viewable by authenticated users" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Profiles can be updated by authorized users" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."is_super_admin"() OR ("public"."has_role"("auth"."uid"(), 'admin'::"text") AND ("congregation_id" = "public"."get_current_congregation_id"())) OR (("user_id" IS NULL) AND ("lower"("email") = "public"."get_current_user_email"())))) WITH CHECK ((("user_id" = "auth"."uid"()) OR "public"."is_super_admin"() OR ("public"."has_role"("auth"."uid"(), 'admin'::"text") AND ("congregation_id" = "public"."get_current_congregation_id"()))));



CREATE POLICY "Ride requests are viewable by congregation members" ON "public"."ride_requests" FOR SELECT TO "authenticated" USING (("public"."is_super_admin"() OR ("congregation_id" = "public"."get_current_congregation_id"())));



CREATE POLICY "Super admins can delete congregations" ON "public"."congregations" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'super_admin'::"public"."app_role")))));



CREATE POLICY "Super admins can insert congregations" ON "public"."congregations" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'super_admin'::"public"."app_role")))));



CREATE POLICY "Super admins can update congregations" ON "public"."congregations" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'super_admin'::"public"."app_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'super_admin'::"public"."app_role")))));



CREATE POLICY "Trip passengers are viewable by authenticated users" ON "public"."trip_passengers" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Trips are viewable by congregation members" ON "public"."trips" FOR SELECT TO "authenticated" USING (("public"."is_super_admin"() OR ("congregation_id" = "public"."get_current_congregation_id"())));



CREATE POLICY "User roles are viewable by authenticated users" ON "public"."user_roles" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can create trips" ON "public"."trips" FOR INSERT TO "authenticated" WITH CHECK ((("driver_id" = "public"."get_current_profile_id"()) OR "public"."is_super_admin"() OR ("public"."is_congregation_admin"("congregation_id") AND (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "trips"."driver_id") AND ("p"."congregation_id" = "public"."get_current_congregation_id"())))))));



CREATE POLICY "Users can delete their own absences" ON "public"."absences" FOR DELETE TO "authenticated" USING ((("profile_id" = "public"."get_current_profile_id"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"text")));



CREATE POLICY "Users can delete their own ride requests" ON "public"."ride_requests" FOR DELETE TO "authenticated" USING ((("profile_id" = "public"."get_current_profile_id"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"text")));



CREATE POLICY "Users can insert their own absences" ON "public"."absences" FOR INSERT TO "authenticated" WITH CHECK ((("profile_id" = "public"."get_current_profile_id"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"text")));



CREATE POLICY "Users can insert their own ride requests" ON "public"."ride_requests" FOR INSERT TO "authenticated" WITH CHECK ((("profile_id" = "public"."get_current_profile_id"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"text")));



CREATE POLICY "Users can manage their own absences" ON "public"."absences" TO "authenticated" USING (((("profile_id" = "public"."get_current_profile_id"()) OR "public"."is_congregation_admin"("public"."get_current_congregation_id"()) OR "public"."is_super_admin"()) AND ("public"."is_super_admin"() OR ("congregation_id" = "public"."get_current_congregation_id"())))) WITH CHECK (((("profile_id" = "public"."get_current_profile_id"()) OR ("public"."is_congregation_admin"("congregation_id") AND (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "absences"."profile_id") AND ("p"."congregation_id" = "absences"."congregation_id"))))) OR "public"."is_super_admin"()) AND ("public"."is_super_admin"() OR ("congregation_id" = "public"."get_current_congregation_id"()))));



CREATE POLICY "Users can manage their own ride requests" ON "public"."ride_requests" TO "authenticated" USING (((("profile_id" = "public"."get_current_profile_id"()) OR "public"."is_congregation_admin"("public"."get_current_congregation_id"()) OR "public"."is_super_admin"()) AND ("public"."is_super_admin"() OR ("congregation_id" = "public"."get_current_congregation_id"())))) WITH CHECK (((("profile_id" = "public"."get_current_profile_id"()) OR ("public"."is_congregation_admin"("congregation_id") AND (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "ride_requests"."profile_id") AND ("p"."congregation_id" = "ride_requests"."congregation_id"))))) OR "public"."is_super_admin"()) AND ("public"."is_super_admin"() OR ("congregation_id" = "public"."get_current_congregation_id"()))));



CREATE POLICY "Users can update their own absences" ON "public"."absences" FOR UPDATE TO "authenticated" USING ((("profile_id" = "public"."get_current_profile_id"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"text")));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."is_super_admin"()));



CREATE POLICY "Users can update their own ride requests" ON "public"."ride_requests" FOR UPDATE TO "authenticated" USING ((("profile_id" = "public"."get_current_profile_id"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"text")));



CREATE POLICY "Users can update their transfers as paid" ON "public"."transfers" FOR UPDATE TO "authenticated" USING (("public"."is_super_admin"() OR ((("debtor_id" = "public"."get_current_profile_id"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"text")) AND ("congregation_id" = "public"."get_current_congregation_id"())))) WITH CHECK (("public"."is_super_admin"() OR ((("debtor_id" = "public"."get_current_profile_id"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"text")) AND ("congregation_id" = "public"."get_current_congregation_id"()))));



CREATE POLICY "Users can view their congregation settings" ON "public"."settings" FOR SELECT USING ((("congregation_id" = ( SELECT "profiles"."congregation_id"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"()))) OR "public"."is_super_admin"()));



CREATE POLICY "Users can view their own absences" ON "public"."absences" FOR SELECT TO "authenticated" USING ((("profile_id" = "public"."get_current_profile_id"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"text")));



CREATE POLICY "Users can view their own ride requests" ON "public"."ride_requests" FOR SELECT TO "authenticated" USING ((("profile_id" = "public"."get_current_profile_id"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"text")));



CREATE POLICY "Users can view their own transactions" ON "public"."transactions" FOR SELECT TO "authenticated" USING (("public"."is_super_admin"() OR ((("debtor_id" = "public"."get_current_profile_id"()) OR ("creditor_id" = "public"."get_current_profile_id"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"text")) AND ("congregation_id" = "public"."get_current_congregation_id"()))));



CREATE POLICY "Users can view their own transfers" ON "public"."transfers" FOR SELECT TO "authenticated" USING (("public"."is_super_admin"() OR ((("debtor_id" = "public"."get_current_profile_id"()) OR ("creditor_id" = "public"."get_current_profile_id"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"text")) AND ("congregation_id" = "public"."get_current_congregation_id"()))));



CREATE POLICY "Users or drivers can add passengers" ON "public"."trip_passengers" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'super_admin'::"public"."app_role")))) OR ("passenger_id" IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1
   FROM ("public"."trips" "t"
     JOIN "public"."profiles" "p" ON (("t"."driver_id" = "p"."id")))
  WHERE (("t"."id" = "trip_passengers"."trip_id") AND ("p"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM (("public"."trips" "t"
     JOIN "public"."congregation_administrators" "ca" ON (("t"."congregation_id" = "ca"."congregation_id")))
     JOIN "public"."profiles" "p" ON (("ca"."profile_id" = "p"."id")))
  WHERE (("t"."id" = "trip_passengers"."trip_id") AND ("p"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users or drivers can remove passengers" ON "public"."trip_passengers" FOR DELETE USING ((("passenger_id" = "public"."get_current_profile_id"()) OR (EXISTS ( SELECT 1
   FROM "public"."trips"
  WHERE (("trips"."id" = "trip_passengers"."trip_id") AND ("trips"."driver_id" = "public"."get_current_profile_id"())))) OR "public"."is_super_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."trips" "t"
  WHERE (("t"."id" = "trip_passengers"."trip_id") AND "public"."is_congregation_admin"("t"."congregation_id")))) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



ALTER TABLE "public"."absences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."congregation_administrators" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."congregations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."evacuation_cars" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."evacuation_passengers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."faq" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ride_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."transfers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trip_passengers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trips" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";








GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";


















































































































































































































GRANT ALL ON FUNCTION "public"."auto_assign_congregation_to_absence"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_assign_congregation_to_absence"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_assign_congregation_to_absence"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_assign_congregation_to_evacuation_car"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_assign_congregation_to_evacuation_car"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_assign_congregation_to_evacuation_car"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_assign_congregation_to_ride_request"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_assign_congregation_to_ride_request"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_assign_congregation_to_ride_request"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_assign_congregation_to_transaction"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_assign_congregation_to_transaction"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_assign_congregation_to_transaction"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_assign_congregation_to_transfer"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_assign_congregation_to_transfer"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_assign_congregation_to_transfer"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_assign_congregation_to_trip"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_assign_congregation_to_trip"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_assign_congregation_to_trip"() TO "service_role";



GRANT ALL ON FUNCTION "public"."can_access_congregation"("_congregation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_access_congregation"("_congregation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_access_congregation"("_congregation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_user_signup"("user_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."can_user_signup"("user_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_user_signup"("user_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_view_trip"("trip_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_view_trip"("trip_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_view_trip"("trip_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_default_settings_for_congregation"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_default_settings_for_congregation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_default_settings_for_congregation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_auth_user_email"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_auth_user_email"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_auth_user_email"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_congregation_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_congregation_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_congregation_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_profile_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_profile_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_profile_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_user_email"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_user_email"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_email"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_profile_by_email"("user_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_profile_by_email"("user_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_profile_by_email"("user_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_profile_id_from_user_id"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_profile_id_from_user_id"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_profile_id_from_user_id"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "anon";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_congregation_admin"("_congregation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_congregation_admin"("_congregation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_congregation_admin"("_congregation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_process_scheduled_notifications"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_process_scheduled_notifications"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_process_scheduled_notifications"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_profile_has_user_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_profile_has_user_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_profile_has_user_id"() TO "service_role";






























GRANT ALL ON TABLE "public"."absences" TO "anon";
GRANT ALL ON TABLE "public"."absences" TO "authenticated";
GRANT ALL ON TABLE "public"."absences" TO "service_role";



GRANT ALL ON TABLE "public"."congregation_administrators" TO "anon";
GRANT ALL ON TABLE "public"."congregation_administrators" TO "authenticated";
GRANT ALL ON TABLE "public"."congregation_administrators" TO "service_role";



GRANT ALL ON TABLE "public"."congregations" TO "anon";
GRANT ALL ON TABLE "public"."congregations" TO "authenticated";
GRANT ALL ON TABLE "public"."congregations" TO "service_role";



GRANT ALL ON TABLE "public"."evacuation_cars" TO "anon";
GRANT ALL ON TABLE "public"."evacuation_cars" TO "authenticated";
GRANT ALL ON TABLE "public"."evacuation_cars" TO "service_role";



GRANT ALL ON TABLE "public"."evacuation_passengers" TO "anon";
GRANT ALL ON TABLE "public"."evacuation_passengers" TO "authenticated";
GRANT ALL ON TABLE "public"."evacuation_passengers" TO "service_role";



GRANT ALL ON TABLE "public"."faq" TO "anon";
GRANT ALL ON TABLE "public"."faq" TO "authenticated";
GRANT ALL ON TABLE "public"."faq" TO "service_role";



GRANT ALL ON TABLE "public"."notification_settings" TO "anon";
GRANT ALL ON TABLE "public"."notification_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_settings" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."ride_requests" TO "anon";
GRANT ALL ON TABLE "public"."ride_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."ride_requests" TO "service_role";



GRANT ALL ON TABLE "public"."settings" TO "anon";
GRANT ALL ON TABLE "public"."settings" TO "authenticated";
GRANT ALL ON TABLE "public"."settings" TO "service_role";



GRANT ALL ON TABLE "public"."transactions" TO "anon";
GRANT ALL ON TABLE "public"."transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions" TO "service_role";



GRANT ALL ON TABLE "public"."transfers" TO "anon";
GRANT ALL ON TABLE "public"."transfers" TO "authenticated";
GRANT ALL ON TABLE "public"."transfers" TO "service_role";



GRANT ALL ON TABLE "public"."trip_passengers" TO "anon";
GRANT ALL ON TABLE "public"."trip_passengers" TO "authenticated";
GRANT ALL ON TABLE "public"."trip_passengers" TO "service_role";



GRANT ALL ON TABLE "public"."trips" TO "anon";
GRANT ALL ON TABLE "public"."trips" TO "authenticated";
GRANT ALL ON TABLE "public"."trips" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































