# Maré Cromática — upgrade PSX 3D

Substitui o corredor pseudo-3D em raycaster da Baía de Quarentena por uma cena
Three.js de baixa poligonagem, mantendo a mesma missão, saves, HUD e contratos de
teste. O objetivo é PS1/Puppet Combo: névoa densa, texturas de 256 px com
`NearestFilter`, lanterna presa ao olhar e câmera com pitch real.

## O que mudou

- **Cena 3D contínua** (`js/dimension/mare-mission-world3d.js`): 32×32, sem teto,
  com cais, água, containers, dois guindastes, farol, cabanas e adereços. O
  renderizador WebGL é composto no canvas 384×216 da missão, então screenshots,
  mapa, HUD e testes continuam usando uma única superfície.
- **Câmera livre**: mouse/arraste e botões `↑`/`↓` alteram o pitch, com clamp
  natural em `-0,92..0,92`; a lanterna `SpotLight` acompanha o olhar. O `[E]`
  agora só aparece com alvo real, sem `undefined`.
- **Entrada cinematográfica**: a fumaça abre em 2 s com o letreiro
  `BAÍA DE QUARENTENA / 03:12 // A ÂNCORA NÃO RESPONDE`.
- **Ruptura**: aos 4 s do fim, o colapso devolve o jogador ao módulo de dimensão;
  a janela de `entering` da missão foi reduzida para 0,9 s em
  `dimension-manager.js` para não engolir cliques em máquinas lentas.
- **HUD**: bússola, barras de sinal, tensão, lanterna, leitura longa (recortada
  visualmente, preservada para QA) e moldura de scanlines/VHS.
- **Vulto de nevoeiro**: evento de medo periódico que some quando encarado pela
  lanterna. Não falha a missão; alimenta a tensão e o áudio.
- **Acessibilidade**: `prefers-reduced-motion` acalma tremor/scanlines, áudio
  começa desligado e todos os controles têm alternativa nos botões de tela.

## Arte própria

Nada foi reutilizado dos lotes anteriores. `tools/preparar-mare-upgrade.py`
prepara os originais de `assets/source-art/mare-upgrade/` em:

| Texturas 256×256 | Sprites com alfa |
| --- | --- |
| `madeira-tabuas` | `cristal-magenta` |
| `concreto-limoso` | `terminal-baia` |
| `agua-negra` | `farol-lanterna` |
| `pier-madeira` | |
| `rocha-basalto` | |
| `container-ferrugem` | |
| `metal-ondulado` | |

Texturas passam por corte quadrado, LANCZOS, quantização de 56 cores e
`NearestFilter`; sprites usam chave de preto com alfa erodido. O script é
idempotente e pode ser rodado de novo:

```bash
python3 tools/preparar-mare-upgrade.py
```

## Performance

O gargalo era GPU/SwiftShader, não a lógica (`manager.tick` media 2,5–8 ms):

- paredes agrupadas em 4 `BufferGeometry` com cor por vértice (concreto, madeira,
  metal, container), mais batches separados de `trim` (montantes/cintas) e
  `window` (`MeshBasicMaterial` para janelas acesas/apagadas);
- **quase nenhum `PointLight`**: postes são bulbo emissivo + halo, o farol é
  geometria + sprite, o cristal usa `emissive`; só a sobrecarga da âncora acende
  um `PointLight` magenta temporário;
- `MeshPhongMaterial` trocado por `MeshLambertMaterial` e
  `preserveDrawingBuffer` removido;
- iluminação de leitura: hemisfério `0x9fc3d4/0x131820 @4.0`, ambiente
  `0x6d8798 @4.2`, lua `0xa9c8dc @0.95` e preenchimento frio das fachadas
  `0x7394a6 @1.15`, além da lanterna `0xffd9a4 @42`.

Resultado: `tests/dimension-rupture-browser.mjs` passou de travar na entrada para
1/1 em 86 s no Chromium headless, e o frame 3D é composto normalmente.

## Evidência visual

Antes (`qa/upgrade/antes-*.png`, raycaster) e depois (`qa/upgrade/depois-*.png`):

- `entrada` — spawn, cabanas e corredor central;
- `corredor` — fachadas, janelas acesas e cabos;
- `tensao` — tensão alta, portal e farol no horizonte;
- `baia` — terminal de recomposição e adereços do cais;
- `cinema` — letreiro de abertura;
- `vulto` — silhueta antes de ser banida pela lanterna;
- `ruptura` — relatório de eco e colapso.

