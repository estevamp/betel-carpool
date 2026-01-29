-- ============================================
-- BETELITAS TRANSPORTATION SYSTEM - DATABASE SCHEMA
-- ============================================

-- Create enum for sex
CREATE TYPE public.sex_type AS ENUM ('Homem', 'Mulher');

-- Create enum for trip types
CREATE TYPE public.trip_type AS ENUM ('Ida e Volta', 'Apenas Ida', 'Apenas Volta');

-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- ============================================
-- PROFILES TABLE (linked to auth.users)
-- ============================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT,
    sex sex_type,
    is_exempt BOOLEAN DEFAULT FALSE,
    pix_key TEXT,
    is_married BOOLEAN DEFAULT FALSE,
    is_driver BOOLEAN DEFAULT FALSE,
    show_tips BOOLEAN DEFAULT TRUE,
    spouse_id UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ============================================
-- USER ROLES TABLE (separate from profiles for security)
-- ============================================
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE (user_id, role)
);

-- ============================================
-- TRIPS TABLE
-- ============================================
CREATE TABLE public.trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_betel_car BOOLEAN DEFAULT FALSE,
    is_urgent BOOLEAN DEFAULT FALSE,
    departure_at TIMESTAMP WITH TIME ZONE NOT NULL,
    return_at TIMESTAMP WITH TIME ZONE,
    max_passengers INTEGER DEFAULT 4,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ============================================
-- TRIP PASSENGERS TABLE
-- ============================================
CREATE TABLE public.trip_passengers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
    passenger_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    trip_type trip_type DEFAULT 'Ida e Volta',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(trip_id, passenger_id)
);

-- ============================================
-- ABSENCES TABLE
-- ============================================
CREATE TABLE public.absences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ============================================
-- RIDE REQUESTS TABLE (Procura de Vagas)
-- ============================================
CREATE TABLE public.ride_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    requested_date TIMESTAMP WITH TIME ZONE NOT NULL,
    notes TEXT,
    is_fulfilled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ============================================
-- EVACUATION CARS TABLE (Desocupação)
-- ============================================
CREATE TABLE public.evacuation_cars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    destination TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ============================================
-- EVACUATION PASSENGERS TABLE
-- ============================================
CREATE TABLE public.evacuation_passengers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evacuation_car_id UUID REFERENCES public.evacuation_cars(id) ON DELETE CASCADE NOT NULL,
    passenger_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(evacuation_car_id, passenger_id)
);

-- ============================================
-- TRANSACTIONS TABLE (Financial)
-- ============================================
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
    debtor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    creditor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    trip_type trip_type,
    month TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ============================================
-- TRANSFERS TABLE (Optimized monthly transfers)
-- ============================================
CREATE TABLE public.transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    month TEXT NOT NULL,
    debtor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    creditor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    is_paid BOOLEAN DEFAULT FALSE,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ============================================
-- SETTINGS TABLE
-- ============================================
CREATE TABLE public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    type TEXT DEFAULT 'string',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Insert default settings
INSERT INTO public.settings (key, value, type) VALUES
    ('trip_value', '15.00', 'decimal'),
    ('show_transport_help', 'true', 'boolean'),
    ('max_passengers', '4', 'integer'),
    ('closing_day', '31', 'integer');

-- ============================================
-- FAQ TABLE
-- ============================================
CREATE TABLE public.faq (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Insert default FAQs
INSERT INTO public.faq (question, answer, order_index) VALUES
    ('Como as transferências são calculadas?', 'O sistema calcula automaticamente os débitos e créditos com base nas viagens realizadas. Cada viagem de ida e volta custa R$ 15,00 (valor configurável). Se você fizer apenas ida ou apenas volta, paga R$ 7,50. No final do mês, o sistema otimiza as transferências para minimizar a quantidade de transações necessárias entre os betelitas.', 1),
    ('Como o aplicativo considera as esposas nos cálculos?', 'Para casais, os débitos e créditos da esposa são automaticamente vinculados ao marido. Isso significa que se a esposa viaja como passageira, o débito aparece no relatório do marido.', 2),
    ('Por que preciso fazer login no aplicativo?', 'O login permite que o sistema identifique você e mostre suas informações personalizadas: suas viagens, seu relatório financeiro, suas reservas, etc.', 3),
    ('Como preencho meu perfil após fazer login?', 'Após o primeiro login, você será direcionado para a página de perfil onde pode adicionar suas informações: nome completo, email, sexo, se é motorista (possui veículo), chave PIX para receber pagamentos.', 4),
    ('O que faço se eu mudar de motorista ou passageiro na última hora?', 'Se precisar cancelar sua reserva ou mudar de viagem, acesse Minhas Viagens e cancele a reserva atual. Depois, procure a nova viagem desejada e faça uma nova reserva.', 5),
    ('Como vejo as viagens disponíveis?', 'Acesse a seção Viagens no menu lateral. Lá você verá todas as viagens programadas com vagas disponíveis. Você pode filtrar por data e buscar por motorista ou passageiro.', 6);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
        AND role = _role
    )
