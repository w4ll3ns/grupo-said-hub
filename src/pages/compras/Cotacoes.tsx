import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEmpresa } from '@/hooks/useEmpresa';
import { usePermissions } from '@/hooks/usePermissions';
import { useForm } from 'react-hook-form';
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
import { Plus, Search, CalendarIcon, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

const formatBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const formatDate = (d: string) => { const [y, m, day] = d.split('-'); return `${day}/${m}/${y}`; };

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pendente: { label: 'Pendente', variant: 'outline' },
  aprovada: { label: 'Aprovada', variant: 'default' },
  rejeitada: { label: 'Rejeitada', variant: 'destructive' },
};

const schema = z.object({
  solicitacao_id: z.string().min(1, 'Selecione uma solicitação'),
  fornecedor_id: z.string().min(1, 'Selecione um fornecedor'),
  data_validade: z.date().optional(),
  valor_total: z.coerce.number().min(0),
  condicao_pagamento: z.string().max(200).optional().or(z.literal('')),
  prazo_entrega: z.string().max(200).optional().or(z.literal('')),
  observacoes: z.string().max(1000).optional().or(z.literal('')),
});
type FormData = z.infer<typeof schema>;

export default function Cotacoes() {
  const { empresaAtiva } = useEmpresa();
  const { isAdmin, canApprove } = usePermissions();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { solicitacao_id: '', fornecedor_id: '', valor_total: 0, condicao_pagamento: '', prazo_entrega: '', observacoes: '' } });

  const { data: cotacoes = [], isLoading } = useQuery({
    queryKey: ['cotacoes', empresaAtiva?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('cotacoes').select('*, fornecedores(razao_social), solicitacoes_compra(numero)').eq('empresa_id', empresaAtiva!.id).order('created_at', { ascending: false });
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
  });

  const { data: fornecedores = [] } = useQuery({
    queryKey: ['fornecedores', empresaAtiva?.id],
    queryFn: async () => { const { data } = await supabase.from('fornecedores').select('id, razao_social').eq('empresa_id', empresaAtiva!.id).eq('ativo', true).order('razao_social'); return data || []; },
    enabled: !!empresaAtiva,
  });

  const saveMutation = useMutation({
    mutationFn: async (values: FormData) => {
      const { error } = await supabase.from('cotacoes').insert({
        empresa_id: empresaAtiva!.id,
        solicitacao_id: values.solicitacao_id,
        fornecedor_id: values.fornecedor_id,
        data_validade: values.data_validade ? format(values.data_validade, 'yyyy-MM-dd') : null,
        valor_total: values.valor_total,
        condicao_pagamento: values.condicao_pagamento || null,
        prazo_entrega: values.prazo_entrega || null,
        observacoes: values.observacoes || null,
      });
      if (error) throw error;
      // Update solicitação to cotacao status
      await supabase.from('solicitacoes_compra').update({ status: 'cotacao' }).eq('id', values.solicitacao_id).eq('status', 'aprovada');
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cotacoes'] }); qc.invalidateQueries({ queryKey: ['solicitacoes'] }); toast.success('Cotação criada'); handleClose(); },
    onError: () => toast.error('Erro ao criar cotação'),
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

  const handleClose = () => { setOpen(false); form.reset({ solicitacao_id: '', fornecedor_id: '', valor_total: 0, condicao_pagamento: '', prazo_entrega: '', observacoes: '' }); };

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
                <TableHead>Valor Total</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Prazo Entrega</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma cotação encontrada</TableCell></TableRow>
              ) : filtered.map((c: any) => {
                const sc = statusConfig[c.status] || statusConfig.pendente;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">COT-{c.numero}</TableCell>
                    <TableCell>SC-{c.solicitacoes_compra?.numero}</TableCell>
                    <TableCell>{c.fornecedores?.razao_social}</TableCell>
                    <TableCell>{formatBRL(c.valor_total)}</TableCell>
                    <TableCell>{c.data_validade ? formatDate(c.data_validade) : '—'}</TableCell>
                    <TableCell>{c.prazo_entrega || '—'}</TableCell>
                    <TableCell><Badge variant={sc.variant}>{sc.label}</Badge></TableCell>
                    <TableCell>
                      {c.status === 'pendente' && canApproveCompras && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => aprovarMutation.mutate(c.id)} title="Aprovar"><CheckCircle className="h-4 w-4 text-primary" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => rejeitarMutation.mutate(c.id)} title="Rejeitar"><XCircle className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nova Cotação</DialogTitle><DialogDescription>Vincule uma cotação a uma solicitação aprovada.</DialogDescription></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4">
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
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="valor_total" render={({ field }) => (
                  <FormItem><FormLabel>Valor Total (R$)</FormLabel><FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
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
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="condicao_pagamento" render={({ field }) => (
                  <FormItem><FormLabel>Condição Pgto</FormLabel><FormControl><Input placeholder="Ex: 30/60 dias" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="prazo_entrega" render={({ field }) => (
                  <FormItem><FormLabel>Prazo Entrega</FormLabel><FormControl><Input placeholder="Ex: 15 dias" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
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
