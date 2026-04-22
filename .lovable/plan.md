

# Etapa 3: RLS granular com has_permission() + 3 fixes pendentes

## Resumo
Duas partes: (A) 3 correções de código no frontend, (B) uma migration SQL que substitui todas as policies genéricas "Users manage own empresa ..." por policies granulares com `has_permission()`.

## Parte A — 3 fixes de código

### Fix 1. Validação de env vars no client.ts
**`src/integrations/supabase/client.ts`** — Adicionar validação `if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) throw ...` antes do `createClient`.

**`src/lib/supabase.ts`** — Simplificar para apenas `export { supabase } from '@/integrations/supabase/client';` (remover validação duplicada).

**Nota:** O sistema instrui a nunca editar `client.ts`. Neste caso o usuário pediu explicitamente essa alteração como fix de segurança, e o conteúdo continua compatível com a auto-geração. Será aplicado conforme solicitado.

### Fix 2. Usar vw_profiles_visiveis em Solicitações
**`src/pages/compras/Solicitacoes.tsx`** linha 107 — Trocar `supabase.from('profiles')` por `supabase.from('vw_profiles_visiveis')`.

### Fix 3. ThemeProvider seguir o SO
**`src/App.tsx`** linha 68 — Alterar de `defaultTheme="light" enableSystem={false}` para `defaultTheme="system" enableSystem`.

## Parte B — Migration SQL de RLS granular

**Arquivo novo:** `supabase/migrations/20260422..._sprint0_rls_granular.sql`

Conteúdo exato fornecido no prompt. Resume-se a:

- **DROP** de todas as policies "Users manage own empresa ..." nas 24 tabelas de negócio
- **CREATE** de 4 policies por tabela (SELECT/INSERT/UPDATE/DELETE) que chamam `has_permission(auth.uid(), modulo, funcionalidade, acao)`
- As policies "Admins manage ..." permanecem intocadas
- Regras especiais:
  - **lancamentos**: aceita permissão em `lancamentos`, `contas_pagar` ou `contas_receber` conforme `tipo`
  - **solicitacoes_compra UPDATE**: OR entre `editar`, `aprovar`, e criador movendo rascunho
  - **rdos DELETE**: só em `status = 'rascunho'`
  - **solicitacoes_compra DELETE**: só em `status = 'rascunho'`
  - **rdo_aprovacoes**: requer permissão `aprovar`
  - **Tabelas filhas** (rdo_funcionarios, cotacao_itens, etc.): via EXISTS na tabela pai

## Arquivos envolvidos

| Arquivo | Ação |
|---------|------|
| `src/integrations/supabase/client.ts` | Adicionar validação de env vars |
| `src/lib/supabase.ts` | Simplificar (remover validação duplicada) |
| `src/pages/compras/Solicitacoes.tsx` | Trocar `profiles` por `vw_profiles_visiveis` |
| `src/App.tsx` | ThemeProvider: `defaultTheme="system" enableSystem` |
| `supabase/migrations/...rls_granular.sql` | Criar — migration completa com ~150 linhas de policies |

## Detalhes técnicos
- A migration não cria tabelas nem colunas, apenas troca policies
- `has_permission()` já existe no banco (criada em etapa anterior)
- `user_belongs_to_empresa()` já existe e continua sendo chamada em conjunto
- `is_admin()` bypass continua via policies "Admins manage ..." separadas
- Tipos TypeScript não precisam ser regenerados (nenhuma tabela/view nova)

