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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Plus, Pencil, Search } from 'lucide-react';
import { toast } from 'sonner';

const schema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(100),
});
type FormData = z.infer<typeof schema>;
type FormaPagamento = { id: string; empresa_id: string; nome: string; ativa: boolean };

export default function FormasPagamento() {
  const { empresaAtiva } = useEmpresa();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FormaPagamento | null>(null);
  const [search, setSearch] = useState('');

  const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { nome: '' } });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['formas_pagamento', empresaAtiva?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('formas_pagamento')
        .select('*')
        .eq('empresa_id', empresaAtiva!.id)
        .order('nome');
      if (error) throw error;
      return data as FormaPagamento[];
    },
    enabled: !!empresaAtiva,
  });

  const saveMutation = useMutation({
    mutationFn: async (values: FormData) => {
      if (editing) {
        const { error } = await supabase.from('formas_pagamento').update(values).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('formas_pagamento').insert({ ...values, empresa_id: empresaAtiva!.id } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formas_pagamento'] });
      toast.success(editing ? 'Atualizado' : 'Criado com sucesso');
      handleClose();
    },
    onError: () => toast.error('Erro ao salvar'),
  });

  const toggleMutation = useMutation({
    mutationFn: async (item: FormaPagamento) => {
      const { error } = await supabase.from('formas_pagamento').update({ ativa: !item.ativa }).eq('id', item.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['formas_pagamento'] }),
    onError: () => toast.error('Erro ao alterar status'),
  });

  const handleClose = () => { setOpen(false); setEditing(null); form.reset({ nome: '' }); };
  const handleEdit = (item: FormaPagamento) => { setEditing(item); form.reset({ nome: item.nome }); setOpen(true); };

  const filtered = items.filter((i) => i.nome.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Formas de Pagamento</h1>
        <p className="text-muted-foreground">Gerencie as formas de pagamento da empresa</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nova Forma
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Nenhum registro</TableCell></TableRow>
              ) : filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.nome}</TableCell>
                  <TableCell>
                    <Badge variant={item.ativa ? 'default' : 'secondary'} className="cursor-pointer" onClick={() => toggleMutation.mutate(item)}>
                      {item.ativa ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}><Pencil className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Nova'} Forma de Pagamento</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4">
              <FormField control={form.control} name="nome" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl><Input placeholder="Ex: PIX" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
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
