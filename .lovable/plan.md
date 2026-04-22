

# Anexo de Nota Fiscal em Lançamentos

## Resumo
Adicionar campo opcional para upload de PDF da nota fiscal ao criar/editar lançamentos financeiros, com limite de 5 MB por arquivo.

## Alterações

### 1. Criar bucket de storage `notas-fiscais`
Migração SQL para criar o bucket com RLS permitindo upload/download para usuários autenticados que pertencem à empresa do lançamento.

### 2. Adicionar coluna `nota_fiscal_url` na tabela `lancamentos`
Migração SQL:
```sql
ALTER TABLE lancamentos ADD COLUMN nota_fiscal_url text;
```

### 3. Atualizar `LancamentosPage.tsx`
- Adicionar input de arquivo (aceitar apenas PDF, limite 5 MB validado no frontend)
- No submit, fazer upload do PDF para o bucket `notas-fiscais` com path `{empresa_id}/{lancamento_id}.pdf`
- Salvar a URL pública no campo `nota_fiscal_url`
- Na edição, mostrar link para visualizar o PDF já anexado e opção de substituir
- Na tabela, exibir ícone de clipe/link quando houver nota fiscal anexada

### 4. Atualizar tipo `Lancamento`
Incluir `nota_fiscal_url: string | null` no type local.

### 5. Atualizar tutoriais
Adicionar informação sobre o anexo de nota fiscal nos tutoriais de Lançamentos em `src/data/tutoriais.ts`.

## Arquivos envolvidos

| Arquivo | Acao |
|---------|------|
| Migração SQL | Criar bucket + coluna `nota_fiscal_url` |
| `src/pages/financeiro/LancamentosPage.tsx` | Upload de PDF + exibição |
| `src/data/tutoriais.ts` | Atualizar tutorial de Lançamentos |

## Detalhes técnicos
- Limite de 5 MB validado no frontend antes do upload (arquivo maior mostra toast de erro)
- Bucket `notas-fiscais` com acesso público para leitura (URLs diretas) e RLS para upload restrito a usuários autenticados da empresa
- Upload usa `supabase.storage.from('notas-fiscais').upload(...)` com `upsert: true`
- Aceita apenas `application/pdf`

