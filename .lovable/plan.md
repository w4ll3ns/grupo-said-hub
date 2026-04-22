

# Sprint 1 Etapa 1: Transferencias transacionais + saldo atual

## Resumo
Transformar transferencias de simples log em operacao transacional (RPC cria 2 lancamentos atomicamente), adicionar estorno contabil, e exibir saldo atual das contas bancarias via VIEW.

## Alteracoes

### 1. Migration SQL
**Arquivo novo:** `supabase/migrations/20260422..._sprint1_transferencias_transacionais.sql`

Conteudo exato fornecido no prompt:
- Novas colunas em `transferencias`: `tipo` (normal/estorno), `transferencia_original_id` (FK), `created_by`
- Nova coluna em `lancamentos`: `transferencia_id` (FK)
- Index `idx_lancamentos_conta_status` para performance de saldo
- RPC `criar_transferencia()` — SECURITY DEFINER, valida permissao, cria 1 transferencia + 2 lancamentos (pagar/receber com status='pago') atomicamente
- RPC `estornar_transferencia()` — SECURITY DEFINER, cria transferencia inversa + 2 lancamentos de estorno, impede estornar estorno ou estornar 2x
- VIEW `vw_saldo_conta_atual` com `security_invoker=true` — retorna `saldo_inicial`, `saldo_efetivo` (apenas pagos), `saldo_previsto` (pagos + pendentes + vencidos)

### 2. Reescrever Transferencias.tsx
**Arquivo:** `src/pages/financeiro/Transferencias.tsx`

- Remover `editing` state e `handleEdit` — transferencias transacionais nao sao editaveis (seria incoerente editar algo que gerou lancamentos)
- Remover `deleteMutation` e AlertDialog de exclusao — substituido por estorno
- Substituir `saveMutation` por chamada RPC `criar_transferencia` com invalidacao de `transferencias`, `lancamentos` e `vw_saldo_conta_atual`
- Adicionar `estornarMutation` com chamada RPC `estornar_transferencia`
- Atualizar tipo `Transferencia` para incluir `tipo`, `transferencia_original_id`, `created_by`
- Adicionar coluna "Tipo" na tabela com Badge (Normal/Estorno com `destructive` variant)
- Substituir botoes Editar/Excluir por botao Estornar (icone `Undo2`) — visivel apenas quando `tipo === 'normal'` e nao existe estorno associado (detectado via Set de `transferencia_original_id`)
- Adicionar AlertDialog de confirmacao de estorno com Textarea opcional para motivo

### 3. Adicionar saldos em ContasBancarias.tsx
**Arquivo:** `src/pages/financeiro/ContasBancarias.tsx`

- Adicionar query `vw_saldo_conta_atual` em paralelo com a query existente
- Helper `saldoDa(contaId)` para buscar saldo de cada conta
- Substituir coluna "Saldo Inicial" por 3 colunas: Saldo Inicial | Saldo Efetivo (tooltip "Apenas lancamentos pagos") | Saldo Previsto (tooltip "Pagos + pendentes")
- Importar `Tooltip`, `TooltipTrigger`, `TooltipContent` e `TooltipProvider`
- Saldo negativo colorido com `text-destructive`
- Atualizar `colSpan` da linha "Nenhuma conta encontrada" para refletir as novas colunas

## Arquivos envolvidos

| Arquivo | Acao |
|---------|------|
| `supabase/migrations/...sprint1_transferencias.sql` | Criar |
| `src/pages/financeiro/Transferencias.tsx` | Reescrever (RPC + estorno) |
| `src/pages/financeiro/ContasBancarias.tsx` | Adicionar 3 colunas de saldo |

## Detalhes tecnicos
- RPCs sao SECURITY DEFINER com checagem manual de permissao — nenhuma policy RLS nova necessaria
- VIEW usa `security_invoker=true` e herda policies de `contas_bancarias` e `lancamentos`
- Transferencias antigas (se houver) ficam com `tipo='normal'` por default sem lancamentos associados — saldo nao as reflete
- Formulario de nova transferencia permanece igual (mesmos campos), apenas o submit muda para RPC
- Tipos TypeScript serao regenerados automaticamente apos a migration

