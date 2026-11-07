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
- Evoluir o protótipo da interface radial 10X com novas formas e transformação sustentada, quando regras e arte estiverem definidas.
- Testar os novos trajes e frames no navegador: os JPEGs tinham quadriculado embutido, a limpeza automática é aproximada, há efeitos recortados na borda e poses com orientações inconsistentes; pedir PNGs originais transparentes e folhas direcionais bem alinhadas para o acabamento.

## Atualização — rotas Maré/10X e interface

Duas pontes alternativas da Praia Inicial levam da ilha inicial à ilha leste e depois à ilha central/farol. Maré e 10X atravessam com Q e retornam pelo mesmo caminho; os obstáculos permanecem no lugar e sólidos para caminhada. Ainda usam props provisórios e requerem revisão visual, arte de corrente/malha e refinamento das missões. As rotas antigas de Bio e Domínio foram preservadas; soluções próprias para que ambos também superem os obstáculos além da primeira ilha continuam pendentes.

A roda 10X tem um protótipo em CSS e uma única forma disponível. T abre; Espaço/Enter/E ou clique confirmam a transformação sustentada experimental; reabrir e confirmar retorna ao operador. Esc/T cancelam. Q rápido continua disponível em modo civil, sem novas habilidades concedidas. Custos e regras da forma sustentada permanecem em aberto. A roupa de referência 10X não é um toggle de traje.

## Mapa de evolução de regiões — preparação

`js/data/arquipelago-regioes.js` registra uma sequência planejada e conexões bidirecionais. Não cria portais, não abre destinos e não muda saves: apenas a Praia Inicial é jogável. Para cada próxima etapa, construir e testar um mapa conectado, retorno, acesso para cada arquétipo e limites de câmera antes de registrá-lo como disponível.

| Região | Identidade e fatia inicial | Vida e oportunidade narrativa |
|---|---|---|
| Enseada dos Ecos | Praia maior, pequenas poças entre rochas e ponto de observação do mar; acesso a partir da praia inicial | Aves e caranguejos; pistas da chegada de outros viajantes e rotas do trem. |
| Manguezal Sussurrante | Estuário com passarelas, raízes e canais com alternativas de travessia | Peixes, aves e marés; ouvir rastros e observar sem exigir combate. |
| Floresta das Raízes | Borda de mata, riacho, clareira e acesso ao interior em trechos | Pequenos animais, plantas e ciclos diários; futuro encontro de Bolt com trilhas. |
| Falhas do Farol | Falésias e ruínas com vista para rotas dimensionais | Pistas graduais do rival, sem antecipar o arco completo. |

A ilha deve parecer ampla sem exigir um mapa único enorme: usar regiões adjacentes, carregar somente o necessário e preservar visual contínuo, mar, horizonte e pontos reconhecíveis. Planejar obstáculos alternativos por arquétipo; não distribuir outros módulos de graça. Fauna, rotinas, regiões novas e encontros são planejamento, não implementações prontas.

## Prompt — chegada coerente do trem dimensional

Objetivo: transformar o ponto de chegada em **pequena estação costeira elevada**, conectada à ilha por passarela, sem cortar a praia com trilho solto. O trem existente permanece um objeto e o trilho uma camada independente: não embutir trem, terminal nem trilhos na imagem da plataforma. Primeiro gerar uma referência geral, depois peças individuais com alpha real, todas com a mesma perspectiva e ponto de apoio. Validar encaixe e colisão antes de alterar a praia já aprovada.

```text
Arte original para Bloco 404, jogo isométrico de exploração em pixel art.
Uma pequena estação dimensional costeira construída sobre uma plataforma
baixa e reforçada à beira-mar, visualmente coerente com o trem tecnológico
azul-ciano e grafite de referência. Base estrutural de pedra e metal resistente
à maresia, apoios visíveis que encontram o solo ou água rasa, acabamento de
madeira na passarela de pedestres ligando naturalmente a plataforma à areia.
Espaço vazio e alinhado para um único trilho e o trem serem inseridos depois;
acesso seguro à porta do trem, pequenas luzes ciano, cabos discretos, guarda
corpo interrompido apenas na entrada, placas sem letras. Uma extremidade da
via deve sugerir um túnel/portal dimensional embutido numa estrutura de
contenção na costa, não trilhos surgindo arbitrariamente no meio da praia.
Areia, vegetação e água rasa devem contornar a construção naturalmente, com
sombra e proporção coerentes com o jogo. Cenário acolhedor, funcional e
explorável; não uma estação gigante ou futurista genérica.

Gerar primeiro como imagem conceitual sem personagens, texto, marcas ou
interface. Depois exportar base de estação, apoios, passarela e portal como
peças separadas em PNG com transparência real, sem tabuleiro quadriculado,
sem trem e sem trilhos desenhados. Mesma orientação isométrica e escala do
sprite de trem fornecido. Não incluir elementos que obstruam a futura rota do
jogador; não criar sombras opacas como parte do chão.
```

**Integração futura:** preservar `linhaDoTrem()` e o ajuste de alinhamento aprovado; testar dimensões da plataforma em ambos os eixos, sobreposição/profundidade, acesso ao terminal e ao retorno, colisão, spawn, maré visual e continuidade com o mar. Considerar portal de chegada como peça de cenário, não teletransporte automático. Não substituir o chão inteiro da praia por um background achatado.
