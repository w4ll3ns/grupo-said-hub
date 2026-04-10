
# Módulo Financeiro — Cadastros Base

## Objetivo
Criar as 5 tabelas de cadastros base do módulo financeiro com CRUD completo, RLS por empresa_id e telas funcionais.

---

## 1. Migração de banco de dados

Criar uma única migração com as seguintes tabelas:

**plano_receitas** — id, empresa_id (FK empresas), categoria, subcategoria, ativa, created_at, updated_at
- RLS: admins full access; users filtrados por empresa_id via `user_belongs_to_empresa`

**plano_despesas** — id, empresa_id (FK empresas), categoria, subcategoria, ativa, created_at, updated_at
- Mesma estrutura e RLS do plano_receitas

**contas_bancarias** — id, empresa_id (FK empresas), nome, banco, agencia, conta, tipo (corrente/poupança/caixa), saldo_inicial (numeric), ativa, created_at, updated_at
- RLS por empresa_id

**formas_pagamento** — id, empresa_id (FK empresas), nome (boleto/pix/transferência/dinheiro/NF/cartão), ativa, created_at, updated_at
- RLS por empresa_id

**centros_custo** — id, empresa_id (FK empresas), nome, descricao, ativo, created_at, updated_at
- RLS por empresa_id

Todas as tabelas terão trigger `update_updated_at_column` e políticas RLS consistentes:
- Admin: ALL
- User autenticado: SELECT/INSERT/UPDATE/DELETE filtrado por `user_belongs_to_empresa(auth.uid(), empresa_id)`

## 2. Sidebar — adicionar itens de cadastro

Adicionar no grupo Financeiro da sidebar os novos itens (já existem Plano de Contas e outros; vamos mapear as rotas de cadastro dentro de subpáginas do financeiro):
- Contas Bancárias → `/financeiro/contas-bancarias`
- Formas de Pagamento → `/financeiro/formas-pagamento`
- Centros de Custo → `/financeiro/centros-custo`

O "Plano de Contas" já existe na sidebar — usaremos essa rota para exibir Receitas e Despesas em abas.

## 3. Páginas CRUD

Criar 4 páginas com padrão consistente (TanStack Query, React Hook Form + Zod, Dialog para criar/editar, tabela com busca):

**`/financeiro/plano-contas`** — Tabs "Receitas" e "Despesas"
- Tabela com categoria, subcategoria, status
- Dialog para criar/editar com campos categoria, subcategoria
- Botão ativar/desativar

**`/financeiro/contas-bancarias`** — CRUD de contas bancárias
- Tabela com nome, banco, agência, conta, tipo, saldo inicial, status
- Dialog com formulário validado (Zod)

**`/financeiro/formas-pagamento`** — CRUD simples
- Tabela com nome e status
- Dialog de criação/edição

**`/financeiro/centros-custo`** — CRUD simples
- Tabela com nome, descrição, status
- Dialog de criação/edição

Todas as telas filtram por `empresaAtiva.id` do hook `useEmpresa`.

## 4. Rotas

Registrar no `App.tsx`:
- `/financeiro/plano-contas`
- `/financeiro/contas-bancarias`
- `/financeiro/formas-pagamento`
- `/financeiro/centros-custo`

## 5. Seeds

Inserir dados iniciais para as 2 empresas existentes:
- 5 categorias de receita com subcategorias
- 8 categorias de despesa com subcategorias
- 3 contas bancárias por empresa
- 6 formas de pagamento padrão por empresa
- 4 centros de custo por empresa

---

## Detalhes técnicos

- Cada página segue o padrão visual já existente (Empresas.tsx como referência)
- Formulários com `react-hook-form` + `zodResolver`, validação em pt-BR
- Valores monetários formatados como BRL
- Todos os queries usam `empresa_id = empresaAtiva.id`
- Componente reutilizável `CrudPage` ou pattern comum para evitar duplicação
