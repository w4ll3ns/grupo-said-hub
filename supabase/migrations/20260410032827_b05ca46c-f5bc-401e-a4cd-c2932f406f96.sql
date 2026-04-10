
DROP POLICY "System inserts profiles" ON public.profiles;
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());
