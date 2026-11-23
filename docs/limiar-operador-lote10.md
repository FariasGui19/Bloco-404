# Operador civil 3D + lote 10 (Limiar e Maré)

## Correção cirúrgica do operador no Setor Limiar

O rosto do operador era montado por peças soltas (caixas, planos e
icosaedros empilhados), o que produzia a "cara de blocos" vista em jogo. A
reconstrução ficou toda em `js/dimension/operator-civilian.js`:

- **crânio**: um único loft de 24 lados desenha testa, maçãs, mandíbula e
  queixo; sombreamento suave (`flatShading: false`) em pele, pano, cabelo e
  tênis, mantendo o metal facetado;
- **olhos**: esclera, íris e pupila quase encostadas na face, pálpebra fina que
  fecha na piscada (`eyelid` preservado) e sobrancelha em tubo curvo;
- **nariz e boca**: loft curto com ponta suave, bigode fino quase reto e linha
  de boca discreta (antes o bigode virava uma careta);
- **óculos**: aro arredondado contínuo (`TubeGeometry` em curva fechada),
  lente fina e hastes que terminam na orelha, com leve inclinação acompanhando
  a curva do rosto;
- **cabelo**: base raspada colada no crânio, 64 cachos em espiral de Fibonacci,
  fileira de cachos na linha da testa, laterais e nuca com cerdas curtas —
  sem capacete nem franja descendo sobre os olhos;
- **ombros**: deltoide virou loft cilíndrico (antes era esfera com UV esticada),
  com o padrão de tatuagem em `repeat 2.4`; braços, pernas, pescoço, pelve e
  tênis ganharam mais lados (16–22) e o mesmo sombreamento suave;
- **pés**: o tornozelo compensa quadril + joelho a cada quadro, então a sola fica
  paralela ao chão e o pé não afunda nem flutua na caminhada;
- **contratos**: `operator-head`, `sculpted-face`, `nose`, `brow`, `eyelid`,
  `layered-hair`, `energy-blade` (oculto) e `sculpt.revision 4.0` preservados;
  `PANTS` mantém o cinza claro canônico (`0xd3d0c7`).

## Lote 10 — dez folhas novas

Fontes em `assets/source-art/setor-limiar-lote10/` e preparo em
`tools/preparar-limiar-lote10.py`.

Texturas tileáveis (256 px, 56 cores):

| textura | uso |
| --- | --- |
| `parede-ruina` | paredes e blocos do Limiar (`materials.masonry`) |
| `piso-ruina` | piso de pedra (`materials.floor`) |
| `grade-limiar` | metal vazado (`materials.iron`) |
| `musgo-limiar` | manchas de musgo no pé das pedras |
| `tatuagem-traco` | traço fino da manga do operador |
| `ruptura-veu` | véu da transição dimensional |

Sprites e animação:

- `vegetacao-limiar` e `totem-limiar` entram como billboards no cenário
  (26 tufos em anel + 3 totens), com proporção corrigida no `load` da imagem;
- `afogado-sheet` e `guardiao-sheet` são fatiados por projeção de tinta (não por
  grade fixa) em `afogado-0..3` e `guardiao-0..3`. O renderer da Maré já
  preferia `${família}-${quadro}`; agora o afogado e o guardião **andam de
  verdade**, com a leitura `QUADROS n×4` no HUD;
- o véu da ruptura virou camada animada em `css/dimension.css`
  (`mix-blend-mode: screen`, respeitando `prefers-reduced-motion`).

Evidência: `qa/upgrade/lote10-operador-rosto.png`,
`lote10-operador-rosto-tresquartos.png`, `lote10-operador-corpo.png`,
`lote10-limiar.png` e `lote10-mare-inimigo.png`.

Verificação: `tests/dimension-lote10.mjs` (contrato das dez folhas, quadros por
família e readout) somado a `tests/dimension-{sculpt,living,polish,identity,
performance}.mjs` e à suíte `tests/mare-*.mjs`.
