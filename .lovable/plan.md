# Compras → Financeiro: gerar Conta a Pagar a partir do Pedido

## 🎯 Problema

Hoje o módulo de **Compras** termina no Pedido (PED-N). Quando o pedido é entregue, alguém precisa **manualmente** criar um lançamento em **Contas a Pagar** com o mesmo valor, fornecedor e descrição. Isso gera:
- Retrabalho e risco de divergência (valor pago ≠ valor do pedido).
- Sem rastreabilidade: olhando uma conta a pagar, não dá pra saber de qual SC/Pedido ela veio.
- Sem visibilidade no caminho contrário: olhando o Pedido, não dá pra saber se já foi pago.

## ✅ Decisão

**Pedido de Compra gera (1..N) Contas a Pagar atreladas a ele**, com link bidirecional.

- **1 pedido → 1 lançamento** no caso comum (à vista).
- **1 pedido → N lançamentos** quando o usuário escolhe parcelar (ex.: 30/60/90).
- O usuário **decide quando gerar** (ação explícita "Gerar Contas a Pagar" no Pedido) — não automático no `entregue`, porque NF e prazo nem sempre batem com a entrega.
- **Idempotente**: se já houver contas geradas para o pedido, o botão muda para "Ver contas a pagar" e bloqueia geração duplicada.

## 🗄️ Backend

### Migration

1. **Nova coluna em `lancamentos`**:
   ```sql
   ALTER TABLE public.lancamentos
     ADD COLUMN pedido_compra_id uuid NULL;
   CREATE INDEX idx_lancamentos_pedido_compra_id
     ON public.lancamentos(pedido_compra_id)
     WHERE pedido_compra_id IS NOT NULL;
   ```
   Sem FK rígida (segue padrão do projeto), mas com índice para os joins.

2. **Nova RPC `gerar_contas_pagar_pedido`**:
   ```
   gerar_contas_pagar_pedido(
     _pedido_id uuid,
     _parcelas jsonb,           -- [{ valor, data_vencimento, descricao? }, ...]
     _plano_despesa_id uuid,    -- categoria do plano de contas (obrigatório)
     _centro_custo_id uuid,     -- opcional
     _forma_pagamento_id uuid,  -- opcional
     _conta_bancaria_id uuid,   -- opcional
     _observacoes text          -- opcional
   ) RETURNS uuid[]
   ```
   Comportamento (security definer):
   - Valida permissão: `is_admin` OU `user_belongs_to_empresa` + `has_permission('financeiro','contas_pagar','criar')`.
   - Valida que o pedido existe, pertence à empresa do usuário e **não está cancelado**.
   - Valida que `SUM(parcelas.valor) = pedido.valor_total` (tolerância 0,01).
   - Valida que **ainda não existem lançamentos não-cancelados** com `pedido_compra_id = _pedido_id` (idempotência).
   - Para cada parcela, faz `INSERT` em `lancamentos` com:
     - `tipo='pagar'`, `status='pendente'`
     - `descricao` = `"PED-{numero} — {razao_social}" + " (X/N)"` quando >1 parcela.
     - `valor`, `data_vencimento` (da parcela), `data_emissao = CURRENT_DATE`.
     - `pedido_compra_id = _pedido_id`, `empresa_id = pedido.empresa_id`.
     - `plano_despesa_id`, `centro_custo_id`, `forma_pagamento_id`, `conta_bancaria_id`, `observacoes`.
   - Retorna o array de IDs criados.

   *(Mantém a regra do trigger `validate_lancamento_plano`: `plano_despesa_id` permitido porque `tipo='pagar'`.)*

## 🎨 Frontend

### `src/pages/compras/Pedidos.tsx`

1. **Nova coluna "Financeiro"** na tabela:
   - Badge **"A gerar"** (cinza) se pedido sem lançamentos.
   - Badge **"Pendente"** (outline) se há lançamentos mas nem todos `pago`.
   - Badge **"Pago"** (default verde) se todos lançamentos vinculados estão `pago`.
   - Não exibido quando `status='cancelado'`.

   Para alimentar isso, query passa a incluir `lancamentos!pedido_compra_id(id,status,valor)`.