$$;

-- Function to get current user's profile id
CREATE OR REPLACE FUNCTION public.get_current_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
$$;

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trips_updated_at
    BEFORE UPDATE ON public.trips
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_evacuation_cars_updated_at
    BEFORE UPDATE ON public.evacuation_cars
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_settings_updated_at
    BEFORE UPDATE ON public.settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_faq_updated_at
    BEFORE UPDATE ON public.faq
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_passengers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evacuation_cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evacuation_passengers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- PROFILES POLICIES
CREATE POLICY "Profiles are viewable by authenticated users"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- USER ROLES POLICIES
CREATE POLICY "User roles are viewable by authenticated users"
    ON public.user_roles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can manage user roles"
    ON public.user_roles FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- TRIPS POLICIES
CREATE POLICY "Trips are viewable by authenticated users"
    ON public.trips FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Drivers can create trips"
    ON public.trips FOR INSERT
    TO authenticated
    WITH CHECK (driver_id = public.get_current_profile_id());

CREATE POLICY "Drivers can update their own trips"
    ON public.trips FOR UPDATE
    TO authenticated
    USING (driver_id = public.get_current_profile_id() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Drivers can delete their own trips"
    ON public.trips FOR DELETE
    TO authenticated
    USING (driver_id = public.get_current_profile_id() OR public.has_role(auth.uid(), 'admin'));

-- TRIP PASSENGERS POLICIES
CREATE POLICY "Trip passengers are viewable by authenticated users"
    ON public.trip_passengers FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can add themselves as passengers"
    ON public.trip_passengers FOR INSERT
    TO authenticated
    WITH CHECK (passenger_id = public.get_current_profile_id() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can remove themselves as passengers"
    ON public.trip_passengers FOR DELETE
    TO authenticated
    USING (passenger_id = public.get_current_profile_id() OR public.has_role(auth.uid(), 'admin'));

-- ABSENCES POLICIES
CREATE POLICY "Absences are viewable by authenticated users"
    ON public.absences FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can manage their own absences"
    ON public.absences FOR ALL
    TO authenticated
    USING (profile_id = public.get_current_profile_id() OR public.has_role(auth.uid(), 'admin'));

-- RIDE REQUESTS POLICIES
CREATE POLICY "Ride requests are viewable by authenticated users"
    ON public.ride_requests FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can manage their own ride requests"
    ON public.ride_requests FOR ALL
    TO authenticated
    USING (profile_id = public.get_current_profile_id() OR public.has_role(auth.uid(), 'admin'));

-- EVACUATION CARS POLICIES
CREATE POLICY "Evacuation cars are viewable by authenticated users"
    ON public.evacuation_cars FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Drivers can manage their evacuation cars"
    ON public.evacuation_cars FOR ALL
    TO authenticated
    USING (driver_id = public.get_current_profile_id() OR public.has_role(auth.uid(), 'admin'));

-- EVACUATION PASSENGERS POLICIES
CREATE POLICY "Evacuation passengers are viewable by authenticated users"
    ON public.evacuation_passengers FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can manage evacuation passengers"
    ON public.evacuation_passengers FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- TRANSACTIONS POLICIES
CREATE POLICY "Users can view their own transactions"
    ON public.transactions FOR SELECT
    TO authenticated
    USING (
        debtor_id = public.get_current_profile_id() 
        OR creditor_id = public.get_current_profile_id()
        OR public.has_role(auth.uid(), 'admin')
    );

-- TRANSFERS POLICIES
CREATE POLICY "Users can view their own transfers"
    ON public.transfers FOR SELECT
    TO authenticated
    USING (
        debtor_id = public.get_current_profile_id() 
        OR creditor_id = public.get_current_profile_id()
        OR public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Users can update their transfers as paid"
    ON public.transfers FOR UPDATE
    TO authenticated
    USING (debtor_id = public.get_current_profile_id() OR public.has_role(auth.uid(), 'admin'));

-- SETTINGS POLICIES
CREATE POLICY "Settings are viewable by authenticated users"
    ON public.settings FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can manage settings"
    ON public.settings FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- FAQ POLICIES
CREATE POLICY "FAQ is viewable by everyone"
    ON public.faq FOR SELECT
    USING (is_active = true);

CREATE POLICY "Admins can manage FAQ"
    ON public.faq FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_trips_driver_id ON public.trips(driver_id);
CREATE INDEX idx_trips_departure_at ON public.trips(departure_at);
CREATE INDEX idx_trip_passengers_trip_id ON public.trip_passengers(trip_id);
CREATE INDEX idx_trip_passengers_passenger_id ON public.trip_passengers(passenger_id);
CREATE INDEX idx_absences_profile_id ON public.absences(profile_id);
CREATE INDEX idx_ride_requests_profile_id ON public.ride_requests(profile_id);
CREATE INDEX idx_transactions_month ON public.transactions(month);
CREATE INDEX idx_transfers_month ON public.transfers(month);