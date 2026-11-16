# Enseada dos Ecos — camadas de solo, relevo e Setor 3

Correções de camada/relevo no norte e o primeiro lote do Setor 3
(centro-sul e oeste).

## 1. A camada de terreno cortava a Estação 66.6

O sintoma: uma faixa de grama subia pela frente da montanha e **fatiava a
piscina da cachoeira ao meio** — a água descia, mas a grama passava por cima da
metade de baixo, e o nível do chão invadia a base do penhasco.

A causa não era z-index. O chão é uma **textura única** (`beach-surface.js`)
pintada por `drawBeachSurface`, e a grama do interior nasce da distância à água:

```js
let grama = gramaInterior ? smooth((shore - 2.2) / 2.4) * foraDaTrilha : 0;
```

Com `gramaInterior: true`, tudo que está a mais de ~4,6 tiles da água vira
grama — inclusive as células onde a montanha está desenhada. Medido contra a
planta do sprite (`ancora (18,6 ; 18,1)`, `larguraPx 860`, `pivotY 0,98`):
as células **y=10–14, x=9–21** caem todas dentro da área do maciço, e a base do
sprite termina sobre elas. Daí a linha verde cortando a água.

**Correção — `zonasRocha`:** nova opção em `createBeachSurface` (e repassada em
`renderer.js`). É o inverso de `zonasGrama`: apaga a grama onde o relevo
desenhado já é o chão visível.

```js
zonasRocha: [{ x: 15.0, y: 11.2, rx: 6.4, ry: 3.4 }],
```

A zona cobre **só a faixa que o penhasco ocupa**. A primeira tentativa usou
`rx 7.2 / ry 4.6` + uma segunda zona de ligação e o resultado foi uma mancha de
**areia crua** no meio da ilha, porque a grama sumia justamente onde ela precisa
existir. Menor é melhor aqui.

## 2. O platô do acampamento estava no chão plano

A peça em uso (`plato-acampamento`) tinha parede de pedras redondas mas **sem
degraus**, e o sprite `terraco-plato` do repositório — platô rochoso com escada
descendo à direita — nunca foi usado.

- sprite trocado para `terraco-plato-recortado` (1165×641), `larguraPx 820`,
  `pivotY 1` (a base do paredão é o ponto de apoio)
- a escada da arte cai logo à direita do acampamento, como na referência

### Ligação contínua com a montanha

`enseada_ligacao_plato_estacao` (20,6 ; 27,4), sprite `encosta-plato-recortado`
(1318×594), `larguraPx 430`, `camada fundo`, `ordem −1`. É a peça de encosta em
"U" com penhasco à direita: sai da borda direita do platô e sobe até a encosta
da Estação 66.6, atrás da biruta e das palmeiras — sem vão.

### Nota sobre dois sprites do repositório

`terraco-plato.png` e `encosta-plato.png` tinham o **xadrez de transparência
assado na imagem** (cinza neutro opaco, `224,223,223` / `193,193,193`, 45% dos
pixels no primeiro). Sem limpar, o platô aparecia cercado por um tabuleiro
branco. Os dois passaram por um filtro que zera o alfa só de cinza **neutro e
claro** — pedra e grama têm saturação, então não são tocadas:

```python
cinza = (|r-g|<8) & (|g-b|<8) & (|r-b|<8) & (r>=170)
im[cinza, 3] = 0
```

## 3. Setor 3 — centro-sul e oeste

Boa parte já estava no mapa e continua igual: pórtico oeste, concha gigante,
espelho dos arquétipos no piso de pedra, monólito, estela e pilha zen.

Arte nova (`assets/source-art/setor3/`, recortada por
`tools/recortar-enseada-setor4.py`, que agora atende os dois setores):

| peça | sprite | tamanho | uso |
|---|---|---|---|
| piscina termal com cascata | `enseada3_piscina_termal` | 343×236 | substitui a antiga "piscina de maré viva" (28 ; 50), `larguraPx 300`, `pivotY 0,90` |
| capivara | `enseada3_capivara` | 89×68 | `capivara_piscina_enseada` (27,9 ; 49,9), `larguraPx 42` |
| fonte de cristal | `enseada3_fonte_cristal` | 119×104 | `fonte_cristal_enseada` (30,4 ; 54,6), `larguraPx 78` |

A piscina nova tem o anel de pedras irregulares e a cascata da referência, e a
capivara senta na beirada da água.

## 4. Animações

- **Vapor térmico na piscina** (`vaporTermal: true`). O efeito já existia em
  `renderer.js`, mas estava **depois do `return` do caminho `useCrop`** — ou
  seja, nunca rodava. Foi movido para dentro de
  `drawEnseadaObjectAnimations` (que é chamada antes do retorno) e entrou na
  lista de flags que acordam a função. São cinco colunas curvas subindo da
  água, com anel de vapor quando a fonte termal já foi visitada.
- **Brilho pulsante** na fonte de cristal (`pulsoBiolum: '#7fe3ff'`).
- **Brilho** na piscina (`pulsoBiolum: '#5cf7eb'`), preservado da peça antiga.

## Testes

Os **11 falhos conhecidos** continuam sendo os únicos falhos. `enseada-ecos`
precisou de mais uma entrada na lista fechada de IDs que podem bloquear
(`fonte_cristal_enseada`). `estacao-encaixe` continua passando: o realinhamento
do portal e dos colisores da face mantém a soleira alcançável.
