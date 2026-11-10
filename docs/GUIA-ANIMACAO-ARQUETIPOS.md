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

O que falta: **Domínio Ancião** nas camadas F e leitura ambiental própria
(o T dele já existe). `nucleo_dez_forma` é o caso especial (formas, não traje).

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
python3 tools/preparar-bio-ultimate.py     # 5 folhas de F do Bio
python3 tools/preparar-bio-acoes.py        # ataque 4 direções + Q
python3 tools/preparar-mare-ultimate.py    # 5 folhas de F do Maré + Q de costas
python3 tools/preparar-transformacao.py    # 4 folhas de T (uma por arquétipo)
```

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
| `tests/transformacao-t.mjs` | T dos quatro módulos, ida/volta, bracelete, não empilha |
| `tests/nucleo-wheel.mjs`, `roda-encaixes.mjs` | roda do T (encaixe dos hexágonos) |

Padrão de asserção que vale copiar: ler o PNG e conferir **largura = 320 ×
quadros**, **canal alpha no byte 25**, e a presença do id no manifesto
(`js/main.js`).

---

## 7. Passo a passo para o DOMÍNIO ANCIÃO (próxima rodada)

Dados já prontos (não mexer): `js/data/archetype-tools.js` →
`lamina_dominio_anciao.tools` com as quatro armas/posturas e
`ultimate.signature` de cada uma:

| Ferramenta | Assinatura | Ultimate |
| --- | --- | --- |
| `espada_de_dominio` | `lamina_vertical` | CORTE DE RUPTURA |
| `escudo_de_dominio` | `muralha_hex` | MURALHA DE FREQUÊNCIA |
| `postura_de_dominio` | `tita` | CORPO DE TITÂNIO |
| `investida_de_dominio` | `trono` | IMPACTO DO TRONO ANTIGO |

(também ver `ultimates.js`: a base do módulo é `coroa_da_falha`, assinatura
`coroa`. São **5** folhas, como no Bio e no Maré.)

Roteiro:

1. **Gerar 5 folhas** de 4 quadros com o template de §2, referência
   `assets/sprites/player/player-dominio-reference.png` (turnaround dourado).
   Paleta: grafite + dourado `#ffd465` + núcleo ciano.
2. Salvar em `assets/source-art/dominio/` e criar
   `tools/preparar-dominio-ultimate.py` copiando o do Maré (2 linhas de
   configuração + `body_height`).
3. Criar `js/data/dominio-ultimate-animation.js` copiando
   `mare-ultimate-animation.js` e trocando os nomes.
4. Ligar no renderer **depois** do Maré na cadeia de `??`.
5. Registrar `lamina_dominio_anciao: getDominioUltimatePosePath` em
   `POSE_RESOLVERS` (`js/ui/codex.js`) — uma linha.
6. Adicionar `drawDominioFx` ao lado de `drawBioForjaFx`/`drawMareFx`
   (faíscas douradas + runas orbitando).
7. Criar `tests/dominio-ultimate.mjs` copiando `mare-ultimate.mjs` e ajustando
   as quatro assinaturas.
8. Versão: `0.8.0-dominio`, entrada em `docs/ordem-de-arte-e-implementacao.md`
   e `docs/roteiro-proximas-etapas.md`.
9. Rodar a suíte inteira, `git push`, PR e merge (o padrão das rodadas).

Depois disso os **quatro** arquétipos ficam no mesmo nível, que é a meta que o
criador pediu: *"nenhum parecer melhor que o outro"*.

---

## 8. Pendências conhecidas (honestas)

- **Núcleo 10X**: a transformação usa o bracelete nos primeiros 70 % do tempo
  e depois entrega para a criatura; a transição entre as duas artes é seca.
  Um quadro de mistura (corpo metade humano, metade criatura) melhoraria — mas
  exigiria arte nova do bracelete com a criatura aparecendo.
- **Núcleo**: o troco para a segunda forma durante a transformação não é
  desenhado (a roda só fecha e o efeito começa).
- **Áudio**: o jogo não tem camada de som. Pistão, água e zumbido de
  frequência estão fora de escopo até existir áudio.
- **HUD**: a cor da ferramenta/corrente não aparece durante o bônus do `F`.
- **Domínio**: nenhuma folha de F, nenhuma leitura ambiental (é o §7).
- O quadro 3 do vórtice do Maré (túnel) é o mais "cheio" dos cinco; candidato
  a regerar se incomodar no playtest.
