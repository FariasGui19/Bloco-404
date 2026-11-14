# Frequência 66.6 — Cidadela Retro-FPS

A Estação continua sendo o ponto de partida e retorno. As três âncoras, o
console e a confirmação no anel são requisitos; saves antigos que já têm
`freq666_limiar_preparado` entram diretamente. A cena inicial é pulável e o
save antes da transição continua na estação. O destino é um mapa registrado,
com adaptador de perspectiva, colisão e combate próprios; não altera o kit ou
inventário do operador.

## Visão geral e estado atual

A Cidadela é uma missão compacta e revisitável em primeira pessoa, com anexos
opcionais; não é uma dimensão aberta completa. Este documento reúne tanto o
conteúdo jogável quanto os limites do trabalho visual em andamento.

| Parte | O que já existe |
| --- | --- |
| Acesso e retorno | Preparação na Estação 66.6, confirmação de travessia, transição nos dois sentidos e saída livre junto à chegada. |
| Missão principal | Três registros com eclusas e checkpoints, exploração com cobertura, inimigos, Vigilante, desfecho legendado, recompensa única e revisita. |
| Arquivos e memória | Três arquivos, três CRTs, leituras por arquétipo, Ecos entre Tempos e terminal de escuta; registros podem ser revistos. |
| Pós-vitória | Rede de Escuta, Vozes na Estática, três fendas com cofres, simulação repetível e Oficina da Vigília com ensaio sem XP adicional. |
| Combate e progressão | Quatro módulos adaptados, radar, impulso, Ultimate, ressonância/Echovore, munição e recarga, proteção e quatro estágios de sintonia local por arquétipo. |
| Apresentação | Raycaster 2.5D, cenários e sprites, HUD nítido, avisos textuais, rádio, diário, pausa, transições ilustradas e sons opcionais. |
| Persistência | Marcos, missões e recompensas únicas são salvos; ameaças, suprimentos e bônus temporários seguem regras da visita. Saves anteriores são migrados sem repetir recompensas. |
| Acessibilidade | Avisos não dependem apenas de cor ou áudio; movimento reduzido elimina oscilações decorativas e mantém sinais de combate. |

### Em aprimoramento e próximos focos

1. **Consistência das animações:** agora há vistas frontal, lateral aproximada
   e costas para os três tipos de inimigo comuns, além dos quadros de ação;
   faltam poses desenhadas por direção para cada passo, ataque, dano e queda.
   O lateral do Imp é uma aproximação, não um perfil perfeito.
2. **Resposta e legibilidade em combate:** melhorar transições entre poses,
   avisos e efeitos sem tornar a mira ou as mensagens menos legíveis; continuar
   verificando bloqueios, pausa e movimento reduzido.
3. **Validação visual e desempenho:** testar em navegadores e dispositivos
   reais, resoluções menores e cenas com mais entidades. Os testes automatizados
   e capturas headless não substituem essa avaliação.
4. **Expansão de conteúdo:** deixada para depois da consolidação da base; o
   mapa atual e suas rotas permanecem os mesmos nesta etapa.

As seções seguintes descrevem as regras e os limites já implementados. Os
itens acima são prioridades, não uma promessa de conteúdo futuro.

## Controles e percurso

- WASD desloca; setas horizontais ou mouse capturado giram. Clique na tela
  captura o mouse; Esc libera o cursor. Segurar espaço ou clique dispara em
  sequência; um toque curto dispara uma vez.
- E interage, T recarrega, Shift dá impulso, Q usa o módulo, R mostra o radar,
  F ativa a Ultimate a partir do nível 3. Shift impulsiona na direção de
  WASD (para frente se parado), com recarga independente de Q. P pausa, L
  consulta os registros, J abre as missões da Cidadela, K mostra a sintonia local, M liga/desliga os efeitos sonoros opcionais e
  Esc libera o cursor e pausa o combate. Perder o foco também pausa. A seleção
  de ferramenta, custo e recarga da Ultimate são respeitados. Sobrecargas
  de linha e avanço atingem em cone frontal; as outras atuam em área. Guarda
  protege temporariamente, e os bônus de dano, velocidade, energia e cura
  da ferramenta funcionam somente durante esta visita.
- O canhão tem 12 disparos. O pulso de um predador Echovore interrompe a
  recarga temporariamente; uma recarga tática conserva as balas restantes e
  pode ser cancelada disparando, inclusive sob bloqueio. O indicador mostra a
  recarga e seu progresso; durante o bloqueio a barra fica congelada e o texto
  informa que a **recarga**, não o disparo restante, está bloqueada. A saída
  não é bloqueada.
