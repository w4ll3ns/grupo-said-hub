# Sprint Compras Etapa 2 — Itens de cotação + Comparativo

## Contexto
Sprint 1 fechou as transições de status (SC ↔ COT ↔ PED). Restaram 3 furos do diagnóstico original:

- **#9 Itens da cotação**: tabela `cotacao_itens` existe e está vazia. Hoje o comprador digita só um `valor_total` "no escuro", sem rastro item-a-item. Não dá para auditar nem comparar.
- **#10 Comparativo de cotações**: sem tela para colocar 2+ cotações da mesma SC lado a lado. Aprovação é palpite.
- **#11 Integração com Financeiro** (pedido entregue → contas a pagar): fica para Sprint 3 — exige decisão sobre centro de custo / plano de contas / conta default.

Esta sprint resolve **#9 e #10**.

---

## Escopo

### 1. Refatorar criação/edição de cotação para incluir itens

**`src/pages/compras/Cotacoes.tsx`** — ao escolher a SC no form:
- Carregar automaticamente os `solicitacao_itens` da SC.
- Tabela editável: descrição/quantidade/unidade vindos da SC (read-only) + **valor unitário** (input) + total da linha calculado.
- `valor_total` da cotação = soma das linhas (read-only). Remover input manual.
- Validação: todos os itens precisam ter unitário > 0.

**Persistência**: nova RPC `salvar_cotacao_com_itens(_cotacao jsonb, _itens jsonb)`:
- INSERT em `cotacoes` + bulk INSERT em `cotacao_itens` numa transação.
- Em edição: UPDATE da cotação + DELETE/INSERT dos itens — só permitido se status = `pendente`.
- `SECURITY DEFINER`, valida permissão `compras.cotacoes.criar`/`editar` e empresa do usuário.

### 2. Tela de comparativo de cotações

Nova rota **`/compras/cotacoes/comparativo/:solicitacaoId`** acessada por:
- Botão "Comparar cotações" em SCs com status `cotacao` em `Solicitacoes.tsx`.
- Botão equivalente na listagem de Cotações.

**Layout** (`src/pages/compras/CotacoesComparativo.tsx`):
- Header: número e descrição da SC + voltar.
- Tabela pivot: linhas = itens da SC; colunas = uma por cotação/fornecedor. Célula mostra unitário e total da linha.
- Última linha: **total da cotação** + condição de pagamento + prazo de entrega.
- Destaque do menor unitário por linha (verde) e badge "Menor preço total" na coluna vencedora.
- Botão "Aprovar esta cotação" em cada coluna (chama `aprovar_cotacao` da Sprint 1), desabilitado se já houver aprovada.
- Status da cotação visível no topo de cada coluna.

### 3. Ajustes complementares

- **Listagem de cotações**: coluna "Itens" com contagem.
- **"Ver itens"**: dialog ou linha expansível na listagem.
- **Gerar pedido**: dialog mostra itens herdados da cotação (read-only) para conferência.

### 4. Reconciliação

- COT-1 (legacy, sem itens) fica como está — pedido já entregue, SC concluída.
- UI lida com cotações sem itens (mostra "—" e esconde "Ver itens").

---

## Fora desta sprint

- **Integração Financeiro (#11)**: vira Sprint 3.
- **Edição de itens em cotação aprovada**: bloqueado de propósito.
- **Anexo de proposta do fornecedor (PDF)**: pode ser próximo passo.

## Detalhes técnicos

- RPC recebe JSONB (cotação + array de itens) para evitar N round-trips.
- `cotacao_itens.solicitacao_item_id` é a FK natural — não duplico descrição/quantidade.
- Trigger novo `recalc_cotacao_valor_total` em `cotacao_itens` (AFTER INSERT/UPDATE/DELETE) mantém `cotacoes.valor_total` coerente mesmo contra edição manual via SQL.
- Comparativo: única query com `cotacoes` + `cotacao_itens` + `solicitacao_itens` + `fornecedores` filtrado por `solicitacao_id`.
- Tipos TS regenerados após a migration.