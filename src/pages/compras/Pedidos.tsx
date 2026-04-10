import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEmpresa } from '@/hooks/useEmpresa';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Plus, Search, Package, Truck, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const formatBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const formatDate = (d: string) => { const [y, m, day] = d.split('-'); return `${day}/${m}/${y}`; };

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pendente: { label: 'Pendente', variant: 'outline' },
  enviado: { label: 'Enviado', variant: 'secondary' },
  parcial: { label: 'Entrega Parcial', variant: 'outline' },
  entregue: { label: 'Entregue', variant: 'default' },
  cancelado: { label: 'Cancelado', variant: 'destructive' },
};

export default function Pedidos() {
  const { empresaAtiva } = useEmpresa();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCotacao, setSelectedCotacao] = useState('');

  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ['pedidos_compra', empresaAtiva?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('pedidos_compra').select('*, fornecedores(razao_social), cotacoes(numero)').eq('empresa_id', empresaAtiva!.id).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!empresaAtiva,
  });

  const { data: cotacoesAprovadas = [] } = useQuery({
    queryKey: ['cotacoes_aprovadas', empresaAtiva?.id],
    queryFn: async () => {
      const { data } = await supabase.from('cotacoes').select('id, numero, fornecedor_id, valor_total, fornecedores(razao_social)').eq('empresa_id', empresaAtiva!.id).eq('status', 'aprovada').order('numero');
      return data || [];
    },
    enabled: !!empresaAtiva,
  });

  const gerarPedidoMutation = useMutation({
    mutationFn: async (cotacaoId: string) => {
      const cotacao = cotacoesAprovadas.find((c: any) => c.id === cotacaoId);
      if (!cotacao) throw new Error('Cotação não encontrada');
      const { error } = await supabase.from('pedidos_compra').insert({
        empresa_id: empresaAtiva!.id,
        cotacao_id: cotacaoId,
        fornecedor_id: (cotacao as any).fornecedor_id,
        valor_total: (cotacao as any).valor_total,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pedidos_compra'] }); qc.invalidateQueries({ queryKey: ['cotacoes_aprovadas'] }); toast.success('Pedido gerado com sucesso'); setOpen(false); setSelectedCotacao(''); },
    onError: () => toast.error('Erro ao gerar pedido'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('pedidos_compra').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pedidos_compra'] }); toast.success('Status atualizado'); },
    onError: () => toast.error('Erro ao atualizar'),
  });

  const filtered = pedidos.filter((p: any) =>
    `PED-${p.numero}`.toLowerCase().includes(search.toLowerCase()) ||
    (p.fornecedores?.razao_social || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pedidos de Compra</h1>
        <p className="text-muted-foreground">Gerencie pedidos gerados a partir de cotações aprovadas</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por número ou fornecedor..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => setOpen(true)} disabled={cotacoesAprovadas.length === 0}><Plus className="mr-2 h-4 w-4" /> Gerar Pedido</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Cotação</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead>Data Pedido</TableHead>
                <TableHead>Entrega Prevista</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[120px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum pedido encontrado</TableCell></TableRow>
              ) : filtered.map((p: any) => {
                const sc = statusConfig[p.status] || statusConfig.pendente;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">PED-{p.numero}</TableCell>
                    <TableCell>{p.cotacoes ? `COT-${p.cotacoes.numero}` : '—'}</TableCell>
                    <TableCell>{p.fornecedores?.razao_social}</TableCell>
                    <TableCell>{formatBRL(p.valor_total)}</TableCell>
                    <TableCell>{formatDate(p.data_pedido)}</TableCell>
                    <TableCell>{p.data_entrega_prevista ? formatDate(p.data_entrega_prevista) : '—'}</TableCell>
                    <TableCell><Badge variant={sc.variant}>{sc.label}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {p.status === 'pendente' && (
                          <Button variant="ghost" size="icon" onClick={() => updateStatusMutation.mutate({ id: p.id, status: 'enviado' })} title="Marcar como Enviado"><Truck className="h-4 w-4" /></Button>
                        )}
                        {p.status === 'enviado' && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => updateStatusMutation.mutate({ id: p.id, status: 'parcial' })} title="Entrega Parcial"><Package className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => updateStatusMutation.mutate({ id: p.id, status: 'entregue' })} title="Entregue"><CheckCircle className="h-4 w-4 text-primary" /></Button>
                          </>
                        )}
                        {p.status === 'parcial' && (
                          <Button variant="ghost" size="icon" onClick={() => updateStatusMutation.mutate({ id: p.id, status: 'entregue' })} title="Entregue"><CheckCircle className="h-4 w-4 text-primary" /></Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => { if (!v) { setOpen(false); setSelectedCotacao(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Gerar Pedido de Compra</DialogTitle><DialogDescription>Selecione uma cotação aprovada para gerar o pedido.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Cotação Aprovada *</label>
              <Select value={selectedCotacao} onValueChange={setSelectedCotacao}>
                <SelectTrigger><SelectValue placeholder="Selecione uma cotação" /></SelectTrigger>
                <SelectContent>
                  {cotacoesAprovadas.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>COT-{c.numero} — {c.fornecedores?.razao_social} — {formatBRL(c.valor_total)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); setSelectedCotacao(''); }}>Cancelar</Button>
            <Button disabled={!selectedCotacao || gerarPedidoMutation.isPending} onClick={() => gerarPedidoMutation.mutate(selectedCotacao)}>
              {gerarPedidoMutation.isPending ? 'Gerando...' : 'Gerar Pedido'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
