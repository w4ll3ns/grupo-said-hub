

# Evolução do RDO — Padrão Sodexo/Vale

Analisei o PDF enviado e identifiquei diversas informações e funcionalidades que faltam no nosso RDO atual. Abaixo o plano completo de adequação.

---

## Diferenças identificadas (PDF vs. atual)

| Funcionalidade | PDF Sodexo/Vale | Nosso RDO atual |
|---|---|---|
| Número sequencial do relatório | Sim (n° 281) | Não tem |
| Contrato / Contratante | Sim | Não tem |
| Local da obra | Sim | Só endereço na tabela obras |
| Prazo contratual / decorrido / a vencer | Sim (calculado) | Não tem |
| Horário de trabalho (entrada/saída/intervalo) | Sim | Não tem |
| Clima por período (manhã/tarde) | Sim (manhã + tarde separados) | Apenas 1 campo clima |
| Condição por período (Praticável/Impraticável) | Sim (manhã + tarde) | Apenas 1 campo condição |
| Mão de obra com entrada/saída/intervalo por funcionário | Sim | Apenas checkbox + horas |
| Equipamentos com quantidade | Sim (qtd por tipo) | Apenas checkbox + horas uso |
| Status da atividade | Sim (Em Andamento, Concluído) | Não tem |
| Fotos anexadas | Sim | Não tem |
| Aprovação dupla (contratada + contratante) | Sim com data/hora/email | Não tem |
| Geração de PDF | Formato padrão | Não tem |

---

## 1. Migração de banco de dados

### Alterações na tabela `obras`
- Adicionar: `contrato` (text), `contratante` (text), `local` (text), `prazo_contratual_dias` (integer)

### Alterações na tabela `rdos`
- Adicionar: `numero` (serial/integer, auto-incremento por empresa), `horario_entrada` (time), `horario_saida` (time), `horario_intervalo_inicio` (time), `horario_intervalo_fim` (time)
- Alterar clima para dois campos: `clima_manha` (text), `clima_tarde` (text) — substituir `clima`
- Alterar condição para dois campos: `condicao_manha` (text), `condicao_tarde` (text) — substituir `condicao_trabalho`

### Alterações na tabela `rdo_funcionarios`
- Adicionar: `horario_entrada` (time), `horario_saida` (time), `horario_intervalo` (text), `local_trabalho` (text)

### Alterações na tabela `rdo_equipamentos`
- Adicionar: `quantidade` (integer, default 1)

### Alterações na tabela `rdo_atividades`
- Adicionar: `status` (text — 'em_andamento', 'concluido', 'nao_iniciado')

### Nova tabela `rdo_fotos`
| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| rdo_id | uuid FK rdos | NOT NULL |
| url | text | NOT NULL |
| legenda | text | nullable |
| created_at | timestamptz | |

### Nova tabela `rdo_aprovacoes`
| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| rdo_id | uuid FK rdos | NOT NULL |
| tipo | text | 'contratada' ou 'contratante' |
| nome | text | NOT NULL |
| email | text | nullable |
| cargo | text | nullable |
| matricula | text | nullable |
| aprovado_em | timestamptz | nullable |
| status | text | 'pendente','aprovado','rejeitado' |

### Storage bucket `rdo-fotos`
- Bucket público para upload de fotos do RDO

### Função para número sequencial
- Trigger ou function que gera `numero` auto-incremento por empresa_id

---

## 2. Alterações no formulário (RDOForm.tsx)

### Step 1 — Dados Gerais (expandido)
- Seleção de obra (mantém)
- Data + dia da semana (calculado automaticamente)
- Horário de trabalho: entrada, saída, intervalo (campos de hora)
- Clima manhã e tarde: botões de ícone separados por período
- Condição manhã e tarde: Praticável / Impraticável por período
- Observações

### Step 2 — Equipe (expandido)
- Cada funcionário com: checkbox presença, entrada/saída individual, intervalo, horas (calculado), local de trabalho
- Campos touch-friendly mantidos

### Step 3 — Equipamentos (expandido)
- Campo de quantidade (inteiro) por equipamento selecionado

### Step 4 — Atividades (expandido)
- Adicionar campo de status por atividade (Em Andamento / Concluído / Não Iniciado)

### Step 5 — Fotos (NOVO step)
- Upload de múltiplas fotos com legenda
- Preview em grid
- Exclusão individual

### Step 6 — Resumo + Aprovação
- Preview completo do RDO no formato do PDF
- Informações de aprovação (contratada + contratante)
- Botões: Salvar Rascunho / Finalizar

---

## 3. Geração de PDF

- Botão "Gerar PDF" no card do RDO (lista) e no resumo
- Layout seguindo o padrão do PDF enviado (cabeçalho com logo, tabela de dados gerais, mão de obra, equipamentos, atividades, fotos, assinaturas)
- Usar edge function com geração server-side ou biblioteca client-side

---

## 4. Tela de Obras — campos extras
- Adicionar campos: contrato, contratante, local, prazo contratual (dias)
- Exibir prazo decorrido e prazo a vencer (calculados a partir de data_inicio)

---

## 5. Arquivos criados/editados
- 1 migração SQL (alter tables + novas tabelas + bucket + trigger número)
- `src/pages/rdo/RDOForm.tsx` — reescrita com 6 steps
- `src/pages/rdo/Relatorios.tsx` — botão PDF, número do relatório nos cards
- `src/pages/rdo/Obras.tsx` — campos contrato/contratante/local/prazo
- `src/pages/rdo/Dashboard.tsx` — ajustes para novos campos

---

## Detalhes técnicos
- Os campos `clima` e `condicao_trabalho` existentes serão migrados para `clima_manha`/`condicao_manha` via SQL de migração
- Storage bucket com RLS baseada em `user_belongs_to_empresa` (via join com rdos)
- Número sequencial implementado via trigger `BEFORE INSERT` que faz `MAX(numero) + 1` filtrado por empresa_id
- Fotos salvas no bucket `rdo-fotos` com path `{empresa_id}/{rdo_id}/{filename}`

