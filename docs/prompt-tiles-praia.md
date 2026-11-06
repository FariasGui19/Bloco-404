# Prompt — kit complementar de praia isométrica

Use a imagem `assets/sprites/tiles/beach-floor.png` como referência de paleta e perspectiva, mas **não copie as laterais de bloco**. O objetivo é obter peças editáveis para montar uma costa, não uma imagem pronta da ilha. Se a ferramenta permitir, use saída PNG com transparência real; não desenhe quadriculado, fundo preto ou sombra de estúdio.

## Prompt

Crie uma folha de sprites modular de pixel art para um jogo de exploração isométrico chamado Bloco 404. Tema: litoral tropical do Arquipélago das Rotas Perdidas, um cenário misterioso de tecnologia dimensional antiga. Referência visual: a folha de tiles de praia fornecida. Mantenha sua perspectiva isométrica de losango 2:1, a escala e os contornos pixelados; combine areia dourada clara, areia úmida, água rasa turquesa translúcida e mar azul profundo. A magia do local deve aparecer apenas como discretos reflexos ciano, sem transformar o mar em lava ou em um circuito eletrônico.

Entregue uma folha técnica de 4 colunas por 4 linhas, 16 células retangulares iguais de 256 × 160 pixels, com margens e alinhamento idênticos. Em cada célula, coloque **uma única peça independente**: um losango de superfície de 256 × 128 pixels, ancorado no mesmo ponto da célula. Fundo transparente fora da peça; sem texto, números, bordas, linhas de grade, personagens, objetos, pontes, palmeiras, rochas ou sombras soltas. Superfícies planas sem faces laterais, sem cubos, sem volume de bloco. As peças devem encaixar pixel a pixel nas bordas e manter a mesma escala, direção de luz e paleta.

Organização exata:
- Linha 1: areia seca contínua; areia úmida contínua; água rasa contínua; água profunda contínua. Texturas sutis e repetíveis, sem linhas escuras ao redor dos tiles.
- Linha 2: quatro bordas retas de transição areia úmida → água rasa, uma para cada direção da grade isométrica. Areia e água devem encontrar as bordas das células na mesma posição. Uma faixa fina e irregular de espuma branca translúcida acompanha cada margem.
- Linha 3: quatro cantos convexos de areia rodeada por água, nas quatro orientações. Mantendo a mesma linha de espuma, produza transições compatíveis com as bordas da linha anterior.
- Linha 4: quatro cantos côncavos de água entrando na areia, nas quatro orientações, compatíveis com as outras peças. As margens devem permitir formar enseadas e recortes naturais.

Água com textura pixelada discreta de ondas, sem setas, sem contorno de losango e sem costuras visíveis. Espuma orgânica e delicada, sem filetes retos contínuos e sem brilho excessivo. Nenhuma peça deve depender visualmente de outra célula para ser recortada. Exporte em PNG com transparência real e sem interpolação borrada.

## Conferência antes de integrar

- Verificar 16 células de mesmo tamanho, perspectiva, ponto de ancoragem e bordas compatíveis; modelos de imagem frequentemente falham em produzir um atlas técnico perfeito.
- Conferir transparência real, sem xadrez pintado e sem fundo preto incorporado.
- Se a ferramenta não obedecer à grade, gerar as peças separadamente ou editar/alinhá-las manualmente. Não substituir automaticamente `beach-floor.png`: as peças existentes também contêm decks e outros materiais usados pelo mapa.
- A folha cobre transições visuais; profundidade, colisão, natação, animação e acesso por arquétipo continuam definidos no código.
