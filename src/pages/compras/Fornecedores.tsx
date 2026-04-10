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

const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const schema = z.object({
  razao_social: z.string().min(1, 'Razão social é obrigatória').max(200),
  nome_fantasia: z.string().max(200).optional().or(z.literal('')),
  cnpj_cpf: z.string().max(20).optional().or(z.literal('')),
  email: z.string().email('Email inválido').max(255).optional().or(z.literal('')),
  telefone: z.string().max(20).optional().or(z.literal('')),
  endereco: z.string().max(300).optional().or(z.literal('')),
  cidade: z.string().max(100).optional().or(z.literal('')),
  estado: z.string().max(2).optional().or(z.literal('')),
  observacoes: z.string().max(1000).optional().or(z.literal('')),
});
type FormData = z.infer<typeof schema>;

type Fornecedor = {
  id: string; empresa_id: string; razao_social: string; nome_fantasia: string | null;
  cnpj_cpf: string | null; email: string | null; telefone: string | null;
  endereco: string | null; cidade: string | null; estado: string | null;
  observacoes: string | null; ativo: boolean;
};

export default function Fornecedores() {
  const { empresaAtiva } = useEmpresa();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Fornecedor | null>(null);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Fornecedor | null>(null);

  const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { razao_social: '', nome_fantasia: '', cnpj_cpf: '', email: '', telefone: '', endereco: '', cidade: '', estado: '', observacoes: '' } });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['fornecedores', empresaAtiva?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('fornecedores').select('*').eq('empresa_id', empresaAtiva!.id).order('razao_social');
      if (error) throw error;
      return data as Fornecedor[];
    },
    enabled: !!empresaAtiva,
  });

  const saveMutation = useMutation({
    mutationFn: async (values: FormData) => {
      const payload = {
        razao_social: values.razao_social,
        nome_fantasia: values.nome_fantasia || null,
        cnpj_cpf: values.cnpj_cpf || null,
        email: values.email || null,
        telefone: values.telefone || null,
        endereco: values.endereco || null,
        cidade: values.cidade || null,
        estado: values.estado || null,
        observacoes: values.observacoes || null,
      };
      if (editing) {
        const { error } = await supabase.from('fornecedores').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('fornecedores').insert({ ...payload, empresa_id: empresaAtiva!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fornecedores'] }); toast.success(editing ? 'Fornecedor atualizado' : 'Fornecedor criado'); handleClose(); },
    onError: () => toast.error('Erro ao salvar fornecedor'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('fornecedores').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fornecedores'] }); toast.success('Fornecedor excluído'); setDeleteTarget(null); },
    onError: () => toast.error('Erro ao excluir. Verifique se não há cotações ou pedidos vinculados.'),
  });

  const handleClose = () => { setOpen(false); setEditing(null); form.reset({ razao_social: '', nome_fantasia: '', cnpj_cpf: '', email: '', telefone: '', endereco: '', cidade: '', estado: '', observacoes: '' }); };

  const handleEdit = (item: Fornecedor) => {
    setEditing(item);
    form.reset({ razao_social: item.razao_social, nome_fantasia: item.nome_fantasia || '', cnpj_cpf: item.cnpj_cpf || '', email: item.email || '', telefone: item.telefone || '', endereco: item.endereco || '', cidade: item.cidade || '', estado: item.estado || '', observacoes: item.observacoes || '' });
    setOpen(true);
  };

  const filtered = items.filter((i) => i.razao_social.toLowerCase().includes(search.toLowerCase()) || (i.cnpj_cpf || '').includes(search));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Fornecedores</h1>
        <p className="text-muted-foreground">Gerencie o cadastro de fornecedores</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por razão social ou CNPJ..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> Novo Fornecedor</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Razão Social</TableHead>
                <TableHead>CNPJ/CPF</TableHead>
                <TableHead>Cidade/UF</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum fornecedor encontrado</TableCell></TableRow>
              ) : filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">{item.razao_social}</TableCell>
                  <TableCell>{item.cnpj_cpf || '—'}</TableCell>
                  <TableCell>{item.cidade && item.estado ? `${item.cidade}/${item.estado}` : item.cidade || item.estado || '—'}</TableCell>
                  <TableCell>{item.telefone || '—'}</TableCell>
                  <TableCell className="max-w-[150px] truncate">{item.email || '—'}</TableCell>
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
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir fornecedor</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir "{deleteTarget?.razao_social}"?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar' : 'Novo'} Fornecedor</DialogTitle>
            <DialogDescription>{editing ? 'Atualize os dados do fornecedor.' : 'Preencha os dados do novo fornecedor.'}</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4">
              <FormField control={form.control} name="razao_social" render={({ field }) => (
                <FormItem><FormLabel>Razão Social *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="nome_fantasia" render={({ field }) => (
                  <FormItem><FormLabel>Nome Fantasia</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="cnpj_cpf" render={({ field }) => (
                  <FormItem><FormLabel>CNPJ/CPF</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="telefone" render={({ field }) => (
                  <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="endereco" render={({ field }) => (
                <FormItem><FormLabel>Endereço</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="cidade" render={({ field }) => (
                  <FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="estado" render={({ field }) => (
                  <FormItem><FormLabel>Estado</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger></FormControl>
                      <SelectContent>{ESTADOS.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="observacoes" render={({ field }) => (
                <FormItem><FormLabel>Observações</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
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
