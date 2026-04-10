

# Fase 4 — Dashboard Financeiro

## Objetivo
Substituir o placeholder do Dashboard Financeiro por uma tela com indicadores, graficos e resumos baseados nos lancamentos existentes.

---

## 1. Componentes do Dashboard

### Cards de resumo (topo)
- **Total a Pagar** (pendente + vencido) — badge vermelho para vencidos
- **Total a Receber** (pendente) — badge verde
- **Saldo Projetado** (receber pendente - pagar pendente)
- **Pagos no Mes** / **Recebidos no Mes**

### Grafico de barras — Pagar vs Receber por mes
- Ultimos 6 meses de lancamentos agrupados por mes
- Barras lado a lado: vermelho (pagar) e verde (receber)
- Usar Recharts (ja disponivel no projeto via shadcn/ui chart)

### Grafico de pizza — Despesas por categoria
- Agrupa lancamentos tipo='pagar' por `plano_despesas.categoria`
- Top 5 categorias + "Outros"

### Tabela — Proximos vencimentos
- Lancamentos pendentes ordenados por data_vencimento ASC
- Top 10, com badge de status (vencido em vermelho, proximo em amarelo)
- Link para a pagina de contas a pagar/receber

---

## 2. Implementacao tecnica

### Queries
- Todas filtradas por `empresa_id = empresaAtiva.id`
- 4 queries com TanStack Query:
  1. Totais por tipo/status (cards)
  2. Lancamentos agrupados por mes (grafico barras)
  3. Despesas por categoria com join em plano_despesas (grafico pizza)
  4. Proximos vencimentos (tabela)

### Componentes
- `src/pages/financeiro/Dashboard.tsx` — reescrito com layout de grid
- Usar `Card` do shadcn para cada secao
- Usar `ChartContainer` / Recharts para graficos
- Formatacao BRL e datas em pt-BR

### Nenhuma migracao necessaria
Os dados ja existem na tabela `lancamentos` com as colunas necessarias.

---

## 3. Arquivos alterados
- `src/pages/financeiro/Dashboard.tsx` — reescrita completa

