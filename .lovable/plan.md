## 🐞 Diagnóstico

A SC-2 **existe e está corretamente `aprovada`** no banco (verificado via SQL), e o filtro do select em `Cotacoes.tsx` busca status `aprovada` e `cotacao` — então a lógica está certa.

O problema é **invalidação de cache do React Query**:

- A query do select usa `queryKey: ['solicitacoes_aprovadas', empresaAtiva?.id]` (linha 85 de `Cotacoes.tsx`).
- **Nenhuma mutation no projeto invalida essa chave.** As mutations de aprovação em `Solicitacoes.tsx` invalidam apenas `['solicitacoes_compra']`, e o `saveMutation` em `Cotacoes.tsx` também não toca em `solicitacoes_aprovadas`.
- Resultado: depois de aprovar a SC-2, a tela de Cotações continua exibindo o cache antigo (sem a SC-2) até expirar o stale time padrão ou o usuário recarregar a página.

Há também o caso espelhado em `Pedidos.tsx`: a query `['cotacoes_aprovadas']` é invalidada no `gerarPedidoMutation`, mas não quando uma cotação é aprovada em `Cotacoes.tsx` (a `aprovarMutation` na linha 157 já invalida `['cotacoes_aprovadas']` ✅, então esse caminho está ok). Vamos garantir consistência.

## ✅ Correções (1 arquivo)

### `src/pages/compras/Cotacoes.tsx`

1. **`saveMutation.onSuccess`** (criar cotação) — adicionar:
   ```ts
   qc.invalidateQueries({ queryKey: ['solicitacoes_aprovadas'] });
   ```
   (Para que a SC saia da lista quando virar `cotacao`.)

### `src/pages/compras/Solicitacoes.tsx`

2. **`approveMutation.onSuccess`** (aprovar/rejeitar SC) — adicionar:
   ```ts
   qc.invalidateQueries({ queryKey: ['solicitacoes_aprovadas'] });
   ```
   (Para que a SC recém-aprovada apareça imediatamente em Cotações sem refresh.)

### Bonus de robustez (opcional mas recomendado)

3. Em `Cotacoes.tsx`, adicionar `refetchOnWindowFocus: true` (ou reduzir `staleTime`) na query `solicitacoes_aprovadas`, para que a lista atualize ao voltar para a aba — defesa em profundidade caso outro fluxo futuro mude o status sem invalidar o cache.

## 🧪 Verificação pós-correção

1. Criar SC-3 → aprovar em /compras/solicitacoes.
2. Navegar para /compras/cotacoes → clicar "Nova Cotação" → SC-3 deve aparecer **imediatamente** no select.
3. Salvar cotação → reabrir o dialog → SC-3 não deve mais aparecer (status virou `cotacao`, mas continua elegível ✅ — ainda aparece, correto, pois o filtro inclui `cotacao` para permitir múltiplas cotações da mesma SC).
4. Rodar `npx tsc --noEmit` para garantir build limpo.

## 📌 Sobre a SC-2 atual

Após aplicar a correção, basta **recarregar a página** uma vez (F5) para que a SC-2 apareça — não há nada de errado com os dados dela.