- Registros **◆ Azul**, **▲ Amarelo** e **■ Vermelho** abrem as eclusas
  correspondentes e são checkpoints persistidos. O radar indica caminho e
  ameaças; os símbolos e as mensagens funcionam sem depender da cor.
- Três terminais opcionais contêm fragmentos de Origem, Retorno e Memória.
  Use E para registrá-los; eles aparecem em L e no radar até serem encontrados.
  Completar os três concede 30 XP base uma única vez, inclusive entre visitas e
  saves. Esses arquivos não são as âncoras da estação nem abrem eclusas.
- Três CRTs opcionais, na entrada, galeria e forja, mostram uma silhueta em
  linhas com vazio retangular no rosto. E registra cada transmissão e permite
  revê-la. A primeira inicia **Entre Linhas**; os três CRTs concedem 45 XP base
  uma vez. A leitura de cada arquétipo é diferente, mas não confirma a
  identidade de Nulo, do emissor ou do Arquivo 0. O rádio enfileira leituras
  após os registros das eclusas, sem pausar a ação. L informa quantos CRTs
  foram examinados; R os marca com contorno violeta até serem registrados.
- As salas possuem pilares de cobertura e suprimentos de vida que são
  recolhidos ao passar por eles quando há dano; cada um é usado uma vez por
  visita. Imps e orbes indicam visualmente a preparação dos disparos.
- No reator, o Vigilante telegrafa a rajada, dispara e abre o núcleo por três
  segundos. A blindagem bloqueia tanto tiros quanto habilidades. Derrotá-lo
  estabiliza o reator, conclui `embarque_dimensional` e concede XP uma única
  vez. Os tiros exigem mira horizontal próxima ao centro do núcleo; o corte
  e a Ultimate também exigem que o operador esteja voltado para ele. A cena de desfecho é legendada e pulável; se a partida for interrompida
  antes de concluir a cena, ela reaparece ao carregar. Depois da cena o jogo
  fica pausado para o jogador retomar. A cidadela estabilizada pode ser
  revisitada sem reaparecerem inimigos automaticamente; o reator pode ser
  examinado e o anel da estação reconhece a vitória.
- A saída próxima ao começo retorna à Estação 66.6 durante ou após a missão.
  Na morte, o operador retorna ao último checkpoint com vida parcial. A vida,
  energia e inimigos seguem a convenção de sessão do jogo; ao carregar o save,
  o mapa e os registros persistem, mas os inimigos da tentativa retornam.

## Sintonia local por dimensão e arquétipo

A Cidadela possui quatro estágios de **sintonia**, independentes de XP e dos
níveis do mundo principal. K pausa e mostra marcos, próximos limites e duas
adaptações específicas do arquétipo. Elas agem apenas no modo FPS; não alteram
o inventário, o kit global ou o custo da Ultimate. S1 é inicial; S2 exige 4
marcos, S3 exige 9 e S4 exige 14, de um total de 23. S3 reduz a recarga de
Shift de 3 para 2,4 segundos.

| Arquétipo | S2 | S4 |
| --- | --- | --- |
| Maré | Q concede escudo de 1,2 s | R desacelera por mais tempo e produz menos eco |
| Núcleo | Q avança mais e concede escudo de 1 s | R carrega o próximo tiro com +12 de dano por até 5 s |
| Domínio | Q aumenta alcance e dano do corte | R concede 0,8 s de guarda |
| Bio-Forja | Q amplia o escudo para 3,5 s | Q recupera até 8 de vida |

Os marcos únicos são os três registros de eclusa, três arquivos, três CRTs,
reator, duas missões da rede, três fendas seladas, três cofres, a primeira
simulação concluída, três ecos de memória e a oficina restaurada. Repetir leituras ou treino não aumenta a sintonia; treino
nunca paga XP repetível. A evolução é salva em `dimensionProgress` por ID de
mundo e arquétipo. As conquistas do mundo continuam compartilhadas pelo perfil:
se outro kit for selecionado, seus marcos existentes são sincronizados para o
registro próprio desse kit. Saves anteriores são migrados a partir de flags e
missões concluídas, sem executar missões ou entregar recompensas novamente.
O registro é extensível, mas **somente a Cidadela** tem um catálogo local hoje.

A morte ou o abandono de uma tentativa não encerra a missão principal: o
operador pode voltar, explorar arquivos e CRTs pendentes e tentar novamente,
mantendo marcos já salvos. O jogo ainda não define um desfecho de falha
definitiva; missões da rede e fendas são pós-vitória, não um conteúdo de falha.

