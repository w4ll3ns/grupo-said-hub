

# Geração de PDF do RDO — Padrão Sodexo/Vale

## Objetivo
Adicionar botão "Gerar PDF" nos cards da lista de RDOs e no step Resumo do formulário, gerando um PDF client-side que replica fielmente o layout do documento Sodexo/Vale.

---

## Layout do PDF (baseado no documento enviado)

```text
+--------------------------------------------------+
| Relatório DD/MM/YYYY n° XXX        [Aprovado]    |
+--------------------------------------------------+
| [LOGO]           | Relatório n°    | 281          |
|   empresa        | Data relatório  | 16/03/2026   |
|                  | Dia da semana   | Segunda-Feira |
+--------------------------------------------------+
| Relatório Diário de Obra (RDO)                   |
| Obra:        SIS - ...          Prazo contratual  |
| Local:       Canteiro ...       Prazo decorrido   |
| Contratante: VALE ...           Prazo a vencer    |
+--------------------------------------------------+
| Horário trabalho | Horas | Condição climática    |
| Entrada/Saída    | 09:00 | Manhã  ☀ Praticável   |
| Intervalo        |       | Tarde  ☀ Praticável   |
+--------------------------------------------------+
| Mão de obra (N)                                  |
| Nome | Função | Entrada/Saída | Interv | Horas   |
+--------------------------------------------------+
| Equipamentos (N)                                 |
| Grid de equipamentos com quantidade              |
+--------------------------------------------------+
| Atividades (N)                                   |
| Descrição                      | Status          |
+--------------------------------------------------+
| Fotos (N)                                        |
| Grid 2 colunas com imagens                       |
+--------------------------------------------------+
| Assinatura Contratada  | Assinatura Contratante  |
| Nome, cargo, matrícula | Status, data/hora       |
| Aprovado DD/MM HH:MM   | email, cargo            |
+--------------------------------------------------+
```

---

## Implementacao

### 1. Instalar dependencia
- `jspdf` + `jspdf-autotable` — geração client-side sem edge function, leve e confiável para tabelas

### 2. Criar utilitário de geração
- `src/utils/generateRDOPdf.ts`
- Recebe os dados completos do RDO (obra, funcionários, equipamentos, atividades, fotos, aprovações)
- Usa jsPDF com autoTable para criar tabelas formatadas
- Carrega logo da empresa (se disponível) no cabeçalho
- Calcula prazos (contratual, decorrido, a vencer) a partir da obra
- Renderiza fotos inline convertendo URLs para base64 via fetch+canvas
- Layout de assinaturas no rodapé com dados de `rdo_aprovacoes`

### 3. Atualizar Relatorios.tsx
- Adicionar botão "PDF" (ícone FileDown) em cada card de RDO
- Ao clicar, busca dados completos (joins com obras, funcionários, equipamentos, atividades, fotos, aprovações) e chama `generateRDOPdf`

### 4. Atualizar RDOForm.tsx — Step Resumo
- Adicionar botão "Gerar PDF" no step de resumo (apenas para RDOs já salvos)

---

## Arquivos

| Arquivo | Acao |
|---------|------|
| `package.json` | Instalar jspdf + jspdf-autotable |
| `src/utils/generateRDOPdf.ts` | Novo — lógica completa de geração |
| `src/pages/rdo/Relatorios.tsx` | Botão PDF nos cards |
| `src/pages/rdo/RDOForm.tsx` | Botão PDF no resumo |

---

## Detalhes tecnicos
- jsPDF gera A4 portrait (210x297mm)
- Cores do cabeçalho: fundo azul (#1a73e8) para badge "Aprovado", bordas cinza claro
- Tabelas com autoTable: header cinza escuro, linhas alternadas
- Fotos renderizadas em grid 2 colunas com aspect ratio preservado
- Equipamentos em grid (6 colunas, nome + qtd) replicando o layout original
- Nenhuma migração de banco necessária

