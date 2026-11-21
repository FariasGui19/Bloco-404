# Docas da Neblina — área central

## Resultado

- [Prévia animada com o renderizador real](previa-docas-central.html): enquadramento central ou mapa inteiro, pausa e movimento reduzido. Não carrega/grava o save; a opção de movimento da prévia não persiste preferências.
- [Captura do resultado](../qa/docas-area-central.png).
- Oficina CRT com cobertura azul restaurada usando a arte RGBA existente de `docas-reconstrucao/galpao.png`. Mantém ID, tamanho, pé e porta do galpão.
- Cabana dos fundos instalada sobre o bloqueio já existente; reaproveita a pintura de madeira/telhado gasto da Vila 04. É cenográfica, sem quarto portal.
- Cabanas oeste/leste preservadas, com halos quentes posicionados nas janelas reais; três CRTs com brilho ciano e varredura leve.
- Carga, barris e cercas agrupados junto aos prédios; cristais/corais nas bordas do pátio; trilhas de desgaste e selo elíptico no piso, desenhados antes das entidades.
- Vegetação com deformação mínima ancorada no pé, cristais respirando, duas faixas de névoa baixa e sinal vermelho pulsante no topo real da torre de treliça.
- Feedback de proximidade/seleção nas três portas existentes. É apenas visual: não cria coleta, recompensa, entrada ou prioridade de interação.

## Limites técnicos

`docas-central.js` só desenha e calcula poses determinísticas a partir do relógio visual. Não recebe controles nem escreve em progresso. Mantém o modo reduzido estático. Novas peças entram na ordenação de profundidade pelo pé já utilizada no mapa. Não altera `DimensionManager`, água, farol, barcos, controles ou salvamento.

O teste `docas-central.mjs` fixa hashes do commit-base `68ba219` para layout, geometria/colisões, cais, costa oeste, spawns, objetos de missão, portais e elementos marítimos. A contagem histórica das oito estruturas principais em `docas-neblina.mjs` agora exclui os novos IDs cenográficos `central_`, assim como já excluía os lotes decorativos.

## Validação executada

- Suíte `tests/*.mjs`: **206 execuções com sucesso, 8 opcionais ignoradas e 23 falhas preexistentes**. Cada uma das 23 falhas também foi reproduzida numa extração local dos módulos/testes do commit-base. Não foram corrigidas neste passo para manter o escopo central.
- `praia-relevo.mjs` apresentou uma falha transitória de orçamento de tempo na primeira rodada (438 ms); passou isoladamente e na rodada final. Nenhuma mudança no mar da praia.
- Chromium, executados explicitamente com navegador configurado:
  - `docas-central-browser.mjs`: artes carregadas, quatro prédios e torre desenhados no renderizador real, pixels diferentes em movimento, repouso estável, retomada, storage intacto e zero erros HTTP/JS.
  - `docas-gameplay-live-browser.mjs`: index real, menu/save/RAF, barco/água/tentáculo, movimento reduzido/retomada, reload e calibração.
  - `docas-lotes-browser.mjs`: recursos, animação/repouso e embarque.
  - `docas-pesqueiro-03-browser.mjs`: folhas e ordem de desenho costa/mar/casco.
  - `dimension-rupture-browser.mjs`: terminal final → diálogo Nulo → ruptura → Limiar → Esc/retorno ao 2D, sem erros e preservando referências/vitais/resultado.
- `git diff --check`: sem problemas de whitespace.

Falhas preexistentes: `caminho-correntes`, `combat-basic`, `docas-lote5/8/9/10/11/12/13`, `enseada-2-lote4/5/6/7/8/9/10`, `enseada-3-reference`, `enseada-4-lote`, `enseada-ecos`, `enseada-reconstrucao`, `limiar-frequencia`, `nado-desenho`, `oceano-animado`.

Para executar localmente: `python3 -m http.server 8000 --bind 0.0.0.0`, depois abrir `/docs/previa-docas-central.html` ou o jogo em `/index.html`.