## Ecos entre tempos

Três cristais de memória habitam a entrada, a galeria e a forja, acessíveis
conforme as eclusas são abertas, antes ou depois da vitória. O radar [R] marca
os ecos pendentes com círculos: aproxime-se, use R e pressione E durante a
janela de quatro segundos do radar. E sem leitura ativa explica o procedimento;
um eco já sintonizado pode ser relido sem gastar radar. O primeiro inicia
**Ecos entre Tempos**; cada eco é um marco de sintonia local e os três juntos
concedem 50 XP base uma única vez. Cada primeira sintonização restaura até 8
de energia e ancora o sinal por 12 segundos: durante esse tempo Q, R, Shift e
F geram 30% menos eco (o R usado para ler o cristal já foi pago). O indicador
no HUD mostra o tempo restante. Reler não renova o efeito; pausa congela o
relógio, morte ou saída encerram-no, e a memória salva permanece. Após a
vitória não há geração de eco, mas a restauração de energia ainda funciona.
Cada arquétipo comenta os vestígios de forma própria em rádio, sem pausar o
combate. Os fragmentos situam um pedido, uma falha e uma retirada, mas não
identificam a pessoa por trás do sinal. L mostra a
contagem e o Códex registra a missão; R continua aumentando a ressonância e
pode atrair o Echovore antes da vitória.

Concluir os três ativa o **terminal de escuta** junto à entrada: E remove até
35 de eco e restaura até 25 de energia, com recarga de 45 segundos de jogo;
não consome a recarga quando ambos já estão no máximo de segurança. O terminal
não dá XP nem cura e a recarga é temporária, reiniciando ao sair e entrar na
Cidadela. A pausa congela o relógio. Cristais e relés ambientais flutuam
suavemente, mas permanecem estáticos com movimento reduzido. A rota principal
e a saída não dependem desta atividade.

## Exploração após a vitória

Na própria arena, converse com NEXO-04 para iniciar **Rede de Escuta** e
restaure três relés nas salas anteriores em qualquer ordem. Volte à sonda para
confirmar a rede. Em seguida, consulte o transmissor na arena para iniciar
**Vozes na Estática**: ouça três caixas e volte ao transmissor. J mostra
objetivos e R destaca o próximo conjunto em amarelo; E relê os registros.
Cada missão concede XP base uma única vez e é salva em `questLog`; seus textos
não revelam a identidade de Nulo ou Arquivo 0. O Códex fora da Cidadela também
mostra as missões iniciadas.

Além dessas missões, as três **Fendas Residuais** oferecem desafios opcionais
nos setores Entrada, Galeria e Forja. Use E na fenda para iniciar duas ondas:
há dois segundos de preparação por onda, nascimentos afastados do jogador e um
pulso com aviso antes de disparar. Ele exige linha de visão, não atravessa
paredes e não dispara quando o operador está muito próximo da fenda. E na
fenda cancela; morrer ou sair da dimensão também cancela a tentativa. Não há
paredes ou saída bloqueadas. Uma fenda selada persiste e abre o acesso ao cofre
do setor; cada cofre concede 20 XP base uma vez, e a conclusão dos três dá mais
90 XP base pelo diário. R marca fendas não seladas e cofres pendentes com
contornos distintos; o terminal na arena informa o total e J mostra o resumo.
A missão aparece no Códex depois que a primeira fenda é iniciada. Não há nova
recompensa ao reler um cofre, inclusive depois de salvar e voltar.

### Oficina da Vigília

Depois da vitória, duas comportas ao sul da entrada e da forja abrem acesso a
duas salas interligadas. É um anexo opcional com caminhos de ida e volta, não
uma nova dimensão separada; as comportas estão fechadas antes do reator. O radar
[R] inclui a oficina e destaca controles pendentes com triângulos alaranjados;
J mostra o progresso e o Códex acompanha a missão iniciada.

Três circuitos podem ser regulados em qualquer ordem com E durante a janela
segura. Cada emissor segue um ciclo: 3 segundos seguros, 1 de aviso e 1 ativo;
o HUD e a legenda do emissor indicam a fase, inclusive com movimento reduzido.
O pulso ativo causa 10 de dano próximo ao emissor e exige linha de visão; guarda,
escudo e invulnerabilidade funcionam normalmente. Cada circuito regulado
silencia seu emissor e persiste. O terminal confirma a restauração após os três,
entrega 80 XP base e um marco de sintonia uma única vez. Os registros falam de
uma equipe que cuidava de rotas de retorno, sem confirmar a identidade do sinal.

