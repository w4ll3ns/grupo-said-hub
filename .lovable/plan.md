

# Corrigir vinculação do usuário e testar módulo financeiro

## Problema identificado
O usuário `wallen.santiago@live.com` (id: `342aaaf2-6052-42b1-af34-39f981806573`) **nao esta vinculado a nenhuma empresa nem perfil**. As tabelas `usuario_empresas` e `usuario_perfis` estao vazias. Isso faz com que:
- A sidebar apareca sem itens de menu
- As queries de empresas retornem `[]` (bloqueadas por RLS)
- O seletor de empresa na topbar fique vazio

As tabelas financeiras estao corretamente populadas (20 receitas, 32 despesas, 6 contas bancarias, 12 formas de pagamento, 8 centros de custo).

## Plano

### 1. Migração: vincular usuario as empresas e ao perfil Administrador
Criar uma migração SQL que:
- Insere `usuario_empresas` vinculando o usuario `342aaaf2-...` as duas empresas (Said Engenharia e Said Incorporacoes)
- Insere `usuario_perfis` vinculando o usuario ao perfil Administrador (`b1111111-...`)
- Tambem vincular o usuario `teste@gruposaid.com` (`ba0332d1-...`) da mesma forma

### 2. Testar navegacao no modulo financeiro
Apos a migracao, usar o browser para:
- Verificar que a sidebar agora exibe os itens do modulo Financeiro
- Navegar ate Plano de Contas e verificar as abas Receitas/Despesas
- Navegar ate Contas Bancarias e verificar a listagem
- Navegar ate Formas de Pagamento e verificar a listagem
- Navegar ate Centros de Custo e verificar a listagem

## Detalhes tecnicos
A migracao usara `INSERT INTO ... ON CONFLICT DO NOTHING` para ser idempotente. Nenhuma alteracao de codigo frontend e necessaria — o problema e exclusivamente de dados.