2. **Novo botão de ação por linha**:
   - Sem lançamentos: ícone `DollarSign` → abre **Dialog "Gerar Contas a Pagar"**.
   - Com lançamentos: ícone `Receipt` → navega para `/financeiro/contas-pagar?pedido={id}`.
   - Bloqueado quando `status='cancelado'`.

3. **Novo Dialog `GerarContasPagarDialog`** (subcomponente local):
   - Cabeçalho: `PED-N`, fornecedor, valor total.
   - **Modo parcelamento** (radio):
     - **À vista** → 1 parcela, vencimento default = `data_entrega_prevista` ou hoje + 30d.
     - **Parcelado** → input "Nº de parcelas" (2..12) + intervalo em dias (default 30) + data da 1ª parcela. Gera lista editável.
   - **Lista de parcelas editável**: cada linha com `data_vencimento` (DatePicker) e `valor`. Soma destacada no rodapé com indicador verde se = total / vermelho se diverge.
   - **Campos abaixo**: `plano_despesa_id` obrigatório (Select); opcionais: `centro_custo_id`, `forma_pagamento_id`, `conta_bancaria_id`, `observacoes`.
   - Botão "Gerar" chama `supabase.rpc('gerar_contas_pagar_pedido', {...})`.
   - Em sucesso: toast "N contas a pagar geradas", invalida `['pedidos_compra']` e `['lancamentos']`, fecha dialog.

### `src/pages/financeiro/LancamentosPage.tsx` (somente quando `tipo='pagar'`)

1. **Filtro por query param** `?pedido={id}`: aplica `eq('pedido_compra_id', id)` e mostra chip removível: *"Filtrando por PED-N — limpar"*.

2. **Coluna "Origem"**: se `pedido_compra_id` existe, mostra link `PED-N` que navega para `/compras/pedidos`. Em Receber fica oculta.

3. **Ao editar/excluir** lançamento gerado por pedido: aviso *"Este lançamento foi gerado a partir do PED-N. Alterações não afetam o pedido."* (informativo, não bloqueia).

### Tipos

`src/integrations/supabase/types.ts` é regenerado após a migration; não editamos manualmente.

## 🔁 Fluxos

**À vista:**
1. PED-3 entregue, R$ 12.000.
2. Clicar `DollarSign` → dialog abre.
3. Mantém "À vista", define vencimento, escolhe categoria "Insumos > Cimento".
4. "Gerar" → 1 lançamento criado.
5. Coluna "Financeiro" do PED-3 vira **Pendente**.
6. Baixar em Contas a Pagar → PED-3 vira **Pago**.

**Parcelado:**
1. Mesmo PED-3, "Parcelado", 3x de 30 em 30 dias.
2. Lista mostra 3x R$ 4.000 — soma OK.
3. Gera → `"PED-3 — Fornecedor X (1/3)"`, `(2/3)`, `(3/3)`.
4. PED-3 fica **Pendente** até todos pagos.

**Idempotência:**
- Re-tentar gerar no mesmo pedido → RPC bloqueia. UI já trocou ícone para `Receipt` antes disso.

## 📌 O que **não** muda

- Schema de `pedidos_compra`, `cotacoes`, `solicitacoes_compra`.
- Triggers existentes.
- `LancamentosPage` para `tipo='receber'`.
- Geração permanece **manual / por ação** — sem trigger automático em `pedidos_compra.status`.

## 🧪 Verificação

1. Em `/compras/pedidos`, clicar `DollarSign` em um PED → dialog abre com valor preenchido.
2. À vista, gerar → toast OK, badge "Pendente" na coluna Financeiro.
3. Em `/financeiro/contas-pagar`, ver lançamento com origem `PED-N`.
4. Voltar ao pedido, clicar `Receipt` → cai em `/financeiro/contas-pagar?pedido=...` filtrado.
5. Baixar como pago → badge do pedido muda pra **Pago**.
6. Tentar gerar de novo → RPC bloqueia.
7. 3 parcelas com soma divergente → botão "Gerar" desabilitado.
8. `npx tsc --noEmit` limpo.
