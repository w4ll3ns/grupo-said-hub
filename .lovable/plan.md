

# Refinamentos visuais do PDF do RDO

## Resumo das mudanças

A maioria da estrutura já está implementada corretamente. Os refinamentos são ajustes pontuais no `generateRDOPdf.ts` e validação no formulário de Obras.

## Mudanças no `src/utils/generateRDOPdf.ts`

1. **Seção header com empresa**: Adicionar nome da empresa e CNPJ abaixo do logo/texto
2. **Badge de status dinâmico**: Além de "APROVADO" (verde), adicionar "PENDENTE" (cinza #6b7280) e "RASCUNHO" (âmbar #f59e0b)
3. **Remover título guarda-chuva**: Eliminar `sectionTitle('Horário de Trabalho / Condição Climática')` — as duas tabelas lado a lado já têm seus próprios headers internos
4. **Prazo a vencer em vermelho**: Quando negativo, aplicar `color: RED` no texto
5. **Atividades com badge colorido**: Trocar texto colorido por mini-tabela com `fillColor` para simular badge (fundo azul claro/verde claro/vermelho claro + texto escuro)
6. **Fotos ocultas quando vazio**: Não renderizar seção "Registro Fotográfico" se `data.fotos.length === 0` (já implementado, mas verificar)
7. **Intervalo formatado corretamente**: Garantir que `horario_intervalo` de funcionários use formato "HH:MM - HH:MM" — atualmente usa `fmt()` que só trata um horário; precisa tratar o campo composto
8. **Rodapé com linha separadora**: Adicionar `canvas` com linha horizontal antes do texto do footer
9. **Espaçamento `sectionTitle`**: Ajustar margin de `[0, 8, 0, 2]` para `[0, 10, 0, 4]`
10. **Padding das células**: Adicionar `paddingLeft`/`paddingRight`/`paddingTop`/`paddingBottom` no layout das tabelas

## Mudanças no `src/pages/rdo/Obras.tsx`

1. Tornar obrigatórios no schema zod: `responsavel`, `data_inicio`, `prazo_contratual_dias`
2. Manter backwards-compatible (campos existentes podem estar vazios, mas novos cadastros exigirão preenchimento)

## Arquivos editados

| Arquivo | Mudança |
|---------|---------|
| `src/utils/generateRDOPdf.ts` | Refinamentos visuais (badge dinâmico, bordas padding, intervalo, atividades badge, footer linha, remover título guarda-chuva) |
| `src/pages/rdo/Obras.tsx` | Campos obrigatórios: responsável, data_inicio, prazo_contratual_dias |

Nenhuma migração de banco necessária — os campos já existem na tabela `obras`, apenas a validação no formulário será adicionada.

