import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEmpresa } from '@/hooks/useEmpresa';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Package, Truck, CheckCircle, DollarSign, Receipt, CalendarIcon, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const formatBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const formatDate = (d: string) => { const [y, m, day] = d.split('-'); return `${day}/${m}/${y}`; };

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pendente: { label: 'Pendente', variant: 'outline' },
  enviado: { label: 'Enviado', variant: 'secondary' },
  parcial: { label: 'Entrega Parcial', variant: 'outline' },
  entregue: { label: 'Entregue', variant: 'default' },
  cancelado: { label: 'Cancelado', variant: 'destructive' },
};

type Parcela = { valor: number; data_vencimento: Date };

function FinanceiroBadge({ lancamentos }: { lancamentos: { status: string }[] | null | undefined }) {
  if (!lancamentos || lancamentos.length === 0) {
    return <Badge variant="secondary">A gerar</Badge>;
  }
  const ativos = lancamentos.filter((l) => l.status !== 'cancelado');
  if (ativos.length === 0) return <Badge variant="secondary">A gerar</Badge>;
  const todosPagos = ativos.every((l) => l.status === 'pago');
  if (todosPagos) return <Badge variant="default">Pago</Badge>;
  return <Badge variant="outline">Pendente</Badge>;
}

function GerarContasPagarDialog({
  pedido,
  open,
  onOpenChange,
}: {
  pedido: any;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { empresaAtiva } = useEmpresa();
  const qc = useQueryClient();
  const [modo, setModo] = useState<'avista' | 'parcelado'>('avista');
  const [numParcelas, setNumParcelas] = useState(2);
  const [intervaloDias, setIntervaloDias] = useState(30);
  const [primeiraData, setPrimeiraData] = useState<Date>(
    pedido?.data_entrega_prevista
      ? new Date(pedido.data_entrega_prevista + 'T00:00:00')
      : new Date(Date.now() + 30 * 86400_000),
  );
  const [parcelas, setParcelas] = useState<Parcela[]>([
    { valor: pedido?.valor_total || 0, data_vencimento: new Date(Date.now() + 30 * 86400_000) },
  ]);
  const [planoDespesaId, setPlanoDespesaId] = useState('');
  const [centroCustoId, setCentroCustoId] = useState('');
  const [formaPagamentoId, setFormaPagamentoId] = useState('');
  const [contaBancariaId, setContaBancariaId] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const { data: planoDespesas = [] } = useQuery({
    queryKey: ['plano_despesas', empresaAtiva?.id],
    queryFn: async () => {
      const { data } = await supabase.from('plano_despesas').select('id, categoria, subcategoria').eq('empresa_id', empresaAtiva!.id).eq('ativa', true).order('categoria');
      return data || [];
    },
    enabled: !!empresaAtiva && open,
  });
  const { data: centrosCusto = [] } = useQuery({
    queryKey: ['centros_custo', empresaAtiva?.id],
    queryFn: async () => {
      const { data } = await supabase.from('centros_custo').select('id, nome').eq('empresa_id', empresaAtiva!.id).eq('ativo', true).order('nome');
      return data || [];
    },
    enabled: !!empresaAtiva && open,
  });
  const { data: formasPagamento = [] } = useQuery({
    queryKey: ['formas_pagamento', empresaAtiva?.id],
    queryFn: async () => {
      const { data } = await supabase.from('formas_pagamento').select('id, nome').eq('empresa_id', empresaAtiva!.id).eq('ativa', true).order('nome');
      return data || [];
    },
    enabled: !!empresaAtiva && open,
  });
  const { data: contasBancarias = [] } = useQuery({
    queryKey: ['contas_bancarias', empresaAtiva?.id],
    queryFn: async () => {
      const { data } = await supabase.from('contas_bancarias').select('id, nome').eq('empresa_id', empresaAtiva!.id).eq('ativa', true).order('nome');
      return data || [];
    },
    enabled: !!empresaAtiva && open,
  });

  const total = pedido?.valor_total || 0;
  const somaParcelas = useMemo(() => parcelas.reduce((s, p) => s + (Number(p.valor) || 0), 0), [parcelas]);
  const diff = Math.abs(somaParcelas - total);
  const somaOk = diff <= 0.01;

  const aplicarParcelamento = () => {
    if (modo === 'avista') {
      setParcelas([{ valor: total, data_vencimento: primeiraData }]);
      return;
    }
    const n = Math.max(2, Math.min(12, numParcelas));
    const valorBase = Math.floor((total / n) * 100) / 100;
    const ajuste = +(total - valorBase * n).toFixed(2);
    const novas: Parcela[] = Array.from({ length: n }).map((_, i) => {
      const d = new Date(primeiraData);
      d.setDate(d.getDate() + i * intervaloDias);
      return { valor: i === n - 1 ? +(valorBase + ajuste).toFixed(2) : valorBase, data_vencimento: d };
    });
    setParcelas(novas);
  };

  const updateParcela = (i: number, patch: Partial<Parcela>) => {
    setParcelas((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        _pedido_id: pedido.id,
        _parcelas: parcelas.map((p) => ({
          valor: Number(p.valor),
          data_vencimento: format(p.data_vencimento, 'yyyy-MM-dd'),
        })),
        _plano_despesa_id: planoDespesaId,
        _centro_custo_id: centroCustoId || null,
        _forma_pagamento_id: formaPagamentoId || null,
        _conta_bancaria_id: contaBancariaId || null,
        _observacoes: observacoes || null,
      };
      const { data, error } = await supabase.rpc('gerar_contas_pagar_pedido', payload as any);
      if (error) throw error;
      return data as string[];
    },
    onSuccess: (ids) => {
      toast.success(`${ids?.length || 0} conta(s) a pagar geradas`);
      qc.invalidateQueries({ queryKey: ['pedidos_compra'] });
      qc.invalidateQueries({ queryKey: ['lancamentos'] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message || 'Erro ao gerar contas a pagar'),
  });

  const podeGerar = somaOk && !!planoDespesaId && parcelas.length > 0 && !mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerar Contas a Pagar</DialogTitle>
          <DialogDescription>
            PED-{pedido?.numero} — {pedido?.fornecedores?.razao_social} — {formatBRL(total)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Modo</Label>
            <RadioGroup value={modo} onValueChange={(v) => setModo(v as any)} className="flex gap-4">
              <div className="flex items-center gap-2"><RadioGroupItem value="avista" id="m-avista" /><Label htmlFor="m-avista">À vista</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="parcelado" id="m-parc" /><Label htmlFor="m-parc">Parcelado</Label></div>
            </RadioGroup>
          </div>

          {modo === 'parcelado' && (
            <div className="grid grid-cols-3 gap-3 items-end">
              <div>
                <Label>Nº de parcelas</Label>
                <Input type="number" min={2} max={12} value={numParcelas} onChange={(e) => setNumParcelas(Number(e.target.value))} />
              </div>
              <div>
                <Label>Intervalo (dias)</Label>
                <Input type="number" min={1} value={intervaloDias} onChange={(e) => setIntervaloDias(Number(e.target.value))} />
              </div>
              <div>
                <Label>1ª parcela</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full pl-3 text-left font-normal')}>
                      {format(primeiraData, 'dd/MM/yyyy')}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={primeiraData} onSelect={(d) => d && setPrimeiraData(d)} locale={ptBR} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {modo === 'avista' && (
            <div>
              <Label>Vencimento</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full pl-3 text-left font-normal')}>
                    {format(primeiraData, 'dd/MM/yyyy')}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={primeiraData} onSelect={(d) => d && setPrimeiraData(d)} locale={ptBR} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={aplicarParcelamento}>
              Aplicar
            </Button>
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parcelas.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full justify-start font-normal">
                            {format(p.data_vencimento, 'dd/MM/yyyy')}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={p.data_vencimento} onSelect={(d) => d && updateParcela(i, { data_vencimento: d })} locale={ptBR} initialFocus className="p-3 pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                    </TableCell>
                    <TableCell>
                      <Input type="number" step="0.01" min="0" value={p.valor} onChange={(e) => updateParcela(i, { valor: Number(e.target.value) })} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className={cn('flex justify-between items-center px-4 py-2 text-sm border-t', somaOk ? 'text-primary' : 'text-destructive')}>
              <span>Soma das parcelas</span>
              <span className="font-semibold">{formatBRL(somaParcelas)} {!somaOk && `(diferença ${formatBRL(somaParcelas - total)})`}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria (Plano de Despesa) *</Label>
              <Select value={planoDespesaId} onValueChange={setPlanoDespesaId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {planoDespesas.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.categoria} &gt; {p.subcategoria}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Centro de Custo</Label>
              <Select value={centroCustoId} onValueChange={setCentroCustoId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {centrosCusto.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Forma de Pagamento</Label>
              <Select value={formaPagamentoId} onValueChange={setFormaPagamentoId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {formasPagamento.map((f: any) => (
                    <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Conta Bancária</Label>
              <Select value={contaBancariaId} onValueChange={setContaBancariaId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {contasBancarias.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Opcional" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={!podeGerar} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Gerando...' : 'Gerar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Pedidos() {
  const { empresaAtiva } = useEmpresa();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCotacao, setSelectedCotacao] = useState('');
  const [pedidoFinanceiro, setPedidoFinanceiro] = useState<any>(null);

  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ['pedidos_compra', empresaAtiva?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pedidos_compra')
        .select('*, fornecedores(razao_social), cotacoes(numero), lancamentos!pedido_compra_id(id, status)')
        .eq('empresa_id', empresaAtiva!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!empresaAtiva,
  });

  const { data: cotacoesAprovadas = [] } = useQuery({
    queryKey: ['cotacoes_aprovadas', empresaAtiva?.id],
    queryFn: async () => {
      const { data } = await supabase.from('cotacoes').select('id, numero, fornecedor_id, valor_total, fornecedores(razao_social), pedidos_compra(id, status)').eq('empresa_id', empresaAtiva!.id).eq('status', 'aprovada').order('numero');
      return (data || []).filter((c: any) => !(c.pedidos_compra || []).some((p: any) => p.status !== 'cancelado'));
    },
    enabled: !!empresaAtiva,
  });

  const gerarPedidoMutation = useMutation({
    mutationFn: async (cotacaoId: string) => {
      const { error } = await supabase.rpc('gerar_pedido_compra', { _cotacao_id: cotacaoId });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pedidos_compra'] }); qc.invalidateQueries({ queryKey: ['cotacoes_aprovadas'] }); toast.success('Pedido gerado com sucesso'); setOpen(false); setSelectedCotacao(''); },
    onError: (e: any) => toast.error(e?.message || 'Erro ao gerar pedido'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      if (status === 'entregue') {
        const { error } = await supabase.rpc('concluir_pedido', { _pedido_id: id });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('pedidos_compra').update({ status }).eq('id', id);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pedidos_compra'] }); qc.invalidateQueries({ queryKey: ['solicitacoes_compra'] }); toast.success('Status atualizado'); },
    onError: (e: any) => toast.error(e?.message || 'Erro ao atualizar'),
  });

  const filtered = pedidos.filter((p: any) =>
    `PED-${p.numero}`.toLowerCase().includes(search.toLowerCase()) ||
    (p.fornecedores?.razao_social || '').toLowerCase().includes(search.toLowerCase())
  );

  const temLancamentosAtivos = (p: any) =>
    (p.lancamentos || []).some((l: any) => l.status !== 'cancelado');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pedidos de Compra</h1>
        <p className="text-muted-foreground">Gerencie pedidos gerados a partir de cotações aprovadas</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por número ou fornecedor..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => setOpen(true)} disabled={cotacoesAprovadas.length === 0}><Plus className="mr-2 h-4 w-4" /> Gerar Pedido</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Cotação</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead>Data Pedido</TableHead>
                <TableHead>Entrega Prevista</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Financeiro</TableHead>
                <TableHead className="w-[160px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhum pedido encontrado</TableCell></TableRow>
              ) : filtered.map((p: any) => {
                const sc = statusConfig[p.status] || statusConfig.pendente;
                const tem = temLancamentosAtivos(p);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">PED-{p.numero}</TableCell>
                    <TableCell>{p.cotacoes ? `COT-${p.cotacoes.numero}` : '—'}</TableCell>
                    <TableCell>{p.fornecedores?.razao_social}</TableCell>
                    <TableCell>{formatBRL(p.valor_total)}</TableCell>
                    <TableCell>{formatDate(p.data_pedido)}</TableCell>
                    <TableCell>{p.data_entrega_prevista ? formatDate(p.data_entrega_prevista) : '—'}</TableCell>
                    <TableCell><Badge variant={sc.variant}>{sc.label}</Badge></TableCell>
                    <TableCell>
                      {p.status === 'cancelado' ? <span className="text-muted-foreground">—</span> : <FinanceiroBadge lancamentos={p.lancamentos} />}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {p.status === 'pendente' && (
                          <Button variant="ghost" size="icon" onClick={() => updateStatusMutation.mutate({ id: p.id, status: 'enviado' })} title="Marcar como Enviado"><Truck className="h-4 w-4" /></Button>
                        )}
                        {p.status === 'enviado' && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => updateStatusMutation.mutate({ id: p.id, status: 'parcial' })} title="Entrega Parcial"><Package className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => updateStatusMutation.mutate({ id: p.id, status: 'entregue' })} title="Entregue"><CheckCircle className="h-4 w-4 text-primary" /></Button>
                          </>
                        )}
                        {p.status === 'parcial' && (
                          <Button variant="ghost" size="icon" onClick={() => updateStatusMutation.mutate({ id: p.id, status: 'entregue' })} title="Entregue"><CheckCircle className="h-4 w-4 text-primary" /></Button>
                        )}
                        {p.status !== 'cancelado' && (
                          tem ? (
                            <Button variant="ghost" size="icon" onClick={() => navigate(`/financeiro/contas-pagar?pedido=${p.id}`)} title="Ver contas a pagar">
                              <Receipt className="h-4 w-4 text-primary" />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="icon" onClick={() => setPedidoFinanceiro(p)} title="Gerar contas a pagar">
                              <DollarSign className="h-4 w-4" />
                            </Button>
                          )
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => { if (!v) { setOpen(false); setSelectedCotacao(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Gerar Pedido de Compra</DialogTitle><DialogDescription>Selecione uma cotação aprovada para gerar o pedido.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Cotação Aprovada *</label>
              <Select value={selectedCotacao} onValueChange={setSelectedCotacao}>
                <SelectTrigger><SelectValue placeholder="Selecione uma cotação" /></SelectTrigger>
                <SelectContent>
                  {cotacoesAprovadas.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>COT-{c.numero} — {c.fornecedores?.razao_social} — {formatBRL(c.valor_total)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); setSelectedCotacao(''); }}>Cancelar</Button>
            <Button disabled={!selectedCotacao || gerarPedidoMutation.isPending} onClick={() => gerarPedidoMutation.mutate(selectedCotacao)}>
              {gerarPedidoMutation.isPending ? 'Gerando...' : 'Gerar Pedido'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {pedidoFinanceiro && (
        <GerarContasPagarDialog
          pedido={pedidoFinanceiro}
          open={!!pedidoFinanceiro}
          onOpenChange={(v) => { if (!v) setPedidoFinanceiro(null); }}
        />
      )}
    </div>
  );
}
