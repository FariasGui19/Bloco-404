# Ordem de Arte e Implementação

## Regra
Gerar e implementar **exatamente duas folhas/imagens por atualização**, seguindo a ordem de prioridade:
1. Saguão (concluído)
2. Animações dos arquétipos (em fila)
3. Estação Bio / Bio-Forja (rodadas 0.3.5 e 0.3.6)
4. Folha de sprites do Bolt (prévia opt-in, sem concessão automática)

## Rodada atual (0.3.23): cor por função e sigilos de Ultimate

Duas peças visuais, dentro da regra: **(1)** uma folha 2×2 com os quatro sigilos
de Ultimate (`assets/source-art/ui/codex-ultimates.png`), recortada em
`assets/sprites/ui/codex/ultimate-<arquétipo>.png`; **(2)** o conjunto de ícones
do Códex repintado por função — âmbar (missões), violeta (progressão), laranja
(inventário), rosa (atributos), vermelho (vida), ciano (energia), dourado (XP) e
neutro (fechar) —, resolvendo o relato de que "tudo verde cansa a vista".

O repintado não gera arte nova: `tools/preparar-codex-ui.py` aplica uma rampa de
cor sobre o alpha já limpo do magenta, mantendo contorno escuro e realce branco
só no topo do brilho. O mesmo script recorta os sigilos. Nenhuma folha de
personagem foi gerada e nenhum valor aprovado de Q/R mudou.

Junto entrou a **Ultimate** dos quatro arquétipos (tecla F): dados em
`js/data/ultimates.js`, runtime em `js/game/ultimate.js`, HUD própria, cartão no
Códex e efeito procedural no renderer (anéis + faíscas, sem folha nova). A
próxima peça de arte natural é a **pose/folha de execução da Ultimate**, uma por
arquétipo, avaliando identidade e traje — e depois o inimigo agressivo, que
continua sendo o que falta para o combate deixar de ser treino.

## Rodada anterior (0.3.6-bio)
**Peças geradas (exatamente duas):**
1. `assets/source-art/estacao-bio/margem-canal-baixa.png` → `assets/sprites/estacao-bio/bio-margem-baixa.png` (512×309, alpha real, bordas rente ao canal)
2. `assets/source-art/estacao-bio/fundacao-maquina.png` → `assets/sprites/estacao-bio/bio-fundacao.png` (512×281, alpha real, placas sob as máquinas)

**Implementação:**
- Mapa `estacao-bio.js`: margens baixas (32 instâncias, sem colisão, profundidade negativa), fundações (9 instâncias, sob máquinas, escala proporcional), rota da primeira missão (16 pontos, 4 estágios), diário (etapas Bio, sem recompensa), portal (leitura registrada).
- Renderer: `drawStationCanalRims` (bordas de pedra rente à água), `drawStationRoute` (losangos no piso), profundidade das sombras (contato duro), conduítes (6/3.5/1.2 px), lâmpadas (raio 2.6).
- Config/Main: versão `0.3.6-bio`, manifesto (4 sprites novos), aviso de arte ausente.
- UI: diário (etapas Bio, sem recompensa), interação (portal com leitura registrada).
- Testes: `tests/estacao-bio.mjs` (126 objetos, 32 margens, 9 fundações, rota, diário, portal), `tests/bio-integracao.mjs` (portal com leitura), `tests/quest-journal.mjs` (etapas Bio). **30/30 OK**.
- Navegador: capturas `v36-*.png` (terminal, ponteA, ponteB, patio, valvula, wide) confirmam livre:true, version V0.3.6-bio, ERROS [].

## Rodada anterior (0.3.5-bio)
**Peças geradas (exatamente duas):**
1. `assets/source-art/estacao-bio/cabeceira-ponte.png` → `assets/sprites/estacao-bio/bio-cabeceira.png` (640×503, alpha real)
2. `assets/source-art/estacao-bio/distribuidor-pressao.png` → `assets/sprites/estacao-bio/bio-distribuidor.png` (640×595, alpha real)

