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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Plus, Pencil, Trash2, CalendarIcon, ArrowRightLeft } from 'lucide-react';
import { toast } from 'sonner';

const schema = z.object({
  conta_origem_id: z.string().min(1, 'Conta origem é obrigatória'),
  conta_destino_id: z.string().min(1, 'Conta destino é obrigatória'),
  valor: z.coerce.number().positive('Valor deve ser positivo'),
  data: z.date({ required_error: 'Data é obrigatória' }),
  descricao: z.string().optional().or(z.literal('')),
}).refine((d) => d.conta_origem_id !== d.conta_destino_id, {
  message: 'Conta origem e destino devem ser diferentes',
  path: ['conta_destino_id'],
});

type FormData = z.infer<typeof schema>;

type Transferencia = {
  id: string;
  empresa_id: string;
  conta_origem_id: string;
  conta_destino_id: string;
  valor: number;
  data: string;
  descricao: string | null;
  created_at: string;
};

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const formatDate = (d: string) => {
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

export default function Transferencias() {
  const { empresaAtiva } = useEmpresa();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Transferencia | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transferencia | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { conta_origem_id: '', conta_destino_id: '', valor: 0, data: new Date(), descricao: '' },
  });

  const { data: contas = [] } = useQuery({
    queryKey: ['contas_bancarias', empresaAtiva?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('contas_bancarias').select('id, nome').eq('empresa_id', empresaAtiva!.id).eq('ativa', true).order('nome');
      if (error) throw error;
      return data;
    },
    enabled: !!empresaAtiva,
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['transferencias', empresaAtiva?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transferencias')
        .select('*')
        .eq('empresa_id', empresaAtiva!.id)
        .order('data', { ascending: false });
      if (error) throw error;
      return data as Transferencia[];
    },
    enabled: !!empresaAtiva,
  });

  const saveMutation = useMutation({
    mutationFn: async (values: FormData) => {
      const payload = {
        conta_origem_id: values.conta_origem_id,
        conta_destino_id: values.conta_destino_id,
        valor: values.valor,
        data: format(values.data, 'yyyy-MM-dd'),
        descricao: values.descricao || null,
      };
      if (editing) {
        const { error } = await supabase.from('transferencias').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('transferencias').insert({ ...payload, empresa_id: empresaAtiva!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transferencias'] });
      toast.success(editing ? 'Transferência atualizada' : 'Transferência registrada');
      handleClose();
    },
    onError: () => toast.error('Erro ao salvar transferência'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transferencias').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transferencias'] });
      toast.success('Transferência excluída');
      setDeleteTarget(null);
    },
    onError: () => toast.error('Erro ao excluir'),
  });

  const handleClose = () => {
    setOpen(false);
    setEditing(null);
    form.reset({ conta_origem_id: '', conta_destino_id: '', valor: 0, data: new Date(), descricao: '' });
  };

  const handleEdit = (item: Transferencia) => {
    setEditing(item);
    form.reset({
      conta_origem_id: item.conta_origem_id,
      conta_destino_id: item.conta_destino_id,
      valor: item.valor,
      data: new Date(item.data + 'T00:00:00'),
      descricao: item.descricao || '',
    });
    setOpen(true);
  };

  const getContaNome = (id: string) => contas.find((c) => c.id === id)?.nome || '—';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Transferências</h1>
        <p className="text-muted-foreground">Gerencie transferências entre contas bancárias.</p>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nova Transferência
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
                <TableHead>Data</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead className="w-[40px] text-center">→</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhuma transferência registrada
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{formatDate(item.data)}</TableCell>
                    <TableCell className="font-medium">{getContaNome(item.conta_origem_id)}</TableCell>
                    <TableCell className="text-center"><ArrowRightLeft className="h-4 w-4 text-muted-foreground mx-auto" /></TableCell>
                    <TableCell className="font-medium">{getContaNome(item.conta_destino_id)}</TableCell>
                    <TableCell>{formatBRL(item.valor)}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">{item.descricao || '—'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(item)} title="Excluir">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir transferência</AlertDialogTitle>
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
            <DialogTitle>{editing ? 'Editar' : 'Nova'} Transferência</DialogTitle>
            <DialogDescription>Preencha os dados da transferência entre contas.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4">
              <FormField control={form.control} name="conta_origem_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Conta Origem *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {contas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="conta_destino_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Conta Destino *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {contas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="valor" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor (R$) *</FormLabel>
                    <FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="data" render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data *</FormLabel>
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
