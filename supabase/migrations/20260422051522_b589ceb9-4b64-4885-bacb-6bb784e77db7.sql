-- =============================================================================
-- Sprint 0 Etapa 3: RLS granular com has_permission() em todas as tabelas de negócio
-- =============================================================================

-- =============================================
-- FINANCEIRO
-- =============================================

-- LANCAMENTOS (regra especial: aceita lancamentos OU contas_pagar/contas_receber conforme tipo)
DROP POLICY IF EXISTS "Users manage own empresa lancamentos" ON public.lancamentos;

CREATE POLICY "View lancamentos" ON public.lancamentos FOR SELECT TO authenticated
USING (user_belongs_to_empresa(auth.uid(), empresa_id)
       AND (
         has_permission(auth.uid(), 'financeiro', 'lancamentos', 'visualizar')
         OR (tipo = 'pagar'   AND has_permission(auth.uid(), 'financeiro', 'contas_pagar',   'visualizar'))
         OR (tipo = 'receber' AND has_permission(auth.uid(), 'financeiro', 'contas_receber', 'visualizar'))
       ));

CREATE POLICY "Create lancamentos" ON public.lancamentos FOR INSERT TO authenticated
WITH CHECK (user_belongs_to_empresa(auth.uid(), empresa_id)
            AND (
              has_permission(auth.uid(), 'financeiro', 'lancamentos', 'criar')
              OR (tipo = 'pagar'   AND has_permission(auth.uid(), 'financeiro', 'contas_pagar',   'criar'))
              OR (tipo = 'receber' AND has_permission(auth.uid(), 'financeiro', 'contas_receber', 'criar'))
            ));

CREATE POLICY "Update lancamentos" ON public.lancamentos FOR UPDATE TO authenticated
USING (user_belongs_to_empresa(auth.uid(), empresa_id)
       AND (
         has_permission(auth.uid(), 'financeiro', 'lancamentos', 'editar')
         OR (tipo = 'pagar'   AND has_permission(auth.uid(), 'financeiro', 'contas_pagar',   'editar'))
         OR (tipo = 'receber' AND has_permission(auth.uid(), 'financeiro', 'contas_receber', 'editar'))
       ))
WITH CHECK (user_belongs_to_empresa(auth.uid(), empresa_id));

CREATE POLICY "Delete lancamentos" ON public.lancamentos FOR DELETE TO authenticated
USING (user_belongs_to_empresa(auth.uid(), empresa_id)
       AND (
         has_permission(auth.uid(), 'financeiro', 'lancamentos', 'excluir')
         OR (tipo = 'pagar'   AND has_permission(auth.uid(), 'financeiro', 'contas_pagar',   'excluir'))
         OR (tipo = 'receber' AND has_permission(auth.uid(), 'financeiro', 'contas_receber', 'excluir'))
       ));

-- CONTAS_BANCARIAS
DROP POLICY IF EXISTS "Users manage own empresa contas_bancarias" ON public.contas_bancarias;
CREATE POLICY "View contas_bancarias" ON public.contas_bancarias FOR SELECT TO authenticated
USING (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'financeiro', 'contas_bancarias', 'visualizar'));
CREATE POLICY "Create contas_bancarias" ON public.contas_bancarias FOR INSERT TO authenticated
WITH CHECK (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'financeiro', 'contas_bancarias', 'criar'));
CREATE POLICY "Update contas_bancarias" ON public.contas_bancarias FOR UPDATE TO authenticated
USING (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'financeiro', 'contas_bancarias', 'editar'))
WITH CHECK (user_belongs_to_empresa(auth.uid(), empresa_id));
CREATE POLICY "Delete contas_bancarias" ON public.contas_bancarias FOR DELETE TO authenticated
USING (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'financeiro', 'contas_bancarias', 'excluir'));