**Implementação:**
- Mapa `estacao-bio.js`: canais, decks, rede, válvula (55,53), cabeceiras (4), distribuidores (3), sombras, filtros, hitbox 7².
- Renderer: `drawStationBridges`, `drawBioNetwork`, `drawBioShadows`, `stationClip`, `depthLayers`, conduítes, tábuas.
- Config/Main: versão `0.3.5-bio`, manifesto (2 sprites novos).
- Testes: **30/30 OK** (incluindo R→E, saves, coletáveis).
- Navegador: capturas `new-*.png` e `final-*.png` (válvula visível, rede ciano), interação Chromium real (R→E, diálogo, save).
- PR #30 mesclada em `main` (commit `9567ec4`).

## Rodada anterior (0.3.4-bio)
**Peças geradas (exatamente duas):** (histórico)
- Animações de arquétipos (fila preservada)

## Próximos passos
- Continuar fila de animações dos arquétipos (prioridade: Saguão → Arquétipos → Bio-Forja → Bolt).
- Missão completa visual/mecanicamente: ilha compartilhada, áreas exploráveis, puzzles, minibosses, pets.
- Viagem espacial/galáctica (nave, interior, melhorias) — vertical slice futura.
- Não gerar terceira imagem na rodada 0.3.6.

A sequência opcional usa R de Bio-Forja para diagnosticar e E para reparar o condutor da chegada e depois o regulador do pátio. Os reparos permanecem sólidos e visíveis e as flags sobrevivem à reentrada, sem substituir coletáveis antigos nem missão ativa. Ainda não ativam a estufa nem concedem recompensas. O cenário continua provisório; árvores, areia, água e bordas exigem refinamento. A aproximação de profundidade do terminal foi ajustada para o novo ponto do print, mas não substitui camadas reais.

## Próximas rodadas sugeridas (ordem ajustável depois do teste)

1. **Estação Bio — refino do que foi consolidado:** a base espacial (decks, canais, camadas, colisão medida, rede) já está implementada e testada; falta suavizar a borda retangular da ilha, os canais retos, a transição areia/piso, a variedade de cenário e a profundidade fina das passagens. Evitar gerar uma imagem plana e fingir que suas escadas são caminháveis. Testar em vários tamanhos de tela antes de aprovar.
2. **Praia Inicial — travessias e teleférico:** uma folha de peças de teleférico/apoios e, se necessário, uma de obstáculos e animações de reconstrução. Preservar o R de diagnóstico e as rotas das quatro classes; trilhos não devem invadir a areia.
3. **Bolt — animações reais:** uma direção por vez, ou até duas folhas se tiverem quadrícula e alpha válidos; validar identidade, patas e tamanho com o tutor. Hoje só existe uma pose, não caminhada real. Missão pessoal e autorização de conta continuam pendentes.
4. **Saguão — NPCs:** NEXO de frente/costas e, numa rodada seguinte, gestos; preservar aparência já aprovada. Viajante só substituída se houver uma melhoria consistente com as quatro direções e a mala.
5. **Enseada — vínculo e fauna:** arte do Lúmeo com idle/movimento e, depois, objetos de uma cena de encontro. Concluir uma missão de vínculo real, sem revogar pets de saves antigos. Evitar apenas mais cristais para clicar.
6. **Estação Bio — missão:** peças para condutor, válvulas e estufa, leitura de estado e puzzle que use R e Q sem alterar seus valores aprovados. Garantir que salvar/recarregar preserve etapas, com saída e retorno.
7. **Combate — base antes da arte de chefe:** vida e recuperação do jogador, telegraph acessível, ataques com colisão e IA em testes. Depois uma folha de inimigo Bio e sua folha de preparação/ataque, somente quando direção e silhueta forem consistentes; miniboss em rodadas próprias.
8. **Demais arquétipos e regiões:** primeiro missão própria e adversário correspondente, depois habilidades novas quando custo, tecla, colisão, efeitos e progressão estiverem definidos. Domínio, Maré e Núcleo mantêm seus trajetos e identidades; não presumir múltiplos arquétipos simultâneos.
9. **Nave:** após um ciclo terrestre confiável, vertical slice com interior e voo contínuo aparente entre dois locais, controles acessíveis e recuperação; não trocar a ambição por um teleporte.

