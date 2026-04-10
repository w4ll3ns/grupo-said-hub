import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEmpresa } from '@/hooks/useEmpresa';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function Empresas() {
  const { empresaAtiva } = useEmpresa();

  const { data: empresas = [], isLoading } = useQuery({
    queryKey: ['admin-empresas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .order('nome');
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Empresas</h1>
          <p className="text-muted-foreground">Gerencie as empresas do grupo</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Nova Empresa
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {empresas.map((empresa: any) => (
            <Card key={empresa.id} className={empresa.id === empresaAtiva?.id ? 'ring-2 ring-primary' : ''}>
              <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base">{empresa.nome}</CardTitle>
                  {empresa.cnpj && (
                    <p className="text-xs text-muted-foreground">{empresa.cnpj}</p>
                  )}
                </div>
                <Badge variant={empresa.ativa ? 'default' : 'secondary'}>
                  {empresa.ativa ? 'Ativa' : 'Inativa'}
                </Badge>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {empresa.id === empresaAtiva?.id ? '✓ Empresa ativa selecionada' : ''}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
