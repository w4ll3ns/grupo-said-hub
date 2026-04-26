## Problema
A tela `/compras/pedidos` mostra "Nenhum pedido encontrado" mesmo existindo pedidos (PED-1 a PED-4) no banco. A causa é um erro **400 PGRST200** na query — a coluna `lancamentos.pedido_compra_id` foi criada sem **foreign key** para `pedidos_compra(id)`, então o PostgREST não reconhece o embed `lancamentos!pedido_compra_id(...)` usado no componente.

## Correção (1 migration)

**Adicionar foreign key faltante:**
```sql
ALTER TABLE public.lancamentos
  ADD CONSTRAINT lancamentos_pedido_compra_id_fkey
  FOREIGN KEY (pedido_compra_id)
  REFERENCES public.pedidos_compra(id)
  ON DELETE SET NULL;
```

- `ON DELETE SET NULL` preserva o histórico contábil caso um pedido seja removido (apenas desvincula).
- Após a migration, o schema cache do PostgREST atualiza automaticamente e o embed volta a funcionar.

## Resultado esperado
- `/compras/pedidos` lista PED-1, PED-2, PED-3 e PED-4 normalmente.
- Coluna **Financeiro** exibe o badge correto (A gerar / Pendente / Pago) baseado nos lançamentos vinculados.
- Nenhuma mudança no frontend.

## Verificação
- Testar a query no Supabase para confirmar que o relacionamento foi reconhecido.
- Conferir visualmente a tela de Pedidos após a migration.