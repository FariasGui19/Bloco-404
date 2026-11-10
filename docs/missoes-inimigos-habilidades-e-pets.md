# Primeiras missões, adversários, habilidades e vínculos

Documento de direção e prompts: nomes, requisitos, custos, duração e balanceamento são propostas. Nada aqui garante que mapas, inimigos, chefes ou novas habilidades já existam no jogo. Uma ilha compartilhada; cada operador escolhe um único arquétipo e um módulo por vez. O futuro morfador mestre é outro sistema e não deve conceder trocas agora. Cada kit tem ataque adaptativo, Q, R, utilidade, suporte e Ultimate; todos os slots começam no nível 1, inclusive a Ultimate. Em 0.4.0 entraram a Ultimate base e as 16 sobrecargas de ferramenta (Ultimate nível 1); utilidade e suporte continuam só no papel.

## Padrão técnico de imagens

Para conceitos de mapa, pedir **uma imagem única, não grade**: cenário isométrico 2D pixel art, perspectiva e luz consistentes, caminhos amplos e legíveis, chegada segura, área de exploração, objetivo, arena, saída e retorno. Sem UI, texto, personagens ou grade; não fixar objetos que precisem se mover. A imagem serve como **conceito visual**, não mapa jogável automático: será necessário redesenhar/segmentar fundo, camadas, colisões, máscaras de piso, profundidade, pontos de entrada e saída e interações. Não usar uma imagem plana como colisão ou prometer que será totalmente transitável. Escala coerente com o personagem, tamanho adaptado a testes e streaming de setores. Remover gradientes/checkerboards incorporados antes de usar.

Para personagens/efeitos: PNG RGBA com transparência real, sem tabuleiro desenhado; 6 colunas × 4 linhas, células de 256 × 256, frente/direita/costas/esquerda, seis fases cronológicas, ponto de apoio e tamanho constantes, sem invadir células, sem rótulos. Para ações complexas, uma folha por direção é preferível a quatro direções inventadas. Inimigo e efeito de aviso em folhas separadas; o telegraph deve continuar legível sem depender apenas da cor.

## 1. Bio-Forja — A Estação que Respira

**Lugar e jornada:** costa, trilha por uma antiga estação biotécnica, passarelas com rotas alternativas, jardim de biorreatores, teleférico avariado e clareira de manutenção. O jogador investiga com R antes de consertar; Q atravessa corredores de pressão, mas não substitui a investigação. A missão culmina em estabilizar um pulso vivo, escolher como aliviar o sistema e religar o teleférico com retorno seguro. O inimigo explora o ponto fraco de depender de uma linha reta, mas sempre há espaço para reposicionar.

**Mapa — prompt:**
> Uma estação costeira de bioengenharia abandonada, grandiosa e integrada a uma ilha tropical, com praia de chegada, trilha em curvas, passarelas largas, estufa luminosa, cabos do teleférico danificado e praça de manutenção. Raízes, tubulações âmbar e peças mecânicas crescem juntas sem bloquear todos os caminhos. Norte visualmente elevado, atalhos visíveis e arena central ampla. Pixel art isométrica 2D, escala humana coerente, sem texto nem interface. Uma única imagem de cenário legível, sem personagens; separar conceito de jogabilidade.

**Agressivo — Serrídeo de Pressão:** caranguejo biotécnico que ancora o chão e anuncia uma faixa de pressão antes de uma investida em linha. A faixa tem contorno tracejado e preparação visível; o jogador pode sair pela lateral, e a criatura fica exposta após errar. R pode revelar a válvula, mas não é obrigatório usá-lo. **Prompt:**
> Crie Serrídeo de Pressão, caranguejo de sucata bioforjada com carapaça bronze escuro, mangueiras âmbar e válvulas visíveis, pequeno o suficiente para um combate tático. Quatro direções, idle, caminhada, preparação de investida, ataque e recuperação em folhas separadas; preparação clara com corpo recuando e válvula abrindo. Mesmo esqueleto, sem mudança de escala. Efeito de faixa de pressão tracejada em folha RGBA separada, sem chão fixo.

