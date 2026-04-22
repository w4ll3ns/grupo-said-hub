import { useEffect, useState } from 'react';
import { getSignedUrl } from '@/lib/storage';

type Bucket = 'rdo-fotos' | 'notas-fiscais';

/**
 * Hook que resolve um path em uma signed URL temporária.
 * Regenera automaticamente quando `path` muda.
 */
export function useSignedUrl(bucket: Bucket, path: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!path);

  useEffect(() => {
    let alive = true;
    if (!path) {
      setUrl(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    getSignedUrl(bucket, path)
      .then((u) => { if (alive) { setUrl(u); setIsLoading(false); } })
      .catch(() => { if (alive) { setUrl(null); setIsLoading(false); } });
    return () => { alive = false; };
  }, [bucket, path]);

  return { url, isLoading };
}
