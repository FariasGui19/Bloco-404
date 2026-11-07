# Arquipélago vivo — direção e próximos passos

Documento de direção, não sistemas já implementados. A ilha é compartilhada: o jogador escolhe um único arquétipo; cada região deve ter uma solução viável por arquétipo, sem conceder módulos extras nem depender do futuro morfador mestre. Preservar os saves, a praia já aprovada, o retorno pelo metrô e o R → E do teleférico Bio.

## Praias, florestas e vida própria

Planejar uma costa extensa com enseadas, manguezais, dunas, estuários, ruínas e falésias conectando à floresta costeira. Trabalhar em regiões interligadas/carregáveis, não um PNG ou mapa monolítico gigante. Primeira fatia: expandir uma enseada adjacente, criar um caminho de cada arquétipo e o retorno; depois testar escala, navegação, desempenho e memória antes de crescer. Repetição de tiles com variação, sementes estáveis, camadas, transições e pontos de referência evita repetição e permite saves pequenos.

Fauna: caranguejos perto da água que recuam diante do jogador; aves pousam, procuram alimento e levantam voo; peixes e cardumes próximos ao raso; pequenos mamíferos na borda da mata. Cada espécie precisa de rotina simples (hora, habitat, pontos de interesse, repouso/fuga), animações e orçamento máximo por região. A simulação distante pode ser resumida; não criar centenas de agentes ativos. Vida selvagem não é automaticamente inimiga. Futuramente Bolt pode farejar rastros e reagir a fauna sem substituir a escolha do jogador.

Floresta: bordas ensolaradas, sub-bosque, dossel em camadas, raízes e árvores que revelem o personagem quando atrás delas, riachos e clareiras. Trilhas alternativas devem ser legíveis, com colisão e profundidade coerentes. Planejar clima, dia/noite, som ambiente e eventos como sistemas separados; nenhuma promessa de implementação imediata.

## Prompts visuais — fundos e peças

Para todos: arte original, pixel art isométrica compatível com Bloco 404, câmera e iluminação consistentes, sem personagens, texto, grade, marca d'água, logotipos, trilho no meio da areia, ou transparência quadriculada simulada. Gerar objetos jogáveis em PNG com alpha real, recortados individualmente; definir resolução e escala após validação. As peças de gameplay precisam de colisão e estados próprios: nunca incorporar visual de obstáculo interativo definitivamente no fundo.

**Praia ampliada — referência panorâmica:**
> Enseada tropical gigantesca e acolhedora vista em perspectiva isométrica de jogo de exploração, areia quente com pegadas discretas, transições orgânicas entre areia úmida e seca, ondas translúcidas com espuma fina, água rasa verde-azulada que gradualmente revela o mar profundo, rochas vulcânicas e vegetação costeira, palmeiras de silhuetas variadas, ilhotas e falésias no horizonte, luz dourada suave, áreas amplas de leitura limpa para o jogador. Atmosfera viva, misteriosa e habitável, sem vazio azul, com estrutura clara para caminhos exploráveis.

**Kit modular da praia:**
> Conjunto de peças independentes para jogo isométrico: areia seca, molhada, margens curvas, cantos internos e externos, pedras costeiras, poças, dunas, raízes e transições naturais para grama e mata. Variação controlada, mesma luz e paleta, fundo transparente real, sem sombras de tabuleiro ou cenário completo. Separar bordas e sobreposições, evitar emendas quadradas óbvias.

**Floresta costeira:**
> Floresta tropical costeira isométrica original, árvores de portes variados, raízes, bromélias, cipós, samambaias, clareiras e córregos, contraste entre solo caminhável legível e massa de vegetação, camadas separadas de solo, troncos, copas e atmosfera. Criar peças repetíveis e copas transparentes independentes para ocultação dinâmica do jogador.

**Fauna modular:**
> Sprites individuais de caranguejo costeiro, ave marinha, cardume e pequeno mamífero de mata atlântica estilizado; comportamento natural e proporção legível em escala de jogo, visão isométrica coerente, PNG alpha real. Para cada espécie entregar quadros separados de parado, locomoção e fuga, mesmos pés e dimensões entre quadros. Uma espécie por folha, sem fundo ou texto.

## Salas de missão — prompts para camadas de cenário

As câmaras existentes são protótipos com mesmo layout; aprofundar rotas, puzzles, NPCs e ambientação sem alterar flags de progresso anteriores. Nenhum NPC hostil nem combate foi implementado nesta etapa. Para tutorial futuro, apresentar um simulador ou eco instável com alvo claramente telegráfico, opção de segurança e recompensa pequena; clique esquerdo deverá atacar quando o combate existir e o movimento por clique terá outro comando, ainda a decidir.