## Animações dos arquétipos — na fila, entre as etapas acima

A rodada 0.3.5 não gastou suas duas imagens com personagens porque a prioridade relatada era a integração espacial da Estação Bio; as folhas de arquétipos exigem referência aprovada, grade e alpha conferidos antes de implementar, e não devem ser geradas "no escuro" para justificar a cota. Elas continuam na ordem abaixo e podem retomar a cota de duas imagens por rodada assim que esta base for aprovada pelo jogador.

Por rodada, exatamente duas folhas ou imagens; cada ação/direção deve manter o traje nível 1, identidade, pés, proporção, alpha, grade e ordenação. Integrar e testar somente quadros aprovados; não substituir Q/R já aprovados nem supor que uma pose estática é animação. Os prompts e referências estão em `docs/prompts-sprites-precisao.md`.

1. **Bio-Forja:** ataque básico direcional e caminhada coerente com o traje ativo; conferir os quadros já existentes antes de gerar o que falta. Preservar os valores e o modo rápido de Q.
2. **Domínio:** ataque básico direcional com espada pequena (não o Q pesado); hoje há apenas poses laterais provisórias do traje de nível 1.
3. **Maré:** ataque básico direcional com fita líquida e o traje correto; sem escudo para baixo nem troca de identidade.
4. **Núcleo 10X:** corrida frontal e traseira da Forma Veloz, atualmente ausentes; preservar corrida lateral e ataque aprovados. Depois avaliar as demais lacunas, sem trocar a criatura.
5. Para cada arquétipo, avaliar caminhada/idle em direções faltantes e transições/efeitos de habilidades em folhas separadas, somente depois de validar quais quadros realmente faltam. Novas habilidades exigem definição de input, custo e progressão antes de arte e implementação.

O objetivo final está em `docs/missoes-inimigos-habilidades-e-pets.md` e `docs/roteiro-proximas-etapas.md`. A sequência não significa que todas as peças já existam; cada etapa deve ser aprovada antes de avançar.

## Rodada 0.3.8 — piso e primeira sala

Exatamente duas texturas geradas: piso industrial ortográfico e solo de jardim, aplicadas sobre a máscara caminhável e cacheadas em blocos; sem folhas de animação nesta rodada. O relato visual priorizou a unidade do chão e a escala/oclusão sobre novas poses. Os recortes seguintes devem validar o terminal e o novo piso em jogo, criar uma base de vida/dano/recuperação e telegraph antes de inimigos ou miniboss, e só então retomar as folhas direcionais de ataque e caminhada Bio com referência e quadros validados. A sala de controle e o puzzle R/Q/E são um primeiro recorte funcional, não a missão final nem um interior completo para todas as estruturas.

## Rodada 0.3.9 — retorno visual do jogador

Duas texturas de chão pixel art geradas e integradas; as texturas anteriores foram preservadas como originais. O terminal foi recuado com fundação alinhada à hitbox; a sala ganhou decoração e circuito, e a praia recebeu plataforma de embarque e distinção dos limiares de travessia. São aproximações de código e peças existentes, não uma estação ferroviária final nem revisão de toda a costa. Próximos passos: testar em jogo os recuos, oclusão, legibilidade e desempenho; só depois prosseguir com folha de animação Bio ou peças específicas para a praia e iniciar vida/dano antes de inimigos.

## 0.3.10 — inventário e prompts para produção externa

