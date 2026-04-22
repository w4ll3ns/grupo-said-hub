

# Etapa 2: Integridade e concorrência no banco

## Resumo
Criar uma migration SQL com 7 blocos (advisory locks, anti-spoofing, anti-auto-aprovacao, state machine, view de profiles visiveis, limpeza de legado) e ajustar o frontend para remover `aprovado_por`/`aprovado_em` do payload de aprovacao (agora controlado pelo trigger).

## Alteracoes

### 1. Migration SQL
**Arquivo novo:** `supabase/migrations/20260422_sprint0_integrity_and_concurrency.sql`

Conteudo exato fornecido no prompt, incluindo:
- **A.** Advisory locks + UNIQUE constraints nos 4 triggers de numeracao
- **B.** Trigger `force_solicitante_id` anti-spoofing
- **C.** Trigger `prevent_self_approval_solicitacao` com sobrescrita de `aprovado_por`/`aprovado_em`
- **D.** Trigger `prevent_self_approval_rdo`
- **E.** State machine de status em `solicitacoes_compra`
- **F.** View `vw_profiles_visiveis` com GRANT para authenticated
- **G.** DELETE de 6 linhas orfas em `perfil_permissoes`

### 2. Ajuste frontend — remover extras de aprovacao
**Arquivo:** `src/pages/compras/Solicitacoes.tsx`

Linha 228: remover `extras: { aprovado_por: user?.id, aprovado_em: new Date().toISOString() }` da chamada de aprovacao.

Linha 287: na rejeicao, manter apenas `extras: { motivo_rejeicao: rejectReason }` — remover `aprovado_por` e `aprovado_em` do extras (o trigger cuida disso).

A tipagem da mutation (`extras?: Record<string, unknown>`) permanece pois ainda e usada para `motivo_rejeicao` na rejeicao.

### 3. Tipos TypeScript
Apos a migration, os tipos serao regenerados automaticamente para incluir `vw_profiles_visiveis`.

## Arquivos envolvidos

| Arquivo | Acao |
|---------|------|
| `supabase/migrations/20260422..._sprint0_integrity_and_concurrency.sql` | Criar |
| `src/pages/compras/Solicitacoes.tsx` | Remover extras de aprovacao (linhas 228, 287) |

## Divergencias encontradas
- O prompt menciona adicionar Tooltip no item 9 da Etapa 1 para auto-aprovacao, mas a implementacao atual usa apenas `<span>` com `title` em vez de `Tooltip`/`TooltipTrigger`/`TooltipContent`. Isso nao afeta esta etapa — o trigger no banco e a camada definitiva de protecao.