**Bio-Forja — oficina de carga:**
> Aeroporto industrial abandonado, oficina de carga com esteiras, cabos partidos, portões de impulso e consoles de manutenção. Tubulações ciano, placas gastas, materiais metálicos, luz de emergência e rotas legíveis. Camadas separadas: piso repetível, paredes, maquinário e obstáculo de impulso. Sugerir uma área segura para treino de reconstrução, sem incluir NPC ou texto.

**Domínio Ancião — câmara de frequência:**
> Galeria do aeroporto com monólitos escuros rachados, anéis rúnicos dourados e estruturas industriais em ressonância. Passagem obstruída por um lacre realmente quebrável, sinais graduais de tensão e detritos separados para o estado destruído. Tons âmbar, silhueta forte e espaço seguro para tutorial de impacto. Camadas e objeto interativo separados.

**Maré Astral — câmara de fluxo:**
> Canal de recirculação isométrico sob o aeroporto, piso industrial úmido, água rasa visível, canos e eclusas, reflexos azul-ciano e pequenos organismos luminosos. Uma cortina de corrente ocupa o corredor e permanece no lugar enquanto o operador se desloca através dela. Camadas de água, primeiro plano e barreira separados; estado temporário de redirecionamento, não destroços.

**Núcleo 10X — câmara cinética:**
> Laboratório dimensional industrial isométrico com malha de energia verde e âmbar, painéis danificados, indicadores de velocidade abstratos e anéis holográficos parcialmente apagados. Criar em sprite separado uma passagem estreita ou malha que indique a necessidade de assumir uma forma ágil; estado atravessado não destrói a estrutura. Sugerir pistas ambientais sobre outras formas sem mostrá-las como desbloqueadas.

## Backgrounds prontos: onde servem

Imagens completas podem servir para **horizonte distante, céu, mar afastado, interior fora da área caminhável, telas de apresentação e referência artística**. Para áreas exploráveis, prefira solo em tiles e props separados: um fundo único não oferece colisão, ordenação atrás/à frente do jogador, interação, parallax ou estados. Para cenas prontas utilizáveis, separar fundo distante, camada navegável e primeiro plano, alinhar à mesma projeção isométrica e estabelecer mapa de colisão independente; testar profundidade e transparência. Não substituir a praia aprovada inteira por uma imagem achatada. Autorizar uso apenas de imagens com direitos compatíveis; guardar fontes, licença, resolução e transformações no repositório.

## Núcleo 10X — proposta de interface e regras abertas

T abriria uma roda circular original, com forma veloz já disponível e espaços futuros bloqueados. Seleção por teclado/controle/mouse ainda precisa ser decidida; confirmar/cancelar sem acionar o combate nem movimento. A roda deve respeitar diálogo, menus, dash e acessibilidade (indicadores além de cor). Não mudar automaticamente o arquétipo. Separar estado selecionado, forma ativa, duração e recarga do save; migrar sem inventar desbloqueios.

Q rápido: transição curta, executa o movimento e retorna; forma sustentada: ativação e saída explícitas, com acesso ao conjunto adaptado e custos/velocidades próprios. Valores, duração, recarga, desbloqueio por nível, custo de troca e riscos são questões em aberto; validar com o usuário antes de fechar. Bio tem seu próprio modo rápido/equipado já aprovado, sem alterar seus números por tabela. Futuramente o morfador mestre é outro sistema, não um seletor de arquétipos grátis.

## Pendências concretas

- Criar soluções coerentes de cada arquétipo para todos os obstáculos da praia, sem destruir a corrente ou a fenda só porque o jogador atravessou; testar acesso e retorno, incluindo saves antigos.
- Câmara de Maré e 10X agora mantêm obstáculo sólido e visível e registram a travessia somente após sair pelo outro lado; ainda usam arte provisória de pedra/props e um alinhamento automático curto para o corredor. Substituir por fluxo e malha animados, telegráficos e revisados visualmente.
- Criar combate básico e decidir novo comando de movimento antes de trocar o clique esquerdo; adicionar NPCs e tutorial após existirem hitboxes, vida, dano, inimigos, recuperação e testes.
- Criar roteiro e layouts específicos mais ricos para as quatro salas, com pistas, falas e missões, e testar retornos/diálogos/saves.
- Planejar interface radial 10X e evolução de formas; não está implementada.
- Testar os novos trajes e frames no navegador: os JPEGs tinham quadriculado embutido, a limpeza automática é aproximada, há efeitos recortados na borda e poses com orientações inconsistentes; pedir PNGs originais transparentes e folhas direcionais bem alinhadas para o acabamento.
