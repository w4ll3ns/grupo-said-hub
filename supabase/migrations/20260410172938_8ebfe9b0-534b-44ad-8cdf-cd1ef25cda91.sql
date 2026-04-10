
-- 1. Prevent removing own admin profile link
CREATE OR REPLACE FUNCTION public.prevent_self_admin_lockout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only check if the user being affected is the current authenticated user
  IF OLD.user_id = auth.uid() THEN
    -- Check if the perfil being removed is "Administrador"
    IF EXISTS (
      SELECT 1 FROM public.perfis
      WHERE id = OLD.perfil_id AND LOWER(nome) = 'administrador'
    ) THEN
      RAISE EXCEPTION 'Você não pode remover seu próprio perfil de Administrador';
    END IF;
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_prevent_self_admin_lockout
BEFORE DELETE ON public.usuario_perfis
FOR EACH ROW
EXECUTE FUNCTION public.prevent_self_admin_lockout();

-- 2. Prevent removing own last empresa link
CREATE OR REPLACE FUNCTION public.prevent_self_empresa_lockout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  remaining_count integer;
BEGIN
  IF OLD.user_id = auth.uid() THEN
    SELECT COUNT(*) INTO remaining_count
    FROM public.usuario_empresas
    WHERE user_id = OLD.user_id AND id != OLD.id;

    IF remaining_count = 0 THEN
      RAISE EXCEPTION 'Você não pode remover seu último vínculo com uma empresa';
    END IF;
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_prevent_self_empresa_lockout
BEFORE DELETE ON public.usuario_empresas
FOR EACH ROW
EXECUTE FUNCTION public.prevent_self_empresa_lockout();

-- 3. Prevent self-deactivation in profiles
CREATE OR REPLACE FUNCTION public.prevent_self_deactivation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.id = auth.uid() AND OLD.ativo = true AND NEW.ativo = false THEN
    RAISE EXCEPTION 'Você não pode desativar seu próprio usuário';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_self_deactivation
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_self_deactivation();
