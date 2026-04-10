

# Correção de RLS no Módulo de Administração

## Problema identificado

O erro "new row violates row-level security policy for table usuario_perfis" ocorre porque as políticas RLS de várias tabelas administrativas não permitem que o administrador faça operações de escrita em registros de outros usuários.

### Tabelas com RLS insuficiente para admin

| Tabela | SELECT | INSERT/UPDATE/DELETE | Problema |
|--------|--------|---------------------|----------|
| `profiles` | OK (admin vê todos) | Apenas `id = auth.uid()` | Admin não consegue editar perfil de outro usuário |
| `usuario_perfis` | OK (admin vê todos) | Apenas via `is_admin()` no policy ALL | DELETE antes do INSERT pode falhar se policy não cobre corretamente |
| `usuario_empresas` | OK (admin vê todos) | Apenas via `is_admin()` no policy ALL | Mesmo problema |

O policy `ALL` com `is_admin(auth.uid())` deveria cobrir INSERT/UPDATE/DELETE, mas a ausência de `WITH CHECK` explícito pode causar falhas no INSERT. Vou verificar e corrigir.

## Plano de correção

### Migração SQL

1. **`profiles`** — Adicionar policy para admin poder fazer UPDATE em qualquer profile:
```sql
CREATE POLICY "Admins update all profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));
```

2. **`usuario_perfis`** — Substituir o policy ALL genérico por policies explícitas com `WITH CHECK` para garantir que INSERT funcione:
```sql
-- Drop existing ALL policy and recreate with explicit WITH CHECK
DROP POLICY "Admins manage perfil links" ON public.usuario_perfis;
CREATE POLICY "Admins manage perfil links"
ON public.usuario_perfis FOR ALL TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));
```

3. **`usuario_empresas`** — Mesmo tratamento:
```sql
DROP POLICY "Admins manage empresa links" ON public.usuario_empresas;
CREATE POLICY "Admins manage empresa links"
ON public.usuario_empresas FOR ALL TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));
```

### Código — Ajustes menores em `Usuarios.tsx`

- Corrigir a sincronização de estado (o padrão atual usando `useState` como efeito é bugado — substituir por `useEffect`)
- Garantir que as queries são invalidadas corretamente após save

### Resumo dos arquivos

| Arquivo | Ação |
|---------|------|
| Migração SQL | Corrigir RLS de `profiles`, `usuario_perfis`, `usuario_empresas` |
| `src/pages/admin/Usuarios.tsx` | Corrigir sync de estado com useEffect |

## Detalhes técnicos
- O problema principal é que policies `FOR ALL` sem `TO authenticated` usam role `public`, e o `auth.uid()` retorna null para requests não autenticados. Trocar para `TO authenticated` resolve.
- O policy de UPDATE do `profiles` precisa incluir admin override explícito.
- Sem alteração em Empresas.tsx ou Perfis.tsx — os problemas são exclusivamente de RLS.

