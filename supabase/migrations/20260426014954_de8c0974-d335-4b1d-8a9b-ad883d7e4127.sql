-- 1) RPC: salvar cotação com itens (criar ou editar) numa única transação
CREATE OR REPLACE FUNCTION public.salvar_cotacao_com_itens(
  _cotacao jsonb,
  _itens jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
  v_empresa_id uuid;
  v_solicitacao_id uuid;
  v_fornecedor_id uuid;
  v_status text;
  v_existing public.cotacoes%ROWTYPE;
  v_item jsonb;
BEGIN
  v_id := NULLIF(_cotacao->>'id','')::uuid;
  v_empresa_id := (_cotacao->>'empresa_id')::uuid;
  v_solicitacao_id := (_cotacao->>'solicitacao_id')::uuid;
  v_fornecedor_id := (_cotacao->>'fornecedor_id')::uuid;

  IF v_empresa_id IS NULL OR v_solicitacao_id IS NULL OR v_fornecedor_id IS NULL THEN
    RAISE EXCEPTION 'empresa_id, solicitacao_id e fornecedor_id são obrigatórios';
  END IF;

  IF jsonb_typeof(_itens) <> 'array' OR jsonb_array_length(_itens) = 0 THEN
    RAISE EXCEPTION 'É necessário informar ao menos um item';
  END IF;

  -- Validações por linha
  FOR v_item IN SELECT * FROM jsonb_array_elements(_itens) LOOP
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

  IF v_id IS NULL THEN
    -- CREATE
    IF NOT (public.is_admin(auth.uid()) OR (
      public.user_belongs_to_empresa(auth.uid(), v_empresa_id)
      AND public.has_permission(auth.uid(), 'compras', 'cotacoes', 'criar')
    )) THEN
      RAISE EXCEPTION 'Sem permissão para criar cotações';
    END IF;

    INSERT INTO public.cotacoes (
      empresa_id, solicitacao_id, fornecedor_id,
      data_validade, condicao_pagamento, prazo_entrega, observacoes,
      valor_total, status
    ) VALUES (
      v_empresa_id, v_solicitacao_id, v_fornecedor_id,
      NULLIF(_cotacao->>'data_validade','')::date,
      NULLIF(_cotacao->>'condicao_pagamento',''),
      NULLIF(_cotacao->>'prazo_entrega',''),
      NULLIF(_cotacao->>'observacoes',''),
      0, 'pendente'
    ) RETURNING id INTO v_id;

    -- Avança SC para 'cotacao' se ainda estava 'aprovada'
    UPDATE public.solicitacoes_compra
       SET status = 'cotacao'
     WHERE id = v_solicitacao_id AND status = 'aprovada';
  ELSE
    -- UPDATE
    SELECT * INTO v_existing FROM public.cotacoes WHERE id = v_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Cotação não encontrada'; END IF;

    IF NOT (public.is_admin(auth.uid()) OR (
      public.user_belongs_to_empresa(auth.uid(), v_existing.empresa_id)
      AND public.has_permission(auth.uid(), 'compras', 'cotacoes', 'editar')
    )) THEN
      RAISE EXCEPTION 'Sem permissão para editar cotações';
    END IF;

    IF v_existing.status <> 'pendente' THEN
      RAISE EXCEPTION 'Apenas cotações pendentes podem ser editadas (status atual: %)', v_existing.status;
    END IF;

    UPDATE public.cotacoes
       SET fornecedor_id = v_fornecedor_id,
           data_validade = NULLIF(_cotacao->>'data_validade','')::date,
           condicao_pagamento = NULLIF(_cotacao->>'condicao_pagamento',''),
           prazo_entrega = NULLIF(_cotacao->>'prazo_entrega',''),
           observacoes = NULLIF(_cotacao->>'observacoes',''),
           updated_at = now()
     WHERE id = v_id;

    DELETE FROM public.cotacao_itens WHERE cotacao_id = v_id;
  END IF;

  -- Insere itens
  INSERT INTO public.cotacao_itens (cotacao_id, solicitacao_item_id, quantidade, valor_unitario, valor_total)
  SELECT
    v_id,
    (i->>'solicitacao_item_id')::uuid,
    (i->>'quantidade')::numeric,
    (i->>'valor_unitario')::numeric,
    (i->>'quantidade')::numeric * (i->>'valor_unitario')::numeric
  FROM jsonb_array_elements(_itens) i;

  RETURN v_id;
END;
$$;

-- 2) Trigger: recalcula valor_total da cotação quando os itens mudam
CREATE OR REPLACE FUNCTION public.recalc_cotacao_valor_total()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cot uuid;
  v_total numeric;
BEGIN
  v_cot := COALESCE(NEW.cotacao_id, OLD.cotacao_id);
  SELECT COALESCE(SUM(valor_total), 0) INTO v_total
    FROM public.cotacao_itens WHERE cotacao_id = v_cot;
  UPDATE public.cotacoes SET valor_total = v_total, updated_at = now() WHERE id = v_cot;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_cotacao_valor_total ON public.cotacao_itens;
CREATE TRIGGER trg_recalc_cotacao_valor_total
AFTER INSERT OR UPDATE OR DELETE ON public.cotacao_itens
FOR EACH ROW EXECUTE FUNCTION public.recalc_cotacao_valor_total();