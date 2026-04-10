

# Correções do PDF do RDO — Análise Detalhada

## Problemas Identificados

### Bugs Críticos
1. **Emojis não renderizam** — "☀ Ensolarado" aparece como "& N u b l a d o" com caracteres espaçados. jsPDF/helvetica não suporta emojis Unicode.
2. **Horários com segundos** — Exibe "07:00:00" ao invés de "07:00". Os campos `time` do banco incluem segundos.
3. **Horas trabalhadas não calculadas** — A coluna "Horas" na seção de horário está vazia. O PDF de referência mostra "09:00".

### Diferenças de Layout vs Referência Sodexo/Vale
4. **Contrato no lugar errado** — Na referência, "Contrato" fica no painel direito do cabeçalho (junto com Relatório n°, Data, Dia da semana). No nosso, está na seção Obra.
5. **Responsável ausente** — A referência tem campo "Responsável" na seção de dados da obra. Não existe no nosso.
6. **Equipamentos em formato errado** — Referência usa grid compacto (nome em cima, quantidade embaixo, 6 colunas por linha). O nosso usa tabela vertical convencional.
7. **Atividades com colunas desnecessárias** — Referência mostra apenas Descrição + Status (2 colunas). O nosso tem N°, Quantidade, Unidade que a referência não tem.
8. **Mão de obra: Entrada/Saída separados** — Referência combina em uma coluna "07:00 - 17:00". Também mostra o local de trabalho em itálico na última coluna.
9. **Seção de assinaturas pobre** — Referência mostra logo da empresa, nome em negrito grande, cargo, matrícula, badge "Aprovado" com data/hora, email do aprovador. O nosso é apenas um retângulo com texto pequeno.
10. **Seção Horário/Clima mal estruturada** — Referência tem layout mais compacto: Entrada/Saída e Intervalo à esquerda, Horas trabalhadas no centro, Condição climática à direita em mini-tabela separada.
11. **Prazo contratual todos zerados** — Problema de dados (obra sem data_inicio/prazo preenchidos), mas o PDF deveria exibir "—" ao invés de "0 dias" quando não há dados.

---

## Plano de Correção

### 1. Corrigir rendering de clima (Bug crítico)
- Remover emojis dos labels. Usar texto simples: "Claro", "Nublado", "Chuvoso", "Tempestade"
- Alternativa: usar caracteres ASCII como `*` para sol

### 2. Formatar horários (Bug crítico)
- Criar helper `formatTime(time: string)` que converte "07:00:00" → "07:00"
- Aplicar em todos os campos de horário (RDO e funcionários)

### 3. Calcular horas trabalhadas
- Calcular a partir de entrada/saída/intervalo: `(saída - entrada) - intervalo`
- Exibir no formato "09:00" (horas:minutos)

### 4. Reestruturar cabeçalho
- Mover "Contrato" para o painel direito (junto com Relatório n°, Data, Dia da semana)
- Adicionar campo "Responsável" na seção de dados da obra

### 5. Redesenhar seção Horário/Clima
- Layout compacto: 3 blocos lado a lado
  - Esquerda: Entrada/Saída + Intervalo (com horários)
  - Centro: Horas trabalhadas (valor grande)
  - Direita: Mini-tabela Manhã/Tarde com Tempo + Condição

### 6. Redesenhar Equipamentos como grid
- Grid de 6 colunas: nome em cima, quantidade embaixo
- Múltiplas linhas se necessário (ex: 9 equipamentos = 2 linhas de 6+3)

### 7. Simplificar Atividades
- Apenas 2 colunas: Descrição (larga) + Status
- Remover N°, Quantidade, Unidade (não aparecem no padrão Sodexo)

### 8. Melhorar Mão de Obra
- Combinar Entrada + Saída em uma coluna: "07:00 - 17:00"
- Adicionar coluna "Local" em itálico no final

### 9. Redesenhar Assinaturas
- Box mais alto (40mm ao invés de 30mm)
- Nome em negrito grande, cargo abaixo, matrícula
- Badge "Aprovado" com fundo verde + data/hora
- Email e cargo do aprovador abaixo do badge

### 10. Tratar dados vazios
- Exibir "—" quando prazo contratual/decorrido/a vencer são 0 por falta de dados

---

## Arquivos editados
| Arquivo | Mudança |
|---------|---------|
| `src/utils/generateRDOPdf.ts` | Reescrita quase completa do layout |

Nenhuma migração de banco necessária. Apenas ajustes no código de geração do PDF.

