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

## Referências de evolução (decisão atual)

As artes de seleção de Domínio, Maré e Núcleo representam conceitos dos trajes/formas **completos de nível 2**, não sprites prontos do nível 1. Para o nível 1, mantenha identidade e materiais, reduzindo volume, ornamentação e potência aparente. O Domínio deve crescer de uma configuração inicial para uma silhueta heroica e imponente, com ombros e postura monumentais, inspirada na sensação de força de heróis de fantasia, sem copiar personagem existente. Sua espada inicial é pequena; não substituí-la por punhos. As poses atuais de Q são recortes temporários de referência nível 2, não o traje definitivo do personagem.

## Cenários para as câmaras de missão

Prompts para assets distintos; usar a mesma perspectiva isométrica e iluminação do Hub 404. Criar backgrounds sem texto, personagem ou interface; não assar portas, fragmentos ou obstáculos no fundo, pois devem permanecer interativos. Exportar camadas separadas com transparência real e dimensões/alinhamento a definir após teste no jogo.

**Domínio — Câmara de Frequência:** sala subterrânea de manutenção do aeroporto, arquitetura industrial com pilares de basalto negro, círculos de runas douradas gravadas em anéis concêntricos e fraturas geométricas discretas; um lacre metálico de frequência ocupa o corredor central. Luz âmbar contida e poeira suspensa, leitura clara da rota. Criar o lacre em sprite separado, fechado e rompido, com rachaduras poligonais luminosas e ponto de impacto reconhecível.

**Maré — Câmara de Fluxo:** galeria de recirculação sob o aeroporto, canais rasos transparentes entre passarelas industriais, janelas com água profunda e ecos bioluminescentes ao fundo, reflexos ciano e azuis, sem transformar o piso em vazio azul. No corredor, um fluxo de água suspensa preso por um aro; sprite separado com estado contido e corrente desviada, legível sem parecer um escudo.

**Núcleo 10X — Câmara de Eco Cinético:** laboratório abandonado de calibração dimensional, anéis incompletos e trilhas holográficas verde e âmbar, cabos e marcadores de aceleração no chão, silhuetas de formas desconhecidas sugeridas em monitores apagados. Obstáculo separado: malha energética com padrão cinético interrompido, estados estável e dissipado; sem logotipos ou reprodução de interfaces de franquias.

**Interface própria do Núcleo:** projetar overlay radial circular original para selecionar formas, com núcleo central, segmentos vazios para descobertas futuras, um único segmento da forma veloz inicial, estados selecionado/indisponível e símbolos sem texto. Não usar a interface como roupa tática. Definir depois interação, duração e custo de forma rápida versus sustentada; Q rápido deve continuar a retornar ao operador.

## Estado e pendências de implementação

- As três câmaras do aeroporto são protótipos de layout e usam props existentes; os desafios compartilham a estrutura de leitura R, ação Q e coleta, mas têm identificação, falas e obstáculos próprios. Criar arte e mecânicas realmente distintas, além de revisão visual em jogo.
- T da Bio continua funcional. Domínio e Maré usam as novas poses estáticas de traje nível 1; faltam caminhada, transições e refinamento visual. Núcleo possui seletor radial e uma forma veloz sustentada experimental; não recebeu um toggle de armadura.
- Os Q de Domínio e Maré usam as novas sequências quando o traje está ativo; em modo rápido conservam as poses provisórias anteriores. Faltam sequências direcionais consistentes para ambos os modos.
- A linha do metrô pode ser calibrada pelos quatro arquétipos. Maré e 10X já possuem caminhos próprios até a ilha central; faltam soluções para Bio e Domínio além da primeira ilha, preservando R→E e saves antigos. O trilho/trem na praia também precisa de um posicionamento coerente, sem atravessar areia.
- Validar visualmente no navegador, testar colisões, câmera e feedback em cada rota, incluindo retorno ao aeroporto e saves antigos; ajustar escala dos props. Ampliar falas, interação e cenografia ao substituir protótipos.

## Atualização — folhas recebidas

Os novos trajes de Domínio e Maré nível 1 e as folhas Q/R foram integrados experimentalmente. Os arquivos de origem são JPEGs com quadriculado desenhado; `tools/prepare-archetype-sheets.py` gera PNGs com remoção aproximada do fundo, podendo remover pontos claros e deixar artefatos. As folhas de Q usam sequências fornecidas em uma orientação, espelhadas à esquerda, e não substituem animações direcionais completas; o Q é curto e os frames precisam de teste e ajuste visual. No R do Domínio, usam-se poses direcionais da folha, não uma sequência temporal. No R de Maré, as poses foram usadas como sequência experimental, embora mudem de orientação. Os trajes são poses estáticas também durante a caminhada, pois não foram fornecidos ciclos de andar. Com roupa civil, mantêm-se os efeitos anteriores; as novas folhas de habilidade aparecem com o traje ativo. O T do Núcleo 10X continua reservado para o seletor próprio.

