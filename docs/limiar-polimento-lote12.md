# Setor Limiar — lote 12 (polimento: textura, movimento e transição)

Dez folhas, nenhum sistema novo. O lote não acrescenta adereço, missão, inimigo
ou regra: ele melhora o que já estava em cena — o chão lia como mancha lisa, o
estandarte era um quadro parado, a lanterna acesa não piscava de verdade, o pé
não mexia o mundo e a entrada do setor escurecia chapada.

## Folhas

| arquivo | tipo | uso |
| --- | --- | --- |
| `detalhe-terreno.png` | textura 256² | detalhe multiplicado no terreno (`terrainMaterial`) |
| `detalhe-pedra.png` | textura 256² | detalhe multiplicado na alvenaria (`materials.masonry`) |
| `agua-caustica.png` | textura 256² | cáustica do leito raso (`materials.seabed`) |
| `mascara-transicao.png` | textura 256² | `alphaMap` do plano de entrada (dissolução) |
| `halo-aditivo.png` | sprite aditivo | halo de lanterna/estátua/caixote |
| `neblina-fundo.png` | sprite aditivo | sete bancos de bruma no horizonte |
| `lanterna-chama-0…3.png` | tira 4 quadros | chama da lanterna acesa (9 q/s) |
| `estandarte-tremura-0…3.png` | tira 4 quadros | tecido tremulando (4,5 q/s) |
| `poeira-passo-0…5.png` | tira 6 quadros | poeira no pé a cada passo |
| `folhas-vento-0…5.png` | tira 6 quadros | dez redemoinhos de folha na trilha |

Originais em `assets/source-art/setor-limiar-lote12/`; publicação em
`assets/textures|sprites/setor-limiar-lote12/` por
`python3 tools/preparar-limiar-lote12.py` (`OK: 4 texturas, 2 aditivos, 4 tiras`).

O preparador limpa **duas** famílias de fundo (cartão branco e breu preto), não
uma cor só: o gerador mistura as duas na mesma tira. Célula vem por projeção de
tinta, quadros entram num canvas fixo com âncora constante e o contorno de
magenta é erodido em 1 px — sem isso o pano saía com franja rosa.

## Grão sem escurecer

`materials.grain(material, textura, escala, quantidade)` injeta um mapa de
detalhe em `onBeforeCompile` multiplicando o `diffuseColor` em torno de 1:

```glsl
diffuseColor.rgb *= 1.0 + (limiarGrain.rgb - 0.5) * 2.0 * uGrainAmount;
```

A média da textura não muda a cor: `quantidade 0` é o material de antes. Terreno
a `30 ×`/`0,34`, alvenaria a `6 ×`/`0,42`. Nenhum draw call a mais, nenhuma
textura de 256 px vira mapa macro.

## Movimento

- **Passo medido no controlador.** Antes o som dependia de `onStep` do operador
  civil: os trajes (e as formas) nunca reportavam, então metade do jogo andava
  em silêncio e a poeira não teria de onde sair. Agora `runtime` acumula a fase
  `dt · min(9, velocidade · 1,15)` e dispara **um** passo por troca de pé, com
  som e poeira no mesmo evento. Parado, `stepSign` volta a zero — o primeiro
  passo depois da parada sempre conta.
- **Poeira** (`js/dimension/footfall.js`): pool fixo de 10 sprites, seis quadros
  em 0,5 s, escala `0,34 → 0,84`, opacidade `(1-t)²`. Nada é criado durante o
  jogo; a âncora em `(0.5, 0.12)` mantém a nuvem no chão.
- **Chama** entra no vidro que já tinha chama pintada, aditiva e pequena: ela
  passa a respirar em vez de ser um adesivo.
- **Estandarte** troca de mapa entre quatro quadros e congela no primeiro com
  `prefers-reduced-motion`. O pano do lote 12 já tem mastro próprio, então a
  troca acontece no nascimento do sprite.
- **Folhas** e **neblina** rodam em `sector-scene` a partir de `drift`, com
  posição refeita por `terrainHeight` e nenhum corpo físico.

## Transição

`flatPlane` (o snapshot 2D que dissolve na entrada) ganhou
`materials.transitionMask` como `alphaMap`, com o offset deslizando devagar
enquanto está visível. A entrada deixa de ser um fade uniforme e passa a abrir
em fumaça. Com `prefers-reduced-motion` o plano continua igual ao lote anterior:
quem disso depende não perde nada.

## Contratos e medidas

- `loadFrames` devolve `[]` sem DOM. Sem folhas, estandarte e lanterna ficam
  exatamente como no lote 11 (`flutter === null`, `flame === null`) e
  `createFootfall` devolve um objeto inerte sem pendurar grupo vazio.
- Nenhum `MeshPhongMaterial`; o leito continua Lambert e o detalhe é código de
  shader, não material novo.
- Cena do Limiar medida em `1280×800`: **102 chamadas**, **21 452 triângulos**,
  28 texturas — o teto do teste é 150/26 000.
- `tests/dimension-lote12.mjs` (7 casos) cobre folhas em disco, tiras com canvas
  igual, fallback sem DOM, flipbook do pano e da chama e a ausência de regressão
  sem folhas. `tests/dimension-lote12-browser.mjs` cobre carregamento real (zero
  404 de `lote12`), halo/neblina/máscara com imagem, dois estandartes e quatro
  chamas ligadas, poeira ao andar e o teto de chamadas.
- Capturas: `qa/upgrade/lote12-01-entrada.png` … `lote12-11-vento-b.png`.
