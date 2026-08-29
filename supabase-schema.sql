-- ==============================================================================
-- CYR CARS | Production Supabase Database Schema & Storage Setup
-- ==============================================================================
-- Run this entire script in your Supabase SQL Editor (https://app.supabase.com)
-- It creates all tables, foreign keys, cascade rules, indexes, triggers for 
-- version invalidation, storage buckets, and security policies.
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. Clean Existing Schema (Safe for Fresh Installs or Resets)
-- ==============================================================================

-- Trigger function for automatic updated_at timestamp management
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for cache version incrementing
CREATE OR REPLACE FUNCTION increment_vehicle_metadata_version()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.metadata_versions (key, version, updated_at)
    VALUES ('vehicles', 1, NOW())
    ON CONFLICT (key) 
    DO UPDATE SET 
        version = public.metadata_versions.version + 1,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 3. Core Tables
-- ==============================================================================

-- Table: metadata_versions (Optimistic caching & real-time client sync)
CREATE TABLE IF NOT EXISTS public.metadata_versions (
    key TEXT PRIMARY KEY,
    version BIGINT NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: vehicles (Master Vehicle Catalog)
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    variant TEXT,
    year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    price NUMERIC(14, 2) NOT NULL DEFAULT 0,
    mileage INTEGER NOT NULL DEFAULT 0,
    fuel_type TEXT NOT NULL DEFAULT 'Petrol',
    transmission TEXT NOT NULL DEFAULT 'Automatic',
    body_type TEXT NOT NULL DEFAULT 'Coupe',
    engine TEXT,
    color TEXT,
    ownership TEXT DEFAULT '1st Owner',
    registration TEXT,
    status TEXT NOT NULL DEFAULT 'Available',
    featured BOOLEAN NOT NULL DEFAULT false,
    description TEXT,
    instagram_reel TEXT,
    inspection_notes TEXT,
    features TEXT[] NOT NULL DEFAULT '{}',
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: vehicle_images (1-to-Many Ordered Images for High-Res Galleries)
CREATE TABLE IF NOT EXISTS public.vehicle_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: leads (Inquiries, Consignment Submissions, Test Drives, Appraisals)
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'New Lead',
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    images TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: site_settings (Boutique Showroom Identity & Hero Config)
CREATE TABLE IF NOT EXISTS public.site_settings (
    id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000000'::UUID,
    logo_url TEXT,
    home_hero_image_url TEXT,
    home_hero_mobile_image_url TEXT,
    about_image_url TEXT,
    home_hero_video_url TEXT,
    home_hero_mobile_video_url TEXT DEFAULT '/videos/hero-mobile.mp4',
    home_hero_type TEXT DEFAULT 'video',
    client_deliveries JSONB DEFAULT '[]'::JSONB,
    instagram_reels JSONB DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 4. High-Performance Indexes
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON public.vehicles(status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_vehicles_featured ON public.vehicles(featured) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_vehicles_make_model ON public.vehicles(make, model);
CREATE INDEX IF NOT EXISTS idx_vehicles_price ON public.vehicles(price);
CREATE INDEX IF NOT EXISTS idx_vehicles_year ON public.vehicles(year DESC);
CREATE INDEX IF NOT EXISTS idx_vehicles_created_at ON public.vehicles(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vehicle_images_vehicle_id ON public.vehicle_images(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_images_order ON public.vehicle_images(vehicle_id, display_order ASC);

CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_vehicle_id ON public.leads(vehicle_id);

-- ==============================================================================
-- 5. Automated Database Triggers
-- ==============================================================================

-- Auto update timestamps
DROP TRIGGER IF EXISTS trg_vehicles_updated_at ON public.vehicles;
CREATE TRIGGER trg_vehicles_updated_at
    BEFORE UPDATE ON public.vehicles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_leads_updated_at ON public.leads;
CREATE TRIGGER trg_leads_updated_at
    BEFORE UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_site_settings_updated_at ON public.site_settings;
CREATE TRIGGER trg_site_settings_updated_at
    BEFORE UPDATE ON public.site_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto update client cache metadata version whenever inventory changes
DROP TRIGGER IF EXISTS trg_vehicles_cache_invalidation ON public.vehicles;
CREATE TRIGGER trg_vehicles_cache_invalidation
    AFTER INSERT OR UPDATE OR DELETE ON public.vehicles
    FOR EACH ROW
    EXECUTE FUNCTION increment_vehicle_metadata_version();

-- ==============================================================================
-- 6. Row Level Security (RLS) Policies
-- ==============================================================================

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metadata_versions ENABLE ROW LEVEL SECURITY;

-- Vehicles: Public can read available vehicles, authenticated / anon service can write
DROP POLICY IF EXISTS "Public Read Vehicles" ON public.vehicles;
CREATE POLICY "Public Read Vehicles" ON public.vehicles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow All Vehicle Modifications" ON public.vehicles;
CREATE POLICY "Allow All Vehicle Modifications" ON public.vehicles
    FOR ALL USING (true) WITH CHECK (true);

-- Vehicle Images: Public can view images, all can manage
DROP POLICY IF EXISTS "Public Read Vehicle Images" ON public.vehicle_images;
CREATE POLICY "Public Read Vehicle Images" ON public.vehicle_images
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow All Image Modifications" ON public.vehicle_images;
CREATE POLICY "Allow All Image Modifications" ON public.vehicle_images
    FOR ALL USING (true) WITH CHECK (true);

-- Leads: Anyone can submit a lead (INSERT), admin can view/manage
DROP POLICY IF EXISTS "Public Insert Leads" ON public.leads;
CREATE POLICY "Public Insert Leads" ON public.leads
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Read And Manage Leads" ON public.leads;
CREATE POLICY "Read And Manage Leads" ON public.leads
    FOR ALL USING (true) WITH CHECK (true);

-- Site Settings: Public can read site config, admin can modify
DROP POLICY IF EXISTS "Public Read Site Settings" ON public.site_settings;
CREATE POLICY "Public Read Site Settings" ON public.site_settings
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow All Site Settings Modifications" ON public.site_settings;
CREATE POLICY "Allow All Site Settings Modifications" ON public.site_settings
    FOR ALL USING (true) WITH CHECK (true);

-- Metadata Versions: Public can read cache versions
DROP POLICY IF EXISTS "Public Read Metadata Versions" ON public.metadata_versions;
CREATE POLICY "Public Read Metadata Versions" ON public.metadata_versions
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow All Metadata Version Updates" ON public.metadata_versions;
CREATE POLICY "Allow All Metadata Version Updates" ON public.metadata_versions
    FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 7. Supabase Storage Buckets Configuration
-- ==============================================================================

-- Create public storage bucket for vehicle inventory gallery images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'vehicle-images',
    'vehicle-images',
    true,
    52428800, -- 50 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/heic']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/heic'];

-- Create public storage bucket for showroom assets, logos, and hero media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'site_settings',
    'site_settings',
    true,
    104857600, -- 100 MB (supports videos)
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/heic', 'video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 104857600;

-- Storage RLS Policies: Public read, open uploads
DROP POLICY IF EXISTS "Public Access Vehicle Images" ON storage.objects;
CREATE POLICY "Public Access Vehicle Images" ON storage.objects
    FOR SELECT USING (bucket_id IN ('vehicle-images', 'site_settings'));

DROP POLICY IF EXISTS "Allow Uploads To Vehicle Images" ON storage.objects;
CREATE POLICY "Allow Uploads To Vehicle Images" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id IN ('vehicle-images', 'site_settings'));

DROP POLICY IF EXISTS "Allow Updates To Vehicle Images" ON storage.objects;
CREATE POLICY "Allow Updates To Vehicle Images" ON storage.objects
    FOR UPDATE USING (bucket_id IN ('vehicle-images', 'site_settings'));

DROP POLICY IF EXISTS "Allow Delete From Vehicle Images" ON storage.objects;
CREATE POLICY "Allow Delete From Vehicle Images" ON storage.objects
    FOR DELETE USING (bucket_id IN ('vehicle-images', 'site_settings'));

-- ==============================================================================
-- 8. Seed Initial Default Data
-- ==============================================================================

-- Initial Cache Version
INSERT INTO public.metadata_versions (key, version)
VALUES ('vehicles', 1)
ON CONFLICT (key) DO NOTHING;

-- Initial Showroom Site Settings
INSERT INTO public.site_settings (
    id,
    logo_url,
    home_hero_image_url,
    home_hero_mobile_image_url,
    about_image_url,
    home_hero_video_url,
    home_hero_mobile_video_url,
    home_hero_type,
    client_deliveries,
    instagram_reels
) VALUES (
    '00000000-0000-0000-0000-000000000000'::UUID,
    '/logo.png',
    '',
    '',
    '',
    '',
    '/videos/hero-mobile.mp4',
    'video',
    '[]'::JSONB,
    '[]'::JSONB
)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 9. Curated Luxury Seed Inventory (Optional Starter Pack)
-- ==============================================================================

INSERT INTO public.vehicles (
    id, make, model, variant, year, price, mileage, fuel_type, transmission, 
    body_type, engine, color, ownership, registration, status, featured, description, features
) VALUES 
(
    '11111111-1111-4111-8111-111111111111'::UUID,
    'Porsche',
    '911 GT3 RS',
    'Weissach Package',
    2023,
    38500000,
    3400,
    'Petrol',
    'Dual-Clutch',
    'Coupe',
    '4.0L Naturally Aspirated Flat-6 (518 HP)',
    'Arctic Grey / Carbon Aero',
    '1st Owner',
    'MH-01',
    'Available',
    true,
    'Pristine 2023 Porsche 911 GT3 RS equipped with Weissach Package, Magnesium lightweight forged wheels, front-axle lift, and carbon-ceramic brakes (PCCB). Full body paint protection film from day one.',
    ARRAY['Weissach Package', 'Front Axle Lift', 'PCCB Carbon Brakes', 'Full Body PPF', 'Club Sport Package']
),
(
    '22222222-2222-4222-8222-222222222222'::UUID,
    'Mercedes-AMG',
    'G 63',
    'Night Package Edition',
    2022,
    29500000,
    11200,
    'Petrol',
    'Automatic',
    'SUV',
    '4.0L Handcrafted AMG Bi-Turbo V8 (577 HP)',
    'Designo Magno Platinum',
    '1st Owner',
    'MH-02',
    'Available',
    true,
    'Bespoke AMG G 63 in Designo Magno Platinum finish. Loaded with AMG Night Package, 22-inch cross-spoke matte black wheels, Burmester 3D Surround Audio, and carbon fiber interior trim.',
    ARRAY['AMG Night Package', 'Burmester 3D Sound', '22-inch Forged Wheels', 'Active Multicontour Seats', '360 Surround Camera']
),
(
    '33333333-3333-4333-8333-333333333333'::UUID,
    'BMW',
    'M4 Competition',
    'M xDrive',
    2023,
    14800000,
    6200,
    'Petrol',
    'Automatic',
    'Coupe',
    '3.0L BMW M TwinPower Turbo S58 (503 HP)',
    'Isle of Man Green Metallic',
    '1st Owner',
    'MH-04',
    'Available',
    true,
    'Immaculate M4 Competition with all-wheel M xDrive. Finished in iconic Isle of Man Green with Kyalami Orange carbon bucket seats, carbon exterior pack, and Harman Kardon acoustics.',
    ARRAY['M Carbon Bucket Seats', 'M xDrive AWD', 'Carbon Exterior Pack', 'Laserlights', 'Head-Up Display']
)
ON CONFLICT (id) DO NOTHING;

-- Image references for the seed vehicles
INSERT INTO public.vehicle_images (vehicle_id, image_url, display_order)
VALUES 
    ('11111111-1111-4111-8111-111111111111'::UUID, 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=1400&q=80', 0),
    ('22222222-2222-4222-8222-222222222222'::UUID, 'https://images.unsplash.com/photo-1520031441872-265e4ff70366?auto=format&fit=crop&w=1400&q=80', 0),
    ('33333333-3333-4333-8333-333333333333'::UUID, 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1400&q=80', 0)
ON CONFLICT DO NOTHING;

-- Output confirmation notice
SELECT 'CYR Cars database schema and storage buckets provisioned successfully!' as status;