-- CENTROS_CUSTO
DROP POLICY IF EXISTS "Users manage own empresa centros_custo" ON public.centros_custo;
CREATE POLICY "View centros_custo" ON public.centros_custo FOR SELECT TO authenticated
USING (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'financeiro', 'centros_custo', 'visualizar'));
CREATE POLICY "Create centros_custo" ON public.centros_custo FOR INSERT TO authenticated
WITH CHECK (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'financeiro', 'centros_custo', 'criar'));
CREATE POLICY "Update centros_custo" ON public.centros_custo FOR UPDATE TO authenticated
USING (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'financeiro', 'centros_custo', 'editar'))
WITH CHECK (user_belongs_to_empresa(auth.uid(), empresa_id));
CREATE POLICY "Delete centros_custo" ON public.centros_custo FOR DELETE TO authenticated
USING (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'financeiro', 'centros_custo', 'excluir'));

-- FORMAS_PAGAMENTO
DROP POLICY IF EXISTS "Users manage own empresa formas_pagamento" ON public.formas_pagamento;
CREATE POLICY "View formas_pagamento" ON public.formas_pagamento FOR SELECT TO authenticated
USING (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'financeiro', 'formas_pagamento', 'visualizar'));
CREATE POLICY "Create formas_pagamento" ON public.formas_pagamento FOR INSERT TO authenticated
WITH CHECK (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'financeiro', 'formas_pagamento', 'criar'));
CREATE POLICY "Update formas_pagamento" ON public.formas_pagamento FOR UPDATE TO authenticated
USING (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'financeiro', 'formas_pagamento', 'editar'))
WITH CHECK (user_belongs_to_empresa(auth.uid(), empresa_id));
CREATE POLICY "Delete formas_pagamento" ON public.formas_pagamento FOR DELETE TO authenticated
USING (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'financeiro', 'formas_pagamento', 'excluir'));

-- PLANO_RECEITAS (funcionalidade=plano_contas)
DROP POLICY IF EXISTS "Users manage own empresa plano_receitas" ON public.plano_receitas;
CREATE POLICY "View plano_receitas" ON public.plano_receitas FOR SELECT TO authenticated
USING (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'financeiro', 'plano_contas', 'visualizar'));
CREATE POLICY "Create plano_receitas" ON public.plano_receitas FOR INSERT TO authenticated
WITH CHECK (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'financeiro', 'plano_contas', 'criar'));
CREATE POLICY "Update plano_receitas" ON public.plano_receitas FOR UPDATE TO authenticated
USING (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'financeiro', 'plano_contas', 'editar'))
WITH CHECK (user_belongs_to_empresa(auth.uid(), empresa_id));
CREATE POLICY "Delete plano_receitas" ON public.plano_receitas FOR DELETE TO authenticated
USING (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'financeiro', 'plano_contas', 'excluir'));

-- PLANO_DESPESAS
DROP POLICY IF EXISTS "Users manage own empresa plano_despesas" ON public.plano_despesas;
CREATE POLICY "View plano_despesas" ON public.plano_despesas FOR SELECT TO authenticated
USING (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'financeiro', 'plano_contas', 'visualizar'));
CREATE POLICY "Create plano_despesas" ON public.plano_despesas FOR INSERT TO authenticated
WITH CHECK (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'financeiro', 'plano_contas', 'criar'));
CREATE POLICY "Update plano_despesas" ON public.plano_despesas FOR UPDATE TO authenticated
USING (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'financeiro', 'plano_contas', 'editar'))
WITH CHECK (user_belongs_to_empresa(auth.uid(), empresa_id));
CREATE POLICY "Delete plano_despesas" ON public.plano_despesas FOR DELETE TO authenticated
USING (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'financeiro', 'plano_contas', 'excluir'));

-- TRANSFERENCIAS
DROP POLICY IF EXISTS "Users manage own empresa transferencias" ON public.transferencias;
CREATE POLICY "View transferencias" ON public.transferencias FOR SELECT TO authenticated
USING (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'financeiro', 'transferencias', 'visualizar'));
CREATE POLICY "Create transferencias" ON public.transferencias FOR INSERT TO authenticated
WITH CHECK (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'financeiro', 'transferencias', 'criar'));
CREATE POLICY "Update transferencias" ON public.transferencias FOR UPDATE TO authenticated
USING (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'financeiro', 'transferencias', 'editar'))
WITH CHECK (user_belongs_to_empresa(auth.uid(), empresa_id));
CREATE POLICY "Delete transferencias" ON public.transferencias FOR DELETE TO authenticated
USING (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'financeiro', 'transferencias', 'excluir'));

