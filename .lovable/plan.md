

# Auditoria Completa do Módulo Financeiro

## Resultado por Rota

| Rota | Status | Problemas |
|------|--------|-----------|
| `/financeiro` (Dashboard) | **Funcional** | OK — cards, gráficos, vencimentos |
| `/financeiro/plano-contas` | **Funcional** | OK — CRUD receitas + despesas |
| `/financeiro/contas-bancarias` | **Funcional** | OK — CRUD com saldo inicial |
| `/financeiro/formas-pagamento` | **Funcional** | OK — CRUD simples |
| `/financeiro/centros-custo` | **Funcional** | OK — CRUD com descrição |
| `/financeiro/contas-pagar` | **Funcional** | OK — listagem, criação, edição, baixa |
| `/financeiro/contas-receber` | **Funcional** | OK — mesmo componente LancamentosPage |
| `/financeiro/lancamentos` | **Funcional** | OK — tabs pagar/receber unificadas |
| `/financeiro/fluxo-caixa` | **Funcional** | OK — gráficos + KPIs + filtros |
| `/financeiro/transferencias` | **Placeholder** | Sem funcionalidade real |
| `/financeiro/dre` | **Placeholder** | Sem funcionalidade real |
| `/financeiro/metas` | **Placeholder** | Sem funcionalidade real |

## Problemas Encontrados

### 1. Dados inconsistentes — Lançamentos sem plano de contas
4 lançamentos do tipo "pagar" têm `plano_despesa_id = NULL`. O trigger `validate_lancamento_plano` apenas impede cruzamento errado (despesa com plano_receita e vice-versa) mas **não obriga** a ter um plano vinculado. Isso faz com que apareçam "—" na coluna Categoria da tabela e os gráficos do Dashboard e DRE ficam incompletos.

**Correção**: Tornar `plano_id` obrigatório no schema Zod do formulário de lançamentos (campo `plano_id` deve usar `.min(1)` em vez de `.optional()`).

### 2. Lançamentos — Falta botão Excluir
O CRUD de lançamentos não tem botão de exclusão. Só permite editar e baixar (marcar como pago). Deveria ter um botão de excluir com confirmação.

### 3. Lançamentos — Sem exibição de dados relacionados na tabela
A tabela de lançamentos mostra apenas Descrição, Valor, Vencimento, Status e Categoria. Não mostra Conta Bancária, Forma de Pagamento nem Centro de Custo vinculados — informação importante para gestão.

### 4. DRE, Transferências e Metas — Placeholders
Três rotas no menu estão com placeholder sem funcionalidade. O DRE é o mais crítico pois depende apenas dos dados já existentes (lancamentos + plano de contas).

### 5. Sidebar — Configurações leva a 404
O menu "Configurações" (`/admin/configuracoes`) existe no sidebar mas não tem rota correspondente no `App.tsx`.

### 6. Compras — Rotas 404
Os itens de menu Solicitações, Cotações, Pedidos, Fornecedores e Catálogo no módulo Compras apontam para rotas inexistentes.

## Plano de Correção (escopo financeiro)

### Fase 1: Correções de integridade (LancamentosPage.tsx)
- Tornar `plano_id` obrigatório no schema Zod
- Adicionar botão de exclusão com confirmação (Dialog)
- Adicionar colunas expandidas ou tooltip com conta bancária/forma pgto/centro de custo

### Fase 2: Implementar DRE funcional
- Criar página DRE com receitas e despesas agrupadas por categoria do plano de contas
- Filtro por período (mês/trimestre/ano)
- Resultado líquido (receitas - despesas)
- Tabela hierárquica: Categoria > Subcategoria > Total

### Fase 3: Implementar Transferências funcional
- Formulário: conta origem, conta destino, valor, data, descrição
- Necessita tabela `transferencias` no banco (migração)
- Listagem com filtros

### Fase 4: Implementar Metas funcional
- Necessita tabela `metas_financeiras` no banco (migração)
- Meta por categoria/período com valor alvo e acompanhamento vs realizado

### Fase 5: Rota Configurações
- Adicionar rota `/admin/configuracoes` no App.tsx (pelo menos placeholder)

## Arquivos a editar

| Arquivo | Ação |
|---------|------|
| `src/pages/financeiro/LancamentosPage.tsx` | plano_id obrigatório + botão excluir |
| `src/pages/financeiro/DRE.tsx` | Reescrita completa com dados reais |
| `src/pages/financeiro/Transferencias.tsx` | Implementação funcional |
| `src/pages/financeiro/Metas.tsx` | Implementação funcional |
| `src/App.tsx` | Rota `/admin/configuracoes` |
| Migrações | Tabelas `transferencias` e `metas_financeiras` |

## Recomendação de prioridade

Sugiro implementar na ordem: **Fase 1** (correções de integridade) → **Fase 2** (DRE) → **Fase 3** (Transferências) → **Fase 4** (Metas) → **Fase 5** (Configurações).

Posso começar pela Fase 1 + Fase 2 juntas, que são as mais impactantes e não precisam de migração de banco.

