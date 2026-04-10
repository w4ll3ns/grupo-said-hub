

# Reescrita completa do PDF do RDO com pdfmake

## Objetivo
Substituir jsPDF/autoTable por **pdfmake** para gerar PDFs com suporte nativo a UTF-8 (fonte Roboto embutida), tabelas bordadas complexas e layout profissional idêntico ao padrão Sodexo/Vale.

## Por que pdfmake?
- Suporte nativo a UTF-8 com fonte Roboto — resolve 100% dos problemas de acentuação ("Relatório", "Função", "Condição", "Página")
- Tabelas declarativas com bordas, merge de células, cores de fundo por linha
- Layout de colunas lado a lado nativo (sem cálculos manuais de posição)
- Paginação automática com headers/footers customizados

## Arquivos editados

| Arquivo | Ação |
|---------|------|
| `package.json` | Adicionar `pdfmake` + `@types/pdfmake` |
| `src/utils/generateRDOPdf.ts` | Reescrita completa usando pdfmake |
| `src/utils/fetchAndGenerateRDOPdf.ts` | Sem mudanças (interface `RDOPdfData` mantida) |

## Layout do PDF (seção por seção)

### 1. Header/Footer de página (automático em todas as páginas)
- **Header**: linha separadora fina
- **Footer esquerdo**: "Relatório DD/MM/AAAA n° XXX" + badge status
- **Footer direito**: "Página X / Y"

### 2. Cabeçalho (tabela 2 colunas: 70%/30%)
**Coluna esquerda**: logo (imagem base64 ou texto fallback) + tabela bordada com Obra, Local, Contratante/Responsável
**Coluna direita**: tabela bordada com Relatório n°, Data, Dia da semana, Contrato, Prazo contratual/decorrido/a vencer
**Badge verde** "Aprovado" no canto superior direito quando status = finalizado

### 3. Horário + Clima (2 tabelas lado a lado, 50%/50%)
- Tabela 1: Entrada/Saída, Intervalo, Horas trabalhadas (célula mesclada)
- Tabela 2: Condição Climática com Manhã/Tarde × Tempo/Condição

### 4. Mão de Obra
- Título "Mão de Obra (N)" com fundo cinza #f3f4f6
- Colunas: N° | Nome | Função | Entrada/Saída | Intervalo | Horas | Local
- Zebra striping, horários em HH:MM

### 5. Equipamentos (grid 6 colunas)
- Tabela com 6 colunas por linha, nome centralizado + quantidade em negrito
- Bordas em todas as células, preenche com vazio as últimas células

### 6. Atividades
- Colunas: Descrição | Status
- Status com cores: azul (Em Andamento), verde (Concluída), vermelho (Paralisada)

### 7. Observações
- Bloco de texto simples com borda

### 8. Fotos (grid 2 colunas)
- Imagens carregadas como base64, altura ~180pt, borda fina cinza
- Legenda abaixo de cada foto
- Quebra de página automática

### 9. Aprovações (tabela 2 colunas: CONTRATADA / CONTRATANTE)
- Nome em negrito maiúsculas, cargo, matrícula
- Badge verde "Aprovado DD/MM/AAAA HH:MM" ou badge cinza "Pendente"
- Email abaixo

## Padrões de estilo (pdfmake)
- Margens: [57, 43, 57, 43] (≈20mm laterais, 15mm topo/base)
- Fonte: Roboto 9pt (default do pdfmake)
- Títulos de seção: 10pt bold, fundo #f3f4f6
- Bordas: 0.5pt cor #9ca3af
- Cabeçalhos coluna: bold, fundo #f9fafb
- Zebra: #ffffff / #fafafa
- Texto preto #000, labels secundários #6b7280

## Detalhes técnicos
- `pdfmake` já inclui fonte Roboto com suporte completo a acentos — não precisa de configuração extra
- Imagens convertidas para base64 via fetch + FileReader (mesma lógica atual)
- A interface `RDOPdfData` permanece idêntica — nenhuma mudança no `fetchAndGenerateRDOPdf.ts`
- Nenhuma migração de banco necessária

