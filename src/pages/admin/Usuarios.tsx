import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function Usuarios() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Edit state
  const [editUser, setEditUser] = useState<any>(null);
  const [editNome, setEditNome] = useState('');
  const [editCargo, setEditCargo] = useState('');
  const [editMatricula, setEditMatricula] = useState('');
  const [selectedEmpresas, setSelectedEmpresas] = useState<string[]>([]);
  const [selectedPerfil, setSelectedPerfil] = useState<string>('');

  // Create state
  const [createOpen, setCreateOpen] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createNome, setCreateNome] = useState('');
  const [createCargo, setCreateCargo] = useState('');
  const [createMatricula, setCreateMatricula] = useState('');
  const [createPerfil, setCreatePerfil] = useState('');
  const [createEmpresas, setCreateEmpresas] = useState<string[]>([]);

  const isSelf = editUser?.id === user?.id;

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('nome');
      if (error) throw error;
      return data;
    },
  });

  const { data: empresas = [] } = useQuery({
    queryKey: ['all-empresas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('empresas').select('id, nome').order('nome');
      if (error) throw error;
      return data;
    },
  });

  const { data: perfis = [] } = useQuery({
    queryKey: ['all-perfis'],
    queryFn: async () => {
      const { data, error } = await supabase.from('perfis').select('id, nome').order('nome');
      if (error) throw error;
      return data;
    },
  });

  const adminPerfilId = useMemo(
    () => perfis.find((p: any) => p.nome?.toLowerCase() === 'administrador')?.id || '',
    [perfis]
  );

  const { data: userEmpresas = [] } = useQuery({
    queryKey: ['usuario-empresas', editUser?.id],
    queryFn: async () => {
      if (!editUser) return [];
      const { data, error } = await supabase.from('usuario_empresas').select('empresa_id').eq('user_id', editUser.id);
      if (error) throw error;
      return data.map((d: any) => d.empresa_id);
    },
    enabled: !!editUser,
  });

  const { data: userPerfil } = useQuery({
    queryKey: ['usuario-perfil', editUser?.id],
    queryFn: async () => {
      if (!editUser) return null;
      const { data, error } = await supabase.from('usuario_perfis').select('perfil_id').eq('user_id', editUser.id).maybeSingle();
      if (error) throw error;
      return data?.perfil_id || '';
    },
    enabled: !!editUser,
  });

  const openEdit = (profile: any) => {
    setEditUser(profile);
    setEditNome(profile.nome || '');
    setEditCargo(profile.cargo || '');
    setEditMatricula(profile.matricula || '');
    setSelectedEmpresas([]);
    setSelectedPerfil('');
  };

  useEffect(() => {
    if (editUser && userEmpresas.length > 0) {
      setSelectedEmpresas(userEmpresas);
    }
  }, [editUser, userEmpresas]);

  useEffect(() => {
    if (editUser && userPerfil) {
      setSelectedPerfil(userPerfil);
    }
  }, [editUser, userPerfil]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!editUser) return;

      if (isSelf) {
        if (selectedPerfil !== adminPerfilId) {
          throw new Error('Você não pode remover seu próprio perfil de Administrador');
        }
        if (selectedEmpresas.length === 0) {
          throw new Error('Você não pode ficar sem nenhuma empresa vinculada');
        }
      }

      if (!selectedPerfil) throw new Error('Selecione um perfil de acesso');
      if (selectedEmpresas.length === 0) throw new Error('Selecione ao menos uma empresa');

      const { error } = await supabase.from('profiles').update({
        nome: editNome || null,
        cargo: editCargo || null,
        matricula: editMatricula || null,
      }).eq('id', editUser.id);
      if (error) throw error;

      // Sync empresas diff
      const currentEmpresas = userEmpresas as string[];
      const toAddEmpresas = selectedEmpresas.filter((id) => !currentEmpresas.includes(id));
      const toRemoveEmpresas = currentEmpresas.filter((id) => !selectedEmpresas.includes(id));

      if (toRemoveEmpresas.length > 0) {
        const { error: delErr } = await supabase.from('usuario_empresas').delete().eq('user_id', editUser.id).in('empresa_id', toRemoveEmpresas);
        if (delErr) throw delErr;
      }
      if (toAddEmpresas.length > 0) {
        const rows = toAddEmpresas.map((empresa_id) => ({ user_id: editUser.id, empresa_id }));
        const { error: insErr } = await supabase.from('usuario_empresas').insert(rows);
        if (insErr) throw insErr;
      }

      // Sync perfil
      const currentPerfil = (userPerfil as string) || '';
      if (selectedPerfil !== currentPerfil) {
        if (currentPerfil) {
          await supabase.from('usuario_perfis').delete().eq('user_id', editUser.id);
        }
        if (selectedPerfil) {
          const { error: pErr } = await supabase.from('usuario_perfis').insert({ user_id: editUser.id, perfil_id: selectedPerfil });
          if (pErr) throw pErr;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      queryClient.invalidateQueries({ queryKey: ['isAdmin'] });
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
      toast.success('Usuário atualizado!');
      closeEditDialog();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!createEmail || !createPassword || !createNome || !createPerfil || createEmpresas.length === 0) {
        throw new Error('Preencha todos os campos obrigatórios');
      }
      if (createPassword.length < 6) {
        throw new Error('Senha deve ter no mínimo 6 caracteres');
      }

      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: createEmail,
          password: createPassword,
          nome: createNome,
          cargo: createCargo || null,
          matricula: createMatricula || null,
          perfil_id: createPerfil,
          empresa_ids: createEmpresas,
        },
      });

      if (error) throw new Error(error.message || 'Erro ao criar usuário');
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      toast.success('Usuário criado com sucesso!');
      closeCreateDialog();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      if (id === user?.id && !ativo) {
        throw new Error('Você não pode desativar seu próprio usuário');
      }
      const { error } = await supabase.from('profiles').update({ ativo }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-profiles'] }),
    onError: (e: any) => toast.error(e.message),
  });

  const closeEditDialog = () => {
    setEditUser(null);
    setSelectedEmpresas([]);
    setSelectedPerfil('');
  };

  const closeCreateDialog = () => {
    setCreateOpen(false);
    setCreateEmail('');
    setCreatePassword('');
    setCreateNome('');
    setCreateCargo('');
    setCreateMatricula('');
    setCreatePerfil('');
    setCreateEmpresas([]);
  };

  const toggleEmpresa = (empresaId: string, list: string[], setter: (v: string[]) => void, blockEmpty = false) => {
    if (blockEmpty && list.includes(empresaId) && list.length === 1) {
      toast.error('Você não pode ficar sem nenhuma empresa vinculada');
      return;
    }
    setter(list.includes(empresaId) ? list.filter((id) => id !== empresaId) : [...list, empresaId]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>
          <p className="text-muted-foreground">Gerencie os usuários do sistema</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Novo Usuário
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
                  <TableHead>Usuário</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Matrícula</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {p.nome ? p.nome.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() : '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{p.nome || '—'}</span>
                          {p.id === user?.id && (
                            <Badge variant="outline" className="text-xs">Você</Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{p.cargo || '—'}</TableCell>
                    <TableCell>{p.matricula || '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={p.ativo}
                          disabled={p.id === user?.id}
                          onCheckedChange={(checked) => toggleMutation.mutate({ id: p.id, ativo: checked })}
                        />
                        <Badge variant={p.ativo ? 'default' : 'secondary'}>
                          {p.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {profiles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Editar Usuário
              {isSelf && <Badge variant="outline" className="ml-2 text-xs">Você</Badge>}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={editNome} onChange={(e) => setEditNome(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cargo</Label>
                <Input value={editCargo} onChange={(e) => setEditCargo(e.target.value)} />
              </div>
              <div>
                <Label>Matrícula</Label>
                <Input value={editMatricula} onChange={(e) => setEditMatricula(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Perfil de Acesso</Label>
              <Select value={selectedPerfil} onValueChange={setSelectedPerfil} disabled={isSelf && selectedPerfil === adminPerfilId}>
                <SelectTrigger><SelectValue placeholder="Selecione um perfil" /></SelectTrigger>
                <SelectContent>
                  {perfis.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isSelf && <p className="text-xs text-muted-foreground mt-1">Você não pode alterar seu próprio perfil de Administrador</p>}
            </div>
            <div>
              <Label>Empresas Vinculadas</Label>
              <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto mt-1">
                {empresas.map((e: any) => (
                  <label key={e.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={selectedEmpresas.includes(e.id)}
                      onCheckedChange={() => toggleEmpresa(e.id, selectedEmpresas, setSelectedEmpresas, isSelf)}
                    />
                    <span className="text-sm">{e.nome}</span>
                  </label>
                ))}
                {empresas.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma empresa</p>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => !open && closeCreateDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Email *</Label>
              <Input type="email" value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} placeholder="usuario@email.com" />
            </div>
            <div>
              <Label>Senha *</Label>
              <Input type="password" value={createPassword} onChange={(e) => setCreatePassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
            </div>
            <div>
              <Label>Nome *</Label>
              <Input value={createNome} onChange={(e) => setCreateNome(e.target.value)} placeholder="Nome completo" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cargo</Label>
                <Input value={createCargo} onChange={(e) => setCreateCargo(e.target.value)} />
              </div>
              <div>
                <Label>Matrícula</Label>
                <Input value={createMatricula} onChange={(e) => setCreateMatricula(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Perfil de Acesso *</Label>
              <Select value={createPerfil} onValueChange={setCreatePerfil}>
                <SelectTrigger><SelectValue placeholder="Selecione um perfil" /></SelectTrigger>
                <SelectContent>
                  {perfis.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Empresas Vinculadas *</Label>
              <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto mt-1">
                {empresas.map((e: any) => (
                  <label key={e.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={createEmpresas.includes(e.id)}
                      onCheckedChange={() => toggleEmpresa(e.id, createEmpresas, setCreateEmpresas)}
                    />
                    <span className="text-sm">{e.nome}</span>
                  </label>
                ))}
                {empresas.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma empresa</p>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeCreateDialog}>Cancelar</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
