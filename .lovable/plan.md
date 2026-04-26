## 🎯 Problema confirmado

A tela `/compras/solicitacoes` hoje permite digitar **descrição livre** para cada item. Resultado:
- Catálogo de produtos (`/compras/catalogo`) está **desconectado** do fluxo real.
- Coluna `solicitacao_itens.produto_id` existe mas é **sempre `null`**.
- Mesmo material vira textos diferentes em SCs diferentes → cotações ficam incomparáveis e não há histórico de preço por produto.

## ✅ Decisão

**Item da SC = referência ao catálogo (com fallback para texto livre).**

- O caso comum (~95%) usa o produto do catálogo: descrição e unidade vêm prontas.
- O caso de exceção ("preciso de algo que não está cadastrado") permite um item avulso, mas com **CTA para cadastrar no catálogo na hora**, pelo próprio dialog.

## 🗄️ Backend

**Sem migration nova** — `solicitacao_itens.produto_id` já existe. Apenas vamos passar a preenchê-lo a partir do frontend.

(Se mais adiante quisermos tornar `produto_id` obrigatório, fazemos em um sprint separado depois de migrar os itens legados.)

## 🎨 Mudanças de UX em `Solicitacoes.tsx`

### 1. Cada linha de item ganha um seletor de produto

Substituir o `Input` de descrição por um **Combobox** (Command + Popover do shadcn) com:
- Busca por nome/categoria do catálogo (`produtos` filtrados por `empresa_id` + `ativo=true`).
- Ao selecionar um produto:
  - `produto_id` é setado.
  - `descricao` e `unidade` autopreenchem (a partir do catálogo) e ficam **read-only**.
  - Quantidade segue editável.
- Opção no fim da lista: **"+ Cadastrar novo produto…"** → abre um mini-dialog em cima com os campos do catálogo (nome, unidade, categoria), salva via `produtos` e já seleciona o recém-criado naquela linha.

### 2. Modo "item avulso" (escape hatch)

Toggle pequeno por linha: **"Item não cadastrado"**. Quando ligado:
- Combobox vira `Input` de descrição livre.
- `produto_id` fica `null`.
- Aparece dica: *"Considere cadastrar este item no catálogo."*

Mantém compatibilidade com SCs antigas e cobre urgência.

### 3. Tela de detalhes (View Dialog) e exibição

Onde hoje mostramos `item.descricao`, passar a mostrar:
- Nome do produto (via join `produto_id → produtos.nome`) **se existir**.
- Caso contrário, `descricao` (legado / item avulso) com badge cinza "Avulso".

Isso vale também para:
- `Solicitacoes.tsx` (View Dialog)
- `Cotacoes.tsx` (Mapa de Cotação — tabela de itens por fornecedor)
- `CotacoesComparativo.tsx` (linhas do comparativo)

### 4. Schema do form (Zod)

```ts
const itemSchema = z.object({
  produto_id: z.string().uuid().nullable(),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  quantidade: z.coerce.number().positive('Qtd > 0'),
  unidade: z.string().min(1),
  observacao: z.string().optional().or(z.literal('')),
}).refine(
  (v) => v.produto_id !== null || v.descricao.trim().length > 0,
  { message: 'Selecione um produto do catálogo ou marque como item avulso' }
);
```

### 5. Mutation `saveMutation`

Adicionar `produto_id` no payload de `solicitacao_itens.insert`:

```ts
const itensPayload = values.itens.map((item) => ({
  solicitacao_id: sol.id,
  produto_id: item.produto_id,           // ← novo
  descricao: item.descricao,
  quantidade: item.quantidade,
  unidade: item.unidade,
  observacao: item.observacao || null,
}));
```

### 6. Cache invalidation

Quando o usuário cadastra um produto novo a partir do mini-dialog dentro da SC, invalidar `['produtos', empresaAtiva.id]` para a lista atualizar imediatamente em todas as telas.

## 📌 O que **não** muda

- Schema do banco (nenhuma migration).
- RPCs do módulo de compras.
- Tela `/compras/catalogo` continua sendo o cadastro mestre.
- Cotações e Pedidos continuam ligados a `solicitacao_item_id` (não precisam saber de `produto_id` agora — o join é só para exibição).

## 🧪 Verificação

1. Em `/compras/solicitacoes`, clicar **Nova Solicitação**.
2. Numa linha de item, abrir o combobox → ver produtos do catálogo da empresa ativa.
3. Selecionar um produto → descrição e unidade preenchidas e travadas.
4. Adicionar segunda linha, clicar **"+ Cadastrar novo produto"** → criar "Areia média" → ver que aparece selecionada na linha.
5. Adicionar terceira linha, marcar **"Item não cadastrado"** → digitar descrição livre.
6. Salvar → conferir no detalhe da SC que os 3 itens aparecem corretamente (2 com nome do catálogo, 1 com badge "Avulso").
7. `npx tsc --noEmit` limpo.
