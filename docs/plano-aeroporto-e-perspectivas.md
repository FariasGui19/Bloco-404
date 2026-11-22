# Plano — Aeroporto Central 2.5D e o Multiverso de Perspectivas

> Registro da rodada de novembro/2026: análise do que a implementação anterior
> entregou, o refinamento feito sobre ela, e o norte para onde o Bloco 404 vai
> a partir daqui — incluindo uma missão adaptada de DOOM como dimensão de
> regras próprias. Documento de direção: o que já existe está marcado como
> **[feito]**, o resto é plano, não promessa.

---

## 1. O que a implementação anterior entregou (análise)

A reestruturação do Piso 0 em side-view 2.5D (commit `fe63600`) foi um salto
real de qualidade. Pontos fortes confirmados em revisão de código e render:

- **Arquitetura em 4 camadas com parallax** (`js/engine/side-view.js`):
  espaço profundo (0.04x–0.22x) → janelões/mezanino/colunas (0.48x–1.0x) →
  gameplay com piso reflexivo/espelhado em tempo real (1.0x) → foreground
  cinematográfico (1.28x–1.35x). Composição correta de respiradouro visual:
  o olho descansa nos janelões e lê o gameplay no primeiro terço.
- **Troca de câmera por flag de mapa** (`map.meta.sideView`) com atalho de
  zoom por mapa e transição de comporta de hangar (`js/ui/transition.js`) —
  sem telas de loading, sem recarregar a página.
- **Conversão bidirecional de coordenadas** (`svWorldToScreen` /
  `svScreenToWorld`) cobrindo clique-para-mover, Shift+Clique, ataque, Q/R e
  balões de NPC no modo 2.5D.
- **Portais de arquétipo temáticos** com LOCK vermelho e vórtice ativo,
  piso espelhando entidades, guia com folha própria, missão preservada.
- **Suíte automatizada própria** (`tests/aeroporto-sideview.mjs`) validando
  spawns, câmera, controles e gating do Hangar C-04.

Os problemas que a análise encontrou (e que esta rodada corrigiu):

1. **Sem escala por profundidade** — atores e móveis tinham o mesmo tamanho no
   fundo (perto dos janelões) e na borda frontal. A sugestão de Z-depth
   scale era correta e foi implementada.
2. **Letreiros do mezanino colidiam com as placas dos pórticos** — "SETOR C ·
   PORTAIS DE ARQUÉTIPO" era fatiado atrás de "LÂMINA DOMÍNIO" (ver screenshots
   da atualização). Os setores migraram para a faixa do teto; o mezanino virou
   painel de LED corrido.
3. **Arte procedural demais** — naves, planetas e vórtice eram retângulos e
   gradientes desenhados em canvas. Funcionavam, mas estavam uma ordem de
   grandeza abaixo do resto da direção de arte do projeto.
4. **Mobília encostada sem hierarquia** — bancos e malas distribuídos sem
   intenção; setor A sem recepcionista visível na entrada; setor D sem
   "vida de engenharia".
5. **Estação "parada"** — nenhum NPC ambiental, nenhuma nave de verdade,
   nenhum letreiro informativo animado. Parecia um museu, não um aeroporto.
6. **Sem verificação visual reprodutível** — a suíte cobria lógica, não
   pixels; nada garantia que o render side-view não quebrava com o tempo.

## 2. O que esta rodada fez **[feito]**

### 2.1 Perspectiva refinada

- **Escala por profundidade** (`svDepthScale` em `js/engine/side-view.js`):
  0.80x na parede dos janelões → 1.14x na borda frontal da passarela. Aplicada
  a player, NPCs, objetos, sombras, reflexos espelhados e altura dos rótulos
  (`_topo`) — o pseudo-3D cobra de tudo, senão o truque se desfaz.
- **Parallax dinâmico com o mouse**: a camada 1 deriva sutilmente com a
  posição do cursor (±9px), e o foreground deriva no sentido oposto (até 12px).
  Com `prefers-reduced-motion` ou em testes headless, degrada para centro
  fixo silenciosamente.
- **Piso vivo**: varredura especular ("chão molhado") cruzando a passarela a
  cada poucos segundos; trilhos de LED ciano/âmbar preservados com os novos
  reflexos de profundidade.
- **Estrelas cadentes** ocasionais fora dos janelões (a cada ~7–16 s).

### 2.2 Arte gerada por IA, integrada de verdade

Fonte em `assets/source-art/aeroporto/`, processada por
`tools/preparar-aeroporto.py` (key de fundo por componentes conectados à
borda + alpha por luminância para o vórtice), saída RGBA em
`assets/sprites/aeroporto/`:

| Asset | Uso |
| --- | --- |
| `portal-vortice.png` | Vórtice dos 6 pórticos. Tingido em runtime por cor de doca via canvas offscreen (`getTintedSwirl`) e desenhado em **duas camadas girando em sentidos opostos** — o braço espiral é uma imagem só; a animação é rotação. |
| `nave-cargueiro.png` | Frota de fundo: cargueiro pesado, para a direita. |
| `nave-cruzador.png` | Cruzador em cunha (espelhado no preparador para apontar à direita). |
| `nave-shuttle.png` | Shuttle rápido, âmbar/quente. |
| `planeta-anelado.png` | O "astro" da estação — gás anelado teal com halo. |
| `planeta-vermelho.png` | Planeta/lua rochoso âmbar em parallax mais profundo. |

