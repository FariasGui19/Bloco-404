# Limiar — Passo 3: personagem, animação e câmera

## Implementado

O operador continua sendo um modelo 3D low-poly procedural, preservando as cores e acessórios dos quatro arquétipos. Agora há articulações de joelhos/cotovelos, cabeça com pivô próprio, detalhes de cintura/peito e uma textura procedural de tecido/painéis de 32×32 pixels com NearestFilter. Não é um personagem final desenhado à mão e não foi substituído por um sprite plano.

`operator-motion.js` calcula poses de apresentação, separadas da simulação: repouso com respiração discreta, passada com fases opostas, salto ascendente, queda, voo com inclinação/banking limitado, nado, escalada e pilotagem sentada. As poses se misturam suavemente; a passada acompanha a velocidade simulada. Aterrissar produz uma pequena compressão visual, sem alterar colisão. Os propulsores do X10 respondem ao voo/velocidade e são atualizados por uma lista fixa, sem percorrer a árvore inteira a cada frame.

`camera-motion.js` propõe enquadramento com antecipação limitada pela velocidade, compensação vertical suave, recuo de até 1,6 m e campo de visão entre 58° e 63° em voo. A órbita manual, zoom, mira Q e as duas verificações de obstrução do runtime permanecem. Não há tremor nem roll de câmera. A mudança de FOV não é usada como medição de velocidade física.

A preferência explícita `prefers-reduced-motion: reduce` remove respiração/banking decorativos, antecipação e abertura dinâmica da câmera, preservando poses funcionais e controles. Nada depende de espera de missão ou calibração. O relógio visual vem do runtime: pausa/aba oculta não cria animação independente em segundo plano.

Não foram alterados o controlador, suas velocidades/custos, o terreno, as missões 2D, saves ou desbloqueios. Não foram implementados lore ou progressão nível 2 do Passo 4. Sem IK de contato com terreno, animação esquelética importada, combate ou captura de movimento: trata-se de uma base procedural articulada.

## Validação

- `tests/dimension-motion.mjs`: estados/poses, articulações, relógio pausado, wrap de ângulo, limites de câmera, movimento reduzido, materiais nearest e os quatro rigs; verifica que a apresentação não escreve no controlador.
- `tests/dimension-browser.mjs`: animação observada no runtime real em caminhada/voo/Maré, troca da preferência de movimento, controles, órbita, barco, save, retorno 2D, reentrada e perda de contexto.
- Permanecem as regressões de controlador, composição/rotas, ambiente Node/WebGL e imports/assets.

O traje acrescenta uma textura de 32² e três peças de detalhe; membros divididos acrescentam geometria/draw calls ao operador. Os contadores de câmeras ambientais (sem personagem) não medem esse custo. Chromium/SwiftShader é renderização por software, não benchmark de FPS de GPU real.

## Como pedir melhorias visuais

### 1. Modelagem / silhueta 3D

Muda a forma e o volume: rosto/capacete, mãos, ombreiras, asas, proporção e acessórios. Exemplo: **“Refine o modelo low-poly do X10, com mochila de propulsão e asas mais legíveis, mantendo tamanho físico e paleta.”** Uma folha de sprites não fornece esse volume nem revela automaticamente o lado de trás.

### 2. Textura pixel art e atlas UV

É a pintura aplicada sobre o volume: placas, costuras, desgaste, símbolos, madeira, pedra. Um atlas UV reúne regiões dessa pintura numa imagem; não é uma sequência de animação. Exemplo: **“Crie um atlas pixel art do traje do X10, com placas douradas, juntas escuras e luz ciano, sem ruído excessivo e sem esticar os pixels.”** O atlas precisa ser mapeado na geometria. Uma imagem bonita gerada isoladamente não resolve UVs, costuras ou transparência.

### 3. Animação do modelo

Muda poses e transições: corrida com peso, joelhos, impulso de decolagem, aterrissagem, curvas e nado. Exemplo: **“Melhore a decolagem e a frenagem do X10, com braços e pernas acompanhando o impulso, sem mudar a física.”** Hoje animamos grupos/articulações no código; uma evolução pode importar um modelo com rig e clips. Não são necessários sprites por frame para girar a câmera ao redor desse modelo.

### 4. Sprites, flipbooks e billboards no 3D

São imagens em planos: fumaça, faíscas, brilho, folhas, pequenas flores e efeitos de água. Uma spritesheet/flipbook pode conter os quadros de uma animação; um billboard orienta o plano para a câmera. Exemplo: **“Adicione uma folha de sprites de exaustão ao X10, com poucos quadros, fundo transparente e partículas limitadas.”** É preciso integrar quadros, duração, transparência, descarte, profundidade e orçamento; a imagem não se anima sozinha. Muitos planos transparentes sobrepostos podem ser caros e apresentar ordenação ruim.

### 5. Vida do cenário e câmera

Vento nas copas, fauna distante, embarcações, luzes, pequenas interações e som ambiente combinam técnicas, não só sprites. Exemplo: **“Dê vida apenas à região do píer com balanço leve de cordas, aves distantes e espuma animada, preservando rotas e desempenho.”** Para câmera: **“Aproxime o enquadramento na caminhada e reduza a antecipação no voo, sem perder a órbita manual.”**

### 6. O jogo 2D continua separado

Para personagens/NPCs 2D, continuam fazendo sentido as folhas de sprites por direção/ação, com tamanho de frame, ponto de apoio, FPS e paleta coerentes, como nas etapas anteriores. Não é necessário refazer a arte 2D para melhorar os modelos 3D, nem trocar tudo por um único formato.

**Formato útil de pedido:** região/personagem + referência visual + o que mudar + o que preservar + estados/direções necessários + limite de custo. Antes de gerar muitos assets, aprovar uma amostra já integrada no jogo reduz retrabalho. Podemos produzir folhas em lotes de dez quando esse for o recurso certo; não é necessário gerar dez imagens para cada ajuste geométrico ou de animação.
