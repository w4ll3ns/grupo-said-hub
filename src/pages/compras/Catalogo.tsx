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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Plus, Pencil, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const UNIDADES = ['un', 'kg', 'm', 'm²', 'm³', 'l', 'cx', 'pct', 'par', 'jg', 'vb'];

const schema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(200),
  descricao: z.string().max(500).optional().or(z.literal('')),
  unidade: z.string().min(1, 'Unidade é obrigatória'),
  categoria: z.string().max(100).optional().or(z.literal('')),
});
type FormData = z.infer<typeof schema>;

type Produto = { id: string; empresa_id: string; nome: string; descricao: string | null; unidade: string; categoria: string | null; ativo: boolean };

export default function Catalogo() {
  const { empresaAtiva } = useEmpresa();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Produto | null>(null);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Produto | null>(null);

  const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { nome: '', descricao: '', unidade: 'un', categoria: '' } });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['produtos', empresaAtiva?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('produtos').select('*').eq('empresa_id', empresaAtiva!.id).order('nome');
      if (error) throw error;
      return data as Produto[];
    },
    enabled: !!empresaAtiva,
  });

  const saveMutation = useMutation({
    mutationFn: async (values: FormData) => {
      const payload = { nome: values.nome, descricao: values.descricao || null, unidade: values.unidade, categoria: values.categoria || null };
      if (editing) {
        const { error } = await supabase.from('produtos').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('produtos').insert({ ...payload, empresa_id: empresaAtiva!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['produtos'] }); toast.success(editing ? 'Produto atualizado' : 'Produto criado'); handleClose(); },
    onError: () => toast.error('Erro ao salvar produto'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('produtos').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['produtos'] }); toast.success('Produto excluído'); setDeleteTarget(null); },
    onError: () => toast.error('Erro ao excluir'),
  });

  const handleClose = () => { setOpen(false); setEditing(null); form.reset({ nome: '', descricao: '', unidade: 'un', categoria: '' }); };
  const handleEdit = (item: Produto) => { setEditing(item); form.reset({ nome: item.nome, descricao: item.descricao || '', unidade: item.unidade, categoria: item.categoria || '' }); setOpen(true); };

  const filtered = items.filter((i) => i.nome.toLowerCase().includes(search.toLowerCase()) || (i.categoria || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Catálogo de Produtos</h1>
        <p className="text-muted-foreground">Gerencie produtos e materiais para solicitações de compra</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou categoria..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> Novo Produto</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum produto encontrado</TableCell></TableRow>
              ) : filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.nome}</TableCell>
                  <TableCell>{item.categoria || '—'}</TableCell>
                  <TableCell>{item.unidade}</TableCell>
                  <TableCell><Badge variant={item.ativo ? 'default' : 'secondary'}>{item.ativo ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(item)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir produto</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir "{deleteTarget?.nome}"?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Novo'} Produto</DialogTitle><DialogDescription>{editing ? 'Atualize os dados.' : 'Preencha os dados do produto.'}</DialogDescription></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4">
              <FormField control={form.control} name="nome" render={({ field }) => (
                <FormItem><FormLabel>Nome *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="unidade" render={({ field }) => (
                  <FormItem><FormLabel>Unidade *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="categoria" render={({ field }) => (
                  <FormItem><FormLabel>Categoria</FormLabel><FormControl><Input placeholder="Ex: Material elétrico" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="descricao" render={({ field }) => (
                <FormItem><FormLabel>Descrição</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
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
