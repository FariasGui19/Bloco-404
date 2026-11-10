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
- **Forma Veloz (Núcleo 10X)** com locomoção nas quatro direções.
- **Dano por arquétipo**: dano, golpes, recarga, alcance e crítico em
  [`js/data/combat-balance.js`](js/data/combat-balance.js).
- **Maestria por uso** (sem pontos): ataque, fluxo, eco e locomoção sobem
  conforme você golpeia, usa habilidades, conclui missões e percorre o mapa.
- **Vida** com dano, invulnerabilidade, regeneração e retorno seguro ao morrer.
- **Códex (`J`)** com abas de missões, progressão, inventário e atributos, cada
  uma com sua cor (âmbar, violeta, laranja e rosa) para não cansar a vista.
- **Ultimate (`F`)** por arquétipo: onda radial, cura e bônus temporário, com
  custo alto de energia e recarga longa.
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
