-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create notification_settings table
CREATE TABLE IF NOT EXISTS public.notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    congregation_id UUID NOT NULL REFERENCES public.congregations(id) ON DELETE CASCADE,
    message TEXT NOT NULL DEFAULT 'Não se esqueça de informar seus arranjos de transporte para a congregação.',
    scheduled_days INTEGER[] DEFAULT '{}', -- 0=Sunday, 1=Monday, ..., 6=Saturday
    scheduled_time TIME DEFAULT '08:00:00',
    is_enabled BOOLEAN DEFAULT false,
    last_run_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(congregation_id)
);

-- Enable RLS
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_settings
CREATE POLICY "Admins can view their congregation notification settings"
ON public.notification_settings FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.congregation_administrators
        WHERE congregation_id = notification_settings.congregation_id
        AND profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
    OR public.is_super_admin()
);

CREATE POLICY "Admins can update their congregation notification settings"
ON public.notification_settings FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.congregation_administrators
        WHERE congregation_id = notification_settings.congregation_id
        AND profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
    OR public.is_super_admin()
);

CREATE POLICY "Admins can insert their congregation notification settings"
ON public.notification_settings FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.congregation_administrators
        WHERE congregation_id = notification_settings.congregation_id
        AND profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
    OR public.is_super_admin()
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_notification_settings_updated_at
    BEFORE UPDATE ON public.notification_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Insert default settings for existing congregations
INSERT INTO public.notification_settings (congregation_id)
SELECT id FROM public.congregations
ON CONFLICT (congregation_id) DO NOTHING;
