-- Fix AUTH-7: Role-Select Flow Is Completely Broken
ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN role DROP NOT NULL;

-- Fix AUTH-4: No RLS INSERT Policy for Profiles
CREATE POLICY "users insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