Nenhuma imagem nova gerada. A prioridade mudou a pedido do criador: `docs/prompts-arquipelago-producao.md` contém instruções exatas e referências, começando por estação da praia e bordas de mar, depois Bio e animações. As folhas de ataque de Domínio e Maré arquivadas não preservam os trajes aprovados e continuam sem uso. A caminhada Bio usa apenas os dois passos laterais da folha já existente, com prioridade de ataque/Q/R; frente e costas ainda não têm ciclo validado. Os limiares das pontes usam identidades procedurais provisórias, alinhadas aos centros lógicos e físicos, com sinalização combinada nas rotas compartilhadas Maré/10X. O mar, plataformas e gates ainda precisam de aprovação em navegador.

## 0.3.11 — folhas recebidas e retorno do jogador

Duas folhas fornecidas pelo criador e já preparadas no PR anterior foram integradas: a caminhada Bio 6×4 (frente, direita, costas e esquerda) e uma luminária da folha modular da estação da praia. A caminhada mede o quadro tratado e normaliza uniformemente a altura visível à direção parada; os pés usam a âncora medida, sem squash entre quadros. Ataque, Q e R mantêm prioridade e os valores das habilidades não foram alterados. O FPS relatado (~30) motivou cache da plataforma estática, mas sua causa e o ganho efetivo ainda precisam ser medidos em jogo.

A areia recebeu veios suaves, o mar bancos submersos discretos e a chegada pequenos agrupamentos sem colisão; não alteramos o mapa, as rotas, gates, spawns ou saves. Isso não transforma a topologia arquipélago existente numa costa continental: uma revisão maior exige redesenho de rotas e testes em saves reais. Fauna continua restrita aos habitats existentes. Os JPGs de ataque foram avaliados mas não integrados: o Bio tem fundos opacos heterogêneos e direções incoerentes nos quadros; o Domínio tem quadriculado pintado, não alpha, e algumas poses trocam de orientação. O ataque já existente permanece, sem afirmar novas animações. A folha de mar contém blocos com faces laterais, não overlays de costa.

Validação automatizada cobre seleção direcional, prioridades, proporção calculada, fauna, rotas, colisões e progressão. O teste visual no navegador e medição real de FPS ainda são necessários para aprovar escala, transparência, oclusão e custo em dispositivo do jogador; não se deve considerar esses aspectos aprovados apenas pelos testes automatizados.

## 0.3.12 — prioridade Bio e leitura da chegada

A pedido do jogador foi gerada **uma única folha** de caminhada (exceção explícita à regra de duas peças): `assets/source-art/bio-caminhada-0312.png`, usando como referência a folha parada original. A geração não seguiu a grade pedida: trouxe oito figuras por linha, três linhas, orientações misturadas e passos pouco variados. `tools/preparar-bio-caminhada-0312.py` recorta explicitamente apenas figuras da orientação correta, retira magenta e cria uma folha RGBA 4×4 para avaliação. Ela preserva melhor a silhueta, tatuagens, desenho do peito e traje da pose original que a folha anterior, mas **não foi integrada**: a variação das passadas é pequena, as laterais repetem a mesma fase e o último quadro esquerdo repete o primeiro. Usá-la seria apresentar poses praticamente estáticas como caminhada. A folha anterior continua no jogo, portanto a divergência de aparência relatada pelo jogador segue pendente. Q, R e ataques não foram alterados.

A praia recebeu ampliação real e limitada de areia na margem da chegada, respeitando as pontes e sem apagar células antigas; acrescentamos marco de cascata e rochas não bloqueantes, padrão de luz no mar raso, uma fachada de túnel atrás do trem e faces de fundação sob a plataforma. O túnel é cenográfico, não uma rota explorável. Pontes, gates, spawns e estrutura dos saves não mudaram; as outras ilhas continuam separadas. É um primeiro redesenho, não a reconstrução integral do panorama de referência. Os testes cobrem habitats, caminhos e travessias, mas alinhamento visual e efeito sobre FPS ainda precisam ser verificados em jogo; o print anterior registrou 38 FPS na Praia Inicial, não prova que o desempenho esteja resolvido.

