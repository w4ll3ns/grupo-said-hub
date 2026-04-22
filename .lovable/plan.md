

# Etapa 4: Storage buckets privados com signed URLs

## Resumo
Tornar os buckets `rdo-fotos` e `notas-fiscais` privados, converter URLs existentes em paths relativos, criar RLS de storage por empresa, e atualizar o frontend para usar signed URLs sob demanda. O bucket `empresa-logos` permanece publico.

## Alteracoes

### 1. Migration SQL
**Arquivo novo:** `supabase/migrations/20260422..._sprint0_private_storage.sql`

Conteudo exato fornecido no prompt:
- **A.** UPDATE em `lancamentos.nota_fiscal_url` e `rdo_fotos.url` para extrair apenas o path relativo (regexp_replace)
- **B.** `UPDATE storage.buckets SET public = false` para `rdo-fotos` e `notas-fiscais`
- **C.** DROP das policies publicas antigas + CREATE de 3 policies para `rdo-fotos` (SELECT, INSERT, DELETE) com isolamento por empresa via `storage.foldername(name)[1]`
- **D.** DROP das policies antigas + CREATE de 4 policies para `notas-fiscais` (SELECT, INSERT, UPDATE, DELETE) com isolamento por empresa

### 2. Helper de storage
**Arquivo novo:** `src/lib/storage.ts`

Funcoes `getSignedUrl(bucket, path, expiresInSeconds)` e `getPublicUrl(bucket, path)` conforme prompt.

### 3. Hook useSignedUrl
**Arquivo novo:** `src/hooks/useSignedUrl.ts`

Hook reativo que resolve path em signed URL, com cleanup e loading state.

### 4. LancamentosPage.tsx (2 mudancas)
**Arquivo:** `src/pages/financeiro/LancamentosPage.tsx`

- **Linha 158-166:** `uploadNotaFiscal` retorna `filePath` em vez de `publicUrl`
- **Linha 382-395:** Substituir `<a href={item.nota_fiscal_url}>` pelo componente `NotaFiscalLink` que gera signed URL on-click. Adicionar import de `getSignedUrl` e o componente inline.

### 5. RDOForm.tsx (2 mudancas)
**Arquivo:** `src/pages/rdo/RDOForm.tsx`

- **Linha 230-244:** `uploadPhotos` retorna `path` em vez de `publicUrl`
- **Linha 656:** Substituir `<img src={foto.url}>` pelo componente `RdoFotoPreview` que detecta blob/http (usa direto) vs path relativo (usa `useSignedUrl`). Adicionar imports e componentes inline.

### 6. fetchAndGenerateRDOPdf.ts
**Arquivo:** `src/utils/fetchAndGenerateRDOPdf.ts`

- **Linha 75:** Substituir o `.map` sincrono por `Promise.all` assincrono que converte paths relativos em signed URLs (1h de validade) antes de passar ao `generateRDOPdf`.

## Arquivos envolvidos

| Arquivo | Acao |
|---------|------|
| `supabase/migrations/...private_storage.sql` | Criar — migration completa |
| `src/lib/storage.ts` | Criar — helper getSignedUrl/getPublicUrl |
| `src/hooks/useSignedUrl.ts` | Criar — hook reativo |
| `src/pages/financeiro/LancamentosPage.tsx` | Upload retorna path + NotaFiscalLink component |
| `src/pages/rdo/RDOForm.tsx` | Upload retorna path + RdoFotoPreview component |
| `src/utils/fetchAndGenerateRDOPdf.ts` | Signed URLs para fotos no PDF |

## Detalhes tecnicos
- Migration e frontend devem sair no mesmo commit para evitar quebra atomica
- `empresa-logos` permanece publico — nao e tocado
- Signed URLs expiram em 10 min (default) para visualizacao e 1h para geracao de PDF
- Fallback defensivo para URLs `http*` antigas no PDF (caso regexp nao tenha pego algum registro)
- Nenhuma tabela nova criada, apenas policies de `storage.objects` e UPDATE de dados existentes

