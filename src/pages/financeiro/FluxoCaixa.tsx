import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEmpresa } from '@/hooks/useEmpresa';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Wallet, ArrowUpDown } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval, subMonths, addMonths, parseISO, isSameMonth, isSameDay, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatShortBRL = (v: number) => {
  if (Math.abs(v) >= 1000000) return `R$ ${(v / 1000000).toFixed(1)}M`;
  if (Math.abs(v) >= 1000) return `R$ ${(v / 1000).toFixed(1)}k`;
  return `R$ ${v.toFixed(0)}`;
};

type Lancamento = {
  id: string;
  tipo: string;
  valor: number;
  status: string;
  data_vencimento: string;
  data_pagamento: string | null;
  descricao: string;
};

type ViewMode = 'diario' | 'mensal';
type PeriodRange = '3m' | '6m' | '12m';

export default function FluxoCaixa() {
  const { empresaAtiva } = useEmpresa();
  const empresaId = empresaAtiva?.id;
  const [viewMode, setViewMode] = useState<ViewMode>('diario');
  const [period, setPeriod] = useState<PeriodRange>('3m');

  const monthsBack = period === '3m' ? 3 : period === '6m' ? 6 : 12;
  const startDate = startOfMonth(subMonths(new Date(), monthsBack - 1));
  const endDate = endOfMonth(new Date());

  const { data: lancamentos = [], isLoading } = useQuery({
    queryKey: ['fluxo-caixa', empresaId, period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lancamentos')
        .select('id, tipo, valor, status, data_vencimento, data_pagamento, descricao')
        .eq('empresa_id', empresaId!)
        .gte('data_vencimento', format(startDate, 'yyyy-MM-dd'))
        .lte('data_vencimento', format(endDate, 'yyyy-MM-dd'))
        .order('data_vencimento', { ascending: true });
      if (error) throw error;
      return data as Lancamento[];
    },
    enabled: !!empresaId,
  });

  const { data: saldoInicial = 0 } = useQuery({
    queryKey: ['saldo-inicial-contas', empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contas_bancarias')
        .select('saldo_inicial')
        .eq('empresa_id', empresaId!)
        .eq('ativa', true);
      if (error) throw error;
      return (data || []).reduce((sum, c) => sum + Number(c.saldo_inicial || 0), 0);
    },
    enabled: !!empresaId,
  });

  // Compute paid lancamentos before our period to get real starting balance
  const { data: lancamentosAnteriores = [] } = useQuery({
    queryKey: ['lancamentos-anteriores', empresaId, period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lancamentos')
        .select('tipo, valor, status')
        .eq('empresa_id', empresaId!)
        .eq('status', 'pago')
        .lt('data_vencimento', format(startDate, 'yyyy-MM-dd'));
      if (error) throw error;
      return data as { tipo: string; valor: number; status: string }[];
    },
    enabled: !!empresaId,
  });

  const saldoInicialReal = useMemo(() => {
    let saldo = saldoInicial;
    for (const l of lancamentosAnteriores) {
      saldo += l.tipo === 'receber' ? Number(l.valor) : -Number(l.valor);
    }
    return saldo;
  }, [saldoInicial, lancamentosAnteriores]);

  const totals = useMemo(() => {
    let receitas = 0, despesas = 0, receitasPagas = 0, despesasPagas = 0;
    for (const l of lancamentos) {
      const val = Number(l.valor);
      if (l.tipo === 'receber') {
        receitas += val;
        if (l.status === 'pago') receitasPagas += val;
      } else {
        despesas += val;
        if (l.status === 'pago') despesasPagas += val;
      }
    }
    return { receitas, despesas, receitasPagas, despesasPagas, saldo: receitas - despesas, saldoRealizado: receitasPagas - despesasPagas };
  }, [lancamentos]);

  const chartData = useMemo(() => {
    if (viewMode === 'mensal') {
      const months = eachMonthOfInterval({ start: startDate, end: endDate });
      let saldoAcumulado = saldoInicialReal;

      return months.map((month) => {
        let entradas = 0, saidas = 0;
        for (const l of lancamentos) {
          const d = parseISO(l.data_vencimento);
          if (isSameMonth(d, month)) {
            if (l.tipo === 'receber') entradas += Number(l.valor);
            else saidas += Number(l.valor);
          }
        }
        saldoAcumulado += entradas - saidas;
        return {
          label: format(month, 'MMM/yy', { locale: ptBR }),
          entradas,
          saidas,
          saldo: saldoAcumulado,
        };
      });
    } else {
      // Daily view for the current month
      const currentMonth = new Date();
      const days = eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth),
      });

      // Calculate accumulated balance up to start of current month
      let saldoAcumulado = saldoInicialReal;
      for (const l of lancamentos) {
        const d = parseISO(l.data_vencimento);
        if (d < startOfMonth(currentMonth)) {
          saldoAcumulado += l.tipo === 'receber' ? Number(l.valor) : -Number(l.valor);
        }
      }

      return days.map((day) => {
        let entradas = 0, saidas = 0;
        for (const l of lancamentos) {
          const d = parseISO(l.data_vencimento);
          if (isSameDay(d, day)) {
            if (l.tipo === 'receber') entradas += Number(l.valor);
            else saidas += Number(l.valor);
          }
        }
        saldoAcumulado += entradas - saidas;
        return {
          label: format(day, 'dd', { locale: ptBR }),
          entradas,
          saidas,
          saldo: saldoAcumulado,
        };
      });
    }
  }, [lancamentos, viewMode, startDate, endDate, saldoInicialReal]);

  const recentMovements = useMemo(() => {
    return [...lancamentos]
      .sort((a, b) => b.data_vencimento.localeCompare(a.data_vencimento))
      .slice(0, 15);
  }, [lancamentos]);

  const chartConfig = {
    entradas: { label: 'Entradas', color: 'hsl(142, 71%, 45%)' },
    saidas: { label: 'Saídas', color: 'hsl(0, 84%, 60%)' },
    saldo: { label: 'Saldo Acumulado', color: 'hsl(217, 91%, 60%)' },
  };

  if (!empresaAtiva) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Selecione uma empresa para visualizar o fluxo de caixa.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fluxo de Caixa</h1>
          <p className="text-muted-foreground">Acompanhe entradas, saídas e saldo acumulado ao longo do tempo.</p>
        </div>
        <div className="flex gap-2">
          <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="diario">Diário</SelectItem>
              <SelectItem value="mensal">Mensal</SelectItem>
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodRange)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3m">3 meses</SelectItem>
              <SelectItem value="6m">6 meses</SelectItem>
              <SelectItem value="12m">12 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Entradas (Previsto)</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatBRL(totals.receitas)}</div>
            <p className="text-xs text-muted-foreground">Realizado: {formatBRL(totals.receitasPagas)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Saídas (Previsto)</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatBRL(totals.despesas)}</div>
            <p className="text-xs text-muted-foreground">Realizado: {formatBRL(totals.despesasPagas)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Resultado do Período</CardTitle>
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totals.saldo >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatBRL(totals.saldo)}
            </div>
            <p className="text-xs text-muted-foreground">Realizado: {formatBRL(totals.saldoRealizado)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Saldo Atual</CardTitle>
            <Wallet className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatBRL(saldoInicialReal + totals.saldoRealizado)}
            </div>
            <p className="text-xs text-muted-foreground">Saldo inicial: {formatBRL(saldoInicialReal)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Bar Chart - Entradas vs Saídas */}
      <Card>
        <CardHeader>
          <CardTitle>Entradas vs Saídas — {viewMode === 'diario' ? 'Mês Atual' : `Últimos ${monthsBack} meses`}</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="label" className="text-xs" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={formatShortBRL} tick={{ fontSize: 11 }} />
              <ChartTooltip
                content={<ChartTooltipContent formatter={(value) => formatBRL(Number(value))} />}
              />
              <Bar dataKey="entradas" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="saidas" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Area Chart - Saldo Acumulado */}
      <Card>
        <CardHeader>
          <CardTitle>Saldo Acumulado</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={formatShortBRL} tick={{ fontSize: 11 }} />
              <ChartTooltip
                content={<ChartTooltipContent formatter={(value) => formatBRL(Number(value))} />}
              />
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
              <Area
                type="monotone"
                dataKey="saldo"
                stroke="hsl(217, 91%, 60%)"
                fill="hsl(217, 91%, 60%)"
                fillOpacity={0.15}
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Recent movements table */}
      <Card>
        <CardHeader>
          <CardTitle>Últimas Movimentações</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : recentMovements.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum lançamento encontrado no período.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentMovements.map((l) => {
                  const [y, m, d] = l.data_vencimento.split('-');
                  return (
                    <TableRow key={l.id}>
                      <TableCell className="text-sm">{`${d}/${m}/${y}`}</TableCell>
                      <TableCell className="text-sm font-medium">{l.descricao}</TableCell>
                      <TableCell>
                        <Badge variant={l.tipo === 'receber' ? 'default' : 'destructive'}>
                          {l.tipo === 'receber' ? 'Entrada' : 'Saída'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={l.status === 'pago' ? 'default' : 'outline'}>
                          {l.status === 'pago' ? 'Pago' : l.status === 'pendente' ? 'Pendente' : l.status}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-medium ${l.tipo === 'receber' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {l.tipo === 'receber' ? '+' : '-'}{formatBRL(Number(l.valor))}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
