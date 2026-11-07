# Prompts de sprites — revisão de precisão

## Antes de gerar

Use **uma folha por ação**, sempre anexando a arte existente indicada como referência de identidade. Se a ferramenta aceitar referência de personagem, ative-a. Gere primeiro uma única direção, confira a identidade e só então peça as demais usando o resultado aprovado. Não aceite uma folha só porque o fundo parece quadriculado: peça e confira **PNG RGBA com transparência verdadeira**, sem tabuleiro desenhado. Se a IA não conseguir exportar alpha, peça fundo liso contrastante, sem sombras fora do personagem, e avise para a extração ser avaliada depois.

Especificação comum para cada prompt abaixo: pixel art de jogo isométrico 2.5D, câmera fixa, personagens de corpo inteiro; uma grade exata de **6 colunas × 4 linhas**, 1536 × 1024 pixels, células de 256 × 256 pixels; linhas em ordem frente, direita, costas, esquerda; seis fases cronológicas da esquerda para a direita. Uma única figura por célula, margens transparentes, nenhuma célula invade outra, sem texto, números, setas, molduras, rótulos ou sombras de chão. Mesma escala, tamanho de cabeça, paleta, roupa, acessórios e posição dos pés em todos os quadros. Movimento no lugar: o motor desloca o personagem, então não deslize a figura entre células. Efeitos cabem dentro da própria célula; não cortam mãos, pés, cabelos ou armas. Não misture ações e não mude a identidade. Entregue também, se possível, as 24 imagens RGBA individuais com o mesmo tamanho e ponto de apoio.

## 1. NEXO-04 — caminhada confiável (prioridade)

**Referência obrigatória:** `assets/sprites/npcs/nexo-04-sheet.png`, primeira linha de poses direcionais. A folha de caminhada que transformava o NEXO em outro boneco não é referência de identidade.

> Reproduza exatamente o NEXO-04 da referência: mesmo rosto, cabelo, proporções, uniforme, cores e detalhes. Ele é um atendente do saguão, não o jogador. Crie apenas um ciclo de caminhada natural e discreta, com seis fases de passo que retornam suavemente ao início. As quatro linhas correspondem às vistas da referência: frente, direita, costas e esquerda; não vire o personagem gradualmente ao longo de uma linha. Uma sequência temporal não deve trocar rosto, idade, altura, roupa, emblema ou penteado. Os pés de apoio ficam sempre no mesmo ponto. Sem tablet, mala, armadura nova, armas ou efeitos.

**Conferência:** comparar o primeiro e último quadro com o NEXO parado nas quatro direções; nenhum salto de escala ou personagem diferente. Caso falte uma direção coerente, entregar só a direção aprovada, não inventar outra.

## 2. Viajante do saguão — identidade e mala

**Referência:** a viajante atual em `assets/source-art/saguao/` serve para tema e função, não como modelo de qualidade obrigatória. Aprovar primeiro uma única pose de corpo inteiro antes de gerar o ciclo.

> Crie uma viajante interdimensional adulta, visual acolhedor e discreto, roupa de viagem cyberpunk coerente com o saguão, segurando uma pequena mala de rodinhas. Defina e mantenha exatamente o mesmo rosto, cabelo, traje, proporções, cores e mala em todos os quadros. Caminhada calma, seis fases em loop por direção; a mala acompanha a mão sem trocar de lado ou flutuar, e ambas as rodas tocam o chão. As vistas frontal, direita, traseira e esquerda devem ser realmente direcionais. Nenhum efeito luminoso exagerado, nenhum segundo personagem. Depois gere separadamente uma pose parada por direção com os mesmos pés e proporções.

## 3. Domínio Ancião — ataque básico com espada

**Referência:** `assets/sprites/player/player-dominio-lvl1.png`; não usar o traje de escolha de nível 2. A folha enviada em `assets/source-art/proximas-animacoes/dominio-ataque.png` é uma referência de movimento, não de identidade.

> Mesmo operador adulto da referência, mesmo rosto, óculos, cabelo, tatuagens visíveis e exato traje nível 1 preto e dourado; não redesenhar armadura, capacete ou porte. Ataque básico ágil com espada pequena de energia dourada: preparo, braço e espada avançam, corte curto, impacto legível com rastro fino dourado, recuperação e retorno. Uma única espada contínua em todas as fases, inclusive na vista traseira. Não transformar esse golpe em Q pesado; não trocar espada por soco. Rastro e lâmina inteiros dentro da célula; não mudar escala ou pés. Mesma ação nas quatro direções, sem mudar o personagem.

## 4. Maré Astral — ataque básico

**Referência:** `assets/sprites/player/player-mare-lvl1.png`. A folha em `assets/source-art/proximas-animacoes/mare-ataque.png` tem movimento interessante, mas sua armadura difere do traje ativo; não a use para mudar a roupa.

> Mesmo operador e mesmo traje de mergulho nível 1 cinza-azulado com circuitos ciano da referência, sem ornamentos dourados novos e sem alterar rosto, óculos ou proporções. Um ataque básico curto de mão com uma fita de água translúcida: preparação, avanço da mão, arco ciano concentrado, dissolução e recuperação. A água acompanha o movimento e não obscurece a silhueta. Não criar escudo, espada, elmo, armadura de nível superior ou dash de Q. Quatro direções, mesma escala e pés, efeitos contidos na célula.

## 5. Forma Veloz do Núcleo 10X — corrida e ataque

**Referência:** a criatura em `assets/sprites/player/player-10x-q.png`, terceiro quadro, e as folhas salvas em `assets/source-art/proximas-animacoes/`. Gerar corrida e ataque em folhas separadas.

> Preserve a mesma criatura quadrúpede biomecânica negra com veios neon verdes, máscara facial e crista da referência, sem adicionar cauda, roupa ou mudar sua anatomia. Para corrida, crie seis fases claras de passada rápida que formem um loop no mesmo lugar, com patas próximas ao chão e rastros curtos verdes dentro da célula; faça frente, direita, costas e esquerda reais. Para ataque, em uma segunda folha, crie preparação, avanço de garra, um único corte em arco verde, impacto, recuperação e retorno; a criatura permanece na forma veloz. Não incluir transformação humana, não trocar para uma criatura diferente e não alterar a escala. Apoio e orientação consistentes com a pose parada.

**Pendência atual:** corrida lateral e ataque da forma sustentada têm integração provisória; corrida de frente/costas ainda usa a pose anterior, porque a folha lateral não fornece essas vistas.

## 6. Interior do portal — opcional, sem moldura

> Gere apenas uma textura de energia dimensional ciano em rotação, seis quadros em loop, vista inclinada isométrica compatível com o interior do portal existente. Não desenhe moldura, pedestal, rampa, piso ou sombra. Fundo realmente transparente; conteúdo limitado a uma elipse fixa que não salta de posição nem muda tamanho. O primeiro e o último quadro devem conectar suavemente. O efeito é visual e não representa desbloqueio.

## Checklist antes de enviar

- Abrir o PNG sobre fundos claro e escuro; o quadriculado deve ser do visualizador, não pixels do arquivo.
- Contar grade e células, conferir que nenhuma figura ou efeito cruza a borda.
- Comparar personagem e acessório com a referência quadro a quadro, inclusive óculos, proporções e nível do traje.
- Verificar pés, orientação, ordem temporal, começo/fim do ciclo e silhuetas completas.
- Enviar originais sem redimensionamento pelo mensageiro quando possível. Se uma IA falhar, prefira folhas menores por direção à grade inventada.
