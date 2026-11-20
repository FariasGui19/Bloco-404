# Passo 3B.1 — escultura e leitura dos quatro operadores

## Escopo exclusivo

Esta revisão altera somente a construção visual do operador e sua inspeção no laboratório. Não modifica `controller.js`, `operator-actions.js`, `operator-motion.js`, `DimensionManager`, câmera de gameplay, dados de progressão, sprites 2D ou qualquer construtor/dado do mapa. Os Passos 3B.2 (habilidades) e 3B.3 (mapa) não foram iniciados.

## Escultura compartilhada com o jogo

`operator-sculpt.js` constrói volumes por seções elípticas afuniladas, mechas facetadas e dutos curvos de poucos segmentos. `operator.js` mantém a API `createOperator(progress, player)` e o contrato dos pivôs/efeitos existentes.

- **Rosto:** mandíbula estreita, queixo, maçãs do rosto e têmporas em volume. A textura facial acompanha o volume frontal; não há mais um cartão plano retangular colado ao rosto, nem repetição de olhos/bigode na nuca. Nariz e orelhas discretos em volume; óculos de armação fina com hastes e reflexo; bigode pequeno e sobrancelhas pixeladas.
- **Cabelo:** base de couro cabeludo e três camadas deslocadas de mechas, com franja ondulada e pequenas variações de tom. Não é um bloco achatado nem uma textura de fundo recortada.
- **Proporção:** cabeça mais estreita, pescoço curto, tórax com cintura e peitorais afunilados, ombros esculpidos, braços/pernas com variação de seção e botas arredondadas. Os pés alcançam o plano de apoio do controlador em repouso, sem deslocar a física.
- **X10:** cinza-esverdeado, placas torácicas e costuras verdes finas. Bracelete circular como grupo rígido próprio: correia, bordas, moldura, aro emissivo, mostrador escuro, símbolo de transformação e quatro pequenas fixações.
- **Bio-Forja:** ombros e antebraços mais robustos, reforços curvos, braços tatuados expostos, circuitos ciano, insertos dourados e propulsores dorsais. A identidade não depende apenas de recolorir o mesmo corpo.
- **Maré:** ombros mais estreitos, volumes mais esguios, dutos contínuos envolvendo clavículas/braços/dorso e pequenos perfis hidrodinâmicos nos membros.
- **Domínio:** ombreiras sobrepostas com contorno dourado, colar ancestral aberto, braçadeiras segmentadas, proteção de quadril com bordas e lente integrada à armação. Sem trocar a habilidade ou o efeito da lâmina já existente.

As três texturas por operador continuam opacas e com `NearestFilter`, sem mipmaps: traje 32², tatuagens 32² e rosto 64². São aproximadamente 24 KiB de pixels RGBA por rig, sem incluir overhead de GPU. Não há fundos quadriculados/pretos de referência colados ao modelo. As sprites lvl 1 existentes seguem como guia de identidade; a escultura continua procedural low-poly, não um modelo artístico importado de alta resolução.

## Laboratório atualizado

Em `docs/setor-limiar-3d.html`, o botão **GALERIA 3B.1** abre inspeção com os quatro arquétipos, foco individual, rotação por arrasto e vistas **frente / três-quartos / costas**. Em telas estreitas, abre com foco no arquétipo selecionado.

`operator-gallery.js` usa o mesmo `createOperator` do jogo principal, sem duplicar modelos ou implementar habilidades alternativas. Abrir a galeria durante a exploração encerra primeiro o mundo dimensional. Fechar/Esc descarta renderer, geometrias, materiais, texturas e eventos da inspeção; é possível voltar a explorar normalmente. A galeria não lê nem escreve saves. A fixture `tests/fixtures/dimension-operators.html` também continua usando o mesmo construtor.

## Custo visual explícito

Orçamento por rig em repouso, após batching por material dentro de cada articulação, sem efeitos de ação ativos:

| Arquétipo | Triângulos | Draw calls estimados | Altura visual |
|---|---:|---:|---:|
| X10 | 5.624 | 33 | 1,964 m |
| Bio-Forja | 5.864 | 40 | 1,964 m |
| Maré | 5.772 | 34 | 1,964 m |
| Domínio | 5.884 | 37 | 1,964 m |

A escultura acrescenta geometria em relação à versão anterior: não se afirma custo idêntico. Detalhes pequenos usam icosaedros de 20 faces; dutos têm cinco lados e poucos segmentos. O teste limita cada rig a menos de 6.500 triângulos e 50 calls de repouso. O corpo mantém o mesmo collider do gameplay; detalhes de ombreiras não ampliam artificialmente a colisão.

Na galeria real, os quatro modelos juntos mais o piso usaram 145 calls, 23.146 triângulos e 12 texturas. O teste principal mediu 123 calls / 31.211 triângulos na sua amostra de gameplay, aproximadamente 8 FPS em SwiftShader. Esses números são específicos das vistas e da renderização por software; não constituem promessa de FPS em GPU real. Nenhum orçamento ambiental foi relaxado e nenhum asset grande foi adicionado.

## Validação

- `dimension-sculpt.mjs`: face volumétrica/UV frontal, proporções, apoio dos pés, diferença de largura Bio/Maré, materiais nearest, orçamento de rig, normais para fora e ausência de escrita no estado.
- `dimension-sculpt-browser.mjs`: galeria real no laboratório, quatro modelos, vistas e retrato individual, troca dos quatro arquétipos durante exploração, descarte mundo→galeria, Esc, viewport móvel e ausência de escrita em storage.
- `dimension-browser.mjs`: jogo principal real, WASD, voo, órbita, Q, Âncora/save, barco, Maré/mergulho, ações já existentes, Esc/retorno 2D, reentrada e recuperação de perda de contexto.
- Regressões Node: `dimension.mjs`, `dimension-motion.mjs`, `dimension-identity.mjs`, `dimension-layout.mjs`, `dimension-environment.mjs` e `estrutura.mjs`.

Capturas comparativas com a mesma câmera ficam ignoradas em `.qa/sculpt-{before,after}.png`; comparação `.qa/sculpt-comparacao.jpg`. As vistas reais do laboratório estão em `.qa/sculpt-lab-{front,three-quarter,back,x10,mobile}.png`. As capturas são evidência de QA, não novos assets do jogo.
