
-- 1. Bucket privado
INSERT INTO storage.buckets (id, name, public)
VALUES ('centro-custo-anexos', 'centro-custo-anexos', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Tabela
CREATE TABLE public.centro_custo_anexos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  centro_custo_id uuid NOT NULL REFERENCES public.centros_custo(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL,
  nome_arquivo text NOT NULL,
  path text NOT NULL,
  tamanho_bytes bigint,
  tipo_mime text,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid()
);

CREATE INDEX idx_centro_custo_anexos_centro ON public.centro_custo_anexos(centro_custo_id);
CREATE INDEX idx_centro_custo_anexos_empresa ON public.centro_custo_anexos(empresa_id);

ALTER TABLE public.centro_custo_anexos ENABLE ROW LEVEL SECURITY;

-- 3. Policies da tabela
CREATE POLICY "Admins manage centro_custo_anexos"
  ON public.centro_custo_anexos
  FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE POLICY "View centro_custo_anexos"
  ON public.centro_custo_anexos
  FOR SELECT
  TO authenticated
  USING (
    public.user_belongs_to_empresa(auth.uid(), empresa_id)
    AND public.has_permission(auth.uid(), 'financeiro', 'centros_custo', 'visualizar')
  );

CREATE POLICY "Create centro_custo_anexos"
  ON public.centro_custo_anexos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_belongs_to_empresa(auth.uid(), empresa_id)
    AND public.has_permission(auth.uid(), 'financeiro', 'centros_custo', 'criar')
  );

CREATE POLICY "Delete centro_custo_anexos"
  ON public.centro_custo_anexos
  FOR DELETE
  TO authenticated
  USING (
    public.user_belongs_to_empresa(auth.uid(), empresa_id)
    AND public.has_permission(auth.uid(), 'financeiro', 'centros_custo', 'editar')
  );

-- 4. Storage policies (isolamento por empresa via primeiro segmento do path)
CREATE POLICY "View centro-custo-anexos files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'centro-custo-anexos'
    AND (
      public.is_admin(auth.uid())
      OR public.user_belongs_to_empresa(auth.uid(), ((storage.foldername(name))[1])::uuid)
    )
  );

CREATE POLICY "Upload centro-custo-anexos files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'centro-custo-anexos'
    AND (
      public.is_admin(auth.uid())
      OR (
        public.user_belongs_to_empresa(auth.uid(), ((storage.foldername(name))[1])::uuid)
        AND public.has_permission(auth.uid(), 'financeiro', 'centros_custo', 'criar')
      )
    )
  );

CREATE POLICY "Delete centro-custo-anexos files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'centro-custo-anexos'
    AND (
      public.is_admin(auth.uid())
      OR (
        public.user_belongs_to_empresa(auth.uid(), ((storage.foldername(name))[1])::uuid)
        AND public.has_permission(auth.uid(), 'financeiro', 'centros_custo', 'editar')
      )
    )
  );
