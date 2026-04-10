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
import { Plus, Search, Wrench } from 'lucide-react';
import { toast } from 'sonner';

const schema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  tipo: z.string().optional().or(z.literal('')),
});
type FormData = z.infer<typeof schema>;
type Equipamento = { id: string; empresa_id: string; nome: string; tipo: string | null; ativo: boolean };

export default function Equipamentos() {
  const { empresaAtiva } = useEmpresa();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Equipamento | null>(null);
  const [search, setSearch] = useState('');

  const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { nome: '', tipo: '' } });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['equipamentos', empresaAtiva?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('equipamentos').select('*').eq('empresa_id', empresaAtiva!.id).order('nome');
      if (error) throw error;
      return data as Equipamento[];
    },
    enabled: !!empresaAtiva,
  });

  const saveMutation = useMutation({
    mutationFn: async (values: FormData) => {
      const payload = { nome: values.nome, tipo: values.tipo || null };
      if (editing) {
        const { error } = await supabase.from('equipamentos').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('equipamentos').insert({ ...payload, empresa_id: empresaAtiva!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
      toast.success(editing ? 'Atualizado' : 'Criado com sucesso');
      handleClose();
    },
    onError: () => toast.error('Erro ao salvar'),
  });

  const toggleMutation = useMutation({
    mutationFn: async (item: Equipamento) => {
      const { error } = await supabase.from('equipamentos').update({ ativo: !item.ativo }).eq('id', item.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['equipamentos'] }),
    onError: () => toast.error('Erro ao alterar status'),
  });

  const handleClose = () => { setOpen(false); setEditing(null); form.reset({ nome: '', tipo: '' }); };
  const handleEdit = (item: Equipamento) => { setEditing(item); form.reset({ nome: item.nome, tipo: item.tipo || '' }); setOpen(true); };

  const filtered = items.filter((i) => i.nome.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Equipamentos</h1>
        <p className="text-sm text-muted-foreground">Máquinas e equipamentos disponíveis</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => setOpen(true)} size="sm"><Plus className="mr-1 h-4 w-4" /> Novo</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nenhum equipamento cadastrado</div>
      ) : (
        <div className="grid gap-2">
          {filtered.map((item) => (
            <Card key={item.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleEdit(item)}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Wrench className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{item.nome}</p>
                    {item.tipo && <p className="text-xs text-muted-foreground">{item.tipo}</p>}
                  </div>
                </div>
                <Badge
                  variant={item.ativo ? 'default' : 'secondary'}
                  className="cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); toggleMutation.mutate(item); }}
                >
                  {item.ativo ? 'Ativo' : 'Inativo'}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Novo'} Equipamento</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4">
              <FormField control={form.control} name="nome" render={({ field }) => (
                <FormItem><FormLabel>Nome</FormLabel><FormControl><Input placeholder="Ex: Betoneira 400L" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="tipo" render={({ field }) => (
                <FormItem><FormLabel>Tipo</FormLabel><FormControl><Input placeholder="Ex: Máquina, Veículo, Ferramenta" {...field} /></FormControl><FormMessage /></FormItem>
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
