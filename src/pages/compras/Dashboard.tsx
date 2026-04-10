import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEmpresa } from '@/hooks/useEmpresa';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ShoppingCart, Clock, Package, DollarSign } from 'lucide-react';
import { format, subMonths, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const formatDate = (d: string) => { const [y, m, day] = d.split('-'); return `${day}/${m}/${y}`; };

const prioridadeConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  baixa: { label: 'Baixa', variant: 'secondary' },
  media: { label: 'Média', variant: 'outline' },
  alta: { label: 'Alta', variant: 'default' },
  urgente: { label: 'Urgente', variant: 'destructive' },
};

export default function ComprasDashboard() {
  const { empresaAtiva } = useEmpresa();
  const mesAtual = format(new Date(), 'yyyy-MM');

  const { data: solicitacoes = [] } = useQuery({
    queryKey: ['compras_dash_solicitacoes', empresaAtiva?.id],
    queryFn: async () => {
      const { data } = await supabase.from('solicitacoes_compra').select('id, numero, data_solicitacao, prioridade, status, justificativa').eq('empresa_id', empresaAtiva!.id).order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!empresaAtiva,
  });

  const { data: pedidos = [] } = useQuery({
    queryKey: ['compras_dash_pedidos', empresaAtiva?.id],
    queryFn: async () => {
      const { data } = await supabase.from('pedidos_compra').select('id, valor_total, status, data_pedido').eq('empresa_id', empresaAtiva!.id);
      return data || [];
    },
    enabled: !!empresaAtiva,
  });

  const solicitacoesMes = solicitacoes.filter((s: any) => s.data_solicitacao.startsWith(mesAtual));
  const pendentesAprovacao = solicitacoes.filter((s: any) => s.status === 'pendente');
  const pedidosAbertos = pedidos.filter((p: any) => ['pendente', 'enviado', 'parcial'].includes(p.status));
  const valorPedidosMes = pedidos.filter((p: any) => p.data_pedido.startsWith(mesAtual)).reduce((acc: number, p: any) => acc + Number(p.valor_total), 0);

  // Chart data - last 6 months
  const chartData = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i);
    const key = format(date, 'yyyy-MM');
    const label = format(date, 'MMM', { locale: ptBR });
    const total = pedidos.filter((p: any) => p.data_pedido.startsWith(key)).reduce((acc: number, p: any) => acc + Number(p.valor_total), 0);
    return { name: label, valor: total };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard de Compras</h1>
        <p className="text-muted-foreground">Visão geral das compras e solicitações</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Solicitações (mês)</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{solicitacoesMes.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes Aprovação</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{pendentesAprovacao.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos em Aberto</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{pedidosAbertos.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Pedidos (mês)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatBRL(valorPedidosMes)}</div></CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Compras por Mês</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatBRL(v)} />
                <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Solicitações Pendentes</CardTitle></CardHeader>
          <CardContent>
            {pendentesAprovacao.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">Nenhuma solicitação pendente</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Prioridade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendentesAprovacao.slice(0, 5).map((s: any) => {
                    const pc = prioridadeConfig[s.prioridade] || prioridadeConfig.media;
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">SC-{s.numero}</TableCell>
                        <TableCell>{formatDate(s.data_solicitacao)}</TableCell>
                        <TableCell><Badge variant={pc.variant}>{pc.label}</Badge></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
