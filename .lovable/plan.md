

# Implementação Completa do Módulo de Compras

## Resumo

Criar 4 tabelas no banco de dados e implementar 6 páginas funcionais: Dashboard, Fornecedores (CRUD), Catálogo de Produtos (CRUD), Solicitações de Compra (com workflow de aprovação), Cotações (vinculadas a solicitações) e Pedidos de Compra (gerados a partir de cotações aprovadas).

## Novas Tabelas (Migração)

### 1. `fornecedores`
- `id`, `empresa_id`, `razao_social`, `nome_fantasia`, `cnpj_cpf`, `email`, `telefone`, `endereco`, `cidade`, `estado`, `observacoes`, `ativo`, `created_at`, `updated_at`
- RLS: admin + user_belongs_to_empresa

### 2. `produtos`
- `id`, `empresa_id`, `nome`, `descricao`, `unidade` (un, kg, m, m2, m3, l, cx, pct), `categoria`, `ativo`, `created_at`, `updated_at`
- RLS: admin + user_belongs_to_empresa

### 3. `solicitacoes_compra`
- `id`, `empresa_id`, `numero` (auto-increment via trigger), `solicitante_id` (auth.uid), `data_solicitacao`, `data_necessidade`, `obra_id` (nullable FK obras), `centro_custo_id` (nullable FK centros_custo), `justificativa`, `prioridade` (baixa/media/alta/urgente), `status` (rascunho/pendente/aprovada/rejeitada/cotacao/pedido/concluida/cancelada), `aprovado_por` (nullable), `aprovado_em` (nullable), `motivo_rejeicao` (nullable), `observacoes`, `created_at`, `updated_at`
- RLS: admin + user_belongs_to_empresa

### 4. `solicitacao_itens`
- `id`, `solicitacao_id` (FK), `produto_id` (nullable FK), `descricao`, `quantidade`, `unidade`, `observacao`
- RLS: via join com solicitacoes_compra.empresa_id

### 5. `cotacoes`
- `id`, `empresa_id`, `solicitacao_id` (FK), `fornecedor_id` (FK), `numero`, `data_cotacao`, `data_validade`, `valor_total`, `condicao_pagamento`, `prazo_entrega`, `status` (pendente/aprovada/rejeitada), `observacoes`, `created_at`, `updated_at`
- RLS: admin + user_belongs_to_empresa

### 6. `cotacao_itens`
- `id`, `cotacao_id` (FK), `solicitacao_item_id` (FK), `valor_unitario`, `quantidade`, `valor_total`

### 7. `pedidos_compra`
- `id`, `empresa_id`, `cotacao_id` (FK), `fornecedor_id` (FK), `numero`, `data_pedido`, `data_entrega_prevista`, `valor_total`, `status` (pendente/enviado/parcial/entregue/cancelado), `observacoes`, `created_at`, `updated_at`
- RLS: admin + user_belongs_to_empresa

### Triggers
- `set_solicitacao_numero` — auto-incrementa numero por empresa
- `set_cotacao_numero` — idem
- `set_pedido_numero` — idem
- `update_updated_at` — reusa trigger existente

## Páginas a Implementar

### 1. `Fornecedores.tsx` — CRUD completo
- Tabela com razão social, CNPJ, cidade/estado, telefone, email, status
- Dialog para criar/editar com validação Zod
- Busca por nome/CNPJ
- Padrão idêntico ao LancamentosPage

### 2. `Catalogo.tsx` — CRUD de produtos/materiais
- Tabela com nome, categoria, unidade, status
- Dialog criar/editar
- Filtro por categoria

### 3. `Solicitacoes.tsx` — Workflow completo
- Listagem com número, data, solicitante, obra, prioridade, status (badges coloridos)
- Dialog de criação com itens dinâmicos (adicionar/remover linhas de produtos)
- Ações: Enviar para Aprovação (rascunho→pendente), Aprovar (pendente→aprovada), Rejeitar (pendente→rejeitada com motivo), Cancelar
- Permissão `aprovar` do módulo compras controla quem pode aprovar

### 4. `Cotacoes.tsx` — Vinculada a solicitações aprovadas
- Listagem com número, fornecedor, solicitação, valor total, validade, status
- Dialog de criação: selecionar solicitação aprovada + fornecedor + preencher valores por item
- Ação: Aprovar cotação (melhor preço) → permite gerar pedido

### 5. `Pedidos.tsx` — Gerado a partir de cotação aprovada
- Listagem com número, fornecedor, valor, data entrega, status
- Ação: Gerar Pedido a partir de cotação aprovada
- Status tracking: pendente → enviado → parcial → entregue

### 6. `Dashboard.tsx` — KPIs e visão geral
- Cards: Total Solicitações (mês), Pendentes Aprovação, Pedidos em Aberto, Valor Total Pedidos (mês)
- Tabela: Últimas solicitações pendentes
- Gráfico: Compras por mês (últimos 6 meses)

## Workflow de Aprovação

```text
Solicitação:
  rascunho → pendente → aprovada → cotacao → pedido → concluida
                       → rejeitada
                       → cancelada

Cotação:
  pendente → aprovada → (gera pedido)
           → rejeitada

Pedido:
  pendente → enviado → parcial → entregue
           → cancelado
```

## Arquivos

| Arquivo | Ação |
|---------|------|
| Migração SQL | 7 tabelas + 3 triggers + RLS |
| `src/pages/compras/Fornecedores.tsx` | Reescrita CRUD completo |
| `src/pages/compras/Catalogo.tsx` | Reescrita CRUD completo |
| `src/pages/compras/Solicitacoes.tsx` | Reescrita com workflow |
| `src/pages/compras/Cotacoes.tsx` | Reescrita com vínculo solicitação |
| `src/pages/compras/Pedidos.tsx` | Reescrita com geração automática |
| `src/pages/compras/Dashboard.tsx` | Reescrita com KPIs reais |

## Detalhes técnicos
- Segue padrões existentes: `useEmpresa()`, `useQuery/useMutation`, `react-hook-form + zod`, componentes shadcn/ui
- Todas as tabelas com RLS usando `is_admin` + `user_belongs_to_empresa`
- Permissões via `usePermissions()` para controlar ações de aprovação
- Nenhuma alteração em tabelas existentes

