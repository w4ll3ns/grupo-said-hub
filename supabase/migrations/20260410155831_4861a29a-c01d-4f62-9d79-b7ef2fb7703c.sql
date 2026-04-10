
-- 1. Fornecedores
CREATE TABLE public.fornecedores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj_cpf TEXT,
  email TEXT,
  telefone TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage fornecedores" ON public.fornecedores FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Users manage own empresa fornecedores" ON public.fornecedores FOR ALL USING (user_belongs_to_empresa(auth.uid(), empresa_id)) WITH CHECK (user_belongs_to_empresa(auth.uid(), empresa_id));
CREATE TRIGGER update_fornecedores_updated_at BEFORE UPDATE ON public.fornecedores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Produtos
CREATE TABLE public.produtos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  unidade TEXT NOT NULL DEFAULT 'un',
  categoria TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage produtos" ON public.produtos FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Users manage own empresa produtos" ON public.produtos FOR ALL USING (user_belongs_to_empresa(auth.uid(), empresa_id)) WITH CHECK (user_belongs_to_empresa(auth.uid(), empresa_id));
CREATE TRIGGER update_produtos_updated_at BEFORE UPDATE ON public.produtos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Solicitações de Compra
CREATE TABLE public.solicitacoes_compra (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  numero INTEGER,
  solicitante_id UUID NOT NULL DEFAULT auth.uid(),
  data_solicitacao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_necessidade DATE,
  obra_id UUID REFERENCES public.obras(id) ON DELETE SET NULL,
  centro_custo_id UUID REFERENCES public.centros_custo(id) ON DELETE SET NULL,
  justificativa TEXT,
  prioridade TEXT NOT NULL DEFAULT 'media',
  status TEXT NOT NULL DEFAULT 'rascunho',
  aprovado_por UUID,
  aprovado_em TIMESTAMPTZ,
  motivo_rejeicao TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.solicitacoes_compra ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage solicitacoes_compra" ON public.solicitacoes_compra FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Users manage own empresa solicitacoes_compra" ON public.solicitacoes_compra FOR ALL USING (user_belongs_to_empresa(auth.uid(), empresa_id)) WITH CHECK (user_belongs_to_empresa(auth.uid(), empresa_id));
CREATE TRIGGER update_solicitacoes_compra_updated_at BEFORE UPDATE ON public.solicitacoes_compra FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger auto-incremento número solicitação
CREATE OR REPLACE FUNCTION public.set_solicitacao_numero()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  SELECT COALESCE(MAX(numero), 0) + 1 INTO NEW.numero
  FROM public.solicitacoes_compra
  WHERE empresa_id = NEW.empresa_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER set_solicitacao_numero_trigger BEFORE INSERT ON public.solicitacoes_compra FOR EACH ROW EXECUTE FUNCTION public.set_solicitacao_numero();

-- 4. Itens da Solicitação
CREATE TABLE public.solicitacao_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  solicitacao_id UUID NOT NULL REFERENCES public.solicitacoes_compra(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  quantidade NUMERIC NOT NULL DEFAULT 1,
  unidade TEXT NOT NULL DEFAULT 'un',
  observacao TEXT
);
ALTER TABLE public.solicitacao_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage solicitacao_itens" ON public.solicitacao_itens FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Users manage own empresa solicitacao_itens" ON public.solicitacao_itens FOR ALL USING (EXISTS (SELECT 1 FROM public.solicitacoes_compra sc WHERE sc.id = solicitacao_itens.solicitacao_id AND user_belongs_to_empresa(auth.uid(), sc.empresa_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.solicitacoes_compra sc WHERE sc.id = solicitacao_itens.solicitacao_id AND user_belongs_to_empresa(auth.uid(), sc.empresa_id)));

-- 5. Cotações
CREATE TABLE public.cotacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  solicitacao_id UUID NOT NULL REFERENCES public.solicitacoes_compra(id) ON DELETE CASCADE,
  fornecedor_id UUID NOT NULL REFERENCES public.fornecedores(id) ON DELETE RESTRICT,
  numero INTEGER,
  data_cotacao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_validade DATE,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  condicao_pagamento TEXT,
  prazo_entrega TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cotacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage cotacoes" ON public.cotacoes FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Users manage own empresa cotacoes" ON public.cotacoes FOR ALL USING (user_belongs_to_empresa(auth.uid(), empresa_id)) WITH CHECK (user_belongs_to_empresa(auth.uid(), empresa_id));
CREATE TRIGGER update_cotacoes_updated_at BEFORE UPDATE ON public.cotacoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger auto-incremento número cotação
CREATE OR REPLACE FUNCTION public.set_cotacao_numero()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  SELECT COALESCE(MAX(numero), 0) + 1 INTO NEW.numero
  FROM public.cotacoes
  WHERE empresa_id = NEW.empresa_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER set_cotacao_numero_trigger BEFORE INSERT ON public.cotacoes FOR EACH ROW EXECUTE FUNCTION public.set_cotacao_numero();

-- 6. Itens da Cotação
CREATE TABLE public.cotacao_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cotacao_id UUID NOT NULL REFERENCES public.cotacoes(id) ON DELETE CASCADE,
  solicitacao_item_id UUID NOT NULL REFERENCES public.solicitacao_itens(id) ON DELETE CASCADE,
  valor_unitario NUMERIC NOT NULL DEFAULT 0,
  quantidade NUMERIC NOT NULL DEFAULT 1,
  valor_total NUMERIC NOT NULL DEFAULT 0
);
ALTER TABLE public.cotacao_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage cotacao_itens" ON public.cotacao_itens FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Users manage own empresa cotacao_itens" ON public.cotacao_itens FOR ALL USING (EXISTS (SELECT 1 FROM public.cotacoes c WHERE c.id = cotacao_itens.cotacao_id AND user_belongs_to_empresa(auth.uid(), c.empresa_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.cotacoes c WHERE c.id = cotacao_itens.cotacao_id AND user_belongs_to_empresa(auth.uid(), c.empresa_id)));

-- 7. Pedidos de Compra
CREATE TABLE public.pedidos_compra (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cotacao_id UUID REFERENCES public.cotacoes(id) ON DELETE SET NULL,
  fornecedor_id UUID NOT NULL REFERENCES public.fornecedores(id) ON DELETE RESTRICT,
  numero INTEGER,
  data_pedido DATE NOT NULL DEFAULT CURRENT_DATE,
  data_entrega_prevista DATE,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente',
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pedidos_compra ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage pedidos_compra" ON public.pedidos_compra FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Users manage own empresa pedidos_compra" ON public.pedidos_compra FOR ALL USING (user_belongs_to_empresa(auth.uid(), empresa_id)) WITH CHECK (user_belongs_to_empresa(auth.uid(), empresa_id));
CREATE TRIGGER update_pedidos_compra_updated_at BEFORE UPDATE ON public.pedidos_compra FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger auto-incremento número pedido
CREATE OR REPLACE FUNCTION public.set_pedido_numero()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  SELECT COALESCE(MAX(numero), 0) + 1 INTO NEW.numero
  FROM public.pedidos_compra
  WHERE empresa_id = NEW.empresa_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER set_pedido_numero_trigger BEFORE INSERT ON public.pedidos_compra FOR EACH ROW EXECUTE FUNCTION public.set_pedido_numero();
