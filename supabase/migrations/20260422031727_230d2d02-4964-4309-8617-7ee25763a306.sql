
-- Add nota_fiscal_url column to lancamentos
ALTER TABLE public.lancamentos ADD COLUMN nota_fiscal_url text;

-- Create storage bucket for notas fiscais
INSERT INTO storage.buckets (id, name, public)
VALUES ('notas-fiscais', 'notas-fiscais', true);

-- Storage policies
CREATE POLICY "Public read notas-fiscais"
ON storage.objects FOR SELECT
USING (bucket_id = 'notas-fiscais');

CREATE POLICY "Authenticated upload notas-fiscais"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'notas-fiscais');

CREATE POLICY "Authenticated update notas-fiscais"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'notas-fiscais');

CREATE POLICY "Authenticated delete notas-fiscais"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'notas-fiscais');
