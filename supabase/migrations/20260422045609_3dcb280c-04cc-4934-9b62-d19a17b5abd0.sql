
-- =============================================================================
-- Sprint 0 Etapa 2: Integridade, concorrência e regras de negócio
-- =============================================================================

-- =============================================
-- A. Race condition nos 4 triggers de numeração sequencial
-- =============================================

CREATE OR REPLACE FUNCTION public.set_rdo_numero()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('rdo_numero_' || NEW.empresa_id::text));
  SELECT COALESCE(MAX(numero), 0) + 1 INTO NEW.numero
  FROM public.rdos
  WHERE empresa_id = NEW.empresa_id;
  RETURN NEW;
END;
$$;

ALTER TABLE public.rdos
  ADD CONSTRAINT rdos_empresa_numero_unique UNIQUE (empresa_id, numero);

CREATE OR REPLACE FUNCTION public.set_solicitacao_numero()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('sol_numero_' || NEW.empresa_id::text));
  SELECT COALESCE(MAX(numero), 0) + 1 INTO NEW.numero
  FROM public.solicitacoes_compra
  WHERE empresa_id = NEW.empresa_id;
  RETURN NEW;
END;
$$;

ALTER TABLE public.solicitacoes_compra
  ADD CONSTRAINT solicitacoes_empresa_numero_unique UNIQUE (empresa_id, numero);

CREATE OR REPLACE FUNCTION public.set_cotacao_numero()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('cot_numero_' || NEW.empresa_id::text));
  SELECT COALESCE(MAX(numero), 0) + 1 INTO NEW.numero
  FROM public.cotacoes
  WHERE empresa_id = NEW.empresa_id;
  RETURN NEW;
END;
$$;

ALTER TABLE public.cotacoes
  ADD CONSTRAINT cotacoes_empresa_numero_unique UNIQUE (empresa_id, numero);

CREATE OR REPLACE FUNCTION public.set_pedido_numero()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('ped_numero_' || NEW.empresa_id::text));
  SELECT COALESCE(MAX(numero), 0) + 1 INTO NEW.numero
  FROM public.pedidos_compra
  WHERE empresa_id = NEW.empresa_id;
  RETURN NEW;
END;
$$;

ALTER TABLE public.pedidos_compra
  ADD CONSTRAINT pedidos_empresa_numero_unique UNIQUE (empresa_id, numero);

-- =============================================
-- B. Anti-spoofing de solicitante_id
-- =============================================

CREATE OR REPLACE FUNCTION public.force_solicitante_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.solicitante_id := auth.uid();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_force_solicitante_id
BEFORE INSERT ON public.solicitacoes_compra
FOR EACH ROW EXECUTE FUNCTION public.force_solicitante_id();

-- =============================================
-- C. Anti-auto-aprovação em solicitacoes_compra
-- =============================================

CREATE OR REPLACE FUNCTION public.prevent_self_approval_solicitacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('aprovada', 'rejeitada')
     AND OLD.status <> NEW.status THEN
    IF OLD.solicitante_id = auth.uid() AND NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Voce nao pode aprovar ou rejeitar uma solicitacao criada por voce mesmo';
    END IF;
    NEW.aprovado_por := auth.uid();
    NEW.aprovado_em := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_self_approval_solicitacao
BEFORE UPDATE ON public.solicitacoes_compra
FOR EACH ROW EXECUTE FUNCTION public.prevent_self_approval_solicitacao();

-- =============================================
-- D. Anti-auto-aprovação em rdo_aprovacoes
-- =============================================

CREATE OR REPLACE FUNCTION public.prevent_self_approval_rdo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_created_by uuid;
BEGIN
  SELECT created_by INTO v_created_by FROM public.rdos WHERE id = NEW.rdo_id;
  IF v_created_by = auth.uid() AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Voce nao pode aprovar um RDO criado por voce mesmo';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_self_approval_rdo
BEFORE INSERT OR UPDATE ON public.rdo_aprovacoes
FOR EACH ROW
WHEN (NEW.status = 'aprovado')
EXECUTE FUNCTION public.prevent_self_approval_rdo();

-- =============================================
-- E. State machine de status em solicitacoes_compra
-- =============================================

CREATE OR REPLACE FUNCTION public.validate_solicitacao_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  valid_transitions jsonb := '{
    "rascunho":  ["pendente", "cancelada"],
    "pendente":  ["aprovada", "rejeitada", "cancelada"],
    "aprovada":  ["cotacao", "cancelada"],
    "cotacao":   ["pedido", "cancelada"],
    "pedido":    ["concluida", "cancelada"]
  }'::jsonb;
  allowed text[];
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  allowed := ARRAY(SELECT jsonb_array_elements_text(valid_transitions -> OLD.status));
  IF allowed IS NULL OR NEW.status <> ALL(allowed) THEN
    RAISE EXCEPTION 'Transicao de status invalida: % -> %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_solicitacao_status
BEFORE UPDATE OF status ON public.solicitacoes_compra
FOR EACH ROW EXECUTE FUNCTION public.validate_solicitacao_status_transition();

-- =============================================
-- F. View auxiliar de profiles visiveis
-- =============================================

CREATE OR REPLACE VIEW public.vw_profiles_visiveis
WITH (security_invoker = true)
AS
SELECT DISTINCT p.id, p.nome, p.cargo, p.matricula, p.ativo
FROM public.profiles p
WHERE
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.usuario_empresas ue1
    JOIN public.usuario_empresas ue2 ON ue2.empresa_id = ue1.empresa_id
    WHERE ue1.user_id = auth.uid()
      AND ue2.user_id = p.id
  )
  OR p.id = auth.uid();

GRANT SELECT ON public.vw_profiles_visiveis TO authenticated;

-- =============================================
-- G. Limpeza de linhas orfas em perfil_permissoes
-- =============================================

DELETE FROM public.perfil_permissoes
WHERE modulo = 'administracao'
   OR (modulo = 'rdo' AND funcionalidade IN ('rdo_form', 'relatorios'));
