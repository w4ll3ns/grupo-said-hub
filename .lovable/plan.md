# Drag & drop no upload de anexos do Centro de Custo

## Resumo
Tornar a área de upload do `AnexosDialog` mais clara: dropzone com drag & drop, botão "Escolher arquivos" destacado, lista pré-envio dos arquivos selecionados (com tamanho e remoção individual) e feedback visual ao arrastar.

## Alterações

### `src/pages/financeiro/CentrosCusto.tsx` (apenas o componente `AnexosDialog`)

**State adicionado**
- `selectedFiles: File[]` — substitui a leitura direta de `fileRef.current?.files`, permitindo mostrar e remover itens antes de enviar.
- `isDragging: boolean` — controla o highlight visual da dropzone.

**Nova dropzone (substitui o `<Input type="file">` cru)**
- Bloco com `border-2 border-dashed`, padding generoso, `rounded-lg`, ícone `UploadCloud` grande centralizado.
- Texto principal: "Arraste arquivos aqui" + secundário: "PDF, JPG, PNG ou WEBP — até 10 MB cada".
- Botão **"Escolher arquivos"** destacado (variant `default`) que dispara o input file oculto via `fileRef.current?.click()`.
- Handlers: `onDragEnter`, `onDragOver` (preventDefault + `setIsDragging(true)`), `onDragLeave`, `onDrop` (preventDefault, lê `e.dataTransfer.files`, valida e adiciona a `selectedFiles`).
- Quando `isDragging`, troca classes para `border-primary bg-primary/5`.
- Input `<input type="file" hidden multiple accept=...>` permanece para fallback de clique; `onChange` adiciona ao state e limpa `value` (para permitir reselecionar o mesmo nome).

**Validação imediata na seleção**
- Ao adicionar arquivos (drop ou clique), validar tamanho (`MAX_BYTES`) e MIME (`ACCEPTED_MIMES`) no momento, com `toast.error` por arquivo inválido — só os válidos entram em `selectedFiles`.

**Lista de arquivos a enviar**
- Abaixo da dropzone, quando `selectedFiles.length > 0`, lista compacta: ícone `FileText`, nome truncado, tamanho formatado e botão `X` (variant `ghost`) para remover individualmente.
- Texto-resumo: `{n} arquivo(s) selecionado(s) — {tamanho total}`.

**Campo descrição e botão Enviar**
- Mantém o `Input` de descrição (opcional, aplicada a todos).
- Botão "Enviar" passa a consumir `selectedFiles` ao invés de `fileRef.current?.files`; desabilitado quando `selectedFiles.length === 0` ou `uploading`.
- `reset()` também limpa `selectedFiles`.

**Imports**
- Adicionar `UploadCloud` e `X` de `lucide-react`.

## Não muda
- Migration, RLS, bucket, validações de servidor, tipos do Supabase.
- Lógica de upload em si (`uploadMutation`), tamanho máximo (10 MB), MIMEs aceitos.
- Nenhum outro arquivo é alterado.

## Arquivos envolvidos
| Arquivo | Ação |
|---|---|
| `src/pages/financeiro/CentrosCusto.tsx` | Refatorar UI do `AnexosDialog` (dropzone + lista de selecionados) |
