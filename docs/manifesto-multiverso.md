# Manifesto de Arquitetura — Multiverso Dinâmico & Sistemas do Bloco 404

> Documento de direção, guardado a partir das ideias do autor. **Nada aqui está
> prometido como pronto.** A seção 7 mostra o que já existe no código e o que
> cada ideia vai precisar antes de virar jogável.

## 1. Visão geral do multiverso

O Bloco 404 opera sob um motor de jogo dinâmico onde cada dimensão/mundo possui
um **Manifesto de Realidade**. Em vez de manter sempre a mesma mecânica
2D/2.5D, o jogo altera a perspectiva de câmera, os controles, a física e os
modos de combate para se adequar ao gênero de cada dimensão.

## 2. Gêneros dinâmicos por dimensão

| Dimensão | Perspectiva | Gameplay |
| --- | --- | --- |
| Survival / Monster-Hunter (ex.: Ilha da Caveira) | 3ª pessoa imersiva (referência de escala tipo *King Kong* de PS2) | Escala, escassez de recursos, peso nos movimentos, combate contra criaturas colossais adaptando os arquétipos |
| Terror / Survival Horror (referência *Holstin*) | Isométrica cinematográfica com câmera fixa e iluminação dinâmica | Mira direcional sob tensão, inventário restrito, exploração claustrofóbica |
| Veicular / Corrida | Traseira ou isométrica ajustada para alta velocidade | Locomoção a pé bloqueada, controle de motos/carros/naves de superfície, derrapagem, checkpoints e cronômetro |
| FPS / Ação tática | Primeira pessoa | Tiroteio de precisão, cover system, habilidades adaptadas para visão interna |

## 3. Setores de viagem livre e fluida (sem loadings bruscos)

Camadas de navegação:

- **Espaço profundo** — nave-mãe com *modo manual* (voo livre) e *piloto
  automático* (delegar destino a NPC e circular pelo interior: inventário,
  tripulantes, upgrades).
- **Navegação planetária** — voo livre ao entrar na atmosfera; navegação
  marítima fluida sobre oceanos, para sentir a jornada física em vez de cruzar
  um portal instantâneo.

## 4. Sistema de procurados do multiverso

- Alvos espalhados por dimensões, em variantes **Maligna**, **Corrompida/
  Defeituosa** ou **Original**.
- **Matar** → espólio imediato.
- **Prender** → sub-quest de escolta e transporte físico até a **Prisão
  Marítima** ou o **Planeta Prisão**, com risco de emboscada no trajeto.

## 5. Balanceamento e restrição de habilidades em dimensões temáticas

Quando a dimensão muda as regras (minigame, defesa de torre etc.), o motor
precisa suportar **Modos de Regras de Habilidade**:

1. **Restrição total** — só as ferramentas daquela dimensão.
2. **Uso misto** — levar uma habilidade do arquétipo, ou liberar os poderes
   próprios aos poucos conforme avança.
3. **Equilíbrio de atributos** — adaptar dano/vida do arquétipo para não
   quebrar a mecânica nativa.

## 6. Acesso e progressão das dimensões

A princípio as dimensões não ficam liberadas: concluir algo (missão principal,
chave, contrato) abre o **acesso livre** àquele mundo, com quests principais e
secundárias. O jogo é pensado para crescer por atualizações — "o céu é o
limite". Tudo nesta página pode ser lapidado.

## 7. Terreno técnico já preparado (e o que falta)

### O que já existe

| Ideia do manifesto | Base atual no código |
| --- | --- |
| Dimensões com identidade | `js/data/world-registry.js` + `map.meta.dimensao`; `state.world.currentDimension` já é lido no carregamento de mapa |
| Câmera/zoom por mundo | `js/engine/camera.js` com zoom mínimo por mapa e `snapCameraTo` |
| Transições suaves | `js/ui/transition.js` (fade) + `js/game/portals.js` com `transition: 'fade'` |
| Restrição/mudança de regras | **Não existe.** O próximo passo é um `world.meta.rules` declarativo (ex.: `{ abilities: 'native', stats: 'scaled' }`) lido por `abilities.js` e `rpg.js` |
| Veículos e nave | **Não existe.** Exige camada de controle (input → veículo), física própria e mapa de cabine |
| Facções/procurados | **Não existe.** Candidato natural a `data/contracts.js` + flags de save, reaproveitando o motor de missões contáveis |
| Prisão/planeta-prisão | **Não existe.** Depende de navegação e de uma dimensão própria |

### Ordem sugerida para não quebrar o que já roda

1. **Manifesto de Realidade como dado**: `meta.rules` por mapa, começando com
   três chaves (`abilities`, `stats`, `camera`). Sem efeito até ser lido.
2. **Uma dimensão temática pequena** para validar as regras (ex.: arena de
   defesa com habilidades nativas), sem tocar no arquipélago.
3. **Contratos/procurados** em cima do motor de missões (objetivos `defeat`,
   `collect`, `reach` já existem).
4. **Nave e camadas de viagem** por último: é o sistema mais caro e o que mais
   depende de câmera, mapas e persistência de posição.

### Riscos e cuidados

- Cada gênero novo pede **controle, colisão e câmera** próprios; não dá para
  fingir que a isométrica atual serve para FPS ou corrida.
- Restringir habilidades precisa ser **legível** na HUD (o jogador tem de saber
  por que o Q não responde naquela dimensão).
- Persistir posição no espaço/cabine só depois de definir recuperação e custo
  de combustível, como já registra o roteiro.
- Nada de multiplayer, universo infinito ou física orbital realista antes de
  validar desempenho e navegação do primeiro trecho.

## 8. Atualização de direção — perspectivas universais e primeira missão

Nenhum arquétipo é proprietário de uma câmera: a lente é da dimensão, fenda
ou estado de sincronização. As principais referências atuais incluem
isométrico, side-view profundo, 3D livre, low-poly analógico/PSX e Retro-FPS,
sem limitar lentes futuras. A história da chegada, a Calibração de Eco e a
missão canônica **Frequência 66.6 MHz** foram integradas ao plano em
[`lore-primeira-missao-66-6.md`](lore-primeira-missao-66-6.md), com storyboard,
continuidade, direção sonora e contrato para a dimensão futura. O documento
separa explicitamente o prólogo jogável do FPS, chefe e pós-jogo planejados.
