# Maré Cromática — lote 7: a baía como fita de terror

## Objetivo

O lote 6 fechou a lógica do Nulo, do caçador e da fenda, mas a leitura visual ainda
parecia um campo aberto com sprites recortados. Este lote troca a apresentação por
uma referência de **survival horror PS1/Puppet Combo**: pouca luz, concreto molhado,
câmera baixa, VHS, mapas de serviço e um portal grande o suficiente para ser o
objetivo da sala.

Nada de Doom: a baía continua navegável, mas o enquadramento agora é feito por
partições quebradas, névoa, chuva, cabos em primeiro plano e uma lanterna de tela.

## Dez folhas novas

Arte original em `assets/source-art/mare-missao-lote7/`; recortes jogáveis em
`assets/sprites/mare-missao-lote7/`.

| Folha | Uso |
| --- | --- |
| `parede-concreto-umido.png` | paredes de serviço (tipo 2) |
| `parede-azulejo-quebrado.png` | azulejo quebrado das cabanas e banheiros (tipo 1) |
| `chao-concreto-umido.png` | piso base, 64×64, opaco |
| `chao-agua-rasa.png` | poças rasas com máscara de ruído no floor cast |
| `teto-metal-escuro.png` | teto metálico das cabanas |
| `portal-mare.png` | portal de eco do cais e limiar grande da fenda |
| `porta-pesada.png` | porta de ferro das cabanas (tipo 3) |
| `lampada-industrial.png` | lâmpada de serviço interativa |
| `afogado-mare.png` | novo corpo do caçador (`enemy[0]`) |
| `afogado-dano.png` | quadro de dano do caçador |

`tools/preparar-mare-lote7.py` mantém os cinco tiles opacos em 64×64 NEAREST e
recorta os props com erosão de alfa + `getbbox()`. O afogado veio numa tira de três
poses e é cortado no terço central antes da chave.

## O que mudou na missão

- **Piso:** concreto úmido com poças (`chao-agua-rasa`) escolhidas por duas ondas de
  ruído no floor cast. A água pulsa apenas quando o movimento reduzido está desligado.
- **Paredes:** azulejo, concreto e porta pesada por tipo de célula. Cada coluna ganhou
  faixa volumétrica quente, rim frio e rodapé escuro.
- **Teto:** nas cabanas, `teto-metal-escuro` cobre o terço superior antes do breu.
- **Cais ao fundo:** silhueta industrial, guindaste, farol e janelas de sódio no
  horizonte, com banco de névoa atravessando a distância média.
- **Primeiro plano:** cabos balançando e uma lâmpada pendurada no alto da tela.
- **Chuva/VHS:** chuva fina, grão, scanlines, vinheta de lanterna, timestamp `CAM 02`
  e `REC`, todos estáveis em `prefers-reduced-motion`.
- **Lâmpada de serviço:** prop `lote7-lamp` em `16.6, 20.4`; `E` alterna o filamento.
  O estado persiste em `progress.mareMission.lote7.lampada` e não afeta rank, dados
  ou conclusão.
- **Mapa tático:** `M` (ou botão `MAPA`) abre a planta 32×32 com cabanas, partições,
  memórias, terminal, âncora, Nulo e a seta do jogador.
- **Caçador:** usa `afogado-mare`/`afogado-dano`; continua sendo `enemy[0]`, então
  `AMEAÇAS` permanece `2/2`.
- **Perseguição:** o campo de fluxo mantém o alvo por 13 s (em vez de 7 s) e o ping
  do Nulo a cada 12 s (em vez de 18 s). Isso permite que os dois corpos contornem a
  nova entrada em corredor sem perder a trilha.
- **Partições:** 26 células de parede quebrada, incluindo a entrada em corredor no sul,
  sem cobrir nenhum prop, porta, registro ou ponto de Nulo testado. Todas as rotas
  continuam conectadas e o `E` continua alcançando cada peça.

## Portal de eco e câmara da fenda

- O portal do cais foi movido do canto do píer (`620, 600`) para o pátio central
  (`877, 566`), em piso livre e sem obstáculo. A arte passou a usar `portal-mare`,
  com 280 unidades de largura (~4× o tamanho anterior), halo pulsante e o mesmo
  `requiresFlag: cromatica_ancora_estavel`.
- A fenda tinha um único prop `freq666_portal` de 44 px e nenhum mobiliário. Agora o
  limiar é uma porta de arco completa em `5.5, 4.4`, com `scale: 0.8` (sem o caminho
  `useCrop`, que fatiaria a arte), mais duas lâmpadas, rack, baliza, mesa de escuta,
  console e caixa de contenção. O anel de retorno e a interação continuam nos mesmos
  pontos, então o teste de legado e a entrada 3D seguem iguais.

## Controles e câmera

- `WASD` move, `mouse`/arrastar/`← →` olham, `E` interage, `F` golpe, `Q` pulso,
  `Shift` corre, `C` agacha, `M` mapa, `Esc` retorna.
- Clique no canvas pede pointer lock; com lock, o mouse gira a câmera sem arrastar.
- A rotação por teclado usa aceleração/desaceleração (não é passo seco), e a câmera
  ganhou balanço de passo, `FOV` dinâmico leve e tremor em combate.

## Áudio

Além do mar, rádio e passos já existentes: zumbido da lâmpada, respiração úmida dos
afogados próximos, hum grave do portal, gotejamento e chiado contínuo de fita
(`noiseBurst` + hiss). Tudo opt-in no botão `ÁUDIO`.

## Validação

```sh
node --test tests/*.mjs
PREVIEW_ORIGIN=http://127.0.0.1:8000 \
BROWSER_EXECUTABLE=/tmp/chromium \
BROWSER_LIBRARY_PATH=/tmp/al2023/lib \
PLAYWRIGHT_MODULE=$PWD/.qa/node_modules/playwright-core/index.mjs \
node tests/mare-mission-browser.mjs
```

- `tests/mare-mission-lote7.mjs`: 10 PNGs, cinco tiles 64×64, materiais, lâmpada,
  partições, afogado, mapa/VHS no fonte, portal do cais, câmara preenchida e
  `useCrop:false` no limiar.
- Suítes de missão, lote 5, lote 6, lore, combate e vida passam.
- `docas-legado-browser` percorre menu → save v1 → Docas → portal → fenda → 3D.
- `docas-central` protege layout/geometria/cais/costa/spawns/mar; os hashes de
  `objects`/`portals` foram atualizados **apenas** pela mudança intencional do portal
  de eco.
- QA visual: `qa/mare-lote7-entrada.png`, `-centro`, `-hunter`, `-portal`,
  `-portal-aberto`, `-mapa`, `-fenda-wide`, `-docas-portal`.

## Limites conhecidos

A baía continua sendo um pátio externo de 32×32, não um novo mapa interior: o lote
resolve leitura, materiais, iluminação, portal e câmera. A parede é um billboard por
coluna com sombreamento lateral, sem geometria 3D real. O `useCrop` do renderer 2D
não deve ser usado no `portal-mare`; a arte inteira é desenhada no caminho de escala.
