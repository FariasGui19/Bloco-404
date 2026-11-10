# GUIA DE ANIMAÇÃO DOS ARQUÉTIPOS — como cada folha foi feita

> Documento de passagem. Escrito no fim da rodada 0.7.x (Maré Astral + T dos
> quatro módulos) para a próxima IA continuar **o Domínio Ancião** sem refazer
> o caminho. Tudo aqui é verdade do repositório: caminhos, números e comandos
> foram conferidos no código, não são estimativas.

---

## 0. Resumo em uma tela

Cada arquétipo é um **módulo** com o mesmo desenho de jogo:

| Camada | O que é | Onde vive |
| --- | --- | --- |
| corpo base | operador civil (macacão cinza), 4 direções | `assets/sprites/player/player-*.png` |
| caminhada | folha por direção, medida em px | `js/data/<arq>-animation.js` |
| ataque | folha por direção | idem |
| Q / R | habilidade + folha | `js/game/abilities.js`, `js/game/archetype-powers.js` |
| **F (Ultimate)** | uma folha **por escolha** (ferramenta/corrente/forma) | `js/data/<arq>-ultimate-animation.js` |
| **T (transformação)** | sequência de 4 quadros, ida e volta | `js/data/transform-animation.js` |
| leitura ambiental | partículas desenhadas no canvas | `js/engine/renderer.js` (`draw*Fx`) |
| Códex | mostra a pose de preparo da escolha | `js/ui/codex.js` |

Estado na 0.8.0: **os quatro arquétipos estão completos** — caminhada, ataque,
Q, R, T e F com arte própria. `nucleo_dez_forma` é o caso especial (formas, não
traje). O que sobra é polimento, não lacuna: ver §8.

---

## 1. Regras de arte (não negociáveis)

1. **Nada de personagem conhecido.** O corpo é sempre o operador original:
   homem negro, cabelo black power curto, óculos redondos, bigode.
2. **Paleta por arquétipo** (usada nas folhas e nas partículas):

   | Arquétipo | Base | Brilho | Detalhe |
   | --- | --- | --- | --- |
   | Motor Bio-Forja | azul-grafite escuro | ciano `#3fd0ff` | âmbar/dourado `#ffc23d` |
   | Maré Astral | azul-esverdeado escuro | ciano `#53d9f4` | verde `#8cff9e` |
   | Domínio Ancião | grafite | dourado `#ffd465` | ciano do núcleo `#54ccff` |
   | Núcleo 10X | cinza do macacão | verde esmeralda `#6bff92` | — |

3. **Fundo magenta chapado** nas fontes (`#FF00FF`). É o que o recorte usa para
   virar alpha. Nunca entregar PNG de arte com fundo colorido.
4. **Sem texto, sem número, sem moldura, sem sombra de chão, sem clone fantasma**.
   Esses cinco erros são os que o gerador comete com mais frequência.
5. **Uma folha = uma linha de quadros.** Se vier uma segunda linha, é lixo:
   descartar e regerar.
6. **Costas ≠ perfil.** Vista de trás não se espelha nem reaproveita lateral.
   Foi bug real no Bio (soco de costas) e no Maré (Q de costas).

---

## 2. Prompt: o template que funciona

Ordem dos parágrafos importa mais que o vocabulário. Este formato entregou
cinco folhas boas seguidas:

```text
A single horizontal band sprite strip, canvas four times wider than tall,
exactly 4 equal columns in ONE row and nothing below them. Each column holds
ONE single figure, centred, wide empty magenta margins, nothing crossing a
column edge. Same character in all four columns: <DESCRIÇÃO FÍSICA FIXA:
cabelo, óculos, bigode, traje, paleta>. FRONT VIEW, same size, same feet
height, one body per column.

Column 1: <verbo de preparo + o que a energia faz>
Column 2: <energia toma o corpo / arma se forma>
Column 3: <pico: o golpe chegando no alvo>
Column 4: <recuperação: energia se dissipando, corpo voltando>

Flat pure magenta (#FF00FF) background everywhere. No ground shadow, no text,
no numbers, no frame borders, no ghost copies, no solid <cor> panel. Crisp
chunky pixel art with dark outlines, palette: <3 cores>.
```

Detalhes que evitam retrabalho:

- **"canvas four times wider than tall"** — sem isso o gerador entrega 2×2 ou
  uma faixa com moldura.
- **"no solid cyan panel"** — sem isso o efeito preenche a célula e vira um
  retângulo em jogo (aconteceu no túnel do vórtice do Maré).