As naves ganharam clarão de motor aditivo tremulando na popa, rastro de
plasma pulsante e faróis de navegação alternando vermelho/verde. Se qualquer
arte falhar ao carregar, o código cai no desenho vetorial original — a
estacão nunca fica sem céu.

### 2.3 Aeroporto vivo (ambientação)

- **Ponto de atualidade real no ticker do mezanino**: a mensagem da Área de
  Carga muda conforme `progress.flags.airportTerminalDiagnosed` — "EM
  CONTENÇÃO — DIAGNÓSTICO DE TERMINAL NECESSÁRIO" → "LIBERADA PARA
  EMBARQUE". Letreiro que mente é pior que letreiro nenhum.
- **Sequência da comporta trancada**: feixe de varredura descendo, moldura
  de perigo "marching ants" animada e LOCK central (antes era estática).
- **Pórticos ativos**: faíscas espirais caindo para dentro do horizonte de
  eventos — 7 partículas procedurais determinísticas por pórtico.
- **Viajante ambiental** cruzando o concourse na faixa frontal
  (`viajante-saguao.js` agora aceita `actor.visitorRoute`; o Saguão não
  mudou). **Unidade L-9** (`robo_limpeza`) patrulhando as Docas — primeiro
  NPC móvel do lado de fora do Saguão.
- **Mobília remapeada** com hierarquia de setor: Setor A (desembarque) com
  balcão + mala + totem INFO + vending Café Beta-7; Setor B (mirante) com
  bancos ladeando a luminária de piso âmbar; Setor C (docas) com malas e
  plantas entre os pórticos; Setor D (engenharia) mais escuro, com cone,
  grade de contenção e luminária solitária. Nada bloqueia portais nem a
  faixa central da passarela.
- **Letreiros de setor** migraram para o teto (fora da faixa dos pórticos),
  o que eliminou o corte do "SETOR C" atrás das placas.

### 2.4 Verificação

- **90/90 testes de `tests/*.mjs` passando**, incluindo o novo
  `tests/aeroporto-vivo.mjs`, que renderiza o mapa inteiro com um 2D context
  falso e **falha se qualquer coordenada NaN/Infinity chegar ao canvas** —
  nos estados trancado e liberado da Área de Carga.
- **Verificação visual real**: o render do side-view foi executado em node
  com `@napi-rs/canvas` (dev-only, `--no-save`, removido depois — o projeto
  continua sem dependências) e os frames inspecionados: jogador, guia,
  viajante, L-9, vórtices, naves, planetas, ticker e letreiros compostos
  corretamente.

## 3. O norte: um jogo, muitos gêneros — perspectiva como mecânica

A mudança do Aeroporto não é um capricho de câmera: é a prova de conceito de
que **o Bloco 404 troca gênero e regras físicas por zona**. O modelo mental
do jogo deixa de ser "um mundo 2.5D em pixel art" e passa a ser:

> Cada dimensão carrega um **Manifesto de Realidade** — perspectiva, controles,
> física e regras de habilidade declarados como dados do mapa, trocados nas
> comportas. O jogador atravessa as fendas e o *tipo de jogo* muda com ele.

### 3.1 Catálogo de dimensões-gênero (direção, não promessa)

| Dimensão / zona | Perspectiva | Gameplay |
| --- | --- | --- |
| Aeroporto Central (hub) | Side-view 2.5D platô | Exploração panorâmica, missões, NPCs |
| Maré Astral (3D livre) | Primeira submersa/3ª 3D | Nado livre, caça ameaçada, leito marinho |
| Praia / Arquipélago | Isométrica relevo | Sobrevivência leve, árvore de nado |
| **DOOM-like (em preparação)** | **Retro-FPS raycast** | **Tiro sob pressão, salas claustrofóbicas, espelha o manifesto terror × ação** |
|Terror (referência Holstin) | Isométrica fixa + luz dinâmica | Medo, mira sob estresse |
|Veicular / nave | Traseira aproximada | Velocidade, checkpoints |

### 3.2 Arquitetura-alvo (evolução natural do que já existe)

1. **`meta.rules` declarativo por mapa** (ex.: `{ abilities: 'native' | 'mixed',
   stats: 'scaled' | 'raw', camera: 'sideview' | 'iso' | 'fps' | '3d' }`).
   Hoje só `meta.sideView` e `meta.zoom` existem — é o embrião certo.
2. **Um renderer por perspectiva** em `js/engine/` (`side-view.js`,
   `perspectiva-submersa.js`, futuros `fps-view.js`, `terror-view.js`), com o
   mesmo contrato `render(map, state)`. Nada de motor compartilhado gordo:
   cada gênero carrega só o que usa.
3. **Controles padronizados por contexto** — `E` interage, `J` códice etc. são
   fixos; o que muda é o significado de WASD/cima-baixo por câmera (já era a
   regra de ouro que guiou o Aeroporto e o Maré).