## Como validar

```bash
node --test tests/mare-upgrade-3d.mjs
python3 -m http.server 8000 --bind 0.0.0.0
LD_LIBRARY_PATH=/tmp/al2023/lib BROWSER_EXECUTABLE=/tmp/chromium \
BROWSER_LIBRARY_PATH=/tmp/al2023/lib PREVIEW_ORIGIN=http://127.0.0.1:8000 \
PLAYWRIGHT_MODULE=$PWD/.qa/node_modules/playwright-core/index.mjs \
node --test --test-concurrency=1 tests/mare-upgrade-3d-browser.mjs
```

O contrato estático cobre as 7 texturas, os 3 sprites, a pipeline, `FogExp2`,
`SpotLight`, pitch, HUD sem `undefined`, entrada/ruptura e saves. O teste de
navegador verifica cena ativa, prompt `[E]` limpo, botões de câmera, vulto
banido pela luz, canvas composto e colapso final.

## Limites conhecidos

- O interior das cabanas não tem teto; portas e janelas são recortes na fachada.
- Ainda há pouca luz nas paredes muito próximas à câmera; é intencional para o
  clima de quarentena, mas o brilho pode ser ajustado em `world3d.js` sem tocar
  na lógica da missão.
- O teste headless depende de SwiftShader; números de FPS variam bastante entre
  máquinas, por isso não há assert de framerate.

## Orla aberta — iteração final

O corredor foi de fato substituído por uma orla: o mar profundo e o nevoeiro
fecham a área, os píeres são caminháveis e as cabanas ficaram isoladas.

- **Layout**: removidas as cabanas leste `[19,5,7,7]` e sudeste `[21,21,6,6]`
  (a sudeste cercava a Âncora). Restaram duas cabanas de madeira separadas, o
  píer do Ponto Zero, a passarela de serviço e o píer sudeste caminhável
  (`DOCKS` em `mare-mission-model.js`, `pierDeck` em `world3d`).
- **Água viva**: ribbon de água rasa animado no contorno da praia, mar com
  ondas de vértice, espuma, faixas de brilho e reflexos do farol/cristais.
  As faixas de brilho agora usam Euler `YXZ`; antes o yaw aplicado depois do
  `rotateX` deixava 12 planos **em pé**, cortando o céu.
- **Farol**: `cliffIsland` + torre em ilha, halo de Fresnel com textura de
  gradiente em filtro linear (sem anéis de `NearestFilter`) e feixe volumétrico
  removido — o halo e os reflexos bastam e não atravessam a câmera.
- **Sprites integrados**: iluminação por distância/cone reduzida (0,18–0,76),
  então caixas e botes não parecem adesivos claros; lâmpada de serviço virou
  lanterna pequena, mapa de evacuação e escada saíram do meio da passagem.
- **Marcos**: o Terminal de Recompilação, a Âncora e o Ponto Zero têm anéis,
  halos, cabos e luz própria; a sobrecarga do Operador Nulo continua disparando
  o colapso e a ruptura pelo `DimensionManager`.

### Evidência da orla

- `qa/upgrade/antes-corredor.png` → `qa/upgrade/depois-orla-spawn.png`
- `qa/upgrade/antes-baia.png` → `qa/upgrade/depois-orla-pier.png`
- `qa/upgrade/depois-orla-farol.png` — ilha, mar e píer;
- `qa/upgrade/depois-orla-marcos.png` — Âncora Cromática e Terminal;
- `qa/upgrade/depois-orla-ancora.png` — Ponto Zero e cabanas.

Contratos novos cobertos por teste: `cell(28.5,28.5)==0` (píer sudeste),
`cell(29,16)==4` (mar) e `terrain()` devolvendo `agua`/`madeira` nesses pontos.

### Lote 2 de arte — implementado

As 10 imagens restantes foram geradas e passaram pelo pipeline
(`tools/preparar-mare-coast.py`, agora com `key_white`, `background_is_light`,
`SHEETS` de 4 tuplas e `rows` por folha):

- folhas de animação: `afogado-sheet` (4 frames), `guardiao-sheet` (4 frames) e
  `nulo-sheet` (4 frames), recortadas em 148×320 / 124–144×320;
- singles: `ancora-cromatica`, `barco-destroco`, `cristal-cluster`,
  `nulo-sobrecarga`, `pier-zero`, `terminal-recompilacao` e `vegetacao-duna`.

