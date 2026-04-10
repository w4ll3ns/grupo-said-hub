import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEmpresa } from '@/hooks/useEmpresa';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HardHat, Users, FileText, Wrench, Plus, Sun, Cloud, CloudRain, CloudLightning } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const climaIcons: Record<string, React.ReactNode> = {
  ensolarado: <Sun className="h-4 w-4 text-amber-500" />,
  nublado: <Cloud className="h-4 w-4 text-muted-foreground" />,
  chuvoso: <CloudRain className="h-4 w-4 text-blue-500" />,
  tempestade: <CloudLightning className="h-4 w-4 text-destructive" />,
};

export default function RDODashboard() {
  const { empresaAtiva } = useEmpresa();
  const navigate = useNavigate();

  const { data: obrasAtivas = 0 } = useQuery({
    queryKey: ['rdo-dash-obras', empresaAtiva?.id],
    queryFn: async () => {
      const { count, error } = await supabase.from('obras').select('*', { count: 'exact', head: true }).eq('empresa_id', empresaAtiva!.id).eq('status', 'em_andamento');
      if (error) throw error;
      return count || 0;
    },
    enabled: !!empresaAtiva,
  });

  const { data: rdosMes = 0 } = useQuery({
    queryKey: ['rdo-dash-mes', empresaAtiva?.id],
    queryFn: async () => {
      const inicio = new Date();
      inicio.setDate(1);
      const { count, error } = await supabase.from('rdos').select('*', { count: 'exact', head: true })
        .eq('empresa_id', empresaAtiva!.id).gte('data', inicio.toISOString().split('T')[0]);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!empresaAtiva,
  });

  const { data: funcAtivos = 0 } = useQuery({
    queryKey: ['rdo-dash-func', empresaAtiva?.id],
    queryFn: async () => {
      const { count, error } = await supabase.from('funcionarios').select('*', { count: 'exact', head: true }).eq('empresa_id', empresaAtiva!.id).eq('ativo', true);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!empresaAtiva,
  });

  const { data: equipAtivos = 0 } = useQuery({
    queryKey: ['rdo-dash-equip', empresaAtiva?.id],
    queryFn: async () => {
      const { count, error } = await supabase.from('equipamentos').select('*', { count: 'exact', head: true }).eq('empresa_id', empresaAtiva!.id).eq('ativo', true);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!empresaAtiva,
  });

  const { data: ultimosRDOs = [] } = useQuery({
    queryKey: ['rdo-dash-ultimos', empresaAtiva?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('rdos').select('*, obras(nome)')
        .eq('empresa_id', empresaAtiva!.id).order('data', { ascending: false }).limit(5);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!empresaAtiva,
  });

  const cards = [
    { title: 'Obras Ativas', value: obrasAtivas, icon: HardHat, color: 'text-primary' },
    { title: 'RDOs no Mês', value: rdosMes, icon: FileText, color: 'text-blue-500' },
    { title: 'Funcionários', value: funcAtivos, icon: Users, color: 'text-emerald-500' },
    { title: 'Equipamentos', value: equipAtivos, icon: Wrench, color: 'text-amber-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard RDO</h1>
          <p className="text-sm text-muted-foreground">Visão geral dos relatórios diários de obra</p>
        </div>
        <Button onClick={() => navigate('/rdo/relatorios')} size="sm">
          <Plus className="mr-1 h-4 w-4" /> Novo RDO
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <Card key={c.title}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <c.icon className={`h-5 w-5 ${c.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{c.value}</p>
                <p className="text-xs text-muted-foreground">{c.title}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Últimos Relatórios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {ultimosRDOs.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground text-sm">Nenhum RDO registrado</p>
          ) : (
            ultimosRDOs.map((rdo) => (
              <div
                key={rdo.id}
                className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => navigate('/rdo/relatorios')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {climaIcons[rdo.clima]}
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{rdo.obras?.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(rdo.data + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                <Badge variant={rdo.status === 'finalizado' ? 'default' : 'secondary'} className="shrink-0">
                  {rdo.status === 'finalizado' ? 'Finalizado' : 'Rascunho'}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
