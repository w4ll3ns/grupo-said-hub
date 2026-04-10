

# Cadastro de Usuários pelo Administrador

## Resumo
Criar uma edge function que usa a Admin API para criar usuários diretamente (sem confirmação de email), e adicionar um formulário na tela de Usuários para o admin cadastrar novos usuários com nome, email, senha, cargo, matrícula, perfil e empresas vinculadas.

## Fase 1 — Edge Function `create-user`

Criar `supabase/functions/create-user/index.ts`:
- Recebe: `email`, `password`, `nome`, `cargo`, `matricula`, `perfil_id`, `empresa_ids[]`
- Usa `SUPABASE_SERVICE_ROLE_KEY` para chamar `supabase.auth.admin.createUser()` com `email_confirm: true` (auto-confirma)
- Após criar o usuário, insere os vínculos em `usuario_perfis` e `usuario_empresas`
- Valida que o chamador é admin (verifica JWT do request)

## Fase 2 — UI no `Usuarios.tsx`

- Substituir o botão "Convidar Usuário" desabilitado por "Novo Usuário" funcional
- Dialog com campos: email, senha, nome, cargo, matrícula, perfil de acesso, empresas vinculadas
- Chama a edge function via `supabase.functions.invoke('create-user', ...)`
- Após sucesso, invalida queries e fecha dialog

## Fase 3 — Corrigir erros de build

Corrigir os erros de TypeScript em 4 arquivos onde `Record<string, unknown>` não é aceito pelo tipo do Supabase:
- `LancamentosPage.tsx`: tipar o payload explicitamente em vez de `Record<string, unknown>`
- `RDOForm.tsx`: mesmo tratamento
- `ContasBancarias.tsx`, `FormasPagamento.tsx`, `PlanoContas.tsx`: cast com `as any` nos inserts que misturam spread com `empresa_id`

## Arquivos envolvidos

| Arquivo | Ação |
|---------|------|
| `supabase/functions/create-user/index.ts` | Criar edge function |
| `src/pages/admin/Usuarios.tsx` | Adicionar dialog de criação |
| `src/pages/financeiro/LancamentosPage.tsx` | Corrigir tipo do payload |
| `src/pages/financeiro/ContasBancarias.tsx` | Corrigir tipo do insert |
| `src/pages/financeiro/FormasPagamento.tsx` | Corrigir tipo do insert |
| `src/pages/financeiro/PlanoContas.tsx` | Corrigir tipo do insert |
| `src/pages/rdo/RDOForm.tsx` | Corrigir tipo do payload |

## Detalhes técnicos
- A edge function usa `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')` (já disponível como secret)
- Verificação de admin: decodifica o JWT do header Authorization e chama `is_admin` via query
- `email_confirm: true` no `createUser` pula a verificação de email
- Senha definida pelo admin no momento do cadastro

