ALTER TABLE public.lancamentos
  ADD CONSTRAINT lancamentos_pedido_compra_id_fkey
  FOREIGN KEY (pedido_compra_id)
  REFERENCES public.pedidos_compra(id)
  ON DELETE SET NULL;