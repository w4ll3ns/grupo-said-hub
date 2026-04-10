

# Auditoria do Módulo de Administração

## Resultado por Página

| Página | Listagem | Criar | Editar | Excluir | Ativar/Desativar |
|--------|----------|-------|--------|---------|------------------|
| **Empresas** | OK | Botão sem ação | Sem edição | Sem exclusão | Sem toggle |
| **Usuários** | OK | Botão sem ação | Sem edição | Sem exclusão | Sem toggle |
| **Perfis** | OK | Botão sem ação | Sem edição | Sem exclusão | — |
| **Configurações** | — | — | OK (empresa ativa) | — | — |

Todos os botões "Nova Empresa", "Convidar Usuário" e "Novo Perfil" são decorativos — não abrem nenhum dialog nem executam ação. Nenhuma linha das tabelas tem botões de editar ou excluir. O administrador consegue apenas visualizar os registros.

## Plano de Implementação

### Fase 1 — Empresas (`Empresas.tsx`)
- **Criar**: Dialog com formulário (nome, CNPJ, email, telefone, endereço, cidade, estado, CEP) + insert na tabela `empresas` + insert em `usuario_empresas` para vincular o admin
- **Editar**: Botão de editar em cada card → mesmo dialog pré-preenchido → update
- **Ativar/Desativar**: Toggle no card para alterar `ativa` (sem excluir permanentemente, por integridade referencial)
- **Selecionar**: Clicar no card define como `empresaAtiva` via `setEmpresaAtiva()`

### Fase 2 — Usuários (`Usuarios.tsx`)
- **Editar**: Botão por linha → dialog para alterar nome, cargo, matrícula
- **Ativar/Desativar**: Toggle de `ativo` por linha
- **Atribuir Empresas**: Multi-select de empresas vinculadas (tabela `usuario_empresas`)
- **Atribuir Perfil**: Select de perfil vinculado (tabela `usuario_perfis`)
- Botão "Convidar" ficará desabilitado com tooltip explicando que o convite é feito pela tela de registro (não há invite flow via email no momento)

### Fase 3 — Perfis (`Perfis.tsx`)
- **Criar**: Dialog com nome, descrição, empresa (opcional) → insert em `perfis`
- **Editar**: Botão por linha → mesmo dialog pré-preenchido → update
- **Excluir**: Botão com confirmação (AlertDialog) → delete, apenas para perfis não-sistema
- **Gerenciar Permissões**: Ao clicar em um perfil, abrir dialog/painel com grid de checkboxes (módulo × funcionalidade × ações: visualizar/criar/editar/excluir/aprovar) que faz CRUD na tabela `perfil_permissoes`

### Fase 4 — Migração (se necessária)
- Nenhuma alteração de schema necessária. Todas as tabelas já existem com as colunas corretas
- RLS já está configurado para admin em todas as tabelas relevantes

## Arquivos modificados

| Arquivo | Ação |
|---------|------|
| `src/pages/admin/Empresas.tsx` | Reescrita com CRUD completo |
| `src/pages/admin/Usuarios.tsx` | Reescrita com edição + atribuição de perfis/empresas |
| `src/pages/admin/Perfis.tsx` | Reescrita com CRUD + grid de permissões |

## Detalhes técnicos
- Padrão: `react-hook-form` + `zod` + `useMutation` + `Dialog` (mesmo dos outros módulos)
- Permissões de perfis: grid com checkboxes renderizados dinamicamente a partir dos módulos/funcionalidades do sidebar
- Sem migração de banco — tudo já existe
- Import de `@/integrations/supabase/client` (corrigindo os imports atuais que usam `@/lib/supabase`)