## 0.3.13 — identidade Bio e composição da estação

A nova tentativa `assets/source-art/bio-caminhada-0313.png`, gerada a partir da folha original, não gerou um ciclo: retornou quatro poses de direções e quatro ações, em vez da grade solicitada. Não foi usada como caminhada. A animação da folha 0.3.11 foi retirada do carregamento: enquanto o traje Bio caminha, o renderer agora usa os próprios pixels direcionais do idle e aplica um movimento procedural discreto na metade inferior e no corpo. Isso preserva rosto e desenho do traje, mas **não é uma folha de passada completa**; partes inferiores são deformadas, não rediagramadas. Precisa de aprovação visual em movimento, especialmente lateral. Ataque, Q e R continuam com prioridade e não tiveram custos, efeitos ou mecânicas alterados.

A fachada do túnel foi reduzida e recuada em direção à traseira do trem, para não atravessar o caminho; continua sendo apenas cenográfica. A plataforma passou de recortes repetitivos e ruidosos para placas industriais alinhadas, incluindo a primeira faixa sob os trilhos, com a fundação preservada. A faixa úmida da praia ficou mais ampla e visível, sem alterar máscara, fauna ou travessias. O cenário geral e sua topologia não foram reconstruídos. A tentativa de validação headless nesta sessão não pôde iniciar o Chromium por falta da biblioteca `libnspr4.so`; geometria, oclusão, aspecto do rig e FPS no dispositivo ainda exigem confirmação em jogo. Os prints recebidos mostram 60 FPS em parte da praia e 36–37 junto à estação; não atribuir a diferença a uma causa nem afirmar ganho sem medição.

## 0.3.14 — correção da perna e estação da praia

O recorte procedural que cisalhava e separava as pernas foi removido. Duas artes novas foram geradas com as poses originais como referência, uma frontal e uma lateral. A frontal gerou oito figuras em duas linhas em vez de quatro numa linha; `tools/preparar-bio-frontal-0314.py` prepara os quatro quadros superiores e o jogo usa somente os dois passos frontais opostos. É um ciclo curto de dois quadros, não uma caminhada perfeita de quatro ou seis fases. A lateral gerou seis poses quase idênticas, sem alternância utilizável; ficou arquivada, sem integração. Costas e laterais usam a pose original sem deformação enquanto se deslocam — sem fingir que isso é um ciclo de caminhada. É necessário criar folhas realmente animadas para elas. A prioridade de ataque, Q e R e suas mecânicas não mudou.

O pórtico cenográfico agora deriva da ponta e do recorte real do trilho em runtime, incluindo posição, escala e inclinação, e fica atrás dele; não é túnel explorável. Os dois pilares grandes foram substituídos por balizadores baixos do mesmo kit, ancorados no piso; a luminária sobreposta ao balizador oeste foi removida. IDs e posição do terminal interativo e suas colisões são preservados. Nenhuma alteração no mar ou no restante da praia nesta rodada.

Validação: testes automatizados de seleção, prioridades, alpha, geometria da ponta do trilho, pontos de apoio e rotas; inspeção de imagens produzidas pelo próprio renderer em canvas nativo, nas vistas da estação e do Bio parado/frontal/lateral. Isso não é um teste de jogo no navegador nem aprovação de animação contínua ou FPS; conferir no dispositivo do jogador.

## 0.3.15 — demais direções Bio e túnel do trem

O jogador aprovou a caminhada frontal de 0.3.14; o PNG e a sequência frontal permanecem idênticos (hash coberto em teste). Foram geradas duas folhas a partir das poses direcionais originais e da frente aprovada: uma lateral e uma de costas. Ambas foram limpas e recortadas por `tools/preparar-bio-andar-0315.py`, usando alpha real e posição de apoio consistente. A lateral tem quatro quadros e é espelhada para a esquerda; a de costas usa três recortes, pois o quarto original está cortado e há divisórias pintadas, repetindo o segundo como passagem. A escala é uniforme e calculada pela altura do quadro em relação à pose parada; não há recorte ou cisalhamento de pernas em runtime. São ciclos curtos e a lateral espelhada não oferece detalhes exclusivos da vista esquerda: conferência em movimento pelo jogador ainda é necessária antes de chamá-los finais. Ataque, dash e diagnóstico seguem prioritários e suas artes/mecânicas não foram substituídas.

