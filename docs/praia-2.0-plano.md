# PRAIA 2.0 — plano de reconstrução da costa

> Escrito na rodada 0.9.0 para não refazer caminho. Cada fase entrega algo
> jogável e testável por si; nenhuma fase depende de arte que ainda não existe.

## O diagnóstico (medido, não estimado)

O print do criador mostrou **20 FPS** a 55 % de zoom na Praia Inicial. A
contagem feita em Node sobre o mapa real (`/tmp/cost.mjs`, reproduzido em
`tests/praia-performance.mjs`) com a janela do print:

| | zoom 55 % | zoom 100 % |
| --- | --- | --- |
| tiles de chão desenhados por frame | 2116 | 729 |
| tiles de espuma (`drawBeachShore`) | 586 | 249 |
| ondas (`drawBeachRipples`) | **1618** | 535 |
| células varridas pelas ondas | 3249 | 1089 |

Aquilo que parece "vivo" no mar custa **~1600 `quadraticCurveTo` + 3249
`isoToWorld` + hash por frame**, e cada tile de chão é um `quad()` com
`beginPath`/`fill`/`stroke` próprios, tudo reordenado por profundidade.

**Nada disso é assado.** A areia já é uma textura única em cache
(`createBeachSurface`), mas o mar, a espuma e as ondulações são redesenhados
do zero a cada quadro.

## Fase 1 — o alicerce de renderização (esta rodada)

Objetivo: o mar e a espuma deixam de custar por frame e passam a ter o visual
da referência (`assets/source-art/coastal/ilha-panorama.png`).

1. **Cache do mar com espuma e ondulação assadas.**
   `js/engine/beach-water.js` monta, uma vez por mapa, uma textura contínua em
   coordenadas de mundo com: degradê raso → fundo, bancos de areia submersos,
   cáusticas, espuma na margem (com largura variável), linha de espuma
   recuada, e anéis de onda em faixas de profundidade. `drawBeachRipples` e
   `drawBeachShore` saem do caminho por frame e ficam só como **animação
   aditiva leve** (poucos arcos por quadro, só na borda visível).
2. **Chão em uma passada, sem ordenação por tile.**
   Os pisos de areia são textura única (já são); o que pesa é o laço por tile.
   A passada de chão passa a desenhar apenas o que tem sprite próprio, e a
   areia/espuma vêm das texturas contínuas.
3. **Escala da textura derivada do zoom.** A textura do mar hoje nasce a 8 px
   por tile; em zoom baixo o navegador amplia e borra. A textura passa a usar
   um fator calculado uma vez (nunca por frame) e é re-cacheada só quando o
   mapa muda — não a cada frame.

Meta medida: custo por frame da água caindo de ~2100 operações de path para
< 120, e o `render` do mapa sem nenhum `quadraticCurveTo` por tile.

## Fase 2 — a ilha inteira, contínua

O mapa hoje é feito de **quadrados de 48×48 em xadrez**: cada ilha é
`pintarIlha` (elipse + ruído) e as bordas ficam com degraus de 1 tile. O
`beach-novas-artes.png` tem 16 transições prontas (borda reta, canto convexo,
canto côncavo) mas **nada no código as usa** — a areia é textura procedural.

- **Costa por campo de distância**: em vez de degraus por tile, a máscara de
  areia passa a sair de um campo suave (`distância assinada` da forma da ilha)
  e a textura de areia desenha a borda com jitter de 2–3 px, então a costa
  lê como curva, não como escada.
- **Espuma e água seguem a mesma borda suave** (não a grade), eliminando as
  emendas de losango que aparecem hoje entre areia e mar.
- **Kit de props da referência** (`coastal/praia.png`): falésias em bloco,
  arco de pedra, cachoeira, ilhotas com palmeira, recifes — recortar em
  `tools/preparar-costa-2.py` e usar como `costa_rochosa` ampliado.

## Fase 3 — o trem com estação

O trem está solto sobre a areia (print 1). A `linha-trem.js` já define trilho
e trem; falta a **plataforma** em volta: piso de deck elevado, pilares,
cobertura, placa e escada, usando `beach-props.png` (deck) + `praia/
plataforma-kit-0311.png`. Nada de colisão nova que quebre os testes de rota:
a plataforma é decoração + piso andável, e a cabeceira das pontes continua
livre.

## Fase 4 — mergulho livre e vida aquática

Para o Maré Astral (e as formas do Núcleo / equipamento do Bio e do Domínio):

- **Zona de água navegável**: `map.aguaNado` marca as células onde o corpo
  entra na água (mar raso e fundo), com transição suave de velocidade e
  respiração. Núcleo Veloz nada mais rápido; a Quebra afunda (peso); o
  Maré ganha propulsão na água.
- **Cardumes que reagem** (a arte já existe: 8 quadros), bolhas, raios de luz
  assados na textura, e recifes como pontos de interesse.
- **Missão do Maré**: rastro submerso → criatura → recompensa, usando o
  sistema de `collectibles` que já existe.

## Fase 5 — fauna viva

Gaivotas pousando e levantando voo (os 8 quadros já cobrem), caranguejos com
rotina de beira de água, capivaras na borda da mata. Orçamento por região e
simulação resumida fora da tela, como o `visao-expansao-arquipelago.md` pede.

## Estado real da entrega

Todas as fases do plano foram implementadas e commitadas, cada uma com
teste-contrato próprio:

| Fase | O que entrou | Teste |
|---|---|---|
| 1 | costa contínua (`coast-field.js`), mar assado, areia sem tecido | `beach-surface.mjs`, `praia-performance.mjs` |
| 2 | estação em volta do trem + 6 marcos de orla | `estacao-praia-0314.mjs`, `arquipelago-polimento.mjs` |
| 3 | natação, fôlego, afogamento, propulsão do Maré | `praia-nado.mjs` |
| 4 | recifes, cardumes, raios, bolhas, fragmentos | `praia-vida-aquatica.mjs` |
| 5 | missão MARÉ PROFUNDA (mergulho → coleta → recompensa) | `praia-missao-mare.mjs` |

Duas decisões mudaram em relação ao plano original, e por bons motivos:

- **Não existe `map.aguaNado`.** A água nadável é lida de `aguaPraia` e a
  profundidade vem do campo de costa. Criar uma segunda grade de verdade
  sobre o chão seria justamente o tipo de duplicação que gera divergência
  entre o que se vê e o que se anda.
- **Nadar é mais lento que andar** (0,82× no raso, 0,92× no fundo). O plano
  não previa isso; sem essa trava a água virava atalho e furava o desenho
  de rotas.

## Regras que não mudam

- A máscara de colisão continua sendo a única fonte de caminhabilidade.
- Saves e flags antigos continuam válidos.
- A praia aprovada não é substituída por uma imagem achatada.
- Nenhum sistema novo prometido sem teste que o prove.
