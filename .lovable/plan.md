# Auditoria do fluxo de Compras (visão dev fullstack senior)

## Confirmação rápida da sua suspeita
**Você está certo.** Acabei de validar no banco — sua única solicitação real está nesta condição:

| SC | Status SC | COT | Status COT | PED | Status PED |
|----|-----------|-----|------------|-----|------------|
| SC-1 | **`cotacao`** ❌ | COT-1 | aprovada | PED-1 | entregue |

A solicitação deveria estar em **`pedido`** (quando o pedido foi gerado) e idealmente em **`concluida`** (já que o pedido foi entregue). Ela travou em `cotacao` porque **ninguém atualiza o status da SC quando se gera o pedido nem quando o pedido é entregue**.

---

## Mapa do fluxo desenhado vs. fluxo implementado

O trigger `validate_solicitacao_status_transition` no banco define a máquina de estados oficial:

```
rascunho → pendente → aprovada → cotacao → pedido → concluida
                   ↘ rejeitada    ↘ cancelada (em qualquer ponto)
```

### Furos identificados

| # | Etapa | O que deveria acontecer | O que acontece hoje | Severidade |
|---|-------|-------------------------|---------------------|------------|
| **1** | Criar cotação | SC: `aprovada` → `cotacao` | ✅ OK (`Cotacoes.tsx` linha 92) | — |
| **2** | **Aprovar cotação** | Outras cotações da mesma SC vão para `rejeitada` (cotação concorrente) | Nada acontece. Pode aprovar N cotações da mesma SC | **Alta** |
| **3** | **Gerar pedido** | SC: `cotacao` → `pedido` + COT trava (não pode mais aprovar/rejeitar) | SC fica em `cotacao` para sempre. COT continua editável | **Alta** ⬅ seu caso |
| **4** | **Pedido entregue** | SC: `pedido` → `concluida` | SC nunca vai para `concluida`. Status terminal nunca alcançado | **Média** |
| **5** | Gerar pedido sem cotação aprovada | Bloqueado | Bloqueado pela UI (filtro `status=aprovada`) ✅ | — |
| **6** | Cancelar SC já em `pedido` | Deveria exigir cancelar pedido antes | Permitido pelo trigger sem checagem cruzada | Baixa |
| **7** | Excluir cotação aprovada que já virou pedido | Deveria ser bloqueado | RLS permite (sem FK protegendo) | Média |
| **8** | Atomicidade (gerar pedido) | INSERT pedido + UPDATE SC numa transação | 2 chamadas separadas do client; se a 2ª falhar fica inconsistente | **Alta** |
| **9** | Itens da cotação | Tabela `cotacao_itens` existe mas **não é populada** ao criar cotação. Só `valor_total` é digitado manualmente | Cotação vira "número solto" sem rastro item-a-item | Média |
| **10** | Comparativo de cotações | Não existe tela para comparar 2+ cotações da mesma SC lado a lado | Aprova-se "no escuro" | Média (UX) |
| **11** | RLS update lançamentos | Quando pedido é entregue, não gera lançamento financeiro automaticamente em `contas_pagar` | Compras e Financeiro vivem desconectados | Alta (gap funcional, fora do escopo desta correção) |

---

## Plano de correção — Sprint Compras Etapa 1

