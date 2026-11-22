# Maré Cromática — Lote 2: vida, perseguição e leitura de combate

Este lote **não substitui** a missão da baía aprovada (ver `docs/mare-missao-base.md`). Ele aprofunda exploração, navegação hostil, física de movimento e áudio dentro do mesmo contrato: missão contida em primeira pessoa, rank local 1–4, três dados mnemônicos, sabotagem inevitável e retorno à ponte existente do Setor Limiar. `js/dimension/rupture.js`, `dimension-manager.js`, inventário, vida e identidade globais permanecem intocados.

## Dez originais deste lote

Fonte em `assets/source-art/mare-missao-lote2/`; sprites em `assets/sprites/mare-missao-lote2/` (fundo magenta removido, minificação NEAREST, erosão alfa MinFilter 3 e recorte justo). O preparo é reproduzível por `PYTHONPATH=.qa/python python tools/preparar-mare-lote2.py`.

| arquivo | função em cena |
| --- | --- |
| `retrato` | retrato do faroleiro, lore opcional |
| `radio` | rádio de emergência, isca sonora de 12 s |
| `gerador` | gerador costeiro, restaura luz de serviço |
| `armario` | reserva de emergência, recupera fôlego uma vez |
| `rede` | rede de evacuação, etiquetas do Núcleo X10 |
| `sino` | sino de neblina, isca sonora alternativa |
| `boia` | baliza de retorno, checkpoint local |
| `valvula` | válvula de drenagem, remove a resina do corredor |
| `infectado-preparo` | pose legível de windup antes do golpe |
| `infectado-golpe` | pose de impacto, distinta do windup e do repouso |

Os oito props são conteúdo opcional: **não contam** como dados mnemônicos, não alteram rank e não são exigidos para concluir a missão.

## Mecânicas e física

- **Interação com linha de visão:** `nearestSignal` ordena por distância, mas descarta alvos atrás de paredes. Interagir não atravessa geometria; o alcance é 1,8 unidades.
- **Reservas de uso único:** o armário só restaura fôlego/tensão uma vez por missão. Rádio e sino não acumulam iscas (uma isca ativa bloqueia a próxima) e duram 12 s.
- **Isca de perseguição:** com isca ativa, o campo de fluxo dos perseguidores aponta para o som em vez do jogador; o ataque é suspenso nesse período.
- **Terreno e tração:** resina no corredor central reduz velocidade e aceleração lateral até a válvula ser aberta; cabanas usam piso de madeira, exterior pedra, com passos distintos.
- **Fôlego, corrida e silêncio:** Shift corre (mais ruído e consumo), C agacha (52% de velocidade, ruído mínimo), fôlego esgotado aplica penalidade leve. Ruído alimenta a velocidade de busca dos infectados.
- **Colisão subdividida:** `move` fatia deslocamentos em passos de 0,08 unidade, impede tunneling por impulsos grandes, ignora NaN e zera velocidade no eixo bloqueado.
- **Checkpoint local:** a boia define o ponto de retorno em caso de colapso por tensão; nenhum dado, item ou rank é perdido.
- **Perseguição compartilhada:** os dois infectados entram em caça após 45 s de missão (antes eram 60 s), mantendo a sabotagem e a saída intactas. um único campo de fluxo BFS 32×32 é reconstruído a cada 0,5 s para os dois perseguidores, com histerese de waypoint, fallback por linha de visão direta, adaptação por arquétipo, espaçamento entre corpos e estados hunt → windup (0,7 s) → strike (0,2 s) → recover (1,15 s). A habilidade Q atordoa.
- **Leitura de combate:** poses de preparo/impacto, sons distintos para windup/strike, tremor de câmera próximo ao golpe e recuperação longa o suficiente para contra-ataque ou fuga. `prefers-reduced-motion` remove bob e tremor.

## Áudio opcional

O botão ÁUDIO continua opt-in. Quando ligado: drone, mar filtrado, rádio, passos por superfície, respiração ofegante com fôlego baixo, pulso cardíaco que acelera com tensão e camada final. Um ganho mestre com compressor/limiter e um controle de volume na HUD evitam picos. A trilha 2D existente não é substituída; esta é uma camada procedural da missão.

## Testes executados neste lote

Sequencialmente, sem paralelismo:

1. `node tests/mare-mission-life.mjs` — oito props alcançáveis, unicidade, LOS bloqueada por parede, iscas/limites, uso único, terreno antes/depois da válvula, checkpoint, dados/rank intocados, colisão subdividida e perseguição com estados.
2. `node --test tests/mare-mission.mjs tests/dimension.mjs tests/dimension-rupture.mjs tests/cidadela-progressao.mjs` — 4/4; com o novo arquivo, `node --test` sobre os cinco — 5/5.
3. `node tests/mare-mission-browser.mjs` — entrada, decodificação dos 20 sprites, interação real com rádio via DOM, HUD `REGISTROS 1/8`, objetivos encenados, sabotagem por tempo, áudio opcional, estado preservado, ESC e rollback de asset.
4. `BROWSER_EXECUTABLE=... BROWSER_LIBRARY_PATH=... PLAYWRIGHT_MODULE=... node tests/dimension-rupture-browser.mjs` — terminal final real → diálogo → missão → Limiar → ESC/2D, referências e vitais preservados.

Capturas: `qa/mare-mission-baia.png`, `qa/mare-mission-cabana.png`, `qa/mare-detail-radio.png`, `qa/mare-detail-boia.png`, `qa/mare-detail-pursuit.png`.

## Limites honestos

- As capturas de objetivos e de props usam posicionamento encenado no teste; **não** são uma alegação de playthrough manual completo. A conectividade é checada por BFS no modelo, não por um jogador humano.
- Não foi medido FPS em dispositivo real; não há alegação de desempenho. O renderer continua 384×216 por software.
- A suíte histórica completa não foi reexecutada; permanecem as falhas herdadas documentadas em trabalhos anteriores (23 arquivos legados). Nenhuma falha nova foi observada nas cinco suítes acima.
- O campo de fluxo é compartilhado e limitado, mas cantos estreitos ainda dependem da histerese de waypoint; os quatro pontos testados (cabanas e cais) convergem, sem garantia formal para toda posição possível.
- O áudio procedural é uma camada de atmosfera, não uma trilha composta ou premiada; o áudio 2D existente segue sendo a trilha do jogo.
