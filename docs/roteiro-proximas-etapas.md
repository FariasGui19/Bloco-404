# Próximas Etapas — Bloco 404

## Concluído
- Saguão (concluído)
- Estação Bio 0.3.5-bio (cabeceira, distribuidor, rede, válvula, 30/30 testes, PR #30 mesclada)
- Estação Bio 0.3.6-bio (margem baixa, fundação, rota da missão, diário, portal, 30/30 testes, capturas v36-*.png)

## Concluído na 0.6.0
- Assinaturas visuais das 20 Ultimates (Bio-Forja, Domínio, Maré, Núcleo) em `js/engine/ultimate-visuals.js`.
- Árvores por arquétipo no Códex (`js/data/archetype-trees.js`), com nós prontos e em projeto.
- Núcleo 10X: Ultimate só com a forma ativa; formas futuras listadas como projeto.
- Maré Astral: rotas de maré no Códex (leitura de mapa).

## Concluído na 0.6.6 — Motor Bio-Forja fechado

Faltavam duas ações para o exo ficar completo (teste `tests/bio-acoes.mjs`):

1. **Soco nas quatro direções.** Antes só a vista frontal tinha arte; de
   costas e de lado o golpe era invisível. `player-bio-ataque-costas.png` e
   `player-bio-ataque-lateral.png` (4 quadros cada) fecham isso, com a lateral
   esquerda vindo de espelho e a de costas desenhada por trás (nunca espelhada,
   porque não é um perfil).
2. **Propulsor do Q.** O avanço deixou de reaproveitar a célula de caminhada:
   `player-bio-propulsor.png` tem agachar, acender, avanço e pouso, presos ao
   tempo real do dash.

`js/data/bio-action-animation.js` decide quadro e fase; o renderer desenha as
ações antes da caminhada e mantém o caminho antigo como fallback.

Versão `0.6.6-bio-forja-fechado`. Com isso o ciclo do Bio-Forja está redondo:
caminhada (4 direções), soco (4 direções), Q com arte, R de varredura, F com
uma execução por ferramenta, exo respirando e Códex mostrando a execução.

**Pendências que não são desta rodada:** camada de áudio (pistão e vapor) —
o jogo ainda não tem áudio — e a leitura da cor da ferramenta no HUD durante o
bônus do F.

## Concluído na 0.6.5 — o Motor Bio-Forja ganhou corpo

Até aqui o Bio-Forja tinha as quatro ferramentas definidas em dados
(`js/data/archetype-tools.js`) e as cinco assinaturas desenhadas como efeito
procedural, mas o corpo só fazia a pose de andar durante o `F`. A rodada
fechou a lacuna:

1. **Cinco folhas de execução** (`assets/sprites/player/player-bio-ult-*.png`),
   uma por assinatura: cúpula de raízes (`forja_dome`), serra instável
   (`serra`), marreta de forja (`martelo`), rede de cabos (`cabos`) e
   propulsores (`propulsores`). Geradas a partir do turnaround aprovado do
   operador, com o preparador `tools/preparar-bio-ultimate.py`.
2. **Animação presa ao estado real** (`js/data/bio-ultimate-animation.js`):
   carga usa os quadros 0 e 1, impacto o 2, recuperação o 3. A escolha é pela
   ASSINATURA do efeito, não pelo id da ferramenta — ferramenta nova com a
   mesma assinatura já entra com arte.
3. **A carga já veste a ferramenta**: `beginUltimate` passou a guardar a
   assinatura em `chargeDefinition`, então a preparação usa o gesto certo em
   vez de cair sempre na cúpula.
4. **O exo respira** (`drawBioForjaFx`): vapor de pistão no passo e bobina da
   ferramenta acesa na cor dela (ciano da lâmina, âmbar do punho, verde do
   gancho, azul da asa). Enfeite de leitura, sem tocar em dano/colisão.

Versão `0.6.5-bio-forja-ultimate`. Teste novo: `tests/bio-ultimate.mjs`
(assinatura → folha → quadro por fase → bônus ativo → altura do corpo).

**Ainda pendente do Bio:** som de pistão e a leitura da ferramenta no HUD
durante o bônus (hoje o bônus aparece com nome e segundos, sem a cor da
ferramenta).

## Concluído na 0.6.4 — o Núcleo 10X fechado

Três pendências antigas do Núcleo, todas em jogo:

1. **Ataque de costas da Quebra.** Folha própria de quatro fases
   (`player-10x-bruta-ataque-costas.png`): marretas baixas → erguidas pelas
   costas → descida com anel de poeira → recuperação. Antes, socar de costas
   usava a pose parada e só a onda de choque contava o golpe.
2. **Fenda permanente no mapa.** A Ultimate `DEVORADOR DE TECTÔNICA` agora
   registra a cicatriz em `progress.scars.fissuras` (`js/game/scars.js`), o que
   entra no save de graça (o save clona o progresso). O renderer desenha a
   fenda como decalque de chão — mesma projeção isométrica e mesmo zoom da
   câmera — antes do mundo, então ela fica embaixo de tudo. Regras: 24 fendas
   por save, mesma cova é REFORÇADA (alarga) em vez de duplicar, e nada de
   colisão: é chão, não parede.
3. **Leitura da forma na interface.** O relógio do `T` ganhou barra
   proporcional à duração da forma (`#nucleoBar`), com faixas visíveis na
   Quebra para lembrar o custo de 3 s por marretada; o Códex mostra a mesma
   informação com nome, segundos e "quantas marretadas ainda cabem".

Versão `0.6.4-nucleo-fechado`. Testes novos: `tests/cicatrizes.mjs` e
`tests/formas-ui.mjs`.

## Concluído na 0.6.3 — Ultimate das duas formas e roda do T consertada

Dois pedidos do playtest, fechados com teste próprio em
`tests/ultimate-formas.mjs`:

1. **Execução da Ultimate das duas formas.** Antes o `F` só desenhava o efeito
   procedural; o corpo continuava na pose de andar. Agora cada forma tem folha
   de execução em quatro quadros:

   | forma | folha | quadros |
   | --- | --- | --- |
   | FORMA VELOZ | `player-10x-veloz-ultimate.png` (896×224) | círculo de relógio → corpo encolhido e faiscando → arrancada com riscos → recuperação |
   | QUEBRA SISTEMAS | `player-10x-bruta-ultimate.png` (1024×256) | marretas baixas → erguidas com rachadura magmática → pancada dupla abrindo a fenda → corpo alto, marreta apoiada |

   `js/data/nucleo-ultimate-animation.js` escolhe o quadro pelo estado REAL da
   Ultimate: carga (0,42 s) usa os quadros 0 e 1, a soltura usa 2 no impacto e
   3 na recuperação. O renderer desenha isso ANTES de qualquer pose de
   locomoção, e o efeito carrega a forma que o soltou (a Veloz não veste a arte
   da Quebra).

2. **Roda do T mostrando só uma imagem.** A causa era CSS: no modo com a arte
   do anel, os quatro cartões eram pintados no MESMO ponto (50%/46%), um sobre
   o outro — só a última miniatura aparecia e os nomes ficavam empilhados. As
   posições agora vêm de dado (`--slot-x`/`--slot-y`), medidas nos quatro
   hexágonos da arte do anel: topo 50%/31% (Veloz), direita 77%/52% (Quebra),
   base 50%/67% (Fluida), esquerda 22%/53% (Núcleo). O anel ficou maior
   (470 px, proporção 3:2), a miniatura cresce no cartão selecionado, o nome
   ganhou etiqueta legível e o `◆` duplicado saiu no modo com arte.

Arte: `tools/preparar-quebra-sistemas.py` agora aceita recorte em grade
(`grid`/`inset`), altura e célula por folha, e nunca deixa um quadro sangrar na
célula vizinha. Versão `0.6.3-nucleo-completo`.

## Concluído na 0.6.2 — Quebra Sistemas jogável de verdade

O criador jogou a 0.6.1 e apontou cinco defeitos. Todos foram fechados, cada
um com teste próprio em `tests/quebra-sistemas.mjs`:

1. **Roda do `T` não trocava a imagem.** As duas formas agora usam o mesmo
   mecanismo (uma imagem PNG por forma): a Quebra ganhou
   `assets/sprites/ui/nucleo-quebra-sistemas.png`, recortado do bloco de
   cabeça da folha de referência pelo próprio script de arte. O recorte em
   runtime (que deixava o cartão vazio) saiu. O nome da forma também deixou de
   ser escondido quando a arte carrega, e o cartão responde a ponteiro e clique.
2. **Transformação com a animação errada.** A transformação era decidida por
   qualquer efeito `transformacao_10x` e desenhava sempre a folha do Pulso
   Veloz. Agora quem decide é `effect.form`: a Quebra usa a folha nova
   `player-10x-bruta-transformacao.png` (4 quadros: blocos soltos → corpo
   montado), e o retorno ao operador é a mesma arte ao contrário.
3. **Forma pequena demais.** Escala da Quebra de `.55` para `.95`: ela fica com
   ~169 px de altura contra ~142 px do operador (antes eram 98 px, menores que
   o próprio personagem).
4. **`Q` não fazia nada.** Dois problemas: o efeito da pancada reutilizava o
   id da transformação (o jogo desfazia e refazia a metamorfose) e não havia
   dano nenhum. Agora `ability.cast` tem id próprio, trava o corpo, sobe a
   marreta na folha de ataque e, ao fim da preparação, `executeBrutaSmash`
   aplica dano em disco à frente, empurrão, tremor de câmera, fagulhas nos
   pistões e consumo de 3 s da barra.
5. **Ultimate (`F`) morta na forma.** `precisaDeForma` comparava com
   `'forma_veloz'`; com a Quebra o jogo achava que não havia forma ativa.
   Agora aceita qualquer forma do Núcleo (`isNucleoFormId`).

Versão `0.6.2-quebra-jogavel`.

## Concluído na 0.6.1 — segunda forma do Núcleo 10X
- **QUEBRA SISTEMAS** (`nucleo_bruto`) deixou de ser projeto e virou a segunda
  forma jogável do Núcleo. Identidade do criador: bípede atarracado de liga de
  ferro, sem cabeça, bloco de colisão com núcleo âmbar, marretas telescópicas
  arrastando e pistões soltando vapor.
- Dados em `js/data/archetype-tools.js` (forma, duração 20 s, recarga 10 s,
  velocidade 0,6×, custo de 3 s de barra por golpe) e leitura única em
  `js/data/nucleo-forms.js`. A escolha no Códex decide o que o `T` ativa.
- Arte: `tools/preparar-quebra-sistemas.py` → `assets/sprites/player/player-10x-bruta-*`
  (parado direcional, andar frente/costas/lateral, ataque lateral e frontal),
  todas PNG RGBA 4×1 com células de 256 px, apoio dos pés normalizado.
- Runtime: `js/data/bruta-animation.js` (pose, locomoção e marreta),
  poeira/faísca/vapor e tremor de passo no renderer, sombra mais larga.
- Ultimate própria **DEVORADOR DE TECTÔNICA** com assinatura `tectonica` em
  `js/engine/ultimate-visuals.js`: ombros magmáticos, fenda aberta no chão,
  placas se separando e detritos caindo.
- Interface: a roda do `T` passou a listar as formas do dado (duas jogáveis,
  duas em projeto), com seleção por teclado/clique, miniatura de cada forma e
  estado ATIVA; HUD mostra o nome e a cor da forma ativa; Códex lista a nova
  Ultimate e os atributos da forma.
- Utilidade de demolição: golpe carregado abre portões com
  `gate.breaksWith: 'peso'` (mecânica pronta; nenhum portão do mapa usa a
  marcação ainda) e o `Q` da forma virou **PANCADA DE PESO**, com preparação
  longa.

## Em fila (prioridade)
1. Animações dos arquétipos (Saguão → Arquétipos → Bio-Forja → Bolt)
   - Arquétipo 1: ataque básico adaptativo, 4 habilidades (Q/R + Ultimate), direção, escala, pés, transparência (conferir `docs/prompts-sprites-precisao.md`).
   - Arquétipo 2: ...
2. Navegação marítima da Maré (em projeto): nado livre e fluido, correntes
   entre ilhas, portos e missões de travessia. Hoje só o mapa no Códex.
3. Formas Fluida e Núcleo do 10X — a Bruta virou *Quebra Sistemas* jogável.
4. Bolt (cachorro real): prévia opt-in no diário (não conceder automaticamente), obtenção, autorização, animações, progressão.

## Missão completa (primeira missão visual/mecanicamente pronta)
- Ilha compartilhada, ampla e coerente (áreas exploráveis, missões próprias, marcantes).
- Obstáculos, puzzles, inimigos agressivos telegrafados, minibosses com contrajogo.
- Pets com níveis, progressão e inventário reais.
- Viagem espacial/galáctica contínua (nave, interior interativo, melhorias) — vertical slice entre dois destinos.

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

## Atualização — HUD enxuta, nível abrindo o kit e Ultimate com execução

A HUD deixou de ter cartões em posições fixas: virou uma coluna única
(mapa → módulo → vitais/habilidades → missão) e o aviso de habilidade foi para
o centro da tela. Nada mais se sobrepõe quando o kit cresce.

O caminho agora **tranca de verdade**: nível 1 dá Q/R, nível 2 abre a
ferramenta, nível 3 acorda a Ultimate. A HUD mostra o próximo degrau e o
Códex marca cada cartão como bloqueado com o nível exigido.

A Ultimate ganhou execução: carga de 0,42 s com partículas por arquétipo e
movimento travado, seguida de soltura com tremor de câmera e clarão. Falta a
pose em folha — ela continua na fila de arte.

## Atualização anterior — caminho 0–5 e sobrecarga de ferramenta

Cada arquétipo ganhou o caminho de seis degraus dentro do jogo (Códex →
Progressão): o que está disponível, o que está em teste e o que ainda é plano.
A Ultimate nível 1 é a **sobrecarga da ferramenta** — Bio-Forja escolhe entre
lâmina, punho, gancho e asa; Domínio entre espada, escudo, postura e investida;
Maré entre cúpula, corrente, chicote e senso; Núcleo entre quatro formas. A
escolha fica no save e muda a Ultimate do `F`, o cartão do Códex e a cor da HUD.

O que **não** está pronto: degrau 4 (combinação/modo avançado), as Ultimates de
arquétipo definitivas (nível 5), pose de execução, inimigo agressivo, utilidade e
suporte.

## Atualização anterior — Ultimate e cor por função

A Ultimate de cada arquétipo entrou no lugar previsto pelo documento de direção
(slot 5, tecla **F**): onda radial com dano, cura proporcional e bônus temporário
de dano, velocidade, energia ou vida/s. Custo alto e recarga longa; estado,
bônus e efeito são de sessão. O Códex mostra a Ultimate na aba Progressão e cada
aba/trilha ganhou cor própria — os ícones deixaram de ser todos verdes.

O que **não** está pronto: animação do personagem executando a Ultimate, aviso
de área para inimigos (que ainda não existem), balanceamento após combate real e
as habilidades de utilidade/suporte.

## Futuro — multiverso dinâmico

A direção de dimensões com gêneros diferentes (survival, terror, corrida, FPS),
viagem fluida de nave, procurados com escolha entre matar e prender, e regras de
habilidade por dimensão está registrada em
[`manifesto-multiverso.md`](manifesto-multiverso.md), com o terreno técnico que
já existe e a ordem sugerida de implementação. Nada disso está prometido como
pronto.

## Restrições de produção (mantidas)

- Exatamente duas folhas/imagens por atualização.
- Preservar saves, progresso, interações, caminhos e portais.
- Clique esquerdo ataca; Shift + clique move.
- Bio-Forja Q aprovado (2,15 tiles / 28 energia; com traje 2,80 tiles / 22 energia; recarga 1,25 s).
- Um arquétipo e um módulo por vez.
- T alterna roupa civil/armadura.
- Núcleo 10X: roda própria; Forma Veloz mais rápida.
- Portal e animação interior: não animar a estrutura inteira, apenas o interior/tela.
- Consultar `docs/prompts-sprites-precisao.md` antes de gerar animações.
- Bolt: semelhança aprovada, pose provisória, prévia opt-in.

## Atualização 0.3.6-bio — margens baixas, fundações e rota

Duas imagens novas: `assets/sprites/estacao-bio/bio-margem-baixa.png` (apoio
rente ao solo, sem hitbox) e `bio-fundacao.png` (base sob as máquinas, ordenada
atrás delas por `depthOffset` negativo). O terminal ganhou pegada de 460 px com
camadas de profundidade, as cabeceiras foram reduzidas, a rota da primeira
missão passou a ser desenhada no piso (losangos e setas, trechos concluídos mais
claros) e o portal de retorno mostra `labelConcluido` quando a missão do setor
termina. A sala de controle continua acessível pelo marcador CONTROLE em 16,12.

## Próxima ação

- Retomar a fila de animações dos arquétipos (`docs/ordem-de-arte-e-implementacao.md`).
- Gerar exatamente duas folhas/imagens por rodada.
- Implementar, testar a suíte inteira, capturar, documentar, commit, push, PR.
