import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEmpresa } from '@/hooks/useEmpresa';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Sun, Cloud, CloudRain, CloudLightning, Plus, Trash2, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface RDOFormProps {
  rdoId: string | null;
  onClose: () => void;
}

type StepKey = 'geral' | 'equipe' | 'equipamentos' | 'atividades' | 'resumo';

const steps: { key: StepKey; label: string }[] = [
  { key: 'geral', label: 'Dados Gerais' },
  { key: 'equipe', label: 'Equipe' },
  { key: 'equipamentos', label: 'Equipamentos' },
  { key: 'atividades', label: 'Atividades' },
  { key: 'resumo', label: 'Resumo' },
];

const climaOptions = [
  { value: 'ensolarado', label: 'Ensolarado', icon: Sun, color: 'text-amber-500 border-amber-500 bg-amber-50' },
  { value: 'nublado', label: 'Nublado', icon: Cloud, color: 'text-muted-foreground border-muted bg-muted/30' },
  { value: 'chuvoso', label: 'Chuvoso', icon: CloudRain, color: 'text-blue-500 border-blue-500 bg-blue-50' },
  { value: 'tempestade', label: 'Tempestade', icon: CloudLightning, color: 'text-destructive border-destructive bg-destructive/10' },
];

const condicaoOptions = [
  { value: 'normal', label: 'Normal' },
  { value: 'parcial', label: 'Parcial' },
  { value: 'paralisado', label: 'Paralisado' },
];

type FuncionarioRow = { id: string; nome: string; cargo: string | null; presente: boolean; horas: string; observacao: string };
type EquipamentoRow = { id: string; nome: string; tipo: string | null; selecionado: boolean; horas_uso: string; operacional: boolean; observacao: string };
type AtividadeRow = { id?: string; descricao: string; quantidade: string; unidade: string };

