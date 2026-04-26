## 🎯 Objetivo

Substituir o fluxo atual ("uma cotação por vez, um fornecedor por vez") por um **Mapa de Cotação** unificado: o usuário seleciona a SC **uma única vez**, adiciona **N fornecedores** e seus respectivos preços por item, e salva tudo em uma só operação.

## 🧠 Decisão de arquitetura

**Mantemos o schema atual** (1 registro `cotacoes` por fornecedor + `cotacao_itens`). Mudamos apenas a **UX de entrada** e adicionamos **uma RPC bulk** que cria várias cotações de uma vez atomicamente.

**Por quê:**
- O comparativo (`CotacoesComparativo.tsx`), os triggers (`recalc_cotacao_valor_total`, `protect_cotacao_with_pedido`), e as RPCs (`aprovar_cotacao`, `gerar_pedido_compra`) continuam funcionando sem mudanças.
- O pedido sempre vai para **um único fornecedor**, então `pedidos_compra.cotacao_id` (apontando para a proposta vencedora) continua semanticamente correto.
- Cada proposta de fornecedor mantém seu próprio status (`pendente`/`aprovada`/`rejeitada`), histórico, validade e condições — necessário para auditoria.
- Zero migration destrutiva, zero retrabalho do que foi feito nas Sprints 1 e 2.

## 🗄️ Backend (1 migration)

### Nova RPC `salvar_mapa_cotacao(_solicitacao_id, _empresa_id, _fornecedores jsonb)`

Recebe um array JSONB onde cada elemento representa **um fornecedor com seus itens precificados**:
```json
[
  {
    "fornecedor_id": "uuid",
    "data_validade": "2026-05-15",
    "condicao_pagamento": "30 dias",
    "prazo_entrega": "5 dias úteis",
    "observacoes": "...",
    "itens": [
      { "solicitacao_item_id": "uuid", "quantidade": 10, "valor_unitario": 25.50 },
      ...
    ]
  },
  ...
]
```

**Comportamento (transacional):**
1. Valida permissão (`compras.cotacoes.criar`) e empresa.
2. Valida que a SC existe e está em status `aprovada` ou `cotacao`.
3. Valida que cada fornecedor tem ≥1 item com `valor_unitario > 0`.
4. Bloqueia duplicidade: se já existir cotação **pendente** do mesmo fornecedor para esta SC, retorna erro claro (`Fornecedor X já possui cotação pendente nesta solicitação`).
5. Para cada fornecedor no array, internamente reusa a lógica de `salvar_cotacao_com_itens` (insere `cotacoes` + `cotacao_itens`; o trigger já recalcula `valor_total`).
6. Garante que a SC avança para `cotacao` se estava em `aprovada`.
7. Retorna array de IDs criados.

**Vantagem chave:** atômica — se 1 fornecedor falhar (validação, etc), nenhuma cotação é criada.

> A RPC `salvar_cotacao_com_itens` continua existindo para o caso de **adicionar mais um fornecedor depois** (ver fluxo abaixo).

## 🎨 Frontend

### 1. `Cotacoes.tsx` — Refatorar dialog "Nova Cotação" → "Novo Mapa de Cotação"

**Novo layout do dialog:**
- **Topo:** seleção da SC (1x) + carregamento automático dos itens da SC.
- **Seção "Fornecedores"**: lista de cards/abas, cada uma representando um fornecedor.
  - Botão **"+ Adicionar fornecedor"** abre um novo card.
  - Cada card contém: select de fornecedor, validade, condição de pagamento, prazo de entrega, observações, e a **mesma tabela de itens** (com os itens da SC já carregados, faltando preencher `valor_unitario`).
  - Botão **"× Remover fornecedor"** em cada card (mín. 1).
- **Rodapé do dialog:** mostra resumo "**3 fornecedores** • Menor total: R$ 4.250,00 • Maior total: R$ 5.100,00".
- **Botão "Salvar Mapa de Cotação"** chama a nova RPC `salvar_mapa_cotacao`.

**Validações no form (Zod):**
- Mín. 1 fornecedor.
- Cada fornecedor com mín. 1 item, todos com `valor_unitario > 0`.
- Não permitir o mesmo `fornecedor_id` duas vezes no mesmo mapa (UI bloqueia + RPC valida).

**Estado do form:** estrutura aninhada `{ solicitacao_id, fornecedores: [{ fornecedor_id, ..., itens: [...] }] }` usando `useFieldArray` aninhado.

### 2. Listagem de cotações — Agrupamento visual por SC

Hoje a tabela mostra cada `cotacoes` como linha solta. Vamos manter, mas adicionar:
- **Botão "Adicionar fornecedor"** ao lado de cada SC (visível para SCs em `cotacao` que ainda não tenham pedido) → abre um dialog menor reusando `salvar_cotacao_com_itens` para incluir UM novo fornecedor sem refazer todo o mapa.
- O link da SC já leva ao `Comparativo` (já implementado), que continua sendo a visão consolidada.

### 3. `Solicitacoes.tsx` — Botão "Cotar" muda para "Abrir Mapa de Cotação"

Quando a SC está em `aprovada` ou `cotacao`, o botão leva direto para `/compras/cotacoes` com a SC pré-selecionada e o dialog aberto (via query param `?sc=<id>`).

### 4. `CotacoesComparativo.tsx` — sem mudança estrutural

Continua funcionando exatamente como está, pois consome `cotacoes` + `cotacao_itens` agrupados por SC. Apenas se beneficia de ter mais propostas para comparar.

## 🧪 Verificação pós-implementação

1. Criar SC-3 com 3 itens → aprovar.
2. Em /compras/cotacoes → "Novo Mapa de Cotação" → selecionar SC-3 → adicionar 3 fornecedores com preços diferentes → salvar.
3. Confirmar que aparecem 3 linhas COT-X, COT-Y, COT-Z na tabela, todas vinculadas à SC-3.
4. Abrir Comparativo da SC-3 → verificar lado a lado e badges de menor preço.
5. Aprovar uma → confirmar que as outras 2 viram `rejeitada` automaticamente (RPC `aprovar_cotacao` já faz isso).
6. Tentar adicionar fornecedor duplicado → deve falhar com mensagem clara.
7. `npx tsc --noEmit` limpo.

## 📌 O que **não** muda

- Schema das tabelas `cotacoes`, `cotacao_itens`, `pedidos_compra`.
- RPCs `aprovar_cotacao`, `gerar_pedido_compra`, `concluir_pedido`.
- Triggers de proteção e recálculo.
- Numeração sequencial COT-N (cada fornecedor ainda recebe seu número, o que é correto para rastreabilidade).