Foco: **fechar os furos críticos de transição de status (#2, #3, #4, #7, #8)**. Itens #9, #10 e #11 ficam para sprints seguintes (mudança maior de UX/escopo financeiro).

### 1. Migration SQL — `..._compras_transicoes_pedido.sql`

**1.1. RPC `gerar_pedido_compra(_cotacao_id, _data_entrega_prevista, _observacoes)`**
- `SECURITY DEFINER`, valida permissão `compras.pedidos.criar`
- Numa única transação:
  - Valida que a COT existe, está `aprovada`, pertence à empresa do usuário
  - Valida que ainda não há pedido para esta cotação (1:1)
  - INSERT em `pedidos_compra` (numero gerado pelo trigger existente)
  - UPDATE `solicitacoes_compra` da SC vinculada: `cotacao` → `pedido`
  - UPDATE outras cotações `pendente` da mesma SC para `rejeitada` (item #2)
- RETURNS uuid do pedido criado

**1.2. RPC `aprovar_cotacao(_cotacao_id)`**
- Valida permissão `compras.cotacoes.aprovar`
- Bloqueia auto-aprovação se a COT foi criada pelo próprio usuário (consistente com SC e RDO)
- UPDATE COT: `pendente` → `aprovada`
- UPDATE outras COTs da mesma SC: `pendente` → `rejeitada` (1 vencedora por SC)

**1.3. RPC `concluir_pedido(_pedido_id)`** (chamada quando status do pedido vira `entregue`)
- UPDATE pedido: status → `entregue`
- UPDATE SC vinculada (via cotação): `pedido` → `concluida`

**1.4. Trigger `protect_cotacao_aprovada_com_pedido`** em `cotacoes`
- Bloqueia DELETE/UPDATE de status se já existe pedido vinculado à cotação (item #7)

**1.5. Trigger `protect_solicitacao_com_pedido_ativo`** em `solicitacoes_compra`
- Bloqueia transição para `cancelada` se existe pedido não-cancelado (item #6)

### 2. Frontend — refatorar para usar RPCs

**`src/pages/compras/Cotacoes.tsx`**
- Remover INSERT manual + UPDATE solto. Aprovar cotação: trocar `updateStatusMutation` por `supabase.rpc('aprovar_cotacao', { _cotacao_id })`
- Esconder botões aprovar/rejeitar quando a cotação já tem pedido vinculado (query auxiliar ou JOIN)
- Adicionar coluna "Pedido" mostrando `PED-{numero}` quando existir

**`src/pages/compras/Pedidos.tsx`**
- `gerarPedidoMutation`: trocar INSERT manual por `supabase.rpc('gerar_pedido_compra', { _cotacao_id, _data_entrega_prevista, _observacoes })` (item #8 — atomicidade)
- Adicionar campos opcionais `data_entrega_prevista` e `observacoes` no dialog de gerar pedido
- `updateStatusMutation` quando status='entregue': trocar por `supabase.rpc('concluir_pedido', { _pedido_id })` (item #4)
- Demais transições (`pendente`→`enviado`, `enviado`→`parcial`) continuam UPDATE direto

**`src/pages/compras/Solicitacoes.tsx`**
- Adicionar `pedido` e `concluida` no filtro de status (hoje só vai até `concluida` mas pula `pedido`)
- Badge variant para `pedido` (já existe no `statusConfig`, está OK)

### 3. Reconciliação dos dados existentes

A SC-1 atual está travada em `cotacao` mas o pedido já foi entregue. Após aplicar a migration, rodo um script de correção pontual:

```sql
UPDATE solicitacoes_compra SET status='concluida' WHERE id='<id_da_SC-1>';
```

(Faço via tool de insert depois que confirmar com você.)

---

## O que **não** vai mudar nesta etapa (e por quê)

- **Itens da cotação (#9)**: requer redesenho do form de cotação (escolher itens da SC, preencher unitário, calcular total). É 2-3x o tamanho desta etapa.
- **Comparativo de cotações (#10)**: nova tela. Só faz sentido depois do #9.
- **Integração com Financeiro (#11)**: pedido entregue → lançamento em contas_pagar automático. Cruzamento de módulos, merece sprint própria com discussão de centro de custo / plano de contas / conta bancária default.

## Detalhes técnicos
- Todas as RPCs usam `SECURITY DEFINER` + checagem manual de permissão via `has_permission` / `is_admin`
- Transição de SC dentro das RPCs é feita pelo `auth.uid()` corrente — o trigger `validate_solicitacao_status_transition` aceita as transições mapeadas, então não preciso bypassar
- Triggers de proteção (#7, #6) garantem que mesmo edição manual via SQL/admin não quebre integridade
- Tipos TypeScript serão regenerados automaticamente após a migration
