

# Área de Tutoriais do Sistema

## O que será feito
Criar uma seção "Tutoriais" no menu lateral, acessível a todos os usuários, com documentação passo-a-passo de todas as funcionalidades do sistema. O conteúdo será escrito com base no código real de cada página.

## Estrutura

### 1. Arquivo de dados `src/data/tutoriais.ts`
Conteúdo centralizado com tutoriais organizados por módulo. Cada tutorial terá:
- Titulo e descrição
- Passos numerados explicando o fluxo completo
- Dicas e observações relevantes

Cobertura completa:

**Financeiro** (12 tutoriais): Dashboard, Lançamentos (abas Pagar/Receber), Contas a Pagar, Contas a Receber, Transferências, Fluxo de Caixa, DRE, Metas, Plano de Contas, Contas Bancárias, Formas de Pagamento, Centros de Custo

**RDO** (5 tutoriais): Dashboard, Relatórios Diários (criar, editar, gerar PDF), Obras, Funcionários, Equipamentos

**Compras** (6 tutoriais): Dashboard, Solicitações (criar, aprovar/rejeitar, enviar), Cotações, Pedidos, Fornecedores, Catálogo

**Administração** (4 tutoriais): Empresas, Usuários (criar, editar, vincular perfis/empresas, proteção contra auto-bloqueio), Perfis (permissões por módulo), Configurações

**Acesso ao sistema** (3 tutoriais): Login, Recuperação de senha, Troca de empresa ativa

### 2. Página `src/pages/Tutoriais.tsx`
- Accordion por módulo com ícone e badge de quantidade
- Cards dentro de cada módulo com título, descrição e passos
- Campo de busca para filtrar tutoriais por texto
- Usa componentes existentes: Accordion, Card, Badge, Input

### 3. Menu lateral `AppSidebar.tsx`
- Item fixo "Tutoriais" no final do sidebar (ícone BookOpen)
- Sem controle de permissão — visível para todos

### 4. Rota `App.tsx`
- `/tutoriais` dentro das rotas protegidas

## Arquivos envolvidos

| Arquivo | Ação |
|---------|------|
| `src/data/tutoriais.ts` | Criar — ~30 tutoriais com passo-a-passo |
| `src/pages/Tutoriais.tsx` | Criar — página com busca + accordion |
| `src/components/layout/AppSidebar.tsx` | Adicionar item fixo "Tutoriais" |
| `src/App.tsx` | Adicionar rota `/tutoriais` |

## Detalhes técnicos
- Conteúdo 100% estático no frontend — sem banco de dados
- Arquivo de dados separado para facilitar manutenção futura
- Cada modificação de fluxo no sistema deverá atualizar o tutorial correspondente em `src/data/tutoriais.ts`

