import { useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEmpresa } from '@/hooks/useEmpresa';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Search, Paperclip, Eye, Trash2, Upload, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { getSignedUrl } from '@/lib/storage';

const schema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(100),
  descricao: z.string().max(255).optional().or(z.literal('')),
});
type FormData = z.infer<typeof schema>;
type CentroCusto = { id: string; empresa_id: string; nome: string; descricao: string | null; ativo: boolean };
type Anexo = {
  id: string;
  centro_custo_id: string;
  empresa_id: string;
  nome_arquivo: string;
  path: string;
  tamanho_bytes: number | null;
  tipo_mime: string | null;
  descricao: string | null;
  created_at: string;
};

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_MIMES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

function formatBytes(b: number | null) {
  if (!b) return '—';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}

export default function CentrosCusto() {
  const { empresaAtiva } = useEmpresa();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CentroCusto | null>(null);
  const [search, setSearch] = useState('');
  const [anexosOf, setAnexosOf] = useState<CentroCusto | null>(null);

  const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { nome: '', descricao: '' } });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['centros_custo', empresaAtiva?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('centros_custo')
        .select('*')
        .eq('empresa_id', empresaAtiva!.id)
        .order('nome');
      if (error) throw error;
      return data as CentroCusto[];
    },
    enabled: !!empresaAtiva,
  });

  const { data: anexos = [] } = useQuery({
    queryKey: ['centro_custo_anexos', empresaAtiva?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('centro_custo_anexos')
        .select('*')
        .eq('empresa_id', empresaAtiva!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Anexo[];
    },
    enabled: !!empresaAtiva,
  });

  const anexosByCentro = useMemo(() => {
    const map = new Map<string, Anexo[]>();
    for (const a of anexos) {
      if (!map.has(a.centro_custo_id)) map.set(a.centro_custo_id, []);
      map.get(a.centro_custo_id)!.push(a);
    }
    return map;
  }, [anexos]);

  const saveMutation = useMutation({
    mutationFn: async (values: FormData) => {
      const payload = { nome: values.nome, descricao: values.descricao || null };
      if (editing) {
        const { error } = await supabase.from('centros_custo').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('centros_custo').insert({ ...payload, empresa_id: empresaAtiva!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['centros_custo'] });
      toast.success(editing ? 'Atualizado' : 'Criado com sucesso');
      handleClose();
    },
    onError: () => toast.error('Erro ao salvar'),
  });

  const toggleMutation = useMutation({
    mutationFn: async (item: CentroCusto) => {
      const { error } = await supabase.from('centros_custo').update({ ativo: !item.ativo }).eq('id', item.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['centros_custo'] }),
    onError: () => toast.error('Erro ao alterar status'),
  });

  const handleClose = () => { setOpen(false); setEditing(null); form.reset({ nome: '', descricao: '' }); };
  const handleEdit = (item: CentroCusto) => { setEditing(item); form.reset({ nome: item.nome, descricao: item.descricao || '' }); setOpen(true); };

  const filtered = items.filter((i) => i.nome.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Centros de Custo</h1>
        <p className="text-muted-foreground">Gerencie os centros de custo e anexe contratos relacionados</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Novo Centro
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
                <TableHead>Descrição</TableHead>
                <TableHead>Anexos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[120px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum registro</TableCell></TableRow>
              ) : filtered.map((item) => {
                const count = anexosByCentro.get(item.id)?.length ?? 0;
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.nome}</TableCell>
                    <TableCell>{item.descricao || '—'}</TableCell>
                    <TableCell>
                      {count > 0 ? (
                        <Badge variant="secondary" className="gap-1">
                          <Paperclip className="h-3 w-3" /> {count}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.ativo ? 'default' : 'secondary'} className="cursor-pointer" onClick={() => toggleMutation.mutate(item)}>
                        {item.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" title="Anexos" onClick={() => setAnexosOf(item)}>
                          <Paperclip className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Editar" onClick={() => handleEdit(item)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Novo'} Centro de Custo</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4">
              <FormField control={form.control} name="nome" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl><Input placeholder="Ex: Obra Alpha" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="descricao" render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl><Textarea placeholder="Descrição opcional" {...field} /></FormControl>
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

      <AnexosDialog
        centro={anexosOf}
        anexos={anexosOf ? anexosByCentro.get(anexosOf.id) ?? [] : []}
        onClose={() => setAnexosOf(null)}
      />
    </div>
  );
}

function AnexosDialog({
  centro,
  anexos,
  onClose,
}: {
  centro: CentroCusto | null;
  anexos: Anexo[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [descricao, setDescricao] = useState('');
  const [uploading, setUploading] = useState(false);
  const [toDelete, setToDelete] = useState<Anexo | null>(null);

  const reset = () => { setDescricao(''); if (fileRef.current) fileRef.current.value = ''; };

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      if (!centro) throw new Error('Sem centro');
      for (const f of files) {
        if (f.size > MAX_BYTES) throw new Error(`"${f.name}" excede 10 MB`);
        if (!ACCEPTED_MIMES.includes(f.type)) throw new Error(`"${f.name}" tem tipo não suportado`);
      }
      for (const f of files) {
        const ext = f.name.includes('.') ? f.name.split('.').pop() : 'bin';
        const id = crypto.randomUUID();
        const path = `${centro.empresa_id}/${centro.id}/${id}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('centro-custo-anexos')
          .upload(path, f, { contentType: f.type, upsert: false });
        if (upErr) throw upErr;
        const { error: insErr } = await supabase.from('centro_custo_anexos').insert({
          centro_custo_id: centro.id,
          empresa_id: centro.empresa_id,
          nome_arquivo: f.name,
          path,
          tamanho_bytes: f.size,
          tipo_mime: f.type,
          descricao: descricao || null,
        });
        if (insErr) {
          // tenta limpar arquivo em caso de falha no insert
          await supabase.storage.from('centro-custo-anexos').remove([path]);
          throw insErr;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['centro_custo_anexos'] });
      toast.success('Anexo(s) enviado(s)');
      reset();
    },
    onError: (err: Error) => toast.error(err.message || 'Erro ao enviar anexos'),
    onSettled: () => setUploading(false),
  });

  const deleteMutation = useMutation({
    mutationFn: async (anexo: Anexo) => {
      const { error: stErr } = await supabase.storage.from('centro-custo-anexos').remove([anexo.path]);
      if (stErr) console.warn('Falha ao remover do storage:', stErr.message);
      const { error } = await supabase.from('centro_custo_anexos').delete().eq('id', anexo.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['centro_custo_anexos'] });
      toast.success('Anexo removido');
      setToDelete(null);
    },
    onError: () => toast.error('Erro ao remover anexo'),
  });

  const handleFiles = () => {
    const files = fileRef.current?.files;
    if (!files || files.length === 0) {
      toast.error('Selecione ao menos um arquivo');
      return;
    }
    setUploading(true);
    uploadMutation.mutate(Array.from(files));
  };

  const handleView = async (anexo: Anexo) => {
    const url = await getSignedUrl('centro-custo-anexos', anexo.path);
    if (!url) {
      toast.error('Não foi possível gerar o link do arquivo');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <Dialog open={!!centro} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Anexos — {centro?.nome}</DialogTitle>
            <DialogDescription>
              Contratos e documentos relacionados a este centro de custo. PDF, JPG, PNG ou WEBP até 10 MB cada.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border p-3 space-y-3">
              <div className="text-sm font-medium">Adicionar arquivos</div>
              <Input
                ref={fileRef}
                type="file"
                multiple
                accept="application/pdf,image/png,image/jpeg,image/webp"
                disabled={uploading}
              />
              <Input
                placeholder="Descrição (opcional, aplicada a todos)"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                disabled={uploading}
              />
              <Button onClick={handleFiles} disabled={uploading} size="sm">
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? 'Enviando...' : 'Enviar'}
              </Button>
            </div>

            <div className="rounded-md border max-h-[320px] overflow-auto">
              {anexos.length === 0 ? (
                <div className="text-center text-muted-foreground py-8 text-sm">Nenhum anexo</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Arquivo</TableHead>
                      <TableHead>Tamanho</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {anexos.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>
                          <div className="flex items-start gap-2">
                            <FileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <div className="font-medium truncate">{a.nome_arquivo}</div>
                              {a.descricao && (
                                <div className="text-xs text-muted-foreground truncate">{a.descricao}</div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatBytes(a.tamanho_bytes)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(a.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" title="Visualizar" onClick={() => handleView(a)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" title="Excluir" onClick={() => setToDelete(a)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { reset(); onClose(); }}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir anexo?</AlertDialogTitle>
            <AlertDialogDescription>
              "{toDelete?.nome_arquivo}" será removido permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => toDelete && deleteMutation.mutate(toDelete)}
              disabled={deleteMutation.isPending}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