- **"STRICTLY VIEWED FROM BEHIND … NO face, NO glasses"** — obrigatório para
  folha de costas; senão o gerador desenha o rosto de perfil.
- **Referência de imagem**: sempre passar a folha aprovada do mesmo corpo
  (`player-mare-reference.png`, `player-10x-lvl1.png`, …) em `images`.
  O gerador mantém cabelo/óculos/traje muito melhor com ela.
- Se a folha vier com **5 figuras**, não force: use `pick` no preparador
  (ver §4). Se vier **2 linhas**, regere.
- Limite prático: ~10 gerações por turno. Planeje as cinco folhas juntas.

---

## 3. Medidas (o que faz o personagem não "pular" de tamanho)

Tudo em pixels de arte; a conversão para jogo é uma multiplicação.

| Folha | Célula | Apoio (pés) | Escala em jogo | Altura final |
| --- | --- | --- | --- | --- |
| operador civil | 4×2 de 457 px | `FEET_ANCHOR_Y .91` | `.31` | **~142 px** |
| caminhada Maré 0318 | 460×448 | base da célula | `.37` | 142 px |
| caminhada Bio | 256 px | `FEET_ANCHOR_Y` própria | `.57` | ~130 px |
| **Ultimates / T** | **320** | **276** | **`.57`** | corpo de **249 px** de arte |
| **Ultimate do Domínio** | **320** | **276** | **`.57`** | corpo de **247 px** de arte |
| Quebra Sistemas | 256 | 220 | `.95` (`BRUTA_SCALE`) | 178 px |

Regra que resolveu dois bugs: **a altura de referência é o CORPO, não a caixa
com efeito**. `compose(..., body_height=249)` usa a altura do quadro mais
"limpo" para calcular a escala. Sem isso, folhas com cachoeira/túnel
encolhiam o personagem em 13 %.

Se o arquétipo novo tiver caminhada em outro tamanho, meça a caminhada
primeiro (`bbox` do quadro) e derive: `body_height = altura_desejada_em_jogo / escala`.

---

## 4. Pipeline de recorte (`tools/bio_arte.py`)

Uma biblioteca só, usada por todos os preparadores. Funções:

| Função | Para que serve |
| --- | --- |
| `remove_magenta(rgb)` | magenta → alpha real, com despill (sem halo rosa) |
| `content_bands(mask, axis)` | acha as faixas onde há figura |
| `fit_bands(bands, n, profile)` | junta faixas até sobrar `n` quadros (descarta linha de grade) |
| `tight(rgba, box)` | recorta o miolo da figura |
| `load_frames(file, n, source=, pick=)` | abre a fonte e devolve os quadros prontos; `pick` escolhe índices quando o gerador entrega figura extra |
| `disc_mask(frame)` | fechar efeito que preencheu a célula (túnel, cúpula) em disco com borda suave |
| `edge_fade(frame)` | desvanecer painel/holograma de borda dura (cilindro do bracelete) |
| `compose(frames, nome, body_height=)` | grava a folha final: células iguais, pés na base, nada invadindo vizinho |

Preparadores existentes (copie o mais parecido):

```bash
python3 tools/preparar-bio-ultimate.py       # 5 folhas de F do Bio
python3 tools/preparar-bio-acoes.py          # ataque 4 direções + Q
python3 tools/preparar-mare-ultimate.py      # 5 folhas de F do Maré + Q de costas
python3 tools/preparar-dominio-ultimate.py   # 5 folhas de F do Domínio (0.8.0)
python3 tools/preparar-transformacao.py      # 4 folhas de T (uma por arquétipo)
```

O preparador do Domínio usa um helper próprio, `tools/dominio_arte.py`, porque
o recorte padrão não dá conta de efeito dourado sólido — ver §5.4.

O preparador imprime a escala usada — **confira** se ficou perto de `.57`
para célula de 320. Se estiver longe (ex.: `.42`), alguma figura veio com
efeito enorme e a escala foi travada no limite da célula.

---

## 5. Ligação no jogo (o padrão dos três módulos)

### 5.1 Animação (arquivo de dados isolado)

`js/data/<arq>-ultimate-animation.js` exporta:

