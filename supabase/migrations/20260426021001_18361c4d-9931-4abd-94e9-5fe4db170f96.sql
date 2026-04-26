CREATE OR REPLACE FUNCTION public.salvar_mapa_cotacao(
  _solicitacao_id uuid,
  _empresa_id uuid,
  _fornecedores jsonb
)
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_sc public.solicitacoes_compra%ROWTYPE;
  v_fornecedor jsonb;
  v_item jsonb;
  v_cotacao_id uuid;
  v_ids uuid[] := ARRAY[]::uuid[];
  v_fornecedor_id uuid;
  v_seen_fornecedores uuid[] := ARRAY[]::uuid[];
  v_fornecedor_nome text;
BEGIN
  -- Permissão
  IF NOT (public.is_admin(auth.uid())
          OR (public.user_belongs_to_empresa(auth.uid(), _empresa_id)
              AND public.has_permission(auth.uid(), 'compras', 'cotacoes', 'criar'))) THEN
    RAISE EXCEPTION 'Sem permissão para criar cotações';
  END IF;

  -- SC existe e pertence à empresa
  SELECT * INTO v_sc FROM public.solicitacoes_compra
   WHERE id = _solicitacao_id AND empresa_id = _empresa_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitação não encontrada nesta empresa';
  END IF;

  IF v_sc.status NOT IN ('aprovada', 'cotacao') THEN
    RAISE EXCEPTION 'Apenas solicitações aprovadas ou em cotação podem receber propostas (status atual: %)', v_sc.status;
  END IF;

  -- Validação do array de fornecedores
  IF jsonb_typeof(_fornecedores) <> 'array' OR jsonb_array_length(_fornecedores) = 0 THEN
    RAISE EXCEPTION 'Informe ao menos um fornecedor';
  END IF;

  -- Loop por fornecedor
  FOR v_fornecedor IN SELECT * FROM jsonb_array_elements(_fornecedores) LOOP
    v_fornecedor_id := NULLIF(v_fornecedor->>'fornecedor_id','')::uuid;
    IF v_fornecedor_id IS NULL THEN
      RAISE EXCEPTION 'Cada proposta precisa de um fornecedor';
    END IF;

    -- Duplicidade no payload
    IF v_fornecedor_id = ANY(v_seen_fornecedores) THEN
      SELECT razao_social INTO v_fornecedor_nome FROM public.fornecedores WHERE id = v_fornecedor_id;
      RAISE EXCEPTION 'Fornecedor % aparece mais de uma vez no mapa', COALESCE(v_fornecedor_nome, v_fornecedor_id::text);
    END IF;
    v_seen_fornecedores := v_seen_fornecedores || v_fornecedor_id;

    -- Duplicidade no banco (cotação pendente do mesmo fornecedor para a mesma SC)
    IF EXISTS (
      SELECT 1 FROM public.cotacoes
       WHERE solicitacao_id = _solicitacao_id
         AND fornecedor_id = v_fornecedor_id
         AND status = 'pendente'
    ) THEN
      SELECT razao_social INTO v_fornecedor_nome FROM public.fornecedores WHERE id = v_fornecedor_id;
      RAISE EXCEPTION 'O fornecedor % já possui cotação pendente nesta solicitação', COALESCE(v_fornecedor_nome, v_fornecedor_id::text);
    END IF;

    -- Itens do fornecedor
    IF jsonb_typeof(v_fornecedor->'itens') <> 'array' OR jsonb_array_length(v_fornecedor->'itens') = 0 THEN
      RAISE EXCEPTION 'Cada fornecedor precisa de pelo menos um item';
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(v_fornecedor->'itens') LOOP
      IF (v_item->>'solicitacao_item_id') IS NULL THEN
        RAISE EXCEPTION 'Cada item precisa referenciar um solicitacao_item_id';
      END IF;
      IF COALESCE((v_item->>'valor_unitario')::numeric, 0) <= 0 THEN
        RAISE EXCEPTION 'Todos os itens precisam ter valor unitário maior que zero';
      END IF;
      IF COALESCE((v_item->>'quantidade')::numeric, 0) <= 0 THEN
        RAISE EXCEPTION 'Quantidade dos itens deve ser maior que zero';
      END IF;
    END LOOP;

    -- Insere cotação (numero é setado pelo trigger set_cotacao_numero)
    INSERT INTO public.cotacoes (
      empresa_id, solicitacao_id, fornecedor_id,
      data_validade, condicao_pagamento, prazo_entrega, observacoes,
      valor_total, status
    ) VALUES (
      _empresa_id, _solicitacao_id, v_fornecedor_id,
      NULLIF(v_fornecedor->>'data_validade','')::date,
      NULLIF(v_fornecedor->>'condicao_pagamento',''),
      NULLIF(v_fornecedor->>'prazo_entrega',''),
      NULLIF(v_fornecedor->>'observacoes',''),
      0, 'pendente'
    ) RETURNING id INTO v_cotacao_id;

    -- Insere itens (trigger recalc_cotacao_valor_total atualiza valor_total)
    INSERT INTO public.cotacao_itens (cotacao_id, solicitacao_item_id, quantidade, valor_unitario, valor_total)
    SELECT
      v_cotacao_id,
      (i->>'solicitacao_item_id')::uuid,
      (i->>'quantidade')::numeric,
      (i->>'valor_unitario')::numeric,
      (i->>'quantidade')::numeric * (i->>'valor_unitario')::numeric
    FROM jsonb_array_elements(v_fornecedor->'itens') i;

    v_ids := v_ids || v_cotacao_id;
  END LOOP;

  -- Avança SC para 'cotacao' se ainda estava 'aprovada'
  UPDATE public.solicitacoes_compra
     SET status = 'cotacao'
   WHERE id = _solicitacao_id AND status = 'aprovada';

  RETURN v_ids;
END;
$function$;