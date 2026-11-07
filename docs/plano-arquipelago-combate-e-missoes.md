# Rotas Perdidas — visão por etapas

## Estado real desta fatia

Jogáveis: Praia Inicial, Enseada dos Ecos, rotas e estações existentes. O ataque básico por clique é um protótipo: efeito procedural dependente do arquétipo, mira na posição do clique, recarga, alcance e colisão; o Eco de Treino na Enseada se recompõe e não dá dano ao jogador, XP ou itens. Não é um monstro, não afeta a fauna e não é salvo. Os números são provisórios. A aparência não é animação final. A forma veloz sustentada do Núcleo recebe um efeito adicional; trajes e formas continuarão precisando de ataques específicos.

O Diário de Rotas (J) consulta a missão principal existente e os vestígios opcionais da Enseada; não cria outra missão ativa nem regrava saves. A missão atual, flags, gates e metró continuam sendo as fontes de verdade. Shift + clique move; clique esquerdo ataca; botão direito arrastado move a câmera. Os controles podem ser reavaliados após teste.

## Um arquipélago, cinco camadas

Estas camadas são **planejadas**, não portais, mapas ou sistemas prontos. A ilha é compartilhada e o jogador mantém um único arquétipo. Cada expansão precisa de pontos de entrada/retorno coerentes, escala, colisão e salvamento antes de abrir ao jogador.

| Camada | Direção e conexão proposta | Primeira fatia futura |
| --- | --- | --- |
| Superfície | Praia → enseada → manguezal/floresta → montanhas, cavernas e ruínas; Ilha da Caveira reinterpretada como lugar original, com seu próprio passado dimensional. | Mata costeira conectada à Enseada, trilha de retorno, marcos, fauna, um naufrágio investigável e alternativas para os quatro módulos. |
| Céu | Correntes de vento e ruínas acima das nuvens, ilhas e templos ligados por passagens partidas. Subida por estrutura ou rota justificada. | Uma plataforma celeste pequena, chegada e retorno seguros; vento primeiro como risco/indicação legível, sem exigir arquétipo específico para a rota principal. |
| Subsolo | Entradas em montanhas/ruínas levam a túneis e instalações de Eco enterradas. | Uma câmara subterrânea com duas saídas, luz e leitura de navegação, depois máquinas e criaturas. |
| Mar | Recifes, fauna, naufrágios e portais afundados vistos da superfície; travessia por uma solução ainda a definir. | Litoral com recife navegável visualmente e naufrágio acessível por caminho explícito, não prometer natação antes do sistema existir. |
| Fundo do mar | Cidade submersa, ruínas de pressão e reino abissal originais, com humor próprio e inspiração ampla em cidades submarinas, sem copiar personagens ou elementos protegidos. | Câmara submersa acessível via Maré Astral **ou equipamento adequado**. A rota principal sempre oferece alternativa obtível para os demais arquétipos; pressão e oxigênio precisam de projeto, HUD e testes antes de uso. |

Conectar por mapas carregáveis com ID, entrada e retorno; separar representação visual, máscara de navegação, profundidade, água e limites de câmera. Uma panorâmica é referência, não geometria transitável. Não registrar destinos que não existem. Testar mapas em saves antigos, nas quatro rotas, e o tempo de carregamento antes de crescer.

## Missões e multiverso

- **Principal**: um fio narrativo claro orienta o progresso sem impedir exploração opcional. A Calibração e o Embarque existentes não devem ser substituídos por missões experimentais.
- **Secundárias**: descobertas locais, personagens e histórias com começo, estado e conclusão independentes da principal. Os vestígios já existentes são a primeira consulta opcional, ainda não uma cadeia de missões completa.
- **Dimensões e modos**: um futuro catálogo pode distinguir região disponível, pista, bloqueada e modo alternativo. Atividades inspiradas em gêneros clássicos podem ter regras próprias e entrada explícita; personagens, nomes e cenários de franquias existentes exigem direitos. Para uma dimensão com humor de ficção científica, criar mundo, personagens e identidade originais, em vez de presumir uma licença.
- Futuro esquema: IDs estáveis, categoria, objetivos, requisitos, recompensas, estados (disponível/ativa/concluída), histórico e migração idempotente. Definir limites de missões simultâneas e prioridades de HUD; oferecer busca/filtros e acessibilidade. Nenhum desses sistemas é entregue apenas pelo diário de leitura.

## Encontros e população — próximo projeto, não ativado

