# Limiar — roupa civil, cobertura capilar e HUD X10

## Referências inspecionadas

Foram abertas visualmente as artes `assets/sprites/player/player-sheet.png`, `player-bio-forja-lvl1.png`, `player-mare-lvl1.png`, `player-dominio-lvl1.png`, `assets/source-art/nado/civil-nado-a.png`, `assets/sprites/ui/nucleo-forma-veloz.png` e `assets/source-art/nucleo/quebra-sistemas-turnaround.png`. Incluem frente, lados, costas, poses de propulsão/ataque e as duas formas. O fundo magenta das referências não entra no modelo nem em textura nova.

## Mudanças reais

- O construtor compartilhado passa a verificar o identificador nativo exato de `equippedSuit`: `bio_forja`, `mare`, `dominio`. Selecionar um arquétipo não veste automaticamente sua armadura.
- Roupa convencional: regata preta, cargo clara com bolsos, braços tatuados expostos e calçados escuros. As placas peitorais, nervuras, ombreiras, luvas e luzes da armadura são retiradas dessa silhueta. X10 permanece nessa identidade humana, com bracelete no antebraço, mesmo que receba um valor inválido de traje.
- Cabelo: cobertura contínua acompanhando o crânio, com abertura frontal para a testa, laterais e nuca cobertas e mechas superiores mais baixas. A vista de costas foi inspecionada após corrigir uma faixa de pele que ainda aparecia na primeira tentativa.
- Trajes mantêm as suas construções próprias: Bio com placas, mecanismo e propulsão; Maré com dutos ciano e duas correntes móveis sobre os canais do torso; Domínio com dourado e lâmina. A roupa ativa também determina o perfil de apresentação das ações humanas. Mecânicas e IDs das habilidades não foram alterados.
- Removidos os octaedros flutuantes de Domínio e os fragmentos cristalinos da transformação. Transformação usa correntes em arcos segmentados mescladas em uma malha fixa. Bio ganha lâmina curta e larga/rasgo de impacto; Maré usa arco longo e fino de corrente; Domínio conserva lâmina longa, rastro dourado e eco de domínio no solo durante leitura. Bio conserva os jatos do rig anterior.
- Os rigs articulados já existentes de Veloz e Quebra Sistemas foram preservados, não substituídos nesta passada. Continuam com proporções, posturas e animações próprias.
- HUD X10 compartilhado pelo jogo e laboratório, com artes canônicas, cartões de seleção/forma ativa/bloqueio, barra e segundos de duração/recarga, R selecionar e T transformar/retornar. Botões usam o mesmo caminho de entrada do teclado/toque; não há transformação paralela. A sincronização nativa bloqueia o botão T temporariamente. Nenhum `innerHTML` recebe estado do save.
- Galeria adiciona comparação entre roupa convencional e trajes equipados. Continua sendo prévia artística sem desbloquear formas ou escrever save.

## Limites preservados

Sem mapas novos, mudanças de missão/lore, nível 2, desbloqueios, novas regras de dano, migração de save ou alteração da roda 2D. Quebra Sistemas continua exigindo nível 4 no jogo. R e T mantêm as regras anteriores; o HUD apenas as projeta. Movimento reduzido deixa as correntes estacionárias e não é ativado implicitamente.

## Medidas finais em repouso

Contagem de malhas visíveis, incluindo ancestrais; texturas NearestFilter, sem mipmaps.

| Modelo | Triângulos | Draw calls |
|---|---:|---:|
| X10 civil | 3.394 | 30 |
| Bio equipado | 6.594 | 46 |
| Maré equipada | 6.062 | 42 |
| Domínio equipado | 6.254 | 43 |

Galeria WebGL final: **162 calls, 22.306 triângulos, 12 texturas**. Veloz e Bruta conservam os seus rigs anteriores. A geometria removida e os modelos trocados continuam sujeitos ao descarte compartilhado. Correntes não criam geometria/textura por frame.

A amostra do teste principal teve 122 calls / 29.501 triângulos / 4 FPS em **SwiftShader**. Não representa desempenho de GPU física nem uma garantia de FPS.

## Validação executada

Node: `dimension`, `dimension-motion`, `dimension-identity`, `dimension-performance`, `dimension-sculpt`, `dimension-polish`, `dimension-layout`, `dimension-environment`.

Chromium real com SwiftShader: `dimension-browser`, `dimension-sculpt-browser`, `dimension-environment-browser`, novo `dimension-polish-browser`.

O novo teste verifica roupa convencional/equipada no construtor e no T do gameplay dos três arquétipos; ausência de octaedros; X10 sem traje; botões do HUD com ativação/retorno, recarga e forma bloqueada; largura móvel; nenhum erro de página; `localStorage` inalterado no laboratório. Testes existentes cobrem movimento, voo, mergulho, barco, colisões, troca de contexto, descarte, retorno 2D e animações das duas formas.

A primeira tentativa de clicar em T durante o efeito nativo de transformação foi corretamente rejeitada. O HUD passou a mostrar SINCRONIZANDO e desabilitar o botão durante essa janela; o teste aguarda a disponibilidade real, sem remover a trava nativa.

Capturas de QA (ignoradas pelo Git): `.qa/polish-equipped.png`, `.qa/polish-civilian.png`, `.qa/polish-back.png`, `.qa/polish-hud-active.png`, `.qa/polish-hud-recharge.png`, `.qa/polish-mobile.png`.