-- METAS_FINANCEIRAS (funcionalidade=metas)
DROP POLICY IF EXISTS "Users manage own empresa metas_financeiras" ON public.metas_financeiras;
CREATE POLICY "View metas_financeiras" ON public.metas_financeiras FOR SELECT TO authenticated
USING (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'financeiro', 'metas', 'visualizar'));
CREATE POLICY "Create metas_financeiras" ON public.metas_financeiras FOR INSERT TO authenticated
WITH CHECK (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'financeiro', 'metas', 'criar'));
CREATE POLICY "Update metas_financeiras" ON public.metas_financeiras FOR UPDATE TO authenticated
USING (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'financeiro', 'metas', 'editar'))
WITH CHECK (user_belongs_to_empresa(auth.uid(), empresa_id));
CREATE POLICY "Delete metas_financeiras" ON public.metas_financeiras FOR DELETE TO authenticated
USING (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'financeiro', 'metas', 'excluir'));

-- =============================================
-- RDO
-- =============================================

-- OBRAS
DROP POLICY IF EXISTS "Users manage own empresa obras" ON public.obras;
CREATE POLICY "View obras" ON public.obras FOR SELECT TO authenticated
USING (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'rdo', 'obras', 'visualizar'));
CREATE POLICY "Create obras" ON public.obras FOR INSERT TO authenticated
WITH CHECK (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'rdo', 'obras', 'criar'));
CREATE POLICY "Update obras" ON public.obras FOR UPDATE TO authenticated
USING (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'rdo', 'obras', 'editar'))
WITH CHECK (user_belongs_to_empresa(auth.uid(), empresa_id));
CREATE POLICY "Delete obras" ON public.obras FOR DELETE TO authenticated
USING (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'rdo', 'obras', 'excluir'));

-- FUNCIONARIOS
DROP POLICY IF EXISTS "Users manage own empresa funcionarios" ON public.funcionarios;
CREATE POLICY "View funcionarios" ON public.funcionarios FOR SELECT TO authenticated
USING (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'rdo', 'funcionarios', 'visualizar'));
CREATE POLICY "Create funcionarios" ON public.funcionarios FOR INSERT TO authenticated
WITH CHECK (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'rdo', 'funcionarios', 'criar'));
CREATE POLICY "Update funcionarios" ON public.funcionarios FOR UPDATE TO authenticated
USING (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'rdo', 'funcionarios', 'editar'))
WITH CHECK (user_belongs_to_empresa(auth.uid(), empresa_id));
CREATE POLICY "Delete funcionarios" ON public.funcionarios FOR DELETE TO authenticated
USING (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'rdo', 'funcionarios', 'excluir'));

-- EQUIPAMENTOS
DROP POLICY IF EXISTS "Users manage own empresa equipamentos" ON public.equipamentos;
CREATE POLICY "View equipamentos" ON public.equipamentos FOR SELECT TO authenticated
USING (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'rdo', 'equipamentos', 'visualizar'));
CREATE POLICY "Create equipamentos" ON public.equipamentos FOR INSERT TO authenticated
WITH CHECK (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'rdo', 'equipamentos', 'criar'));
CREATE POLICY "Update equipamentos" ON public.equipamentos FOR UPDATE TO authenticated
USING (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'rdo', 'equipamentos', 'editar'))
WITH CHECK (user_belongs_to_empresa(auth.uid(), empresa_id));
CREATE POLICY "Delete equipamentos" ON public.equipamentos FOR DELETE TO authenticated
USING (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'rdo', 'equipamentos', 'excluir'));

