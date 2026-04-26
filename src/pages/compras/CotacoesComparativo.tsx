import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, CheckCircle, Award, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const formatBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pendente: 'outline',
  aprovada: 'default',
  rejeitada: 'destructive',
};

export default function CotacoesComparativo() {
  const { solicitacaoId } = useParams<{ solicitacaoId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isAdmin, canApprove } = usePermissions();
  const canApproveCompras = isAdmin || canApprove('compras', 'cotacoes');

  const { data: sol } = useQuery({
    queryKey: ['sc_compare', solicitacaoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('solicitacoes_compra')
        .select('id, numero, status, justificativa')
        .eq('id', solicitacaoId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!solicitacaoId,
  });

  const { data: itensSC = [] } = useQuery({
    queryKey: ['sc_itens_compare', solicitacaoId],
    queryFn: async () => {
      const { data } = await supabase
        .from('solicitacao_itens')
        .select('id, descricao, quantidade, unidade')
        .eq('solicitacao_id', solicitacaoId!);
      return data || [];
    },
    enabled: !!solicitacaoId,
  });

  const { data: cotacoes = [] } = useQuery({
    queryKey: ['cotacoes_compare', solicitacaoId],
    queryFn: async () => {
      const { data } = await supabase
        .from('cotacoes')
        .select('id, numero, status, valor_total, condicao_pagamento, prazo_entrega, fornecedores(razao_social), pedidos_compra(id, numero, status), cotacao_itens(id, solicitacao_item_id, quantidade, valor_unitario, valor_total)')
        .eq('solicitacao_id', solicitacaoId!)
        .order('numero');
      return data || [];
    },
    enabled: !!solicitacaoId,
  });

  const aprovarMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('aprovar_cotacao', { _cotacao_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cotacoes_compare'] });
      qc.invalidateQueries({ queryKey: ['cotacoes'] });
      toast.success('Cotação aprovada (concorrentes recusadas)');
    },
    onError: (e: any) => toast.error(e?.message || 'Erro ao aprovar'),
  });

  // Map de item da cotação por (cotacao_id, solicitacao_item_id)
  const cellMap = useMemo(() => {
    const m = new Map<string, { quantidade: number; valor_unitario: number; valor_total: number }>();
    cotacoes.forEach((c: any) => {
      (c.cotacao_itens || []).forEach((it: any) => {
        m.set(`${c.id}|${it.solicitacao_item_id}`, {
          quantidade: Number(it.quantidade),
          valor_unitario: Number(it.valor_unitario),
          valor_total: Number(it.valor_total),
        });
      });
    });
    return m;
  }, [cotacoes]);

  // Vencedor por linha (menor unitário > 0)
  const lineWinners = useMemo(() => {
    const w: Record<string, string | null> = {};
    itensSC.forEach((item: any) => {
      let bestCotId: string | null = null;
      let bestVal = Infinity;
      cotacoes.forEach((c: any) => {
        const cell = cellMap.get(`${c.id}|${item.id}`);
        if (cell && cell.valor_unitario > 0 && cell.valor_unitario < bestVal) {
          bestVal = cell.valor_unitario;
          bestCotId = c.id;
        }
      });
      w[item.id] = bestCotId;
    });
    return w;
  }, [itensSC, cotacoes, cellMap]);

  // Vencedor geral (menor valor total entre cotações com itens)
  const overallWinnerId = useMemo(() => {
    let id: string | null = null;
    let best = Infinity;
    cotacoes.forEach((c: any) => {
      const total = Number(c.valor_total);
      if ((c.cotacao_itens || []).length > 0 && total > 0 && total < best) {
        best = total;
        id = c.id;
      }
    });
    return id;
  }, [cotacoes]);

  const hasApproved = cotacoes.some((c: any) => c.status === 'aprovada');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Comparativo de Cotações</h1>
          <p className="text-muted-foreground">SC-{sol?.numero} {sol?.justificativa ? `— ${sol.justificativa}` : ''}</p>
        </div>
      </div>

      {cotacoes.length === 0 ? (
        <div className="rounded-md border p-8 text-center text-muted-foreground">
          Nenhuma cotação cadastrada para esta solicitação.
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[220px]">Item</TableHead>
                <TableHead className="text-right w-[80px]">Qtd</TableHead>
                <TableHead className="w-[60px]">Un</TableHead>
                {cotacoes.map((c: any) => (
                  <TableHead key={c.id} className="min-w-[180px] text-center">
                    <div className="space-y-1">
                      <div className="font-semibold flex items-center justify-center gap-1">
                        COT-{c.numero}
                        {overallWinnerId === c.id && !hasApproved && (
                          <Award className="h-4 w-4 text-primary" aria-label="Menor preço total" />
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{c.fornecedores?.razao_social}</div>
                      <Badge variant={statusVariant[c.status] || 'outline'}>{c.status}</Badge>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {itensSC.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium text-sm">{item.descricao}</TableCell>
                  <TableCell className="text-right text-sm">{Number(item.quantidade)}</TableCell>
                  <TableCell className="text-sm">{item.unidade}</TableCell>
                  {cotacoes.map((c: any) => {
                    const cell = cellMap.get(`${c.id}|${item.id}`);
                    const isWinner = lineWinners[item.id] === c.id;
                    return (
                      <TableCell key={c.id} className={cn('text-center text-sm', isWinner && 'bg-primary/10')}>
                        {cell ? (
                          <div>
                            <div className={cn('font-medium', isWinner && 'text-primary')}>{formatBRL(cell.valor_unitario)}</div>
                            <div className="text-xs text-muted-foreground">{formatBRL(cell.valor_total)}</div>
                          </div>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}

              <TableRow className="bg-muted/30">
                <TableCell colSpan={3} className="font-semibold">Total da Cotação</TableCell>
                {cotacoes.map((c: any) => (
                  <TableCell key={c.id} className={cn('text-center font-bold', overallWinnerId === c.id && !hasApproved && 'text-primary')}>
                    {formatBRL(Number(c.valor_total))}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell colSpan={3} className="text-sm text-muted-foreground">Condição de Pagamento</TableCell>
                {cotacoes.map((c: any) => (
                  <TableCell key={c.id} className="text-center text-sm">{c.condicao_pagamento || '—'}</TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell colSpan={3} className="text-sm text-muted-foreground">Prazo de Entrega</TableCell>
                {cotacoes.map((c: any) => (
                  <TableCell key={c.id} className="text-center text-sm">{c.prazo_entrega || '—'}</TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell colSpan={3} className="text-sm text-muted-foreground">Pedido</TableCell>
                {cotacoes.map((c: any) => {
                  const ped = (c.pedidos_compra || []).find((p: any) => p.status !== 'cancelado');
                  return (
                    <TableCell key={c.id} className="text-center text-sm">
                      {ped ? <Badge variant="default">PED-{ped.numero}</Badge> : '—'}
                    </TableCell>
                  );
                })}
              </TableRow>
              <TableRow>
                <TableCell colSpan={3}></TableCell>
                {cotacoes.map((c: any) => (
                  <TableCell key={c.id} className="text-center">
                    {c.status === 'pendente' && canApproveCompras && !hasApproved ? (
                      <Button size="sm" onClick={() => aprovarMutation.mutate(c.id)} disabled={aprovarMutation.isPending}>
                        <CheckCircle className="h-4 w-4 mr-1" /> Aprovar
                      </Button>
                    ) : c.status === 'aprovada' ? (
                      <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" /> Vencedora</Badge>
                    ) : null}
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
