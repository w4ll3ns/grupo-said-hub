import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEmpresa } from '@/hooks/useEmpresa';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Pencil, Search, CalendarIcon, CheckCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const schema = z.object({
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  valor: z.coerce.number().positive('Valor deve ser positivo'),
  data_emissao: z.date({ required_error: 'Data de emissão é obrigatória' }),
  data_vencimento: z.date({ required_error: 'Data de vencimento é obrigatória' }),
  conta_bancaria_id: z.string().optional().or(z.literal('')),
  forma_pagamento_id: z.string().optional().or(z.literal('')),
  centro_custo_id: z.string().optional().or(z.literal('')),
  plano_id: z.string().min(1, 'Categoria é obrigatória'),
  observacoes: z.string().optional().or(z.literal('')),
});
type FormData = z.infer<typeof schema>;

type Lancamento = {
  id: string;
  empresa_id: string;
  tipo: string;
  descricao: string;
  valor: number;
  data_emissao: string;
  data_vencimento: string;
  data_pagamento: string | null;
  status: string;
  conta_bancaria_id: string | null;
  forma_pagamento_id: string | null;
  centro_custo_id: string | null;
  plano_receita_id: string | null;
  plano_despesa_id: string | null;
  observacoes: string | null;
};

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const formatDate = (d: string) => {
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pendente: { label: 'Pendente', variant: 'outline' },
  pago: { label: 'Pago', variant: 'default' },
  vencido: { label: 'Vencido', variant: 'destructive' },
  cancelado: { label: 'Cancelado', variant: 'secondary' },
};

interface LancamentosPageProps {
  tipo: 'pagar' | 'receber';
  title: string;
  subtitle: string;
}

