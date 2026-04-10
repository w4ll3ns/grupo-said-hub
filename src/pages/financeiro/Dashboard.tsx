import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEmpresa } from '@/hooks/useEmpresa';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Wallet, CalendarClock, AlertTriangle } from 'lucide-react';
import { format, startOfMonth, subMonths, isAfter, isBefore, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const PIE_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--destructive))',
  'hsl(210, 70%, 50%)',
  'hsl(45, 80%, 50%)',
  'hsl(160, 60%, 45%)',
  'hsl(var(--muted-foreground))',
];

export default function FinanceiroDashboard() {
  const { empresaAtiva } = useEmpresa();
  const empresaId = empresaAtiva?.id;
  const hoje = new Date();
  const inicioMes = format(startOfMonth(hoje), 'yyyy-MM-dd');
  const fimMes = format(hoje, 'yyyy-MM-dd');

  // Query 1: all lancamentos for cards + charts
  const { data: lancamentos = [] } = useQuery({
    queryKey: ['dashboard-lancamentos', empresaId],
    queryFn: async () => {
      const sixMonthsAgo = format(startOfMonth(subMonths(hoje, 5)), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('lancamentos')
        .select('id, tipo, valor, status, data_vencimento, data_pagamento, descricao, plano_despesa_id')
        .eq('empresa_id', empresaId!)
        .gte('data_vencimento', sixMonthsAgo)
        .order('data_vencimento', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!empresaId,
  });

  // Query 2: plano_despesas for category names
  const { data: planos = [] } = useQuery({
    queryKey: ['dashboard-plano-despesas', empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plano_despesas')
        .select('id, categoria')
        .eq('empresa_id', empresaId!);
      if (error) throw error;
      return data;
    },
    enabled: !!empresaId,
  });

  const planoMap = useMemo(() => {
    const m: Record<string, string> = {};
    planos.forEach((p) => (m[p.id] = p.categoria));
    return m;
  }, [planos]);

  // Computed: cards
  const cards = useMemo(() => {
    let totalPagar = 0, totalReceber = 0, vencidos = 0, pagosMes = 0, recebidosMes = 0;
    lancamentos.forEach((l) => {
      const isPendente = l.status === 'pendente';
      const isVencido = l.status === 'vencido';
      if (l.tipo === 'pagar') {
        if (isPendente || isVencido) totalPagar += Number(l.valor);
        if (isVencido) vencidos += Number(l.valor);
        if (l.status === 'pago' && l.data_pagamento && l.data_pagamento >= inicioMes && l.data_pagamento <= fimMes)
          pagosMes += Number(l.valor);
      } else {
        if (isPendente || isVencido) totalReceber += Number(l.valor);
        if (l.status === 'pago' && l.data_pagamento && l.data_pagamento >= inicioMes && l.data_pagamento <= fimMes)
          recebidosMes += Number(l.valor);
      }
    });
    return { totalPagar, totalReceber, vencidos, saldo: totalReceber - totalPagar, pagosMes, recebidosMes };
  }, [lancamentos, inicioMes, fimMes]);

  // Computed: bar chart data (last 6 months)
  const barData = useMemo(() => {
    const months: Record<string, { pagar: number; receber: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const key = format(subMonths(hoje, i), 'yyyy-MM');
      months[key] = { pagar: 0, receber: 0 };
    }
    lancamentos.forEach((l) => {
      const key = l.data_vencimento.substring(0, 7);
      if (months[key]) {
        months[key][l.tipo as 'pagar' | 'receber'] += Number(l.valor);
      }
    });
    return Object.entries(months).map(([k, v]) => ({
      mes: format(new Date(k + '-01'), 'MMM/yy', { locale: ptBR }),
      pagar: v.pagar,
      receber: v.receber,
    }));
  }, [lancamentos]);

  // Computed: pie chart data (expenses by category)
  const pieData = useMemo(() => {
    const catMap: Record<string, number> = {};
    lancamentos
      .filter((l) => l.tipo === 'pagar' && l.plano_despesa_id)
      .forEach((l) => {
        const cat = planoMap[l.plano_despesa_id!] || 'Sem categoria';
        catMap[cat] = (catMap[cat] || 0) + Number(l.valor);
      });
    const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
    const top5 = sorted.slice(0, 5).map(([name, value]) => ({ name, value }));
    const othersVal = sorted.slice(5).reduce((s, [, v]) => s + v, 0);
    if (othersVal > 0) top5.push({ name: 'Outros', value: othersVal });
    return top5;
  }, [lancamentos, planoMap]);

  // Computed: upcoming deadlines
  const proxVencimentos = useMemo(() => {
    return lancamentos
      .filter((l) => l.status === 'pendente' || l.status === 'vencido')
      .slice(0, 10);
  }, [lancamentos]);

  const barChartConfig = {
    pagar: { label: 'A Pagar', color: 'hsl(var(--destructive))' },
    receber: { label: 'A Receber', color: 'hsl(160, 60%, 45%)' },
  };

  const pieChartConfig = pieData.reduce((acc, item, i) => {
    acc[item.name] = { label: item.name, color: PIE_COLORS[i % PIE_COLORS.length] };
    return acc;
  }, {} as Record<string, { label: string; color: string }>);

  const getStatusBadge = (l: { status: string; data_vencimento: string }) => {
    if (l.status === 'vencido' || (l.status === 'pendente' && l.data_vencimento < fimMes)) {
      return <Badge variant="destructive">Vencido</Badge>;
    }
    const proximo = isBefore(new Date(l.data_vencimento), addDays(hoje, 7));
    if (proximo) return <Badge className="bg-yellow-500 text-white border-0">Próximo</Badge>;
    return <Badge variant="secondary">Pendente</Badge>;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Dashboard Financeiro</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total a Pagar</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatBRL(cards.totalPagar)}</div>
            {cards.vencidos > 0 && (
              <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                <AlertTriangle className="h-3 w-3" /> {formatBRL(cards.vencidos)} vencidos
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total a Receber</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatBRL(cards.totalReceber)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Projetado</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${cards.saldo >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {formatBRL(cards.saldo)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Movimentação do Mês</CardTitle>
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm text-foreground">
              <span className="text-destructive font-semibold">{formatBRL(cards.pagosMes)}</span> pagos
            </div>
            <div className="text-sm text-foreground">
              <span className="text-primary font-semibold">{formatBRL(cards.recebidosMes)}</span> recebidos
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Pagar vs Receber — Últimos 6 meses</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={barChartConfig} className="h-[300px] w-full">
              <BarChart data={barData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="mes" className="text-xs" />
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatBRL(Number(value))} />} />
                <Bar dataKey="pagar" fill="var(--color-pagar)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="receber" fill="var(--color-receber)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ChartContainer config={pieChartConfig} className="h-[300px] w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatBRL(Number(value))} />} />
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name }) => name}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">Nenhuma despesa categorizada</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming deadlines */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Próximos Vencimentos</CardTitle>
        </CardHeader>
        <CardContent>
          {proxVencimentos.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proxVencimentos.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.descricao}</TableCell>
                    <TableCell>
                      <Badge variant={l.tipo === 'pagar' ? 'destructive' : 'default'}>
                        {l.tipo === 'pagar' ? 'Pagar' : 'Receber'}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(l.data_vencimento), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="text-right">{formatBRL(Number(l.valor))}</TableCell>
                    <TableCell>{getStatusBadge(l)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum lançamento pendente</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
