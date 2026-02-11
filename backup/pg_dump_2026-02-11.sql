-- ============================================================
-- pg_dump - Betel Carpool Database
-- Generated: 2026-02-11
-- ============================================================

-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'super_admin');
CREATE TYPE public.sex_type AS ENUM ('Homem', 'Mulher');
CREATE TYPE public.trip_type AS ENUM ('Ida e Volta', 'Apenas Ida', 'Apenas Volta');

-- ============================================================
-- TABLE: congregations
-- ============================================================
CREATE TABLE public.congregations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.congregations (id, name, created_at, updated_at) VALUES
('7bdf82ec-1493-4861-8b7c-83db2b55ac9a', 'Norte - Boituva', '2026-02-01 18:02:44.390456+00', '2026-02-01 18:33:43.211176+00'),
('442f07fe-8169-43a9-be91-48a41aa92645', 'Morro Grande - Tatuí', '2026-02-01 18:33:16.534302+00', '2026-02-01 18:33:16.534302+00'),
('f74c6568-1735-4f01-b137-db560f025327', 'Central - Cerquilho', '2026-02-02 12:49:39.085459+00', '2026-02-02 12:49:39.085459+00'),
('7dc4c4bb-9ad8-420f-a58e-4cdfcb13abc8', 'Jardim Europa - Laranjal Paulista', '2026-02-04 11:25:25.279311+00', '2026-02-04 11:25:25.279311+00'),
('357ad283-5d2a-43bc-8216-fdb1a1be4c05', 'Jardim Itália - Itapetininga', '2026-02-05 11:05:10.382099+00', '2026-02-05 11:05:10.382099+00'),
('21f131bc-a1b5-44b3-bcfe-6381e5a8ffc0', 'Jardim Lírio - Tatuí', '2026-02-06 16:17:38.734134+00', '2026-02-06 16:17:38.734134+00'),
('b2e7f602-72fb-41c5-9d39-ac4554670667', 'Primavera - Tatuí', '2026-02-06 19:55:11.580368+00', '2026-02-06 19:55:11.580368+00'),
('4a6f0833-a5ee-4672-9222-f3a6ac577891', 'Central - Boituva', '2026-02-10 19:12:24.274175+00', '2026-02-10 19:12:24.274175+00'),
('df4dea8d-c737-4a40-a42d-f3937c0b24d0', 'Espanhola - Tatuí', '2026-02-10 19:25:46.593687+00', '2026-02-10 19:25:46.593687+00');