**Miniboss — O Jardineiro de Ferrugem:** antiga máquina de manutenção enraizada. Primeiro força reposicionamento com linhas de vapor; depois protege o núcleo e alterna duas válvulas. Abertura após cada descarga; soluções alternativas sem exigir dano de Q. **Prompt:**
> Miniboss mecânico de estufa, silhueta alta e legível, ferramentas de poda, raiz bioluminescente e um núcleo âmbar; desenho original, não robô de franquia. Folhas separadas de idle, varredura anunciada, descarga, núcleo exposto e reação; manter âncora e anatomia. Efeitos, sombra e indicadores exportados separados.

## 2. Domínio Ancião — O Arquivo Sob a Pedra

**Lugar e jornada:** pedreira monumental ao ar livre, ponte suspensa, inscrições douradas e arquivo enterrado em camadas. Não uma sala pequena: caminhos de contorno conectam três pátios e um salão com teto aberto. R revela tensões, Q abre uma fratura designada sem destruir a paisagem inteira; teste de decisão é preservar um arquivo ameaçado antes de enfrentar o guardião.

**Mapa — prompt:**
> Pedreira arqueológica isométrica em ilha tropical compartilhada, plataformas rochosas imponentes, escadarias amplas, ponte, inscrições geométricas douradas, três pátios conectados e arquivo antigo sob arco monumental. Arena espaçosa e rotas alternativas, sem texto, interface, pessoas ou grade; pixel art 2D consistente e caminho bem legível.

**Agressivo — Escudário de Falha:** fragmento blindado que levanta escudo antes do golpe pesado em linha; girar, recuar e atacar a lateral ou aguardar a abertura são respostas válidas. Não imunizar permanentemente Domínio. **Prompt:**
> Criatura original de pedra articulada com placas escuras, inscrições douradas partidas e escudo mineral. Mostre idle, deslocamento, escudo levantando, golpe pesado e recuperação prolongada em folhas direcionais separadas; uma linha tracejada de perigo em camada RGBA separada.

**Miniboss — Custódia das Sete Fraturas:** sentinela que lê forças e fecha o eixo de golpes frontais; anuncia quais setores do chão fraturam e abre pontos vulneráveis após o impacto. **Prompt:**
> Guardião monumental de arquivo antigo, silhueta única em pedra e metal escuro, sete fraturas douradas legíveis, escudo segmentado e núcleo exposto após impacto. Ciclos de preparação, golpe em área, recuperação e mudança de fase, sem câmera mudar; indicadores de área e fragmentos em camadas separadas.

## 3. Maré Astral — O Observatório das Marés Partidas

**Lugar e jornada:** baía com trilha seca e canais rasos, observatório semi-submerso, pátio de comportas e terraços de coral. R lê correntes/fauna; Q desloca através de uma corrente em momentos seguros, não destrói o bloqueio. Restaurar duas comportas em ordem compreensível e salvar a fauna presa antes do confronto.

**Mapa — prompt:**
> Observatório costeiro isométrico 2D semi-submerso numa ilha tropical, canais rasos, pontes largas, dois conjuntos de comportas, terraços de coral e farol, arena seca e rota alternativa de retorno. Água e terra diferenciáveis, composição de cenário grande e coerente, pixel art, sem texto, interface nem personagens.

**Agressivo — Nácar de Contracorrente:** criatura anfíbia com concha que marca uma corrente transversal e antecipa o salto para interromper deslocamentos previsíveis. Mostra direção por setas/forma; existe chão seguro e recuperação após o salto. **Prompt:**
> Criatura anfíbia pequena original, concha iridescente azul escura e nadadeiras assimétricas, vista isométrica, animações separadas de patrulha, preparação visível, salto de contracorrente, pouso vulnerável e reação. Água e seta de direção são efeitos RGBA separados, não desenhar cenário.

**Miniboss — Regente do Estuário:** entidade de água e estrutura de comporta. Alterna áreas secas e correntes, sem inundar toda a arena; ciclos têm pausas e uma solução não depende de correr mais rápido que o efeito. **Prompt:**
> Entidade original de estuário, corpo de água ciano delimitado por anéis de metal envelhecido e coral, silhueta sempre visível. Idle, preparo de onda, descarga e repouso em folhas separadas, com indicação de onda em textura/efeito transparente separado. Evitar brilho que esconda o player.

