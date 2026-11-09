# Arquipélago — fila de prompts para geração pelo criador

## Como usar e prioridades

A rodada 0.3.10 não gera novas imagens: esta é uma lista para você gerar e enviar originais. Uma solicitação abaixo = **uma folha**, não um mapa inteiro. Comece pelas duas primeiras, valide escala e alpha em jogo antes de gerar outra rodada. Os prompts são independentes; anexe as referências indicadas. Prefira arquivo PNG original sem compressão por mensageiro. Se o gerador não produzir grade ou alpha confiáveis, envie os originais mesmo assim: não se considera integrado antes de recortar, limpar e conferir em jogo.

### 1. Estação de chegada da praia — kit modular

**Anexar:** `assets/source-art/coastal/estacao-conceito.jpg` como intenção de plataforma, `assets/sprites/objects/dimensional-train.png` para escala e `assets/source-art/coastal/ilha-panorama.png` para integração com a costa. O conceito tem quadriculado pintado; não copie esse fundo.

> Crie uma única folha 4 colunas × 2 linhas, 2048 × 1024 px, células de 512 × 512 px com margens, de peças independentes para a estação ferroviária costeira de um jogo original isométrico pixel art 2:1, iluminação e materiais consistentes com as referências anexas. Células na ordem: módulo central de plataforma baixa, borda de plataforma com faixa de segurança, canto de plataforma, módulo de escada baixa; pilar de sustentação curto, placa de estação vazia sem texto, luminária baixa, módulo de corrimão curto. Cada peça inteira cabe na própria célula, tem base isométrica e escala consistente com o trem de referência; chão transparente e perspectiva idêntica. Metal cinza grafite desgastado, sinais em ciano e amarelo discretos, areia e vegetação apenas em detalhes removíveis. A plataforma deve poder encostar no trilho sem cobri-lo, não incluir trem, portal, personagens, cabos soltos, fundo, cenário completo, molduras, rótulos, números, letras, marca d'água ou quadriculado. PNG RGBA com transparência real; se impossível, fundo magenta liso uniforme, sem sombras ou pixels magenta nos objetos.

**Aceitação:** recortar cada módulo, medir apoio e checar se não sobrepõe o trilho/entrada; cenário não altera máscara nem colisão até validar. Não usar a plataforma inteira do conceito como piso navegável.

### 2. Costa e mar — bordas separadas

**Anexar:** `assets/source-art/coastal/ilha-panorama.png` e `assets/source-art/coastal/praia.png` como paleta e referência, nunca como mapa colado.

> Uma folha 4 × 4 de 1024 × 1024 px, células 256 × 256 px, kit de sobreposições para costa de jogo isométrico pixel art 2:1. Quatro células de espuma fina para bordas norte/leste/sul/oeste de um losango de 64 × 32 px; quatro cantos externos; quatro cantos internos; quatro manchas isoladas de água rasa e espuma para água, sem areia. Arte branca/ciano com variações pequenas, linha fina quebrada e transparência real; água rasa turquesa, mar profundo azul e areia quente conforme referências. Tudo cabe dentro da célula, bordas orientadas explicitamente por ordem da grade, sem tabuleiros, blocos com laterais, rochas, personagens, textos ou quadriculado desenhado. PNG RGBA com alpha real, ou fundo magenta liso uniforme se alpha falhar. A camada não deve parecer um quadrado ao ser repetida.

**Aceitação:** não usar como colisão nem pintar areia em água; verificar todas as orientações e emendas, sem repetir faixas geométricas.

### 3. Bio-Forja — união entre fundação e natureza

**Anexar:** `assets/concepts/bio-forja-missao-mapa.png`, `assets/sprites/estacao-bio/terminal.png` e `assets/sprites/estacao-bio/estufa.png`.

> Gere uma folha modular 4 × 2, 2048 × 1024 px, células 512 × 512, pixel art isométrica 2:1 coerente com as referências anexas: 1 borda de fundação industrial baixa, 1 canto externo, 1 canto interno, 1 transição piso industrial/musgo; 1 canaleta de manutenção, 1 grelha de drenagem, 1 floreira de baixa altura, 1 fragmento de muro com conduíte. Cada peça independente, ancorada na base, sem outra peça invadir sua célula. Metal grafite e pedra com musgo sutil, iluminação compatível com o terminal, detalhes legíveis no tamanho de um tile 64 × 32. Sem personagens, edifício completo, texto, interface, moldura ou fundo quadriculado. PNG RGBA real ou fundo magenta liso sem contaminação. Não representar escadas transitáveis como uma imagem plana de fundo.

**Aceitação:** comparar a fundação real com a hitbox e a linha do mar antes de integrar; peças não substituem as estruturas e saves.

### 4. Bio-Forja — caminhada completa

**Anexar:** `assets/sprites/player/player-bio-forja-lvl1.png` como identidade e `assets/sprites/player/player-bio-forja-walk.png` apenas como referência dos passos laterais.