O portal cenográfico passou a envolver melhor a traseira do trem: foi ampliado e deslocado sobre o eixo obtido da ponta real do trilho, mantendo-o atrás do material rodante. Plataforma, terminal, colisão, saves e mecânicas não foram alterados; a entrada não é um túnel explorável. Foram inspecionados quadros do renderer em canvas nativo para o trem e todas as novas direções, mas isso não mede FPS nem substitui uma sessão real de jogo. Testes cobrem seleção, prioridade, dimensões/alpha, espelhamento, hash da frente aprovada e o cálculo da âncora.

### 0.3.16 — túnel e Domínio (parcial)
- A entrada da estação ganhou volume cenográfico recuado na direção do eixo do trem; a ancoragem e as regras de colisão não mudaram.
- Domínio: dois passos frontais alternados e quatro quadros de ataque lateral (espelhados para a esquerda), com escala e pivô comuns. Dash, scan e efeitos de habilidade têm prioridade; o ataque mantém os tempos e efeitos existentes. Sem a folha carregada, mantém a seleção anterior.
- **Pendente:** caminhada lateral e de costas e ataque frontal/traseiro. As candidatas laterais repetem a mesma passada e a traseira alterna orientação da cabeça; não foram integradas nem devem ser consideradas prontas. Nas direções sem folha nova permanecem as poses anteriores. O ciclo frontal também tem apenas duas fases distintas.
- Validação: renderização pontual com canvas Node para estação, idle, caminhada frontal e poses laterais de ataque; não substitui teste em navegador nem avaliação da animação em movimento. Caminhada Bio aprovada não foi alterada.

### 0.3.17 — direções restantes do Domínio e alinhamento do túnel
- Ajustadas as alturas do topo da moldura e da abertura do túnel, e a profundidade usa a inclinação do trilho. Apenas desenho: ancoragem, rotas e colisão não mudam.
- Novas folhas para caminhar de costas e para os lados (espelhada à esquerda), e para socar para frente e de costas. O ataque lateral de espada e a caminhada frontal aprovados continuam com seus quadros anteriores; também não há alterações na caminhada Bio.
- As folhas novas são aproximações: na caminhada lateral os quadros 0/2 e 1/3 têm passadas semelhantes, sem alternância clara de pernas; no soco de costas o braço aponta para o lado. Ficam sujeitas à avaliação visual do usuário, não representam animação perfeita comprovada. Escala fixa por folha e apoio comum evitam normalizar a pose pelo tamanho do punho.
- Testes automatizados cobrem seleção por direção e prioridade de habilidades. Capturas individuais verificadas no renderer com canvas Node; ainda é necessário avaliar a animação em movimento no navegador.

### 0.3.18 — Maré Astral e encaixe do túnel
- Integradas folhas de caminhada e ataque básico nas quatro direções do traje Maré de nível 1. As laterais são espelhadas; os ataques usam efeitos ciano desenhados nas poses, sem criar projéteis ou mudar o combate. Escala fixa e eixo da cabeça mantêm o porte e o apoio das folhas originais.
- Q/R, dash, scan e demais efeitos têm prioridade visual; se faltar uma folha, é usado o desenho anterior. As folhas e seleções aprovadas de Bio e Domínio não foram alteradas.
- A caminhada frontal tem dois passos alternados; a lateral alterna duas poses semelhantes e não mostra claramente as duas pernas alternando. A caminhada de costas tem quadros de passada e repouso. No ataque de costas o braço se projeta para o lado; não afirmar que esses movimentos são perfeitos sem avaliação em jogo.
- Túnel deslocado para junto da traseira e baixado até o trilho, com sapata cenográfica de apoio. O ajuste continua relativo ao trilho e não altera a rota, o trem, a colisão nem o save.
- Validação: testes de seleção, prioridades e folhas; capturas pontuais do renderer via canvas Node. Ainda é necessária a avaliação das animações em movimento e do encaixe do túnel no navegador.

