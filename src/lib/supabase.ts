// Re-export the auto-generated client to avoid duplicate instances
// Validate env vars before re-exporting
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error(
    'Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY são obrigatórias. Verifique seu arquivo .env'
  );
}

export { supabase } from '@/integrations/supabase/client';
