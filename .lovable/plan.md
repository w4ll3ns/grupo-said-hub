

# Fase 3 — Lançamentos Financeiros (Contas a Pagar e Receber)

## Objetivo
Criar a tabela de lançamentos financeiros e duas telas CRUD (Contas a Pagar e Contas a Receber) vinculadas aos cadastros base existentes.

---

## 1. Migração de banco de dados

**Tabela `lancamentos`** — tabela unificada para receitas e despesas:

| Coluna | Tipo | Notas |
|--------|------|-------|
| id | uuid PK | gen_random_uuid() |
| empresa_id | uuid FK empresas | NOT NULL |
| tipo | text | 'pagar' ou 'receber' |
| descricao | text | NOT NULL |
| valor | numeric(15,2) | NOT NULL |
| data_emissao | date | NOT NULL, default today |
| data_vencimento | date | NOT NULL |
| data_pagamento | date | nullable (preenchido quando pago) |
| status | text | 'pendente', 'pago', 'vencido', 'cancelado' |
| conta_bancaria_id | uuid FK contas_bancarias | nullable |
| forma_pagamento_id | uuid FK formas_pagamento | nullable |
| centro_custo_id | uuid FK centros_custo | nullable |
| plano_receita_id | uuid FK plano_receitas | nullable (para tipo='receber') |
| plano_despesa_id | uuid FK plano_despesas | nullable (para tipo='pagar') |
| observacoes | text | nullable |
| created_at, updated_at | timestamptz | triggers |

**RLS:** Mesma estrategia das tabelas existentes — Admin ALL + user filtrado por `user_belongs_to_empresa`.

**Trigger:** `update_updated_at_column` + trigger de validacao para garantir que `plano_receita_id` so e preenchido quando tipo='receber' e `plano_despesa_id` quando tipo='pagar'.

---

## 2. Rotas e Sidebar

- `/financeiro/contas-pagar` — CRUD de lancamentos tipo='pagar'
- `/financeiro/contas-receber` — CRUD de lancamentos tipo='receber'

Ja existem na sidebar (linhas 43-44 do AppSidebar), so precisam das paginas e rotas no App.tsx.

---

## 3. Paginas CRUD

**`ContasPagar.tsx`** e **`ContasReceber.tsx`** — mesmo padrao visual (ContasBancarias como referencia):

- **Tabela** com colunas: descricao, valor (BRL), vencimento, status (badge colorido), categoria, conta bancaria, forma pagamento
- **Filtros**: busca por descricao + filtro por status (pendente/pago/vencido/cancelado)
- **Dialog de criacao/edicao** com:
  - Descricao, valor, data emissao, data vencimento
  - Select de plano de receitas/despesas (filtrado por empresa)
  - Select de conta bancaria, forma de pagamento, centro de custo
  - Observacoes (textarea)
- **Acao de "Baixar"** (marcar como pago): preenche data_pagamento e muda status para 'pago'
- **Badge de status** com cores: pendente=amarelo, pago=verde, vencido=vermelho, cancelado=cinza

Ambas as paginas sao identicas, diferindo apenas no `tipo` ('pagar'/'receber') e nos labels.

---

## 4. Seeds

Inserir ~10 lancamentos por empresa (mix de pagar/receber, pendentes e pagos) vinculados aos cadastros existentes.

---

## Detalhes tecnicos

- Formularios com react-hook-form + Zod, validacao em pt-BR
- Valores formatados como BRL (`Intl.NumberFormat`)
- Datas formatadas com `toLocaleDateString('pt-BR')`
- Queries filtradas por `empresa_id = empresaAtiva.id` e `tipo`
- Selects de conta bancaria, forma pagamento, centro custo e plano carregados via queries separadas
- Componente compartilhado ou page factory para evitar duplicacao entre ContasPagar e ContasReceber

