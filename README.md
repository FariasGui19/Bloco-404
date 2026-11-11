# Bloco-404

Jogo de exploração isométrica em pixel art, feito em JavaScript puro + Canvas,
sem build: o navegador roda os módulos ES direto do repositório.

## Rodar

```bash
python3 -m http.server 8000
# abra http://localhost:8000
```

## Testes

Os testes são scripts Node, sem dependências:

```bash
for f in tests/*.mjs; do node --experimental-default-type=module "$f" || break; done
```

`tests/estrutura.mjs` confere que todo import relativo e todo asset citado no
HTML/CSS existem com a caixa certa (import quebrado é a causa clássica de
`Uncaught SyntaxError: Unexpected token '<'`: o servidor devolve HTML no lugar
do `.js`). `tests/boot.mjs` importa `js/main.js` inteiro com um DOM falso para
pegar export faltando antes de abrir o navegador.

## Organização

| Pasta | Conteúdo |
| --- | --- |
| `js/engine` | renderer, câmera, input, sprites, superfície de praia |
| `js/game` | estado, save, jogador, combate, RPG, missões, habilidades, mundo |
| `js/data` | mapas, balanceamento, árvores, definições de conteúdo |
| `js/ui` | HUD, diário, menus, diálogos, roda do Núcleo |
| `assets` | sprites finais e arte de origem (`source-art`) |
| `tools` | scripts de preparação de arte (Pillow/numpy) |
| `docs` | direção de arte, roteiro e sistemas |

## Sistemas em destaque

- **Quatro arquétipos** com ataque básico, Q e R próprios.
- **Duas formas do Núcleo 10X** (tecla `T`): *Forma Veloz* (corrida, 1,8× de
  velocidade) e *Quebra Sistemas* (ferro denso, 40% mais lenta, cada marretada
  consome a barra de forma). Ambas com folhas próprias nas quatro direções,
  ataque básico animado, metamorfose desenhada com a própria arte e **execução
  de Ultimate em quatro quadros** por forma. Na Quebra, `Q` sobe e desce a
  marreta (dano à frente, empurrão, tremor de câmera) e a Ultimate
  `DEVORADOR DE TECTÔNICA` abre uma fenda **que fica no mapa** (e no save);
  na Veloz, o `F` (`VELOCIDADE TEMPORAL`) dispara em relâmpago com riscos de
  velocidade. A barra da forma mostra o tempo restante e, na Quebra, quantas
  marretadas ainda cabem.
- **Dano por arquétipo**: dano, golpes, recarga, alcance e crítico em
  [`js/data/combat-balance.js`](js/data/combat-balance.js).
- **Maestria por uso** (sem pontos): ataque, fluxo, eco e locomoção sobem
  conforme você golpeia, usa habilidades, conclui missões e percorre o mapa.
- **Vida** com dano, invulnerabilidade, regeneração e retorno seguro ao morrer.
- **Códex (`J`)** com abas de missões, progressão, inventário e atributos, cada
  uma com sua cor (âmbar, violeta, laranja e rosa) para não cansar a vista.
- **Ultimate (`F`)** em duas camadas: a base de cada arquétipo e a sobrecarga da
  ferramenta instalada (corte, impacto, onda, avanço, guarda ou sintonia), com
  custo alto de energia e recarga longa.
- **Praia 11.0 — arquipélago com relevo** (falésias altas com topo de musgo,
  cascatas com poço, arco de pedra, pilares, ilhotas e rochas com espuma), mar
  turquesa com cáusticas e três linhas de espuma que escurece até o azul
  profundo. Tudo é objeto de mapa dimensionado por `larguraPx`
  ([`js/data/relevo-praia.js`](js/data/relevo-praia.js)); a grade aprovada da
  praia não mudou.
- **Piso 0 — Aeroporto Central 2.5D** em side-view profundo (estilo sci-fi
  anos 90): 4 camadas de parallax com deriva suave pelo mouse, escala por
  profundidade (o personagem encolhe perto dos janelões), naves geradas por
  IA cruzando o espaço com rastro de plasma, planetas anelado e vermelho,
  pórticos com vórtice animado tingido pela cor de cada doca, piso espelhado
  em tempo real, painel de LED com o estado real da Área de Carga e dois NPCs
  ambientais (a Viajante cruzando o concourse e a Unidade L-9 em patrulha).
  Detalhes e o plano multi-gênero em
  [`docs/plano-aeroporto-e-perspectivas.md`](docs/plano-aeroporto-e-perspectivas.md).
