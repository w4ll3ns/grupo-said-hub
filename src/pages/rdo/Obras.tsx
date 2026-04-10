import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEmpresa } from '@/hooks/useEmpresa';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, HardHat, MapPin, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';

const schema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  endereco: z.string().optional().or(z.literal('')),
  responsavel: z.string().min(1, 'Responsável é obrigatório'),
  contrato: z.string().optional().or(z.literal('')),
  contratante: z.string().optional().or(z.literal('')),
  local: z.string().optional().or(z.literal('')),
  prazo_contratual_dias: z.string().min(1, 'Prazo contratual é obrigatório'),
  status: z.string().default('em_andamento'),
  data_inicio: z.string().min(1, 'Data de início é obrigatória'),
  data_previsao: z.string().optional().or(z.literal('')),
});
type FormData = z.infer<typeof schema>;

type Obra = {
  id: string; empresa_id: string; nome: string; endereco: string | null;
  responsavel: string | null; status: string; data_inicio: string | null;
  data_previsao: string | null; contrato: string | null; contratante: string | null;
  local: string | null; prazo_contratual_dias: number | null; created_at: string;
};

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  em_andamento: { label: 'Em Andamento', variant: 'default' },
  concluida: { label: 'Concluída', variant: 'secondary' },
  paralisada: { label: 'Paralisada', variant: 'destructive' },
};

export default function Obras() {
  const { empresaAtiva } = useEmpresa();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Obra | null>(null);
  const [search, setSearch] = useState('');

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { nome: '', endereco: '', responsavel: '', status: 'em_andamento', data_inicio: '', data_previsao: '', contrato: '', contratante: '', local: '', prazo_contratual_dias: '' },
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['obras', empresaAtiva?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('obras').select('*').eq('empresa_id', empresaAtiva!.id).order('nome');
      if (error) throw error;
      return data as Obra[];
    },
    enabled: !!empresaAtiva,
  });

  const saveMutation = useMutation({
    mutationFn: async (values: FormData) => {
      const payload = {
        nome: values.nome,
        endereco: values.endereco || null,
        responsavel: values.responsavel || null,
        contrato: values.contrato || null,
        contratante: values.contratante || null,
        local: values.local || null,
        prazo_contratual_dias: values.prazo_contratual_dias ? parseInt(values.prazo_contratual_dias) : null,
        status: values.status,
        data_inicio: values.data_inicio || null,
        data_previsao: values.data_previsao || null,
      };
      if (editing) {
        const { error } = await supabase.from('obras').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('obras').insert({ ...payload, empresa_id: empresaAtiva!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obras'] });
      toast.success(editing ? 'Obra atualizada' : 'Obra criada com sucesso');
      handleClose();
    },
    onError: () => toast.error('Erro ao salvar'),
  });

  const handleClose = () => {
    setOpen(false); setEditing(null);
    form.reset({ nome: '', endereco: '', responsavel: '', status: 'em_andamento', data_inicio: '', data_previsao: '', contrato: '', contratante: '', local: '', prazo_contratual_dias: '' });
  };

  const handleEdit = (item: Obra) => {
    setEditing(item);
    form.reset({
      nome: item.nome, endereco: item.endereco || '', responsavel: item.responsavel || '',
      status: item.status, data_inicio: item.data_inicio || '', data_previsao: item.data_previsao || '',
      contrato: item.contrato || '', contratante: item.contratante || '', local: item.local || '',
      prazo_contratual_dias: item.prazo_contratual_dias ? String(item.prazo_contratual_dias) : '',
    });
    setOpen(true);
  };

  const getPrazos = (item: Obra) => {
    if (!item.data_inicio || !item.prazo_contratual_dias) return null;
    const inicio = new Date(item.data_inicio + 'T00:00:00');
    const decorrido = differenceInDays(new Date(), inicio);
    const aVencer = item.prazo_contratual_dias - decorrido;
    return { decorrido: Math.max(0, decorrido), aVencer: Math.max(0, aVencer) };
  };

  const filtered = items.filter((i) => i.nome.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Obras</h1>
        <p className="text-sm text-muted-foreground">Gerencie as obras da empresa</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar obra..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => setOpen(true)} size="sm"><Plus className="mr-1 h-4 w-4" /> Nova</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nenhuma obra cadastrada</div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((item) => {
            const st = statusMap[item.status] || statusMap.em_andamento;
            const prazos = getPrazos(item);
            return (
              <Card key={item.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleEdit(item)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <HardHat className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{item.nome}</p>
                        {(item.local || item.endereco) && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 shrink-0" /> <span className="truncate">{item.local || item.endereco}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant={st.variant} className="shrink-0">{st.label}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground">
                    {item.contratante && <span>Contratante: {item.contratante}</span>}
                    {item.contrato && <span>Contrato: {item.contrato}</span>}
                    {item.data_inicio && (
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {format(new Date(item.data_inicio + 'T00:00:00'), 'dd/MM/yyyy')}</span>
                    )}
                    {prazos && (
                      <span>Prazo: {prazos.decorrido}d decorridos / {prazos.aVencer}d a vencer</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Nova'} Obra</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4">
              <FormField control={form.control} name="nome" render={({ field }) => (
                <FormItem><FormLabel>Nome *</FormLabel><FormControl><Input placeholder="Nome da obra" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="contrato" render={({ field }) => (
                  <FormItem><FormLabel>Contrato</FormLabel><FormControl><Input placeholder="Nº contrato" {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="contratante" render={({ field }) => (
                  <FormItem><FormLabel>Contratante</FormLabel><FormControl><Input placeholder="Nome" {...field} /></FormControl></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="local" render={({ field }) => (
                <FormItem><FormLabel>Local</FormLabel><FormControl><Input placeholder="Local da obra" {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="endereco" render={({ field }) => (
                <FormItem><FormLabel>Endereço</FormLabel><FormControl><Input placeholder="Endereço" {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="responsavel" render={({ field }) => (
                <FormItem><FormLabel>Responsável</FormLabel><FormControl><Input placeholder="Nome do responsável" {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem><FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="em_andamento">Em Andamento</SelectItem>
                      <SelectItem value="concluida">Concluída</SelectItem>
                      <SelectItem value="paralisada">Paralisada</SelectItem>
                    </SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="data_inicio" render={({ field }) => (
                  <FormItem><FormLabel>Início</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="data_previsao" render={({ field }) => (
                  <FormItem><FormLabel>Previsão</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="prazo_contratual_dias" render={({ field }) => (
                <FormItem><FormLabel>Prazo Contratual (dias)</FormLabel><FormControl><Input type="number" placeholder="Ex: 365" {...field} /></FormControl></FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
                <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Salvando...' : 'Salvar'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