Resultado: **10 texturas** em `assets/textures/mare-coast/` e **19 sprites** em
`assets/sprites/mare-coast/`, todos carregados por `coastNames`/`artDir` e usados
em `world3d` (inimigos animados por família, âncora, terminal, bote, cristais,
dunas e sobrecarga). O fallback procedural deixou de ser necessário.

### Lote 3 de arte — orla viva

Dez novas imagens entraram no pipeline (`tools/preparar-mare-coast.py`), que
agora fecha em **16 texturas, 12 frames animados e 11 sprites de marco**:

- **Texturas**: `espuma-mar`, `agua-rasa-caustica`, `parede-concreto-sal`,
  `piso-pier-molhado`, `areia-conchas` e `parede-azulejo-mar`;
- **Sprites**: `caranguejo`, `gaivota`, `peixe` e `onda` (fundo claro, tratado
  por `background_is_light` + `key_white`).

Todas têm fallback procedural próprio, então uma imagem corrompida não derruba
o carregamento. `areia-conchas` recebe contraste 0,62 e desfoque leve depois do
unsharp: a arte original tinha conchas brancas/negras que viravam chuvisco no
chão em ângulo rasante.

No mundo (`mare-mission-world3d.js`):

- **Concreto salgado**: fundação de 0,2 m sob cada cabana e base do terminal;
  `concreteDark` fecha as quinas.
- **Azulejo**: rodapé de 0,95 m nos dois lados da porta das cabanas
  (`doorX = a + 3,5`, `repeat(pw/1,6, 0,62)`), além do gabinete do terminal.
  O azulejo é Lambert em `0xb9d0c8`, sem brilho especular.
- **Piso do píer**: `piso-pier-molhado` com repeat baixo (`w/6,2`, `d/6,2`) e
  cor `0xd6c1a2`; repeat alto voltava a produzir riscos pretos.
- **Areia de conchas**: língua de 9×6 m no spit do spawn, onde ficam os
  caranguejos.
- **Espuma**: 12 faixas pequenas de `espuma-mar` deitadas na arrebentação
  (`y = 0,13`, opacidade 0,12–0,30, yaw variado). Usam **só `alphaMap`** — o
  mesmo mapa em `map` + `alphaMap` virava blocos escuros.
- **Ondas**: quatro folhas horizontais de `onda` correm para a praia com fade
  `sin(p·π)`, opacidade até 0,6 e escala 0,8→1,15.
- **Poças de maré**: `agua-rasa-caustica` em nove poças menores, cor `0x1d3036`
  e opacidade 0,52; sem reflexo, só a caustica fria.

**Fauna ambiente** animada no `render()`, em sprites de névoa com
`depthWrite:false`:

- 5 caranguejos andam de lado pela areia (0,17–0,22 m), com flip de `scale.x`;
- 3 gaivotas orbitam entre 6,2 e 8,5 m de raio, a 6,8–8,4 m de altura;
- 3 peixes saltam em arco perto de `shoreX(z)`, inclinando o sprite conforme
  sobem/descem; ficam ocultos em ~38% do ciclo;
- 4 folhas de espuma escorrem da arrebentação para a areia.

### Evidência do lote 3

- `qa/upgrade/depois-orla-fauna.png` — peixes saltando sobre o píer;
- `qa/upgrade/depois-orla-gaivota.png` — gaivota em órbita contra o céu;
- `qa/upgrade/depois-orla-conchas.png` — passarela de areia de conchas, azulejo
  e terminal;
- `qa/upgrade/depois-orla-azulejo.png` — rodapé azulejado e fundação de concreto;
- `qa/upgrade/depois-orla-caranguejo.png` — caranguejo no cais e gaivota ao fundo;
- `qa/upgrade/depois-orla-poca.png` — poças de caustica e areia de conchas.

Contrato: `tests/mare-coast-lote3.mjs` confere os 10 originais, os 6 mapas
256×256, os 4 sprites RGBA, a presença dos nomes no pipeline/`coastNames` e a
fauna no `world3d`.

### HUD, lanterna, esquiva e trilha

- **Lanterna com carga**: `L` alterna; 100% drena em `0,32/s` e recarrega a
  `16/s` a menos de 4,2 m do terminal central. Ao zerar, desliga sozinha e o HUD
  mostra `FALHA`. Com a lanterna apagada o hemisfério/ambiente caem para 50%,
  o alcance de detecção dos inimigos cai para 60% e o feixe some.
