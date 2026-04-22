

# Etapa 1: Correções de qualidade, robustez e segurança

## Resumo
10 itens de acabamento, robustez e segurança aplicados em um único commit. Nenhuma alteração de RLS, Storage ou regras de negócio no banco.

## Itens

### 1. Remover rota quebrada /perfil
**Arquivo:** `src/components/layout/Topbar.tsx`
Remover o `DropdownMenuItem` "Meu Perfil" e o import `User` do lucide-react. Manter apenas o item "Sair".

### 2. QueryClient com defaults sensatos
**Arquivo:** `src/App.tsx`
Substituir `new QueryClient()` pela configuração com `staleTime: 60_000`, `gcTime: 5 * 60_000`, `refetchOnWindowFocus: false`, retry inteligente (para em 401/403/404, max 2 tentativas), e `mutations: { retry: false }`.

### 3. ErrorBoundary global
**Arquivo novo:** `src/components/ErrorBoundary.tsx`
Class component com `getDerivedStateFromError`, tela de fallback com botao "Recarregar".

**Arquivo:** `src/App.tsx`
Envolver o conteudo do `QueryClientProvider` com `<ErrorBoundary>`.

### 4. Validar variáveis de ambiente do Supabase
**Arquivo:** `src/integrations/supabase/client.ts`
Este arquivo e auto-gerado e nao pode ser editado. A validacao sera feita em `src/lib/supabase.ts` (ou onde o client for re-exportado), ou alternativamente no `src/main.tsx` como guard antes do render. Se `src/lib/supabase.ts` ja re-exporta o client, adicionarei a validacao la.

**Nota:** Preciso verificar `src/lib/supabase.ts` para confirmar a abordagem.

### 5. Persistir tema dark/light
**Arquivo:** `src/App.tsx`
Adicionar `ThemeProvider` do `next-themes` (ja instalado) envolvendo o app com `attribute="class"` e `defaultTheme="light"`.

**Arquivo:** `src/components/layout/Topbar.tsx`
Substituir `useState`/`useEffect` do tema por `useTheme()` do `next-themes`.

### 6. Fallback para usuario sem empresa
**Arquivo:** `src/hooks/useEmpresa.tsx`
Adicionar `semEmpresaVinculada: boolean` ao contexto, calculado como `!isLoading && empresas.length === 0`.

**Arquivo:** `src/components/layout/AppLayout.tsx`
Refatorar para `AppLayoutContent` interno que verifica `isLoading` (skeleton) e `semEmpresaVinculada` (mensagem amigavel) antes de renderizar o layout normal.

### 7. Aumentar modal do RDOForm
**Arquivo:** `src/pages/rdo/Relatorios.tsx` (linha 144)
Alterar `max-w-lg` para `max-w-4xl`.

### 8. Substituir edge function create-user
**Arquivo:** `supabase/functions/create-user/index.ts`
Substituicao completa com: validacao de senha (min 10 chars, letras + numeros), validacao de email, verificacao de que o admin pertence as empresas passadas, validacao do perfil, rollback automatico (deleta usuario em auth se etapas subsequentes falharem), CORS configuravel via env var `ALLOWED_ORIGIN`.

### 9. Bloquear auto-aprovacao de solicitacao de compra
**Arquivo:** `src/pages/compras/Solicitacoes.tsx` (linha ~226)
Adicionar condicao `s.solicitante_id !== user?.id` aos botoes de aprovar/rejeitar. Quando for o proprio solicitante, mostrar icone desabilitado com Tooltip explicativo. Adicionar imports de `Tooltip`, `TooltipTrigger`, `TooltipContent`.

### 10. Criar .env.example
**Arquivo novo:** `.env.example`
Template com `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` sem valores reais.

## Arquivos envolvidos

| Arquivo | Acao |
|---------|------|
| `src/components/layout/Topbar.tsx` | Remover "Meu Perfil", refatorar tema com next-themes |
| `src/App.tsx` | QueryClient config, ErrorBoundary, ThemeProvider |
| `src/components/ErrorBoundary.tsx` | Criar |
| `src/lib/supabase.ts` | Adicionar validacao de env vars (se aplicavel) |
| `src/hooks/useEmpresa.tsx` | Adicionar `semEmpresaVinculada` |
| `src/components/layout/AppLayout.tsx` | Fallback sem empresa + loading |
| `src/pages/rdo/Relatorios.tsx` | max-w-lg -> max-w-4xl |
| `supabase/functions/create-user/index.ts` | Substituir completamente |
| `src/pages/compras/Solicitacoes.tsx` | Bloquear auto-aprovacao |
| `.env.example` | Criar |

## Detalhes tecnicos
- `next-themes` ja instalado no projeto (^0.3.0)
- Edge function usa `SUPABASE_SERVICE_ROLE_KEY` (ja configurado como secret)
- Nenhuma migracao SQL necessaria nesta etapa
- Edge function sera redeployada automaticamente
- A validacao de env vars sera feita em `src/lib/supabase.ts` (re-export do client) para nao violar a regra de nao editar `src/integrations/supabase/client.ts`