## 4. Núcleo 10X — O Pátio dos Ecos Lentos

**Lugar e jornada:** depósito dimensional amplo, trilhos e máquinas em suspensão, passagens que mudam de frequência e um jardim de ecos em repouso. R revela janelas de frequência; Q cruza uma fenda em sua janela sem destruir o obstáculo. A forma veloz é temporária e tem retorno seguro; o projeto inicial parte da transformação rápida para evolução sustentada, nunca presume que já há outras formas desbloqueadas.

**Mapa — prompt:**
> Pátio dimensional isométrico dentro da ilha, escala grandiosa, trilhos curvos suspensos, observatório orbital verde/âmbar, plataformas largas de frequência e jardim de ecos, claramente navegável com refúgios e caminhos alternativos. Pixel art 2D, luz legível, uma única cena sem texto, UI ou personagens.

**Agressivo — Âncora de Intervalo:** sentinela que prevê o ponto final de uma corrida e marca um círculo temporário, em vez de simplesmente ser mais rápida. O círculo cresce e pulsa com contorno visível; seguir andando ou esperar cria contrajogo. **Prompt:**
> Pequena sentinela dimensional original, corpo angular preto-esverdeado, anéis âmbar e um único sensor, idle/patrulha/medição/ataque/recuperação em folhas direcionais. Anel de previsão progressivo em RGBA separado, legível sem cor; sem imitar personagens existentes.

**Miniboss — O Cronarca de Ruptura:** caçador de janelas temporais que separa arena em setores; ações lentas revelam onde é seguro e o fim da fase dá oportunidade para atacar. Nunca prende o jogador transformado em terreno impossível de retorno. **Prompt:**
> Miniboss dimensional original, silhueta assimétrica de metal negro, discos orbitais verde e âmbar e núcleo central, postura de previsão visível antes de cada golpe. Folhas de idle, medição, ataque, recuperação e retorno; discos e indicadores independentes, sem referências a franquias.

## Prompts para próximas habilidades — conceitos, não mecânicas finais

Prefixo comum: mesmo operador e traje nível 1 da referência existente, mesma escala, âncora e vistas; uma folha por habilidade com antecipação, execução, recuperação e retorno; efeitos em RGBA separados; sem mudar personagem, nível, arma ou virar outra classe. Antes de gerar, anexe o traje correto de `assets/sprites/player/`. Não reutilizar Q/R como se já fossem uma habilidade adicional.

- **Bio utilidade — Ponte de Sinapses:** fios biomecânicos laranja costuram brevemente dois pontos, formando uma passagem estreita com apoios em cada margem; desenhe operador ativando ferramenta e filamentos em folhas separadas. Evolução proposta: duração/alcance e ancoragem mais confiável, nunca atravessar mapa sem validação de colisão.
- **Bio suporte — Casulo de Reparo:** aro de segmentos orgânicos se fecha ao redor do operador ou aliado, pulsa e abre; linhas quentes e mecânicas, não cura garantida ainda. Evolução proposta: eficiência e assistência situacional.
- **Bio Ultimate — Pulso da Forja Viva:** constelação de raízes e engrenagens forma uma cúpula e depois libera uma onda radial de reconstrução. Usar silhueta clara, aviso de área separado e versões visuais discretas. Ultimate começa no nível 1; custo e efeito futuros.
- **Domínio utilidade — Escada de Estratos:** runas douradas comprimem rocha em degraus temporários, com uma mão guiando as placas; animação de formação, estabilidade e dissolução separadas.
- **Domínio suporte — Baluarte de Linhas:** espada pequena traça linhas douradas que levantam placa protetora estreita e visível; efeito separado, sem aumentar o traje ou trocar a espada por punhos.
- **Domínio Ultimate — Coroa da Falha:** o guerreiro finca espada, anéis geométricos e fissuras se abrem progressivamente; arena e hitbox não fazem parte do sprite, aviso distinto e recuperação explícita.
- **Maré utilidade — Passarela de Espuma:** corrente rasa solidifica numa faixa curta e reversível, com operador dirigindo a água pelas mãos; sem escudo e sem mudar traje.
- **Maré suporte — Bolha de Abrigo:** lâmina de água gira e forma abrigo translúcido com borda descontínua legível; personagem e água em folhas distintas, sem obscurecer o interior.
- **Maré Ultimate — Sinfonia do Estuário:** faixas de água e ecos de fauna orbitam, convergem num grande arco e se dissipam. Aviso de alcance, elementos de fauna e brilho em camadas separadas.
- **10X utilidade — Rastro de Fase:** forma veloz deixa marcas verdes que revelam uma trilha transitável; transformação, movimento e rastro separados; não inventar forma adicional.
- **10X suporte — Órbita de Ancoragem:** lente verde/âmbar marca um ponto seguro para retorno, com símbolo e anel distintos; não forçar retorno para posição bloqueada.
- **10X Ultimate — Horizonte de Dez Ecos:** anéis orbitais e silhuetas abstratas convergem numa onda única e clara; não mostrar dez formas desbloqueadas, nem copiar Omnitrix. Forma rápida evolui depois para sustentada, com duração e custos diferentes por forma.

