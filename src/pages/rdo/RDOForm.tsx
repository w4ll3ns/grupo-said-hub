import { useState, useEffect, useRef } from 'react';
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
import { Sun, Cloud, CloudRain, CloudLightning, Plus, Trash2, ChevronLeft, ChevronRight, Check, Camera, X, Image as ImageIcon, FileDown } from 'lucide-react';
import { fetchAndGenerateRDOPdf } from '@/utils/fetchAndGenerateRDOPdf';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RDOFormProps {
  rdoId: string | null;
  onClose: () => void;
}

type StepKey = 'geral' | 'equipe' | 'equipamentos' | 'atividades' | 'fotos' | 'resumo';

const steps: { key: StepKey; label: string }[] = [
  { key: 'geral', label: 'Geral' },
  { key: 'equipe', label: 'Equipe' },
  { key: 'equipamentos', label: 'Equip.' },
  { key: 'atividades', label: 'Ativid.' },
  { key: 'fotos', label: 'Fotos' },
  { key: 'resumo', label: 'Resumo' },
];

const climaOptions = [
  { value: 'ensolarado', label: 'Ensolarado', icon: Sun, color: 'text-amber-500 border-amber-500 bg-amber-50' },
  { value: 'nublado', label: 'Nublado', icon: Cloud, color: 'text-muted-foreground border-muted bg-muted/30' },
  { value: 'chuvoso', label: 'Chuvoso', icon: CloudRain, color: 'text-blue-500 border-blue-500 bg-blue-50' },
  { value: 'tempestade', label: 'Tempestade', icon: CloudLightning, color: 'text-destructive border-destructive bg-destructive/10' },
];

const condicaoOptions = [
  { value: 'praticavel', label: 'Praticável' },
  { value: 'impraticavel', label: 'Impraticável' },
];

const atividadeStatusOptions = [
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'concluido', label: 'Concluído' },
  { value: 'nao_iniciado', label: 'Não Iniciado' },
];

type FuncionarioRow = {
  id: string; nome: string; cargo: string | null; presente: boolean;
  horas: string; horario_entrada: string; horario_saida: string;
  horario_intervalo: string; local_trabalho: string; observacao: string;
};
type EquipamentoRow = {
  id: string; nome: string; tipo: string | null; selecionado: boolean;
  horas_uso: string; operacional: boolean; quantidade: string; observacao: string;
};
type AtividadeRow = { id?: string; descricao: string; quantidade: string; unidade: string; status: string };
type FotoRow = { id?: string; url: string; legenda: string; file?: File };