-- ============================================================
-- TABLE: profiles
-- ============================================================
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  full_name text NOT NULL,
  email text,
  sex sex_type,
  is_exempt boolean DEFAULT false,
  pix_key text,
  is_married boolean DEFAULT false,
  is_driver boolean DEFAULT false,
  show_tips boolean DEFAULT true,
  spouse_id uuid REFERENCES public.profiles(id),
  congregation_id uuid REFERENCES public.congregations(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.profiles (id, user_id, full_name, email, sex, is_exempt, pix_key, is_married, is_driver, show_tips, spouse_id, congregation_id, created_at, updated_at) VALUES
('65df814d-0249-45a0-8542-d3acee887c2e', 'eb4960d3-716a-4c14-9abd-0c62e057919d', 'Estevam Palombi', 'estevamp@gmail.com', 'Homem', false, 'estevamp@gmail.com', true, true, true, 'f78b43e5-351e-4a39-8929-5d70ec111752', '7bdf82ec-1493-4861-8b7c-83db2b55ac9a', '2026-01-29 00:45:22.976453+00', '2026-02-06 16:42:15.456731+00'),
('f78b43e5-351e-4a39-8929-5d70ec111752', 'bc90825c-8d9e-4ab0-bc15-2f57a9741b21', 'Aline Palombi', 'alinepalombi@gmail.com', 'Mulher', false, NULL, true, true, true, '65df814d-0249-45a0-8542-d3acee887c2e', '7bdf82ec-1493-4861-8b7c-83db2b55ac9a', '2026-01-29 11:31:42.01696+00', '2026-02-05 22:31:46.263272+00'),
('00000000-0000-0000-0000-000000000001', NULL, 'Visitante', 'placeholder-00000000-0000-0000-0000-000000000001@betel-carpool.local', NULL, true, NULL, false, false, true, NULL, NULL, '2026-02-01 17:21:29.575841+00', '2026-02-03 14:33:34.801508+00'),
('6a36c601-4385-4fc1-a245-c418683bc343', 'f733d40c-c19d-4065-a388-ee48d00e63fb', 'Guilherme Medeiros', NULL, 'Homem', false, NULL, false, false, true, NULL, '442f07fe-8169-43a9-be91-48a41aa92645', '2026-02-02 00:21:29.020811+00', '2026-02-02 19:07:26.0602+00'),
('ea83d376-aca5-4ea0-9852-d167c00fb1a3', '5f6049de-928e-4a32-8b83-18f8dc547c98', 'Jonatã Bessa', 'jonatabessa@gmail.com', 'Homem', false, NULL, true, true, true, '692d0526-e198-4a98-a774-469344829565', '7bdf82ec-1493-4861-8b7c-83db2b55ac9a', '2026-02-02 14:14:05.982699+00', '2026-02-05 23:22:08.555332+00'),
('692d0526-e198-4a98-a774-469344829565', '3ecc5485-484b-475e-9cc6-e3f52309b620', 'Gabriela Bessa', 'gabirosabessa@gmail.com', 'Mulher', false, NULL, true, true, true, 'ea83d376-aca5-4ea0-9852-d167c00fb1a3', '7bdf82ec-1493-4861-8b7c-83db2b55ac9a', '2026-02-02 14:14:30.172979+00', '2026-02-05 23:22:08.232889+00'),
('68fcf48c-1445-4bec-bd9c-92edc6c98bbb', 'cf0d8ae4-d904-4656-abb1-2ab31e2165b9', 'João Paulo', NULL, 'Homem', false, NULL, true, true, true, 'b905fec1-a8de-4294-b39e-8a34d38032e8', '7bdf82ec-1493-4861-8b7c-83db2b55ac9a', '2026-02-02 14:21:15.024605+00', '2026-02-02 14:22:11.484054+00'),
('b905fec1-a8de-4294-b39e-8a34d38032e8', '07888c33-4593-441f-a1fd-b647041f47d5', 'Larissa Santos', NULL, 'Mulher', false, NULL, true, true, true, '68fcf48c-1445-4bec-bd9c-92edc6c98bbb', '7bdf82ec-1493-4861-8b7c-83db2b55ac9a', '2026-02-02 14:21:41.992201+00', '2026-02-02 14:22:11.233452+00'),
('892e7d58-42da-4b79-a7ab-2a83cea4551e', 'db50ecc7-37e4-4217-abdb-898c2f813bac', 'Lucas Pivatto', NULL, 'Homem', false, NULL, false, true, true, NULL, '7bdf82ec-1493-4861-8b7c-83db2b55ac9a', '2026-02-02 14:23:11.090895+00', '2026-02-02 14:23:11.090895+00'),
('b0298383-f483-469c-8db7-aecf95bebe79', 'ee28063e-59ec-454b-a2ff-a4fe488496ef', 'Tércio Simões', 'terciosimoes81@gmail.com', 'Homem', false, NULL, false, true, true, NULL, '442f07fe-8169-43a9-be91-48a41aa92645', '2026-02-03 22:31:03.888262+00', '2026-02-04 00:20:25.792357+00'),
('4d6d8090-81c1-4632-a8ec-a6531c838a3f', '51d828c1-be5a-42ce-b729-2c1c6f153a80', 'Milena Oliveira', NULL, 'Mulher', false, NULL, false, true, true, NULL, '7dc4c4bb-9ad8-420f-a58e-4cdfcb13abc8', '2026-02-04 11:27:05.298128+00', '2026-02-04 11:28:20.945041+00'),
('b268beb2-2588-42a3-924a-7bc596970bb2', 'c40d58e3-7efd-43db-b50c-6039dab8821b', 'Danilo Calori', 'danilocalori40@gmail.com', 'Homem', false, NULL, false, false, true, NULL, 'f74c6568-1735-4f01-b137-db560f025327', '2026-02-04 16:58:23.951086+00', '2026-02-04 16:58:23.951086+00'),
('aaca818b-e217-43a0-aa1d-89967989c48c', '01717f35-dad2-4c2c-a868-56a0623fb04a', 'Rodolfo Ferreira', 'rodolfonferreira@outlook.com', 'Homem', false, NULL, false, false, true, NULL, 'f74c6568-1735-4f01-b137-db560f025327', '2026-02-04 16:58:51.31577+00', '2026-02-04 16:58:51.31577+00'),
('1c920c4e-3309-4071-9f0b-e533db8dc645', 'b0d12bd8-f88f-4d55-9c04-fa3bc8554240', 'Daniel Fuentes', 'danielpfsfs@gmail.com', 'Homem', false, NULL, false, true, true, NULL, '357ad283-5d2a-43bc-8216-fdb1a1be4c05', '2026-02-05 11:06:09.889006+00', '2026-02-05 11:14:31.704568+00'),
('4f635906-ea71-40fb-b930-bff895af4cab', '5b893665-fc2a-4348-bb32-e110924b9803', 'Breno Russon', 'brenobrusson@gmail.com', 'Homem', false, NULL, false, true, true, NULL, 'b2e7f602-72fb-41c5-9d39-ac4554670667', '2026-02-07 18:32:06.064317+00', '2026-02-07 18:33:55.908621+00'),
('33d5305a-3ff2-4b6e-b60a-acef88096b30', NULL, 'Kauã Chiodini', 'kauachiodini@gmail.com', 'Homem', false, NULL, true, true, true, NULL, NULL, '2026-02-08 16:59:17.944485+00', '2026-02-08 16:59:28.379358+00');

-- ============================================================
-- TABLE: user_roles
-- ============================================================
CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.user_roles (id, user_id, role, created_at) VALUES
('7d7e0bb3-5e70-4c7a-977b-72318f4cd1a2', 'eb4960d3-716a-4c14-9abd-0c62e057919d', 'admin', '2026-01-29 23:52:29.625992+00'),
('76e7a565-21a8-4db9-a061-176dfd3381c0', 'eb4960d3-716a-4c14-9abd-0c62e057919d', 'super_admin', '2026-02-01 18:06:08.878038+00'),
('534712e3-2838-409b-8391-3c666f6e2b35', 'ee28063e-59ec-454b-a2ff-a4fe488496ef', 'admin', '2026-02-04 00:20:39.066557+00'),
('bac2f992-0991-4b44-bd62-0e8dc6e1351f', '3ecc5485-484b-475e-9cc6-e3f52309b620', 'admin', '2026-02-04 13:41:55.33816+00'),
('43ea0a5c-4704-43a6-afba-c6f5b74073b2', '5b893665-fc2a-4348-bb32-e110924b9803', 'admin', '2026-02-07 23:15:53.007757+00'),
('2b1b491b-c491-4bab-8510-adb2f33e96fa', 'efbc93bf-2bef-4a4f-9ef6-77aa8e9d692d', 'admin', '2026-02-07 23:22:27.070136+00'),
('0d4ff99e-c75e-4fa3-a31c-4362f7507e5b', 'a8664f0a-dc33-4436-b752-74549fa5c221', 'admin', '2026-02-08 22:32:35.439142+00'),
('8d943e26-6999-4bc2-8d38-644ba990550f', 'b0d12bd8-f88f-4d55-9c04-fa3bc8554240', 'admin', '2026-02-08 23:58:30.171577+00'),
('b95f0906-c98c-4bce-a687-b4a3a6bcc801', '6e616165-4e52-4749-8f8a-e021767f2ae1', 'admin', '2026-02-10 19:20:27.914483+00'),
('65e893e9-07dd-4c05-bbce-1827e102d0a5', 'cded6caa-9d71-435f-aa3d-77776a43e7fd', 'admin', '2026-02-10 20:39:06.678944+00');

-- ============================================================
-- TABLE: congregation_administrators
-- ============================================================
CREATE TABLE public.congregation_administrators (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  congregation_id uuid NOT NULL REFERENCES public.congregations(id),
  profile_id uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.congregation_administrators (id, congregation_id, profile_id, created_at, updated_at) VALUES
('f69681d2-14b1-467e-9d17-2871992dd024', '7bdf82ec-1493-4861-8b7c-83db2b55ac9a', '65df814d-0249-45a0-8542-d3acee887c2e', '2026-02-02 01:26:26.298726+00', '2026-02-02 01:26:26.298726+00'),
('0cc27bff-64d2-4782-aee1-ff90fb584f8f', '442f07fe-8169-43a9-be91-48a41aa92645', 'b0298383-f483-469c-8db7-aecf95bebe79', '2026-02-04 00:20:39.295061+00', '2026-02-04 00:20:39.295061+00'),
('181c2fdc-9e98-4a59-8077-d0bd0834c956', 'f74c6568-1735-4f01-b137-db560f025327', 'b268beb2-2588-42a3-924a-7bc596970bb2', '2026-02-05 00:37:29.4692+00', '2026-02-05 00:37:29.4692+00'),
('cccd963f-fdeb-447e-b578-fcd823c9da40', 'f74c6568-1735-4f01-b137-db560f025327', 'aaca818b-e217-43a0-aa1d-89967989c48c', '2026-02-05 00:37:35.183436+00', '2026-02-05 00:37:35.183436+00'),
('3b451a2d-b3c5-4e90-9705-1cc4732e03a7', 'b2e7f602-72fb-41c5-9d39-ac4554670667', '4f635906-ea71-40fb-b930-bff895af4cab', '2026-02-07 23:15:53.230641+00', '2026-02-07 23:15:53.230641+00'),
('4367298c-657b-499a-8591-9982b4eba82d', '7dc4c4bb-9ad8-420f-a58e-4cdfcb13abc8', '363f2544-afeb-4a91-8852-54eb735d200c', '2026-02-07 23:22:27.288768+00', '2026-02-07 23:22:27.288768+00'),
('3989750e-97f3-44be-a373-fa027238db95', '21f131bc-a1b5-44b3-bcfe-6381e5a8ffc0', 'dcfd697e-09df-418d-b878-5ffec628b2a6', '2026-02-08 22:32:35.674879+00', '2026-02-08 22:32:35.674879+00'),
('0cf01ea4-2997-4d34-904e-9ac8b881d501', '357ad283-5d2a-43bc-8216-fdb1a1be4c05', '1c920c4e-3309-4071-9f0b-e533db8dc645', '2026-02-08 23:58:30.389256+00', '2026-02-08 23:58:30.389256+00'),
('511d43c7-d017-460f-be06-495659b42a21', '4a6f0833-a5ee-4672-9222-f3a6ac577891', '7427b42e-ce57-4179-9bd3-16deff843124', '2026-02-10 19:20:28.13786+00', '2026-02-10 19:20:28.13786+00'),
('0a5f93a8-d836-4f0f-a526-65fe60b97d55', 'df4dea8d-c737-4a40-a42d-f3937c0b24d0', '90ec90e0-68d6-42c1-905f-dd0ac06670d1', '2026-02-10 21:45:23.600347+00', '2026-02-10 21:45:23.600347+00');

-- ============================================================
-- TABLE: trips
-- ============================================================
CREATE TABLE public.trips (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id uuid NOT NULL REFERENCES public.profiles(id),
  congregation_id uuid REFERENCES public.congregations(id),
  departure_at timestamptz NOT NULL,
  return_at timestamptz,
  max_passengers integer DEFAULT 4,
  is_urgent boolean DEFAULT false,
  is_betel_car boolean DEFAULT false,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.trips (id, driver_id, congregation_id, departure_at, return_at, max_passengers, is_urgent, is_betel_car, is_active, notes, created_at, updated_at) VALUES
('dc0f98ba-b288-4bf9-9ab8-c23351b5e791', '65df814d-0249-45a0-8542-d3acee887c2e', '7bdf82ec-1493-4861-8b7c-83db2b55ac9a', '2026-01-31 21:30:00+00', '2026-02-01 00:30:00+00', 4, false, false, true, NULL, '2026-01-29 00:55:00.465762+00', '2026-02-01 18:04:24.969517+00'),
('a1111111-1111-1111-1111-111111111111', '65df814d-0249-45a0-8542-d3acee887c2e', '7bdf82ec-1493-4861-8b7c-83db2b55ac9a', '2025-12-01 19:00:00+00', '2025-12-01 22:00:00+00', 4, false, false, false, 'Viagem 1', '2026-01-30 00:43:02.61543+00', '2026-02-01 18:04:24.969517+00'),
('a4444444-4444-4444-4444-444444444444', '65df814d-0249-45a0-8542-d3acee887c2e', '7bdf82ec-1493-4861-8b7c-83db2b55ac9a', '2025-12-07 09:00:00+00', '2025-12-07 12:00:00+00', 4, false, false, false, 'Viagem 4', '2026-01-30 00:43:02.61543+00', '2026-02-01 18:04:24.969517+00'),
('a7777777-7777-7777-7777-777777777777', '65df814d-0249-45a0-8542-d3acee887c2e', '7bdf82ec-1493-4861-8b7c-83db2b55ac9a', '2025-12-14 09:00:00+00', '2025-12-14 12:00:00+00', 4, false, false, false, 'Viagem 7', '2026-01-30 00:43:02.61543+00', '2026-02-01 18:04:24.969517+00'),
('a9999999-9999-9999-9999-999999999999', '65df814d-0249-45a0-8542-d3acee887c2e', '7bdf82ec-1493-4861-8b7c-83db2b55ac9a', '2025-12-21 09:00:00+00', '2025-12-21 12:00:00+00', 4, false, false, false, 'Viagem 9', '2026-01-30 00:43:02.61543+00', '2026-02-01 18:04:24.969517+00'),
('6cd915b9-5fa2-4cf9-876f-2c8a50632793', '65df814d-0249-45a0-8542-d3acee887c2e', '7bdf82ec-1493-4861-8b7c-83db2b55ac9a', '2026-02-03 21:30:00+00', '2026-02-04 00:30:00+00', 4, false, false, true, NULL, '2026-02-01 17:13:53.369731+00', '2026-02-01 18:04:24.969517+00'),
('78d2d7a4-91bb-4c3d-ab6b-3f677eed51d4', '65df814d-0249-45a0-8542-d3acee887c2e', '7bdf82ec-1493-4861-8b7c-83db2b55ac9a', '2026-02-04 21:30:00+00', '2026-02-05 00:30:00+00', 4, false, true, true, NULL, '2026-02-02 19:05:29.062647+00', '2026-02-02 19:05:29.062647+00'),
('b7df7793-7c3f-4536-b33d-511858655817', '65df814d-0249-45a0-8542-d3acee887c2e', '7bdf82ec-1493-4861-8b7c-83db2b55ac9a', '2026-02-04 21:30:00+00', '2026-02-05 00:30:00+00', 4, false, false, true, NULL, '2026-02-02 20:39:46.126286+00', '2026-02-02 20:39:46.126286+00'),
('198337fd-1f9a-426c-a42b-b71712138f6b', 'ea83d376-aca5-4ea0-9852-d167c00fb1a3', '7bdf82ec-1493-4861-8b7c-83db2b55ac9a', '2026-02-04 21:30:00+00', '2026-02-05 00:30:00+00', 4, false, false, true, NULL, '2026-02-03 19:08:43.264111+00', '2026-02-03 19:08:43.264111+00'),
('057b48fe-95e1-4455-8fa7-5442847c5c59', 'ea83d376-aca5-4ea0-9852-d167c00fb1a3', '7bdf82ec-1493-4861-8b7c-83db2b55ac9a', '2026-02-04 21:30:00+00', '2026-02-05 00:30:00+00', 4, true, false, true, NULL, '2026-02-03 19:09:03.7601+00', '2026-02-03 19:09:57.645082+00'),
('e5d7c814-f5d7-4618-8017-9491f5bcc113', '1c920c4e-3309-4071-9f0b-e533db8dc645', '357ad283-5d2a-43bc-8216-fdb1a1be4c05', '2026-02-07 21:30:00+00', '2026-02-08 00:30:00+00', 4, false, false, true, NULL, '2026-02-05 11:14:50.785042+00', '2026-02-05 11:14:50.785042+00'),
('bd7b2a49-a8fc-4aad-a4eb-2b668f9a3cd3', '1c920c4e-3309-4071-9f0b-e533db8dc645', '357ad283-5d2a-43bc-8216-fdb1a1be4c05', '2026-02-07 21:30:00+00', '2026-02-08 00:30:00+00', 4, true, false, true, NULL, '2026-02-05 12:11:26.469776+00', '2026-02-05 12:11:26.469776+00'),
('9ebd52c3-2b0c-4acb-bee7-222f94d996fb', '65df814d-0249-45a0-8542-d3acee887c2e', '7bdf82ec-1493-4861-8b7c-83db2b55ac9a', '2026-02-07 21:30:00+00', '2026-02-08 00:30:00+00', 4, false, false, true, NULL, '2026-02-06 03:16:31.731341+00', '2026-02-06 03:16:31.731341+00');

-- ============================================================
-- TABLE: trip_passengers
-- ============================================================
CREATE TABLE public.trip_passengers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id uuid NOT NULL REFERENCES public.trips(id),
  passenger_id uuid NOT NULL REFERENCES public.profiles(id),
  trip_type trip_type DEFAULT 'Ida e Volta',
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.trip_passengers (id, trip_id, passenger_id, trip_type, created_at) VALUES
('5e233690-4b21-4525-8cf5-fd60449941b7', 'dc0f98ba-b288-4bf9-9ab8-c23351b5e791', 'f78b43e5-351e-4a39-8929-5d70ec111752', 'Ida e Volta', '2026-01-29 14:41:17.794404+00'),
('a684f325-02d5-4c2c-883d-cbbcb226420b', 'a1111111-1111-1111-1111-111111111111', 'f78b43e5-351e-4a39-8929-5d70ec111752', 'Ida e Volta', '2026-01-30 00:43:38.768506+00'),
('b76af1eb-318f-4eff-8194-02fde4827a98', 'a7777777-7777-7777-7777-777777777777', 'f78b43e5-351e-4a39-8929-5d70ec111752', 'Ida e Volta', '2026-01-30 00:43:38.768506+00'),
('0940082a-02fb-4ca2-b438-3accab6e2da7', 'a9999999-9999-9999-9999-999999999999', 'f78b43e5-351e-4a39-8929-5d70ec111752', 'Ida e Volta', '2026-01-30 00:43:38.768506+00'),
('9d854c20-7c1e-4dfc-81d2-c7d30482d45e', '6cd915b9-5fa2-4cf9-876f-2c8a50632793', '00000000-0000-0000-0000-000000000001', 'Ida e Volta', '2026-02-01 17:28:23.283913+00'),
('27ae6189-de24-411c-bdda-75292b8f3a57', '78d2d7a4-91bb-4c3d-ab6b-3f677eed51d4', '68fcf48c-1445-4bec-bd9c-92edc6c98bbb', 'Ida e Volta', '2026-02-02 20:39:53.952046+00'),
('ba9b5186-753f-44cd-830a-104d23170f88', '78d2d7a4-91bb-4c3d-ab6b-3f677eed51d4', '892e7d58-42da-4b79-a7ab-2a83cea4551e', 'Ida e Volta', '2026-02-02 20:40:01.109011+00'),
('ad1ca008-7d5d-465b-9d20-ec5c5098cf74', '6cd915b9-5fa2-4cf9-876f-2c8a50632793', 'f78b43e5-351e-4a39-8929-5d70ec111752', 'Ida e Volta', '2026-02-03 18:37:52.722068+00'),
('6eb23dc6-ce23-4093-896d-d95fc0bba58a', '6cd915b9-5fa2-4cf9-876f-2c8a50632793', 'ea83d376-aca5-4ea0-9852-d167c00fb1a3', 'Ida e Volta', '2026-02-03 19:08:33.453026+00'),
('87fd2687-2feb-4268-8edd-06b1bcbd522c', '057b48fe-95e1-4455-8fa7-5442847c5c59', '65df814d-0249-45a0-8542-d3acee887c2e', 'Ida e Volta', '2026-02-03 19:09:25.167908+00'),
('059ebd6f-6411-4997-9720-3b306e656e76', '057b48fe-95e1-4455-8fa7-5442847c5c59', 'b905fec1-a8de-4294-b39e-8a34d38032e8', 'Ida e Volta', '2026-02-03 19:09:32.261037+00'),
('45382d01-c806-401c-9afa-c5ce25344b42', '198337fd-1f9a-426c-a42b-b71712138f6b', '65df814d-0249-45a0-8542-d3acee887c2e', 'Ida e Volta', '2026-02-04 10:50:02.97613+00'),
('574e5bf4-dce9-4602-971d-801180db28f7', 'e5d7c814-f5d7-4618-8017-9491f5bcc113', '00000000-0000-0000-0000-000000000001', 'Ida e Volta', '2026-02-06 01:40:42.625892+00'),
('bd5a4fbb-bbea-48d2-a984-6ec996ff83d0', '9ebd52c3-2b0c-4acb-bee7-222f94d996fb', 'f78b43e5-351e-4a39-8929-5d70ec111752', 'Ida e Volta', '2026-02-06 03:16:45.804452+00'),
('6cdc36eb-3c51-4b36-8649-018468126d43', '9ebd52c3-2b0c-4acb-bee7-222f94d996fb', '68fcf48c-1445-4bec-bd9c-92edc6c98bbb', 'Ida e Volta', '2026-02-06 16:24:47.993013+00'),
('3335d639-323b-4279-93f0-9c2d91a974fb', '9ebd52c3-2b0c-4acb-bee7-222f94d996fb', 'ea83d376-aca5-4ea0-9852-d167c00fb1a3', 'Ida e Volta', '2026-02-06 16:32:10.233169+00'),
('c091007b-43e5-4b31-987b-b17a2a28309a', '9ebd52c3-2b0c-4acb-bee7-222f94d996fb', '892e7d58-42da-4b79-a7ab-2a83cea4551e', 'Ida e Volta', '2026-02-07 02:44:40.536297+00');

-- ============================================================
-- TABLE: absences
-- ============================================================
CREATE TABLE public.absences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES public.profiles(id),
  congregation_id uuid REFERENCES public.congregations(id),
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.absences (id, profile_id, congregation_id, start_date, end_date, notes, created_at) VALUES
('526d2a00-e738-4efb-af57-c7794b8e1caf', '65df814d-0249-45a0-8542-d3acee887c2e', '7bdf82ec-1493-4861-8b7c-83db2b55ac9a', '2026-02-06 03:00:00+00', '2026-02-08 03:00:00+00', NULL, '2026-02-03 23:18:04.647848+00'),
('8d8f567e-7531-49a8-846d-135ed5a114db', '363f2544-afeb-4a91-8852-54eb735d200c', '7dc4c4bb-9ad8-420f-a58e-4cdfcb13abc8', '2026-02-11 03:00:00+00', '2026-02-15 03:00:00+00', NULL, '2026-02-09 22:11:25.76827+00');

-- ============================================================
-- TABLE: ride_requests
-- ============================================================
CREATE TABLE public.ride_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES public.profiles(id),
  congregation_id uuid REFERENCES public.congregations(id),
  requested_date timestamptz NOT NULL,
  is_fulfilled boolean DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.ride_requests (id, profile_id, congregation_id, requested_date, is_fulfilled, notes, created_at) VALUES
('8f2ac57d-b7a3-456a-9a71-3e6b101dec3e', '65df814d-0249-45a0-8542-d3acee887c2e', '7bdf82ec-1493-4861-8b7c-83db2b55ac9a', '2026-02-07 03:00:00+00', false, NULL, '2026-02-06 16:34:21.138608+00'),
('b8557555-6d96-47ad-aa3e-2782f8e44a82', '363f2544-afeb-4a91-8852-54eb735d200c', '7dc4c4bb-9ad8-420f-a58e-4cdfcb13abc8', '2026-02-11 03:00:00+00', false, NULL, '2026-02-09 22:13:19.228949+00');

-- ============================================================
-- TABLE: evacuation_cars
-- ============================================================
CREATE TABLE public.evacuation_cars (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id uuid NOT NULL REFERENCES public.profiles(id),
  congregation_id uuid REFERENCES public.congregations(id),
  destination text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.evacuation_cars (id, driver_id, congregation_id, destination, notes, created_at, updated_at) VALUES
('ff22f772-a561-4719-bd28-d3591939dfd1', '65df814d-0249-45a0-8542-d3acee887c2e', '7bdf82ec-1493-4861-8b7c-83db2b55ac9a', 'Sao Roque - SP', 'Via Castelo Branco', '2026-01-29 14:22:23.641623+00', '2026-02-01 18:04:24.969517+00');

-- ============================================================
-- TABLE: evacuation_passengers
-- ============================================================
CREATE TABLE public.evacuation_passengers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evacuation_car_id uuid NOT NULL REFERENCES public.evacuation_cars(id),
  passenger_id uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.evacuation_passengers (id, evacuation_car_id, passenger_id, created_at) VALUES
('28abbe30-51c3-4ce8-8b2d-f08230e485a2', 'ff22f772-a561-4719-bd28-d3591939dfd1', 'f78b43e5-351e-4a39-8929-5d70ec111752', '2026-01-29 14:24:54.610195+00'),
('72fe8f21-9774-4e79-8ce7-b4aeb7c34428', 'ff22f772-a561-4719-bd28-d3591939dfd1', '68fcf48c-1445-4bec-bd9c-92edc6c98bbb', '2026-02-06 16:34:58.237585+00');

-- ============================================================
-- TABLE: transactions
-- ============================================================
CREATE TABLE public.transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creditor_id uuid NOT NULL REFERENCES public.profiles(id),
  debtor_id uuid NOT NULL REFERENCES public.profiles(id),
  trip_id uuid REFERENCES public.trips(id),
  congregation_id uuid REFERENCES public.congregations(id),
  amount numeric NOT NULL,
  month text NOT NULL,
  trip_type trip_type,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.transactions (id, creditor_id, debtor_id, congregation_id, amount, month, trip_type, created_at) VALUES
('2aed9d64-403f-4e99-ae21-7d1466521a0c', '65df814d-0249-45a0-8542-d3acee887c2e', '65df814d-0249-45a0-8542-d3acee887c2e', '7bdf82ec-1493-4861-8b7c-83db2b55ac9a', 45.00, '2025-12', 'Ida e Volta', '2026-02-02 01:30:46.512686+00'),
('071d8f2b-ebcc-48d0-ad13-8c427337c16f', '65df814d-0249-45a0-8542-d3acee887c2e', '65df814d-0249-45a0-8542-d3acee887c2e', '7bdf82ec-1493-4861-8b7c-83db2b55ac9a', 15.00, '2026-01', 'Ida e Volta', '2026-02-06 12:51:38.605683+00'),
('f7d7681e-c03a-4f17-8e90-e907d0a99da4', '65df814d-0249-45a0-8542-d3acee887c2e', '65df814d-0249-45a0-8542-d3acee887c2e', '7bdf82ec-1493-4861-8b7c-83db2b55ac9a', 45.00, '2026-02', 'Ida e Volta', '2026-02-09 22:15:23.435205+00'),
('02271054-8611-4af7-81a7-b2500f48cdfc', 'ea83d376-aca5-4ea0-9852-d167c00fb1a3', '65df814d-0249-45a0-8542-d3acee887c2e', '7bdf82ec-1493-4861-8b7c-83db2b55ac9a', 30.00, '2026-02', 'Ida e Volta', '2026-02-09 22:15:23.435205+00'),
('56068f51-19dd-4c73-9fb0-987ae832d912', '65df814d-0249-45a0-8542-d3acee887c2e', 'ea83d376-aca5-4ea0-9852-d167c00fb1a3', '7bdf82ec-1493-4861-8b7c-83db2b55ac9a', 30.00, '2026-02', 'Ida e Volta', '2026-02-09 22:15:23.435205+00'),
('76928ac6-ada8-4923-8dea-847a5338c697', 'ea83d376-aca5-4ea0-9852-d167c00fb1a3', '68fcf48c-1445-4bec-bd9c-92edc6c98bbb', '7bdf82ec-1493-4861-8b7c-83db2b55ac9a', 15.00, '2026-02', 'Ida e Volta', '2026-02-09 22:15:23.435205+00'),
('06240d5b-dae8-4bbf-9e9f-20b9eb1a0e0b', '65df814d-0249-45a0-8542-d3acee887c2e', '68fcf48c-1445-4bec-bd9c-92edc6c98bbb', '7bdf82ec-1493-4861-8b7c-83db2b55ac9a', 30.00, '2026-02', 'Ida e Volta', '2026-02-09 22:15:23.435205+00'),
('0626cf77-adfa-42e2-8b49-9e72024ee9c1', '65df814d-0249-45a0-8542-d3acee887c2e', '892e7d58-42da-4b79-a7ab-2a83cea4551e', '7bdf82ec-1493-4861-8b7c-83db2b55ac9a', 30.00, '2026-02', 'Ida e Volta', '2026-02-09 22:15:23.435205+00'),
('19a90fb6-6f92-4803-81fc-1e2bef3d73c6', '65df814d-0249-45a0-8542-d3acee887c2e', '9e285069-99c1-4d03-9863-b7036ae136e1', '7bdf82ec-1493-4861-8b7c-83db2b55ac9a', 15.00, '2026-02', 'Ida e Volta', '2026-02-09 22:15:23.435205+00'),
('ef84ffe6-5916-4b87-b4d3-d205c0c903f3', 'dcfd697e-09df-418d-b878-5ffec628b2a6', 'dcfd697e-09df-418d-b878-5ffec628b2a6', '21f131bc-a1b5-44b3-bcfe-6381e5a8ffc0', 15.00, '2026-02', 'Ida e Volta', '2026-02-09 22:15:23.435205+00'),
('8aa12940-8815-43bb-9517-a5cb1cf62867', '363f2544-afeb-4a91-8852-54eb735d200c', '16a90fff-979d-4458-9073-8d043e5b2f4a', '7dc4c4bb-9ad8-420f-a58e-4cdfcb13abc8', 15.00, '2026-02', 'Ida e Volta', '2026-02-10 20:45:49.115347+00'),
('3ef352e3-45c8-4908-a84c-0c79adf10891', '363f2544-afeb-4a91-8852-54eb735d200c', '4d6d8090-81c1-4632-a8ec-a6531c838a3f', '7dc4c4bb-9ad8-420f-a58e-4cdfcb13abc8', 15.00, '2026-02', 'Ida e Volta', '2026-02-10 20:45:49.115347+00');

-- ============================================================
-- TABLE: transfers
-- ============================================================
CREATE TABLE public.transfers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creditor_id uuid NOT NULL REFERENCES public.profiles(id),
  debtor_id uuid NOT NULL REFERENCES public.profiles(id),
  congregation_id uuid REFERENCES public.congregations(id),
  amount numeric NOT NULL,
  month text NOT NULL,
  is_paid boolean DEFAULT false,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.transfers (id, creditor_id, debtor_id, congregation_id, amount, month, is_paid, paid_at, created_at) VALUES
('da0b4c58-8896-4f11-a02b-59a355f3a643', '65df814d-0249-45a0-8542-d3acee887c2e', '68fcf48c-1445-4bec-bd9c-92edc6c98bbb', '7bdf82ec-1493-4861-8b7c-83db2b55ac9a', 45.00, '2026-02', false, NULL, '2026-02-09 22:15:23.869459+00'),
('2eceb23e-3600-481b-9cfc-6e5eda85c66c', '65df814d-0249-45a0-8542-d3acee887c2e', '892e7d58-42da-4b79-a7ab-2a83cea4551e', '7bdf82ec-1493-4861-8b7c-83db2b55ac9a', 30.00, '2026-02', false, NULL, '2026-02-09 22:15:23.869459+00'),
('4255b9b0-6f60-49a2-8b9e-dd968ca920e8', '363f2544-afeb-4a91-8852-54eb735d200c', '9e285069-99c1-4d03-9863-b7036ae136e1', '7bdf82ec-1493-4861-8b7c-83db2b55ac9a', 15.00, '2026-02', false, NULL, '2026-02-09 22:15:23.869459+00'),
('527bc844-fe5b-4155-beaa-0c1f97fc9717', '363f2544-afeb-4a91-8852-54eb735d200c', '16a90fff-979d-4458-9073-8d043e5b2f4a', '7dc4c4bb-9ad8-420f-a58e-4cdfcb13abc8', 15.00, '2026-02', false, NULL, '2026-02-10 20:45:49.575127+00'),
('118362e9-180c-490c-9166-858561ffd317', '363f2544-afeb-4a91-8852-54eb735d200c', '4d6d8090-81c1-4632-a8ec-a6531c838a3f', '7dc4c4bb-9ad8-420f-a58e-4cdfcb13abc8', 15.00, '2026-02', true, '2026-02-10 20:47:28.805+00', '2026-02-10 20:45:49.575127+00');

-- ============================================================
-- TABLE: faq
-- ============================================================
CREATE TABLE public.faq (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question text NOT NULL,
  answer text NOT NULL,
  order_index integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.faq (id, question, answer, order_index, is_active, created_at, updated_at) VALUES
('6a5b0d74-041b-4925-a5e3-1ceb0bd8c3a4', 'Como as transferências são calculadas?', 'O sistema calcula automaticamente os débitos e créditos com base nas viagens realizadas. Cada viagem de ida e volta custa R$ 15,00 (valor configurável). Se você fizer apenas ida ou apenas volta, paga R$ 7,50. No final do mês, o sistema otimiza as transferências para minimizar a quantidade de transações necessárias entre os betelitas.', 1, true, '2026-01-29 14:40:38.871054+00', '2026-01-29 14:40:38.871054+00'),
('51dd18f7-18f0-4d65-b17c-b3ad3a044a44', 'Como o aplicativo considera as esposas nos cálculos?', 'Para casais, os débitos e créditos da esposa são automaticamente vinculados ao marido. Isso significa que se a esposa viaja como passageira, o débito aparece no relatório do marido. Da mesma forma, se o casal dá carona juntos, o crédito é contabilizado apenas uma vez para o marido, já que a viagem da esposa é contabilizada como débito (que se anula com o crédito).', 2, true, '2026-01-29 14:40:38.871054+00', '2026-01-29 14:40:38.871054+00'),
('c1dfae48-2319-4744-bcc8-77a1f7c10b4d', 'Por que preciso fazer login no aplicativo?', 'O login permite que o sistema identifique você e mostre suas informações personalizadas: suas viagens, seu relatório financeiro, suas reservas, etc. Também permite que você reserve vagas em viagens e registre ausências. Suas credenciais são seguras e protegidas.', 3, true, '2026-01-29 14:40:38.871054+00', '2026-01-29 14:40:38.871054+00'),
('1ffded16-a27e-4e2f-be8e-819bc41cb515', 'O que faço se eu mudar de motorista ou passageiro na última hora?', 'Se precisar cancelar sua reserva ou mudar de viagem, acesse ''Minhas Viagens'' e cancele a reserva atual. Depois, procure a nova viagem desejada e faça uma nova reserva. O motorista receberá uma notificação sobre a mudança. Se for motorista e precisar cancelar a viagem, avise os passageiros com antecedência.', 5, true, '2026-01-29 14:40:38.871054+00', '2026-01-29 14:40:38.871054+00'),
('ff3f5b05-62d8-446e-a053-ae3f522c1f46', 'Como vejo as viagens disponíveis?', 'Acesse a seção ''Viagens'' no menu lateral. Lá você verá todas as viagens programadas com vagas disponíveis. Você pode filtrar por data e buscar por motorista ou passageiro. Viagens com vagas aparecem destacadas em verde, e você pode reservar sua vaga clicando no botão ''Reservar Vaga''.', 6, true, '2026-01-29 14:40:38.871054+00', '2026-01-29 14:40:38.871054+00'),
('4348dafd-314d-4fec-969f-e9c427e26035', 'E se eu quiser adicionar uma viagem que ocorreu no passado?', 'Pode ser que você precise adicionar uma viagem que ocorreu no passado para que ela seja incluída no cálculo financeiro no fim do mês. Não é possível adicionar viagens com data anterior à data de hoje. Mas você pode adicionar uma viagem na data de hoje e incluir nas notas uma observação referente à data original.', 6, true, '2026-02-10 21:39:00.607961+00', '2026-02-10 21:39:00.607961+00'),
('0d4336d2-05dd-470f-aca8-2472e569edb6', 'Como fazer para informar que irei levar visitantes ou o orador no meu carro?', 'Você pode escolher a opção Visitante na lista de passageiros. Pode incluir mais de um visitante por veículo. O visitante é isento de pagamento e não será incluído no cálculo financeiro.', 7, true, '2026-02-10 21:39:39.275401+00', '2026-02-10 21:39:39.275401+00');

-- ============================================================
-- TABLE: settings
-- ============================================================
CREATE TABLE public.settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL,
  value text NOT NULL,
  type text DEFAULT 'string',
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.settings (id, key, value, type, updated_at) VALUES
('163d776f-0552-4f82-b70c-a10b14c51226', 'trip_value', '15.00', 'decimal', '2026-01-29 00:40:33.880293+00'),
('ad18376a-6198-4f5e-9290-6c35b879aab1', 'show_transport_help', 'true', 'boolean', '2026-01-29 00:40:33.880293+00'),
('c7d13f60-7804-4838-af07-144782c15878', 'max_passengers', '4', 'integer', '2026-01-29 00:40:33.880293+00'),
('c5d148c8-0b96-40cf-a9d9-13acbc7d44ec', 'closing_day', '31', 'integer', '2026-01-29 00:40:33.880293+00'),
('32810bb9-a4e2-433d-9751-8b3cafcbf86e', 'congregation_name', '', 'string', '2026-02-02 13:44:59.661304+00'),
('8adb5921-9ee3-47b5-9cdc-d1c81fce6b3e', 'default_congregation_id', '7bdf82ec-1493-4861-8b7c-83db2b55ac9a', 'string', '2026-02-02 13:45:00.13089+00');

-- ============================================================
-- NOTE: Some profiles may be missing from this dump due to RLS.
-- The query was run as super_admin and should include all visible data.
-- auth.users table is NOT included (managed by Supabase Auth).
-- ============================================================
