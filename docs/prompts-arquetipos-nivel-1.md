# Prompts de arte — arquétipos nível 1

Estes prompts são direção artística, não uma garantia de que um gerador produzirá sprites prontos para uso. **Gere primeiro um arquétipo e uma direção**, valide proporção e legibilidade no jogo e só depois produza todas as direções. As referências abaixo já estão no repositório; anexe-as ao gerador junto com o prompt correspondente.

## Referências

- Operador e Bio-Forja nível 1: [`player-bio-forja-lvl1.png`](../assets/sprites/player/player-bio-forja-lvl1.png).
- Domínio Ancião — espada e energia dourada: [`player-dominio-reference.png`](../assets/sprites/player/player-dominio-reference.png).
- Maré Astral — água ciano: [`player-mare-reference.png`](../assets/sprites/player/player-mare-reference.png).
- Núcleo 10X — bracelete, transição e criatura: [`player-10x-reference.png`](../assets/sprites/player/player-10x-reference.png). A terceira imagem é a criatura veloz; a quarta é um orbe. Ambas são conceitos, não animações sequenciais.
- Contexto de proporção do jogo: [`beach-shore.png`](../assets/sprites/tiles/beach-shore.png) e os sprites já presentes em `assets/sprites/player/`.

## Instruções comuns — anexar a cada prompt

```text
Crie arte original para Bloco 404, jogo de exploração isométrico em pixel
art. Preserve a identidade do operador da referência: cabelo curto escuro,
óculos, bigode, pele e proporções consistentes. Mesma escala e perspectiva
das referências. Silhueta legível, pés visíveis, contornos pixelados e
paleta consistente; efeito especial não pode esconder braços nem pés.
Sem personagens de franquias, logos, texto, molduras, grid ou marcas d'água.
PNG com transparência real; não desenhar tabuleiro quadriculado ou fundo
preto. Uma figura por célula, separação ampla, nenhum corte nas bordas.
```

**Para traje:** peça quatro poses estáticas em células iguais: frente, perfil direito, costas, perfil esquerdo; mesma escala, centro e ponto de apoio dos pés. Não são quadros de caminhada.

**Para Q ou R:** peça uma única direção primeiro: quatro quadros temporais iguais, na ordem antecipação, ativação, ápice e recuperação. Mesma câmera, personagem e ponto de apoio; efeitos inteiramente dentro de cada célula, sem quadros intermediários espalhados. Depois de aprovar, repetir para frente, costas, direita e esquerda, mantendo a ordem. O tamanho das células será definido após inspeção; não comprimir ou esticar a arte para encaixar. Se o gerador não respeitar grade e transparência, exportar quadros separados e alinhá-los manualmente.

## Motor Bio-Forja

**Traje nível 1:**
```text
Operador com armadura biomecânica modular de exploração: placas grafite
segmentadas, núcleo ciano no peito, encaixes industriais pequenos e detalhes
dourados discretos. Propulsores compactos nas pernas e ferramentas retráteis
nos braços. Aparência de tecnologia viva e reconstrução tática, ainda em sua
configuração inicial: funcional, não uma armadura pesada de nível máximo.
```

**Q — Propulsor de Impulso:**
```text
O traje rearranja as placas das pernas, acumula energia ciano nos propulsores
e libera uma arrancada curta. Uma trilha clara indica direção e força; a
recuperação mostra o corpo estabilizando. Não desenhar o deslocamento inteiro
em um único quadro e não transformar a lâmina em elemento principal.
```

**R — Link de Diagnóstico:**
```text
O operador projeta do antebraço uma interface industrial de diagnóstico:
pequenos anéis ciano, projeções de componentes e feixes técnicos que leem um
mecanismo invisível à frente. Começa com o braço levantando, forma o holograma,
varre e encerra a projeção. Sem texto legível nem objetos de cenário no quadro.
```

## Domínio Ancião

