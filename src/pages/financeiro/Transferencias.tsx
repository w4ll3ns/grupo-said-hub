import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Plus, CalendarIcon, ArrowRightLeft, Undo2 } from 'lucide-react';
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
  tipo: string;
  transferencia_original_id: string | null;
  created_by: string | null;
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
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [estornoTarget, setEstornoTarget] = useState<Transferencia | null>(null);
  const [estornoMotivo, setEstornoMotivo] = useState('');

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
      return (data || []) as Transferencia[];
    },
    enabled: !!empresaAtiva,
  });

  // Set de IDs que já foram estornados
  const idsEstornados = new Set(
    items
      .filter((t) => t.transferencia_original_id)
      .map((t) => t.transferencia_original_id as string)
  );

  const saveMutation = useMutation({
    mutationFn: async (values: FormData) => {
      const { data, error } = await supabase.rpc('criar_transferencia', {
        _empresa_id: empresaAtiva!.id,
        _conta_origem_id: values.conta_origem_id,
        _conta_destino_id: values.conta_destino_id,
        _valor: values.valor,
        _data: format(values.data, 'yyyy-MM-dd'),
        _descricao: values.descricao || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transferencias'] });
      qc.invalidateQueries({ queryKey: ['lancamentos'] });
      qc.invalidateQueries({ queryKey: ['vw_saldo_conta_atual'] });
      toast.success('Transferência realizada');
      handleClose();
    },
    onError: (err: any) => toast.error(err.message ?? 'Erro ao criar transferência'),
  });

  const estornarMutation = useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => {
      const { data, error } = await supabase.rpc('estornar_transferencia', {
        _transferencia_id: id,
        _motivo: motivo || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transferencias'] });
      qc.invalidateQueries({ queryKey: ['lancamentos'] });
      qc.invalidateQueries({ queryKey: ['vw_saldo_conta_atual'] });
      toast.success('Transferência estornada');
      setEstornoTarget(null);
      setEstornoMotivo('');
    },
    onError: (err: any) => toast.error(err.message ?? 'Erro ao estornar'),
  });

  const handleClose = () => {
    setOpen(false);
    form.reset({ conta_origem_id: '', conta_destino_id: '', valor: 0, data: new Date(), descricao: '' });
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
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-[80px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Nenhuma transferência registrada
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => {
                  const podeEstornar = item.tipo === 'normal' && !idsEstornados.has(item.id);
                  return (
                    <TableRow key={item.id}>
                      <TableCell>{formatDate(item.data)}</TableCell>
                      <TableCell className="font-medium">{getContaNome(item.conta_origem_id)}</TableCell>
                      <TableCell className="text-center"><ArrowRightLeft className="h-4 w-4 text-muted-foreground mx-auto" /></TableCell>
                      <TableCell className="font-medium">{getContaNome(item.conta_destino_id)}</TableCell>
                      <TableCell>{formatBRL(item.valor)}</TableCell>
                      <TableCell>
                        <Badge variant={item.tipo === 'estorno' ? 'destructive' : 'default'}>
                          {item.tipo === 'estorno' ? 'Estorno' : idsEstornados.has(item.id) ? 'Estornada' : 'Normal'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">{item.descricao || '—'}</TableCell>
                      <TableCell>
                        {podeEstornar && (
                          <Button variant="ghost" size="icon" onClick={() => setEstornoTarget(item)} title="Estornar">
                            <Undo2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog de estorno */}
      <AlertDialog open={!!estornoTarget} onOpenChange={(v) => { if (!v) { setEstornoTarget(null); setEstornoMotivo(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Estornar transferência</AlertDialogTitle>
            <AlertDialogDescription>
              Será criada uma transferência inversa de {estornoTarget ? formatBRL(estornoTarget.valor) : ''} para desfazer esta operação. Os lançamentos originais são preservados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium">Motivo (opcional)</label>
            <Textarea
              placeholder="Informe o motivo do estorno..."
              value={estornoMotivo}
              onChange={(e) => setEstornoMotivo(e.target.value)}
              className="mt-1"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => estornoTarget && estornarMutation.mutate({ id: estornoTarget.id, motivo: estornoMotivo })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={estornarMutation.isPending}
            >
              {estornarMutation.isPending ? 'Estornando...' : 'Confirmar Estorno'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de nova transferência */}
      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Transferência</DialogTitle>
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
                  {saveMutation.isPending ? 'Transferindo...' : 'Transferir'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
