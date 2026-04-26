import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEmpresa } from '@/hooks/useEmpresa';
import { usePermissions } from '@/hooks/usePermissions';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, CalendarIcon, CheckCircle, XCircle, Eye, GitCompare, Trash2, UserPlus, ChevronDown, ChevronRight, FileText, Info } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

const formatBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const formatDate = (d: string) => { const [y, m, day] = d.split('-'); return `${day}/${m}/${y}`; };

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pendente: { label: 'Pendente', variant: 'outline' },
  aprovada: { label: 'Aprovada', variant: 'default' },
  rejeitada: { label: 'Rejeitada', variant: 'destructive' },
};

const itemSchema = z.object({
  solicitacao_item_id: z.string().min(1),
  descricao: z.string(),
  quantidade: z.coerce.number().positive(),
  unidade: z.string(),
  valor_unitario: z.coerce.number().min(0.01, 'Informe um valor unitário'),
});

const fornecedorPropostaSchema = z.object({
  fornecedor_id: z.string().min(1, 'Selecione um fornecedor'),
  data_validade: z.date().optional(),
  condicao_pagamento: z.string().max(200).optional().or(z.literal('')),
  prazo_entrega: z.string().max(200).optional().or(z.literal('')),
  observacoes: z.string().max(1000).optional().or(z.literal('')),
  itens: z.array(itemSchema).min(1, 'Itens não carregados'),
});

const mapaSchema = z.object({
  solicitacao_id: z.string().min(1, 'Selecione uma solicitação'),
  fornecedores: z.array(fornecedorPropostaSchema).min(1, 'Adicione ao menos 1 fornecedor'),
}).refine(
  (v) => new Set(v.fornecedores.map(f => f.fornecedor_id)).size === v.fornecedores.length,
  { message: 'Não repita o mesmo fornecedor no mapa', path: ['fornecedores'] }
);

type MapaFormData = z.infer<typeof mapaSchema>;

// Schema simples para "Adicionar fornecedor a uma SC existente"
const addFornecedorSchema = z.object({
  fornecedor_id: z.string().min(1),
  data_validade: z.date().optional(),
  condicao_pagamento: z.string().max(200).optional().or(z.literal('')),
  prazo_entrega: z.string().max(200).optional().or(z.literal('')),
  observacoes: z.string().max(1000).optional().or(z.literal('')),
  itens: z.array(itemSchema).min(1),
});
type AddFornecedorFormData = z.infer<typeof addFornecedorSchema>;

