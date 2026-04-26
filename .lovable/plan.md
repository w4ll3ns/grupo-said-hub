## 🎯 Problema observado

Você tentou criar um "Novo Mapa de Cotação" para a **SC-2**, mas ela já tinha a **COT-2 (Materiais ABC, R$ 373)** pendente. A RPC bloqueou corretamente (não pode haver 2 propostas pendentes do mesmo fornecedor para a mesma SC), mas a interface não deixou isso claro **antes** de você preencher o form.

Além disso, ficou ambíguo "onde fica o mapa": fisicamente são as N linhas de `cotacoes` da mesma SC, mas a UI não mostra isso de forma agregada na listagem.

## 🧠 Decisão

**Mantemos o schema** (continua sendo 1 `cotacoes` por fornecedor). Vamos apenas:

1. Tornar o conceito de "Mapa" visível na **listagem `/compras/cotacoes`**.
2. Deixar o dialog **ciente do que já existe** para a SC selecionada.
3. Reaproveitar a tela de **Comparativo** como "página do mapa".

## 🎨 Mudanças de UX

### 1. Listagem `/compras/cotacoes` — agrupar por SC

Em vez de uma tabela "flat" com cada cotação solta, exibir **uma linha por SC** (collapsible):

```
▸ SC-2  •  3 itens  •  1 fornecedor cotado  •  Menor: R$ 373  •  Status: Em cotação
   └─ COT-2  Materiais ABC Ltda  R$ 373  [pendente]  [👁 itens] [✏️ editar] [🗑]
   └─ [+ Adicionar fornecedor ao mapa]   [📊 Abrir comparativo]

▸ SC-1  •  ...  •  1 fornecedor  •  R$ 3.500  •  Status: Concluída
   └─ COT-1  Materiais ABC Ltda  R$ 3.500  [aprovada]  → Pedido #1 (entregue)
```

Vantagem: você vê de imediato **quantos fornecedores já cotaram** cada SC e o que falta.

### 2. Dialog "Novo Mapa de Cotação" — ciente do estado da SC

Quando o usuário seleciona uma SC que **já tem propostas pendentes**, o dialog muda de modo:

- **Banner no topo:** *"Esta SC já tem 1 proposta cotada (Materiais ABC). Você pode adicionar novos fornecedores ao mapa existente."*
- O **select de fornecedor** dentro de cada card passa a **ocultar (ou desabilitar com badge "já cotou")** os fornecedores que já têm cotação pendente nesta SC.
- O título do botão muda para **"Adicionar ao Mapa"** quando já existem propostas, ou **"Criar Mapa"** quando é a primeira.

Isso elimina o erro 400 que você bateu — o usuário nunca consegue selecionar um fornecedor duplicado.

### 3. Botão "Editar mapa" → abre dialog em modo edição

Para cotações **pendentes**, permitir reabrir o card de uma proposta específica e ajustar preços/condições. Reaproveitamos `salvar_cotacao_com_itens` (que já faz upsert) — sem migration.

> Cotações **aprovadas/rejeitadas** ou já vinculadas a um pedido continuam **read-only** (proteção que já existe).

### 4. Renomear/reposicionar o botão "Adicionar fornecedor"

O `UserPlus` por linha que existe hoje passa a ficar **dentro do grupo da SC** (item 1), com label claro **"Adicionar fornecedor ao mapa"**, em vez de ícone solto fácil de não perceber.

### 5. Comparativo = "Página do Mapa"

Renomear o título da tela `/compras/cotacoes/comparativo/:id` de "Comparativo de Cotações" para **"Mapa de Cotação — SC-X"**, deixando explícito que aquela é a visão consolidada do mapa. Adicionar no topo:

- Botão **"+ Adicionar fornecedor"** (mesmo dialog de adição individual).
- Resumo: *"3 fornecedores cotados • Menor total: R$ X • Diferença: Y%"*.

## 🗄️ Backend

**Nenhuma migration nova.** A RPC `salvar_mapa_cotacao` já cobre o caso. Apenas o frontend precisa ler **antes** de abrir o dialog quais fornecedores já cotaram a SC selecionada (query simples em `cotacoes` por `solicitacao_id` + `status='pendente'`).

## 🧪 Verificação

1. Em `/compras/cotacoes`, a SC-2 aparece como linha agrupada mostrando "1 fornecedor cotado".
2. Expandir a SC-2 → ver COT-2 + botões "Adicionar fornecedor" / "Abrir comparativo".
3. Clicar em "Novo Mapa de Cotação" e selecionar SC-2 → banner aparece, Materiais ABC fica indisponível no select.
4. Adicionar um 2º fornecedor (ex: criar "Construfácil" antes) → salvar → ver SC-2 agora com "2 fornecedores cotados".
5. Abrir comparativo → ver os 2 lado a lado com badges de menor preço.
6. Tentar editar a COT-2 (pendente) → dialog reabre com os preços atuais, salvar funciona.
7. `npx tsc --noEmit` limpo.

## 📌 O que **não** muda

- Schema (`cotacoes`, `cotacao_itens`, `pedidos_compra`).
- RPCs `salvar_mapa_cotacao`, `salvar_cotacao_com_itens`, `aprovar_cotacao`, `gerar_pedido_compra`.
- Numeração COT-N por fornecedor (correto para auditoria).
- Tela de Comparativo (apenas ganha título e botão de adicionar).
