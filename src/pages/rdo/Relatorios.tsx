import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEmpresa } from '@/hooks/useEmpresa';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Plus, Search, FileText, Trash2, Sun, Cloud, CloudRain, CloudLightning, FileDown } from 'lucide-react';
import { fetchAndGenerateRDOPdf } from '@/utils/fetchAndGenerateRDOPdf';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import RDOForm from './RDOForm';

type RDO = {
  id: string; empresa_id: string; obra_id: string; data: string;
  clima_manha: string; clima_tarde: string;
  condicao_manha: string; condicao_tarde: string;
  observacoes: string | null; numero: number | null;
  status: string; created_at: string;
  obras?: { nome: string };
};

const climaIcons: Record<string, React.ReactNode> = {
  ensolarado: <Sun className="h-4 w-4 text-amber-500" />,
  nublado: <Cloud className="h-4 w-4 text-muted-foreground" />,
  chuvoso: <CloudRain className="h-4 w-4 text-blue-500" />,
  tempestade: <CloudLightning className="h-4 w-4 text-destructive" />,
};

export default function Relatorios() {
  const { empresaAtiva } = useEmpresa();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['rdos', empresaAtiva?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rdos')
        .select('*, obras(nome)')
        .eq('empresa_id', empresaAtiva!.id)
        .order('data', { ascending: false });
      if (error) throw error;
      return data as RDO[];
    },
    enabled: !!empresaAtiva,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('rdos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rdos'] });
      toast.success('RDO excluído');
    },
    onError: () => toast.error('Erro ao excluir'),
  });

  const handleOpen = (id?: string) => { setEditingId(id || null); setOpen(true); };
  const handleClose = () => { setOpen(false); setEditingId(null); queryClient.invalidateQueries({ queryKey: ['rdos'] }); };

  const filtered = items.filter((i) =>
    i.obras?.nome?.toLowerCase().includes(search.toLowerCase()) ||
    format(new Date(i.data + 'T00:00:00'), 'dd/MM/yyyy').includes(search) ||
    (i.numero && String(i.numero).includes(search))
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Relatórios Diários</h1>
        <p className="text-sm text-muted-foreground">Registros diários de obra (RDO)</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por obra, data ou nº..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => handleOpen()} size="sm">
          <Plus className="mr-1 h-4 w-4" /> Novo RDO
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nenhum RDO encontrado</div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((item) => (
            <Card key={item.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleOpen(item.id)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {item.numero && <span className="text-xs font-mono text-muted-foreground">#{item.numero}</span>}
                        <p className="font-semibold truncate">{item.obras?.nome || 'Obra'}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(item.data + 'T00:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="flex flex-col items-center gap-0.5">
                      {climaIcons[item.clima_manha]}
                      {climaIcons[item.clima_tarde]}
                    </div>
                    <Badge variant={item.status === 'finalizado' ? 'default' : 'secondary'}>
                      {item.status === 'finalizado' ? 'Finalizado' : 'Rascunho'}
                    </Badge>
                  </div>
                </div>
                <div className="flex justify-end mt-2 gap-1">
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); fetchAndGenerateRDOPdf(item.id); }}>
                    <FileDown className="h-4 w-4 mr-1" /> PDF
                  </Button>
                  {item.status === 'rascunho' && (
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(item.id); }}>
                      <Trash2 className="h-4 w-4 mr-1" /> Excluir
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
          <RDOForm rdoId={editingId} onClose={handleClose} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