- **Esquiva**: `Espaço` gasta 28 de fôlego, desloca 6,4 m/s por 0,17 s e recarrega
  em 0,9 s; o readout mostra `ESQUIVA PRONTA/1s` e o frame ganha `mare-esquiva`.
- **Tensão legível**: quatro barras (`mare-threat`) sobem pela distância do
  inimigo vivo + estresse; agachar longe de caça (<11 m) reduz o estresse a
  `1,6/s`. A lanterna apagada é uma troca real: menos detecção, menos visão.
- **HUD**: zona ao vivo a cada frame (`PONTO ZERO`, `TERMINAL`, `ÂNCORA`,
  `ARREBENTAÇÃO`, `PRAIA`, `FENDA`) com animação `mare-virada`;
  `mare-steps` mostra MEMÓRIAS/TERMINAL/ÂNCORA; um marcador magenta na bússola
  aponta a âncora e fica ciano ao chegar. A abertura usa letterbox dedicado
  (`.mare-letterbox`, 11%) que fecha em 0,55 s.
- **Trilha**: drone aditivo em 55/82,41/110/164,81 Hz filtrado por lowpass
  (200→800 Hz conforme estresse/zona/fim), motivos a cada 9–16 s (3,2 s no fim),
  sinos de boia, madeira do píer e lamento da âncora. Passos variam por piso,
  respiração de inimigos tem pan estéreo e o coração acelera com ameaça próxima.

### Evidência desta iteração

- `qa/upgrade/depois-orla-hud.png` — terminal, passos, zona e barras de ameaça;
- `qa/upgrade/depois-orla-lanterna.png` — lanterna OFF, ambiente fechado e HUD;
- `qa/upgrade/depois-orla-abertura.png` — letterbox da entrada.

Verificação: `node --test tests/mare-*.mjs` → **14/14**;
`tests/mare-upgrade-3d-browser.mjs` e `tests/mare-mission-browser.mjs` → **1/1**
cada, sem `pageerror`.

## Operador civil — ficha + Tripo3D `c4343c10`

O operador sem traje agora nasce do rig civil (`js/dimension/operator-civilian.js`)
em vez do traje padrão. A referência é a ficha tática anexada e o modelo Tripo3D
do autor (`6018` faces / `5372` vértices, prompt: homem musculoso, cabelo escuro
ondulado, óculos, regata preta, calça cargo cinza e tênis preto com tatuagens
escuras nos dois braços). O GLB é geometria estática, então o rig segmentado
recria o modelo peça por peça.

- **Texturas** (`tools/preparar-operador.py`): `pele-operador`, `tatuagem-manga`
  (pele recolorida para `(136,92,64)` e tinta `(38,46,48)` só nas linhas
  escuras), `tecido-regata`, `tecido-carga` e `cabelo-cachos` (recorte da nuca da
  ficha em `918,68→1014,142`), todas `256²`, `NearestFilter` e ≤56 cores. Pele e
  tatuagem usam bump leve; cabelo usa `MirroredRepeatWrapping` + bump `0.02`.
- **Cabeça**: crânio loft com occipital, arcada, maçãs e queixo; óculos de aro
  fino com lentes translúcidas, bigode grosso e mandíbula em tom de barba. O
  cabelo é um casco curto (fade) + 40 cachos em espiral de Fibonacci + franja,
  com nuca preenchida.
- **Regata paramétrica** (`tankGeometry`): perfil de raio por altura, borda
  superior em U contínuo no decote (sem degraus), cavas recortadas por `f` e
  `|x|`, e alças em tubo ligando o painel da frente ao das costas. Material
  `DoubleSide` para o interior aparecer no decote.
- **Pernas**: pelve cargo sem “avental”, coxa/joelho com afunilamento de
  panturrilha, faixa lateral escura, cargo rebaixado e tênis com solado loft,
  cabedal elíptico, biqueira clara e faixa laranja.
- **HUD**: o cartão `OPERADOR / ECO ATIVO` recebeu retrato 66×66 que troca de
  humor com o estado real (`ferido` <34% de vida, `cansado` <22% de energia,
  `alerta` em mira/velocidade, senão `neutro`).
- **Contrato**: `textures.size === 3` sem forma, `sculpt.revision = '4.0'`,
  `moustache/glasses/tattoos` truthy e bracelete só em `nucleo_dez_forma`.

