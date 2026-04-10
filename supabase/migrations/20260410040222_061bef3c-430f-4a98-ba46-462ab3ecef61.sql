
-- Tabela de lançamentos financeiros
CREATE TABLE public.lancamentos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  tipo text NOT NULL CHECK (tipo IN ('pagar', 'receber')),
  descricao text NOT NULL,
  valor numeric(15,2) NOT NULL,
  data_emissao date NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento date NOT NULL,
  data_pagamento date,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'vencido', 'cancelado')),
  conta_bancaria_id uuid REFERENCES public.contas_bancarias(id),
  forma_pagamento_id uuid REFERENCES public.formas_pagamento(id),
  centro_custo_id uuid REFERENCES public.centros_custo(id),
  plano_receita_id uuid REFERENCES public.plano_receitas(id),
  plano_despesa_id uuid REFERENCES public.plano_despesas(id),
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger de updated_at
CREATE TRIGGER update_lancamentos_updated_at
  BEFORE UPDATE ON public.lancamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger de validação: plano_receita_id só para tipo='receber', plano_despesa_id só para tipo='pagar'
CREATE OR REPLACE FUNCTION public.validate_lancamento_plano()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tipo = 'pagar' AND NEW.plano_receita_id IS NOT NULL THEN
    RAISE EXCEPTION 'plano_receita_id só pode ser preenchido para lançamentos do tipo receber';
  END IF;
  IF NEW.tipo = 'receber' AND NEW.plano_despesa_id IS NOT NULL THEN
    RAISE EXCEPTION 'plano_despesa_id só pode ser preenchido para lançamentos do tipo pagar';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_lancamento_plano_trigger
  BEFORE INSERT OR UPDATE ON public.lancamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_lancamento_plano();

-- RLS
ALTER TABLE public.lancamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage lancamentos"
  ON public.lancamentos FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Users manage own empresa lancamentos"
  ON public.lancamentos FOR ALL
  USING (user_belongs_to_empresa(auth.uid(), empresa_id))
  WITH CHECK (user_belongs_to_empresa(auth.uid(), empresa_id));

-- Index para queries frequentes
CREATE INDEX idx_lancamentos_empresa_tipo ON public.lancamentos(empresa_id, tipo);
CREATE INDEX idx_lancamentos_status ON public.lancamentos(status);
CREATE INDEX idx_lancamentos_vencimento ON public.lancamentos(data_vencimento);
