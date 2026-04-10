import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEmpresa } from '@/hooks/useEmpresa';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { format, startOfYear, endOfYear, startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

type Lancamento = {
  id: string;
  tipo: string;
  valor: number;
  status: string;
  data_vencimento: string;
  plano_despesa_id: string | null;
  plano_receita_id: string | null;
};

type PlanoItem = {
  id: string;
  categoria: string;
  subcategoria: string;
};

type PeriodOption = { label: string; start: string; end: string };

function getPeriods(): PeriodOption[] {
  const now = new Date();
  const periods: PeriodOption[] = [];

  // Current month
  periods.push({
    label: format(now, "MMMM 'de' yyyy", { locale: ptBR }),
    start: format(startOfMonth(now), 'yyyy-MM-dd'),
    end: format(endOfMonth(now), 'yyyy-MM-dd'),
  });

  // Previous 3 months
  for (let i = 1; i <= 3; i++) {
    const d = subMonths(now, i);
    periods.push({
      label: format(d, "MMMM 'de' yyyy", { locale: ptBR }),
      start: format(startOfMonth(d), 'yyyy-MM-dd'),
      end: format(endOfMonth(d), 'yyyy-MM-dd'),
    });
  }

  // Current quarter
  periods.push({
    label: `Trimestre atual (${format(startOfQuarter(now), 'MMM', { locale: ptBR })} - ${format(endOfQuarter(now), 'MMM yyyy', { locale: ptBR })})`,
    start: format(startOfQuarter(now), 'yyyy-MM-dd'),
    end: format(endOfQuarter(now), 'yyyy-MM-dd'),
  });

  // Current year
  periods.push({
    label: `Ano ${now.getFullYear()}`,
    start: format(startOfYear(now), 'yyyy-MM-dd'),
    end: format(endOfYear(now), 'yyyy-MM-dd'),
  });

  // Previous year
  const prevYear = new Date(now.getFullYear() - 1, 0, 1);
  periods.push({
    label: `Ano ${prevYear.getFullYear()}`,
    start: format(startOfYear(prevYear), 'yyyy-MM-dd'),
    end: format(endOfYear(prevYear), 'yyyy-MM-dd'),
  });

  return periods;
}

type GroupedRow = {
  categoria: string;
  subcategorias: { nome: string; valor: number }[];
  total: number;
};

export default function DRE() {
  const { empresaAtiva } = useEmpresa();
  const periods = useMemo(() => getPeriods(), []);
  const [selectedPeriod, setSelectedPeriod] = useState('0');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pago' | 'pendente'>('todos');

  const period = periods[parseInt(selectedPeriod)];

  const { data: lancamentos = [], isLoading: loadingLanc } = useQuery({
    queryKey: ['dre-lancamentos', empresaAtiva?.id, period?.start, period?.end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lancamentos')
        .select('id, tipo, valor, status, data_vencimento, plano_despesa_id, plano_receita_id')
        .eq('empresa_id', empresaAtiva!.id)
        .gte('data_vencimento', period.start)
        .lte('data_vencimento', period.end)
        .neq('status', 'cancelado');
      if (error) throw error;
      return data as Lancamento[];
    },
    enabled: !!empresaAtiva && !!period,
  });

  const { data: planoDespesas = [] } = useQuery({
    queryKey: ['plano_despesas', empresaAtiva?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('plano_despesas').select('id, categoria, subcategoria').eq('empresa_id', empresaAtiva!.id);
      if (error) throw error;
      return data as PlanoItem[];
    },
    enabled: !!empresaAtiva,
  });

  const { data: planoReceitas = [] } = useQuery({
    queryKey: ['plano_receitas', empresaAtiva?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('plano_receitas').select('id, categoria, subcategoria').eq('empresa_id', empresaAtiva!.id);
      if (error) throw error;
      return data as PlanoItem[];
    },
    enabled: !!empresaAtiva,
  });

  const dreData = useMemo(() => {
    const filteredLanc = statusFilter === 'todos'
      ? lancamentos
      : lancamentos.filter((l) => l.status === statusFilter);

    const receitaItems = filteredLanc.filter((l) => l.tipo === 'receber');
    const despesaItems = filteredLanc.filter((l) => l.tipo === 'pagar');

    const groupByPlano = (items: Lancamento[], plano: PlanoItem[], fk: 'plano_receita_id' | 'plano_despesa_id'): GroupedRow[] => {
      const map = new Map<string, Map<string, number>>();
      items.forEach((item) => {
        const planoId = item[fk];
        const p = planoId ? plano.find((x) => x.id === planoId) : null;
        const cat = p?.categoria || 'Sem categoria';
        const sub = p?.subcategoria || 'Sem subcategoria';
        if (!map.has(cat)) map.set(cat, new Map());
        const subMap = map.get(cat)!;
        subMap.set(sub, (subMap.get(sub) || 0) + item.valor);
      });

      return Array.from(map.entries())
        .map(([categoria, subMap]) => {
          const subcategorias = Array.from(subMap.entries())
            .map(([nome, valor]) => ({ nome, valor }))
            .sort((a, b) => b.valor - a.valor);
          return {
            categoria,
            subcategorias,
            total: subcategorias.reduce((s, x) => s + x.valor, 0),
          };
        })
        .sort((a, b) => b.total - a.total);
    };

    const receitas = groupByPlano(receitaItems, planoReceitas, 'plano_receita_id');
    const despesas = groupByPlano(despesaItems, planoDespesas, 'plano_despesa_id');

    const totalReceitas = receitas.reduce((s, r) => s + r.total, 0);
    const totalDespesas = despesas.reduce((s, r) => s + r.total, 0);
    const resultado = totalReceitas - totalDespesas;

    return { receitas, despesas, totalReceitas, totalDespesas, resultado };
  }, [lancamentos, planoDespesas, planoReceitas, statusFilter]);

  const isLoading = loadingLanc;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">DRE — Demonstrativo de Resultados</h1>
        <p className="text-muted-foreground">Visualize receitas e despesas agrupadas por categoria do plano de contas.</p>
      </div>

      <div className="flex items-center gap-3">
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            {periods.map((p, i) => (
              <SelectItem key={i} value={String(i)}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'todos' | 'pago' | 'pendente')}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="pago">Somente pagos</SelectItem>
            <SelectItem value="pendente">Somente pendentes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Receitas</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatBRL(dreData.totalReceitas)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Despesas</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatBRL(dreData.totalDespesas)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Resultado Líquido</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${dreData.resultado >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
              {formatBRL(dreData.resultado)}
            </div>
            {dreData.totalReceitas > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Margem: {((dreData.resultado / dreData.totalReceitas) * 100).toFixed(1)}%
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Receitas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                Receitas
                <Badge variant="outline" className="ml-auto">{formatBRL(dreData.totalReceitas)}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dreData.receitas.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Nenhuma receita no período.</p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Categoria / Subcategoria</TableHead>
                        <TableHead className="text-right w-[150px]">Valor</TableHead>
                        <TableHead className="text-right w-[80px]">%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dreData.receitas.map((cat) => (
                        <>
                          <TableRow key={cat.categoria} className="bg-muted/30 font-semibold">
                            <TableCell>{cat.categoria}</TableCell>
                            <TableCell className="text-right">{formatBRL(cat.total)}</TableCell>
                            <TableCell className="text-right">
                              {dreData.totalReceitas > 0 ? ((cat.total / dreData.totalReceitas) * 100).toFixed(1) : '0'}%
                            </TableCell>
                          </TableRow>
                          {cat.subcategorias.map((sub) => (
                            <TableRow key={`${cat.categoria}-${sub.nome}`}>
                              <TableCell className="pl-8 text-muted-foreground">{sub.nome}</TableCell>
                              <TableCell className="text-right">{formatBRL(sub.valor)}</TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {dreData.totalReceitas > 0 ? ((sub.valor / dreData.totalReceitas) * 100).toFixed(1) : '0'}%
                              </TableCell>
                            </TableRow>
                          ))}
                        </>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Despesas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-destructive" />
                Despesas
                <Badge variant="outline" className="ml-auto">{formatBRL(dreData.totalDespesas)}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dreData.despesas.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Nenhuma despesa no período.</p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Categoria / Subcategoria</TableHead>
                        <TableHead className="text-right w-[150px]">Valor</TableHead>
                        <TableHead className="text-right w-[80px]">%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dreData.despesas.map((cat) => (
                        <>
                          <TableRow key={cat.categoria} className="bg-muted/30 font-semibold">
                            <TableCell>{cat.categoria}</TableCell>
                            <TableCell className="text-right">{formatBRL(cat.total)}</TableCell>
                            <TableCell className="text-right">
                              {dreData.totalDespesas > 0 ? ((cat.total / dreData.totalDespesas) * 100).toFixed(1) : '0'}%
                            </TableCell>
                          </TableRow>
                          {cat.subcategorias.map((sub) => (
                            <TableRow key={`${cat.categoria}-${sub.nome}`}>
                              <TableCell className="pl-8 text-muted-foreground">{sub.nome}</TableCell>
                              <TableCell className="text-right">{formatBRL(sub.valor)}</TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {dreData.totalDespesas > 0 ? ((sub.valor / dreData.totalDespesas) * 100).toFixed(1) : '0'}%
                              </TableCell>
                            </TableRow>
                          ))}
                        </>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resultado */}
          <Card className={dreData.resultado >= 0 ? 'border-emerald-200' : 'border-destructive/30'}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">Resultado Líquido do Período</span>
                <span className={`text-2xl font-bold ${dreData.resultado >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                  {formatBRL(dreData.resultado)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