-- RDOS (funcionalidade=rdo; delete só em rascunho)
DROP POLICY IF EXISTS "Users manage own empresa rdos" ON public.rdos;
CREATE POLICY "View rdos" ON public.rdos FOR SELECT TO authenticated
USING (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'rdo', 'rdo', 'visualizar'));
CREATE POLICY "Create rdos" ON public.rdos FOR INSERT TO authenticated
WITH CHECK (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'rdo', 'rdo', 'criar'));
CREATE POLICY "Update rdos" ON public.rdos FOR UPDATE TO authenticated
USING (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'rdo', 'rdo', 'editar'))
WITH CHECK (user_belongs_to_empresa(auth.uid(), empresa_id));
CREATE POLICY "Delete rdos" ON public.rdos FOR DELETE TO authenticated
USING (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'rdo', 'rdo', 'excluir') AND status = 'rascunho');

-- Tabelas filhas de RDO
DROP POLICY IF EXISTS "Users manage own empresa rdo_funcionarios" ON public.rdo_funcionarios;
CREATE POLICY "Manage rdo_funcionarios" ON public.rdo_funcionarios FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.rdos r WHERE r.id = rdo_funcionarios.rdo_id
               AND user_belongs_to_empresa(auth.uid(), r.empresa_id)
               AND has_permission(auth.uid(), 'rdo', 'rdo', 'editar')))
WITH CHECK (EXISTS (SELECT 1 FROM public.rdos r WHERE r.id = rdo_funcionarios.rdo_id
                    AND user_belongs_to_empresa(auth.uid(), r.empresa_id)));

DROP POLICY IF EXISTS "Users manage own empresa rdo_equipamentos" ON public.rdo_equipamentos;
CREATE POLICY "Manage rdo_equipamentos" ON public.rdo_equipamentos FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.rdos r WHERE r.id = rdo_equipamentos.rdo_id
               AND user_belongs_to_empresa(auth.uid(), r.empresa_id)
               AND has_permission(auth.uid(), 'rdo', 'rdo', 'editar')))
WITH CHECK (EXISTS (SELECT 1 FROM public.rdos r WHERE r.id = rdo_equipamentos.rdo_id
                    AND user_belongs_to_empresa(auth.uid(), r.empresa_id)));

DROP POLICY IF EXISTS "Users manage own empresa rdo_atividades" ON public.rdo_atividades;
CREATE POLICY "Manage rdo_atividades" ON public.rdo_atividades FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.rdos r WHERE r.id = rdo_atividades.rdo_id
               AND user_belongs_to_empresa(auth.uid(), r.empresa_id)
               AND has_permission(auth.uid(), 'rdo', 'rdo', 'editar')))
WITH CHECK (EXISTS (SELECT 1 FROM public.rdos r WHERE r.id = rdo_atividades.rdo_id
                    AND user_belongs_to_empresa(auth.uid(), r.empresa_id)));

DROP POLICY IF EXISTS "Users manage own empresa rdo_fotos" ON public.rdo_fotos;
CREATE POLICY "Manage rdo_fotos" ON public.rdo_fotos FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.rdos r WHERE r.id = rdo_fotos.rdo_id
               AND user_belongs_to_empresa(auth.uid(), r.empresa_id)
               AND has_permission(auth.uid(), 'rdo', 'rdo', 'editar')))
WITH CHECK (EXISTS (SELECT 1 FROM public.rdos r WHERE r.id = rdo_fotos.rdo_id
                    AND user_belongs_to_empresa(auth.uid(), r.empresa_id)));

DROP POLICY IF EXISTS "Users manage own empresa rdo_aprovacoes" ON public.rdo_aprovacoes;
CREATE POLICY "Manage rdo_aprovacoes" ON public.rdo_aprovacoes FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.rdos r WHERE r.id = rdo_aprovacoes.rdo_id
               AND user_belongs_to_empresa(auth.uid(), r.empresa_id)
               AND has_permission(auth.uid(), 'rdo', 'rdo', 'aprovar')))
