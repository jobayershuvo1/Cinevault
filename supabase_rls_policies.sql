-- =====================================================================
--                   SUPABASE DATABASE RLS POLICIES
-- =====================================================================
-- Target Tables: public.profiles, public.admin_movies
-- Access Rules: 
--   - 'admin_movies' allows SELECT by anonymous/public guests.
--   - 'admin_movies' allows CRUD (INSERT, UPDATE, DELETE) ONLY for 'admin' or 'super_admin' roles.
--   - 'profiles' allows personal read/update of own profile.
--   - 'profiles' allows Full Admin Read and Role/Status edit ONLY by 'super_admin' or 'admin'.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. EXTENSIONS & TYPES SETUP
-- ---------------------------------------------------------------------
CREATE TYPE public.user_role AS ENUM ('user', 'admin', 'super_admin');
CREATE TYPE public.user_status AS ENUM ('active', 'suspended');

-- ---------------------------------------------------------------------
-- 2. SCHEMAS FOR TARGET TABLES
-- ---------------------------------------------------------------------

-- Profiles Table (Linked with Supabase Auth auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  role public.user_role DEFAULT 'user'::public.user_role NOT NULL,
  status public.user_status DEFAULT 'active'::public.user_status NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Admin Movies Table
CREATE TABLE IF NOT EXISTS public.admin_movies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  poster_url TEXT,
  backdrop_url TEXT,
  release_year INT,
  genre_tags TEXT[],
  rating NUMERIC(3, 1),
  download_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by UUID REFERENCES public.profiles(id)
);


-- ---------------------------------------------------------------------
-- 3. ENABLE ROW LEVEL SECURITY (RLS)
-- ---------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_movies ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------
-- 4. RECURSION-SAFE SECURITY DEFINER UTILITY FUNCTIONS
-- ---------------------------------------------------------------------

-- Fetch current authenticated user's role from public.profiles.
-- Security Definer ensures we bypass the circular policies restriction during checks.
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS public.user_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_role public.user_role;
BEGIN
  SELECT role INTO v_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN COALESCE(v_role, 'user'::public.user_role);
END;
$$;


-- ---------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY POLICIES FOR: public.admin_movies
-- ---------------------------------------------------------------------

-- Policy: Allow all users (including guests) to read movies
CREATE POLICY "Allow public read access to movies"
ON public.admin_movies
FOR SELECT
USING (true);

-- Policy: Allow only admins and super_admins to insert new movies
CREATE POLICY "Allow movie creation for admins and super_admins only"
ON public.admin_movies
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated' AND 
  public.get_auth_user_role() IN ('admin'::public.user_role, 'super_admin'::public.user_role)
);

-- Policy: Allow only admins and super_admins to update existing movies
CREATE POLICY "Allow movie updates for admins and super_admins only"
ON public.admin_movies
FOR UPDATE
USING (
  auth.role() = 'authenticated' AND 
  public.get_auth_user_role() IN ('admin'::public.user_role, 'super_admin'::public.user_role)
)
WITH CHECK (
  auth.role() = 'authenticated' AND 
  public.get_auth_user_role() IN ('admin'::public.user_role, 'super_admin'::public.user_role)
);

-- Policy: Allow only admins and super_admins to delete movies
CREATE POLICY "Allow movie deletions for admins and super_admins only"
ON public.admin_movies
FOR DELETE
USING (
  auth.role() = 'authenticated' AND 
  public.get_auth_user_role() IN ('admin'::public.user_role, 'super_admin'::public.user_role)
);


-- ---------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY POLICIES FOR: public.profiles
-- ---------------------------------------------------------------------

-- Policy: Allow users to select/read their own profile OR allow staff (admin/super_admin) to view all profiles
CREATE POLICY "Allow users to view own profile and staff to view all"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id OR 
  public.get_auth_user_role() IN ('admin'::public.user_role, 'super_admin'::public.user_role)
);

-- Policy: Allow users to edit their own username (but NOT transition their role or status)
CREATE POLICY "Allow users to update own basic profile settings"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND
  -- Enforce that a regular user cannot modify their role or status fields
  (
    (role = (SELECT role FROM public.profiles WHERE id = auth.uid())) AND
    (status = (SELECT status FROM public.profiles WHERE id = auth.uid()))
  )
);

-- Policy: Allow super_admins (and admins) to perform full updates on any profile
CREATE POLICY "Allow full profile updates for supervisors"
ON public.profiles
FOR UPDATE
USING (
  auth.role() = 'authenticated' AND 
  public.get_auth_user_role() IN ('admin'::public.user_role, 'super_admin'::public.user_role)
);

-- Policy: Allow delete profiles only for super_admins
CREATE POLICY "Allow profile deletion exclusively for super_admins"
ON public.profiles
FOR DELETE
USING (
  auth.role() = 'authenticated' AND 
  public.get_auth_user_role() = 'super_admin'::public.user_role
);


-- ---------------------------------------------------------------------
-- 7. AUTOMATIC NEW USER PROFILES TRIGGER
-- ---------------------------------------------------------------------
-- Instantly creates a mirroring record in public.profiles when someone signs up
-- via Supabase Auth services, defaulting the first user to 'super_admin' on empty tables.
CREATE OR REPLACE FUNCTION public.handle_new_user_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_initial_role public.user_role;
  v_registered_count INT;
BEGIN
  -- Count existing profiles to designate initial super_admin safely
  SELECT COUNT(*) INTO v_registered_count FROM public.profiles;
  
  IF v_registered_count = 0 THEN
    v_initial_role := 'super_admin'::public.user_role;
  ELSE
    v_initial_role := 'user'::public.user_role;
  END IF;

  INSERT INTO public.profiles (id, username, email, role, status)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email,
    v_initial_role,
    'active'::public.user_status
  );
  
  RETURN new;
END;
$$;

-- Create the trigger linked with standard auth schema user creation events
CREATE OR REPLACE TRIGGER on_supabase_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_registration();
