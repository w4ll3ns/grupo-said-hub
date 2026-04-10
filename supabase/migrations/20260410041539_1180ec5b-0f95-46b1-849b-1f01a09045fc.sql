
-- Tabela obras
CREATE TABLE public.obras (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  endereco text,
  responsavel text,
  status text NOT NULL DEFAULT 'em_andamento',
  data_inicio date,
  data_previsao date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.obras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage obras" ON public.obras FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Users manage own empresa obras" ON public.obras FOR ALL
  USING (public.user_belongs_to_empresa(auth.uid(), empresa_id))
  WITH CHECK (public.user_belongs_to_empresa(auth.uid(), empresa_id));

CREATE TRIGGER update_obras_updated_at BEFORE UPDATE ON public.obras
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela funcionarios
CREATE TABLE public.funcionarios (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  cargo text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage funcionarios" ON public.funcionarios FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Users manage own empresa funcionarios" ON public.funcionarios FOR ALL
  USING (public.user_belongs_to_empresa(auth.uid(), empresa_id))
  WITH CHECK (public.user_belongs_to_empresa(auth.uid(), empresa_id));

CREATE TRIGGER update_funcionarios_updated_at BEFORE UPDATE ON public.funcionarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela equipamentos
CREATE TABLE public.equipamentos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  tipo text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.equipamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage equipamentos" ON public.equipamentos FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Users manage own empresa equipamentos" ON public.equipamentos FOR ALL
  USING (public.user_belongs_to_empresa(auth.uid(), empresa_id))
  WITH CHECK (public.user_belongs_to_empresa(auth.uid(), empresa_id));

CREATE TRIGGER update_equipamentos_updated_at BEFORE UPDATE ON public.equipamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela rdos
CREATE TABLE public.rdos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  data date NOT NULL,
  clima text NOT NULL DEFAULT 'ensolarado',
  condicao_trabalho text NOT NULL DEFAULT 'normal',
  observacoes text,
  status text NOT NULL DEFAULT 'rascunho',
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rdos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage rdos" ON public.rdos FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Users manage own empresa rdos" ON public.rdos FOR ALL
  USING (public.user_belongs_to_empresa(auth.uid(), empresa_id))
  WITH CHECK (public.user_belongs_to_empresa(auth.uid(), empresa_id));

CREATE TRIGGER update_rdos_updated_at BEFORE UPDATE ON public.rdos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela rdo_funcionarios
CREATE TABLE public.rdo_funcionarios (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rdo_id uuid NOT NULL REFERENCES public.rdos(id) ON DELETE CASCADE,
  funcionario_id uuid NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  presente boolean NOT NULL DEFAULT true,
  horas numeric(4,1),
  observacao text
);

ALTER TABLE public.rdo_funcionarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage rdo_funcionarios" ON public.rdo_funcionarios FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Users manage own empresa rdo_funcionarios" ON public.rdo_funcionarios FOR ALL
  USING (EXISTS (SELECT 1 FROM public.rdos r WHERE r.id = rdo_id AND public.user_belongs_to_empresa(auth.uid(), r.empresa_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.rdos r WHERE r.id = rdo_id AND public.user_belongs_to_empresa(auth.uid(), r.empresa_id)));

-- Tabela rdo_equipamentos
CREATE TABLE public.rdo_equipamentos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rdo_id uuid NOT NULL REFERENCES public.rdos(id) ON DELETE CASCADE,
  equipamento_id uuid NOT NULL REFERENCES public.equipamentos(id) ON DELETE CASCADE,
  horas_uso numeric(4,1),
  operacional boolean NOT NULL DEFAULT true,
  observacao text
);

ALTER TABLE public.rdo_equipamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage rdo_equipamentos" ON public.rdo_equipamentos FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Users manage own empresa rdo_equipamentos" ON public.rdo_equipamentos FOR ALL
  USING (EXISTS (SELECT 1 FROM public.rdos r WHERE r.id = rdo_id AND public.user_belongs_to_empresa(auth.uid(), r.empresa_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.rdos r WHERE r.id = rdo_id AND public.user_belongs_to_empresa(auth.uid(), r.empresa_id)));

-- Tabela rdo_atividades
CREATE TABLE public.rdo_atividades (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rdo_id uuid NOT NULL REFERENCES public.rdos(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  quantidade numeric(10,2),
  unidade text
);

ALTER TABLE public.rdo_atividades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage rdo_atividades" ON public.rdo_atividades FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Users manage own empresa rdo_atividades" ON public.rdo_atividades FOR ALL
  USING (EXISTS (SELECT 1 FROM public.rdos r WHERE r.id = rdo_id AND public.user_belongs_to_empresa(auth.uid(), r.empresa_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.rdos r WHERE r.id = rdo_id AND public.user_belongs_to_empresa(auth.uid(), r.empresa_id)));

-- Update usuario_obras FK to reference obras table
ALTER TABLE public.usuario_obras
  ADD CONSTRAINT usuario_obras_obra_id_fkey FOREIGN KEY (obra_id) REFERENCES public.obras(id) ON DELETE CASCADE;
