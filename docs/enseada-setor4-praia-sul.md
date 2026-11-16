# Enseada dos Ecos — Setor 4 (praia sul, cais e portais submarinos)

Fecha a reconstrução da Enseada. Os Setores 1–3 já estavam entregues; este
documento cobre o que mudou no Setor 4 e as **duas correções pedidas** ao
Setor 3.

## Correções ao Setor 3

### 1. O acampamento tinha perdido o relevo

O sintoma: o platô era desenhado, mas a parede de rocha sumia. O chão de terra
do mapa cobria a faixa e sobrava só uma mancha de lama chapada, sem leitura de
altura.

Duas causas somadas:

1. **A âncora estava alta demais.** `PAREDE['centro']` valia 38 px de arte, o
   que deixava a face de rocha fina. Subiu para **60 px** (16/22 nas pontas),
   então a base do paredão desceu e a âncora do sprite foi junto:
   `pivotY 0,831057 → 0,939912`, `(21,592 , 39,060) → (23,184 , 40,653)`.
2. **Faltava contorno em cada pedra.** A referência desenha *toda* pedra com
   contorno escuro grosso — é isso que faz ler como rocha empilhada. Sem o
   contorno, escurecer a paleta só trocava lama clara por lama escura.
   `desenhar_parede()` agora passa `outline=PALETA['rocha_contorno']` em cada
   `ellipse`, e os tons voltaram a ser claros (`rocha_clara 190,152,98`,
   `rocha_media 158,118,74`) em vez de um marrom uniforme.

O resultado confere com a `referencia-mestre.png`: uma banda de rocha de
~30–90 px de arte sob a areia, de x 300 a 630.

### 2. A montanha da Estação 66.6 estava pequena demais

O personagem em jogo tem **~130 px de altura** (`bio-walk.js`: `height
128,65–132,68`). O maciço, com `larguraPx 620`, tinha **299 px** — só 2,3× o
personagem, e por isso ele "encostava" no topo da montanha.

Passou para **`larguraPx 860`** (2,3× → 3,2× o personagem; a porta desenhada
sai de 170 px para 236 px, ~1,8× o personagem, que é a proporção certa para uma
porta de estação).

**A arte não foi tocada** — o usuário aprovou o desenho; mudou só a escala e o
que depende dela:

- portal `acesso_estacao_666`: `(21,655 , 10,555) → (21,681 , 9,381)`
- os 9 colisores `enseada_parede_estacao_i` reescalados em torno do pivô
  (a montanha cresce a partir da base, então a face acompanha)
- `tests/estacao-encaixe.mjs` fixava 620; agora fixa 860

O teste continua validando o encaixe real: o portal precisa cair sobre a soleira
desenhada (`larguraPx * 0,16` à direita e `0,077` acima da âncora), então ele
prova que o realinhamento está correto, não só que o número mudou.

## Setor 4

### O que já estava pronto e foi preservado

O **cais e o veleiro aprovados não foram redesenhados** (`enseada8_cais_barco_ref`,
`enseada_barco_expedicao`). O setor sul já tinha piscina, praça do espelho,
gruta, rede de treino, travessia de pedras, fonte termal e a orla com caranguejos
e estrelas.

### O que entrou

Arte nova em `assets/source-art/setor4/`, recortada por
`tools/recortar-enseada-setor4.py` (mesmo pipeline de chroma magenta dos outros
setores) para `assets/sprites/enseada-setor4/`:

| peça | sprite | tamanho | uso |
|---|---|---|---|
| `portal-submarino-coral` | `enseada4_portal_submarino` | 226×220 | `portal_submarino_fundo` (47; 60,5) |
| `orla-rochas-poste` | `enseada4_orla_rochas` | 116×80 | `orla_rochas_sul` (43; 55,5) |

E, reaproveitando arte que estava **registrada mas nunca colocada**:

- `enseada8_portal_ne` (`portal-nordeste-coral-recortado`) vira
  `portal_submarino_sul` (61; 55) — o portal de coral que a referência mostra
  no canto sudeste, com `nome: 'PORTAL SUBMARINO DE CORAL'`.

Dois portais ancoram a ideia de "portais submarinos" sem mexer em colisão de
navegação: ficam em água aberta, então não bloqueiam caminho a pé.

### Nota sobre o chroma key

O coral rosa do portal novo é quase magenta, e a `chave_magenta()` compartilhada
só remove magenta **ligado à borda** (para não comer detalhe arroxeado dentro do
objeto). Sobraram respingos de fundo ilhados no meio da peça. O script do Setor 4
resolve em duas etapas: mata magenta quase puro (`R>205, B>205, G<95`) em
qualquer lugar e depois descarta componentes menores que 0,4% do maior. Perdeu-se
algum coral rosa fino, mas o portal lê limpo à distância — e os portais de coral
que já existiam no repositório têm o coral mais grosso, sem esse problema.

## Testes

Os **11 falhos conhecidos** continuam sendo os únicos falhos
(`caminho-correntes`, `enseada-2-lote7/8/9/10`, `enseada-3-reference`,
`enseada-4-lote`, `limiar-frequencia`, `nado-desenho`, `oceano-animado`,
`praia-nado`). `enseada-ecos` precisou de uma linha: a asserção tem uma lista
fechada de IDs que podem bloquear, e `portal_submarino_sul` entrou nela.
