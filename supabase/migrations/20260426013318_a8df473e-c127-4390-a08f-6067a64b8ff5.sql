CREATE OR REPLACE FUNCTION public.aprovar_cotacao(_cotacao_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cot public.cotacoes%ROWTYPE;
BEGIN
  SELECT * INTO v_cot FROM public.cotacoes WHERE id = _cotacao_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cotação não encontrada'; END IF;
  IF NOT (public.is_admin(auth.uid()) OR (public.user_belongs_to_empresa(auth.uid(), v_cot.empresa_id)
      AND public.has_permission(auth.uid(), 'compras', 'cotacoes', 'aprovar'))) THEN
    RAISE EXCEPTION 'Sem permissão para aprovar cotações'; END IF;
  IF v_cot.status <> 'pendente' THEN
    RAISE EXCEPTION 'Apenas cotações pendentes podem ser aprovadas (status: %)', v_cot.status; END IF;
  UPDATE public.cotacoes SET status = 'aprovada' WHERE id = _cotacao_id;
  UPDATE public.cotacoes SET status = 'rejeitada'
   WHERE solicitacao_id = v_cot.solicitacao_id AND id <> _cotacao_id AND status = 'pendente';
END; $$;

CREATE OR REPLACE FUNCTION public.gerar_pedido_compra(
  _cotacao_id uuid, _data_entrega_prevista date DEFAULT NULL, _observacoes text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cot public.cotacoes%ROWTYPE; v_pedido_id uuid;
BEGIN
  SELECT * INTO v_cot FROM public.cotacoes WHERE id = _cotacao_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cotação não encontrada'; END IF;
  IF NOT (public.is_admin(auth.uid()) OR (public.user_belongs_to_empresa(auth.uid(), v_cot.empresa_id)
      AND public.has_permission(auth.uid(), 'compras', 'pedidos', 'criar'))) THEN
    RAISE EXCEPTION 'Sem permissão para gerar pedidos'; END IF;
  IF v_cot.status <> 'aprovada' THEN
    RAISE EXCEPTION 'Só é possível gerar pedido a partir de cotação aprovada'; END IF;
  IF EXISTS (SELECT 1 FROM public.pedidos_compra WHERE cotacao_id = _cotacao_id AND status <> 'cancelado') THEN
    RAISE EXCEPTION 'Já existe um pedido ativo para esta cotação'; END IF;
  INSERT INTO public.pedidos_compra (empresa_id, cotacao_id, fornecedor_id, valor_total, data_entrega_prevista, observacoes)
  VALUES (v_cot.empresa_id, _cotacao_id, v_cot.fornecedor_id, v_cot.valor_total, _data_entrega_prevista, _observacoes)
  RETURNING id INTO v_pedido_id;
  UPDATE public.solicitacoes_compra SET status = 'pedido'
   WHERE id = v_cot.solicitacao_id AND status = 'cotacao';
  RETURN v_pedido_id;
END; $$;

CREATE OR REPLACE FUNCTION public.concluir_pedido(_pedido_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ped public.pedidos_compra%ROWTYPE; v_sol_id uuid;
BEGIN
  SELECT * INTO v_ped FROM public.pedidos_compra WHERE id = _pedido_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
  IF NOT (public.is_admin(auth.uid()) OR (public.user_belongs_to_empresa(auth.uid(), v_ped.empresa_id)
      AND public.has_permission(auth.uid(), 'compras', 'pedidos', 'editar'))) THEN
    RAISE EXCEPTION 'Sem permissão para concluir pedidos'; END IF;
  UPDATE public.pedidos_compra SET status = 'entregue' WHERE id = _pedido_id;
  SELECT solicitacao_id INTO v_sol_id FROM public.cotacoes WHERE id = v_ped.cotacao_id;
  IF v_sol_id IS NOT NULL THEN
    UPDATE public.solicitacoes_compra SET status = 'concluida' WHERE id = v_sol_id AND status = 'pedido';
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.protect_cotacao_with_pedido()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF EXISTS (SELECT 1 FROM public.pedidos_compra WHERE cotacao_id = OLD.id AND status <> 'cancelado') THEN
      RAISE EXCEPTION 'Não é possível excluir cotação com pedido ativo'; END IF;
    RETURN OLD;
  ELSE
    IF OLD.status = 'aprovada' AND NEW.status <> 'aprovada'
       AND EXISTS (SELECT 1 FROM public.pedidos_compra WHERE cotacao_id = OLD.id AND status <> 'cancelado') THEN
      RAISE EXCEPTION 'Não é possível alterar status: cotação tem pedido ativo'; END IF;
    RETURN NEW;
  END IF;
END; $$;

DROP TRIGGER IF EXISTS trg_protect_cotacao_with_pedido ON public.cotacoes;
CREATE TRIGGER trg_protect_cotacao_with_pedido
BEFORE UPDATE OR DELETE ON public.cotacoes
FOR EACH ROW EXECUTE FUNCTION public.protect_cotacao_with_pedido();

CREATE OR REPLACE FUNCTION public.protect_solicitacao_with_pedido_ativo()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'cancelada' AND OLD.status <> 'cancelada' THEN
    IF EXISTS (
      SELECT 1 FROM public.pedidos_compra p
        JOIN public.cotacoes c ON c.id = p.cotacao_id
       WHERE c.solicitacao_id = OLD.id AND p.status NOT IN ('cancelado', 'entregue')
    ) THEN RAISE EXCEPTION 'Cancele o pedido vinculado antes de cancelar a solicitação'; END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_protect_solicitacao_with_pedido_ativo ON public.solicitacoes_compra;
CREATE TRIGGER trg_protect_solicitacao_with_pedido_ativo
BEFORE UPDATE ON public.solicitacoes_compra
FOR EACH ROW EXECUTE FUNCTION public.protect_solicitacao_with_pedido_ativo();

-- Reconciliação SC-1: cotacao -> pedido -> concluida (respeita transições válidas)
UPDATE public.solicitacoes_compra s SET status = 'pedido'
  WHERE s.status = 'cotacao'
    AND EXISTS (SELECT 1 FROM public.cotacoes c
        JOIN public.pedidos_compra p ON p.cotacao_id = c.id
       WHERE c.solicitacao_id = s.id AND p.status = 'entregue');

UPDATE public.solicitacoes_compra s SET status = 'concluida'
  WHERE s.status = 'pedido'
    AND EXISTS (SELECT 1 FROM public.cotacoes c
        JOIN public.pedidos_compra p ON p.cotacao_id = c.id
       WHERE c.solicitacao_id = s.id AND p.status = 'entregue');
