-- =============================================================================
-- Sprint 1 Etapa 1: Transferências transacionais + saldo atual
-- =============================================================================

-- =============================================
-- 1. Novas colunas em transferencias e lancamentos
-- =============================================

ALTER TABLE public.transferencias
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'normal'
    CHECK (tipo IN ('normal', 'estorno')),
  ADD COLUMN IF NOT EXISTS transferencia_original_id uuid
    REFERENCES public.transferencias(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();

ALTER TABLE public.lancamentos
  ADD COLUMN IF NOT EXISTS transferencia_id uuid
    REFERENCES public.transferencias(id) ON DELETE RESTRICT;

-- Index para saldo rápido por conta
CREATE INDEX IF NOT EXISTS idx_lancamentos_conta_status
  ON public.lancamentos(conta_bancaria_id, status)
  WHERE conta_bancaria_id IS NOT NULL;

-- =============================================
-- 2. RPC criar_transferencia
-- =============================================

CREATE OR REPLACE FUNCTION public.criar_transferencia(
  _empresa_id uuid,
  _conta_origem_id uuid,
  _conta_destino_id uuid,
  _valor numeric,
  _data date,
  _descricao text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transferencia_id uuid;
  v_descricao_origem text;
  v_descricao_destino text;
  v_nome_origem text;
  v_nome_destino text;
BEGIN
  IF _conta_origem_id = _conta_destino_id THEN
    RAISE EXCEPTION 'Conta de origem e destino devem ser diferentes';
  END IF;
  IF _valor <= 0 THEN
    RAISE EXCEPTION 'Valor da transferência deve ser positivo';
  END IF;

  IF NOT (public.is_admin(auth.uid())
          OR public.has_permission(auth.uid(), 'financeiro', 'transferencias', 'criar')) THEN
    RAISE EXCEPTION 'Sem permissão para criar transferências';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.contas_bancarias
                 WHERE id = _conta_origem_id AND empresa_id = _empresa_id AND ativa = true) THEN
    RAISE EXCEPTION 'Conta de origem inválida ou inativa';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.contas_bancarias
                 WHERE id = _conta_destino_id AND empresa_id = _empresa_id AND ativa = true) THEN
    RAISE EXCEPTION 'Conta de destino inválida ou inativa';
  END IF;

  SELECT nome INTO v_nome_origem FROM public.contas_bancarias WHERE id = _conta_origem_id;
  SELECT nome INTO v_nome_destino FROM public.contas_bancarias WHERE id = _conta_destino_id;

  INSERT INTO public.transferencias (
    empresa_id, conta_origem_id, conta_destino_id, valor, data, descricao, tipo, created_by
  )
  VALUES (
    _empresa_id, _conta_origem_id, _conta_destino_id, _valor, _data, _descricao, 'normal', auth.uid()
  )
  RETURNING id INTO v_transferencia_id;

  v_descricao_origem := COALESCE(_descricao, 'Transferência') || ' → ' || v_nome_destino;
  v_descricao_destino := COALESCE(_descricao, 'Transferência') || ' ← ' || v_nome_origem;

  INSERT INTO public.lancamentos (
    empresa_id, tipo, descricao, valor, data_emissao, data_vencimento, data_pagamento,
    status, conta_bancaria_id, transferencia_id, observacoes
  ) VALUES (
    _empresa_id, 'pagar', v_descricao_origem, _valor, _data, _data, _data,
    'pago', _conta_origem_id, v_transferencia_id, 'Gerado automaticamente por transferência'
  );

  INSERT INTO public.lancamentos (
    empresa_id, tipo, descricao, valor, data_emissao, data_vencimento, data_pagamento,
    status, conta_bancaria_id, transferencia_id, observacoes
  ) VALUES (
    _empresa_id, 'receber', v_descricao_destino, _valor, _data, _data, _data,
    'pago', _conta_destino_id, v_transferencia_id, 'Gerado automaticamente por transferência'
  );

  RETURN v_transferencia_id;
END;
$$;

-- =============================================
-- 3. RPC estornar_transferencia
-- =============================================

