# Maré Cromática — lote 11 (posto de sinais)

Lote visual e mecânico opcional da Baía de Quarentena. Nada aqui bloqueia a
âncora, o rank, os dados, a ponte ou a fenda: a missão continua concluível sem
tocar em nenhum prop novo. O que o lote entrega é **leitura de baía viva** —
um posto de sinais na areia, um sino na arrebentação e um farolim que só acende
quando alguém leva carga ao gerador.

## Folhas

| arquivo | uso |
| --- | --- |
| `mesa-cartas.png` | mesa de cartas do posto, interativa |
| `papel-carta.png` | textura 256² do quadro de marés |
| `placa-quarentena.png` | placa de área isolada, interativa |
| `sino-neblina.png` | sino de neblina em cavalete, interativo |
| `gerador-quarentena.png` | gerador do píer, interativo |
| `lente-farolim.png` | lanterna de Fresnel sobre pedestal (farolim) |
| `vidro-farol.png` | textura 256² do vidro do farol e da lanterna do farolim |
| `boia-cromatica.png` | boia derivando no canal |
| `rede-deriva.png` | duas redes encalhadas na areia |
| `corda-alcatrao.png` | textura 256² do cordame do píer |

Originais em `assets/source-art/mare-missao-lote11/`; folhas publicadas em
`assets/sprites/mare-missao-lote11/` e `assets/textures/mare-missao-lote11/` por
`tools/preparar-mare-lote11.py` (`OK: 3 texturas, 7 props`).

## Contratos

- Quatro props interativos (`kind: lote11-*`) com raio de colisão, célula livre,
  pelo menos três aproximações caminháveis e visibilidade verificada célula a
  célula — todos entram em `nearestSignal`.
- **Mesa de cartas** (`7.4…` oeste da praia, em `11.6, 28.2`): reduz 10 de
  tensão, escreve `flags.chart` e passa a orientar o objetivo
  (`FAROLIM — leve carga ao gerador do píer`). Releitura é idempotente.
- **Placa de quarentena** (`6.0, 29.4`, ao lado do farolim): reduz 4 de tensão e
  fixa o tom do posto (`flags.placa`).
- **Sino de neblina** (`26.6, 11.8`, na arrebentação): reduz 16 de tensão, joga
  ruído 0,6 na baía inteira (inimigos investigam) e tem recarga de 4,5 s. O
  pulso `lote11RingPulse` abre a neblina por 2,4 s (`fog.density`).
- **Gerador de quarentena** (`22.8, 28.1`, na boca do píer): `flags.power`,
  lanterna em 100%, `lampOn`, fôlego mínimo de 80 e o farolim aceso.
- **Farolim** (`LOTE11_BEACON` `3.6, 28.8`): pedestal de pedra, lanterna de
  Fresnel a 2,2 m, halo aditivo e poça de luz na areia. Apagado fica cinza;
  aceso pulsa e ilumina a areia de verdade (PointLight).
- Texturas: `papel-carta` no quadro de marés, `corda-alcatrao` no cordame sul do
  píer e `vidro-farol` no vidro do farol e da lanterna do farolim.
- HUD: `SINAL n/4 · FAROL ON/OFF` na linha de leitura, alvo na linha de
  objetivo, marcadores e legenda no mapa tático.
- Áudio: cartas 330 Hz triangle, placa 262 Hz triangle, sino 196 Hz sine 1,7 s,
  gerador 72 Hz sawtooth 1,2 s.

## Verificação

- `tests/mare-mission-lote11.mjs` cobre folhas e texturas (dimensão 256²),
  colisão e aproximações, idempotência, tensão, ruído, recarga, pulso do sino,
  farolim aceso/apagado, contagem do painel e colisão de nomes com lotes 8–10.
- `qa/upgrade/lote11-mare-*.png` — posto antes/depois, cartas, placa, sino (com
  onda), gerador, farolim aceso/apagado, cordame e mapa tático.
- O afastamento dos sprites (`.mare` → `shadeSprite`) começa em 0,9 m e chega a
  1,75 m: adereços deixam de sumir justo na distância de interação.
