import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEmpresa } from '@/hooks/useEmpresa';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Plus, Pencil, Trash2, CalendarIcon, Target } from 'lucide-react';
import { toast } from 'sonner';

const schema = z.object({
  tipo: z.enum(['receita', 'despesa']),
  categoria: z.string().min(1, 'Categoria é obrigatória'),
  periodo_inicio: z.date({ required_error: 'Data início é obrigatória' }),
  periodo_fim: z.date({ required_error: 'Data fim é obrigatória' }),
  valor_meta: z.coerce.number().positive('Valor deve ser positivo'),
  descricao: z.string().optional().or(z.literal('')),
});
type FormData = z.infer<typeof schema>;

type Meta = {
  id: string;
  empresa_id: string;
  tipo: string;
  categoria: string;
  periodo_inicio: string;
  periodo_fim: string;
  valor_meta: number;
  descricao: string | null;
};

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const formatDate = (d: string) => {
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

export default function Metas() {
  const { empresaAtiva } = useEmpresa();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Meta | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Meta | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { tipo: 'receita', categoria: '', periodo_inicio: startOfMonth(new Date()), periodo_fim: endOfMonth(new Date()), valor_meta: 0, descricao: '' },
  });

  const { data: metas = [], isLoading } = useQuery({
    queryKey: ['metas_financeiras', empresaAtiva?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('metas_financeiras')
        .select('*')
        .eq('empresa_id', empresaAtiva!.id)
        .order('periodo_inicio', { ascending: false });
      if (error) throw error;
      return data as Meta[];
    },
    enabled: !!empresaAtiva,
  });

  const { data: lancamentos = [] } = useQuery({
    queryKey: ['lancamentos-metas', empresaAtiva?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lancamentos')
        .select('tipo, valor, status, data_vencimento, plano_despesa_id, plano_receita_id')
        .eq('empresa_id', empresaAtiva!.id)
        .neq('status', 'cancelado');
      if (error) throw error;
      return data;
    },
    enabled: !!empresaAtiva,
  });

  const { data: planoDespesas = [] } = useQuery({
    queryKey: ['plano_despesas', empresaAtiva?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('plano_despesas').select('id, categoria, subcategoria').eq('empresa_id', empresaAtiva!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!empresaAtiva,
  });

  const { data: planoReceitas = [] } = useQuery({
    queryKey: ['plano_receitas', empresaAtiva?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('plano_receitas').select('id, categoria, subcategoria').eq('empresa_id', empresaAtiva!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!empresaAtiva,
  });

  const categorias = useMemo(() => {
    const tipoAtual = form.watch('tipo');
    const plano = tipoAtual === 'receita' ? planoReceitas : planoDespesas;
    return [...new Set(plano.map((p) => p.categoria))].sort();
  }, [form.watch('tipo'), planoReceitas, planoDespesas]);

  const getRealizadoPorMeta = (meta: Meta): number => {
    const plano = meta.tipo === 'receita' ? planoReceitas : planoDespesas;
    const idsCategoria = plano.filter((p) => p.categoria === meta.categoria).map((p) => p.id);
    const fk = meta.tipo === 'receita' ? 'plano_receita_id' : 'plano_despesa_id';
    const tipoLanc = meta.tipo === 'receita' ? 'receber' : 'pagar';

    return lancamentos
      .filter((l) => {
        if (l.tipo !== tipoLanc) return false;
        const planoId = (l as Record<string, unknown>)[fk] as string | null;
        if (!planoId || !idsCategoria.includes(planoId)) return false;
        return l.data_vencimento >= meta.periodo_inicio && l.data_vencimento <= meta.periodo_fim;
      })
      .reduce((sum, l) => sum + l.valor, 0);
  };

  const saveMutation = useMutation({
    mutationFn: async (values: FormData) => {
      const payload = {
        tipo: values.tipo,
        categoria: values.categoria,
        periodo_inicio: format(values.periodo_inicio, 'yyyy-MM-dd'),
        periodo_fim: format(values.periodo_fim, 'yyyy-MM-dd'),
        valor_meta: values.valor_meta,
        descricao: values.descricao || null,
      };
      if (editing) {
        const { error } = await supabase.from('metas_financeiras').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('metas_financeiras').insert({ ...payload, empresa_id: empresaAtiva!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metas_financeiras'] });
      toast.success(editing ? 'Meta atualizada' : 'Meta criada');
      handleClose();
    },
    onError: () => toast.error('Erro ao salvar meta'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('metas_financeiras').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metas_financeiras'] });
      toast.success('Meta excluída');
      setDeleteTarget(null);
    },
    onError: () => toast.error('Erro ao excluir'),
  });

  const handleClose = () => {
    setOpen(false);
    setEditing(null);
    form.reset({ tipo: 'receita', categoria: '', periodo_inicio: startOfMonth(new Date()), periodo_fim: endOfMonth(new Date()), valor_meta: 0, descricao: '' });
  };

  const handleEdit = (item: Meta) => {
    setEditing(item);
    form.reset({
      tipo: item.tipo as 'receita' | 'despesa',
      categoria: item.categoria,
      periodo_inicio: new Date(item.periodo_inicio + 'T00:00:00'),
      periodo_fim: new Date(item.periodo_fim + 'T00:00:00'),
      valor_meta: item.valor_meta,
      descricao: item.descricao || '',
    });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Metas Financeiras</h1>
        <p className="text-muted-foreground">Defina e acompanhe metas financeiras da empresa.</p>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nova Meta
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : metas.length === 0 ? (
        <Card>
          <CardContent className="text-center text-muted-foreground py-12">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Nenhuma meta financeira definida.</p>
            <p className="text-sm">Crie metas para acompanhar receitas e despesas por categoria.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {metas.map((meta) => {
            const realizado = getRealizadoPorMeta(meta);
            const pct = meta.valor_meta > 0 ? Math.min((realizado / meta.valor_meta) * 100, 100) : 0;
            const isReceita = meta.tipo === 'receita';
            return (
              <Card key={meta.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Badge variant={isReceita ? 'default' : 'destructive'} className="text-xs">
                        {isReceita ? 'Receita' : 'Despesa'}
                      </Badge>
                      {meta.categoria}
                    </CardTitle>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(meta)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(meta)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(meta.periodo_inicio)} — {formatDate(meta.periodo_fim)}
                  </p>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Realizado: <strong>{formatBRL(realizado)}</strong></span>
                    <span>Meta: <strong>{formatBRL(meta.valor_meta)}</strong></span>
                  </div>
                  <Progress value={pct} className="h-2" />
                  <p className="text-xs text-right text-muted-foreground">{pct.toFixed(1)}% atingido</p>
                  {meta.descricao && <p className="text-xs text-muted-foreground mt-1">{meta.descricao}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir meta</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar' : 'Nova'} Meta</DialogTitle>
            <DialogDescription>Defina uma meta financeira por categoria e período.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="tipo" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="receita">Receita</SelectItem>
                        <SelectItem value="despesa">Despesa</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="categoria" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {categorias.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="periodo_inicio" render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Início *</FormLabel>
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
                <FormField control={form.control} name="periodo_fim" render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fim *</FormLabel>
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
              <FormField control={form.control} name="valor_meta" render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor da Meta (R$) *</FormLabel>
                  <FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="descricao" render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl><Textarea placeholder="Opcional..." {...field} /></FormControl>
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
