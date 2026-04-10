import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Shield, Pencil, Trash2, Settings2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

const MODULOS = [
  {
    modulo: 'financeiro',
    funcionalidades: ['dashboard', 'lancamentos', 'contas_bancarias', 'plano_contas', 'centros_custo', 'formas_pagamento', 'transferencias', 'fluxo_caixa', 'dre', 'metas'],
  },
  {
    modulo: 'compras',
    funcionalidades: ['dashboard', 'fornecedores', 'catalogo', 'solicitacoes', 'cotacoes', 'pedidos'],
  },
  {
    modulo: 'rdo',
    funcionalidades: ['dashboard', 'obras', 'funcionarios', 'equipamentos', 'rdo_form', 'relatorios'],
  },
  {
    modulo: 'admin',
    funcionalidades: ['empresas', 'usuarios', 'perfis', 'configuracoes'],
  },
];

const ACOES = ['visualizar', 'criar', 'editar', 'excluir', 'aprovar'] as const;

export default function Perfis() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPerfil, setEditingPerfil] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [permDialogPerfil, setPermDialogPerfil] = useState<any>(null);
  const [perfilNome, setPerfilNome] = useState('');
  const [perfilDescricao, setPerfilDescricao] = useState('');
  const [perfilEmpresaId, setPerfilEmpresaId] = useState<string>('');

  const { data: perfis = [], isLoading } = useQuery({
    queryKey: ['admin-perfis'],
    queryFn: async () => {
      const { data, error } = await supabase.from('perfis').select('*, empresas(nome)').order('nome');
      if (error) throw error;
      return data;
    },
  });

  const { data: empresas = [] } = useQuery({
    queryKey: ['all-empresas-perfis'],
    queryFn: async () => {
      const { data, error } = await supabase.from('empresas').select('id, nome').eq('ativa', true).order('nome');
      if (error) throw error;
      return data;
    },
  });

  const { data: permissoes = [] } = useQuery({
    queryKey: ['perfil-permissoes', permDialogPerfil?.id],
    queryFn: async () => {
      if (!permDialogPerfil) return [];
      const { data, error } = await supabase.from('perfil_permissoes').select('*').eq('perfil_id', permDialogPerfil.id);
      if (error) throw error;
      return data;
    },
    enabled: !!permDialogPerfil,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        nome: perfilNome,
        descricao: perfilDescricao || null,
        empresa_id: perfilEmpresaId && perfilEmpresaId !== 'all' ? perfilEmpresaId : null,
      };
      if (editingPerfil) {
        const { error } = await supabase.from('perfis').update(payload).eq('id', editingPerfil.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('perfis').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-perfis'] });
      toast.success(editingPerfil ? 'Perfil atualizado!' : 'Perfil criado!');
      closeDialog();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Delete permissoes first
      await supabase.from('perfil_permissoes').delete().eq('perfil_id', id);
      await supabase.from('usuario_perfis').delete().eq('perfil_id', id);
      const { error } = await supabase.from('perfis').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-perfis'] });
      toast.success('Perfil excluído!');
      setDeleteTarget(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const togglePermMutation = useMutation({
    mutationFn: async ({ modulo, funcionalidade, acao, value }: { modulo: string; funcionalidade: string; acao: string; value: boolean }) => {
      if (!permDialogPerfil) return;
      const existing = permissoes.find((p: any) => p.modulo === modulo && p.funcionalidade === funcionalidade);

      if (existing) {
        const updatePayload: Record<string, boolean> = {};
        updatePayload[acao] = value;
        const { error } = await (supabase.from('perfil_permissoes').update(updatePayload as any).eq('id', existing.id));
        if (error) throw error;
      } else {
        const row: any = {
          perfil_id: permDialogPerfil.id,
          modulo,
          funcionalidade,
          visualizar: false,
          criar: false,
          editar: false,
          excluir: false,
          aprovar: false,
          [acao]: value,
        };
        const { error } = await supabase.from('perfil_permissoes').insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perfil-permissoes', permDialogPerfil?.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const getPermValue = (modulo: string, funcionalidade: string, acao: string) => {
    const p = permissoes.find((p: any) => p.modulo === modulo && p.funcionalidade === funcionalidade);
    return p ? !!(p as any)[acao] : false;
  };

  const openCreate = () => {
    setEditingPerfil(null);
    setPerfilNome('');
    setPerfilDescricao('');
    setPerfilEmpresaId('');
    setDialogOpen(true);
  };

  const openEdit = (perfil: any) => {
    setEditingPerfil(perfil);
    setPerfilNome(perfil.nome);
    setPerfilDescricao(perfil.descricao || '');
    setPerfilEmpresaId(perfil.empresa_id || '');
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingPerfil(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Perfis de Acesso</h1>
          <p className="text-muted-foreground">Gerencie os perfis e permissões do sistema</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Novo Perfil
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="w-[140px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {perfis.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        <span className="font-medium">{p.nome}</span>
                      </div>
                    </TableCell>
                    <TableCell>{p.descricao || '—'}</TableCell>
                    <TableCell>{p.empresas?.nome || 'Todas'}</TableCell>
                    <TableCell>
                      <Badge variant={p.sistema ? 'secondary' : 'outline'}>
                        {p.sistema ? 'Sistema' : 'Customizado'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setPermDialogPerfil(p)} title="Permissões">
                          <Settings2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {!p.sistema && (
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(p)} title="Excluir">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {perfis.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhum perfil encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPerfil ? 'Editar Perfil' : 'Novo Perfil'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={perfilNome} onChange={(e) => setPerfilNome(e.target.value)} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Input value={perfilDescricao} onChange={(e) => setPerfilDescricao(e.target.value)} />
            </div>
            <div>
              <Label>Empresa (opcional)</Label>
              <Select value={perfilEmpresaId} onValueChange={setPerfilEmpresaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as empresas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as empresas</SelectItem>
                  {empresas.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !perfilNome}>
              {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir perfil "{deleteTarget?.nome}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. Todos os vínculos de usuários com este perfil serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permissions Dialog */}
      <Dialog open={!!permDialogPerfil} onOpenChange={(open) => !open && setPermDialogPerfil(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Permissões — {permDialogPerfil?.nome}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue={MODULOS[0].modulo}>
            <TabsList className="w-full justify-start">
              {MODULOS.map((m) => (
                <TabsTrigger key={m.modulo} value={m.modulo} className="capitalize">
                  {m.modulo}
                </TabsTrigger>
              ))}
            </TabsList>
            {MODULOS.map((m) => (
              <TabsContent key={m.modulo} value={m.modulo}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Funcionalidade</TableHead>
                      {ACOES.map((a) => (
                        <TableHead key={a} className="text-center capitalize w-[90px]">{a}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {m.funcionalidades.map((f) => (
                      <TableRow key={f}>
                        <TableCell className="capitalize font-medium">{f.replace(/_/g, ' ')}</TableCell>
                        {ACOES.map((a) => (
                          <TableCell key={a} className="text-center">
                            <Checkbox
                              checked={getPermValue(m.modulo, f, a)}
                              onCheckedChange={(checked) =>
                                togglePermMutation.mutate({ modulo: m.modulo, funcionalidade: f, acao: a, value: !!checked })
                              }
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
            ))}
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
