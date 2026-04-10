

# Implementação da Página de Configurações

## Resumo

Criar uma página de configurações completa com 3 seções: dados cadastrais da empresa ativa, upload de logo, e preferências do sistema. Requer adicionar colunas à tabela `empresas` para armazenar dados cadastrais extras.

## Fase 1 — Migração de banco de dados

Adicionar colunas à tabela `empresas`:
- `email` (text, nullable)
- `telefone` (text, nullable)
- `endereco` (text, nullable)
- `cidade` (text, nullable)
- `estado` (text, nullable)
- `cep` (text, nullable)
- `inscricao_estadual` (text, nullable)
- `inscricao_municipal` (text, nullable)

Criar bucket de storage `empresa-logos` (público) com RLS para upload autenticado.

## Fase 2 — Página de Configurações (`src/pages/admin/Configuracoes.tsx`)

Reescrever com 3 tabs:

### Tab 1: Dados da Empresa
- Formulário com react-hook-form + zod
- Campos: nome, CNPJ, inscrição estadual/municipal, email, telefone, endereço, cidade, estado, CEP
- Pré-preenche com dados da `empresaAtiva`
- Salva via `supabase.from('empresas').update()`

### Tab 2: Logo da Empresa
- Preview da logo atual (ou placeholder)
- Input de upload de arquivo (imagem)
- Upload para bucket `empresa-logos` via Supabase Storage
- Atualiza `logo_url` na tabela `empresas`
- Botão de remover logo

### Tab 3: Preferências do Sistema
- Toggle de tema (claro/escuro) — já existe no Topbar, centralizar aqui
- Moeda padrão (BRL fixo por ora, mas campo preparado)
- Formato de data

## Arquivos modificados

| Arquivo | Ação |
|---------|------|
| Migração SQL | Adicionar colunas + bucket storage |
| `src/pages/admin/Configuracoes.tsx` | Reescrita completa |

## Detalhes técnicos
- Usa `useEmpresa()` para obter empresa ativa
- Upload via `supabase.storage.from('empresa-logos').upload()`
- URL pública via `getPublicUrl()`
- Segue padrão existente de forms com shadcn/ui Tabs + Card
- RLS do bucket: authenticated users que pertencem à empresa podem fazer upload