CREATE OR REPLACE FUNCTION public.estornar_transferencia(
  _transferencia_id uuid,
  _motivo text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_original public.transferencias%ROWTYPE;
  v_estorno_id uuid;
  v_nome_origem text;
  v_nome_destino text;
  v_descricao text;
BEGIN
  IF NOT (public.is_admin(auth.uid())
          OR public.has_permission(auth.uid(), 'financeiro', 'transferencias', 'editar')
          OR public.has_permission(auth.uid(), 'financeiro', 'transferencias', 'excluir')) THEN
    RAISE EXCEPTION 'Sem permissão para estornar transferências';
  END IF;

  SELECT * INTO v_original FROM public.transferencias WHERE id = _transferencia_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transferência não encontrada';
  END IF;

  IF NOT public.user_belongs_to_empresa(auth.uid(), v_original.empresa_id) AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Sem acesso a esta empresa';
  END IF;

  IF v_original.tipo = 'estorno' THEN
    RAISE EXCEPTION 'Não é possível estornar um estorno';
  END IF;

  IF EXISTS (SELECT 1 FROM public.transferencias WHERE transferencia_original_id = _transferencia_id) THEN
    RAISE EXCEPTION 'Esta transferência já foi estornada';
  END IF;

  SELECT nome INTO v_nome_origem FROM public.contas_bancarias WHERE id = v_original.conta_destino_id;
  SELECT nome INTO v_nome_destino FROM public.contas_bancarias WHERE id = v_original.conta_origem_id;

  v_descricao := 'Estorno: ' || COALESCE(v_original.descricao, 'Transferência')
                 || COALESCE(' — ' || _motivo, '');

  INSERT INTO public.transferencias (
    empresa_id, conta_origem_id, conta_destino_id, valor, data, descricao,
    tipo, transferencia_original_id, created_by
  ) VALUES (
    v_original.empresa_id,
    v_original.conta_destino_id,
    v_original.conta_origem_id,
    v_original.valor,
    CURRENT_DATE,
    v_descricao,
    'estorno',
    v_original.id,
    auth.uid()
  )
  RETURNING id INTO v_estorno_id;

  INSERT INTO public.lancamentos (
    empresa_id, tipo, descricao, valor, data_emissao, data_vencimento, data_pagamento,
    status, conta_bancaria_id, transferencia_id, observacoes
  ) VALUES (
    v_original.empresa_id, 'pagar', v_descricao || ' → ' || v_nome_destino,
    v_original.valor, CURRENT_DATE, CURRENT_DATE, CURRENT_DATE,
    'pago', v_original.conta_destino_id, v_estorno_id,
    'Estorno gerado automaticamente'
  );

  INSERT INTO public.lancamentos (
    empresa_id, tipo, descricao, valor, data_emissao, data_vencimento, data_pagamento,
    status, conta_bancaria_id, transferencia_id, observacoes
  ) VALUES (
    v_original.empresa_id, 'receber', v_descricao || ' ← ' || v_nome_origem,
    v_original.valor, CURRENT_DATE, CURRENT_DATE, CURRENT_DATE,
    'pago', v_original.conta_origem_id, v_estorno_id,
    'Estorno gerado automaticamente'
  );

  RETURN v_estorno_id;
END;
$$;

-- =============================================
-- 4. VIEW de saldo atual
-- =============================================

CREATE OR REPLACE VIEW public.vw_saldo_conta_atual
WITH (security_invoker = true)
AS
SELECT
  cb.id AS conta_id,
  cb.empresa_id,
  cb.nome,
  cb.saldo_inicial,
  cb.saldo_inicial
    + COALESCE((SELECT SUM(valor) FROM public.lancamentos
                WHERE conta_bancaria_id = cb.id AND tipo = 'receber' AND status = 'pago'), 0)
    - COALESCE((SELECT SUM(valor) FROM public.lancamentos
                WHERE conta_bancaria_id = cb.id AND tipo = 'pagar' AND status = 'pago'), 0)
    AS saldo_efetivo,
  cb.saldo_inicial
    + COALESCE((SELECT SUM(valor) FROM public.lancamentos
                WHERE conta_bancaria_id = cb.id AND tipo = 'receber' AND status IN ('pago','pendente','vencido')), 0)
    - COALESCE((SELECT SUM(valor) FROM public.lancamentos
                WHERE conta_bancaria_id = cb.id AND tipo = 'pagar' AND status IN ('pago','pendente','vencido')), 0)
    AS saldo_previsto
FROM public.contas_bancarias cb
WHERE cb.ativa = true;

GRANT SELECT ON public.vw_saldo_conta_atual TO authenticated;