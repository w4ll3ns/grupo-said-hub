
-- Add new columns to empresas
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS telefone text,
  ADD COLUMN IF NOT EXISTS endereco text,
  ADD COLUMN IF NOT EXISTS cidade text,
  ADD COLUMN IF NOT EXISTS estado text,
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS inscricao_estadual text,
  ADD COLUMN IF NOT EXISTS inscricao_municipal text;

-- Create storage bucket for empresa logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('empresa-logos', 'empresa-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access
CREATE POLICY "Anyone can view empresa logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'empresa-logos');

-- Authenticated users can upload logos for their empresa
CREATE POLICY "Authenticated users can upload empresa logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'empresa-logos');

-- Authenticated users can update logos
CREATE POLICY "Authenticated users can update empresa logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'empresa-logos');

-- Authenticated users can delete logos
CREATE POLICY "Authenticated users can delete empresa logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'empresa-logos');
