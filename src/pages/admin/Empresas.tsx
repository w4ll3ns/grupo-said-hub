import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/hooks/useEmpresa';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Plus, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const empresaSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  cnpj: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefone: z.string().optional(),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  cep: z.string().optional(),
});

type EmpresaForm = z.infer<typeof empresaSchema>;

export default function Empresas() {
  const { empresaAtiva, setEmpresaAtiva } = useEmpresa();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<any>(null);

  const form = useForm<EmpresaForm>({
    resolver: zodResolver(empresaSchema),
    defaultValues: { nome: '', cnpj: '', email: '', telefone: '', endereco: '', cidade: '', estado: '', cep: '' },
  });

  const { data: empresas = [], isLoading } = useQuery({
    queryKey: ['admin-empresas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('empresas').select('*').order('nome');
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: EmpresaForm) => {
      const payload = {
        nome: values.nome,
        cnpj: values.cnpj || null,
        email: values.email || null,
        telefone: values.telefone || null,
        endereco: values.endereco || null,
        cidade: values.cidade || null,
        estado: values.estado || null,
        cep: values.cep || null,
      };

      if (editingEmpresa) {
        const { error } = await supabase.from('empresas').update(payload).eq('id', editingEmpresa.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('empresas').insert(payload).select().single();
        if (error) throw error;
        // Link admin to new empresa
        if (user) {
          await supabase.from('usuario_empresas').insert({ user_id: user.id, empresa_id: data.id });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-empresas'] });
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
      toast.success(editingEmpresa ? 'Empresa atualizada!' : 'Empresa criada!');
      closeDialog();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, ativa }: { id: string; ativa: boolean }) => {
      const { error } = await supabase.from('empresas').update({ ativa }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-empresas'] });
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditingEmpresa(null);
    form.reset({ nome: '', cnpj: '', email: '', telefone: '', endereco: '', cidade: '', estado: '', cep: '' });
    setDialogOpen(true);
  };

  const openEdit = (empresa: any) => {
    setEditingEmpresa(empresa);
    form.reset({
      nome: empresa.nome || '',
      cnpj: empresa.cnpj || '',
      email: empresa.email || '',
      telefone: empresa.telefone || '',
      endereco: empresa.endereco || '',
      cidade: empresa.cidade || '',
      estado: empresa.estado || '',
      cep: empresa.cep || '',
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingEmpresa(null);
    form.reset();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Empresas</h1>
          <p className="text-muted-foreground">Gerencie as empresas do grupo</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Nova Empresa
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {empresas.map((empresa: any) => (
            <Card
              key={empresa.id}
              className={`cursor-pointer transition-all hover:shadow-md ${empresa.id === empresaAtiva?.id ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setEmpresaAtiva(empresa)}
            >
              <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base truncate">{empresa.nome}</CardTitle>
                  {empresa.cnpj && <p className="text-xs text-muted-foreground">{empresa.cnpj}</p>}
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <Switch
                    checked={empresa.ativa}
                    onCheckedChange={(checked) => toggleMutation.mutate({ id: empresa.id, ativa: checked })}
                  />
                  <Button variant="ghost" size="icon" onClick={() => openEdit(empresa)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {empresa.id === empresaAtiva?.id ? '✓ Empresa ativa selecionada' : 'Clique para selecionar'}
                  </p>
                  <Badge variant={empresa.ativa ? 'default' : 'secondary'}>
                    {empresa.ativa ? 'Ativa' : 'Inativa'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingEmpresa ? 'Editar Empresa' : 'Nova Empresa'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nome *</Label>
                <Input {...form.register('nome')} />
                {form.formState.errors.nome && <p className="text-xs text-destructive mt-1">{form.formState.errors.nome.message}</p>}
              </div>
              <div>
                <Label>CNPJ</Label>
                <Input {...form.register('cnpj')} />
              </div>
              <div>
                <Label>Email</Label>
                <Input {...form.register('email')} />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input {...form.register('telefone')} />
              </div>
              <div>
                <Label>CEP</Label>
                <Input {...form.register('cep')} />
              </div>
              <div className="col-span-2">
                <Label>Endereço</Label>
                <Input {...form.register('endereco')} />
              </div>
              <div>
                <Label>Cidade</Label>
                <Input {...form.register('cidade')} />
              </div>
              <div>
                <Label>Estado</Label>
                <Input {...form.register('estado')} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