export default function RDOForm({ rdoId, onClose }: RDOFormProps) {
  const { empresaAtiva } = useEmpresa();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const isEditing = !!rdoId;

  // General data
  const [obraId, setObraId] = useState('');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [clima, setClima] = useState('ensolarado');
  const [condicao, setCondicao] = useState('normal');
  const [observacoes, setObservacoes] = useState('');

  // Team
  const [funcionarios, setFuncionarios] = useState<FuncionarioRow[]>([]);

  // Equipment
  const [equipamentos, setEquipamentos] = useState<EquipamentoRow[]>([]);

  // Activities
  const [atividades, setAtividades] = useState<AtividadeRow[]>([{ descricao: '', quantidade: '', unidade: '' }]);

  // Fetch obras
  const { data: obras = [] } = useQuery({
    queryKey: ['obras', empresaAtiva?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('obras').select('id, nome').eq('empresa_id', empresaAtiva!.id).eq('status', 'em_andamento').order('nome');
      if (error) throw error;
      return data;
    },
    enabled: !!empresaAtiva,
  });

  // Fetch funcionarios for company
  const { data: allFuncionarios = [] } = useQuery({
    queryKey: ['funcionarios', empresaAtiva?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('funcionarios').select('id, nome, cargo').eq('empresa_id', empresaAtiva!.id).eq('ativo', true).order('nome');
      if (error) throw error;
      return data;
    },
    enabled: !!empresaAtiva,
  });

  // Fetch equipamentos for company
  const { data: allEquipamentos = [] } = useQuery({
    queryKey: ['equipamentos', empresaAtiva?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('equipamentos').select('id, nome, tipo').eq('empresa_id', empresaAtiva!.id).eq('ativo', true).order('nome');
      if (error) throw error;
      return data;
    },
    enabled: !!empresaAtiva,
  });

  // Initialize lists when data loads
  useEffect(() => {
    if (!isEditing && allFuncionarios.length > 0 && funcionarios.length === 0) {
      setFuncionarios(allFuncionarios.map((f) => ({ id: f.id, nome: f.nome, cargo: f.cargo, presente: true, horas: '8', observacao: '' })));
    }
  }, [allFuncionarios, isEditing, funcionarios.length]);

  useEffect(() => {
    if (!isEditing && allEquipamentos.length > 0 && equipamentos.length === 0) {
      setEquipamentos(allEquipamentos.map((e) => ({ id: e.id, nome: e.nome, tipo: e.tipo, selecionado: false, horas_uso: '', operacional: true, observacao: '' })));
    }
  }, [allEquipamentos, isEditing, equipamentos.length]);

  // Load existing RDO
  useEffect(() => {
    if (!rdoId) return;
    const load = async () => {
      const { data: rdo } = await supabase.from('rdos').select('*').eq('id', rdoId).single();
      if (!rdo) return;
      setObraId(rdo.obra_id);
      setData(rdo.data);
      setClima(rdo.clima);
      setCondicao(rdo.condicao_trabalho);
      setObservacoes(rdo.observacoes || '');

      const { data: rdoFunc } = await supabase.from('rdo_funcionarios').select('*').eq('rdo_id', rdoId);
      if (rdoFunc && allFuncionarios.length > 0) {
        const map = new Map(rdoFunc.map((r) => [r.funcionario_id, r]));
        setFuncionarios(allFuncionarios.map((f) => {
          const existing = map.get(f.id);
          return {
            id: f.id, nome: f.nome, cargo: f.cargo,
            presente: existing ? existing.presente : false,
            horas: existing ? String(existing.horas || '8') : '8',
            observacao: existing?.observacao || '',
          };
        }));
      }

      const { data: rdoEquip } = await supabase.from('rdo_equipamentos').select('*').eq('rdo_id', rdoId);
      if (rdoEquip && allEquipamentos.length > 0) {
        const map = new Map(rdoEquip.map((r) => [r.equipamento_id, r]));
        setEquipamentos(allEquipamentos.map((e) => {
          const existing = map.get(e.id);
          return {
            id: e.id, nome: e.nome, tipo: e.tipo,
            selecionado: !!existing,
            horas_uso: existing ? String(existing.horas_uso || '') : '',
            operacional: existing ? existing.operacional : true,
            observacao: existing?.observacao || '',
          };
        }));
      }

      const { data: rdoAtiv } = await supabase.from('rdo_atividades').select('*').eq('rdo_id', rdoId);
      if (rdoAtiv && rdoAtiv.length > 0) {
        setAtividades(rdoAtiv.map((a) => ({
          id: a.id, descricao: a.descricao, quantidade: String(a.quantidade || ''), unidade: a.unidade || '',
        })));
      }
    };
    load();
  }, [rdoId, allFuncionarios, allEquipamentos]);

  const saveMutation = useMutation({
    mutationFn: async (finalizar: boolean) => {
      const rdoPayload = {
        empresa_id: empresaAtiva!.id,
        obra_id: obraId,
        data,
        clima,
        condicao_trabalho: condicao,
        observacoes: observacoes || null,
        status: finalizar ? 'finalizado' : 'rascunho',
      };

      let id = rdoId;
      if (isEditing) {
        const { error } = await supabase.from('rdos').update(rdoPayload).eq('id', rdoId);
        if (error) throw error;
      } else {
        const { data: created, error } = await supabase.from('rdos').insert(rdoPayload).select('id').single();
        if (error) throw error;
        id = created.id;
      }

      // Save funcionarios
      await supabase.from('rdo_funcionarios').delete().eq('rdo_id', id!);
      const funcRows = funcionarios
        .filter((f) => f.presente)
        .map((f) => ({
          rdo_id: id!,
          funcionario_id: f.id,
          presente: true,
          horas: f.horas ? parseFloat(f.horas) : null,
          observacao: f.observacao || null,
        }));
      if (funcRows.length > 0) {
        const { error } = await supabase.from('rdo_funcionarios').insert(funcRows);
        if (error) throw error;
      }

      // Save equipamentos
      await supabase.from('rdo_equipamentos').delete().eq('rdo_id', id!);
      const equipRows = equipamentos
        .filter((e) => e.selecionado)
        .map((e) => ({
          rdo_id: id!,
          equipamento_id: e.id,
          horas_uso: e.horas_uso ? parseFloat(e.horas_uso) : null,
          operacional: e.operacional,
          observacao: e.observacao || null,
        }));
      if (equipRows.length > 0) {
        const { error } = await supabase.from('rdo_equipamentos').insert(equipRows);
        if (error) throw error;
      }

      // Save atividades
      await supabase.from('rdo_atividades').delete().eq('rdo_id', id!);
      const ativRows = atividades
        .filter((a) => a.descricao.trim())
        .map((a) => ({
          rdo_id: id!,
          descricao: a.descricao,
          quantidade: a.quantidade ? parseFloat(a.quantidade) : null,
          unidade: a.unidade || null,
        }));
      if (ativRows.length > 0) {
        const { error } = await supabase.from('rdo_atividades').insert(ativRows);
        if (error) throw error;
      }
    },
    onSuccess: (_, finalizar) => {
      queryClient.invalidateQueries({ queryKey: ['rdos'] });
      toast.success(finalizar ? 'RDO finalizado!' : 'RDO salvo como rascunho');
      onClose();
    },
    onError: () => toast.error('Erro ao salvar RDO'),
  });

  const canAdvance = () => {
    if (step === 0) return !!obraId && !!data;
    return true;
  };

  const presentCount = funcionarios.filter((f) => f.presente).length;
  const selectedEquipCount = equipamentos.filter((e) => e.selecionado).length;
  const ativCount = atividades.filter((a) => a.descricao.trim()).length;

  return (
    <div className="flex flex-col">
      {/* Stepper */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        {steps.map((s, i) => (
          <button
            key={s.key}
            onClick={() => i <= step && setStep(i)}
            className={cn(
              'flex flex-col items-center gap-1 text-xs transition-colors',
              i === step ? 'text-primary font-semibold' : i < step ? 'text-primary/60' : 'text-muted-foreground'
            )}
          >
            <div className={cn(
              'h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors',
              i === step ? 'border-primary bg-primary text-primary-foreground' :
              i < step ? 'border-primary/60 bg-primary/10 text-primary' :
              'border-muted-foreground/30 text-muted-foreground'
            )}>
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className="hidden sm:block">{s.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 min-h-[300px]">
        {step === 0 && (
          <>
            <div className="space-y-3">
              <div>
                <Label>Obra *</Label>
                <Select value={obraId} onValueChange={setObraId}>
                  <SelectTrigger><SelectValue placeholder="Selecione a obra" /></SelectTrigger>
                  <SelectContent>
                    {obras.map((o) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data *</Label>
                <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
              </div>
              <div>
                <Label>Clima</Label>
                <div className="grid grid-cols-4 gap-2 mt-1">
                  {climaOptions.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setClima(c.value)}
                      className={cn(
                        'flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all',
                        clima === c.value ? c.color : 'border-border hover:border-primary/30'
                      )}
                    >
                      <c.icon className="h-6 w-6" />
                      <span className="text-[10px] font-medium">{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Condição de trabalho</Label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {condicaoOptions.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setCondicao(c.value)}
                      className={cn(
                        'py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all text-center',
                        condicao === c.value ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/30'
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Observações gerais..." rows={3} />
              </div>
            </div>
          </>
        )}

        {step === 1 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground mb-2">Marque os funcionários presentes e informe as horas trabalhadas</p>
            {funcionarios.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Cadastre funcionários primeiro</p>
            ) : (
              funcionarios.map((f, idx) => (
                <div key={f.id} className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                  f.presente ? 'border-primary/30 bg-primary/5' : 'border-border opacity-60'
                )}>
                  <Checkbox
                    checked={f.presente}
                    onCheckedChange={(checked) => {
                      const copy = [...funcionarios];
                      copy[idx].presente = !!checked;
                      setFuncionarios(copy);
                    }}
                    className="h-6 w-6"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{f.nome}</p>
                    {f.cargo && <p className="text-xs text-muted-foreground">{f.cargo}</p>}
                  </div>
                  {f.presente && (
                    <Input
                      type="number"
                      value={f.horas}
                      onChange={(e) => {
                        const copy = [...funcionarios];
                        copy[idx].horas = e.target.value;
                        setFuncionarios(copy);
                      }}
                      className="w-16 text-center"
                      placeholder="Hrs"
                      min="0"
                      max="24"
                      step="0.5"
                    />
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground mb-2">Selecione os equipamentos utilizados</p>
            {equipamentos.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Cadastre equipamentos primeiro</p>
            ) : (
              equipamentos.map((e, idx) => (
                <div key={e.id} className={cn(
                  'p-3 rounded-lg border transition-colors',
                  e.selecionado ? 'border-primary/30 bg-primary/5' : 'border-border'
                )}>
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={e.selecionado}
                      onCheckedChange={(checked) => {
                        const copy = [...equipamentos];
                        copy[idx].selecionado = !!checked;
                        setEquipamentos(copy);
                      }}
                      className="h-6 w-6"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{e.nome}</p>
                      {e.tipo && <p className="text-xs text-muted-foreground">{e.tipo}</p>}
                    </div>
                  </div>
                  {e.selecionado && (
                    <div className="flex items-center gap-3 mt-2 ml-9">
                      <Input
                        type="number"
                        value={e.horas_uso}
                        onChange={(ev) => {
                          const copy = [...equipamentos];
                          copy[idx].horas_uso = ev.target.value;
                          setEquipamentos(copy);
                        }}
                        className="w-20"
                        placeholder="Hrs"
                        min="0"
                        step="0.5"
                      />
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={e.operacional}
                          onCheckedChange={(checked) => {
                            const copy = [...equipamentos];
                            copy[idx].operacional = checked;
                            setEquipamentos(copy);
                          }}
                        />
                        <span className="text-xs">{e.operacional ? 'Operacional' : 'Parado'}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Descreva as atividades executadas no dia</p>
            {atividades.map((a, idx) => (
              <div key={idx} className="p-3 rounded-lg border space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    value={a.descricao}
                    onChange={(e) => {
                      const copy = [...atividades];
                      copy[idx].descricao = e.target.value;
                      setAtividades(copy);
                    }}
                    placeholder="Descrição da atividade"
                    className="flex-1"
                  />
                  {atividades.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => setAtividades(atividades.filter((_, i) => i !== idx))}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={a.quantidade}
                    onChange={(e) => {
                      const copy = [...atividades];
                      copy[idx].quantidade = e.target.value;
                      setAtividades(copy);
                    }}
                    placeholder="Qtd"
                    className="w-24"
                  />
                  <Input
                    value={a.unidade}
                    onChange={(e) => {
                      const copy = [...atividades];
                      copy[idx].unidade = e.target.value;
                      setAtividades(copy);
                    }}
                    placeholder="Unidade (m², un)"
                    className="flex-1"
                  />
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full" onClick={() => setAtividades([...atividades, { descricao: '', quantidade: '', unidade: '' }])}>
              <Plus className="mr-1 h-4 w-4" /> Adicionar Atividade
            </Button>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Resumo do RDO</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Obra</span><span className="font-medium">{obras.find((o) => o.id === obraId)?.nome || '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Data</span><span className="font-medium">{data}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Clima</span><span className="font-medium capitalize">{clima}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Condição</span><span className="font-medium capitalize">{condicao}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Funcionários presentes</span><Badge>{presentCount}</Badge></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Equipamentos utilizados</span><Badge>{selectedEquipCount}</Badge></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Atividades registradas</span><Badge>{ativCount}</Badge></div>
              {observacoes && (
                <div className="pt-2 border-t">
                  <p className="text-muted-foreground mb-1">Observações</p>
                  <p>{observacoes}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between p-4 border-t bg-muted/10">
        <Button variant="outline" onClick={() => step === 0 ? onClose() : setStep(step - 1)}>
          <ChevronLeft className="mr-1 h-4 w-4" /> {step === 0 ? 'Cancelar' : 'Voltar'}
        </Button>
        {step < steps.length - 1 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canAdvance()}>
            Próximo <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => saveMutation.mutate(false)} disabled={saveMutation.isPending}>
              Rascunho
            </Button>
            <Button onClick={() => saveMutation.mutate(true)} disabled={saveMutation.isPending}>
              <Check className="mr-1 h-4 w-4" /> Finalizar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
