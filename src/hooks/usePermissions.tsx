import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

interface Permission {
  modulo: string;
  funcionalidade: string;
  visualizar: boolean;
  criar: boolean;
  editar: boolean;
  excluir: boolean;
  aprovar: boolean;
}

export function usePermissions() {
  const { user } = useAuth();

  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ['permissions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('perfil_permissoes')
        .select(`
          modulo,
          funcionalidade,
          visualizar,
          criar,
          editar,
          excluir,
          aprovar,
          perfis!inner(
            usuario_perfis!inner(user_id)
          )
        `)
        .eq('perfis.usuario_perfis.user_id', user.id);

      if (error) {
        console.error('Error fetching permissions:', error);
        return [];
      }
      return (data || []) as unknown as Permission[];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const { data: isAdmin = false } = useQuery({
    queryKey: ['isAdmin', user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.rpc('is_admin', { _user_id: user.id });
      return !!data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const hasPermission = (modulo: string, funcionalidade: string, acao: 'visualizar' | 'criar' | 'editar' | 'excluir' | 'aprovar') => {
    if (isAdmin) return true;
    return permissions.some(
      (p) => p.modulo === modulo && p.funcionalidade === funcionalidade && p[acao]
    );
  };

  const canView = (modulo: string, funcionalidade: string) => hasPermission(modulo, funcionalidade, 'visualizar');
  const canCreate = (modulo: string, funcionalidade: string) => hasPermission(modulo, funcionalidade, 'criar');
  const canEdit = (modulo: string, funcionalidade: string) => hasPermission(modulo, funcionalidade, 'editar');
  const canDelete = (modulo: string, funcionalidade: string) => hasPermission(modulo, funcionalidade, 'excluir');
  const canApprove = (modulo: string, funcionalidade: string) => hasPermission(modulo, funcionalidade, 'aprovar');

  const canViewModule = (modulo: string) => {
    if (isAdmin) return true;
    return permissions.some((p) => p.modulo === modulo && p.visualizar);
  };

  return {
    permissions,
    isAdmin,
    isLoading,
    hasPermission,
    canView,
    canCreate,
    canEdit,
    canDelete,
    canApprove,
    canViewModule,
  };
}