1. Separar fauna neutra, defensiva e hostil; fuga da fauna não deve virar agressão aleatória. Definir território, aviso legível, distância de percepção, volta ao território e pausas. Não fazer inimigos surgirem sobre o jogador, portais, pontes, vestígios ou objetivos; respeitar máscara e objetos sólidos.
2. Um orçamento por região e pontos de encontro fixos/validados primeiro; depois spawn condicionado por estado, distância, tempo, limite e semente. Persistência/respawn precisam ser definidos antes de recompensas. Nenhuma criatura real nesta entrega.
3. Planejar vida do jogador, dano, invulnerabilidade temporária, recuperação, morte/retorno, telegráficos, esquiva e acessibilidade. Testar combate em tela cheia, menus, interações, Q/R, T e transformação; não inventar recompensas no save.
4. Os arquétipos podem ter ataque básico adaptado ao traje/ferramenta e à forma sustentada; manter Q e R, quatro habilidades evolutivas e Ultimate no nível 1. Não transformar sem escolha. Testar diferenças de alcance, tempo e custos para uso rápido versus forma sustentada antes de balancear; não alterar Bio-Forja aprovada inadvertidamente.
5. Rival dimensional como arco progressivo e pistas, não spawn aleatório hostil. Bolt poderá farejar/reagir com limites, sem assumir controle nem virar requisito de acesso.

## Prompts para novas folhas de sprites

**Requisitos comuns:** pixel art isométrica original, luz e escala consistentes com o jogo, PNG com canal alpha real (não quadriculado desenhado), uma única ação por folha, sem texto/grade/marca d'água, quadros em células iguais, corpo inteiro e pés na mesma posição em todos os quadros, sem sobreposição entre células. Arquivos de roupa civil, traje nível 1 e forma sustentada devem ser separados. Entregar atlas com dimensões explícitas, ordem e pivô; nunca fundir obstáculo interativo ao cenário. Testar alpha e bordas antes de importar. Use direções frente/baixo, direita, esquerda e costas/cima com a mesma câmera; se oito direções forem necessárias, produzir folhas adicionais, não espremer quadros.

### Ataque básico — uma folha por arquétipo, por traje e por direção

Em cada prompt: **8 quadros**: 1 postura de prontidão, 2 antecipação, 3–5 execução legível, 6 impacto, 7–8 recuperação até a postura inicial; sem deslocar os pés ou cortar arma/efeito. Incluir versão civil e versão equipada em folhas separadas. As animações de caminhada ainda não foram entregues.

- **Motor Bio-Forja**: operador humano fiel ao traje nível 1 já aprovado; golpe básico com ferramenta mecânica compacta integrada ao braço, antecipação com pistões, impacto curto e faíscas âmbar controladas, sem confundir com dash Q. Versão civil com ferramenta portátil coerente; na versão tática o dispositivo se integra à armadura. Arma, faíscas e corpo não invadem célula vizinha.
- **Domínio Ancião**: guerreiro imponente e fiel ao traje nível 1; ataque básico com **espada pequena**, guarda firme, corte concentrado e rastro dourado sutil, sem usar punhos ou substituir o Q pesado. Espada visível nas quatro direções, inclusive costas, com mão e lâmina coerentes; versão civil usa arma compacta equivalente.
- **Maré Astral**: operador fiel ao traje nível 1, gesto de ataque curto com fita líquida fluida, gotas discretas e brilho turquesa; manter o personagem visível em todas as direções, sem escudo indevido e sem confundir com a arrancada Q. Na roupa civil, água menor e legível.
- **Núcleo 10X**: operador nível 1 com pulso cinético verde contido; para forma veloz sustentada criar folha própria com corpo da forma, garras/golpe rápido e rastros curtos, mantendo a silhueta legível. Na forma civil, gesto de pulso através do núcleo; sem mostrar múltiplas formas desbloqueadas. Ataque básico não é a transformação Q.

### Cenário e povoamento

- **Costa modular**: areia seca/úmida, água rasa e profunda, oito margens/cantos com encaixe exato, espuma e pedras de costa separadas; tamanhos, pivôs e regras de borda documentados, sem sombras de tabuleiro. Vegetação, tronco e copa em camadas independentes para transparência atrás do jogador. Rocha/cachoeira em camadas com água animada separada.
- **Estação costeira**: kit modular isométrico para plataforma elevada, bordas, pilares, acesso e trilhos compatíveis com o trem existente; trilhos fora da areia caminhável. PNGs individuais com bases/pivôs e nenhuma parede ou portal embutido no chão.
- **Floresta, montanhas e subsolo**: solo repetível, raízes, troncos, copas, escarpas, entradas e arcos em peças individuais, máscara de colisão sugerida; passagens largas e sem fundo pintado. Ruínas de Eco em estados intacto/danificado, efeitos isolados.
- **Céu e mar**: ilhas suspensas com fundo/copa separados, correntes de vento em frames com alpha, pontes quebradas e templos; recifes, naufrágios, portal submerso e água em camadas de frente/trás; fundo do mar com corais e ruínas de pressão. Cada bioma em folha separada.
- **Fauna e inimigos**: uma espécie por folha, idle, andar, fuga e aviso separados, mesmas âncoras; para criaturas hostis originais incluir telegráfico, ataque, reação ao golpe e recuo, nunca animar ataque sem aviso. Fauna neutra não precisa de pose de combate. Fornecer silhueta e identificação visual diferentes para criaturas e alvos de treino.
