# Acampamento da Enseada — refeitura das artes

## O defeito

Os dez props do acampamento (relógio, bancada, torre-antena, fogueira, tenda,
pilha de caixas, banco, cesto, árvore e caixote) vinham de um recorte por
**flood fill do branco** na arte-mestre. Esse recorte para no primeiro pixel
não-branco, então cada sprite arrastava um **anel de grama e areia** em volta
do objeto: o "halo" que fazia as peças parecerem coladas por cima do cenário.

Tentar recuperar a silhueta por cor não funciona — a lona verde da tenda é
`(81,130,74)` e a grama é `(86,127,57)`. São a mesma cor para qualquer limiar.

## A solução

Em vez de recortar melhor a arte antiga, os dez props foram **regerados** com
geração de imagem dedicada (`assets/source-art/reparo-norte-11/`), cada um
sobre fundo magenta chapado. Magenta não existe na paleta do jogo, então a
chave é exata e não sobra franja.

`tools/recortar-enseada-camp.py` faz o resto:

1. **chroma key** — fica só o magenta ligado à borda, então detalhe arroxeado
   dentro do objeto (mostrador do relógio, sombra da lona) não é comido;
2. **despill** — puxa R e B da franja anti-serrilhada para o nível de G,
   tirando o roxo da borda;
3. **limpeza** — na torre, apaga as "faíscas" laranja/amarelas que a geração
   acrescentou (o vermelho da estrutura tem G baixo, o filtro não o toca) e
   mantém só o maior componente;
4. **enquadramento** — monta a arte numa tela transparente com as proporções
   medidas na referência-mestre e centraliza na base.

## Por que o enquadramento importa

O caminho do desenho é `getFrame` → `drawCroppedObject`. O `getFrame` **recorta
o quadro no bbox do conteúdo** antes de desenhar, e o renderer faz
`h = larguraPx * crop.h / crop.w`. Duas consequências:

- **tela transparente não funciona** — o crop joga fora o padding, então
  enquadrar a arte numa tela com o aspecto desejado não muda nada;
- o que vale na tela é o **aspecto do conteúdo** contra a `larguraPx` do mapa.

Por isso o recorte é escalado uniformemente (sem distorção) até o tamanho
medido na `referencia-mestre.png`, e a `larguraPx` de cada objeto passa a ser
a largura **que o recorte realmente ficou**, não a largura da referência.

A escala final é a **média geométrica** entre a escala que casaria a largura e
a que casaria a altura da referência. Pela altura pura, uma geração mais
"gorda" que a arte-mestre estoura em largura (a tenda ia a 293 px, quase o
dobro da referência); pela largura, achata. A média fica perto das duas.

| prop | ref. (px de arte) | ref. jogo | saída (jogo) | larguraPx usada |
|---|---|---|---|---|
| relógio | 46 × 69 | 92 × 138 | 64 × 138 | 64 |
| bancada | 60 × 65 | 120 × 130 | 116 × 130 | 116 |
| torre-antena | 60 × 140 | 120 × 280 | 100 × 280 | 100 |
| fogueira | 41 × 43 | 82 × 86 | 89 × 86 | 89 |
| tenda | 77 × 80 | 154 × 160 | 213 × 160 | 213 |
| pilha de caixas | 68 × 55 | 136 × 110 | 132 × 110 | 132 |
| banco | 72 × 47 | 144 × 94 | 135 × 94 | 135 |
| cesto | 29 × 45 | 58 × 90 | 77 × 90 | 77 |
| árvore | 86 × 79 | 172 × 158 | 159 × 158 | 159 / 136 |
| caixa | 58 × 54 | 116 × 108 | 112 × 108 | 62 / 44 |

## Sobre a métrica de diferença

O diff de pixel arte-vs-jogo **piorou** após a troca:

| | antes (com halo) | depois |
|---|---|---|
| global | 55,75 | 56,07 |
| Setor 1 (230–690 × 140–400) | 56,28 | 58,46 |

Isso não é regressão visual. O halo era composto de **grama e areia copiadas do
próprio chão**, então ele "acertava" a referência justamente por repetir o
fundo — a métrica premiava o defeito. O número foi mantido aqui só para que
ninguém tente usá-lo como prova de melhoria.

## Resultado

- nenhum sprite carrega mais chão;
- as peças param de flutuar: cada uma assenta na base da própria arte;
- o banco foi movido de `(19.484, 38.734)` para `(21.15, 39.95)` porque, na
  posição antiga, cobria o **terminal de manutenção** (`18.5, 38.1`);
- nenhuma coordenada de id mudou — `enseada4_fogueira`, `enseada4_relogio`,
  `enseada_bandeirola_vento_b` e `enseada_bancada_campo_b` continuam intactos,
  como os testes exigem.

## Reproduzir

```bash
.venv/bin/python tools/recortar-enseada-camp.py
node tools/qa/render-enseada.mjs 1.15 /tmp/camp.png 16.5 37
```
