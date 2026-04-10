-- Transferências entre contas bancárias
CREATE TABLE public.transferencias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  conta_origem_id UUID NOT NULL REFERENCES public.contas_bancarias(id) ON DELETE RESTRICT,
  conta_destino_id UUID NOT NULL REFERENCES public.contas_bancarias(id) ON DELETE RESTRICT,
  valor NUMERIC NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT transferencia_contas_diferentes CHECK (conta_origem_id <> conta_destino_id)
);

ALTER TABLE public.transferencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage transferencias"
  ON public.transferencias FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Users manage own empresa transferencias"
  ON public.transferencias FOR ALL
  USING (user_belongs_to_empresa(auth.uid(), empresa_id))
  WITH CHECK (user_belongs_to_empresa(auth.uid(), empresa_id));

CREATE TRIGGER update_transferencias_updated_at
  BEFORE UPDATE ON public.transferencias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Metas financeiras
CREATE TABLE public.metas_financeiras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa')),
  categoria TEXT NOT NULL,
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  valor_meta NUMERIC NOT NULL,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.metas_financeiras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage metas_financeiras"
  ON public.metas_financeiras FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Users manage own empresa metas_financeiras"
  ON public.metas_financeiras FOR ALL
  USING (user_belongs_to_empresa(auth.uid(), empresa_id))
  WITH CHECK (user_belongs_to_empresa(auth.uid(), empresa_id));

CREATE TRIGGER update_metas_financeiras_updated_at
  BEFORE UPDATE ON public.metas_financeiras
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();