# Maré Cromática — Lote 3: farol, enfermaria e memória dos perseguidores

Continuação direta da base (`docs/mare-missao-base.md`) e do lote 2 (`docs/mare-missao-lote2.md`). O lote 3 acrescenta **dez originais**, seis registros de lore persistentes, uma IA de perseguição com memória/percepção falível e um fechamento de missão legível (relatório de eco) sem alterar o contrato global: missão contida, rank local 1–4, três dados, sabotagem inevitável e ponte existente do Setor Limiar.

## Dez originais deste lote

Fonte em `assets/source-art/mare-missao-lote3/`; sprites em `assets/sprites/mare-missao-lote3/`. O preparo é reproduzível por `PYTHONPATH=.qa/python python tools/preparar-mare-lote3.py` (chave magenta, NEAREST, erosão alfa MinFilter 3 e recorte justo).

| arquivo | uso |
| --- | --- |
| `diario-faroleiro` | registro opcional na cabana noroeste |
| `lente-farol` | peça de Fresnel abandonada, ao sul da cabana nordeste |
| `mapa-evacuacao` | mapa de rota no lado leste da cabana nordeste |
| `maca-quarentena` | maca com correias cortadas na cabana sudoeste |
| `prontuario-quarentena` | carrinho e prontuário 07 na cabana sudoeste |
| `caixa-sinal` | caixa de sinalizadores na cabana sudeste |
| `infectado-busca` | deslocamento de busca |
| `infectado-escuta` | pausa de escuta |
| `infectado-atordoado` | atordoamento pela habilidade Q |
| `infectado-erguendo` | recuperação do atordoamento e do golpe |

Os seis props têm colisão própria (`r`), maior para a maca e a lente, para não serem atravessados.

## Lore persistente

`js/dimension/mare-mission-lore.js` define seis registros com posição, arte, escala, raio e texto. `useLore` grava o id em `progress.mareMission.lore`, sanitizado no reload (sem duplicatas, ids desconhecidos ou tipos inválidos). Cada registro é lido uma vez, exige alcance e linha de visão (via `nearestSignal`) e **não** conta como dado mnemônico, não eleva rank e não bloqueia a âncora.

Textos amarram farol, evacuação e Nulo: o sino sem vento, a lente virada para dentro, a rota que contorna a âncora, as correias cortadas por dentro, o prontuário assinado pelo faroleiro e os sinalizadores que faltam. Ao chegar a 4/6 e 6/6, Nulo reconhece o jogador numa linha extra.

## Percepção e perseguição com memória

Substitui a perseguição onisciente por um modelo falível:

- **Visão:** 16 unidades em pé, 9 agachado, sempre com LOS real.
- **Audição:** passos silenciosos quase não atraem; caminhada atrai a ~3,5 unidades; corrida a ~7. O ruído alimenta a posição de memória.
- **Memória compartilhada:** a dupla persegue a última posição vista/ouvida (`track`) por até 7 s. Sem pistas, patrulha ao redor do ponto de origem.
- **Ping de Nulo:** a cada 18 s, Nulo sugere o padrão do jogador; é pressão narrativa, não visão perfeita.
- **Busca → escuta:** ao chegar ao ponto sem ver o jogador, o infectado para e escuta por 1,7 s, depois volta a patrulhar.
- **Combate:** windup 0,7 s → strike 0,2 s → recover 1,15 s; Q atordoa, seguido de `rise` de 0,8 s.
- **Iscas:** rádio/sino continuam desviando a dupla por 12 s e suspendendo o ataque.
- **Animação:** cada estado tem sprite próprio (`search`, `listen`, `stunned`, `rise`, `windup`, `strike`) e o renderer usa `enemyArt`.

## Missão, transição e relatório

- Fade de entrada de 1,6 s; a missão continua jogável durante o fade.
- Ao concluir, um painel de **RELATÓRIO DE ECO** mostra descompasso, memórias, registros, lore, baliza e uma linha de Nulo. O texto varia conforme a exploração opcional.
- O relatório permanece por ~3 s e o quadro escurece até a troca para a ponte do Limiar. `complete()`, `save()`, o retorno 2D e `rupture.js` não foram alterados.
- O HUD mostra `LORE x/6` além de fôlego, ruído e registros.

## Testes executados

Sequencialmente:

1. `node --test tests/mare-mission-life.mjs tests/mare-mission-lore.mjs tests/mare-mission.mjs tests/dimension.mjs tests/dimension-rupture.mjs tests/cidadela-progressao.mjs` — **6/6**.
2. `node tests/mare-mission-browser.mjs` — entrada, 30 sprites decodificados, rádio, diário, lente, maca, report, objetivos encenados, sabotagem, áudio, ESC e rollback de asset — **PASSOU**.
3. `BROWSER_EXECUTABLE=... BROWSER_LIBRARY_PATH=... PLAYWRIGHT_MODULE=... node tests/dimension-rupture-browser.mjs` — terminal final → diálogo → missão → relatório → Limiar → ESC/2D — **PASSOU**.

Capturas relevantes: `qa/mare-lore-diario.png`, `qa/mare-lore-lente.png`, `qa/mare-lore-maca.png`, `qa/mare-echo-report.png`, além das capturas de base e do lote 2.

## Limites honestos

- As capturas da missão usam `canvas.toDataURL()` (somente o quadro do jogo, sem HUD) porque o compositor headless deste ambiente pode travar screenshots de página inteira; o teste de página inteira do Limiar captura de forma tolerante a falhas.
- Objetivos e registros são encenados por coordenadas nos smokes; **não** é um playthrough manual.
- O teste de ponte não observa necessariamente o instante transitório `entering` sob render por software lento; ele verifica o handoff (missão removida) e a chegada ao Limiar, avançando ticks de forma determinística.
- Não houve medição de FPS em dispositivo real; o renderer continua 384×216 por software. A suíte histórica completa não foi reexecutada e as falhas herdadas permanecem.
- A IA é robusta nos pontos testados (quatro cabanas, cais, fuga, ruído, atordoamento), mas cantos estreitos ainda usam histerese de waypoint; não há garantia formal para toda posição.
- O áudio segue procedural e opt-in; a trilha 2D existente não foi substituída.
