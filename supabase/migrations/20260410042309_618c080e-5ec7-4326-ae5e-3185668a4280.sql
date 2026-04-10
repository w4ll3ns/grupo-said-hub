
-- 1. Alter obras: add contract fields
ALTER TABLE public.obras
  ADD COLUMN IF NOT EXISTS contrato text,
  ADD COLUMN IF NOT EXISTS contratante text,
  ADD COLUMN IF NOT EXISTS local text,
  ADD COLUMN IF NOT EXISTS prazo_contratual_dias integer;

-- 2. Alter rdos: add numero, shifts, split weather/condition
ALTER TABLE public.rdos
  ADD COLUMN IF NOT EXISTS numero integer,
  ADD COLUMN IF NOT EXISTS horario_entrada time,
  ADD COLUMN IF NOT EXISTS horario_saida time,
  ADD COLUMN IF NOT EXISTS horario_intervalo_inicio time,
  ADD COLUMN IF NOT EXISTS horario_intervalo_fim time,
  ADD COLUMN IF NOT EXISTS clima_manha text NOT NULL DEFAULT 'ensolarado',
  ADD COLUMN IF NOT EXISTS clima_tarde text NOT NULL DEFAULT 'ensolarado',
  ADD COLUMN IF NOT EXISTS condicao_manha text NOT NULL DEFAULT 'praticavel',
  ADD COLUMN IF NOT EXISTS condicao_tarde text NOT NULL DEFAULT 'praticavel';

-- Migrate existing data
UPDATE public.rdos SET clima_manha = clima, clima_tarde = clima WHERE clima_manha = 'ensolarado' AND clima != 'ensolarado';
UPDATE public.rdos SET condicao_manha = CASE WHEN condicao_trabalho = 'normal' THEN 'praticavel' ELSE 'impraticavel' END,
                       condicao_tarde = CASE WHEN condicao_trabalho = 'normal' THEN 'praticavel' ELSE 'impraticavel' END;

-- Drop old columns
ALTER TABLE public.rdos DROP COLUMN IF EXISTS clima;
ALTER TABLE public.rdos DROP COLUMN IF EXISTS condicao_trabalho;

-- 3. Alter rdo_funcionarios: add individual shifts
ALTER TABLE public.rdo_funcionarios
  ADD COLUMN IF NOT EXISTS horario_entrada time,
  ADD COLUMN IF NOT EXISTS horario_saida time,
  ADD COLUMN IF NOT EXISTS horario_intervalo text,
  ADD COLUMN IF NOT EXISTS local_trabalho text;

-- 4. Alter rdo_equipamentos: add quantidade
ALTER TABLE public.rdo_equipamentos
  ADD COLUMN IF NOT EXISTS quantidade integer NOT NULL DEFAULT 1;

-- 5. Alter rdo_atividades: add status
ALTER TABLE public.rdo_atividades
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'em_andamento';

-- 6. Create rdo_fotos table
CREATE TABLE public.rdo_fotos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rdo_id uuid NOT NULL REFERENCES public.rdos(id) ON DELETE CASCADE,
  url text NOT NULL,
  legenda text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rdo_fotos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage rdo_fotos" ON public.rdo_fotos FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Users manage own empresa rdo_fotos" ON public.rdo_fotos FOR ALL
  USING (EXISTS (SELECT 1 FROM rdos r WHERE r.id = rdo_fotos.rdo_id AND user_belongs_to_empresa(auth.uid(), r.empresa_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM rdos r WHERE r.id = rdo_fotos.rdo_id AND user_belongs_to_empresa(auth.uid(), r.empresa_id)));

-- 7. Create rdo_aprovacoes table
CREATE TABLE public.rdo_aprovacoes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rdo_id uuid NOT NULL REFERENCES public.rdos(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  nome text NOT NULL,
  email text,
  cargo text,
  matricula text,
  aprovado_em timestamptz,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rdo_aprovacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage rdo_aprovacoes" ON public.rdo_aprovacoes FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Users manage own empresa rdo_aprovacoes" ON public.rdo_aprovacoes FOR ALL
  USING (EXISTS (SELECT 1 FROM rdos r WHERE r.id = rdo_aprovacoes.rdo_id AND user_belongs_to_empresa(auth.uid(), r.empresa_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM rdos r WHERE r.id = rdo_aprovacoes.rdo_id AND user_belongs_to_empresa(auth.uid(), r.empresa_id)));

-- 8. Storage bucket for RDO photos
INSERT INTO storage.buckets (id, name, public) VALUES ('rdo-fotos', 'rdo-fotos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view rdo photos" ON storage.objects FOR SELECT USING (bucket_id = 'rdo-fotos');
CREATE POLICY "Authenticated users can upload rdo photos" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'rdo-fotos' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete rdo photos" ON storage.objects FOR DELETE
  USING (bucket_id = 'rdo-fotos' AND auth.role() = 'authenticated');

-- 9. Trigger for sequential number per empresa
CREATE OR REPLACE FUNCTION public.set_rdo_numero()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT COALESCE(MAX(numero), 0) + 1 INTO NEW.numero
  FROM public.rdos
  WHERE empresa_id = NEW.empresa_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_rdo_numero
BEFORE INSERT ON public.rdos
FOR EACH ROW
WHEN (NEW.numero IS NULL)
EXECUTE FUNCTION public.set_rdo_numero();
