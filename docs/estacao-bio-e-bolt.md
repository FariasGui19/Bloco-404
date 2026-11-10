# Estação Bio e Bolt — Estado V0.3.6-bio

## Versão
- HUD/Menu: `V0.3.6-bio` (config.js)
- Mapa: 72×72 (estacao-bio.js)
- Objetos: 126 (124 decorativos, 2 portais/coletáveis, 30 testes OK)

## Estado da Estação Bio
- Canais: faixas retas com bordas de pedra rente ao solo (margens baixas, 32 instâncias, profundidade negativa).
- Decks: B (24-27,19-20) e b (45-46,38-41) com tábuas, longarinas, treliças, rebites e encontros baixos.
- Rede de pressão: conduítes (6/3.5/1.2 px), nós (condutor, regulador, válvula), rota da primeira missão (16 pontos, 4 estágios).
- Máquinas: terminal (7² hitbox), reator, estufa (filtro, sombra), plataforma, módulos (floreira, tubo, caixa, luminária).
- Fundações: 9 placas baixas sob as máquinas (escala proporcional, profundidade negativa, sem colisão).
- Reparos: condutor (18,14), regulador (39,21), válvula (55,53) — R→E, diagnóstico, fluxo parcial, sem recompensa, sem item.
- Coletáveis: preservados (condutor, regulador, estufa) com flags `collected_*`.
- Portal: volta à praia (leitura registrada se a missão for concluída).
- Arte: 4 imagens estáticas (cabeceira, distribuidor, margem baixa, fundação).
- Documentação: ordem de arte (exatamente duas por rodada), roteiro, estado.
- Testes: 30/30 OK (incluindo navegação, R/E, diário, portal).
- Navegador: capturas v36-*.png (livre:true, versão V0.3.6-bio, ERROS []).

## Bolt (cachorro real)
- Pose provisória com espelhamento e movimento procedural (não folha animada).
- Prévia opt-in no diário (não concedida automaticamente).
- Obtenção pessoal, autorização, animações e progressão real ainda por definir.

## Limitações
- Primeira missão visual/mecanicamente pronta (ilha compartilhada, áreas exploráveis, puzzles, minibosses, pets — próximos passos).
- Viagem espacial/galáctica (nave, interior, melhorias) — vertical slice futura.
- Não gerar terceira imagem na rodada 0.3.6.
- Não declarar sistema completo, não conceder recompensa.

<<<<<<< HEAD
## Base
- BASE V0.3.6-bio
- Commit atual: arena/e9de45fa-bloco-404
- PR #30 mesclada (0.3.5-bio)
=======
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

## 0.3.8-bio — complexo, solo e sala de controle

As capturas de 0.3.7 mostram a base do terminal cobrindo indevidamente o personagem e grandes áreas de areia, além de máquinas com pouco apoio visual. O terminal foi ampliado de 460 para 520 px, sua pegada sólida foi ampliada, e ele passou a ser ordenado como peça única atrás do jogador que chega pela frente. Isso elimina o recorte horizontal observado, mas não cria profundidade por pixel: laterais e traseira ainda precisam de inspeção visual. O biorreator e seu pátio foram ampliados, as cabeceiras reduzidas, as sucatas de praia removidas e a vegetação isolada reduzida. As duas novas imagens são texturas ortográficas de piso industrial e solo coberto de musgo; aplicadas em coordenadas de mundo e cacheadas em blocos, cobrem o solo caminhável, preservando água e decks. Não são uma reconstrução final das margens ou das estruturas.

O marcador CONTROLE leva ao primeiro interior, sem fingir que o sprite do terminal é caminhável. No interior, um registro explica a sequência: consertar condutor e regulador, abrir fluxo parcial da estufa, diagnosticar a placa com R, atravessá-la com Q e sincronizar o painel com E. A placa só reconhece o deslocamento real do impulso e os pré-requisitos; as flags sobrevivem à reentrada. O diário acompanha a etapa sem substituir a missão principal. A porta de saída retorna ao terminal. Não há recompensa, conclusão total, inimigos ou miniboss; aqueles exigem vida do jogador, dano, sinalização e recuperação testados antes de aparecerem. As animações direcionais de Bio não foram substituídas nesta rodada; as duas imagens foram priorizadas para o solo relatado nas capturas.

O interior é um protótipo separado, não a geometria interna literal do prédio. Novas texturas e tamanho/oclusão precisam de avaliação em navegador, incluindo emendas dos blocos, desempenho, entrada, saída e várias resoluções. Não foi feita captura nem medida de FPS nesta rodada. A transição ainda não é uma animação de abertura de porta. Os sprites gerados de solo ficam em `assets/source-art/estacao-bio/piso-bio-08.png` e `piso-bio-jardim-08.png`.

## 0.3.9-bio — retorno dos testes e polimento

A partir das capturas e do relato de FPS estável, o terminal foi recuado de (12,8) para (14,11). Sua fundação procedural segue os mesmos limites da hitbox e fica inteiramente sobre solo; o embarque e a entrada da sala também foram reposicionados, preservando os nomes dos spawns e as flags existentes. A fachada continua sendo uma peça única de profundidade aproximada: a base e as laterais devem ser verificadas novamente em jogo.

Duas texturas novas em linguagem pixel art substituem as texturas de solo e piso da versão anterior, mantendo o cache por blocos e a máscara de água/decks. A sala de controle recebeu conduítes, peças existentes e uma marca de saída, sem alterar a sequência R/Q/E. Na praia há uma plataforma procedural sob o trem e uma faixa de segurança, com sinalização e objetos existentes; a faixa dos trilhos continua bloqueada. Os limiares de travessia receberam símbolos distintos, sem alterar hitboxes ou regras de arquétipo.

Os testes automatizados verificam a fundação sobre terra, spawns e acessos, máscara da plataforma, puzzle e persistência; nenhuma medição nova de FPS ou validação visual em navegador foi feita nesta rodada. As duas imagens geradas são `assets/source-art/estacao-bio/piso-pixel-09.png` e `jardim-pixel-09.png`. A costa do setor Bio ainda é retangular, a sala e a estação ferroviária são protótipos, e a integração estética, bordas das texturas e enquadramento precisam de aprovação no jogo. Não foram implementados inimigos, miniboss, novas animações ou novos interiores nesta rodada.
>>>>>>> e5736762ec637ebe671540515d65b30b7c6323f4