Para roteiros, prompts de expansão da praia, floresta, fauna, backgrounds e interface 10X, ver [visão do arquipélago](visao-expansao-arquipelago.md). Os itens seguem sujeitos à revisão visual em jogo.

## Novas folhas de locomoção necessárias

As artes de traje recebidas mostram poses paradas, não passadas sequenciais. O jogo agora aplica balanço procedural leve ao se deslocar; isso é um recurso provisório, não animação de pernas. Para cada arquétipo (Domínio e Maré primeiro; depois forma do 10X), pedir uma folha por direção e validar cada uma antes de produzir as demais:

```text
Sprite sheet original para jogo isométrico pixel art Bloco 404. Use a imagem
anexada como referência obrigatória de personagem e traje nível 1, preservando
rosto, paleta, silhueta e proporções exatas. Uma única direção de caminhada,
começando com perfil direito, quatro quadros temporais distintos: contato do
pé direito, passagem, contato do pé esquerdo, passagem. Pernas e braços devem
mover-se de verdade, pés no mesmo nível e personagem no mesmo centro e escala.
Uma figura inteira por célula, sem sobreposição ou corte, fundo PNG com alpha
verdadeiro, NÃO desenhar quadriculado. Sem texto, sem grade, sem sombras
embutidas; efeitos e equipamentos separados. Depois repetir para frente,
costas e esquerda mantendo a mesma escala e sequência.
```

## Núcleo 10X — interface radial para acabamento futuro

A roda usa formas geométricas em CSS, com uma forma disponível e espaços bloqueados. T abre; Espaço, Enter, E ou clique transformam; T/Esc cancelam. Reabrir e confirmar retorna ao operador. A forma sustentada é um protótipo visual temporário; Q rápido ainda funciona em modo civil e retorna ao operador. Outras formas e balanceamento permanecem pendentes. Para futura arte de produção:

```text
Interface radial original para o Núcleo 10X de Bloco 404, ficção científica
pixel art sofisticada e legível. Mostrador circular holográfico visto de frente,
camadas separadas para aro exterior segmentado, aro interno, núcleo central,
ícone abstrato da forma veloz e marcadores de formas ainda bloqueadas. Energia
verde-esmeralda e acentos âmbar, mecanismos dimensionais, hierarquia clara,
contraste forte e detalhes luminosos contidos. Cada peça isolada em PNG com
transparência real; sem personagem, números fixos, texto, marcas, logotipos,
quadriculado ou cópia de interfaces de franquias. Não incluir fundos opacos.
```

As novas folhas 10X também chegaram em JPG com transparência simulada. A remoção é aproximada, podendo perder brilho; o cone da leitura invade a célula vizinha e contém quadriculado colorido, por isso não é usado na animação atual. Pedir originais em PNG com alpha e efeitos independentes, mais direções alinhadas. A arte estática do operador 10X foi armazenada como referência, mas T **não** veste armadura: abre a interface própria.

## Atualização — caminhada vertical da Forma Veloz (PNG com alpha)

A forma sustentada do Núcleo 10X passou a ter **quatro direções de
locomoção**. As folhas laterais continuam sendo `veloz-lateral.png`
(6 × 4) e `veloz-ataque-alternativa.png`; as duas direções que faltavam
foram geradas e tratadas:

- `assets/source-art/proximas-animacoes/veloz-andar-frente.png` → `assets/sprites/player/player-10x-veloz-andar-frente.png`
- `assets/source-art/proximas-animacoes/veloz-andar-costas.png` → `assets/sprites/player/player-10x-veloz-andar-costas.png`

Cada folha final tem **4 quadros em uma linha** (1024 × 256, células de
256 px), RGBA com transparência real, apoio dos pés em `y = 208` — o mesmo
das folhas laterais — e centro da cabeça fixo em `x = 128`. O ciclo de
4 quadros roda a 140 ms por quadro, então a velocidade da corrida não muda
ao trocar de eixo. Prévia: [`animacao-forma-veloz.gif`](animacao-forma-veloz.gif).

O gerador entregou fundo magenta chapado e, na folha frontal, uma tira
extra de miniaturas abaixo da sequência. `tools/preparar-veloz-caminhada.py`
recorta a faixa útil, remove o magenta com alpha real e despill de borda,
normaliza escala e alinhamento e grava as duas folhas. Para regerar:

```bash
python3 tools/preparar-veloz-caminhada.py
```

`js/data/veloz-animation.js` escolhe a folha pela direção e devolve
`cols`/`rows` junto do quadro; o renderer deixou de assumir 6 × 4 fixo.
O golpe direcional para cima/baixo continua usando a folha lateral como
pose provisória — a sequência de ataque vertical ainda não existe.

Ainda pendentes para fechar a locomoção do Núcleo: ataque básico vertical
próprio, transição entre corrida e ataque sem troca de escala e revisão de
escala contra os props no chão da Enseada e da Estação Bio.