4. **Física e colisão permanecem do mapa** — a câmera só projeta. O DOOM não
   herda o navegação do Maré nem o do aeroporto; ele traz a própria (grade de
   paredes + checagem de linha de visão), reaproveitando `state`,
   `progress`, `save`, RPG e combate.
5. **Transições de comporta mascadas** — toda troca de perspectiva passa por
   uma cobertura narrativa (comportas de hangar, túnel, distorção), como já
   acontece hoje entre Aeroporto ↔ Salas.

### 3.3 O DOOM do Bloco 404 — esboço de vertical slice

- **Gatilho**: novo terminal/portal no Aeroporto (ou na futura dimensão
  Câmaras de Eco) rotulado como anomalia; a comporta de hangar fecha e abre
  em "MODO FÓSFORO" — CRT verde sobre preto, grão, vinheta.
- **Técnica**: raycasting próprio (sem WebGL obrigatório) em
  `js/engine/fps-view.js`: mapa de células, paredes com textura pixel
  (geradas no mesmo pipeline `tools/`), sprites billboard para inimigos e
  props, iluminação bake-ish por faixa. Orçamento: rodar a 60 fps em
  hardware intermediário — nada de sombras dinâmicas.
- **Regras**: só ferramentas daquele setor (`abilities: 'native'`), dano
  escalonado pelos atributos do arquétipo, arsenal fixo de 1 slot + ultimate
  adaptada como "surto".
- **Objetivo da slice**: provar o ciclo *entrar → limpar 3 salas → chave →
  comporta → voltar ao Aeroporto* com o save intacto. Conteúdo de missão
  fica para a segunda iteração.

### 3.4 Regras de ouro (do manifesto, adaptadas à realidade do código)

1. **Modularização estrita** — cada câmera/perspectiva em `js/engine/`
   própria; bug no DOOM nunca derruba a praia.
2. **`E` é sagrado** — interagir é o mesmo botão em qualquer dimensão; só
   muda o que WASD/cima-baixo significam.
3. **Assets leves** — pixel art, paletas limitadas, tudo atrás de
   `tools/preparar-*.py`; a textura mais pesada do jogo cabe em uma captura
   de tela.
4. **Testes por perspectiva** — cada renderer novo nasce com um
   `tests/*.mjs` que roda headless e valida spawns, câmera e ausência de
   coordenadas inválidas no canvas (padrão do `aeroporto-vivo.mjs`).
5. **Save único** — nenhuma dimensão cria save paralelo; tudo é flag em
   `progress.flags`, inventário normal e IDs de missão no motor existente.

## 4. Roadmap sugerido

**Fase 0 — esta rodada [feito].** Aeroporto 2.5D vivo: refinamento de
perspectiva, arte nova, mobília e NPCs ambientais, testes de render headless.

**Fase 1 — Lapidação do hub.** Partículas de embarque ao entrar nas Docas
(sucção de poeira para o vórtice), animação de "trem/dock chegando" no GATE 00
(vindo de uma janela alta), som ambiente da estação (zumbido + avisos), HUD
contextual ("[E] EMBARCAR" maior quando perto). Critério de saída: o usuário
pedir prints porque está bonito demais.

**Fase 2 — Vertical slice DOOM.** `fps-view.js` raycast, um mapa de 6–8
células por lado, um inimigo, uma chave, uma comporta. Sem missão ainda —
só o motor da troca de gênero funcionando de ponta a ponta.

**Fase 3 — Primeira missão real de DOOM.** Design da missão (ex.: purgar a
Infestação do Nível -1 / abrir a fenda de volta), inimigos com AI mínima
(perseguir × atirar), drops, missão no motor de quests existente, recompensas
de maestria/XP.

**Fase 4 — Terceiro gênero.** Terror isométrico (câmera fixa, iluminação
dinâmica) OU veicular — decidir pelo que a slice de DOOM ensinar sobre custo
de produção de um gênero inteiro.

**Fase 5+ — Multiverso pleno.** Nave-mãe, procurados, prisão, dimensões de
outros arquétipos. Continua sendo direção, não promessa — como sempre.

## 5. Riscos e armadilhas conhecidos

- **Escopo**: DOOM é outro jogo em miniatura. A slice existe para matar essa
  incerteza antes de qualquer conteúdo.
- **Performance do raycast**: texturização por pixel em JS puro exige mapa
  pequeno e sprites esparsos; profile em máquina modesta antes de declarar
  pronto.
- **Consistência de arte entre gêneros**: o DOOM pede paleta própria
  (fósforo/CRT), mas os *personagens* precisam continuar reconhecíveis como
  Bloco 404 — o arquétipo é o fio condutor.
- **Identidade do Aeroporto**: o hub é o "museu vivo" do jogo; toda novidade
  de outra dimensão entra por ele. Teatralidade > densidade — o Aeroporto
  deve continuar respirável, não entupido.
- **Transições**: nenhuma troca de perspectiva sem cobertura narrativa;
  corte seco de câmera quebra a fantasia.