### 0.3.19 — apoio Maré, túnel e estudo da Forma Veloz
- O idle do traje Maré foi baixado três unidades de tela ao equipar; folhas de caminhada e ataques aprovadas não foram alteradas. Verificar visualmente as transições em jogo.
- O pórtico do túnel foi elevado a partir da mesma base e sua profundidade acompanha o eixo 2:1 do deck, não apenas o skew adicional do sprite do trilho. É cenográfico; posição do trem, colisões, rotas e saves não foram alterados.
- A interface de seleção e transformação, os ataques e a corrida lateral já existentes da Forma Veloz permanecem intactos. O trabalho de corrida frontal e traseira **não está concluído**: as candidatas em `assets/source-art/veloz-corrida-frente-c-0319.png` e `assets/source-art/veloz-costas-b-0319.png` não mostram ciclo completo fiel (patas semelhantes, postura traseira inconsistente). Não foram integradas. Não se deve apresentar quadros de ação ou poses estáticas como corrida pronta.
- 39 testes passaram; capturas pontuais do renderer de estação e idle Maré verificadas com canvas Node, sem validação de movimento no navegador.

### 0.3.20 — pulso da Forma Veloz e apoio
- Corrigido o pivô vertical da pose sustentada da Forma Veloz, sem alterar o sprite ou os ataques básicos aprovados. Ao usar Q já transformado, o render usa poses existentes da criatura e rastros verdes; laterais usam a fileira de deslocamento rápido, frente/costas usam duas poses direcionais existentes. Q rápido sem transformação e a interface própria permanecem intactos. Isso é uma composição visual, não uma folha inédita de Q, nem altera custo, distância, recarga ou colisão.
- Ajustada a base e a profundidade do túnel, com a entrada ligeiramente mais baixa em relação ao trilho. Sem mudanças no trem, rotas ou gates.
- **Ainda pendente:** corrida frontal e traseira da Forma Veloz. As novas tentativas não produziram ciclos fiéis de pernas alternadas; não foram integradas para evitar substituir a criatura por poses falsas ou deformadas. A corrida lateral e os ataques continuam os aprovados.
- 39 testes passaram; capturas pontuais de túnel, idle e pulso em canvas Node foram verificadas. Ainda é necessário testar as transições em movimento no navegador.

### 0.3.21 — tentativa de corrida e ajuste de apoio
- A face do túnel foi alinhada ao eixo transversal isométrico do piso, com base refeita para acompanhar os cantos da fachada; a profundidade continua na direção do trilho. São ajustes cenográficos, sem mudar trem, plataforma ou colisões.
- A pose sustentada da Forma Veloz foi deslocada horizontalmente para aproximar o corpo do centro da sombra; a altura da pose da 0.3.20 foi preservada. O Q transformado e os ataques básicos aprovados não foram modificados.
- **Corrida frontal e traseira continuam pendentes.** Novas gerações repetiram poses de ataque/repouso, ângulos errados ou membros sem alternância; não foram integradas. A interface, transformação e corrida lateral existentes permanecem iguais. Não considerar este estudo uma corrida completa.
- Capturas pontuais de estação e idle verificadas no renderer via canvas Node; ainda falta avaliação em navegador e em movimento.

## Justificativa da fila

A Estação Bio (0.3.5 e 0.3.6) foi priorizada para consolidar o ciclo terrestre
(piso, canais, rede, missão inicial e rota desenhada) antes de retomar as
animações dos arquétipos e o Bolt. A ordem de prioridade (Saguão → Arquétipos →
Bio-Forja → Bolt) é mantida.
