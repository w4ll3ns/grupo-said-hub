import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEmpresa } from '@/hooks/useEmpresa';
import { usePermissions } from '@/hooks/usePermissions';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { Plus, Search, CalendarIcon, CheckCircle, XCircle, Eye, GitCompare } from 'lucide-react';
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

const schema = z.object({
  solicitacao_id: z.string().min(1, 'Selecione uma solicitação'),
  fornecedor_id: z.string().min(1, 'Selecione um fornecedor'),
  data_validade: z.date().optional(),
  condicao_pagamento: z.string().max(200).optional().or(z.literal('')),
  prazo_entrega: z.string().max(200).optional().or(z.literal('')),
  observacoes: z.string().max(1000).optional().or(z.literal('')),
  itens: z.array(itemSchema).min(1, 'A solicitação selecionada não tem itens'),
});
type FormData = z.infer<typeof schema>;

export default function Cotacoes() {
  const navigate = useNavigate();
  const { empresaAtiva } = useEmpresa();
  const { isAdmin, canApprove } = usePermissions();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [viewItens, setViewItens] = useState<any | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { solicitacao_id: '', fornecedor_id: '', condicao_pagamento: '', prazo_entrega: '', observacoes: '', itens: [] },
  });
  const { fields, replace } = useFieldArray({ control: form.control, name: 'itens' });
  const watchedItens = form.watch('itens');
  const valorTotalCalc = watchedItens.reduce((acc, it) => acc + (Number(it.quantidade) || 0) * (Number(it.valor_unitario) || 0), 0);

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

  // Carrega itens da SC quando o usuário a seleciona
  const watchedSolId = form.watch('solicitacao_id');
  useEffect(() => {
    if (!watchedSolId) { replace([]); return; }
    let cancel = false;
    (async () => {
      const { data, error } = await supabase
        .from('solicitacao_itens')
        .select('id, descricao, quantidade, unidade')
        .eq('solicitacao_id', watchedSolId);
      if (cancel) return;
      if (error) { toast.error('Erro ao carregar itens da solicitação'); return; }
      replace((data || []).map((it: any) => ({
        solicitacao_item_id: it.id,
        descricao: it.descricao,
        quantidade: Number(it.quantidade),
        unidade: it.unidade,
        valor_unitario: 0,
      })));
    })();
    return () => { cancel = true; };
  }, [watchedSolId, replace]);

  const saveMutation = useMutation({
    mutationFn: async (values: FormData) => {
      const cotacao = {
        empresa_id: empresaAtiva!.id,
        solicitacao_id: values.solicitacao_id,
        fornecedor_id: values.fornecedor_id,
        data_validade: values.data_validade ? format(values.data_validade, 'yyyy-MM-dd') : null,
        condicao_pagamento: values.condicao_pagamento || null,
        prazo_entrega: values.prazo_entrega || null,
        observacoes: values.observacoes || null,
      };
      const itens = values.itens.map((it) => ({
        solicitacao_item_id: it.solicitacao_item_id,
        quantidade: it.quantidade,
        valor_unitario: it.valor_unitario,
      }));
      const { error } = await supabase.rpc('salvar_cotacao_com_itens', { _cotacao: cotacao as any, _itens: itens as any });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cotacoes'] });
      qc.invalidateQueries({ queryKey: ['solicitacoes'] });
      qc.invalidateQueries({ queryKey: ['solicitacoes_compra'] });
      qc.invalidateQueries({ queryKey: ['solicitacoes_aprovadas'] });
      toast.success('Cotação criada com itens');
      handleClose();
    },
    onError: (e: any) => toast.error(e?.message || 'Erro ao criar cotação'),
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
    form.reset({ solicitacao_id: '', fornecedor_id: '', condicao_pagamento: '', prazo_entrega: '', observacoes: '', itens: [] });
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
    (c.fornecedores?.razao_social || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cotações</h1>
        <p className="text-muted-foreground">Gerencie cotações de fornecedores vinculadas a solicitações</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por número ou fornecedor..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> Nova Cotação</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Solicitação</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Pedido</TableHead>
                <TableHead className="w-[160px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhuma cotação encontrada</TableCell></TableRow>
              ) : filtered.map((c: any) => {
                const sc = statusConfig[c.status] || statusConfig.pendente;
                const itensCount = (c.cotacao_itens || []).length;
                const pedido = (c.pedidos_compra || []).find((p: any) => p.status !== 'cancelado');
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">COT-{c.numero}</TableCell>
                    <TableCell>
                      <button
                        onClick={() => c.solicitacao_id && navigate(`/compras/cotacoes/comparativo/${c.solicitacao_id}`)}
                        className="text-primary hover:underline"
                        title="Comparar cotações desta solicitação"
                      >SC-{c.solicitacoes_compra?.numero}</button>
                    </TableCell>
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
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/compras/cotacoes/comparativo/${c.solicitacao_id}`)} title="Comparativo"><GitCompare className="h-4 w-4" /></Button>
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

      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova Cotação</DialogTitle><DialogDescription>Selecione uma solicitação e informe o valor unitário de cada item.</DialogDescription></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="solicitacao_id" render={({ field }) => (
                  <FormItem><FormLabel>Solicitação *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                      <SelectContent>{solicitacoesAprovadas.map((s: any) => <SelectItem key={s.id} value={s.id}>SC-{s.numero}</SelectItem>)}</SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="fornecedor_id" render={({ field }) => (
                  <FormItem><FormLabel>Fornecedor *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                      <SelectContent>{fornecedores.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.razao_social}</SelectItem>)}</SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )} />
              </div>

              {fields.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Itens da solicitação</h4>
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
                        {fields.map((f, idx) => {
                          const item = watchedItens[idx];
                          const total = (Number(item?.quantidade) || 0) * (Number(item?.valor_unitario) || 0);
                          return (
                            <TableRow key={f.id}>
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
                          <TableCell colSpan={4} className="text-right font-medium">Total da Cotação</TableCell>
                          <TableCell className="text-right font-bold">{formatBRL(valorTotalCalc)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="data_validade" render={({ field }) => (
                  <FormItem><FormLabel>Validade</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, 'dd/MM/yyyy') : 'Selecionar'}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent>
                    </Popover><FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="prazo_entrega" render={({ field }) => (
                  <FormItem><FormLabel>Prazo Entrega</FormLabel><FormControl><Input placeholder="Ex: 15 dias" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="condicao_pagamento" render={({ field }) => (
                <FormItem><FormLabel>Condição Pagamento</FormLabel><FormControl><Input placeholder="Ex: 30/60 dias" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="observacoes" render={({ field }) => (
                <FormItem><FormLabel>Observações</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
                <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Salvando...' : 'Criar Cotação'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
