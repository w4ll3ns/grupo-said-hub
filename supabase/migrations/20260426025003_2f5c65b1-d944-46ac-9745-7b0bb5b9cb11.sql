-- 1) Coluna pedido_compra_id em lancamentos
ALTER TABLE public.lancamentos
  ADD COLUMN IF NOT EXISTS pedido_compra_id uuid NULL;

CREATE INDEX IF NOT EXISTS idx_lancamentos_pedido_compra_id
  ON public.lancamentos(pedido_compra_id)
  WHERE pedido_compra_id IS NOT NULL;

-- 2) RPC para gerar contas a pagar a partir de um pedido
CREATE OR REPLACE FUNCTION public.gerar_contas_pagar_pedido(
  _pedido_id uuid,
  _parcelas jsonb,
  _plano_despesa_id uuid,
  _centro_custo_id uuid DEFAULT NULL,
  _forma_pagamento_id uuid DEFAULT NULL,
  _conta_bancaria_id uuid DEFAULT NULL,
  _observacoes text DEFAULT NULL
)
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ped public.pedidos_compra%ROWTYPE;
  v_fornecedor_nome text;
  v_total_parcelas numeric := 0;
  v_n int;
  v_i int := 0;
  v_parcela jsonb;
  v_ids uuid[] := ARRAY[]::uuid[];
  v_new_id uuid;
  v_descricao text;
  v_valor numeric;
  v_data_venc date;
BEGIN
  -- Carrega pedido
  SELECT * INTO v_ped FROM public.pedidos_compra WHERE id = _pedido_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido nao encontrado';
  END IF;

  -- Permissao
  IF NOT (public.is_admin(auth.uid())
          OR (public.user_belongs_to_empresa(auth.uid(), v_ped.empresa_id)
              AND public.has_permission(auth.uid(), 'financeiro', 'contas_pagar', 'criar'))) THEN
    RAISE EXCEPTION 'Sem permissao para gerar contas a pagar';
  END IF;

  IF v_ped.status = 'cancelado' THEN
    RAISE EXCEPTION 'Nao e possivel gerar contas a pagar para pedido cancelado';
  END IF;

  -- Idempotencia: ja existem lancamentos nao cancelados vinculados?
  IF EXISTS (
    SELECT 1 FROM public.lancamentos
     WHERE pedido_compra_id = _pedido_id
       AND status <> 'cancelado'
  ) THEN
    RAISE EXCEPTION 'Este pedido ja possui contas a pagar geradas';
  END IF;

  -- Valida plano despesa pertencente a empresa
  IF _plano_despesa_id IS NULL THEN
    RAISE EXCEPTION 'Categoria do plano de contas e obrigatoria';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.plano_despesas
     WHERE id = _plano_despesa_id AND empresa_id = v_ped.empresa_id
  ) THEN
    RAISE EXCEPTION 'Categoria invalida para esta empresa';
  END IF;

  -- Valida parcelas
  IF jsonb_typeof(_parcelas) <> 'array' OR jsonb_array_length(_parcelas) = 0 THEN
    RAISE EXCEPTION 'Informe ao menos uma parcela';
  END IF;

  v_n := jsonb_array_length(_parcelas);

  FOR v_parcela IN SELECT * FROM jsonb_array_elements(_parcelas) LOOP
    v_valor := COALESCE((v_parcela->>'valor')::numeric, 0);
    IF v_valor <= 0 THEN
      RAISE EXCEPTION 'Toda parcela deve ter valor positivo';
    END IF;
    IF (v_parcela->>'data_vencimento') IS NULL THEN
      RAISE EXCEPTION 'Toda parcela deve ter data de vencimento';
    END IF;
    v_total_parcelas := v_total_parcelas + v_valor;
  END LOOP;

  IF ABS(v_total_parcelas - v_ped.valor_total) > 0.01 THEN
    RAISE EXCEPTION 'Soma das parcelas (%) difere do valor total do pedido (%)',
      v_total_parcelas, v_ped.valor_total;
  END IF;

  -- Nome do fornecedor
  SELECT razao_social INTO v_fornecedor_nome
    FROM public.fornecedores WHERE id = v_ped.fornecedor_id;

  -- Valida vinculos opcionais (se enviados, devem ser da mesma empresa)
  IF _centro_custo_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.centros_custo WHERE id = _centro_custo_id AND empresa_id = v_ped.empresa_id
  ) THEN
    RAISE EXCEPTION 'Centro de custo invalido para esta empresa';
  END IF;
  IF _forma_pagamento_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.formas_pagamento WHERE id = _forma_pagamento_id AND empresa_id = v_ped.empresa_id
  ) THEN
    RAISE EXCEPTION 'Forma de pagamento invalida para esta empresa';
  END IF;
  IF _conta_bancaria_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.contas_bancarias WHERE id = _conta_bancaria_id AND empresa_id = v_ped.empresa_id
  ) THEN
    RAISE EXCEPTION 'Conta bancaria invalida para esta empresa';
  END IF;

  -- Insere parcelas
  FOR v_parcela IN SELECT * FROM jsonb_array_elements(_parcelas) LOOP
    v_i := v_i + 1;
    v_valor := (v_parcela->>'valor')::numeric;
    v_data_venc := (v_parcela->>'data_vencimento')::date;

    v_descricao := COALESCE(NULLIF(v_parcela->>'descricao',''),
      'PED-' || COALESCE(v_ped.numero::text, '?') || ' - ' || COALESCE(v_fornecedor_nome, 'Fornecedor')
    );
    IF v_n > 1 THEN
      v_descricao := v_descricao || ' (' || v_i || '/' || v_n || ')';
    END IF;

    INSERT INTO public.lancamentos (
      empresa_id, tipo, descricao, valor,
      data_emissao, data_vencimento,
      status, plano_despesa_id, centro_custo_id,
      forma_pagamento_id, conta_bancaria_id,
      pedido_compra_id, observacoes
    ) VALUES (
      v_ped.empresa_id, 'pagar', v_descricao, v_valor,
      CURRENT_DATE, v_data_venc,
      'pendente', _plano_despesa_id, _centro_custo_id,
      _forma_pagamento_id, _conta_bancaria_id,
      _pedido_id, _observacoes
    ) RETURNING id INTO v_new_id;

    v_ids := v_ids || v_new_id;
  END LOOP;

  RETURN v_ids;
END;
$function$;