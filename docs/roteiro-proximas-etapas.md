# Próximas Etapas — Bloco 404

## Concluído
- Saguão (concluído)
- Estação Bio 0.3.5-bio (cabeceira, distribuidor, rede, válvula, 30/30 testes, PR #30 mesclada)
- Estação Bio 0.3.6-bio (margem baixa, fundação, rota da missão, diário, portal, 30/30 testes, capturas v36-*.png)

## Em fila (prioridade)
1. Animações dos arquétipos (Saguão → Arquétipos → Bio-Forja → Bolt)
   - Arquétipo 1: ataque básico adaptativo, 4 habilidades (Q/R + Ultimate), direção, escala, pés, transparência (conferir `docs/prompts-sprites-precisao.md`).
   - Arquétipo 2: ...
2. Bolt (cachorro real): prévia opt-in no diário (não conceder automaticamente), obtenção, autorização, animações, progressão.

## Missão completa (primeira missão visual/mecanicamente pronta)
- Ilha compartilhada, ampla e coerente (áreas exploráveis, missões próprias, marcantes).
- Obstáculos, puzzles, inimigos agressivos telegrafados, minibosses com contrajogo.
- Pets com níveis, progressão e inventário reais.
- Viagem espacial/galáctica contínua (nave, interior interativo, melhorias) — vertical slice entre dois destinos.

<<<<<<< HEAD
## Restrições
- Exatamente duas folhas/imagens por atualização.
- Preservar saves, progresso, interações, caminhos, portais.
- Clique esquerdo ataca; Shift + clique move.
- Bio-Forja Q aprovado (2,15 tiles / 28 energia; com traje 2,80 tiles / 22 energia; recarga 1,25 s).
- Um arquétipo e um módulo por vez.
- T alterna roupa civil/armadura.
- Núcleo 10X: roda própria; Forma Veloz mais rápida.
- Portal e animação interior: não animar a estrutura inteira, apenas o interior/tela.
- Consultar `docs/prompts-sprites-precisao.md` antes de gerar animações.
- Bolt: semelhança aprovada, pose provisória, prévia opt-in.

## Próxima ação
- Retomar fila de animações dos arquétipos (conforme `docs/ordem-de-arte-e-implementacao.md`).
- Gerar exatamente duas folhas/imagens para o próximo arquétipo (prioridade: Saguão → Arquétipos).
- Implementar, testar (30/30), capturar (Chromium real), documentar, commit, push, PR.
=======
- Refinar saguão, NEXO, viajante e leitura de direções; validar com o jogador em câmera, zoom e deslocamento reais.
- **Lúmeo — primeiro vínculo opcional:** investigar três vestígios da Enseada, ouvir um sinal junto à trilha, acalmar a ressonância nas ruínas e oferecer companhia ao eco na mata. O diário aponta o encontro; ele acompanha sem bloquear ou atacar, com visual procedural provisório. O vínculo é salvo, sem substituir a missão principal. Ainda faltam recolher/dispensar, tela de companheiros, arte definitiva e comportamento mais robusto. Bolt tem prévia local opt-in no diário; autenticação e missão pessoal continuam pendentes, sem concessão automática.
- ~~Completar caminhadas coerentes das quatro direções da Forma Veloz~~ — feito: as direções frente e costas agora têm folhas próprias de 4 quadros em PNG com alpha (`player-10x-veloz-andar-frente/costas.png`) e o renderer não assume mais grade fixa. O ataque básico vertical da forma ainda usa pose lateral provisória. A caminhada do NEXO continua pendente. Novas folhas de Domínio/Maré são referências de poses, não sequências completas; usar somente quando não trocarem a identidade do traje.
- Consolidar primeiro objetivo da ilha: missão própria por arquétipo que leva da calibração à Enseada, com retorno, diário, recompensa útil, teste de saves antigos e nenhuma segunda escolha de arquétipo.

## 2. Primeiro inimigo, depois chefe

1. Definir um único inimigo de eco agressivo na Enseada: patrulha, percepção com limite, aviso visual, perseguição limitada ao território, preparação de ataque, golpe esquivável, recuperação e retorno ao ponto de origem. Não atacar através de paredes; ter tempo de reação e indicador acessível.
2. Criar saúde/derrota/recuperação do jogador, invulnerabilidade curta e feedback; persistir somente o necessário. Sem punições permanentes até balancear. Impedir ataques durante menus e respeitar Q/R e transições.
3. Testar colisão, teleporte/portais, reinício, saves, taxa de quadros, múltiplos inimigos, dano e autoataque nas quatro classes. Companheiro inicialmente não participa do combate.
4. Um miniboss opcional derivado do mesmo sistema: fases claras, padrões telegrafados, janela de contra-ataque, reset seguro e recompensa sem bloquear exploração. Depois evoluir o rival dimensional com identidade narrativa própria.

## 3. Vertical slice de nave e voo

- Primeira nave pequena e pessoal: interior como mapa 2D leve, piloto/cadeira interativa, painel de destino, armazenamento e uma melhoria funcional. Entrada/saída caminhand​o; controles explicados, operação com teclado e mouse e alternativa de navegação assistida. Persistir nave, melhorias, posição setorial e combustível apenas depois de definir recuperação e custo justo.
- Um único percurso demonstrável: solo → decolagem → atmosfera → espaço próximo → aproximação → pouso em outro local. Sem corte de controle que faça parecer portal. Usar câmera, escala de altitude e transições contínuas; trocar mapas/camadas internamente em limites discretos, preservando posição, velocidade, direção, tripulação e estado. Não precisa simular a escala física de galáxias para transmitir continuidade.
- Autopiloto opcional, velocidade ajustável, pausa, remapeamento, contraste, indicadores de proximidade, desligar flashes e instruções textuais. Evitar acessibilidade depender de precisão de mouse ou reflexos rápidos.
- Testar primeiro com dois destinos, cenário procedural enxuto e obstáculos simples. Nada de prometer universo infinito, física orbital realista, multiplayer ou voo em grandes galáxias antes de validar desempenho e navegação.

## 4. Expansão gradual

Rotas da ilha → arquipélago e teleférico → zonas com inimigos e primeiro chefe → nave de curta distância → outro planeta/dimensão → rotas entre ilhas galácticas → setores estelares maiores. Cada região precisa de retorno, caminho legível, missão, interações, save e testes antes de aumentar a escala. Portais continuam opções da ficção, mas não substituem o voo contínuo solicitado.

## Decisões ainda abertas

Arte e personalidade definitivas de Lúmeo; regras de troca/dispensa e progressão de pets; aquisição autorizada do Bolt; custos de nave/combustível; dano, recompensas e níveis dos inimigos; como o tempo de transformação 10X evolui. Não conceder habilidades multiversais, inventar múltiplos arquétipos simultâneos ou impor números definitivos antes dessas decisões.

## Atualização: primeiro setor Bio e Bolt

Veja `docs/estacao-bio-e-bolt.md` para o setor explorável provisório e a prévia local de Bolt, além das limitações antes de convertê-los em conteúdo final.

## Atualização 0.3.5: base espacial antes de mais conteúdo

A Estação Bio ganhou decks caminháveis sobre os canais, guarda-corpos com profundidade por trecho, camadas de desenho para as estruturas grandes, hitbox do terminal medida, aventais de piso, sombras de apoio e uma rede de pressão que torna os reparos existentes perceptíveis e leva a uma válvula opcional na estufa. Foram geradas e implementadas exatamente duas imagens estáticas (cabeceira e distribuidor), não folhas de animação; a ordem e a justificativa estão em `docs/ordem-de-arte-e-implementacao.md`. O ciclo de vida do jogador, inimigos telegrafados, minibosses, nave e voo contínuo seguem nas etapas acima: nada disso foi antecipado ou declarado pronto. O passo da válvula não concede recompensa nem conclui o setor; é apenas a primeira consequência jogável dos reparos.


## Atualização — RPG orgânico, vida e Códex

O ataque básico tem dano próprio por arquétipo, alvos de treino têm vida real,
e o progresso de poder deixou de ser "escolher ponto na árvore": agora existe
**maestria por uso** — quatro trilhas (ataque, fluxo, eco e locomoção) que sobem
com golpes, habilidades, missões e distância percorrida. No Núcleo 10X, a
trilha CINÉTICA deixa a Forma Veloz mais rápida e mais longa conforme o jogador
anda, corre e dá dash nela.

O diário `J` foi dividido em um **Códex** com quatro abas (missões, progressão,
inventário, atributos), com fundo e ícones em pixel art gerados para a
interface. O jogador também ganhou **vida**: dano, invulnerabilidade,
regeneração fora de combate e retorno seguro ao morrer — sem perder XP, itens
ou missões. A primeira fonte de dano são zonas de eco instável na Enseada.

Detalhes, números e testes: [`sistemas-rpg-dano-xp-missoes.md`](sistemas-rpg-dano-xp-missoes.md).

O que **não** está pronto: inimigos agressivos, cura por itens, resistências,
UI de rank com histórico e balanceamento final.

## Futuro — multiverso dinâmico

A direção de dimensões com gêneros diferentes (survival, terror, corrida, FPS),
viagem fluida de nave, procurados com escolha entre matar e prender, e regras de
habilidade por dimensão está registrada em
[`manifesto-multiverso.md`](manifesto-multiverso.md), com o terreno técnico que
já existe e a ordem sugerida de implementação. Nada disso está prometido como
pronto.
>>>>>>> e5736762ec637ebe671540515d65b30b7c6323f4
