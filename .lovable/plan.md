# Permitir admin auto-aprovar a própria SC

## 🎯 Problema

O backend permite que admins aprovem suas próprias Solicitações de Compra (trigger `prevent_self_approval_solicitacao` tem `AND NOT public.is_admin(auth.uid())`), mas a UI esconde os botões "Aprovar/Rejeitar" sempre que `s.solicitante_id === user?.id`, sem considerar se o usuário é admin.

Resultado: admin vê o ícone cinza desabilitado com tooltip "Você não pode aprovar sua própria solicitação", mesmo tendo permissão real no banco.

## ✅ Solução

Alinhar a UI ao backend usando o flag `isAdmin` que já vem do hook `usePermissions`.

## 🔧 Mudança

**Arquivo**: `src/pages/compras/Solicitacoes.tsx`

1. Importar `isAdmin` do `usePermissions()` (já está sendo usado no arquivo via `canApproveCompras`).
2. Ajustar as duas condições nas linhas 392 e 398:
   - **Linha 392** (botão Aprovar/Rejeitar visível):
     ```tsx
     {s.status === 'pendente' && canApproveCompras && (s.solicitante_id !== user?.id || isAdmin) && (
       // Aprovar + Rejeitar
     )}
     ```
   - **Linha 398** (ícone bloqueado):
     ```tsx
     {s.status === 'pendente' && canApproveCompras && s.solicitante_id === user?.id && !isAdmin && (
       // tooltip de bloqueio
     )}
     ```

## 🧪 Verificação

1. Login como admin → criar SC → enviar para aprovação → botão **Aprovar** aparece e funciona.
2. Login como usuário comum (com permissão de aprovar) → criar SC → enviar para aprovação → ícone segue **bloqueado** com tooltip.
3. Usuário comum aprovando SC de outro → continua funcionando.
4. `npx tsc --noEmit` limpo.

## 📌 O que **não** muda

- Triggers do banco (já estão corretos).
- Regra equivalente para RDO (`prevent_self_approval_rdo`) — não é parte deste pedido.
- Permissões, RLS, ou qualquer outra tela.