Após a restauração, use E na sentinela sentada para iniciar ou cancelar um
**ensaio opcional repetível**: os três circuitos e perigos retornam apenas na
visita atual. Regular os três conclui o ensaio sem XP ou marcos extras; morrer
ou sair cancela a tentativa, sem apagar a restauração. Ensaio, fenda e simulação
não podem ser iniciados simultaneamente. O caminho de saída não é bloqueado.

Um núcleo de simulação na arena cria três ecos de combate por ativação; E no
núcleo encerra a simulação. É repetível, não paga XP e não recria o Vigilante. A simulação e uma fenda
não podem estar ativas ao mesmo tempo.
A saída continua livre e o progresso das missões sobrevive a saída e reentrada.
É exploração de um mapa compacto e revisitável, não um mundo aberto procedural.
A passagem nos dois sentidos usa fundos próprios e um anel animado; movimento
reduzido mantém o anel estático, com as mesmas informações textuais.

## Ressonâncias e Echovore

O Q do Maré impulsiona e desacelera inimigos próximos; Núcleo ganha um impulso
mais longo; Domínio usa um corte frontal; Bio-Forja ganha impulso e escudo.
Cada um modifica a aparência do canhão. O R mostra o radar para todos; seu
sonar desacelera ameaças próximas, a leitura de vetores elimina supressão,
o diagnóstico Bio concede escudo curto e a postura de Domínio proteção maior.
Q, R, Shift e F acumulam ressonância; no limite o Echovore cria um predador com limite de
entidades e intervalo entre sínteses. Seus pulsos bloqueiam recarga e, conforme
o arquétipo, puxam o Maré, limitam a velocidade do Núcleo, rompem o escudo da
Bio ou interferem no Q de Domínio. O sistema cessa após a estabilização.

## Arquitetura e limites

`js/game/cidadela-fps.js` contém o runtime e raycaster 2.5D, projetado em um
buffer fixo de 480×270, com sprites billboard, DDA, profundidade e colisão de
círculo. A interface é composta em uma camada de 960×540 sobre o mundo para
letras mais nítidas, preservando a pixelização do cenário. Ícones de vida,
munição, energia e eco acompanham rótulos e valores, sem depender apenas de cor.
O mapa é carregado sob demanda pelo registro; as texturas, canhões,
terminais e inimigos são carregados apenas ao entrar, com desenhos procedurais
de fallback. O teto e piso usam traços leves, sem floor casting. As artes de
origem e o script de preparação estão em `assets/source-art/cidadela-404` e
`tools/preparar-cidadela-sprites.py`; os sprites de jogo são carregados sob demanda.
Os elementos cenográficos são visuais, não bloqueiam movimento nem protegem
contra tiros; somente os pilares da geometria fornecem cobertura.
Os quatro canhões têm pose de disparo; Imps, orbes, predadores e Vigilante
exibem poses de ataque vinculadas aos ciclos reais e um segundo quadro na
preparação; a fenda destaca visualmente o aviso de pulso. A saída, o terminal
de escuta ativo e o cristal lido com radar recebem brilhos discretos. Em
movimento reduzido, os quadros adicionais e brilhos decorativos ficam imóveis
ou desativados, mas o aviso da fenda e as legendas permanecem. As imagens são
quadros aproximados, não uma animação direcional completa; Imps, orbes e predadores
também têm poses de dano, início de queda e colapso, além de dois quadros
aproximados de locomoção. O aviso de ataque tem prioridade sobre a reação de
dano; em movimento reduzido a queda intermediária é omitida, mas a reação de
dano e o aviso permanecem. A passada recebe deslocamento discreto das pernas,
enquanto orbes alternam quadros de voo. As dez artes deste refinamento são as
seis poses de dano/queda e os quatro pictogramas da interface. Na etapa seguinte,
seis artes acrescentam vistas laterais aproximadas e de costas a Imps, orbes e
predadores; a outra lateral é espelhada. A orientação gira gradualmente enquanto
o inimigo vê o jogador e é conservada quando ele perde a linha de visão. É uma
orientação **visual**: perseguição, colisão e direção dos disparos continuam
calculadas pelas posições reais. Avisos de ataque, dano e queda têm prioridade
sobre as vistas; em movimento reduzido as vistas continuam indicando orientação,
mas sem balanço ou passada animada. Quatro artes do Vigilante distinguem o aviso
antes da rajada, dois quadros de núcleo exposto e a reação ao dano. A blindagem,
as janelas reais de vulnerabilidade, o texto e a barra de vida não mudam; em
movimento reduzido o núcleo exposto fica no primeiro quadro.
Os quatro canhões alternam repouso, disparo e um quadro ilustrado de retorno;
o balanço da arma acompanha a distância realmente percorrida, assenta ao parar e
não avança contra paredes ou durante a pausa. Há recuo e uma pose de recarga
por arquétipo; o disparo tem prioridade, a pose não avança durante bloqueio e
movimento reduzido usa a arma parada com o indicador textual. O som opcional
inclui passos ligados ao deslocamento e sinais discretos de recarga. Q e Ultimate
mostram emblemas próprios por arquétipo, e o dano recebido acrescenta sinais
nas bordas sem encobrir a mira. A travessia dimensional usa um anel ilustrado
em entrada e retorno. As dez artes de base incluem quatro quadros de retorno,
quatro emblemas, um sinal de dano e o anel; seus originais e versões processadas
seguem o mesmo pipeline dos demais sprites. No acabamento seguinte, dez artes
adicionais fornecem quatro poses de recarga, um suprimento, três ícones de
estado/interação e dois impactos distintos para metal e blindagem. Os impactos
usam desenhos alternativos enquanto as imagens não estão disponíveis. Textos de
interação são quebrados em linhas e proteção, vetor e sinal podem aparecer
juntos. CRTs alternam poses lentas e geradores e reatores têm
pulsos suaves. As fendas não seladas respiram com uma oscilação suave. Projéteis têm pulsação,
impactos desaparecem após pouco tempo e eclusas têm varredura lenta. As poses
geradas são aproximações; as vistas direcionais ainda não cobrem todos os
quadros de ação. A preferência
do sistema por movimento reduzido desativa recuo, oscilação, pulsação e
varredura, balanço da arma, passos visuais, pulsos dos equipamentos,
alternância dos CRTs e oscilação de fenda (mantendo os avisos de combate). Os inimigos sinalizam ataques sem depender de áudio; arcos e traços de
ressonância identificam Q, R e F sem efeitos estroboscópicos de tela cheia.
Disparos e habilidades têm emblemas por módulo; pulsos de orbe e Echovore
recebem artes e rastros distintos, sem alterar suas regras de colisão.
A estação inclui a projeção de Nulo no CRT e registros legendados. Há efeitos
sonoros sintetizados opcionais, desligados por padrão; M alterna e salva a
preferência neste navegador, sem depender de áudio para entender o combate.
Não há voz ou trilha musical nova. Os comandos em tela ocupam duas linhas,
sem compressão horizontal; mensagens longas são quebradas em linhas maiores.
A tela de pausa continua oferecendo os controles completos.