```js
export const X_ULTIMATE_SHEETS = Object.freeze({
  assinatura: Object.freeze({ sprite, cell: 320, footY: 276, scale: .57, cols: 4 }),
});
export function getXUltimateSprite(signature) { … }      // Códex
export function getXUltimatePosePath(signature) { … }    // Códex (miniatura)
export function getXUltimateFrame(progress, player) {
  // regra: arquetipo certo + traje + sem dash de habilidade + sem varredura
  // carga  (runtime.charge > 0)      → col 0 / 1,  assinatura de chargeDefinition
  // soltura (runtime.effect)         → col 2 (t<.42) / 3, assinatura do efeito
}
```

A escolha é sempre pela **assinatura** do efeito (`signature`), nunca pelo id
da ferramenta: ferramenta nova com a mesma assinatura já entra com arte.

### 5.2 Renderer (uma linha de ordem importa)

```js
const ultimateFrame = getUltimateFrame(...)        // Núcleo (por forma)
  ?? getBioUltimateFrame(...)                      // Bio (por ferramenta)
  ?? getMareUltimateFrame(...)                     // Maré (por corrente)
  ?? getDominioUltimateFrame(...);                 // ← FALTA: Domínio
```

Depois, nesta ordem: transformação do T → ataque do arquétipo → Q → caminhada.
Cada bloco devolve `true` e sai; o primeiro que desenha manda no corpo.

### 5.3 Armadilhas já pagas (não pagar de novo)

- **Ultimate de dash nunca aparecia**: a checagem `if (ability.dash) return null`
  matava a arte justo no deslocamento. O avanço da Ultimate carrega
  `mode: 'ultimate'` e `source`; só dash de **habilidade** invalida a folha.
- **Carga vestindo a folha errada**: `beginUltimate` guarda a assinatura em
  `chargeDefinition`; sem isso a preparação cai sempre na arte base.
- **Folha de costas espelhada** deixa o personagem com o coldre do lado errado.
- **Efeito com borda dura** vira retângulo em jogo → `disc_mask`/`edge_fade`.
- **Travessão/acento em texto de jogo** não é problema; o problema é texto
  DENTRO da arte.

---

### 5.4 Medir o corpo quando o efeito é sólido (lição do Domínio, 0.8.0)

O `compose` do `bio_arte` mede o corpo pelo **quadro de menor bbox**. Isso
funciona quando o efeito é vapor, água ou um anel fino. No Domínio, não:

- a parede hex da MURALHA cobre o tronco inteiro;
- a lâmina do CORTE cobre o corpo todo;
- o CORPO DE TITÂNIO tem placas de ouro no lugar de metade do traje.

Com a regra antiga o corpo do quadro do impacto era medido em 354 px contra
423 px dos outros: o operador **encolhia 16% justo no golpe**.

O que resolveu (em `tools/dominio_arte.py`):

1. **Topo e centro pelo CABELO.** O black power é o único blob quase preto
   grande no alto da figura (`rgb.max < 70`, alpha > 160). Ele dá o topo do
   corpo e o centro x — e o centro não muda quando a espada vai para o lado.
2. **Sola por contagem de linha, não por conectividade.** O ouro corta o
   traje em pedaços; um `ndimage.label` acha só o pedaço de cima e a perna
   "some" (medi 200 px num corpo de 430). A conta certa é: última linha com
   ≥ 28 px de traje escuro na faixa central.
3. **UMA escala por folha, a mediana das quatro.** As poses do Domínio mudam
   de verdade (agachado no preparo, ereto na recuperação). Normalizar cada
   quadro pelo próprio corpo transforma o agachamento num gigante. O tamanho
   do operador é propriedade da FOLHA; a pose é do quadro.
4. **Pivô no corpo, não no centro do desenho.** Ao compor, o centro x do
   cabelo cai no centro da célula. Sem isso a lâmina que sai para a esquerda
   empurra o operador para a direita (e corta o quadro na borda).

Atenção: `compose_body` reduz um quadro só quando o efeito não cabe na
célula, e **imprime o percentual**. Se aparecer aviso de mais de 10%, é sinal
de que a folha-fonte veio grande demais — regerar é melhor que encolher.

## 6. Como testar (o que cada teste protege)

```bash
for f in tests/*.mjs; do node --experimental-default-type=module "$f" || echo "FAIL $f"; done
```

Testes de referência, por papel:

