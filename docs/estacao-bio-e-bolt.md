# Estação Bio e Bolt — primeiro recorte jogável

## Estação que Respira

O setor é um ** protótipo explorável 72 × 72**, conectado à Praia Inicial depois do diagnóstico e reconstrução do teleférico Bio-Forja. O zoom mínimo é maior só nessa área; volta ao padrão nos demais mapas. Há pátios, dois canais de água com uma travessia estreita e uma passagem de terra por trecho, dois simuladores de treino, os três coletáveis antigos em sequência (condutor → regulador → estufa), a sequência opcional de reparos e o caminho de volta. A missão principal e outros arquétipos não são substituídos.

**Estado em 0.3.5:** as duas pontes deixaram de ser a mesma imagem reutilizada na camada de fundo. Cada travessia agora é um **deck de células caminháveis sobre a água** (`B`/`b` na máscara), com tabuleiro, faces laterais, longarinas e guarda-corpos desenhados por trecho com profundidade `x + y` real; quatro cabeceiras geradas apoiam as margens. Terminal, biorreator e estufa são desenhados em faixas horizontais com profundidades próprias (`depthLayers`), e a hitbox do terminal foi medida pelo PNG e conferida por vários lados. As estruturas grandes têm avental de piso e sombra de apoio. Uma rede de conduítes no piso liga condutor, regulador, biorreator, ponte e estufa, e muda de cor conforme os reparos; três distribuidores de pressão ancoram os nós.

**Não confundir com o objetivo final:** a arte `assets/concepts/bio-forja-missao-mapa.png` é um conceito e **não** é a geometria do mapa. As peças são interpretações, não cortes literais do mapa. A separação por faixas é real no desenho, mas ainda não é profundidade por pixel; os canais continuam retos, a ilha tem borda retangular e faltam transições com a areia, variedade de cenário, escala fina e caminhos que reproduzam a ambição do conceito. Não há monstros agressivos, chefes, puzzles de habilidade completos, sons, HUD de vida ou cenário final; os alvos são inofensivos. O zoom limitado não garante que toda a área fique visível em qualquer resolução: testar em diversos tamanhos de tela. Não usar essa malha como mapa final aprovado.

## Bolt

Uma pose inicial de Bolt foi gerada a partir das fotos fornecidas: border collie blue merle, peito e faixa brancos, expressão amigável. A arte foi limpa de fundo e é exibida como **uma única pose provisória**, com espelhamento lateral e leve movimento procedural. Não é uma folha direcional nem animação real de caminhada. As fotografias não foram adicionadas ao repositório; a imagem gerada é uma interpretação e precisa de avaliação do tutor.

No diário **J**, "TESTAR BOLT NESTE SAVE" ativa a prévia local e salva a seleção. Após obter Lúmeo, "ACOMPANHAR COM LÚMEO" permite voltar a ele sem apagar nenhum vínculo. Não há autenticação de conta neste jogo local; o botão é explícito mas **não protege acesso exclusivo** ao Bolt. Definir autorização real antes de qualquer distribuição ou multiplayer. Bolt não é concedido automaticamente, não substitui a missão nem o Lúmeo.

Cada pet selecionado recebe dados aditivos `level: 1`, `xp: 0`, `inventory: []` e `skills: {}` próprios no progresso. O diário mostra nível, XP e contagem de itens. Isso é uma **fundação**, não uma árvore interativa, progressão de XP, inventário manipulável ou equipamento; nenhum bônus ou habilidade é aplicado. Preserva o array de itens do jogador e a flag antiga do Lúmeo. Ainda falta menu de pets acessível completo, regras de desbloqueio, migrações versionadas, atividades e recompensas.

## Próximas entregas recomendadas

1. Aprovar a aparência do Bolt e gerar folhas separadas de idle/caminhada, quatro direções, brincar, esperar e comer com transparência real e proporções fixas. Trocar a pose provisória por animações reais, sem distorção.
2. Fazer missão pessoal memorável e autorizada para Bolt; criar interação, escolha, exploração e vínculo sem liberar a identidade a todos automaticamente. Evoluir Lúmeo mantendo saves antigos.
3. Finalizar base de vida e adversários telegrafados antes de colocar monstros ou minibosses no mapa; só depois integrar recompensas, XP e equipamentos de pet. Ainda não existem ataques de inimigos, HUD de vida nem morte/respawn.
4. Converter o conceito Bio em tiles/camadas com arte consistente: os decks, canais, colisões medidas, camadas por faixa e a rede já existem e foram testados; falta refinar bordas/transições, profundidade por pixel, puzzles que usem R e Q de fato e transformar o esboço de três pontos numa missão dramática real.
5. Criar uma habilidade adicional por arquétipo somente com input, custo, cooldown, arte, colisão, travas e testes definidos; não inventar slots extras ou alterar Q/R já aprovados. As ideias e prompts estão em `docs/missoes-inimigos-habilidades-e-pets.md`.

## Prioridades de arte

O planejamento de peças e folhas, com limite de duas por rodada, está em `docs/ordem-de-arte-e-implementacao.md`.

## Conferir a versão após importar

