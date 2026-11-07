# Próximas folhas — Saguão Central e ataques

## O que já aproveitamos

O saguão usa recepção, painel, duas luminárias, plantas, assentos, portal e portas da folha existente, mais projeção de rede, varredura do painel e anéis luminosos procedurais. São apenas decorações, sem novos bloqueios nem falsas interações. NEXO-04 e L-7 continuam sendo os atores existentes; não adicionamos cópias para simular uma multidão.

A Bio já tinha nove quadros frontais; agora sua pose lateral de lâmina do traje nível 1 também aparece por instantes, espelhada para a outra lateral. O Domínio usa as duas poses laterais de espada do traje nível 1 como preparação/impacto, não como uma sequência original completa. Nas demais direções conserva-se o corpo direcional e um efeito. A Maré não possui ataque básico direcional do traje nível 1: a folha Q é uma arrancada e a de referência pertence ao nível 2, então o ataque usa movimento procedural e fita de água. O 10X usa sua forma existente e marcas de garras. Esses efeitos não alteram dano ou alcance. A forma sustentada agora anda a 1,8 vez a velocidade normal; Q e suas regras não foram alterados.

## Direção de arte e instruções gerais para gerar

Usar o screenshot do saguão como referência: pixel art isométrica 2:1, linhas limpas, tecnologia de terminal dimensional acolhedora e habitada, metal grafite, ciano/turquesa e poucos acentos âmbar. Não colocar personagens existentes, interface de jogo ou cenário inteiro em cada folha de objetos. Pedir **PNG RGBA com transparência real**, não quadriculado desenhado, células iguais, espaçamento generoso e nenhum efeito atravessando células. Sem texto impresso nas imagens (escreveremos o texto no jogo). Pedir arquivos separados por tipo; IA frequentemente ignora grade ou alpha, então conferir antes de integrar.

### 1. Mobiliário modular — prioridade alta

> Crie uma spritesheet PNG transparente real para um jogo pixel art isométrico 2:1 de saguão interdimensional. Grade 4 colunas por 3 linhas, cada célula 256 × 256 px, sem linhas divisórias, objetos isolados e centralizados, mesma escala e pés/base no mesmo nível. Linguagem visual: metal grafite, luz turquesa suave, detalhes âmbar, preto não é transparência. Linha 1: balcão de atendimento compacto com terminal, painel vertical de partidas, quiosque de informações, cabine de serviço. Linha 2: assento modular duplo, vaso futurista com vegetação realista, lixeira de reciclagem, luminária baixa. Linha 3: suporte de malas, pequeno carrinho de limpeza, bebedouro, divisória baixa. Nenhuma pessoa, nenhum texto, nenhum cenário, nenhum quadriculado. Luz e sombra coerentes com a referência, sem brilho que invada outra célula.

Objetivo: dar variedade sem entupir caminhos; só serão inseridos depois de definir hitboxes e testar passagens e portas.

### 2. NEXO-04 vivo — prioridade alta

> Com a imagem de referência do NEXO-04, mantenha rosto, roupa, paleta, proporções e vista isométrica. Gere uma folha PNG com alpha real de caminhada: 4 linhas para frente, direita, costas e esquerda; 6 quadros sequenciais por linha, células iguais de 256 × 256 px, sem quadriculado. Os pés ficam sempre na mesma linha de base, sem deslocamento de câmera, sem sombra solta. Movimento discreto de recepcionista, braços e pernas coerentes. Nenhuma pose de outra direção na mesma linha; sem cortes e sem personagens vizinhos invadindo a célula.

Numa segunda folha: 4 a 6 quadros de acenar, digitar em terminal e consultar tablet, cada ação em linha separada e identificada fora da imagem por arquivo/metadata. Precisamos das ações separadas; as poses atuais são estáticas.

### 3. Movimento ambiental — prioridade média

> Gere um conjunto de personagens originais para um saguão de viajantes interdimensionais, em pixel art isométrica 2:1 consistente com o screenshot. Cada personagem é uma folha separada, não uma cena: uma turista com mala e um técnico de manutenção, sem semelhança com franquias conhecidas. PNG com transparência real, 4 direções e 6 quadros de caminhada em células iguais de 256 × 256, base dos pés constante, sem fundo, texto ou quadriculado. Aparência amigável e escala humana semelhante ao NEXO-04.

Precisará de rotas, colisão, diálogos e teste de desempenho antes de virar NPC no jogo. Em alternativa, folhas de idle/circular para robôs de limpeza, sempre como personagens independentes, não mobs hostis.

### 4. Elementos animados — prioridade média

> Folhas separadas em pixel art isométrica transparente real: (a) projetor holográfico de mapa dimensional com base fixa e oito quadros de órbitas/partículas contidas na célula; (b) painel de informação com oito quadros de varredura, sem texto legível; (c) portal ciano com oito quadros de fluxo interno, mantendo moldura e base idênticas. Grade horizontal regular, quadros 256 × 256, sem deslocar base, sem halo cortado ou fundo quadriculado.

O portal deve manter seu local e gate reais: animação não deve sugerir que está desbloqueado quando não está.

### 5. Ataque básico por arquétipo — prioridade alta

> Usando a referência do traje **nível 1** de [Bio-Forja / Domínio Ancião / Maré Astral], gere um PNG separado por arquétipo, com alpha real e grade de 6 quadros temporais × 4 linhas direcionais (frente, direita, costas, esquerda). Cada célula 256 × 256, personagem inteiro, sem corte, escala e linha dos pés constantes. Quadros: repouso, preparação, início, impacto, recuperação, repouso. A arma segue o braço e a direção; sem efeitos que saiam da célula. A Bio usa uma pequena ferramenta energética; Domínio uma espada curta dourada em todas as direções, nunca punhos sem espada; Maré uma lâmina/fita líquida ciano, sem escudo. O ataque é curto e legível, não a animação de Q, nem o traje nível 2. Sem quadriculado, números ou texto.

> Para a forma veloz do Núcleo 10X, gere uma folha separada de corrida em quatro direções, 6 a 8 quadros por direção, e outra de ataque de garras com 6 quadros por direção. Preservar a silhueta quadrúpede da forma disponível e a mesma linha de contato dos pés; não desenhar operador humano ou formas novas, nem partículas fora da célula.

## Próximo foco: salas individuais

Após o saguão, refinar uma sala por vez, mantendo câmaras existentes, sequências R → Q, gates, portais e salvamento. Para cada sala: kit modular próprio com chão e parede isométricos encaixáveis, luzes, três props interativos e variação decorativa sem colisão; planejar Bio como oficina, Domínio como câmara de runas e fraturas, Maré como laboratório de correnteza, Núcleo como câmara de projeção e metamorfose. Solicitar as folhas por sala depois de conferir o layout e as dimensões; não usar um cenário plano que esconda a geometria jogável.