> Faça uma única folha de caminhada em pixel art de jogo isométrico 2.5D, grade exata 6 colunas × 4 linhas, 1536 × 1024 px, células 256 × 256 px. Linhas: frente, direita, costas, esquerda; colunas: seis fases temporais de uma passada em loop, no lugar. Mesmo operador adulto, cabelo, óculos, barba, tatuagens e traje Bio-Forja nível 1 preto com luzes ciano e pequenos detalhes amarelos da referência, sem capacete novo, mudança de armadura ou de rosto. Pés sobre a mesma linha de base, sem deslizar no quadro; mãos, pés e cabelos completos dentro da célula. Uma figura por célula, sem sombras de piso, texto, rótulos, grade visível, moldura, fundo ou efeitos de ataque. PNG com alpha verdadeiro; se inviável, fundo magenta uniforme. Exporte também os 24 quadros PNG separados, cada um com 256 × 256 px e a mesma âncora.

**Aceitação:** comparar frente, costas e laterais com o traje ativo; o jogo já usa dois passos laterais provisórios, não substituir por folha com identidade inconsistente.

### 5. Bio-Forja — ataque básico direcional

**Anexar:** `assets/sprites/player/player-bio-forja-lvl1.png` e `assets/sprites/player/player-bio-ataque-frontal.png` como ação, não como modelo de proporção obrigatório.

> Uma folha 6 × 4 de 1536 × 1024 px, células 256 × 256: linhas frente, direita, costas, esquerda; seis fases do mesmo ataque básico curto Bio-Forja: preparação, avanço da ferramenta biomecânica, impacto, faíscas pequenas, recolhimento, retorno. Reproduza exatamente o operador e traje nível 1 da referência, mesmos óculos, cabelo, tatuagens, cores e altura; manter os pés ancorados e uma figura inteira por célula. Não é o dash Q nem o scan R; não trocar o traje por outro arquétipo, espada, escudo ou arma de fogo. Efeitos inteiros dentro da célula, alpha real, sem textos, sombra de chão, grade ou fundo. Se alpha falhar, fundo magenta uniforme; entregar 24 quadros separados com a mesma âncora.

### 6. Domínio Ancião — ataque básico fiel

**Anexar:** `assets/sprites/player/player-dominio-lvl1.png`; `assets/source-art/proximas-animacoes/dominio-ataque.png` apenas como ideia de movimento, pois muda o traje.

> Gere uma folha 6 × 4, 1536 × 1024 px, com linhas frente/direita/costas/esquerda e seis fases de um corte básico curto de espada dourada pequena, da preparação à recuperação. Copie com precisão o rosto, óculos, proporções e traje nível 1 preto e dourado da primeira referência; não use a armadura alternativa da segunda. A mesma espada aparece inteira em todas as fases, inclusive de costas; não usar o golpe pesado Q. Pés na mesma âncora, uma figura completa por célula de 256 × 256, efeitos contidos, PNG transparente real, sem fundo, texto, grade ou sombras. Se necessário, fundo magenta uniforme e quadros individuais.

### 7. Maré Astral — ataque básico fiel

**Anexar:** `assets/sprites/player/player-mare-lvl1.png`; a folha `assets/source-art/proximas-animacoes/mare-ataque.png` apenas para o movimento, não o traje.

> Folha 6 × 4, 1536 × 1024 px, 256 × 256 por célula; linhas frente, direita, costas, esquerda. Seis fases de ataque básico com mão e fita líquida ciano, preparação, golpe, dissolução e retorno, sem escudo e sem dash Q. Reproduza exatamente o operador e traje de mergulho nível 1 cinza-azulado da referência, inclusive óculos e rosto, sem dourado novo ou armadura Bio. Não mude escala, orientação ou ponto dos pés; um personagem inteiro e efeito dentro de cada célula. Alpha verdadeiro, sem fundo, texto, grade ou sombra de chão; se necessário, magenta uniforme e quadros separados.

### 8. Núcleo 10X — corrida frontal e traseira

**Anexar:** `assets/sprites/player/player-10x-q.png` (terceiro quadro, criatura) e `assets/source-art/proximas-animacoes/veloz-lateral.png` para movimento lateral existente.

> Faça uma folha 6 × 2, 1536 × 512 px, células de 256 × 256. Linha 1: seis fases de corrida frontal; linha 2: seis fases de corrida traseira. A mesma criatura biomecânica negra e verde da referência, mesma cabeça, anatomia e proporções, sem cauda ou transformação humana. Ciclo no lugar, patas apoiadas na mesma linha, cada corpo inteiro dentro de sua célula, sem efeito de ataque, letras, fundo ou sombra de chão. PNG RGBA com alpha verdadeiro ou magenta liso uniforme, mais os 12 quadros separados.

## Depois destas folhas

Fauna: a folha atual já fornece caranguejo, gaivota, cardume e capivara com movimento/fuga; só pedir novas espécies quando habitats e orçamento estiverem definidos. Clima: separar vento/chuva/névoa em sobreposições reversíveis e acessíveis, sem interferir na colisão. Rotas aéreas e submarinas: projetar mapas/conexões, entrada/retorno e regras por arquétipo antes de pedir cenários grandes. Para cada arte, conferir em resolução real, com jogador, colisão, zoom, estados e desempenho; referências e mockups não são geometria jogável.