Evidência: `qa/upgrade/operador-civil-estudio-{frontal,lateral,costas,tresquartos}.png`,
`qa/upgrade/operador-civil-hud.png`.
Verificação: `node --test tests/dimension-identity.mjs tests/dimension-performance.mjs tests/dimension-sculpt.mjs`
→ **3/3**.

## Lote 8 — dez props novos da orla

A orla ganhou ofício: guindaste, rede, caixotes, tubulação, energia, sinalização,
boia, poste de luz e dois corais. As dez fontes são **arte própria** em
`assets/source-art/mare-missao-lote8/` (pintadas em 1408 px, fundo magenta
chapado) e o preparo fica em `tools/preparar-mare-lote8.py`:

- chave magenta → alfa, recorte no bbox **antes** da redução (cada sprite usa os
  192 px inteiros), `NEAREST`, `MinFilter(5)` para tirar a franja e novo recorte;
- a concha recebe um **duotone magenta/ciano** para continuar cromática;
- o script ainda sabe desenhar as dez fontes proceduralmente (`build_sources`)
  quando a pasta está vazia — o pipeline nunca fica sem arte.

Integração:

- `js/dimension/mare-mission-lote8.js` declara `lote8Names`, onze instâncias de
  cenário e a **concha cromática** interativa (`lote8Props`);
- `mare-mission.js` carrega o diretório novo, passa os props para o 3D e para o
  fallback 2D, inclui a concha na lista de alvos e no readout (`CONCHA 0/1`);
- arte do lote 8 é **opcional no decode**: se faltar um PNG, o prop cai no
  fallback sem derrubar a entrada da missão (arte-base continua obrigatória);
- `mare-mission-world3d.js` ganhou altura própria por prop e duas luzes locais:
  o **poste** pisca como filamento velho e a **concha** pulsa no compasso do eco;
- `mare-mission-model.js` inclui os props na colisão e sanitiza `p.lote8.concha`.

Evidência: `qa/upgrade/lote8-patio.png`, `qa/upgrade/lote8-guindaste.png`,
`qa/upgrade/lote8-concha.png`.
Verificação: `tests/mare-mission-lote8.mjs` (contrato das dez artes, interação,
colisão, alturas e fallback) + suíte `tests/mare-*.mjs` completa.

## Lote 9 — socorro na baía, texturas e respiração do cenário

Dez fontes novas em `assets/source-art/mare-missao-lote9/`: **três texturas
tileable** (metal corroído, lona encardida, pedra molhada) e **sete props**
(lanterna de querosene, bote de salvamento, guincho manual, drusa cromática,
peixe morto, bandeira de sinal e cogumelo de sal). O preparo vive em
`tools/preparar-mare-lote9.py`: texturas viram tiles 256 px quantizados em 56
cores; props usam chave magenta, recorte no bbox antes da redução, `NEAREST`,
`MinFilter(5)` e novo recorte.

Materiais e ambientação:

- `metal-corroido` substitui o metal escuro das estruturas e dos contêineres do
  píer; `lona-encardida` cobre os telhados das cabanas; `pedra-molhada` entra nas
  rochas que encostam na água (`waterAt` em cruz), secando o resto da duna;
- a **lanterna** ganhou luz quente com halo aditivo e tremulação de pavio; a
  **drusa** ganhou luz magenta com halo respirando em 1.7 Hz.

Mecânica (quatro props interativos, um uso cada):

- lanterna: +55% de carga, mas **recusa** se o tanque está acima de 90% ("guarde
  o combustível"); ao ser usada, a luz do prop cai para 12%;
- bote: move o checkpoint do eco e devolve 70 de fôlego;
- guincho: fôlego cheio e −28 de tensão;
- drusa: registra o eco de 66.6 Hz (readout `DRUSA 0/1`).

Extras da leva:

- cada uso dispara um **cue** próprio (`lote9Cue`: triângulo 392 Hz, sino 146 Hz,
  serra 98 Hz, senoide 528 Hz);
- props leves (boia, bote, rede, bandeira, cogumelo, lanterna) agora **balançam**
  com vento determinístico no `render`;
- `sanitize` guarda `p.lote9` com as quatro flags; colisão inclui os quatro props.

Evidência: `qa/upgrade/lote9-lanterna.png`, `lote9-lanterna-acesa.png`,
`lote9-bote.png`, `lote9-guincho.png`, `lote9-drusa.png`,
`lote9-panorama.png`.
Verificação: `tests/mare-mission-lote9.mjs` (contrato das dez artes, alcance,
flags, readout e cues) somado à suíte `tests/mare-*.mjs` (25 testes).
