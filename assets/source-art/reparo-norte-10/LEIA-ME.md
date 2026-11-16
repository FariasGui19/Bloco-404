# Material para reparo do norte — Enseada dos Ecos

Esta pasta reúne a referência fornecida pelo usuário e 20 imagens geradas em dois lotes de dez, além de um recorte experimental. **As artes não foram integradas ao jogo e as correções abaixo não estão concluídas.** São insumos para outra implementação, não sprites prontos aprovados.

- `referencia-mestre.png`: imagem de referência fornecida pelo usuário.
- `01`–`10`: primeiro lote de imagens geradas.
- `11`–`20`: segundo lote, com peças direcionadas a encosta, falésia, degraus, vegetação, pedras e biruta.
- `21-montanha-recorte-experimental.png`: extração RGBA experimental de uma imagem gerada. Ela inclui uma base de terreno/água com limites artificiais e **não deve ser inserida diretamente**.

As imagens geradas podem conter fundo branco ou quadriculado desenhado na própria imagem, e não transparência real. Inspecionar e tratar os contornos, a escala, a perspectiva e a paleta antes de usá-las; nomes descrevem a intenção, não garantem qualidade ou fidelidade. Não sobrepor blocos retangulares de grama, areia ou água ao mapa.

## Objetivo ainda pendente

1. Redesenhar a montanha completa com encosta esquerda suave de terra/grama integrada ao acampamento e falésia direita diretamente na água, com espuma junto às rochas, sem faixa de grama ou areia atrás/à direita.
2. Remover a rampa longa. O platô deve terminar logo abaixo do banco/fogueira e os degraus rústicos devem estar embutidos na parede, acessando o gramado inferior, sem emendas ou bordas recortadas.
3. Posicionar a biruta azul imediatamente à direita da barraca, junto à segunda árvore, apontando para a direita, em direção à cachoeira.
4. Fechar o antigo espaço da rampa com mata entre a biruta, os degraus e a piscina: palmeira média e baixa perto da margem esquerda, árvores redondas, arbustos densos, pequenas pedras cinzentas abaixo dos degraus e um tufo/palmeira anã à direita da piscina entre água e porta. A areia clara no fundo superior deve ficar somente no canto superior esquerdo, atrás do relógio e das duas primeiras palmeiras; o mar deve tocar a base do penhasco atrás da torre e montanha.

Preservar os objetos interativos, colisões, navegação e demais setores; o usuário aprovou o barco e o cais e pediu que não sejam alterados. O resultado do PR #152 foi rejeitado visualmente: não tomar os testes existentes como prova de fidelidade à referência. Validar também no navegador antes de declarar conclusão.

## Pontos de entrada

- `js/data/worlds/arquipelago-rotas-perdidas/enseada-ecos.js`: geometria de costa, objetos, ancoragem, colisores e portais.
- `js/main.js`: registro dos sprites.
- `assets/sprites/enseada-estacao/`: sprites usados atualmente, inclusive `estacao-integrada.png` e `terraco-curto.png`.
- `js/engine/beach-surface.js` e `js/engine/renderer.js`: superfície e ordem de desenho.
- `tests/estacao-encaixe.mjs`, `tests/enseada-acampamento.mjs` e `tests/beach-surface.mjs`: verificações funcionais relevantes, insuficientes para avaliar fidelidade visual.

Tentativas anteriores de recortar e colar os degraus ou emendar a falésia produziram cortes retos visíveis e foram descartadas. O portal da estação e os colisores têm deslocamento comum definido como `ESTACAO_DX` e `ESTACAO_DY`; qualquer mudança de posição da porta exige verificar também o portal, o retorno e as colisões.
