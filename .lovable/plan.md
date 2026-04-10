
# Fase 1 — Auth + Estrutura Base do "Gestão Grupo Said"

## Objetivo
Construir a fundação do sistema SaaS multiempresa: autenticação, estrutura de dados base, sistema de permissões e layout principal com sidebar e topbar.

---

## 1. Habilitar Lovable Cloud
- Ativar Supabase gerenciado para o projeto

## 2. Identidade Visual e Design System
- Paleta sóbria e profissional (será ajustada quando o usuário enviar a logo/cores)
- Dark mode com toggle
- Tipografia limpa, espaçamento generoso, locale pt-BR em toda a interface
- Configurar CSS variables e Tailwind para a paleta do sistema

## 3. Banco de Dados — Tabelas Estruturais
Criar migrações para as tabelas base com RLS por `empresa_id`:

- **empresas** — id, nome, cnpj, logo_url, ativa, created_at, updated_at
- **user_roles** (enum: admin, financeiro, compras, engenharia, solicitante) — tabela separada conforme boas práticas de segurança
- **perfis** — id, nome, descricao, empresa_id, created_at
- **perfil_permissoes** — perfil_id, modulo, funcionalidade, visualizar, criar, editar, excluir, aprovar
- **usuario_empresas** — user_id, empresa_id (vínculo multiempresa)
- **usuario_obras** — user_id, obra_id (preparar para módulo RDO)
- **profiles** — id (FK auth.users), nome, cargo, matricula, foto_url, ativo

RLS policies com security definer functions para isolamento por empresa.

## 4. Autenticação
- Tela de login com e-mail/senha (visual profissional, em português)
- Tela de cadastro (registro inicial)
- Reset de senha com página `/reset-password`
- Proteção de rotas autenticadas
- Hook `useAuth` para estado de sessão

## 5. Layout Principal
- **Sidebar** agrupada por módulos (Financeiro, RDO, Compras, Administração)
  - Itens visíveis apenas conforme permissões do usuário
  - Colapsável com ícones no modo mini
- **Topbar** com:
  - Seletor de empresa ativa
  - Seletor de período global
  - Ícone de notificações (placeholder)
  - Menu de perfil com foto, nome e logout
- Layout responsivo mobile-first

## 6. Sistema de Permissões
- Hook `usePermissions()` que consulta perfil_permissoes do usuário logado
- Controle de visibilidade de menus, botões e rotas no frontend
- Função `has_permission()` no Supabase (security definer) para RLS
- Perfis padrão pré-cadastrados: Administrador, Financeiro, Compras, Engenharia, Solicitante Básico

## 7. Módulo Administração (telas)
- **Gerenciamento de Empresas** — CRUD de empresas do grupo
- **Gerenciamento de Usuários** — CRUD com nome, e-mail, cargo, matrícula, foto, perfis, empresas vinculadas, status ativo/inativo
- **Gerenciamento de Perfis** — CRUD de perfis com matriz de permissões editável (checkboxes por módulo/funcionalidade)

## 8. Seeds Iniciais
- 2 empresas fictícias do Grupo Said
- 5 usuários com os 5 perfis padrão
- Permissões completas para cada perfil

## 9. Páginas placeholder dos módulos
- Dashboard Financeiro (placeholder)
- Dashboard RDO (placeholder)
- Dashboard Compras (placeholder)
- Essas serão implementadas nas próximas fases

---

**Resultado esperado:** Sistema funcional com login, controle de acesso completo, sidebar dinâmica por permissão, seletor de empresa e CRUD de usuários/perfis — pronto para receber os módulos operacionais nas próximas fases.
