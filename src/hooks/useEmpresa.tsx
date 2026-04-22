import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

interface Empresa {
  id: string;
  nome: string;
  cnpj: string | null;
  logo_url: string | null;
  ativa: boolean;
}

interface EmpresaContextType {
  empresas: Empresa[];
  empresaAtiva: Empresa | null;
  setEmpresaAtiva: (empresa: Empresa) => void;
  isLoading: boolean;
  semEmpresaVinculada: boolean;
}

const EmpresaContext = createContext<EmpresaContextType | undefined>(undefined);

export function EmpresaProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [empresaAtiva, setEmpresaAtivaState] = useState<Empresa | null>(null);

  const { data: empresas = [], isLoading } = useQuery({
    queryKey: ['empresas', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .eq('ativa', true)
        .order('nome');
      if (error) throw error;
      return data as Empresa[];
    },
    enabled: !!user,
  });

  const semEmpresaVinculada = !isLoading && empresas.length === 0;

  useEffect(() => {
    if (empresas.length > 0 && !empresaAtiva) {
      const saved = localStorage.getItem('empresa_ativa_id');
      const found = empresas.find((e) => e.id === saved);
      setEmpresaAtivaState(found || empresas[0]);
    }
  }, [empresas, empresaAtiva]);

  const setEmpresaAtiva = (empresa: Empresa) => {
    setEmpresaAtivaState(empresa);
    localStorage.setItem('empresa_ativa_id', empresa.id);
  };

  return (
    <EmpresaContext.Provider value={{ empresas, empresaAtiva, setEmpresaAtiva, isLoading, semEmpresaVinculada }}>
      {children}
    </EmpresaContext.Provider>
  );
}

export function useEmpresa() {
  const context = useContext(EmpresaContext);
  if (!context) throw new Error('useEmpresa must be used within EmpresaProvider');
  return context;
}