Esta é uma primeira missão de escopo compacto, não uma reprodução de DOOM 1993:
não há verticalidade livre, suporte a controle/tela sensível ao toque,
um conjunto direcional completo de animações de inimigos ou mundo aberto extenso. A cena final usa
quadros narrativos em vez de uma animação cinematográfica. A Ultimate é uma adaptação 2.5D,
sem reproduzir todos os efeitos de cenário de outras perspectivas.
A tela é desenhada em Canvas e o teste headless não substitui testes visuais e
de desempenho em navegadores e dispositivos reais.

Execute `node --experimental-default-type=module tests/cidadela-fps.mjs`,
`tests/cidadela-polimento.mjs`, `tests/cidadela-animacao.mjs`, `tests/cidadela-final.mjs`,
`tests/cidadela-percurso.mjs`, `tests/cidadela-combate.mjs`,
`tests/cidadela-audio.mjs`, `tests/cidadela-pos-vitoria.mjs`,
`tests/cidadela-transicao.mjs`, `tests/cidadela-fendas.mjs`,
`tests/cidadela-fendas-arquetipos.mjs`, `tests/cidadela-imersao.mjs`,
`tests/cidadela-hud.mjs`, `tests/cidadela-passos.mjs`, `tests/cidadela-progressao.mjs`, `tests/cidadela-ecos.mjs`, `tests/cidadela-animacoes-sinal.mjs`, `tests/cidadela-vigilia.mjs`, `tests/cidadela-travessia.mjs`, `tests/cidadela-base-animacoes.mjs`, `tests/cidadela-refino-visual.mjs`, `tests/cidadela-acabamento.mjs` e `tests/cidadela-vida.mjs` para verificar regras, rotas, pausa, registros,
desfecho, saves e retorno. O teste de percurso percorre o mapa a pé e usa
invulnerabilidade para isolar navegação e progressão do balanceamento. A suíte completa usa o comando documentado no README.
