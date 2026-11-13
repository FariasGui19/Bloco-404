# Frequência 66.6 — Cidadela Retro-FPS

A Estação continua sendo o ponto de partida e retorno. As três âncoras, o
console e a confirmação no anel são requisitos; saves antigos que já têm
`freq666_limiar_preparado` entram diretamente. A cena inicial é pulável e o
save antes da transição continua na estação. O destino é um mapa registrado,
com adaptador de perspectiva, colisão e combate próprios; não altera o kit ou
inventário do operador.

## Controles e percurso

- WASD desloca; setas horizontais ou mouse capturado giram. Clique na tela
  captura o mouse; Esc libera o cursor. Segurar espaço ou clique dispara em
  sequência; um toque curto dispara uma vez.
- E interage, T recarrega, Shift dá impulso, Q usa o módulo, R mostra o radar,
  F ativa a Ultimate a partir do nível 3. Shift impulsiona na direção de
  WASD (para frente se parado), com recarga independente de Q. P pausa, L
  consulta os registros, J abre as missões da Cidadela, M liga/desliga os efeitos sonoros opcionais e
  Esc libera o cursor e pausa o combate. Perder o foco também pausa. A seleção
  de ferramenta, custo e recarga da Ultimate são respeitados. Sobrecargas
  de linha e avanço atingem em cone frontal; as outras atuam em área. Guarda
  protege temporariamente, e os bônus de dano, velocidade, energia e cura
  da ferramenta funcionam somente durante esta visita.
- O canhão tem 12 disparos. O pulso de um predador Echovore interrompe a
  recarga temporariamente; uma recarga tática conserva as balas restantes e
  pode ser cancelada disparando, inclusive sob bloqueio. A saída não é bloqueada.
- Registros **◆ Azul**, **▲ Amarelo** e **■ Vermelho** abrem as eclusas
  correspondentes e são checkpoints persistidos. O radar indica caminho e
  ameaças; os símbolos e as mensagens funcionam sem depender da cor.
- Três terminais opcionais contêm fragmentos de Origem, Retorno e Memória.
  Use E para registrá-los; eles aparecem em L e no radar até serem encontrados.
  Completar os três concede 30 XP base uma única vez, inclusive entre visitas e
  saves. Esses arquivos não são as âncoras da estação nem abrem eclusas.
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
círculo. O mapa é carregado sob demanda pelo registro; as texturas, canhões,
terminais e inimigos são carregados apenas ao entrar, com desenhos procedurais
de fallback. O teto e piso usam traços leves, sem floor casting. As artes de
origem e o script de preparação estão em `assets/source-art/cidadela-404` e
`tools/preparar-cidadela-sprites.py`; as 61 versões de jogo somam cerca de 2,6 MB.
Os elementos cenográficos são visuais, não bloqueiam movimento nem protegem
contra tiros; somente os pilares da geometria fornecem cobertura.
Os quatro canhões têm pose de disparo; Imps, orbes, predadores e Vigilante
exibem poses de ataque vinculadas aos ciclos reais; Imps, orbes e predadores
também têm pose de colapso. A arma acompanha discretamente o deslocamento, e
as fendas não seladas respiram com uma oscilação suave. Projéteis têm pulsação,
impactos desaparecem após pouco tempo e eclusas têm varredura lenta. As poses
geradas são aproximações e não sprites direcionais quadro a quadro. A preferência
do sistema por movimento reduzido desativa recuo, oscilação, pulsação e
varredura, balanço da arma e oscilação de fenda (mantendo os avisos de combate). Os inimigos sinalizam ataques sem depender de áudio; arcos e traços de
ressonância identificam Q, R e F sem efeitos estroboscópicos de tela cheia.
Disparos e habilidades têm emblemas por módulo; pulsos de orbe e Echovore
recebem artes e rastros distintos, sem alterar suas regras de colisão.
A estação inclui a projeção de Nulo no CRT e registros legendados. Há efeitos
sonoros sintetizados opcionais, desligados por padrão; M alterna e salva a
preferência neste navegador, sem depender de áudio para entender o combate.
Não há voz ou trilha musical nova.

Esta é uma primeira missão de escopo compacto, não uma reprodução de DOOM 1993:
não há verticalidade livre, suporte a controle/tela sensível ao toque,
animações de inimigos por direção ou mundo aberto extenso. A cena final usa
quadros narrativos em vez de uma animação cinematográfica. A Ultimate é uma adaptação 2.5D,
sem reproduzir todos os efeitos de cenário de outras perspectivas.
A tela é desenhada em Canvas e o teste headless não substitui testes visuais e
de desempenho em navegadores e dispositivos reais.

Execute `node --experimental-default-type=module tests/cidadela-fps.mjs`,
`tests/cidadela-polimento.mjs`, `tests/cidadela-animacao.mjs`, `tests/cidadela-final.mjs`,
`tests/cidadela-percurso.mjs`, `tests/cidadela-combate.mjs`,
`tests/cidadela-audio.mjs`, `tests/cidadela-pos-vitoria.mjs`,
`tests/cidadela-transicao.mjs`, `tests/cidadela-fendas.mjs`,
`tests/cidadela-fendas-arquetipos.mjs` e `tests/cidadela-travessia.mjs` para verificar regras, rotas, pausa, registros,
desfecho, saves e retorno. O teste de percurso percorre o mapa a pé e usa
invulnerabilidade para isolar navegação e progressão do balanceamento. A suíte completa usa o comando documentado no README.
