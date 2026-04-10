

# Fase 5 — Módulo RDO (Relatório Diário de Obra)

## Objetivo
Implementar o módulo RDO completo com cadastros base (Obras, Funcionários, Equipamentos) e o registro de Relatórios Diários de Obra. **Interface mobile-first** para uso em campo.

---

## 1. Migrações de banco de dados

### Tabela `obras`
| Coluna | Tipo | Notas |
|--------|------|-------|
| id | uuid PK | |
| empresa_id | uuid FK empresas | NOT NULL |
| nome | text | NOT NULL |
| endereco | text | nullable |
| responsavel | text | nullable |
| status | text | 'em_andamento', 'concluida', 'paralisada' |
| data_inicio | date | nullable |
| data_previsao | date | nullable |
| created_at, updated_at | timestamptz | |

### Tabela `funcionarios`
| Coluna | Tipo | Notas |
|--------|------|-------|
| id | uuid PK | |
| empresa_id | uuid FK empresas | NOT NULL |
| nome | text | NOT NULL |
| cargo | text | nullable |
| ativo | boolean | default true |
| created_at, updated_at | timestamptz | |

### Tabela `equipamentos`
| Coluna | Tipo | Notas |
|--------|------|-------|
| id | uuid PK | |
| empresa_id | uuid FK empresas | NOT NULL |
| nome | text | NOT NULL |
| tipo | text | nullable |
| ativo | boolean | default true |
| created_at, updated_at | timestamptz | |

### Tabela `rdos` (Relatório Diário)
| Coluna | Tipo | Notas |
|--------|------|-------|
| id | uuid PK | |
| empresa_id | uuid FK empresas | NOT NULL |
| obra_id | uuid FK obras | NOT NULL |
| data | date | NOT NULL |
| clima | text | 'ensolarado','nublado','chuvoso','tempestade' |
| condicao_trabalho | text | 'normal','parcial','paralisado' |
| observacoes | text | nullable |
| status | text | 'rascunho','finalizado' |
| created_by | uuid | auth.uid() |
| created_at, updated_at | timestamptz | |

### Tabela `rdo_funcionarios` (presença)
| Coluna | Tipo | Notas |
|--------|------|-------|
| id | uuid PK | |
| rdo_id | uuid FK rdos | NOT NULL |
| funcionario_id | uuid FK funcionarios | NOT NULL |
| presente | boolean | default true |
| horas | numeric(4,1) | nullable |
| observacao | text | nullable |

### Tabela `rdo_equipamentos` (uso)
| Coluna | Tipo | Notas |
|--------|------|-------|
| id | uuid PK | |
| rdo_id | uuid FK rdos | NOT NULL |
| equipamento_id | uuid FK equipamentos | NOT NULL |
| horas_uso | numeric(4,1) | nullable |
| operacional | boolean | default true |
| observacao | text | nullable |

### Tabela `rdo_atividades` (serviços executados)
| Coluna | Tipo | Notas |
|--------|------|-------|
| id | uuid PK | |
| rdo_id | uuid FK rdos | NOT NULL |
| descricao | text | NOT NULL |
| quantidade | numeric(10,2) | nullable |
| unidade | text | nullable |

**RLS:** Mesma estratégia — `user_belongs_to_empresa` em todas as tabelas.

---

## 2. Páginas — Design Mobile-First

### Cadastros base (padrão CRUD existente)
- **`/rdo/obras`** — lista de obras com status badge, botão criar/editar
- **`/rdo/funcionarios`** — lista com cargo, toggle ativo/inativo
- **`/rdo/equipamentos`** — lista com tipo, toggle ativo/inativo

### Relatórios Diários (`/rdo/relatorios`) — **foco UX mobile**
- **Lista**: cards empilhados (não tabela) com obra, data, clima (ícone), status
- **Criação/Edição**: formulário em etapas (stepper) para mobile:
  1. **Dados Gerais** — obra (select), data, clima (botões com ícones ☀️🌥️🌧️⛈️), condição de trabalho
  2. **Equipe** — checklist de funcionários com campo de horas (toggle presente/ausente)
  3. **Equipamentos** — checklist com horas de uso e status operacional
  4. **Atividades** — lista dinâmica de atividades executadas (adicionar/remover)
  5. **Resumo** — preview do RDO completo + botão "Finalizar"

### Dashboard RDO (`/rdo`)
- Cards: total de obras ativas, RDOs do mês, funcionários mobilizados
- Lista dos últimos RDOs

---

## 3. Foco em Usabilidade

- **Cards ao invés de tabelas** em telas mobile (390px viewport)
- **Stepper visual** no formulário de RDO com indicação de progresso
- **Ícones de clima** clicáveis ao invés de select dropdown
- **Checkboxes grandes** para marcar presença de funcionários em campo (touch-friendly)
- **Botões de ação proeminentes** (FAB para novo RDO)
- **Feedback visual** com toast em todas as ações
- **Scroll suave** entre etapas do stepper

---

## 4. Rotas
Registrar em `App.tsx`:
- `/rdo` — Dashboard
- `/rdo/relatorios` — Lista e CRUD de RDOs
- `/rdo/obras` — CRUD Obras
- `/rdo/funcionarios` — CRUD Funcionários
- `/rdo/equipamentos` — CRUD Equipamentos

---

## 5. Seeds
- 2-3 obras por empresa
- 5-8 funcionários por empresa
- 3-5 equipamentos por empresa
- 3-4 RDOs de exemplo com presença, equipamentos e atividades

---

## Arquivos criados/editados
- `src/pages/rdo/Dashboard.tsx` — reescrito
- `src/pages/rdo/Obras.tsx` — novo
- `src/pages/rdo/Funcionarios.tsx` — novo
- `src/pages/rdo/Equipamentos.tsx` — novo
- `src/pages/rdo/Relatorios.tsx` — novo
- `src/pages/rdo/RDOForm.tsx` — novo (stepper mobile-first)
- `src/App.tsx` — novas rotas
- 1 migração SQL com todas as tabelas + RLS + seeds