**Traje nível 1:**
```text
Um guerreiro dimensional heroico, monumental e imponente, inspirado na
fantasia de força e heroísmo exagerado dos mestres guerreiros clássicos,
sem reproduzir personagens conhecidos. Armadura grafite e bronze antigo,
peito e ombreiras de presença majestosa, inscrições rúnicas abstratas e luz
dourada quente. Uma lâmina de frequência ancestral grande e original, mais
larga que uma espada comum, mas proporcionada ao jogo. As quatro direções
precisam preservar a mesma identidade do operador.
```

**Q — Golpe de Ruptura:**
```text
Golpe pesado de lâmina ancestral: o operador firma os pés, puxa a espada para
trás enquanto runas douradas convergem no gume, desfere um impacto poderoso
e termina em recuperação. Um rastro dourado estreito e fissuras de energia
sugerem uma ruptura sísmica; mantenha pés e silhueta claramente visíveis.
```

**R — Leitura de Frequência:**
```text
O operador aproxima a base da lâmina do chão. Pulsos sísmicos dourados,
anéis concêntricos incompletos e sinais rúnicos abstratos revelam fissuras
invisíveis, depois se dissipam como poeira de dados. Sem trocar de roupa ou
escala durante a varredura, sem texto legível, sem objetos de cenário.
```

## Maré Astral

**Traje nível 1:**
```text
Traje leve de navegação hidrodimensional: grafite, tubos ciano com água
luminosa, detalhes de regulador abissal e curvas orgânicas inspiradas em
correntes. Ombreiras compactas e luvas de manipulação de pressão; armadura
flexível para artes marciais aquáticas, sem espada dourada ou símbolos de
franquias. Mesma identidade e proporções do operador da referência.
```

**Q — Passo de Corrente:**
```text
Arrancada fluida em postura de arte marcial: água ciano envolve as pernas,
se desenrola como fita sob pressão na direção do movimento e se fragmenta em
gotículas. Quatro fases: preparação, impulso, ápice e recuperação. A anatomia
e os pés continuam legíveis; não substituir o operador por uma onda.
```

**R — Senso de Corrente:**
```text
O operador ergue a palma e suspende uma única gota. Anéis líquidos e linhas
translúcidas azul-ciano se expandem como um mapa orgânico de correntes e
umidade, depois se dissolvem. Sem mudança abrupta de traje, proporção ou
ancoragem; sem letras ou interface textual.
```

## Núcleo 10X

**Traje nível 1 / bracelete:**
```text
Operador em visual inicial reconhecível, com um bracelete circular de Eco
tecnológico no pulso, grafite com energia verde-esmeralda e símbolos
abstratos. A identidade principal é o dispositivo, não uma armadura genérica;
permitir ver os braços e o bracelete em todas as direções. A interface de
seleção será um asset separado, não uma parte fixa do corpo.
```

**Q — Pulso Veloz:**
```text
O bracelete pisca e o operador sofre uma transformação cinética breve por
glitches verticais verdes. Ele assume uma forma original veloz, com silhueta
negra aerodinâmica, linhas verdes e membros ágeis, inspirada na terceira
figura da referência. Arranca deixando estilhaços verdes e retorna à forma
humana. Quatro quadros coerentes para uma direção, sem personagens conhecidos.
A quarta figura da referência é um orbe e não substitui o corpo da criatura.
```

**R — Leitura de Eco:**
```text
Ainda humano, o operador ativa uma lente orbital projetada pelo bracelete.
Ela circunda o braço e emite um feixe cônico; wireframes verdes e âmbar
sugerem assinatura dimensional e rastros biológicos, sem texto legível.
Preparação, abertura, leitura e dissipação, com corpo e pés estáveis.
```

A interface circular de escolha de formas, a animação de caminhada, as demais formas e os efeitos de cenário serão pedidos separadamente após definir suas mecânicas. Não substituir automaticamente folhas existentes por gerações ainda não validadas.