| Teste | Protege |
| --- | --- |
| `tests/bio-ultimate.mjs` | ferramenta → assinatura → folha → quadro → bônus → tamanho |
| `tests/bio-acoes.mjs` | ataque nas 4 direções + Q, ordem no renderer |
| `tests/mare-ultimate.mjs` | corrente → folha, bug do dash, Q de costas, tamanho |
| `tests/dominio-ultimate.mjs` | arma/postura → folha, dash da investida, tamanho, frequência |
| `tests/transformacao-t.mjs` | T dos quatro módulos, ida/volta, bracelete, não empilha |
| `tests/nucleo-wheel.mjs`, `roda-encaixes.mjs` | roda do T (encaixe dos hexágonos) |

Padrão de asserção que vale copiar: ler o PNG e conferir **largura = 320 ×
quadros**, **canal alpha no byte 25**, e a presença do id no manifesto
(`js/main.js`).

---

## 7. DOMÍNIO ANCIÃO — feito na 0.8.0 (referência do padrão)

As cinco assinaturas confirmadas em `js/data/archetype-tools.js` e
`js/data/ultimates.js`, e a folha de cada uma:

| Ferramenta | Assinatura | Ultimate | Folha |
| --- | --- | --- | --- |
| `espada_de_dominio` | `lamina_vertical` | CORTE DE RUPTURA | `player-dominio-ult-lamina.png` |
| `escudo_de_dominio` | `muralha_hex` | MURALHA DE FREQUÊNCIA | `player-dominio-ult-muralha.png` |
| `postura_de_dominio` | `tita` | CORPO DE TITÂNIO | `player-dominio-ult-tita.png` |
| `investida_de_dominio` | `trono` | IMPACTO DO TRONO ANTIGO | `player-dominio-ult-trono.png` |
| — (base do módulo) | `coroa` | COROA DA FALHA | `player-dominio-ult-coroa.png` |

Cadeia final no renderer (a ordem importa, só um desenha o corpo):

```js
const ultimateFrame = getUltimateFrame(...)          // Núcleo (por forma)
  ?? getBioUltimateFrame(...)                        // Bio (por ferramenta)
  ?? getMareUltimateFrame(...)                       // Maré (por corrente)
  ?? getDominioUltimateFrame(...);                   // Domínio (por arma/postura)
```

O que esta rodada ensinou e vale para o próximo arquétipo:

- **`kind: 'dash'` + folha de Ultimate**: a INVESTIDA do Domínio (`trono`) é
  dash, como a CORRENTE ABISSAL do Maré. A checagem de dash **precisa** deixar
  passar `mode === 'ultimate'`; senão o gesto nunca aparece. Já está no teste.
- **O gerador entrega figura a mais** (o TITÂNIO veio com 6 figuras, uma
  repetida; o CORTE com uma faixa-suspiro de 7 px). `pick` escolhe as faixas
  reais; `figure_bands(min_width=150)` descarta respingo.
- **Efeito com borda dura** na parede hex: `disc_mask` no quadro 2. Em jogo,
  sem isso, vira um retângulo de ouro.

## 8. Pendências conhecidas (honestas)

- **Núcleo 10X**: a transformação usa o bracelete nos primeiros 70 % do tempo
  e depois entrega para a criatura; a transição entre as duas artes é seca.
  Um quadro de mistura (corpo metade humano, metade criatura) melhoraria — mas
  exigiria arte nova do bracelete com a criatura aparecendo.
- **Núcleo**: o troco para a segunda forma durante a transformação não é
  desenhado (a roda só fecha e o efeito começa).
- **Áudio**: o jogo não tem camada de som. Pistão, água e zumbido de
  frequência estão fora de escopo até existir áudio.
- **Domínio — MURALHA DE FREQUÊNCIA**: a parede hex fechada cobre o peito do
  operador no quadro do impacto. Lê como parede, mas esconde o núcleo ciano e
  o rosto. Próxima geração do quadro 3: parede na ALTURA DA CINTURA, com
  pedido explícito de "face, glasses, chest and cyan core stay visible".
- **Domínio — CORPO DE TITÂNIO, quadro 4**: o ouro recolhe pelas pernas
  (leitura correta de "voltando ao normal"), mas o quadro 3 é o único com
  ombros de titã. Se incomodar no playtest, um quadro 4 com o ouro ainda nos
  ombros fecharia a leitura de "dissipando" em vez de "já voltou".
- **HUD**: a cor da ferramenta/corrente/arma não aparece no bônus do `F` — a
  pendência mais antiga e a única igual nos quatro módulos.
- O quadro 3 do vórtice do Maré (túnel) é o mais "cheio" dos cinco; candidato
  a regerar se incomodar no playtest.
