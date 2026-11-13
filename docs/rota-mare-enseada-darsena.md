# Rota das Marés: Enseada ↔ Dársena

A conexão deixa de saltar diretamente entre os dois mapas. Com a comporta
aberta (`rota_livre_enseada_aberta`) e o arquétipo Maré Astral ativo, os
condutos nas duas pontas conduzem a `mar_rota_mare_astral`: duas margens
seguras separadas por mar aberto. O jogador atravessa nadando e usa [E] na
margem de destino. Pode voltar pela mesma rota; as saídas da rota permanecem
desbloqueadas para não prender um save, mesmo se o progresso for alterado.
A comporta mantém os pré-requisitos existentes de calibragem, visita e treino.

- Superfície: controle isométrico habitual; Espaço mergulha quando o
  degrau de nado permite, e Z fixa/libera o mergulho após conquistar Travessia. A barra no topo indica a posição na rota e o destino de entrada.
- Submerso (quando WebGL está disponível): A/D giram, W nada/desce, S sobe;
  Q impulsiona e R usa sonar. A câmera isométrica é o fallback sem WebGL.
- A Maré **não respira embaixo d'água**: o fôlego usa os limites, respeito e
  clima existentes. Soltar Espaço (e desativar o mergulho fixo com Z, quando usado) ou subir com S na perspectiva submersa traz à superfície; ali o
  ar se recupera, com espuma e aviso. Sem ar, permanece a subida automática
  com o custo de engolir água do sistema existente. Não há teto artificial
  sobre o mar e a rota não exige completar uma travessia em um único fôlego.
- Animais e algas são cenográficos, não atacam, não bloqueiam o nadador e não
  atribuem recompensa; têm posições determinísticas compartilhadas pelas duas
  perspectivas. Os três marcos orientam sem exigir coleta. Dez imagens novas
  compõem fauna, vegetação, bolhas e respiro. Recarregar retorna ao spawn da
  margem pela qual entrou, conforme o contrato de saves existente.
- Implementação leve: lista fixa de dez elementos, descarte por área visível
  na superfície, materiais compartilhados por espécie em 3D, sem física nem
  novos cálculos de caminho; a preferência de movimento reduzido congela os
  movimentos da fauna nova. Efeitos e HUD não alteram a progressão.

A rota destina-se à Maré Astral; rotas específicas dos outros arquétipos,
épocas climáticas especiais, missões e equipamentos alternativos são futuras.
Nenhum conteúdo da dimensão FPS foi criado aqui.

## Mar vivo e segurança do nado

A rota ganhou duas embarcações ancoradas e uma boia consultáveis com E. São
**cenográficas, não pilotáveis**, e não bloqueiam a travessia; os textos no
jogo deixam isso explícito. Ondas e respingos reagem ao mar e à chuva na
rota e na Enseada. Corais, água-viva luminosa, cardume e ruína aparecem no
fundo; a ressaca reduz suavemente a visibilidade na perspectiva submersa.
A barra da rota agora mostra clima e intensidade da corrente; a pequena seta
representa a direção da corrente real no plano isométrico, não o destino.
O ciclo de clima passa por neblina e retorna gradualmente da ressaca, sem
cortar diretamente para sol. A superfície mantém chuva e tinta existentes.

Depois de esgotar o ar na rota, a subida automática continua; para evitar
uma sequência de mergulhos acidentais sem fôlego, é necessário emergir,
soltar o comando e recuperar até quatro segundos de ar antes de mergulhar
novamente. O medidor orienta o jogador durante essa recuperação. A inércia
contra colisões é amortecida também na superfície, facilitando manobrar
junto à costa. Nenhuma mudança dá respiração subaquática nem teletransporte.

As dez novas imagens estão em `assets/sprites/mar-vivo/`; são compactas e
usadas por listas limitadas por mapa, com descarte fora da tela em 2D e
materiais compartilhados em 3D. A movimentação nova respeita movimento
reduzido. `ondasMar`, `fundoMar` e `flutuanteMar` são dados opt-in que podem
ser reutilizados por rotas futuras sem alterar o motor de nado.

## Encontros submersos

Ao mergulhar na Rota das Marés com o arquétipo, duas missões secundárias
entram no Códex [J], sem substituir a missão principal:

- **Jardim de Retorno:** recolha a rede, liberte a tartaruga próxima e
  restaure o coral. A tartaruga exige que a rede seja retirada antes. O
  socorro também alimenta a missão Salva-Vidas se ela estiver ativa.
- **Testemunhas do Azul:** observe a arraia e o peixe-guia e registre a
  pérola de eco, que continua no lugar. A observação não machuca nem captura
  os animais.

Os seis encontros só podem ser acionados em água funda, ao chegar perto e
pressionar [E]. O HUD mostra o encontro pendente mais próximo e a distância
em tiles; sua seta acompanha o rumo da câmera em 3D e a projeção isométrica
em 2D. Os anéis no fundo sinalizam locais próximos. A fauna ferida existente
tem prioridade no [E], depois vêm os encontros e depois portais/objetos,
para evitar duas ações ao mesmo tempo. Cada ação e recompensa é salva uma
única vez: a rede não reaparece, o coral fica restaurado e a tartaruga volta
a se mover. É possível interromper a tarefa para respirar ou sair e retornar.

O gesto de cuidado inclina e estende a pose do nadador com um anel de bolhas;
a subida real produz bolhas e a chegada à superfície gera espuma. Nenhum
cuidado interrompe o consumo de ar ou permite respirar debaixo d'água. Se
subir com [S] enquanto mantém Espaço pressionado, é preciso soltar Espaço
antes de voltar a mergulhar, evitando uma descida involuntária após a troca
de câmera. Estes efeitos têm duração limitada e não travam o movimento.

As dez novas artes estão em `assets/sprites/mare-encontros/`. Os dados e
regras ficam separados do renderer, as posições e flags são estáveis e as
animações têm orçamento fixo; cenários futuros podem reutilizar a estrutura
sem duplicar a física. Animais novos respeitam movimento reduzido.
