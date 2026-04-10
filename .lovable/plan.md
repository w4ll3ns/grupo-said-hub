
Revisei o problema e o diagnóstico ficou claro: o bloqueio atual não é mais de política de acesso. Eu confirmei que:

- seu usuário continua autenticado;
- seus vínculos com as empresas ainda existem;
- o perfil de sistema `Administrador` continua existindo e com permissões completas;
- o que sumiu foi o vínculo do seu usuário na tabela `usuario_perfis`, por isso `is_admin()` está retornando `false` e suas permissões vêm vazias.

## Plano de correção

### 1) Restaurar seu acesso agora
Vou fazer uma correção pontual no backend para recriar o vínculo do seu usuário com o perfil `Administrador` já existente.

Depois disso, vou validar:
- `is_admin()` voltando para `true`;
- carregamento de permissões novamente;
- retorno do acesso ao módulo de Administração.

### 2) Impedir novo auto-bloqueio no backend
Vou adicionar travas de segurança no banco para impedir que o próprio usuário autenticado:
- remova seu último vínculo com o perfil `Administrador`;
- fique sem nenhuma empresa vinculada;
- desative o próprio usuário.

Isso será feito com validações no backend, para a proteção valer mesmo se houver bug na interface.

### 3) Corrigir a tela de Usuários
Em `src/pages/admin/Usuarios.tsx`, vou:
- detectar quando o administrador estiver editando a si mesmo;
- bloquear a troca do próprio perfil para algo diferente de `Administrador`;
- bloquear salvar sem empresa vinculada;
- bloquear desativar o próprio usuário;
- substituir o fluxo atual de “deletar tudo e reinserir” por uma sincronização segura, para não perder o acesso no meio da operação;
- atualizar também as queries de permissões e empresas após salvar.

### 4) Alinhar o módulo administrativo nas permissões
Hoje há uma inconsistência: a matriz de permissões usa `admin`, mas o menu lateral verifica `administracao`.

Vou padronizar isso para um único identificador e alinhar:
- `src/components/layout/AppSidebar.tsx`
- `src/hooks/usePermissions.tsx`
- hooks ligados ao carregamento do contexto de acesso

Isso garante que os perfis de acesso administrativos funcionem de forma efetiva e consistente para todos os usuários.

## Arquivos envolvidos
- correção pontual de dados no backend
- migração SQL de proteção contra auto-bloqueio
- `src/pages/admin/Usuarios.tsx`
- `src/components/layout/AppSidebar.tsx`
- `src/hooks/usePermissions.tsx`
- `src/hooks/useAuth.tsx`
- `src/hooks/useEmpresa.tsx`

## Resultado esperado
- seu usuário volta a ser administrador;
- você não consegue mais remover seu próprio acesso por engano;
- vínculos usuário ↔ perfil ↔ empresa passam a ser respeitados corretamente;
- permissões administrativas ficam consistentes para perfis padrão e customizados.