WITH CHECK (EXISTS (SELECT 1 FROM public.rdos r WHERE r.id = rdo_aprovacoes.rdo_id
                    AND user_belongs_to_empresa(auth.uid(), r.empresa_id)));

-- =============================================
-- COMPRAS
-- =============================================

-- FORNECEDORES
DROP POLICY IF EXISTS "Users manage own empresa fornecedores" ON public.fornecedores;
CREATE POLICY "View fornecedores" ON public.fornecedores FOR SELECT TO authenticated
USING (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'compras', 'fornecedores', 'visualizar'));
CREATE POLICY "Create fornecedores" ON public.fornecedores FOR INSERT TO authenticated
WITH CHECK (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'compras', 'fornecedores', 'criar'));
CREATE POLICY "Update fornecedores" ON public.fornecedores FOR UPDATE TO authenticated
USING (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'compras', 'fornecedores', 'editar'))
WITH CHECK (user_belongs_to_empresa(auth.uid(), empresa_id));
CREATE POLICY "Delete fornecedores" ON public.fornecedores FOR DELETE TO authenticated
USING (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'compras', 'fornecedores', 'excluir'));

-- PRODUTOS (funcionalidade=catalogo)
DROP POLICY IF EXISTS "Users manage own empresa produtos" ON public.produtos;
CREATE POLICY "View produtos" ON public.produtos FOR SELECT TO authenticated
USING (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'compras', 'catalogo', 'visualizar'));
CREATE POLICY "Create produtos" ON public.produtos FOR INSERT TO authenticated
WITH CHECK (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'compras', 'catalogo', 'criar'));
CREATE POLICY "Update produtos" ON public.produtos FOR UPDATE TO authenticated
USING (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'compras', 'catalogo', 'editar'))
WITH CHECK (user_belongs_to_empresa(auth.uid(), empresa_id));
CREATE POLICY "Delete produtos" ON public.produtos FOR DELETE TO authenticated
USING (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'compras', 'catalogo', 'excluir'));

-- SOLICITACOES_COMPRA
DROP POLICY IF EXISTS "Users manage own empresa solicitacoes_compra" ON public.solicitacoes_compra;
CREATE POLICY "View solicitacoes_compra" ON public.solicitacoes_compra FOR SELECT TO authenticated
USING (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'compras', 'solicitacoes', 'visualizar'));
CREATE POLICY "Create solicitacoes_compra" ON public.solicitacoes_compra FOR INSERT TO authenticated
WITH CHECK (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'compras', 'solicitacoes', 'criar'));
CREATE POLICY "Update solicitacoes_compra" ON public.solicitacoes_compra FOR UPDATE TO authenticated
USING (user_belongs_to_empresa(auth.uid(), empresa_id))
WITH CHECK (user_belongs_to_empresa(auth.uid(), empresa_id)
            AND (
              has_permission(auth.uid(), 'compras', 'solicitacoes', 'editar')
              OR has_permission(auth.uid(), 'compras', 'solicitacoes', 'aprovar')
              OR (solicitante_id = auth.uid() AND has_permission(auth.uid(), 'compras', 'solicitacoes', 'criar'))
            ));
CREATE POLICY "Delete solicitacoes_compra" ON public.solicitacoes_compra FOR DELETE TO authenticated
USING (user_belongs_to_empresa(auth.uid(), empresa_id)
       AND has_permission(auth.uid(), 'compras', 'solicitacoes', 'excluir')
       AND status = 'rascunho');

-- SOLICITACAO_ITENS
DROP POLICY IF EXISTS "Users manage own empresa solicitacao_itens" ON public.solicitacao_itens;
CREATE POLICY "View solicitacao_itens" ON public.solicitacao_itens FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.solicitacoes_compra s
               WHERE s.id = solicitacao_itens.solicitacao_id
                 AND user_belongs_to_empresa(auth.uid(), s.empresa_id)
                 AND has_permission(auth.uid(), 'compras', 'solicitacoes', 'visualizar')));
