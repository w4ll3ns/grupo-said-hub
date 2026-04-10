

# Auditoria do Módulo Financeiro — Rotas e Funcionalidades

## Status por rota

| Rota | Menu Sidebar | Arquivo | Route App.tsx | Status |
|---|---|---|---|---|
| `/financeiro` | Dashboard | `Dashboard.tsx` | Sim | **Funcional** — cards, gráficos, vencimentos |
| `/financeiro/plano-contas` | Plano de Contas | `PlanoContas.tsx` | Sim | **Funcional** — CRUD receitas/despesas com tabs |
| `/financeiro/contas-bancarias` | Contas Bancárias | `ContasBancarias.tsx` | Sim | **Funcional** — CRUD completo |
| `/financeiro/formas-pagamento` | Formas de Pgto | `FormasPagamento.tsx` | Sim | **Funcional** — CRUD completo |
| `/financeiro/centros-custo` | Centros de Custo | `CentrosCusto.tsx` | Sim | **Funcional** — CRUD completo |
| `/financeiro/contas-pagar` | Contas a Pagar | `ContasPagar.tsx` | Sim | **Funcional** — usa LancamentosPage tipo=pagar |
| `/financeiro/contas-receber` | Contas a Receber | `ContasReceber.tsx` | Sim | **Funcional** — usa LancamentosPage tipo=receber |
| `/financeiro/lancamentos` | Lançamentos | **Nao existe** | **Nao existe** | **Quebrado** — link no menu leva a 404 |
| `/financeiro/transferencias` | Transferências | **Nao existe** | **Nao existe** | **Quebrado** — link no menu leva a 404 |
| `/financeiro/fluxo-caixa` | Fluxo de Caixa | **Nao existe** | **Nao existe** | **Quebrado** — link no menu leva a 404 |
| `/financeiro/dre` | DRE | **Nao existe** | **Nao existe** | **Quebrado** — link no menu leva a 404 |
| `/financeiro/metas` | Metas | **Nao existe** | **Nao existe** | **Quebrado** — link no menu leva a 404 |

---

## Resumo: 7 rotas funcionais, 5 rotas quebradas (404)

---

## Plano de correção

Existem duas abordagens para as 5 rotas faltantes:

### Opção A — Criar páginas placeholder (rápido)
Criar páginas com mensagem "Em breve" para cada rota faltante, evitando o 404.

### Opção B — Implementar funcionalidades completas
Criar as telas funcionais com lógica real. Isso é mais complexo e seria feito uma por uma.

### Recomendação: Abordagem mista
1. **Lançamentos** (`/financeiro/lancamentos`) — criar como uma view unificada de todos os lançamentos (pagar + receber juntos), reutilizando o `LancamentosPage` existente. Implementação rápida.
2. **Transferências, Fluxo de Caixa, DRE, Metas** — criar como placeholders com ícone e mensagem "Funcionalidade em desenvolvimento", para que o menu não leve a 404.

### Arquivos a criar/editar
| Arquivo | Ação |
|---|---|
| `src/pages/financeiro/Lancamentos.tsx` | Novo — view unificada pagar+receber |
| `src/pages/financeiro/Transferencias.tsx` | Novo — placeholder |
| `src/pages/financeiro/FluxoCaixa.tsx` | Novo — placeholder |
| `src/pages/financeiro/DRE.tsx` | Novo — placeholder |
| `src/pages/financeiro/Metas.tsx` | Novo — placeholder |
| `src/App.tsx` | Adicionar 5 rotas faltantes |

Nenhuma migração de banco necessária.

