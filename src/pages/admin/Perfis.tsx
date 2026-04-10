import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function Perfis() {
  const { data: perfis = [], isLoading } = useQuery({
    queryKey: ['admin-perfis'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('perfis')
        .select('*, empresas(nome)')
        .order('nome');
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Perfis de Acesso</h1>
          <p className="text-muted-foreground">Gerencie os perfis e permissões do sistema</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Novo Perfil
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Tipo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {perfis.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        <span className="font-medium">{p.nome}</span>
                      </div>
                    </TableCell>
                    <TableCell>{p.descricao || '—'}</TableCell>
                    <TableCell>{p.empresas?.nome || 'Todas'}</TableCell>
                    <TableCell>
                      <Badge variant={p.sistema ? 'secondary' : 'outline'}>
                        {p.sistema ? 'Sistema' : 'Customizado'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {perfis.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Nenhum perfil encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
