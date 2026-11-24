# Lote 11 — trilha, sinalização e resposta ao E

## Caminhada sem quique

O glitch do personagem ao andar era o bob somado a cada quadro:

- antes: `|sin(phase)| * 0.045` com fase chegando a ~18 rad/s — a cúspide do
  valor absoluto virava um quique a cada passo;
- agora: `phase += dt * gait * min(9, speed * 1.15)` e bob
  `(0.5 - 0.5 * cos(2·phase)) · (0.017 - 0.005 · min(1, speed/8)) · moving`,
  filtrado por `mix(pose.bob, alvo, 1 - exp(-dt*22))`.

Medição em jogo (`body.position.y`, 1 amostra a cada 4 quadros, `speed 7.5`):
**0 → 0.045 antes**, **0 → 0.011 depois**, com o tronco sem rotação. O tornozelo
compensa quadril e joelho (`roll 0.038`), então a sola continua paralela ao
chão, e `onStep` dispara o som de passo a cada troca de pé (throttle 0.16 s,
7 passos em 4 s).

## Lote 11: quatro texturas e seis adereços

Fontes em `assets/source-art/setor-limiar-lote11/`, preparo em
`tools/preparar-limiar-lote11.py` (recorte da primeira cópia quando a folha traz
o objeto repetido, chave de magenta, quantização em 56 cores).

| textura (256 px) | uso |
| --- | --- |
| `piso-trilha` | fita da trilha (`materials.trail`) |
| `ponte-madeira` | tabuleiro do píer (`materials.plank`) |
| `agua-limiar` | fundo do mar com cáusticas (`materials.seabed`) |
| `runa-brilho` | halo aditivo das runas acesas (`materials.sigilTexture`) |

| adereço | onde | resposta ao E |
| --- | --- | --- |
| `placa-limiar` | duas curvas da trilha | — |
| `estandarte-limiar` | dois trechos | — |
| `lanterna-limiar` | quatro, em poste | acende (âmbar + halo) |
| `caixote-limiar` | dois | abre, escurece e solta marca de saque |
| `estatua-limiar` | entrada do cume | desperta (halo + runa) |
| `pilar-runa-arte` | chegada | — |

Os adereços são billboards com a base no terreno (`heightAt`), folga de 1,4 m da
trilha e 3,4 m dos pilares para não disputar o mesmo `E`. Lanterna e estandarte
ganharam poste físico: sem apoio o sprite lia como objeto flutuando.

## Mapa e wayfinding

- `js/dimension/sector-wayfinding.js` desenha a **fita contínua** da trilha
  (112 amostras, largura irregular, pontas afinadas, normal do terreno),
  quatro **pilares de runa** (acesos mudam anel, núcleo e halo) e o feixe do
  núcleo quando os quatro estão acesos. Tudo persiste em
  `progress.flags.limiarPylons` e `limiarPath`.
- A HUD ganhou o painel **TRILHA DO LIMIAR**: quatro losangos e o núcleo,
  preenchidos para o que já foi feito, âmbar pulsante no próximo destino, com a
  distância em metros. Ele responde à pergunta "para onde eu vou agora".
- O minimapa desenha a rota, os pilares, os adereços e uma **linha tracejada até
  o próximo objetivo** com anel pulsante.
- Sem alvo por perto, o prompt passa a mostrar `◆ PILAR n · Xm` (ou o núcleo)
  em vez de só a distância da âncora.

## Interação com mudança no mundo

Cada `E` produz efeito visível e som próprio (`lantern`, `crate`, `shrine`,
`pillar`, `anchor`): anel de choque no chão em toda interação, lanterna acesa,
caixote com marca de saque flutuante, estátua com halo, pilar com runa girando.
O alvo escolhido é sempre o interativo **mais próximo** — pilar ou adereço —, o
que evita prompts contraditórios quando o operador fica entre os dois.

## Testes e evidências

- `tests/dimension-lote11.mjs`: 5 testes — assets, recorte RGBA, layout (fora da
  trilha, sem sobreposição, folga dos pilares), interação e persistência,
  materiais sem `MeshPhongMaterial`.
- `tests/dimension-layout.mjs`, `dimension-environment.mjs`,
  `dimension-motion.mjs`, `dimension-lote10.mjs` e demais suítes Node passam.
- Browser: `arrival-polish`, `living`, `master-morpher`, `polish`, `rupture`,
  `surgery` e `sculpt` passam. `dimension-environment-browser.mjs` falha também
  no commit base (limite de 6 texturas desatualizado, anterior a este lote).
- Maré: 19 arquivos `tests/mare-*.mjs` passam.
- Evidência visual em `qa/upgrade/lote11-trilha-chegada.png`,
  `lote11-pilar-antes.png`, `lote11-pilar-depois.png`,
  `lote11-lanterna-antes.png`, `lote11-lanterna-depois.png`,
  `lote11-caixote-depois.png`, `lote11-estatua-depois.png` e
  `lote11-vista-rota.png`.
