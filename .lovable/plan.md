# Anexos múltiplos (contratos) em Centros de Custo

## Resumo
Permitir que cada Centro de Custo tenha **um ou mais anexos** (tipicamente contratos em PDF, mas aceitando também imagens). Diferente de `lancamentos.nota_fiscal_url` que é 1:1, aqui usamos uma tabela dedicada `centro_custo_anexos` (1:N) para suportar múltiplos arquivos. Reaproveita a infraestrutura de bucket privado + signed URLs já estabelecida na Etapa 4.

## Arquitetura

### 1. Novo bucket privado: `centro-custo-anexos`
Mesmo padrão dos buckets `rdo-fotos` e `notas-fiscais`:
- `public = false`
- Path layout: `{empresa_id}/{centro_custo_id}/{uuid}.{ext}`
- RLS de storage por empresa via `storage.foldername(name)[1]`

### 2. Nova tabela: `centro_custo_anexos`
| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | gen_random_uuid |
| `centro_custo_id` | uuid NOT NULL | FK para centros_custo ON DELETE CASCADE |
| `empresa_id` | uuid NOT NULL | redundante para RLS performática |
| `nome_arquivo` | text NOT NULL | nome original |
| `path` | text NOT NULL | path no bucket |
| `tamanho_bytes` | bigint | metadado |
| `tipo_mime` | text | application/pdf, image/png... |
| `descricao` | text | rótulo opcional (ex: "Aditivo 1") |
| `created_at` | timestamptz | now() |
| `created_by` | uuid | auth.uid() |

RLS espelhando o padrão de `centros_custo`:
- View: `user_belongs_to_empresa + has_permission('financeiro','centros_custo','visualizar')`
- Create: idem com `'criar'`
- Delete: idem com `'editar'` (anexos não têm permissão própria — quem edita o centro pode gerenciar anexos)
- Admin bypass via `is_admin(auth.uid())`

Index em `(centro_custo_id)` para listagem rápida.

## Alterações

### 1. Migration SQL — `..._centro_custo_anexos.sql`
- Cria bucket `centro-custo-anexos` com `public = false`
- Cria tabela `centro_custo_anexos` com FK CASCADE
- Habilita RLS e cria 4 policies (SELECT/INSERT/DELETE + Admin ALL)
- Cria policies de `storage.objects` para o novo bucket (SELECT/INSERT/DELETE) com isolamento por empresa
- Index em `centro_custo_id`

### 2. `src/lib/storage.ts` e `src/hooks/useSignedUrl.ts`
- Estender o tipo `Bucket` para incluir `'centro-custo-anexos'`
- Funções permanecem genéricas, sem mudanças de lógica

### 3. Reescrever `src/pages/financeiro/CentrosCusto.tsx`
- Nova query `centro_custo_anexos` filtrada pela empresa
- Nova coluna **"Anexos"** mostrando contagem por centro (ex: "3 arquivo(s)") ou "—"
- Substituir botão único por dois: **Editar** (lápis) e **Anexos** (paperclip)
- Componente inline `AnexosDialog`:
  - Lista anexos do centro com nome, descrição, tamanho, data
  - Cada item: botão **Visualizar** (signed URL on-click → nova aba) e **Excluir** (AlertDialog → remove storage + tabela)
  - Input `<input type="file" multiple accept="application/pdf,image/*">` + descrição opcional
  - Mutation `uploadAnexos`: upload no bucket → INSERT na tabela com metadados
  - Mutation `deleteAnexo`: storage delete → tabela delete
  - Validação client: máx 10 MB/arquivo; tipos PDF/JPG/PNG/WEBP
- Toast de feedback e invalidate de `['centro_custo_anexos']`

### 4. Cleanup de arquivos órfãos
**Não implementado nesta etapa.** Ao deletar um centro, registros caem por CASCADE mas arquivos ficam órfãos no storage. Decisão consciente para manter escopo; pode ser job futuro.

## Arquivos envolvidos

| Arquivo | Ação |
|---|---|
| `supabase/migrations/..._centro_custo_anexos.sql` | Criar |
| `src/lib/storage.ts` | Estender tipo Bucket |
| `src/hooks/useSignedUrl.ts` | Estender tipo Bucket |
| `src/pages/financeiro/CentrosCusto.tsx` | Adicionar coluna Anexos + AnexosDialog |

## Detalhes técnicos
- Reaproveita 100% da infra de buckets privados + signed URLs (10 min)
- FK CASCADE garante integridade referencial automática
- Permissão de anexos amarrada a `editar centro de custo` — não cria entrada nova na matriz
- Tipos TS regenerados automaticamente após migration
- Impacto isolado: nenhuma outra tela afetada