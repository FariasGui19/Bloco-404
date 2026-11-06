# Briefing inicial — Q e R dos arquétipos

Conceitos para aprovar e prototipar; **não representam habilidades implementadas**. Use as referências do usuário: espada dourada para Domínio Ancião, água para Maré Astral, forma verde para Pulso Veloz do Núcleo 10X. IDs existentes do jogo são preservados, incluindo `postura_dominio` como ID provisório do slot R; a identidade final de R é uma leitura/percepção, não precisa ser uma postura defensiva.

## Contrato visual para cada prompt

Pixel art isométrica de jogo, mesma escala e personagem da referência, sem copiar personagens conhecidos. Animação de uma única habilidade, sem texto ou interface, quadros separados e igualmente espaçados; os pés ancorados no mesmo ponto e efeitos contidos em cada célula. Pedir quatro direções (frente, costas, esquerda, direita) e uma sequência temporal de preparação, ativação e recuperação para cada direção. Não confundir poses diferentes com quadros sequenciais; não colocar vários personagens dentro de um quadro. Exportar PNG com canal alfa real, sem fundo quadriculado pintado, sem fundo preto e sem laterais de bloco. Primeiro validar uma direção e o tamanho das células; geradores podem exigir edição manual ou exportação em quadros individuais.

## Domínio Ancião

- **Q — Golpe de Ruptura:** a lâmina de frequência se projeta com peso quase impossível; fragmentos de runas douradas circulam pela empunhadura, convergem no gume e produzem uma linha de fratura luminosa no golpe. Dar antecipação, impacto e recuperação; o brilho não deve esconder a silhueta ou os pés.
- **R — Leitura de Frequência:** o guerreiro aproxima a lâmina do chão e ouve uma vibração ancestral. Anéis dourados descontínuos e runas abstratas se espalham como uma leitura geológica, revelando fissuras e vestígios invisíveis; os sinais são sugestões visuais, não letras legíveis.

## Maré Astral

- **Q — Passo de Corrente:** um arco de água luminosa envolve as pernas e se desenrola numa fita líquida, impulsionando o operador numa postura de artes marciais aquáticas. Pequenas gotas e reflexos devem reforçar a direção do impulso sem cobrir o corpo.
- **R — Senso de Corrente:** o operador abre a mão sobre uma gota suspensa; linhas líquidas translúcidas pulsam ao redor, sugerindo caminhos submersos e presença de fauna. Ondulações ciano e azul formam um mapa de correntes que desaparece suavemente.

## Núcleo 10X

- **Q — Pulso Veloz:** o bracelete abre um anel de símbolos abstratos, o corpo atravessa uma breve transição holográfica verde e assume a forma veloz da referência. Ela se projeta em arrancada, deixando fragmentos de luz e retornando à pose; não criar personagens reconhecíveis. A seleção circular é um sistema separado, não precisa estar embutida em cada quadro da corrida.
- **R — Leitura de Eco:** o bracelete projeta uma lente orbital que varre o ambiente; rastros abstratos e sinais verdes aparecem em camadas, sugerindo fauna e assinaturas dimensionais. O operador continua humano e a interface deve ser visualmente diferente do diagnóstico técnico da Bio-Forja.

## Antes de gerar em lote

1. Aprovar a identidade e as ações acima; decidir se a forma Pulso Veloz é temporária ou apenas uma transformação curta de dash.
2. Validar um protótipo em uma direção antes das outras; estabelecer número de quadros, duração e dimensão de célula com base no movimento implementado.
3. Se possível enviar as referências originais sem fundo incorporado e confirmar qual armadura é a Bio-Forja. Para Bolt, fotos e traços de personalidade ajudam no conceito futuro.