export default function LancamentosPage({ tipo, title, subtitle }: LancamentosPageProps) {
  const { empresaAtiva } = useEmpresa();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Lancamento | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [deleteTarget, setDeleteTarget] = useState<Lancamento | null>(null);

  const planoTable = tipo === 'receber' ? 'plano_receitas' : 'plano_despesas';
  const planoFk = tipo === 'receber' ? 'plano_receita_id' : 'plano_despesa_id';

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      descricao: '', valor: 0, data_emissao: new Date(), data_vencimento: new Date(),
      conta_bancaria_id: '', forma_pagamento_id: '', centro_custo_id: '', plano_id: '', observacoes: '',
    },
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['lancamentos', empresaAtiva?.id, tipo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lancamentos')
        .select('*')
        .eq('empresa_id', empresaAtiva!.id)
        .eq('tipo', tipo)
        .order('data_vencimento', { ascending: false });
      if (error) throw error;
      return data as Lancamento[];
    },
    enabled: !!empresaAtiva,
  });

  const { data: contasBancarias = [] } = useQuery({
    queryKey: ['contas_bancarias', empresaAtiva?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('contas_bancarias').select('id, nome').eq('empresa_id', empresaAtiva!.id).eq('ativa', true).order('nome');
      if (error) throw error;
      return data;
    },
    enabled: !!empresaAtiva,
  });

  const { data: formasPagamento = [] } = useQuery({
    queryKey: ['formas_pagamento', empresaAtiva?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('formas_pagamento').select('id, nome').eq('empresa_id', empresaAtiva!.id).eq('ativa', true).order('nome');
      if (error) throw error;
      return data;
    },
    enabled: !!empresaAtiva,
  });

  const { data: centrosCusto = [] } = useQuery({
    queryKey: ['centros_custo', empresaAtiva?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('centros_custo').select('id, nome').eq('empresa_id', empresaAtiva!.id).eq('ativo', true).order('nome');
      if (error) throw error;
      return data;
    },
    enabled: !!empresaAtiva,
  });

  const { data: planoContas = [] } = useQuery({
    queryKey: [planoTable, empresaAtiva?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from(planoTable).select('id, categoria, subcategoria').eq('empresa_id', empresaAtiva!.id).eq('ativa', true).order('categoria');
      if (error) throw error;
      return data;
    },
    enabled: !!empresaAtiva,
  });

  const saveMutation = useMutation({
    mutationFn: async (values: FormData) => {
      const payload: Record<string, unknown> = {
        descricao: values.descricao,
        valor: values.valor,
        data_emissao: format(values.data_emissao, 'yyyy-MM-dd'),
        data_vencimento: format(values.data_vencimento, 'yyyy-MM-dd'),
        conta_bancaria_id: values.conta_bancaria_id || null,
        forma_pagamento_id: values.forma_pagamento_id || null,
        centro_custo_id: values.centro_custo_id || null,
        observacoes: values.observacoes || null,
        [planoFk]: values.plano_id || null,
      };
      if (editing) {
        const { error } = await supabase.from('lancamentos').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('lancamentos').insert({ ...payload, tipo, empresa_id: empresaAtiva!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lancamentos'] });
      toast.success(editing ? 'Lançamento atualizado' : 'Lançamento criado');
      handleClose();
    },
    onError: () => toast.error('Erro ao salvar'),
  });

  const baixarMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('lancamentos').update({
        status: 'pago',
        data_pagamento: format(new Date(), 'yyyy-MM-dd'),
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lancamentos'] });
      toast.success('Lançamento baixado com sucesso');
    },
    onError: () => toast.error('Erro ao baixar lançamento'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('lancamentos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lancamentos'] });
      toast.success('Lançamento excluído');
      setDeleteTarget(null);
    },
    onError: () => toast.error('Erro ao excluir lançamento'),
  });

  const handleClose = () => {
    setOpen(false);
    setEditing(null);
    form.reset({
      descricao: '', valor: 0, data_emissao: new Date(), data_vencimento: new Date(),
      conta_bancaria_id: '', forma_pagamento_id: '', centro_custo_id: '', plano_id: '', observacoes: '',
    });
  };

  const handleEdit = (item: Lancamento) => {
    setEditing(item);
    form.reset({
      descricao: item.descricao,
      valor: item.valor,
      data_emissao: new Date(item.data_emissao + 'T00:00:00'),
      data_vencimento: new Date(item.data_vencimento + 'T00:00:00'),
      conta_bancaria_id: item.conta_bancaria_id || '',
      forma_pagamento_id: item.forma_pagamento_id || '',
      centro_custo_id: item.centro_custo_id || '',
      plano_id: (tipo === 'receber' ? item.plano_receita_id : item.plano_despesa_id) || '',
      observacoes: item.observacoes || '',
    });
    setOpen(true);
  };

  const filtered = items
    .filter((i) => statusFilter === 'todos' || i.status === statusFilter)
    .filter((i) => i.descricao.toLowerCase().includes(search.toLowerCase()));

  const getRelatedName = (id: string | null, list: { id: string; nome: string }[]) => {
    if (!id) return null;
    return list.find((x) => x.id === id)?.nome || null;
  };

  return (
    <div className="space-y-6">
      {(title || subtitle) && (
        <div>
          {title && <h1 className="text-2xl font-bold tracking-tight">{title}</h1>}
          {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por descrição..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="vencido">Vencido</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Novo
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead>Centro Custo</TableHead>
                <TableHead className="w-[120px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Nenhum lançamento encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => {
                  const planoId = tipo === 'receber' ? item.plano_receita_id : item.plano_despesa_id;
                  const plano = planoContas.find((p) => p.id === planoId);
                  const sc = statusConfig[item.status] || statusConfig.pendente;
                  const contaNome = getRelatedName(item.conta_bancaria_id, contasBancarias);
                  const ccNome = getRelatedName(item.centro_custo_id, centrosCusto);
                  const fpNome = getRelatedName(item.forma_pagamento_id, formasPagamento);
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">{item.descricao}</TableCell>
                      <TableCell>{formatBRL(item.valor)}</TableCell>
                      <TableCell>{formatDate(item.data_vencimento)}</TableCell>
                      <TableCell>
                        <Badge variant={sc.variant}>{sc.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                        {plano ? `${plano.categoria} > ${plano.subcategoria}` : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {contaNome ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="truncate block max-w-[100px]">{contaNome}</span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{contaNome}</p>
                              {fpNome && <p className="text-xs">Pgto: {fpNome}</p>}
                            </TooltipContent>
                          </Tooltip>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {ccNome || '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} title="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {item.status === 'pendente' && (
                            <Button variant="ghost" size="icon" onClick={() => baixarMutation.mutate(item.id)} title="Baixar (marcar como pago)">
                              <CheckCircle className="h-4 w-4 text-primary" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(item)} title="Excluir">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lançamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o lançamento "{deleteTarget?.descricao}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create/Edit dialog */}
      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar' : 'Novo'} Lançamento</DialogTitle>
            <DialogDescription>
              {editing ? 'Atualize os dados do lançamento.' : 'Preencha os dados do novo lançamento.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4">
              <FormField control={form.control} name="descricao" render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl><Input placeholder="Descrição do lançamento" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="valor" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor (R$)</FormLabel>
                    <FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="plano_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tipo === 'receber' ? 'Plano de Receita' : 'Plano de Despesa'} *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {planoContas.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.categoria} &gt; {p.subcategoria}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="data_emissao" render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data Emissão</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "dd/MM/yyyy") : "Selecione"}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} locale={ptBR} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="data_vencimento" render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data Vencimento</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "dd/MM/yyyy") : "Selecione"}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} locale={ptBR} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField control={form.control} name="conta_bancaria_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conta Bancária</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {contasBancarias.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="forma_pagamento_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Forma Pgto</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {formasPagamento.map((f) => (
                          <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="centro_custo_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Centro Custo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {centrosCusto.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="observacoes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl><Textarea placeholder="Observações opcionais..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