export default function RDOForm({ rdoId, onClose }: RDOFormProps) {
  const { empresaAtiva } = useEmpresa();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const isEditing = !!rdoId;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // General data
  const [obraId, setObraId] = useState('');
  const [rdoData, setRdoData] = useState(new Date().toISOString().split('T')[0]);
  const [horarioEntrada, setHorarioEntrada] = useState('07:00');
  const [horarioSaida, setHorarioSaida] = useState('17:00');
  const [horarioIntervaloInicio, setHorarioIntervaloInicio] = useState('12:00');
  const [horarioIntervaloFim, setHorarioIntervaloFim] = useState('13:00');
  const [climaManha, setClimaManha] = useState('ensolarado');
  const [climaTarde, setClimaTarde] = useState('ensolarado');
  const [condicaoManha, setCondicaoManha] = useState('praticavel');
  const [condicaoTarde, setCondicaoTarde] = useState('praticavel');
  const [observacoes, setObservacoes] = useState('');

  // Team
  const [funcionarios, setFuncionarios] = useState<FuncionarioRow[]>([]);
  // Equipment
  const [equipamentos, setEquipamentos] = useState<EquipamentoRow[]>([]);
  // Activities
  const [atividades, setAtividades] = useState<AtividadeRow[]>([{ descricao: '', quantidade: '', unidade: '', status: 'em_andamento' }]);
  // Photos
  const [fotos, setFotos] = useState<FotoRow[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Fetch obras
  const { data: obras = [] } = useQuery({
    queryKey: ['obras', empresaAtiva?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('obras').select('id, nome, contrato, contratante, local, data_inicio, prazo_contratual_dias')
        .eq('empresa_id', empresaAtiva!.id).eq('status', 'em_andamento').order('nome');
      if (error) throw error;
      return data;
    },
    enabled: !!empresaAtiva,
  });

  const { data: allFuncionarios = [] } = useQuery({
    queryKey: ['funcionarios', empresaAtiva?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('funcionarios').select('id, nome, cargo')
        .eq('empresa_id', empresaAtiva!.id).eq('ativo', true).order('nome');
      if (error) throw error;
      return data;
    },
    enabled: !!empresaAtiva,
  });

  const { data: allEquipamentos = [] } = useQuery({
    queryKey: ['equipamentos', empresaAtiva?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('equipamentos').select('id, nome, tipo')
        .eq('empresa_id', empresaAtiva!.id).eq('ativo', true).order('nome');
      if (error) throw error;
      return data;
    },
    enabled: !!empresaAtiva,
  });

  useEffect(() => {
    if (!isEditing && allFuncionarios.length > 0 && funcionarios.length === 0) {
      setFuncionarios(allFuncionarios.map((f) => ({
        id: f.id, nome: f.nome, cargo: f.cargo, presente: true,
        horas: '8', horario_entrada: '07:00', horario_saida: '17:00',
        horario_intervalo: '12:00-13:00', local_trabalho: '', observacao: '',
      })));
    }
  }, [allFuncionarios, isEditing, funcionarios.length]);

  useEffect(() => {
    if (!isEditing && allEquipamentos.length > 0 && equipamentos.length === 0) {
      setEquipamentos(allEquipamentos.map((e) => ({
        id: e.id, nome: e.nome, tipo: e.tipo, selecionado: false,
        horas_uso: '', operacional: true, quantidade: '1', observacao: '',
      })));
    }
  }, [allEquipamentos, isEditing, equipamentos.length]);

  // Load existing RDO
  useEffect(() => {
    if (!rdoId) return;
    const load = async () => {
      const { data: rdo } = await supabase.from('rdos').select('*').eq('id', rdoId).single();
      if (!rdo) return;
      setObraId(rdo.obra_id);
      setRdoData(rdo.data);
      setHorarioEntrada(rdo.horario_entrada || '07:00');
      setHorarioSaida(rdo.horario_saida || '17:00');
      setHorarioIntervaloInicio(rdo.horario_intervalo_inicio || '12:00');
      setHorarioIntervaloFim(rdo.horario_intervalo_fim || '13:00');
      setClimaManha(rdo.clima_manha || 'ensolarado');
      setClimaTarde(rdo.clima_tarde || 'ensolarado');
      setCondicaoManha(rdo.condicao_manha || 'praticavel');
      setCondicaoTarde(rdo.condicao_tarde || 'praticavel');
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
            horario_entrada: existing?.horario_entrada || '07:00',
            horario_saida: existing?.horario_saida || '17:00',
            horario_intervalo: existing?.horario_intervalo || '12:00-13:00',
            local_trabalho: existing?.local_trabalho || '',
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
            quantidade: existing ? String(existing.quantidade || '1') : '1',
            observacao: existing?.observacao || '',
          };
        }));
      }

      const { data: rdoAtiv } = await supabase.from('rdo_atividades').select('*').eq('rdo_id', rdoId);
      if (rdoAtiv && rdoAtiv.length > 0) {
        setAtividades(rdoAtiv.map((a) => ({
          id: a.id, descricao: a.descricao, quantidade: String(a.quantidade || ''),
          unidade: a.unidade || '', status: a.status || 'em_andamento',
        })));
      }

      const { data: rdoFotos } = await supabase.from('rdo_fotos').select('*').eq('rdo_id', rdoId);
      if (rdoFotos && rdoFotos.length > 0) {
        setFotos(rdoFotos.map((f) => ({ id: f.id, url: f.url, legenda: f.legenda || '' })));
      }
    };
    load();
  }, [rdoId, allFuncionarios, allEquipamentos]);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFotos: FotoRow[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const url = URL.createObjectURL(file);
      newFotos.push({ url, legenda: '', file });
    }
    setFotos([...fotos, ...newFotos]);
    e.target.value = '';
  };

  const uploadPhotos = async (rdoIdToUse: string) => {
    const uploaded: { url: string; legenda: string }[] = [];
    for (const foto of fotos) {
      if (foto.file) {
        const ext = foto.file.name.split('.').pop();
        const path = `${empresaAtiva!.id}/${rdoIdToUse}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from('rdo-fotos').upload(path, foto.file);
        if (error) { console.error(error); continue; }
        const { data: urlData } = supabase.storage.from('rdo-fotos').getPublicUrl(path);
        uploaded.push({ url: urlData.publicUrl, legenda: foto.legenda });
      } else if (foto.url && !foto.url.startsWith('blob:')) {
        uploaded.push({ url: foto.url, legenda: foto.legenda });
      }
    }
    return uploaded;
  };

  const saveMutation = useMutation({
    mutationFn: async (finalizar: boolean) => {
      const rdoPayload: Record<string, unknown> = {
        empresa_id: empresaAtiva!.id,
        obra_id: obraId,
        data: rdoData,
        horario_entrada: horarioEntrada || null,
        horario_saida: horarioSaida || null,
        horario_intervalo_inicio: horarioIntervaloInicio || null,
        horario_intervalo_fim: horarioIntervaloFim || null,
        clima_manha: climaManha,
        clima_tarde: climaTarde,
        condicao_manha: condicaoManha,
        condicao_tarde: condicaoTarde,
        observacoes: observacoes || null,
        status: finalizar ? 'finalizado' : 'rascunho',
      };

      let id = rdoId;
      if (isEditing) {
        const { error } = await supabase.from('rdos').update(rdoPayload).eq('id', rdoId!);
        if (error) throw error;
      } else {
        const { data: created, error } = await supabase.from('rdos').insert(rdoPayload).select('id').single();
        if (error) throw error;
        id = created.id;
      }

      // Save funcionarios
      await supabase.from('rdo_funcionarios').delete().eq('rdo_id', id!);
      const funcRows = funcionarios.filter((f) => f.presente).map((f) => ({
        rdo_id: id!,
        funcionario_id: f.id,
        presente: true,
        horas: f.horas ? parseFloat(f.horas) : null,
        horario_entrada: f.horario_entrada || null,
        horario_saida: f.horario_saida || null,
        horario_intervalo: f.horario_intervalo || null,
        local_trabalho: f.local_trabalho || null,
        observacao: f.observacao || null,
      }));
      if (funcRows.length > 0) {
        const { error } = await supabase.from('rdo_funcionarios').insert(funcRows);
        if (error) throw error;
      }

      // Save equipamentos
      await supabase.from('rdo_equipamentos').delete().eq('rdo_id', id!);
      const equipRows = equipamentos.filter((e) => e.selecionado).map((e) => ({
        rdo_id: id!,
        equipamento_id: e.id,
        horas_uso: e.horas_uso ? parseFloat(e.horas_uso) : null,
        operacional: e.operacional,
        quantidade: e.quantidade ? parseInt(e.quantidade) : 1,
        observacao: e.observacao || null,
      }));
      if (equipRows.length > 0) {
        const { error } = await supabase.from('rdo_equipamentos').insert(equipRows);
        if (error) throw error;
      }

      // Save atividades
      await supabase.from('rdo_atividades').delete().eq('rdo_id', id!);
      const ativRows = atividades.filter((a) => a.descricao.trim()).map((a) => ({
        rdo_id: id!,
        descricao: a.descricao,
        quantidade: a.quantidade ? parseFloat(a.quantidade) : null,
        unidade: a.unidade || null,
        status: a.status || 'em_andamento',
      }));
      if (ativRows.length > 0) {
        const { error } = await supabase.from('rdo_atividades').insert(ativRows);
        if (error) throw error;
      }

      // Upload and save photos
      await supabase.from('rdo_fotos').delete().eq('rdo_id', id!);
      const uploadedFotos = await uploadPhotos(id!);
      if (uploadedFotos.length > 0) {
        const { error } = await supabase.from('rdo_fotos').insert(
          uploadedFotos.map((f) => ({ rdo_id: id!, url: f.url, legenda: f.legenda || null }))
        );
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
    if (step === 0) return !!obraId && !!rdoData;
    return true;
  };

  const presentCount = funcionarios.filter((f) => f.presente).length;
  const selectedEquipCount = equipamentos.filter((e) => e.selecionado).length;
  const ativCount = atividades.filter((a) => a.descricao.trim()).length;
  const selectedObra = obras.find((o) => o.id === obraId);

  const getDiaSemana = () => {
    if (!rdoData) return '';
    try {
      return format(new Date(rdoData + 'T00:00:00'), 'EEEE', { locale: ptBR });
    } catch { return ''; }
  };

  return (
    <div className="flex flex-col">
      {/* Stepper */}
      <div className="flex items-center justify-between px-3 py-3 border-b bg-muted/30 overflow-x-auto">
        {steps.map((s, i) => (
          <button
            key={s.key}
            onClick={() => i <= step && setStep(i)}
            className={cn(
              'flex flex-col items-center gap-1 text-[10px] transition-colors min-w-0 px-1',
              i === step ? 'text-primary font-semibold' : i < step ? 'text-primary/60' : 'text-muted-foreground'
            )}
          >
            <div className={cn(
              'h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors',
              i === step ? 'border-primary bg-primary text-primary-foreground' :
              i < step ? 'border-primary/60 bg-primary/10 text-primary' :
              'border-muted-foreground/30 text-muted-foreground'
            )}>
              {i < step ? <Check className="h-3 w-3" /> : i + 1}
            </div>
            <span className="truncate max-w-[50px]">{s.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 min-h-[300px] max-h-[60vh] overflow-y-auto">
        {/* STEP 0 - Dados Gerais */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <Label>Obra *</Label>
              <Select value={obraId} onValueChange={setObraId}>
                <SelectTrigger><SelectValue placeholder="Selecione a obra" /></SelectTrigger>
                <SelectContent>
                  {obras.map((o) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {selectedObra && (
              <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1">
                {selectedObra.contrato && <p><span className="text-muted-foreground">Contrato:</span> {selectedObra.contrato}</p>}
                {selectedObra.contratante && <p><span className="text-muted-foreground">Contratante:</span> {selectedObra.contratante}</p>}
                {selectedObra.local && <p><span className="text-muted-foreground">Local:</span> {selectedObra.local}</p>}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data *</Label>
                <Input type="date" value={rdoData} onChange={(e) => setRdoData(e.target.value)} />
                {rdoData && <p className="text-xs text-muted-foreground mt-1 capitalize">{getDiaSemana()}</p>}
              </div>
              <div />
            </div>

            <div>
              <Label className="text-sm font-medium">Horário de Trabalho</Label>
              <div className="grid grid-cols-2 gap-3 mt-1">
                <div>
                  <Label className="text-xs text-muted-foreground">Entrada</Label>
                  <Input type="time" value={horarioEntrada} onChange={(e) => setHorarioEntrada(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Saída</Label>
                  <Input type="time" value={horarioSaida} onChange={(e) => setHorarioSaida(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Intervalo início</Label>
                  <Input type="time" value={horarioIntervaloInicio} onChange={(e) => setHorarioIntervaloInicio(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Intervalo fim</Label>
                  <Input type="time" value={horarioIntervaloFim} onChange={(e) => setHorarioIntervaloFim(e.target.value)} />
                </div>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Clima — Manhã</Label>
              <div className="grid grid-cols-4 gap-2 mt-1">
                {climaOptions.map((c) => (
                  <button key={c.value} type="button" onClick={() => setClimaManha(c.value)}
                    className={cn('flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all',
                      climaManha === c.value ? c.color : 'border-border hover:border-primary/30')}>
                    <c.icon className="h-5 w-5" />
                    <span className="text-[9px] font-medium">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Clima — Tarde</Label>
              <div className="grid grid-cols-4 gap-2 mt-1">
                {climaOptions.map((c) => (
                  <button key={c.value} type="button" onClick={() => setClimaTarde(c.value)}
                    className={cn('flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all',
                      climaTarde === c.value ? c.color : 'border-border hover:border-primary/30')}>
                    <c.icon className="h-5 w-5" />
                    <span className="text-[9px] font-medium">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Condição — Manhã</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {condicaoOptions.map((c) => (
                  <button key={c.value} type="button" onClick={() => setCondicaoManha(c.value)}
                    className={cn('py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all text-center',
                      condicaoManha === c.value ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/30')}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Condição — Tarde</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {condicaoOptions.map((c) => (
                  <button key={c.value} type="button" onClick={() => setCondicaoTarde(c.value)}
                    className={cn('py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all text-center',
                      condicaoTarde === c.value ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/30')}>
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
        )}

        {/* STEP 1 - Equipe */}
        {step === 1 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground mb-2">Marque os funcionários presentes e informe horários</p>
            {funcionarios.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Cadastre funcionários primeiro</p>
            ) : (
              funcionarios.map((f, idx) => (
                <div key={f.id} className={cn(
                  'p-3 rounded-lg border transition-colors space-y-2',
                  f.presente ? 'border-primary/30 bg-primary/5' : 'border-border opacity-60'
                )}>
                  <div className="flex items-center gap-3">
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
                  </div>
                  {f.presente && (
                    <div className="ml-9 space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Entrada</Label>
                          <Input type="time" value={f.horario_entrada}
                            onChange={(e) => { const c = [...funcionarios]; c[idx].horario_entrada = e.target.value; setFuncionarios(c); }}
                            className="h-8 text-xs" />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Saída</Label>
                          <Input type="time" value={f.horario_saida}
                            onChange={(e) => { const c = [...funcionarios]; c[idx].horario_saida = e.target.value; setFuncionarios(c); }}
                            className="h-8 text-xs" />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Horas</Label>
                          <Input type="number" value={f.horas}
                            onChange={(e) => { const c = [...funcionarios]; c[idx].horas = e.target.value; setFuncionarios(c); }}
                            className="h-8 text-xs" min="0" max="24" step="0.5" />
                        </div>
                      </div>
                      <Input value={f.local_trabalho} placeholder="Local de trabalho"
                        onChange={(e) => { const c = [...funcionarios]; c[idx].local_trabalho = e.target.value; setFuncionarios(c); }}
                        className="h-8 text-xs" />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* STEP 2 - Equipamentos */}
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
                    <Checkbox checked={e.selecionado}
                      onCheckedChange={(checked) => { const c = [...equipamentos]; c[idx].selecionado = !!checked; setEquipamentos(c); }}
                      className="h-6 w-6" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{e.nome}</p>
                      {e.tipo && <p className="text-xs text-muted-foreground">{e.tipo}</p>}
                    </div>
                  </div>
                  {e.selecionado && (
                    <div className="flex items-center gap-3 mt-2 ml-9">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Qtd</Label>
                        <Input type="number" value={e.quantidade}
                          onChange={(ev) => { const c = [...equipamentos]; c[idx].quantidade = ev.target.value; setEquipamentos(c); }}
                          className="w-16 h-8 text-xs" min="1" />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Horas</Label>
                        <Input type="number" value={e.horas_uso}
                          onChange={(ev) => { const c = [...equipamentos]; c[idx].horas_uso = ev.target.value; setEquipamentos(c); }}
                          className="w-16 h-8 text-xs" min="0" step="0.5" />
                      </div>
                      <div className="flex items-center gap-2 pt-4">
                        <Switch checked={e.operacional}
                          onCheckedChange={(checked) => { const c = [...equipamentos]; c[idx].operacional = checked; setEquipamentos(c); }} />
                        <span className="text-xs">{e.operacional ? 'Op.' : 'Parado'}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* STEP 3 - Atividades */}
        {step === 3 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Descreva as atividades executadas no dia</p>
            {atividades.map((a, idx) => (
              <div key={idx} className="p-3 rounded-lg border space-y-2">
                <div className="flex items-center gap-2">
                  <Input value={a.descricao}
                    onChange={(e) => { const c = [...atividades]; c[idx].descricao = e.target.value; setAtividades(c); }}
                    placeholder="Descrição da atividade" className="flex-1" />
                  {atividades.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => setAtividades(atividades.filter((_, i) => i !== idx))}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input type="number" value={a.quantidade}
                    onChange={(e) => { const c = [...atividades]; c[idx].quantidade = e.target.value; setAtividades(c); }}
                    placeholder="Qtd" className="w-20" />
                  <Input value={a.unidade}
                    onChange={(e) => { const c = [...atividades]; c[idx].unidade = e.target.value; setAtividades(c); }}
                    placeholder="Un. (m², un)" className="flex-1" />
                  <Select value={a.status} onValueChange={(v) => { const c = [...atividades]; c[idx].status = v; setAtividades(c); }}>
                    <SelectTrigger className="w-32 h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {atividadeStatusOptions.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full" onClick={() => setAtividades([...atividades, { descricao: '', quantidade: '', unidade: '', status: 'em_andamento' }])}>
              <Plus className="mr-1 h-4 w-4" /> Adicionar Atividade
            </Button>
          </div>
        )}

        {/* STEP 4 - Fotos */}
        {step === 4 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Anexe fotos do dia de trabalho</p>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoSelect} />
            <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
              <Camera className="mr-1 h-4 w-4" /> Adicionar Fotos
            </Button>
            {fotos.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {fotos.map((foto, idx) => (
                  <div key={idx} className="relative rounded-lg border overflow-hidden">
                    <img src={foto.url} alt={foto.legenda || 'Foto RDO'} className="w-full h-32 object-cover" />
                    <button type="button" onClick={() => setFotos(fotos.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1">
                      <X className="h-3 w-3" />
                    </button>
                    <Input value={foto.legenda} placeholder="Legenda..."
                      onChange={(e) => { const c = [...fotos]; c[idx].legenda = e.target.value; setFotos(c); }}
                      className="rounded-none border-0 border-t text-xs h-8" />
                  </div>
                ))}
              </div>
            )}
            {fotos.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <ImageIcon className="h-12 w-12 mb-2 opacity-30" />
                <p className="text-sm">Nenhuma foto anexada</p>
              </div>
            )}
          </div>
        )}

        {/* STEP 5 - Resumo */}
        {step === 5 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Resumo do RDO</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Obra</span><span className="font-medium">{selectedObra?.nome || '—'}</span></div>
              {selectedObra?.contrato && <div className="flex justify-between"><span className="text-muted-foreground">Contrato</span><span className="font-medium">{selectedObra.contrato}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">Data</span><span className="font-medium capitalize">{rdoData} — {getDiaSemana()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Horário</span><span className="font-medium">{horarioEntrada} - {horarioSaida}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Intervalo</span><span className="font-medium">{horarioIntervaloInicio} - {horarioIntervaloFim}</span></div>

              <div className="border-t pt-2 space-y-1">
                <p className="text-muted-foreground font-medium">Clima & Condição</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-muted/50 rounded p-2"><span className="text-muted-foreground">Manhã:</span> <span className="capitalize">{climaManha}</span> · {condicaoManha === 'praticavel' ? 'Praticável' : 'Impraticável'}</div>
                  <div className="bg-muted/50 rounded p-2"><span className="text-muted-foreground">Tarde:</span> <span className="capitalize">{climaTarde}</span> · {condicaoTarde === 'praticavel' ? 'Praticável' : 'Impraticável'}</div>
                </div>
              </div>

              <div className="border-t pt-2">
                <div className="flex justify-between"><span className="text-muted-foreground">Funcionários presentes</span><Badge>{presentCount}</Badge></div>
              </div>
              <div className="flex justify-between"><span className="text-muted-foreground">Equipamentos utilizados</span><Badge>{selectedEquipCount}</Badge></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Atividades registradas</span><Badge>{ativCount}</Badge></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Fotos anexadas</span><Badge>{fotos.length}</Badge></div>
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
        <Button variant="outline" size="sm" onClick={() => step === 0 ? onClose() : setStep(step - 1)}>
          <ChevronLeft className="mr-1 h-4 w-4" /> {step === 0 ? 'Cancelar' : 'Voltar'}
        </Button>
        {step < steps.length - 1 ? (
          <Button size="sm" onClick={() => setStep(step + 1)} disabled={!canAdvance()}>
            Próximo <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => saveMutation.mutate(false)} disabled={saveMutation.isPending}>
              Rascunho
            </Button>
            <Button size="sm" onClick={() => saveMutation.mutate(true)} disabled={saveMutation.isPending}>
              <Check className="mr-1 h-4 w-4" /> Finalizar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
