
-- Plano de Receitas
CREATE TABLE public.plano_receitas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL,
  subcategoria TEXT NOT NULL,
  ativa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.plano_receitas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage plano_receitas" ON public.plano_receitas FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Users manage own empresa plano_receitas" ON public.plano_receitas FOR ALL USING (public.user_belongs_to_empresa(auth.uid(), empresa_id)) WITH CHECK (public.user_belongs_to_empresa(auth.uid(), empresa_id));
CREATE TRIGGER update_plano_receitas_updated_at BEFORE UPDATE ON public.plano_receitas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Plano de Despesas
CREATE TABLE public.plano_despesas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL,
  subcategoria TEXT NOT NULL,
  ativa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.plano_despesas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage plano_despesas" ON public.plano_despesas FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Users manage own empresa plano_despesas" ON public.plano_despesas FOR ALL USING (public.user_belongs_to_empresa(auth.uid(), empresa_id)) WITH CHECK (public.user_belongs_to_empresa(auth.uid(), empresa_id));
CREATE TRIGGER update_plano_despesas_updated_at BEFORE UPDATE ON public.plano_despesas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Contas Bancárias
CREATE TABLE public.contas_bancarias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  banco TEXT,
  agencia TEXT,
  conta TEXT,
  tipo TEXT NOT NULL DEFAULT 'corrente',
  saldo_inicial NUMERIC(15,2) NOT NULL DEFAULT 0,
  ativa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contas_bancarias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage contas_bancarias" ON public.contas_bancarias FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Users manage own empresa contas_bancarias" ON public.contas_bancarias FOR ALL USING (public.user_belongs_to_empresa(auth.uid(), empresa_id)) WITH CHECK (public.user_belongs_to_empresa(auth.uid(), empresa_id));
CREATE TRIGGER update_contas_bancarias_updated_at BEFORE UPDATE ON public.contas_bancarias FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Formas de Pagamento
CREATE TABLE public.formas_pagamento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ativa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.formas_pagamento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage formas_pagamento" ON public.formas_pagamento FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Users manage own empresa formas_pagamento" ON public.formas_pagamento FOR ALL USING (public.user_belongs_to_empresa(auth.uid(), empresa_id)) WITH CHECK (public.user_belongs_to_empresa(auth.uid(), empresa_id));
CREATE TRIGGER update_formas_pagamento_updated_at BEFORE UPDATE ON public.formas_pagamento FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Centros de Custo
CREATE TABLE public.centros_custo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.centros_custo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage centros_custo" ON public.centros_custo FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Users manage own empresa centros_custo" ON public.centros_custo FOR ALL USING (public.user_belongs_to_empresa(auth.uid(), empresa_id)) WITH CHECK (public.user_belongs_to_empresa(auth.uid(), empresa_id));
CREATE TRIGGER update_centros_custo_updated_at BEFORE UPDATE ON public.centros_custo FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
