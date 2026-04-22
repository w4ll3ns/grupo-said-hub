import { supabase } from '@/integrations/supabase/client';

type Bucket = 'rdo-fotos' | 'notas-fiscais';

/**
 * Gera uma signed URL temporária para um arquivo em bucket privado.
 * Retorna null em caso de erro (path inválido, sem permissão, etc).
 */
export async function getSignedUrl(
  bucket: Bucket,
  path: string | null | undefined,
  expiresInSeconds = 600
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error) {
    console.error(`Erro ao gerar signed URL para ${bucket}/${path}:`, error.message);
    return null;
  }
  return data.signedUrl;
}

/**
 * Converte path relativo em URL pública (apenas para empresa-logos, que permanece público).
 */
export function getPublicUrl(bucket: 'empresa-logos', path: string | null): string | null {
  if (!path) return null;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