## Vínculo de companheiro e Bolt

**No jogo agora:** protótipo em três etapas — após os vestígios, ouvir o sinal, acalmar a ressonância e oferecer companhia a Lúmeo. Não há perigo real, minigame, diálogo ramificado ou cinemática ainda; os três marcadores ainda usam o sistema de coletáveis. Saves que já possuem Lúmeo não perdem o vínculo e não repetem a missão. A missão principal não é substituída.

**Direção para uma missão marcante:** durante uma tempestade de eco, encontrar rastros de uma criatura assustada, escolher aproximar-se devagar, reconstruir uma rota segura e desligar uma máquina que a ameaça; chamar, esperar e observar sua resposta, sem captura forçada. A conclusão deve ser um encontro em que ela escolhe confiar, com animação própria, trilha, resposta às decisões, revisita e consequência suave de falha sem perder o companheiro. Requisitos propostos: missão inicial concluída, abrigo acessível e investigação de pistas; concretizar somente após testes. Alimentar/cuidar/brincar, comandos de acompanhar/esperar, descanso e diálogos devem ser inclusivos e não transformar cuidado em punição constante. Equipamento cosmético e funcional com slots claros, durabilidade e custos ainda abertos; habilidades de exploração e combate só após sistema de inimigos, sem aquisição automática nem dano furtivo.

**Bolt:** companheiro pessoal inspirado no cachorro real do criador. Sua identidade, aparência, personalidade e condições de obtenção/autorização precisam ser decididas com ele; não substituir nem apagar automaticamente Lúmeo dos saves de outros jogadores. Possível missão pessoal paralela no futuro, com memórias e vínculo próprios. Antes de produzir arte final, pedir referências reais e autorização para seu uso; nenhum sistema de conta/identidade segura existe hoje. Não supor que nome de save seja autenticação.

## Inventário, árvore e vida

- **Inventário:** hoje é lista de IDs únicos; primeiro passo é catálogo consultável, classificação e interface de leitura. Planejar versões/migração aditiva para quantidades, equipamentos, itens de missão e storage; preservar IDs e saves existentes, impedir duplicação/perda, definir limites só com UX e testes. Nenhuma loja, crafting ou equipamento foi ligada agora.
- **Árvore:** cinco slots persistidos em nível 1; Q/R existentes, utilidade/suporte/Ultimate ainda sem IDs jogáveis. Mostrar nível, desbloqueio e prévia sem prometer efeitos. Evoluções devem ter custos e requisitos explícitos, teste de regressão por arquétipo e limites para que não criem troca de módulo. Ainda não há compra de upgrades.
- **Vida:** modelo puro de dano limitado foi iniciado, sem alterar combate real. Antes de integrá-lo: HUD acessível, invulnerabilidade pós-acerto, sinal audiovisual/sem depender de cor, derrota e recuperação seguras, estado de save, menus pausando simulação, tuning e testes com projéteis/portais. A saúde não é dano real ainda.