- **Árvore de nado em 5 degraus** — MEDO DA ÁGUA → BOIAR → FÔLEGO → TRAVESSIA →
  MARÉ PLENA. Começa-se com medo do mar e aprende-se na Poça da Cascata; cada
  degrau abre mais mar, mais ar e mais fundura
  ([`js/game/nado-arvore.js`](js/game/nado-arvore.js)). `ESPAÇO` (segurar)
  mergulha, `SHIFT` arranca. O limite de cada degrau é um cordão de boias, e o
  corpo nada deitado, com folha própria por traje
  ([`js/engine/nado-desenho.js`](js/engine/nado-desenho.js)). Detalhes em
  [`docs/praia-11.0-plano.md`](docs/praia-11.0-plano.md).
- **Caminho 0–5** por arquétipo no Códex, com liberação por nível: Q/R no nível 1,
  ferramenta no 2, Ultimate no 3.
- **HUD em coluna única** (mapa, módulo, vitais, habilidades e missão), sem
  cartões sobrepostos; a Ultimate tem carga de 0,42 s antes da soltura.
- Detalhes em [`docs/sistemas-rpg-dano-xp-missoes.md`](docs/sistemas-rpg-dano-xp-missoes.md).

## Futuro

Dimensões com gêneros próprios, viagem de nave e procurados estão mapeados em
[`docs/manifesto-multiverso.md`](docs/manifesto-multiverso.md) — direção, não
promessa.

## Estado atual

Protótipo jogável em construção: vida, dano e progressão já funcionam contra
alvos de treino e zonas de eco; inimigos agressivos e balanceamento final ainda
não existem. Cada etapa concluída e cada
pendência estão registradas em [`docs/roteiro-proximas-etapas.md`](docs/roteiro-proximas-etapas.md).

### Afinidade aquática

Na praia, todos podem aprender a boiar, atravessar na superfície e colocar a
cabeça na água. Por enquanto, descer até o fundo exige Maré Astral e o degrau
de travessia; a prova final também depende disso. Equipamentos, veículos e
formas aquáticas do Núcleo ainda não estão disponíveis: a capacidade explícita
`mergulhoLivre` em `atualizarNado` é o ponto de integração para eles.
Segure ESPAÇO para descer e use SHIFT para a arrancada quando liberada. O Maré
ganha velocidade com os degraus e o respeito do mar, adquirido no fundo e em
socorros; cardumes se assustam menos com um Maré experiente, mas reagem à
arrancada. O novo quadro de impulso complementa a animação existente.

Na Travessia, o Maré também pode tocar **Z** para manter o mergulho sem
segurar uma tecla; toque novamente para subir. A falta de ar cancela o
mergulho sustentado e força a subida. ESPAÇO continua servindo para mergulhos
momentâneos e para o treino inicial. No fundo, o jogo troca a superfície por
uma camada de leito marinho, preservando os mesmos controles, colisões,
fragmentos e fauna. A câmera continua isométrica para manter a orientação e
a leitura das margens; não é uma câmera em primeira pessoa nem um mundo 3D.

Na Praia Inicial, o Maré já mergulhado pode atravessar **sob** as pontes que
possuem água mapeada abaixo delas. O deque e suas travas continuam sólidos na
superfície; estacas e relevo continuam sólidos no fundo. Ao subir sob um deque,
o personagem retorna à superfície dele. A batimetria, a transparência da
passarela e a ordenação do personagem só mudam durante o mergulho profundo.
No fundo, **Q** aplica a propulsão aquática (respeitando energia e recargas),
e **R** detecta fragmentos não coletados e animais aquáticos próximos; **E**
continua sendo o socorro. Em terra, Q e R preservam suas funções anteriores.
O zoom de mergulho é temporário e não altera o zoom escolhido pelo jogador.
