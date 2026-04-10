
-- 1. profiles: allow admin to UPDATE any profile
CREATE POLICY "Admins update all profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- 2. usuario_perfis: recreate with explicit WITH CHECK and TO authenticated
DROP POLICY IF EXISTS "Admins manage perfil links" ON public.usuario_perfis;
CREATE POLICY "Admins manage perfil links"
ON public.usuario_perfis FOR ALL TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- 3. usuario_empresas: recreate with explicit WITH CHECK and TO authenticated
DROP POLICY IF EXISTS "Admins manage empresa links" ON public.usuario_empresas;
CREATE POLICY "Admins manage empresa links"
ON public.usuario_empresas FOR ALL TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));