export default function Cotacoes() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { empresaAtiva } = useEmpresa();
  const { isAdmin, canApprove } = usePermissions();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [addFornecedorScId, setAddFornecedorScId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [viewItens, setViewItens] = useState<any | null>(null);

  const form = useForm<MapaFormData>({
    resolver: zodResolver(mapaSchema),
    defaultValues: { solicitacao_id: '', fornecedores: [] },
  });
  const { fields: fornecedorFields, append: appendFornecedor, remove: removeFornecedor } = useFieldArray({
    control: form.control,
    name: 'fornecedores',
  });

  const { data: cotacoes = [], isLoading } = useQuery({
    queryKey: ['cotacoes', empresaAtiva?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cotacoes')
        .select('*, fornecedores(razao_social), solicitacoes_compra(numero), cotacao_itens(id), pedidos_compra(id, numero, status)')
        .eq('empresa_id', empresaAtiva!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!empresaAtiva,
  });

  const { data: solicitacoesAprovadas = [] } = useQuery({
    queryKey: ['solicitacoes_aprovadas', empresaAtiva?.id],
    queryFn: async () => {
      const { data } = await supabase.from('solicitacoes_compra').select('id, numero').eq('empresa_id', empresaAtiva!.id).in('status', ['aprovada', 'cotacao']).order('numero');
      return data || [];
    },
    enabled: !!empresaAtiva,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const { data: fornecedores = [] } = useQuery({
    queryKey: ['fornecedores', empresaAtiva?.id],
    queryFn: async () => { const { data } = await supabase.from('fornecedores').select('id, razao_social').eq('empresa_id', empresaAtiva!.id).eq('ativo', true).order('razao_social'); return data || []; },
    enabled: !!empresaAtiva,
  });

  const watchedSolId = form.watch('solicitacao_id');

  // Carrega itens da SC e replica para todos os fornecedores quando a SC muda
  useEffect(() => {
    if (!watchedSolId) return;
    let cancel = false;
    (async () => {
      const { data, error } = await supabase
        .from('solicitacao_itens')
        .select('id, descricao, quantidade, unidade')
        .eq('solicitacao_id', watchedSolId);
      if (cancel) return;
      if (error) { toast.error('Erro ao carregar itens da solicitação'); return; }
      const itensBase = (data || []).map((it: any) => ({
        solicitacao_item_id: it.id,
        descricao: it.descricao,
        quantidade: Number(it.quantidade),
        unidade: it.unidade,
        valor_unitario: 0,
      }));
      // Aplica em todos os fornecedores existentes (preservando preços já digitados se SC for a mesma)
      const current = form.getValues('fornecedores');
      const updated = current.map(f => ({
        ...f,
        itens: itensBase.map((base) => {
          const prev = f.itens?.find((p: any) => p.solicitacao_item_id === base.solicitacao_item_id);
          return prev ? { ...base, valor_unitario: prev.valor_unitario } : base;
        }),
      }));
      // Se ainda não existe nenhum fornecedor, cria o primeiro vazio
      if (updated.length === 0) {
        form.setValue('fornecedores', [{
          fornecedor_id: '',
          condicao_pagamento: '',
          prazo_entrega: '',
          observacoes: '',
          itens: itensBase,
        }] as any);
      } else {
        form.setValue('fornecedores', updated as any);
      }
    })();
    return () => { cancel = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedSolId]);

  // Pré-seleciona SC se vier por query param
  useEffect(() => {
    const sc = searchParams.get('sc');
    const addForn = searchParams.get('addForn');
    if (sc && !open) {
      form.setValue('solicitacao_id', sc);
      setOpen(true);
      searchParams.delete('sc');
      setSearchParams(searchParams, { replace: true });
    }
    if (addForn) {
      setAddFornecedorScId(addForn);
      searchParams.delete('addForn');
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleAddFornecedor = async () => {
    // Carrega itens da SC para inicializar o novo fornecedor
    if (!watchedSolId) {
      toast.error('Selecione a solicitação primeiro');
      return;
    }
    const { data } = await supabase
      .from('solicitacao_itens')
      .select('id, descricao, quantidade, unidade')
      .eq('solicitacao_id', watchedSolId);
    const itens = (data || []).map((it: any) => ({
      solicitacao_item_id: it.id,
      descricao: it.descricao,
      quantidade: Number(it.quantidade),
      unidade: it.unidade,
      valor_unitario: 0,
    }));
    appendFornecedor({
      fornecedor_id: '',
      condicao_pagamento: '',
      prazo_entrega: '',
      observacoes: '',
      itens,
    } as any);
  };

  const saveMutation = useMutation({
    mutationFn: async (values: MapaFormData) => {
      const payload = values.fornecedores.map(f => ({
        fornecedor_id: f.fornecedor_id,
        data_validade: f.data_validade ? format(f.data_validade, 'yyyy-MM-dd') : null,
        condicao_pagamento: f.condicao_pagamento || null,
        prazo_entrega: f.prazo_entrega || null,
        observacoes: f.observacoes || null,
        itens: f.itens.map(it => ({
          solicitacao_item_id: it.solicitacao_item_id,
          quantidade: it.quantidade,
          valor_unitario: it.valor_unitario,
        })),
      }));
      const { error } = await supabase.rpc('salvar_mapa_cotacao', {
        _solicitacao_id: values.solicitacao_id,
        _empresa_id: empresaAtiva!.id,
        _fornecedores: payload as any,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cotacoes'] });
      qc.invalidateQueries({ queryKey: ['solicitacoes'] });
      qc.invalidateQueries({ queryKey: ['solicitacoes_compra'] });
      qc.invalidateQueries({ queryKey: ['solicitacoes_aprovadas'] });
      qc.invalidateQueries({ queryKey: ['fornecedores_ja_cotados'] });
      toast.success('Mapa de cotação salvo');
      handleClose();
    },
    onError: (e: any) => toast.error(e?.message || 'Erro ao salvar mapa de cotação'),
  });

  const aprovarMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('aprovar_cotacao', { _cotacao_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cotacoes'] });
      qc.invalidateQueries({ queryKey: ['cotacoes_aprovadas'] });
      toast.success('Cotação aprovada (concorrentes recusadas)');
    },
    onError: (e: any) => toast.error(e?.message || 'Erro ao aprovar cotação'),
  });

  const rejeitarMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cotacoes').update({ status: 'rejeitada' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cotacoes'] }); toast.success('Cotação rejeitada'); },
    onError: (e: any) => toast.error(e?.message || 'Erro ao rejeitar'),
  });

  const handleClose = () => {
    setOpen(false);
    form.reset({ solicitacao_id: '', fornecedores: [] });
  };

  const openItens = async (cot: any) => {
    const { data } = await supabase
      .from('cotacao_itens')
      .select('id, quantidade, valor_unitario, valor_total, solicitacao_itens(descricao, unidade)')
      .eq('cotacao_id', cot.id);
    setViewItens({ ...cot, itens: data || [] });
  };

  const canApproveCompras = isAdmin || canApprove('compras', 'cotacoes');

  const filtered = cotacoes.filter((c: any) =>
    `COT-${c.numero}`.toLowerCase().includes(search.toLowerCase()) ||
    (c.fornecedores?.razao_social || '').toLowerCase().includes(search.toLowerCase()) ||
    `SC-${c.solicitacoes_compra?.numero}`.toLowerCase().includes(search.toLowerCase())
  );

  // Agrupa cotações por SC para visão "mapa"
  const mapasPorSC = useMemo(() => {
    const groups = new Map<string, { sc_id: string; sc_numero: number; cotacoes: any[]; menorTotal: number; temPedido: boolean }>();
    filtered.forEach((c: any) => {
      const key = c.solicitacao_id;
      if (!key) return;
      let g = groups.get(key);
      if (!g) {
        g = { sc_id: key, sc_numero: c.solicitacoes_compra?.numero ?? 0, cotacoes: [], menorTotal: Infinity, temPedido: false };
        groups.set(key, g);
      }
      g.cotacoes.push(c);
      const total = Number(c.valor_total) || 0;
      if ((c.cotacao_itens || []).length > 0 && total > 0 && total < g.menorTotal) g.menorTotal = total;
      if ((c.pedidos_compra || []).some((p: any) => p.status !== 'cancelado')) g.temPedido = true;
    });
    return Array.from(groups.values()).sort((a, b) => b.sc_numero - a.sc_numero);
  }, [filtered]);

  const [expandedSCs, setExpandedSCs] = useState<Set<string>>(new Set());
  const toggleSC = (id: string) => setExpandedSCs((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  // Resumo do mapa em construção
  const watchedFornecedores = useWatch({ control: form.control, name: 'fornecedores' }) || [];
  const totaisPorFornecedor = useMemo(() => watchedFornecedores.map((f: any) =>
    (f?.itens || []).reduce((acc: number, it: any) => acc + (Number(it.quantidade) || 0) * (Number(it.valor_unitario) || 0), 0)
  ), [watchedFornecedores]);
  const totaisFiltrados = totaisPorFornecedor.filter(t => t > 0);
  const menorTotal = totaisFiltrados.length ? Math.min(...totaisFiltrados) : 0;
  const maiorTotal = totaisFiltrados.length ? Math.max(...totaisFiltrados) : 0;

  // Fornecedores que JÁ têm cotação pendente para a SC selecionada (evita duplicidade)
  const { data: fornecedoresJaCotados = [] } = useQuery({
    queryKey: ['fornecedores_ja_cotados', watchedSolId],
    queryFn: async () => {
      if (!watchedSolId) return [];
      const { data } = await supabase
        .from('cotacoes')
        .select('fornecedor_id, fornecedores(razao_social)')
        .eq('solicitacao_id', watchedSolId)
        .eq('status', 'pendente');
      return data || [];
    },
    enabled: !!watchedSolId,
  });
  const idsJaCotados = useMemo(() => new Set(fornecedoresJaCotados.map((f: any) => f.fornecedor_id)), [fornecedoresJaCotados]);
  const nomesJaCotados = fornecedoresJaCotados.map((f: any) => f.fornecedores?.razao_social).filter(Boolean);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cotações</h1>
        <p className="text-muted-foreground">Gerencie mapas de cotação com múltiplos fornecedores por solicitação</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por número ou fornecedor..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> Novo Mapa de Cotação</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : mapasPorSC.length === 0 ? (
        <div className="rounded-md border p-8 text-center text-muted-foreground">Nenhum mapa de cotação encontrado</div>
      ) : (
        <div className="space-y-3">
          {mapasPorSC.map((grupo) => {
            const isOpen = expandedSCs.has(grupo.sc_id);
            const fornecedoresCount = grupo.cotacoes.length;
            const aprovada = grupo.cotacoes.find((c: any) => c.status === 'aprovada');
            const statusLabel = grupo.temPedido
              ? 'Pedido emitido'
              : aprovada ? 'Cotação aprovada' : 'Em cotação';
            const statusColor = grupo.temPedido || aprovada ? 'default' : 'outline';
            return (
              <Collapsible key={grupo.sc_id} open={isOpen} onOpenChange={() => toggleSC(grupo.sc_id)}>
                <div className="rounded-md border bg-card">
                  <CollapsibleTrigger className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left">
                    {isOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      <span className="font-semibold text-base">SC-{grupo.sc_numero}</span>
                      <span className="text-muted-foreground">
                        {fornecedoresCount} {fornecedoresCount === 1 ? 'fornecedor cotado' : 'fornecedores cotados'}
                      </span>
                      {grupo.menorTotal !== Infinity && (
                        <span className="text-muted-foreground">
                          Menor: <strong className="text-foreground">{formatBRL(grupo.menorTotal)}</strong>
                        </span>
                      )}
                      <Badge variant={statusColor as any}>{statusLabel}</Badge>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Cotação</TableHead>
                            <TableHead>Fornecedor</TableHead>
                            <TableHead>Itens</TableHead>
                            <TableHead>Valor Total</TableHead>
                            <TableHead>Validade</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Pedido</TableHead>
                            <TableHead className="w-[180px]">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {grupo.cotacoes.map((c: any) => {
                            const sc = statusConfig[c.status] || statusConfig.pendente;
                            const itensCount = (c.cotacao_itens || []).length;
                            const pedido = (c.pedidos_compra || []).find((p: any) => p.status !== 'cancelado');
                            return (
                              <TableRow key={c.id}>
                                <TableCell className="font-medium">COT-{c.numero}</TableCell>
                                <TableCell>{c.fornecedores?.razao_social}</TableCell>
                                <TableCell>{itensCount > 0 ? `${itensCount} ${itensCount === 1 ? 'item' : 'itens'}` : '—'}</TableCell>
                                <TableCell>{formatBRL(c.valor_total)}</TableCell>
                                <TableCell>{c.data_validade ? formatDate(c.data_validade) : '—'}</TableCell>
                                <TableCell><Badge variant={sc.variant}>{sc.label}</Badge></TableCell>
                                <TableCell>{pedido ? <Badge variant="default">PED-{pedido.numero}</Badge> : '—'}</TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    {itensCount > 0 && (
                                      <Button variant="ghost" size="icon" onClick={() => openItens(c)} title="Ver itens"><Eye className="h-4 w-4" /></Button>
                                    )}
                                    {c.status === 'pendente' && canApproveCompras && !pedido && (
                                      <>
                                        <Button variant="ghost" size="icon" onClick={() => aprovarMutation.mutate(c.id)} title="Aprovar"><CheckCircle className="h-4 w-4 text-primary" /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => rejeitarMutation.mutate(c.id)} title="Rejeitar"><XCircle className="h-4 w-4 text-destructive" /></Button>
                                      </>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                      <div className="p-3 flex flex-wrap gap-2 border-t bg-muted/20">
                        {!grupo.temPedido && (
                          <Button variant="outline" size="sm" onClick={() => setAddFornecedorScId(grupo.sc_id)}>
                            <UserPlus className="mr-2 h-4 w-4" /> Adicionar fornecedor ao mapa
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => navigate(`/compras/cotacoes/comparativo/${grupo.sc_id}`)}>
                          <GitCompare className="mr-2 h-4 w-4" /> Abrir mapa comparativo
                        </Button>
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      )}

      {/* View itens dialog */}
      <Dialog open={!!viewItens} onOpenChange={(v) => !v && setViewItens(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Itens da COT-{viewItens?.numero}</DialogTitle>
            <DialogDescription>{viewItens?.fornecedores?.razao_social}</DialogDescription>
          </DialogHeader>
          {viewItens && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead>Un</TableHead>
                    <TableHead className="text-right">Unitário</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewItens.itens.map((it: any) => (
                    <TableRow key={it.id}>
                      <TableCell>{it.solicitacao_itens?.descricao}</TableCell>
                      <TableCell className="text-right">{Number(it.quantidade)}</TableCell>
                      <TableCell>{it.solicitacao_itens?.unidade}</TableCell>
                      <TableCell className="text-right">{formatBRL(Number(it.valor_unitario))}</TableCell>
                      <TableCell className="text-right">{formatBRL(Number(it.valor_total))}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={4} className="text-right font-medium">Total</TableCell>
                    <TableCell className="text-right font-bold">{formatBRL(Number(viewItens.valor_total))}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Mapa de Cotação dialog */}
      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{nomesJaCotados.length > 0 ? 'Adicionar ao Mapa de Cotação' : 'Novo Mapa de Cotação'}</DialogTitle>
            <DialogDescription>Selecione a solicitação e adicione propostas de um ou mais fornecedores.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4">
              <FormField control={form.control} name="solicitacao_id" render={({ field }) => (
                <FormItem className="max-w-sm">
                  <FormLabel>Solicitação *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>{solicitacoesAprovadas.map((s: any) => <SelectItem key={s.id} value={s.id}>SC-{s.numero}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {watchedSolId && nomesJaCotados.length > 0 && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Esta SC já tem {nomesJaCotados.length} {nomesJaCotados.length === 1 ? 'proposta cotada' : 'propostas cotadas'} ({nomesJaCotados.join(', ')}). Você pode adicionar novos fornecedores ao mapa existente — os já cotados ficam indisponíveis abaixo.
                  </AlertDescription>
                </Alert>
              )}

              {watchedSolId && (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-base">Propostas dos fornecedores</h3>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddFornecedor}>
                      <Plus className="mr-2 h-4 w-4" /> Adicionar fornecedor
                    </Button>
                  </div>

                  {fornecedorFields.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Adicione pelo menos um fornecedor para iniciar.</p>
                  )}

                  <div className="space-y-4">
                    {fornecedorFields.map((field, fIdx) => {
                      const itens = watchedFornecedores[fIdx]?.itens || [];
                      const totalForn = itens.reduce((acc: number, it: any) => acc + (Number(it.quantidade) || 0) * (Number(it.valor_unitario) || 0), 0);
                      const isMenor = totalForn > 0 && totalForn === menorTotal && totaisFiltrados.length > 1;

                      return (
                        <Card key={field.id} className={cn(isMenor && 'border-primary')}>
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-2">
                              <CardTitle className="text-base flex items-center gap-2">
                                Fornecedor #{fIdx + 1}
                                {isMenor && <Badge variant="default">Menor preço</Badge>}
                              </CardTitle>
                              {fornecedorFields.length > 1 && (
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeFornecedor(fIdx)} title="Remover fornecedor">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <FormField control={form.control} name={`fornecedores.${fIdx}.fornecedor_id`} render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Fornecedor *</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                      {fornecedores.map((f: any) => {
                                        const jaUsado = watchedFornecedores.some((wf: any, i: number) => i !== fIdx && wf?.fornecedor_id === f.id);
                                        const jaCotado = idsJaCotados.has(f.id);
                                        const disabled = jaUsado || jaCotado;
                                        const sufixo = jaCotado ? ' (já cotou esta SC)' : jaUsado ? ' (já no mapa)' : '';
                                        return (
                                          <SelectItem key={f.id} value={f.id} disabled={disabled}>
                                            {f.razao_social}{sufixo}
                                          </SelectItem>
                                        );
                                      })}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )} />
                              <FormField control={form.control} name={`fornecedores.${fIdx}.data_validade`} render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Validade</FormLabel>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <FormControl>
                                        <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !field.value && 'text-muted-foreground')}>
                                          <CalendarIcon className="mr-2 h-4 w-4" />
                                          {field.value ? format(field.value, 'dd/MM/yyyy') : 'Selecionar'}
                                        </Button>
                                      </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent>
                                  </Popover>
                                  <FormMessage />
                                </FormItem>
                              )} />
                              <FormField control={form.control} name={`fornecedores.${fIdx}.condicao_pagamento`} render={({ field }) => (
                                <FormItem><FormLabel>Condição Pagamento</FormLabel><FormControl><Input placeholder="Ex: 30/60 dias" {...field} /></FormControl><FormMessage /></FormItem>
                              )} />
                              <FormField control={form.control} name={`fornecedores.${fIdx}.prazo_entrega`} render={({ field }) => (
                                <FormItem><FormLabel>Prazo Entrega</FormLabel><FormControl><Input placeholder="Ex: 15 dias" {...field} /></FormControl><FormMessage /></FormItem>
                              )} />
                            </div>

                            <div className="rounded-md border">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Descrição</TableHead>
                                    <TableHead className="text-right w-[80px]">Qtd</TableHead>
                                    <TableHead className="w-[70px]">Un</TableHead>
                                    <TableHead className="w-[140px]">Valor Unit. (R$) *</TableHead>
                                    <TableHead className="text-right w-[120px]">Total</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {itens.map((item: any, iIdx: number) => {
                                    const total = (Number(item?.quantidade) || 0) * (Number(item?.valor_unitario) || 0);
                                    return (
                                      <TableRow key={`${field.id}-${iIdx}`}>
                                        <TableCell className="text-sm">{item?.descricao}</TableCell>
                                        <TableCell className="text-right text-sm">{Number(item?.quantidade)}</TableCell>
                                        <TableCell className="text-sm">{item?.unidade}</TableCell>
                                        <TableCell>
                                          <FormField control={form.control} name={`fornecedores.${fIdx}.itens.${iIdx}.valor_unitario`} render={({ field }) => (
                                            <FormItem><FormControl><Input type="number" step="0.01" min="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                                          )} />
                                        </TableCell>
                                        <TableCell className="text-right text-sm">{formatBRL(total)}</TableCell>
                                      </TableRow>
                                    );
                                  })}
                                  <TableRow>
                                    <TableCell colSpan={4} className="text-right font-medium">Total deste fornecedor</TableCell>
                                    <TableCell className="text-right font-bold">{formatBRL(totalForn)}</TableCell>
                                  </TableRow>
                                </TableBody>
                              </Table>
                            </div>

                            <FormField control={form.control} name={`fornecedores.${fIdx}.observacoes`} render={({ field }) => (
                              <FormItem><FormLabel>Observações</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  {totaisFiltrados.length > 1 && (
                    <div className="rounded-md border bg-muted/30 p-3 text-sm flex flex-wrap gap-x-6 gap-y-1">
                      <span><strong>{totaisFiltrados.length}</strong> propostas precificadas</span>
                      <span>Menor total: <strong className="text-primary">{formatBRL(menorTotal)}</strong></span>
                      <span>Maior total: <strong>{formatBRL(maiorTotal)}</strong></span>
                      {menorTotal > 0 && (
                        <span>Diferença: <strong>{formatBRL(maiorTotal - menorTotal)}</strong> ({((maiorTotal - menorTotal) / menorTotal * 100).toFixed(1)}%)</span>
                      )}
                    </div>
                  )}
                </>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
                <Button type="submit" disabled={saveMutation.isPending || fornecedorFields.length === 0}>
                  {saveMutation.isPending ? 'Salvando...' : nomesJaCotados.length > 0 ? 'Adicionar ao Mapa' : 'Criar Mapa'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Adicionar fornecedor a uma SC existente */}
      <AddFornecedorDialog
        scId={addFornecedorScId}
        empresaId={empresaAtiva?.id}
        fornecedores={fornecedores}
        onClose={() => setAddFornecedorScId(null)}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ['cotacoes'] });
          qc.invalidateQueries({ queryKey: ['fornecedores_ja_cotados'] });
          setAddFornecedorScId(null);
        }}
      />
    </div>
  );
}

// ----------------------------------------------------------------------------
// Subcomponente: adicionar UM fornecedor adicional a uma SC já em cotação
// ----------------------------------------------------------------------------
function AddFornecedorDialog({
  scId, empresaId, fornecedores, onClose, onSaved,
}: {
  scId: string | null;
  empresaId: string | undefined;
  fornecedores: any[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const form = useForm<AddFornecedorFormData>({
    resolver: zodResolver(addFornecedorSchema),
    defaultValues: { fornecedor_id: '', condicao_pagamento: '', prazo_entrega: '', observacoes: '', itens: [] },
  });
  const watchedItens = form.watch('itens');

  const { data: jaCotados = [] } = useQuery({
    queryKey: ['fornecedores_ja_cotados', scId],
    queryFn: async () => {
      if (!scId) return [];
      const { data } = await supabase
        .from('cotacoes')
        .select('fornecedor_id')
        .eq('solicitacao_id', scId)
        .eq('status', 'pendente');
      return data || [];
    },
    enabled: !!scId,
  });
  const idsJaCotados = useMemo(() => new Set(jaCotados.map((f: any) => f.fornecedor_id)), [jaCotados]);

  useEffect(() => {
    if (!scId) { form.reset({ fornecedor_id: '', condicao_pagamento: '', prazo_entrega: '', observacoes: '', itens: [] }); return; }
    (async () => {
      const { data } = await supabase
        .from('solicitacao_itens')
        .select('id, descricao, quantidade, unidade')
        .eq('solicitacao_id', scId);
      form.setValue('itens', (data || []).map((it: any) => ({
        solicitacao_item_id: it.id,
        descricao: it.descricao,
        quantidade: Number(it.quantidade),
        unidade: it.unidade,
        valor_unitario: 0,
      })) as any);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scId]);

  const saveMutation = useMutation({
    mutationFn: async (values: AddFornecedorFormData) => {
      const cotacao = {
        empresa_id: empresaId,
        solicitacao_id: scId,
        fornecedor_id: values.fornecedor_id,
        data_validade: values.data_validade ? format(values.data_validade, 'yyyy-MM-dd') : null,
        condicao_pagamento: values.condicao_pagamento || null,
        prazo_entrega: values.prazo_entrega || null,
        observacoes: values.observacoes || null,
      };
      const itens = values.itens.map(it => ({
        solicitacao_item_id: it.solicitacao_item_id,
        quantidade: it.quantidade,
        valor_unitario: it.valor_unitario,
      }));
      const { error } = await supabase.rpc('salvar_cotacao_com_itens', { _cotacao: cotacao as any, _itens: itens as any });
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Fornecedor adicionado ao mapa'); onSaved(); },
    onError: (e: any) => toast.error(e?.message || 'Erro ao adicionar fornecedor'),
  });

  const totalForn = watchedItens.reduce((acc, it) => acc + (Number(it.quantidade) || 0) * (Number(it.valor_unitario) || 0), 0);

  return (
    <Dialog open={!!scId} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar fornecedor à cotação</DialogTitle>
          <DialogDescription>Inclua uma nova proposta para a mesma solicitação.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField control={form.control} name="fornecedor_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Fornecedor *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {fornecedores.map((f: any) => {
                        const jaCotado = idsJaCotados.has(f.id);
                        return (
                          <SelectItem key={f.id} value={f.id} disabled={jaCotado}>
                            {f.razao_social}{jaCotado ? ' (já cotou esta SC)' : ''}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="data_validade" render={({ field }) => (
                <FormItem>
                  <FormLabel>Validade</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !field.value && 'text-muted-foreground')}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, 'dd/MM/yyyy') : 'Selecionar'}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="condicao_pagamento" render={({ field }) => (
                <FormItem><FormLabel>Condição Pagamento</FormLabel><FormControl><Input placeholder="Ex: 30/60 dias" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="prazo_entrega" render={({ field }) => (
                <FormItem><FormLabel>Prazo Entrega</FormLabel><FormControl><Input placeholder="Ex: 15 dias" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right w-[80px]">Qtd</TableHead>
                    <TableHead className="w-[70px]">Un</TableHead>
                    <TableHead className="w-[140px]">Valor Unit. (R$) *</TableHead>
                    <TableHead className="text-right w-[120px]">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {watchedItens.map((item: any, idx: number) => {
                    const total = (Number(item?.quantidade) || 0) * (Number(item?.valor_unitario) || 0);
                    return (
                      <TableRow key={idx}>
                        <TableCell className="text-sm">{item?.descricao}</TableCell>
                        <TableCell className="text-right text-sm">{Number(item?.quantidade)}</TableCell>
                        <TableCell className="text-sm">{item?.unidade}</TableCell>
                        <TableCell>
                          <FormField control={form.control} name={`itens.${idx}.valor_unitario`} render={({ field }) => (
                            <FormItem><FormControl><Input type="number" step="0.01" min="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                        </TableCell>
                        <TableCell className="text-right text-sm">{formatBRL(total)}</TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow>
                    <TableCell colSpan={4} className="text-right font-medium">Total</TableCell>
                    <TableCell className="text-right font-bold">{formatBRL(totalForn)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <FormField control={form.control} name="observacoes" render={({ field }) => (
              <FormItem><FormLabel>Observações</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Salvando...' : 'Adicionar fornecedor'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