O print relatado mostrava um portal genérico e 122 objetos, enquanto a revisão posterior ao PR #25 já não tinha esse portal e registrava 64 objetos. Isso indica versões diferentes, mas não identifica se a origem foi importação, pasta, servidor ou cache. A versão desta rodada mostra `BASE V0.3.5-bio` no HUD: terminal na chegada, um único biorreator no pátio, estufa, dois decks de ponte sobre os canais, cabeceiras, distribuidores, rede de pressão, piso modular, detalhes industriais, margens e plataforma técnica. A versão no HUD não comprova, sozinha, que todos os arquivos vieram da mesma revisão.

Confira se a cópia executada inclui o merge do PR #25 e esta atualização, incluindo `js/data/worlds/arquipelago-rotas-perdidas/estacao-bio.js` e os PNGs em `assets/sprites/estacao-bio/`, incluindo a folha de piso, detalhes, margens e plataforma técnica. Sirva a pasta correta e faça recarga forçada (Ctrl+Shift+R). Se aparecer aviso de arte ausente, reimporte o projeto completo. Se persistir, informe a versão do HUD e envie outro print. Não é necessário limpar armazenamento local, trocar a origem/endereço do jogo ou apagar saves; mudar origem pode fazer saves existentes deixarem de aparecer no navegador.

Na revisão 0.3.3, o terminal e a estufa receberam mais escala, piso de apoio e ajuste de profundidade; o ponto do print ao lado do terminal entrou nos testes. Em 0.3.5 esse `depthOffset` único foi substituído por faixas com profundidade própria, mas a separação ainda não é por pixel: é uma aproximação por camadas horizontais, não uma solução completa de oclusão. A plataforma continua sendo um objeto sólido e fechado, não uma superfície caminhável.

## Reparo Bio opcional (0.3.4, preservado)

Na chegada, aproxime-se do condutor danificado, use **R** para diagnosticar e **E** para reconstruir. Em seguida faça o mesmo com o regulador no pátio. O regulador exige o reparo do condutor, inclusive para o diagnóstico; ambos mantêm a colisão e mudam para arte restaurada. As flags são salvas e reaplicadas ao entrar no mapa. A sequência é independente dos três coletáveis antigos: saves que já os concluíram continuam válidos e ainda podem fazer os reparos. Não há recompensa nem animação de reparo.

## Consequência da Bio-Forja (0.3.5)

Os dois reparos agora têm efeito perceptível: a rede de conduítes e os nós passam de metal frio para um traço ciano energizado, sem conceder item, habilidade, XP ou recompensa. Com a linha ativa, o distribuidor em frente à estufa pode ser diagnosticado com **R** e aberto com **E** ("fluxo parcial"). A válvula e a estufa ficam mais claras, a rede pulsa e o diálogo diz explicitamente que o núcleo ainda exige reconstrução mais profunda: **o setor não é declarado completo**. O passo exige Bio-Forja, diagnóstico prévio e o regulador reparado; a flag `gate_bio_valvula_estufa` sobrevive à reentrada. Saves que já concluíram os reparos desbloqueiam o passo sem migração, e as flags `collected_*` antigas não são alteradas. Ainda não há ativação real de cultivo, puzzle de Q/R, recompensa, inimigos ou miniboss.

Validação desta rodada: `tests/estacao-bio.mjs` (geometria, decks, camadas, colisões, rede e arte), `tests/bio-integracao.mjs` (R/E, persistência, saves antigos, ausência de recompensa), todos os demais `tests/*.mjs`, e Chromium headless com capturas em vários pontos, travessia de ida e volta pelos dois decks, água bloqueada, sequência R/E com `localStorage` real e nenhum erro de console. Não houve teste com movimentação humana prolongada nem aprovação visual do jogador ainda.

## Ajustes de código 0.3.7-bio

Sem gerar imagens: a ponte agora coloca os postes exatamente nas bordas do deck, sem o deslocamento de meio tile anterior. Vegetação procedural deixa de nascer na água; o cano decorativo que estava dentro da base da estufa foi deslocado para fora. O marco de chegada saiu de cima do embarque. As estruturas grandes e suas hitboxes não foram redesenhadas: sua escala e oclusão ainda precisam de conferência visual em jogo.

A viagem continua usando a mesma flag e os mesmos destinos/spawns, mas agora tem plataformas procedurais sinalizadas nos dois extremos. Na praia, repare o condutor na travessia e siga até a plataforma de embarque; com o sistema desligado ela informa o que falta. Na estação, a plataforma permite o retorno. É uma representação estática do teleférico com transição entre mapas, não uma viagem animada nem um cabo contínuo entre mapas. Saves anteriores mantêm o acesso.

Para reduzir trabalho por quadro, o piso industrial estático é cacheado em blocos visíveis e reconstruído se a imagem do piso mudar; a rede não recalcula um recorte de todo o terreno, pois todos os trechos são validados sobre terra ou deck. A criação inicial de texturas de mar/areia e dos blocos ainda pode causar uma pausa, e o ganho real de FPS depende do navegador e hardware: falta medição em jogo. O cache de blocos tem custo de memória, limitado ao mapa carregado e aos blocos visitados.

Validação automatizada: `tests/bio-ajustes.mjs` verifica bordas das pontes, vegetação, trajetos completos da rede, plataformas, prompts e spawns. Os demais testes existentes foram executados. Não houve medição de FPS nem captura ou revisão visual em navegador nesta rodada; é necessário jogar o percurso completo e conferir proporções, oclusão e desempenho em resoluções diferentes antes de considerar o mapa aprovado.
