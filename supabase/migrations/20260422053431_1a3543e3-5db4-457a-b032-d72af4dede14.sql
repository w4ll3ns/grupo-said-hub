-- =============================================================================
-- Sprint 0 Etapa 4: Buckets privados com isolamento por empresa
-- =============================================================================

-- =============================================
-- A. Converter URLs completas existentes em paths relativos
-- =============================================

UPDATE public.lancamentos
SET nota_fiscal_url = regexp_replace(nota_fiscal_url, '^.*/notas-fiscais/', '')
WHERE nota_fiscal_url LIKE '%/notas-fiscais/%';

UPDATE public.rdo_fotos
SET url = regexp_replace(url, '^.*/rdo-fotos/', '')
WHERE url LIKE '%/rdo-fotos/%';

-- =============================================
-- B. Tornar buckets privados
-- =============================================

UPDATE storage.buckets SET public = false WHERE id IN ('rdo-fotos', 'notas-fiscais');

-- =============================================
-- C. Policies de rdo-fotos (path pattern: '{empresa_id}/{rdo_id}/{file}')
-- =============================================

DROP POLICY IF EXISTS "Public can view rdo photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload rdo photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete rdo photos" ON storage.objects;

CREATE POLICY "View rdo-fotos by empresa"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'rdo-fotos'
  AND (
    public.is_admin(auth.uid())
    OR public.user_belongs_to_empresa(
         auth.uid(),
         ((storage.foldername(name))[1])::uuid
       )
  )
);

CREATE POLICY "Upload rdo-fotos to own empresa"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'rdo-fotos'
  AND public.user_belongs_to_empresa(
        auth.uid(),
        ((storage.foldername(name))[1])::uuid
      )
  AND public.has_permission(auth.uid(), 'rdo', 'rdo', 'criar')
);

CREATE POLICY "Delete rdo-fotos from own empresa"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'rdo-fotos'
  AND public.user_belongs_to_empresa(
        auth.uid(),
        ((storage.foldername(name))[1])::uuid
      )
  AND public.has_permission(auth.uid(), 'rdo', 'rdo', 'editar')
);

-- =============================================
-- D. Policies de notas-fiscais (path pattern: '{empresa_id}/{lancamento_id}.pdf')
-- =============================================

DROP POLICY IF EXISTS "Public read notas-fiscais" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload notas-fiscais" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update notas-fiscais" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete notas-fiscais" ON storage.objects;

CREATE POLICY "View notas-fiscais by empresa"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'notas-fiscais'
  AND (
    public.is_admin(auth.uid())
    OR public.user_belongs_to_empresa(
         auth.uid(),
         ((storage.foldername(name))[1])::uuid
       )
  )
);

CREATE POLICY "Upload notas-fiscais to own empresa"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'notas-fiscais'
  AND public.user_belongs_to_empresa(
        auth.uid(),
        ((storage.foldername(name))[1])::uuid
      )
  AND public.has_permission(auth.uid(), 'financeiro', 'lancamentos', 'criar')
);

CREATE POLICY "Update notas-fiscais in own empresa"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'notas-fiscais'
  AND public.user_belongs_to_empresa(
        auth.uid(),
        ((storage.foldername(name))[1])::uuid
      )
  AND public.has_permission(auth.uid(), 'financeiro', 'lancamentos', 'editar')
);

CREATE POLICY "Delete notas-fiscais from own empresa"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'notas-fiscais'
  AND public.user_belongs_to_empresa(
        auth.uid(),
        ((storage.foldername(name))[1])::uuid
      )
  AND public.has_permission(auth.uid(), 'financeiro', 'lancamentos', 'excluir')
);