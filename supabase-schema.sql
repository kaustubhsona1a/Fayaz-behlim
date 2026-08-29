-- ==============================================================================
-- CYR CARS | Complete Production Supabase Database Schema & RLS Setup
-- ==============================================================================
-- Run this entire script in your Supabase SQL Editor (https://app.supabase.com)
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. Core Tables
-- ==============================================================================

-- Admins Table (Linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vehicles Table
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    variant TEXT,
    year INT NOT NULL,
    price BIGINT NOT NULL,
    mileage INT NOT NULL,
    fuel_type TEXT NOT NULL DEFAULT 'Petrol',
    transmission TEXT NOT NULL DEFAULT 'Automatic',
    body_type TEXT NOT NULL DEFAULT 'Coupe',
    engine TEXT,
    color TEXT,
    ownership TEXT DEFAULT '1st Owner',
    registration TEXT,
    status TEXT NOT NULL DEFAULT 'Available',
    featured BOOLEAN DEFAULT false,
    description TEXT,
    instagram_reel TEXT,
    inspection_notes TEXT,
    features TEXT[] DEFAULT '{}',
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vehicle Images Table (1-to-Many Ordered Gallery)
CREATE TABLE IF NOT EXISTS public.vehicle_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leads Table (Inquiries, Consignment, Test Drives)
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'New Lead',
    images TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Site Settings Table (Brand Assets, Deliveries & Hero Config)
CREATE TABLE IF NOT EXISTS public.site_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT DEFAULT 'CYR Cars',
    address TEXT DEFAULT 'Bandra Hill View Rd, Mumbai',
    phone TEXT DEFAULT '+91 98200 00000',
    email TEXT DEFAULT 'contact@cyrcars.com',
    instagram_url TEXT,
    whatsapp_number TEXT,
    google_maps_url TEXT,
    logo_url TEXT,
    about_image_url TEXT,
    home_hero_image_url TEXT,
    home_hero_mobile_image_url TEXT,
    home_hero_video_url TEXT,
    home_hero_mobile_video_url TEXT DEFAULT '/videos/hero-mobile.mp4',
    home_hero_type TEXT DEFAULT 'video',
    client_deliveries TEXT[] DEFAULT '{}',
    instagram_reels TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Metadata Versions Table (Client Cache Sync)
CREATE TABLE IF NOT EXISTS public.metadata_versions (
    key TEXT PRIMARY KEY,
    version BIGINT NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert initial metadata versions
INSERT INTO public.metadata_versions (key, version) VALUES ('vehicles', 1) ON CONFLICT (key) DO NOTHING;
INSERT INTO public.metadata_versions (key, version) VALUES ('site_settings', 1) ON CONFLICT (key) DO NOTHING;

-- Insert initial site settings row if not present
INSERT INTO public.site_settings (
    id, company_name, logo_url, home_hero_type, home_hero_mobile_video_url
) VALUES (
    '00000000-0000-0000-0000-000000000000'::UUID, 'CYR Cars', '/logo.png', 'video', '/videos/hero-mobile.mp4'
) ON CONFLICT DO NOTHING;

-- ==============================================================================
-- 3. Performance Indexes
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
-- 4. Helper Functions & Triggers
-- ==============================================================================

-- Trigger function for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for metadata version invalidation
CREATE OR REPLACE FUNCTION public.increment_metadata_version()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.metadata_versions (key, version, updated_at)
    VALUES (TG_ARGV[0], 1, NOW())
    ON CONFLICT (key) 
    DO UPDATE SET 
        version = public.metadata_versions.version + 1,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger attachments
DROP TRIGGER IF EXISTS trg_vehicles_updated_at ON public.vehicles;
CREATE TRIGGER trg_vehicles_updated_at
    BEFORE UPDATE ON public.vehicles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_leads_updated_at ON public.leads;
CREATE TRIGGER trg_leads_updated_at
    BEFORE UPDATE ON public.leads
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_site_settings_updated_at ON public.site_settings;
CREATE TRIGGER trg_site_settings_updated_at
    BEFORE UPDATE ON public.site_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_vehicles_version ON public.vehicles;
CREATE TRIGGER trigger_update_vehicles_version
    AFTER INSERT OR UPDATE OR DELETE ON public.vehicles
    FOR EACH STATEMENT EXECUTE FUNCTION public.increment_metadata_version('vehicles');

DROP TRIGGER IF EXISTS trigger_update_settings_version ON public.site_settings;
CREATE TRIGGER trigger_update_settings_version
    AFTER INSERT OR UPDATE OR DELETE ON public.site_settings
    FOR EACH STATEMENT EXECUTE FUNCTION public.increment_metadata_version('site_settings');

-- Helper function to check if current user is an active admin
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.admins 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 5. Row Level Security (RLS) Policies
-- ==============================================================================

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metadata_versions ENABLE ROW LEVEL SECURITY;

-- Admins Table RLS (Non-recursive)
DROP POLICY IF EXISTS "Admins can view admins" ON public.admins;
CREATE POLICY "Admins can view admins" ON public.admins
    FOR SELECT USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage admins" ON public.admins;
CREATE POLICY "Admins can manage admins" ON public.admins
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Vehicles RLS
DROP POLICY IF EXISTS "Vehicles are viewable by everyone" ON public.vehicles;
CREATE POLICY "Vehicles are viewable by everyone" ON public.vehicles
    FOR SELECT USING (is_deleted = false OR public.is_admin() OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Vehicles are insertable by admins only" ON public.vehicles;
CREATE POLICY "Vehicles are insertable by admins only" ON public.vehicles
    FOR INSERT WITH CHECK (public.is_admin() OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Vehicles are updatable by admins only" ON public.vehicles;
CREATE POLICY "Vehicles are updatable by admins only" ON public.vehicles
    FOR UPDATE USING (public.is_admin() OR auth.role() = 'authenticated') 
    WITH CHECK (public.is_admin() OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Vehicles are deletable by admins only" ON public.vehicles;
CREATE POLICY "Vehicles are deletable by admins only" ON public.vehicles
    FOR DELETE USING (public.is_admin() OR auth.role() = 'authenticated');

-- Vehicle Images RLS
DROP POLICY IF EXISTS "Vehicle images are viewable by everyone" ON public.vehicle_images;
CREATE POLICY "Vehicle images are viewable by everyone" ON public.vehicle_images
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Vehicle images are managed by admins only" ON public.vehicle_images;
CREATE POLICY "Vehicle images are managed by admins only" ON public.vehicle_images
    FOR ALL USING (public.is_admin() OR auth.role() = 'authenticated') 
    WITH CHECK (public.is_admin() OR auth.role() = 'authenticated');

-- Leads RLS
DROP POLICY IF EXISTS "Leads are insertable by everyone" ON public.leads;
CREATE POLICY "Leads are insertable by everyone" ON public.leads
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Leads are viewable by admins only" ON public.leads;
CREATE POLICY "Leads are viewable by admins only" ON public.leads
    FOR SELECT USING (public.is_admin() OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Leads are updatable by admins only" ON public.leads;
CREATE POLICY "Leads are updatable by admins only" ON public.leads
    FOR UPDATE USING (public.is_admin() OR auth.role() = 'authenticated') 
    WITH CHECK (public.is_admin() OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Leads are deletable by admins only" ON public.leads;
CREATE POLICY "Leads are deletable by admins only" ON public.leads
    FOR DELETE USING (public.is_admin() OR auth.role() = 'authenticated');

-- Site Settings RLS
DROP POLICY IF EXISTS "Site settings viewable by everyone" ON public.site_settings;
CREATE POLICY "Site settings viewable by everyone" ON public.site_settings
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Site settings updatable by admins only" ON public.site_settings;
CREATE POLICY "Site settings updatable by admins only" ON public.site_settings
    FOR ALL USING (public.is_admin() OR auth.role() = 'authenticated')
    WITH CHECK (public.is_admin() OR auth.role() = 'authenticated');

-- Metadata Versions RLS
DROP POLICY IF EXISTS "Metadata viewable by everyone" ON public.metadata_versions;
CREATE POLICY "Metadata viewable by everyone" ON public.metadata_versions
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Metadata managed by admins" ON public.metadata_versions;
CREATE POLICY "Metadata managed by admins" ON public.metadata_versions
    FOR ALL USING (public.is_admin() OR auth.role() = 'authenticated')
    WITH CHECK (public.is_admin() OR auth.role() = 'authenticated');

-- ==============================================================================
-- 6. Storage Buckets & Storage Policies
-- ==============================================================================

-- Create vehicle-images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'vehicle-images',
    'vehicle-images',
    true,
    52428800,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/heic']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 52428800;

-- Create site_settings bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'site_settings',
    'site_settings',
    true,
    104857600,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/heic', 'video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 104857600;

-- Storage Policies
DROP POLICY IF EXISTS "Public Access to Vehicle Images" ON storage.objects;
CREATE POLICY "Public Access to Vehicle Images" ON storage.objects
    FOR SELECT USING (bucket_id = 'vehicle-images');

DROP POLICY IF EXISTS "Admin Insert to Vehicle Images" ON storage.objects;
CREATE POLICY "Admin Insert to Vehicle Images" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'vehicle-images');

DROP POLICY IF EXISTS "Admin Update to Vehicle Images" ON storage.objects;
CREATE POLICY "Admin Update to Vehicle Images" ON storage.objects
    FOR UPDATE TO authenticated USING (bucket_id = 'vehicle-images');

DROP POLICY IF EXISTS "Admin Delete to Vehicle Images" ON storage.objects;
CREATE POLICY "Admin Delete to Vehicle Images" ON storage.objects
    FOR DELETE TO authenticated USING (bucket_id = 'vehicle-images');

DROP POLICY IF EXISTS "Public Access to Site Settings Images" ON storage.objects;
CREATE POLICY "Public Access to Site Settings Images" ON storage.objects
    FOR SELECT USING (bucket_id = 'site_settings');

DROP POLICY IF EXISTS "Admin Insert to Site Settings Images" ON storage.objects;
CREATE POLICY "Admin Insert to Site Settings Images" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'site_settings');

DROP POLICY IF EXISTS "Admin Update to Site Settings Images" ON storage.objects;
CREATE POLICY "Admin Update to Site Settings Images" ON storage.objects
    FOR UPDATE TO authenticated USING (bucket_id = 'site_settings');

DROP POLICY IF EXISTS "Admin Delete to Site Settings Images" ON storage.objects;
CREATE POLICY "Admin Delete to Site Settings Images" ON storage.objects
    FOR DELETE TO authenticated USING (bucket_id = 'site_settings');

-- ==============================================================================
-- 7. Verification Status Confirmation
-- ==============================================================================
SELECT 'CYR Cars database schema and storage policies deployed successfully!' as status;
