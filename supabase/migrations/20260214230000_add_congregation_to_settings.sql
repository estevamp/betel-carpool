-- Add congregation_id to settings table to make settings per-congregation
-- This allows each congregation to have independent configuration

-- Step 1: Add congregation_id column (nullable initially)
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS congregation_id UUID REFERENCES public.congregations(id) ON DELETE CASCADE;

-- Step 2: Drop the old unique constraint on key
ALTER TABLE public.settings DROP CONSTRAINT IF EXISTS settings_key_key;

-- Step 3: Create new unique constraint on (key, congregation_id)
-- This allows the same key to exist for different congregations
ALTER TABLE public.settings 
ADD CONSTRAINT settings_key_congregation_unique UNIQUE (key, congregation_id);

-- Step 4: Migrate existing global settings to each congregation
-- For each congregation, create a copy of the current settings
DO $$
DECLARE
    cong_record RECORD;
    setting_record RECORD;
BEGIN
    -- Get all existing settings (these are currently global)
    FOR setting_record IN 
        SELECT key, value, type 
        FROM public.settings 
        WHERE congregation_id IS NULL
    LOOP
        -- For each congregation, create a copy of this setting
        FOR cong_record IN SELECT id FROM public.congregations LOOP
            INSERT INTO public.settings (key, value, type, congregation_id)
            VALUES (setting_record.key, setting_record.value, setting_record.type, cong_record.id)
            ON CONFLICT (key, congregation_id) DO NOTHING;
        END LOOP;
    END LOOP;
    
    -- Delete the old global settings (where congregation_id is NULL)
    DELETE FROM public.settings WHERE congregation_id IS NULL;
END $$;

-- Step 5: Make congregation_id NOT NULL now that all settings have it
ALTER TABLE public.settings 
ALTER COLUMN congregation_id SET NOT NULL;

-- Step 6: Update RLS policies for settings
DROP POLICY IF EXISTS "Users can view settings" ON public.settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.settings;
DROP POLICY IF EXISTS "Admins can insert settings" ON public.settings;
DROP POLICY IF EXISTS "Super admins can manage all settings" ON public.settings;

-- Allow users to view settings from their congregation
CREATE POLICY "Users can view their congregation settings"
ON public.settings FOR SELECT
USING (
    congregation_id = (SELECT congregation_id FROM public.profiles WHERE user_id = auth.uid())
    OR public.is_super_admin()
);

-- Allow admins to update settings for their congregation
CREATE POLICY "Admins can update their congregation settings"
ON public.settings FOR UPDATE
USING (
    (
        EXISTS (
            SELECT 1 FROM public.congregation_administrators
            WHERE congregation_id = settings.congregation_id
            AND profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
        )
        OR public.is_super_admin()
    )
);

-- Allow admins to insert settings for their congregation
CREATE POLICY "Admins can insert their congregation settings"
ON public.settings FOR INSERT
WITH CHECK (
    (
        EXISTS (
            SELECT 1 FROM public.congregation_administrators
            WHERE congregation_id = settings.congregation_id
            AND profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
        )
        OR public.is_super_admin()
    )
);

-- Allow admins to delete settings for their congregation
CREATE POLICY "Admins can delete their congregation settings"
ON public.settings FOR DELETE
USING (
    (
        EXISTS (
            SELECT 1 FROM public.congregation_administrators
            WHERE congregation_id = settings.congregation_id
            AND profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
        )
        OR public.is_super_admin()
    )
);

-- Step 7: Create a trigger to automatically create default settings for new congregations
CREATE OR REPLACE FUNCTION public.create_default_settings_for_congregation()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert default settings for the new congregation
    INSERT INTO public.settings (key, value, type, congregation_id) VALUES
        ('trip_value', '15.00', 'decimal', NEW.id),
        ('show_transport_help', 'true', 'boolean', NEW.id),
        ('max_passengers', '4', 'integer', NEW.id),
        ('closing_day', '31', 'integer', NEW.id)
    ON CONFLICT (key, congregation_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS create_default_settings_on_congregation_insert ON public.congregations;

CREATE TRIGGER create_default_settings_on_congregation_insert
    AFTER INSERT ON public.congregations
    FOR EACH ROW
    EXECUTE FUNCTION public.create_default_settings_for_congregation();

-- Step 8: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_settings_congregation_id ON public.settings(congregation_id);