CREATE POLICY "Manage solicitacao_itens" ON public.solicitacao_itens FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.solicitacoes_compra s
                    WHERE s.id = solicitacao_itens.solicitacao_id
                      AND user_belongs_to_empresa(auth.uid(), s.empresa_id)
                      AND (
                        has_permission(auth.uid(), 'compras', 'solicitacoes', 'editar')
                        OR (s.solicitante_id = auth.uid() AND has_permission(auth.uid(), 'compras', 'solicitacoes', 'criar'))
                      )
                      AND s.status IN ('rascunho', 'pendente')));
CREATE POLICY "Update solicitacao_itens" ON public.solicitacao_itens FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.solicitacoes_compra s
               WHERE s.id = solicitacao_itens.solicitacao_id
                 AND user_belongs_to_empresa(auth.uid(), s.empresa_id)
                 AND has_permission(auth.uid(), 'compras', 'solicitacoes', 'editar')
                 AND s.status IN ('rascunho', 'pendente')));
CREATE POLICY "Delete solicitacao_itens" ON public.solicitacao_itens FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.solicitacoes_compra s
               WHERE s.id = solicitacao_itens.solicitacao_id
                 AND user_belongs_to_empresa(auth.uid(), s.empresa_id)
                 AND (
                   has_permission(auth.uid(), 'compras', 'solicitacoes', 'editar')
                   OR (s.solicitante_id = auth.uid() AND has_permission(auth.uid(), 'compras', 'solicitacoes', 'criar'))
                 )
                 AND s.status IN ('rascunho', 'pendente')));

-- COTACOES
DROP POLICY IF EXISTS "Users manage own empresa cotacoes" ON public.cotacoes;
CREATE POLICY "View cotacoes" ON public.cotacoes FOR SELECT TO authenticated
USING (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'compras', 'cotacoes', 'visualizar'));
CREATE POLICY "Create cotacoes" ON public.cotacoes FOR INSERT TO authenticated
WITH CHECK (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'compras', 'cotacoes', 'criar'));
CREATE POLICY "Update cotacoes" ON public.cotacoes FOR UPDATE TO authenticated
USING (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'compras', 'cotacoes', 'editar'))
WITH CHECK (user_belongs_to_empresa(auth.uid(), empresa_id));
CREATE POLICY "Delete cotacoes" ON public.cotacoes FOR DELETE TO authenticated
USING (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'compras', 'cotacoes', 'excluir'));

-- COTACAO_ITENS (via cotacao pai)
DROP POLICY IF EXISTS "Users manage own empresa cotacao_itens" ON public.cotacao_itens;
CREATE POLICY "Manage cotacao_itens" ON public.cotacao_itens FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.cotacoes c WHERE c.id = cotacao_itens.cotacao_id
               AND user_belongs_to_empresa(auth.uid(), c.empresa_id)
               AND has_permission(auth.uid(), 'compras', 'cotacoes', 'editar')))
WITH CHECK (EXISTS (SELECT 1 FROM public.cotacoes c WHERE c.id = cotacao_itens.cotacao_id
                    AND user_belongs_to_empresa(auth.uid(), c.empresa_id)));

-- PEDIDOS_COMPRA
DROP POLICY IF EXISTS "Users manage own empresa pedidos_compra" ON public.pedidos_compra;
CREATE POLICY "View pedidos_compra" ON public.pedidos_compra FOR SELECT TO authenticated
USING (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'compras', 'pedidos', 'visualizar'));
CREATE POLICY "Create pedidos_compra" ON public.pedidos_compra FOR INSERT TO authenticated
WITH CHECK (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'compras', 'pedidos', 'criar'));
CREATE POLICY "Update pedidos_compra" ON public.pedidos_compra FOR UPDATE TO authenticated
USING (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'compras', 'pedidos', 'editar'))
WITH CHECK (user_belongs_to_empresa(auth.uid(), empresa_id));
CREATE POLICY "Delete pedidos_compra" ON public.pedidos_compra FOR DELETE TO authenticated
USING (user_belongs_to_empresa(auth.uid(), empresa_id) AND has_permission(auth.uid(), 'compras', 'pedidos', 'excluir'));