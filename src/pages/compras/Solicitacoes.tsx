import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEmpresa } from '@/hooks/useEmpresa';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
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
import { Plus, Search, CalendarIcon, Send, CheckCircle, XCircle, Eye, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const UNIDADES = ['un', 'kg', 'm', 'm²', 'm³', 'l', 'cx', 'pct', 'par', 'jg', 'vb'];

const itemSchema = z.object({
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  quantidade: z.coerce.number().positive('Qtd > 0'),
  unidade: z.string().min(1),
  observacao: z.string().optional().or(z.literal('')),
});

const schema = z.object({
  data_necessidade: z.date().optional(),
  obra_id: z.string().optional().or(z.literal('')),
  centro_custo_id: z.string().optional().or(z.literal('')),
  justificativa: z.string().max(1000).optional().or(z.literal('')),
  prioridade: z.string().min(1),
  observacoes: z.string().max(1000).optional().or(z.literal('')),
  itens: z.array(itemSchema).min(1, 'Adicione pelo menos um item'),
});
type FormData = z.infer<typeof schema>;

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  rascunho: { label: 'Rascunho', variant: 'secondary' },
  pendente: { label: 'Pendente', variant: 'outline' },
  aprovada: { label: 'Aprovada', variant: 'default' },
  rejeitada: { label: 'Rejeitada', variant: 'destructive' },
  cotacao: { label: 'Em Cotação', variant: 'outline' },
  pedido: { label: 'Pedido Gerado', variant: 'default' },
  concluida: { label: 'Concluída', variant: 'default' },
  cancelada: { label: 'Cancelada', variant: 'secondary' },
};

const prioridadeConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  baixa: { label: 'Baixa', variant: 'secondary' },
  media: { label: 'Média', variant: 'outline' },
  alta: { label: 'Alta', variant: 'default' },
  urgente: { label: 'Urgente', variant: 'destructive' },
};

const formatDate = (d: string) => { const [y, m, day] = d.split('-'); return `${day}/${m}/${y}`; };

