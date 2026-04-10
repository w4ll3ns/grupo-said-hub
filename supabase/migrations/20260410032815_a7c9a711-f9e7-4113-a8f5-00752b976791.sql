
-- =============================================
-- ENUMS
-- =============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'financeiro', 'compras', 'engenharia', 'solicitante');

-- =============================================
-- TABELA: empresas
-- =============================================
CREATE TABLE public.empresas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cnpj TEXT,
  logo_url TEXT,
  ativa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABELA: profiles (vinculada a auth.users)
-- =============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT,
  cargo TEXT,
  matricula TEXT,
  foto_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABELA: perfis (perfis de acesso)
-- =============================================
CREATE TABLE public.perfis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  sistema BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABELA: perfil_permissoes
-- =============================================
CREATE TABLE public.perfil_permissoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  perfil_id UUID NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
  modulo TEXT NOT NULL,
  funcionalidade TEXT NOT NULL,
  visualizar BOOLEAN NOT NULL DEFAULT false,
  criar BOOLEAN NOT NULL DEFAULT false,
  editar BOOLEAN NOT NULL DEFAULT false,
  excluir BOOLEAN NOT NULL DEFAULT false,
  aprovar BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(perfil_id, modulo, funcionalidade)
);
ALTER TABLE public.perfil_permissoes ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABELA: usuario_empresas
-- =============================================
CREATE TABLE public.usuario_empresas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, empresa_id)
);
ALTER TABLE public.usuario_empresas ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABELA: usuario_perfis
-- =============================================
CREATE TABLE public.usuario_perfis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  perfil_id UUID NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, perfil_id)
);
ALTER TABLE public.usuario_perfis ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABELA: usuario_obras (preparação para RDO)
-- =============================================
CREATE TABLE public.usuario_obras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  obra_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, obra_id)
);
ALTER TABLE public.usuario_obras ENABLE ROW LEVEL SECURITY;

-- =============================================
-- FUNÇÕES SECURITY DEFINER
-- =============================================

-- Verifica se usuário pertence a uma empresa
CREATE OR REPLACE FUNCTION public.user_belongs_to_empresa(_user_id UUID, _empresa_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuario_empresas
    WHERE user_id = _user_id AND empresa_id = _empresa_id
  )
$$;

-- Verifica se usuário tem um role específico (via perfis)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuario_perfis up
    JOIN public.perfis p ON p.id = up.perfil_id
    WHERE up.user_id = _user_id
      AND LOWER(p.nome) = LOWER(_role::text)
  )
$$;

-- Verifica se o usuário tem permissão específica em um módulo/funcionalidade
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _modulo TEXT, _funcionalidade TEXT, _acao TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuario_perfis up
    JOIN public.perfil_permissoes pp ON pp.perfil_id = up.perfil_id
    WHERE up.user_id = _user_id
      AND pp.modulo = _modulo
      AND pp.funcionalidade = _funcionalidade
      AND (
        (_acao = 'visualizar' AND pp.visualizar = true) OR
        (_acao = 'criar' AND pp.criar = true) OR
        (_acao = 'editar' AND pp.editar = true) OR
        (_acao = 'excluir' AND pp.excluir = true) OR
        (_acao = 'aprovar' AND pp.aprovar = true)
      )
  )
$$;

-- Verifica se o usuário é admin (de qualquer empresa)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuario_perfis up
    JOIN public.perfis p ON p.id = up.perfil_id
    WHERE up.user_id = _user_id
      AND LOWER(p.nome) = 'administrador'
  )
$$;

-- =============================================
-- TRIGGER: updated_at
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_empresas_updated_at BEFORE UPDATE ON public.empresas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_perfis_updated_at BEFORE UPDATE ON public.perfis FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- TRIGGER: criar profile automaticamente no signup
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nome)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- RLS POLICIES
-- =============================================

-- empresas: usuários veem apenas suas empresas, admins podem tudo
CREATE POLICY "Users view their empresas" ON public.empresas
  FOR SELECT USING (
    public.is_admin(auth.uid()) OR
    public.user_belongs_to_empresa(auth.uid(), id)
  );
CREATE POLICY "Admins manage empresas" ON public.empresas
  FOR ALL USING (public.is_admin(auth.uid()));

-- profiles: usuários veem profiles de suas empresas
CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT USING (id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());
CREATE POLICY "System inserts profiles" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- perfis: isolamento por empresa
CREATE POLICY "Users view perfis of their empresas" ON public.perfis
  FOR SELECT USING (
    empresa_id IS NULL OR
    public.user_belongs_to_empresa(auth.uid(), empresa_id) OR
    public.is_admin(auth.uid())
  );
CREATE POLICY "Admins manage perfis" ON public.perfis
  FOR ALL USING (public.is_admin(auth.uid()));

-- perfil_permissoes: seguem o perfil
CREATE POLICY "Users view permissoes of accessible perfis" ON public.perfil_permissoes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.perfis p
      WHERE p.id = perfil_id
      AND (p.empresa_id IS NULL OR public.user_belongs_to_empresa(auth.uid(), p.empresa_id) OR public.is_admin(auth.uid()))
    )
  );
CREATE POLICY "Admins manage permissoes" ON public.perfil_permissoes
  FOR ALL USING (public.is_admin(auth.uid()));

-- usuario_empresas
CREATE POLICY "Users view own empresa links" ON public.usuario_empresas
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Admins manage empresa links" ON public.usuario_empresas
  FOR ALL USING (public.is_admin(auth.uid()));

-- usuario_perfis
CREATE POLICY "Users view own perfil links" ON public.usuario_perfis
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Admins manage perfil links" ON public.usuario_perfis
  FOR ALL USING (public.is_admin(auth.uid()));

-- usuario_obras
CREATE POLICY "Users view own obra links" ON public.usuario_obras
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Admins manage obra links" ON public.usuario_obras
  FOR ALL USING (public.is_admin(auth.uid()));