export default function Solicitacoes() {
  const { empresaAtiva } = useEmpresa();
  const { user } = useAuth();
  const { canApprove, isAdmin } = usePermissions();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [viewItem, setViewItem] = useState<any>(null);
  const [rejectDialog, setRejectDialog] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { prioridade: 'media', justificativa: '', observacoes: '', obra_id: '', centro_custo_id: '', itens: [{ descricao: '', quantidade: 1, unidade: 'un', observacao: '' }] },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'itens' });

  const { data: solicitacoes = [], isLoading } = useQuery({
    queryKey: ['solicitacoes_compra', empresaAtiva?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('solicitacoes_compra').select('*').eq('empresa_id', empresaAtiva!.id).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!empresaAtiva,
  });

  const { data: obras = [] } = useQuery({
    queryKey: ['obras', empresaAtiva?.id],
    queryFn: async () => { const { data } = await supabase.from('obras').select('id, nome').eq('empresa_id', empresaAtiva!.id).eq('status', 'em_andamento').order('nome'); return data || []; },
    enabled: !!empresaAtiva,
  });

  const { data: centrosCusto = [] } = useQuery({
    queryKey: ['centros_custo', empresaAtiva?.id],
    queryFn: async () => { const { data } = await supabase.from('centros_custo').select('id, nome').eq('empresa_id', empresaAtiva!.id).eq('ativo', true).order('nome'); return data || []; },
    enabled: !!empresaAtiva,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles_map'],
    queryFn: async () => { const { data } = await supabase.from('profiles').select('id, nome'); return data || []; },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: FormData) => {
      const { data: sol, error } = await supabase.from('solicitacoes_compra').insert({
        empresa_id: empresaAtiva!.id,
        data_necessidade: values.data_necessidade ? format(values.data_necessidade, 'yyyy-MM-dd') : null,
        obra_id: values.obra_id && values.obra_id !== '__none__' ? values.obra_id : null,
        centro_custo_id: values.centro_custo_id && values.centro_custo_id !== '__none__' ? values.centro_custo_id : null,
        justificativa: values.justificativa || null,
        prioridade: values.prioridade,
        observacoes: values.observacoes || null,
      }).select('id').single();
      if (error) throw error;
      const itensPayload = values.itens.map((item) => ({
        solicitacao_id: sol.id,
        descricao: item.descricao,
        quantidade: item.quantidade,
        unidade: item.unidade,
        observacao: item.observacao || null,
      }));
      const { error: err2 } = await supabase.from('solicitacao_itens').insert(itensPayload);
      if (err2) throw err2;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['solicitacoes_compra'] }); toast.success('Solicitação criada'); handleClose(); },
    onError: () => toast.error('Erro ao criar solicitação'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, extras }: { id: string; status: string; extras?: Record<string, unknown> }) => {
      const { error } = await supabase.from('solicitacoes_compra').update({ status, ...extras }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['solicitacoes_compra'] }); toast.success('Status atualizado'); setRejectDialog(null); setRejectReason(''); },
    onError: () => toast.error('Erro ao atualizar status'),
  });

  const handleClose = () => {
    setOpen(false);
    form.reset({ prioridade: 'media', justificativa: '', observacoes: '', obra_id: '', centro_custo_id: '', itens: [{ descricao: '', quantidade: 1, unidade: 'un', observacao: '' }] });
  };

  const handleView = async (sol: any) => {
    const { data: itens } = await supabase.from('solicitacao_itens').select('*').eq('solicitacao_id', sol.id);
    setViewItem({ ...sol, itens: itens || [] });
  };

  const canApproveCompras = isAdmin || canApprove('compras', 'solicitacoes');

  const filtered = solicitacoes
    .filter((s: any) => statusFilter === 'todos' || s.status === statusFilter)
    .filter((s: any) => `SC-${s.numero}`.toLowerCase().includes(search.toLowerCase()) || (s.justificativa || '').toLowerCase().includes(search.toLowerCase()));

  const getProfileName = (id: string | null) => profiles.find((p: any) => p.id === id)?.nome || '—';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Solicitações de Compra</h1>
        <p className="text-muted-foreground">Gerencie solicitações com workflow de aprovação</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por número ou justificativa..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="rascunho">Rascunho</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="aprovada">Aprovada</SelectItem>
            <SelectItem value="rejeitada">Rejeitada</SelectItem>
            <SelectItem value="cotacao">Em Cotação</SelectItem>
            <SelectItem value="concluida">Concluída</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> Nova Solicitação</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Solicitante</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Necessidade</TableHead>
                <TableHead className="w-[160px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma solicitação encontrada</TableCell></TableRow>
              ) : filtered.map((s: any) => {
                const sc = statusConfig[s.status] || statusConfig.rascunho;
                const pc = prioridadeConfig[s.prioridade] || prioridadeConfig.media;
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">SC-{s.numero}</TableCell>
                    <TableCell>{formatDate(s.data_solicitacao)}</TableCell>
                    <TableCell>{getProfileName(s.solicitante_id)}</TableCell>
                    <TableCell><Badge variant={pc.variant}>{pc.label}</Badge></TableCell>
                    <TableCell><Badge variant={sc.variant}>{sc.label}</Badge></TableCell>
                    <TableCell>{s.data_necessidade ? formatDate(s.data_necessidade) : '—'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleView(s)} title="Detalhes"><Eye className="h-4 w-4" /></Button>
                        {s.status === 'rascunho' && (
                          <Button variant="ghost" size="icon" onClick={() => updateStatusMutation.mutate({ id: s.id, status: 'pendente' })} title="Enviar para Aprovação"><Send className="h-4 w-4 text-primary" /></Button>
                        )}
                        {s.status === 'pendente' && canApproveCompras && s.solicitante_id !== user?.id && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => updateStatusMutation.mutate({ id: s.id, status: 'aprovada' })} title="Aprovar"><CheckCircle className="h-4 w-4 text-primary" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => setRejectDialog(s.id)} title="Rejeitar"><XCircle className="h-4 w-4 text-destructive" /></Button>
                          </>
                        )}
                        {s.status === 'pendente' && canApproveCompras && s.solicitante_id === user?.id && (
                          <span className="inline-flex h-9 w-9 items-center justify-center opacity-50 cursor-not-allowed" title="Você não pode aprovar sua própria solicitação">
                            <CheckCircle className="h-4 w-4 text-muted-foreground" />
                          </span>
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

      {/* View dialog */}
      <Dialog open={!!viewItem} onOpenChange={(v) => !v && setViewItem(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Solicitação SC-{viewItem?.numero}</DialogTitle><DialogDescription>Detalhes da solicitação de compra</DialogDescription></DialogHeader>
          {viewItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Status:</span> <Badge variant={statusConfig[viewItem.status]?.variant}>{statusConfig[viewItem.status]?.label}</Badge></div>
                <div><span className="text-muted-foreground">Prioridade:</span> <Badge variant={prioridadeConfig[viewItem.prioridade]?.variant}>{prioridadeConfig[viewItem.prioridade]?.label}</Badge></div>
                <div><span className="text-muted-foreground">Solicitante:</span> {getProfileName(viewItem.solicitante_id)}</div>
                <div><span className="text-muted-foreground">Data:</span> {formatDate(viewItem.data_solicitacao)}</div>
                {viewItem.data_necessidade && <div><span className="text-muted-foreground">Necessidade:</span> {formatDate(viewItem.data_necessidade)}</div>}
              </div>
              {viewItem.justificativa && <div className="text-sm"><span className="text-muted-foreground">Justificativa:</span> {viewItem.justificativa}</div>}
              {viewItem.motivo_rejeicao && <div className="text-sm text-destructive"><span className="font-medium">Motivo rejeição:</span> {viewItem.motivo_rejeicao}</div>}
              <div>
                <h4 className="font-medium mb-2">Itens</h4>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader><TableRow><TableHead>Descrição</TableHead><TableHead>Qtd</TableHead><TableHead>Un</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {(viewItem.itens || []).map((item: any) => (
                        <TableRow key={item.id}><TableCell>{item.descricao}</TableCell><TableCell>{item.quantidade}</TableCell><TableCell>{item.unidade}</TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={(v) => { if (!v) { setRejectDialog(null); setRejectReason(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Rejeitar Solicitação</DialogTitle><DialogDescription>Informe o motivo da rejeição.</DialogDescription></DialogHeader>
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Motivo da rejeição..." />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectDialog(null); setRejectReason(''); }}>Cancelar</Button>
            <Button variant="destructive" disabled={!rejectReason.trim()} onClick={() => rejectDialog && updateStatusMutation.mutate({ id: rejectDialog, status: 'rejeitada', extras: { motivo_rejeicao: rejectReason } })}>Rejeitar</Button> disabled={!rejectReason.trim()} onClick={() => rejectDialog && updateStatusMutation.mutate({ id: rejectDialog, status: 'rejeitada', extras: { motivo_rejeicao: rejectReason } })}>Rejeitar</Button> variant="destructive" disabled={!rejectReason.trim()} onClick={() => rejectDialog && updateStatusMutation.mutate({ id: rejectDialog, status: 'rejeitada', extras: { motivo_rejeicao: rejectReason } })}>Rejeitar</Button> })}>Rejeitar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create dialog */}
      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova Solicitação de Compra</DialogTitle><DialogDescription>Preencha os dados e adicione os itens necessários.</DialogDescription></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="prioridade" render={({ field }) => (
                  <FormItem><FormLabel>Prioridade</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="baixa">Baixa</SelectItem>
                        <SelectItem value="media">Média</SelectItem>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="urgente">Urgente</SelectItem>
                      </SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="data_necessidade" render={({ field }) => (
                  <FormItem><FormLabel>Data Necessidade</FormLabel>
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
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="obra_id" render={({ field }) => (
                  <FormItem><FormLabel>Obra</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">Nenhuma</SelectItem>
                        {obras.map((o: any) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
                      </SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="centro_custo_id" render={({ field }) => (
                  <FormItem><FormLabel>Centro de Custo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">Nenhum</SelectItem>
                        {centrosCusto.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                      </SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="justificativa" render={({ field }) => (
                <FormItem><FormLabel>Justificativa</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Itens *</h4>
                  <Button type="button" variant="outline" size="sm" onClick={() => append({ descricao: '', quantidade: 1, unidade: 'un', observacao: '' })}>
                    <Plus className="mr-1 h-3 w-3" /> Adicionar Item
                  </Button>
                </div>
                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex gap-2 items-start p-3 rounded-md border">
                      <div className="flex-1 space-y-2">
                        <FormField control={form.control} name={`itens.${index}.descricao`} render={({ field }) => (
                          <FormItem><FormControl><Input placeholder="Descrição do item" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <div className="flex gap-2">
                          <FormField control={form.control} name={`itens.${index}.quantidade`} render={({ field }) => (
                            <FormItem className="w-24"><FormControl><Input type="number" step="0.01" min="0.01" placeholder="Qtd" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name={`itens.${index}.unidade`} render={({ field }) => (
                            <FormItem className="w-24">
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>{UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                              </Select><FormMessage />
                            </FormItem>
                          )} />
                        </div>
                      </div>
                      {fields.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      )}
                    </div>
                  ))}
                </div>
                {form.formState.errors.itens?.root && <p className="text-sm text-destructive mt-1">{form.formState.errors.itens.root.message}</p>}
              </div>

              <FormField control={form.control} name="observacoes" render={({ field }) => (
                <FormItem><FormLabel>Observações</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
                <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Salvando...' : 'Criar Solicitação'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
