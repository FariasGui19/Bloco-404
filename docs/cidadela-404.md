# Frequência 66.6 — Cidadela Retro-FPS

A Estação continua sendo o ponto de partida e retorno. As três âncoras, o
console e a confirmação no anel são requisitos; saves antigos que já têm
`freq666_limiar_preparado` entram diretamente. A cena inicial é pulável e o
save antes da transição continua na estação. O destino é um mapa registrado,
com adaptador de perspectiva, colisão e combate próprios; não altera o kit ou
inventário do operador.

## Controles e percurso

- WASD desloca; setas horizontais ou mouse capturado giram. Clique na tela
  captura o mouse; Esc libera o cursor. Espaço ou clique atira.
- E interage, T recarrega, Shift dá impulso, Q usa o módulo, R mostra o radar,
  F ativa a Ultimate a partir do nível 3. P pausa, L consulta os registros e
  Esc libera o cursor e pausa o combate. Perder o foco também pausa. A seleção
  de ferramenta e o custo e recarga da Ultimate são respeitados; no FPS a projeção é uma onda local.
- O canhão tem 12 disparos. O pulso de um predador Echovore interrompe a
  recarga temporariamente; balas restantes ainda podem ser disparadas e a saída
  não é bloqueada.
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
  revisitada sem reaparecerem inimigos; o reator pode ser examinado e o anel
  da estação reconhece a vitória.
- A saída próxima ao começo retorna à Estação 66.6 durante ou após a missão.
  Na morte, o operador retorna ao último checkpoint com vida parcial. A vida,
  energia e inimigos seguem a convenção de sessão do jogo; ao carregar o save,
  o mapa e os registros persistem, mas os inimigos da tentativa retornam.

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
`tools/preparar-cidadela-sprites.py`; as 33 versões de jogo somam cerca de 1,7 MB.
Os elementos cenográficos são visuais, não bloqueiam movimento nem protegem
contra tiros; somente os pilares da geometria fornecem cobertura.
Os quatro canhões têm pose de disparo; Imps, orbes, predadores e Vigilante
exibem poses de ataque vinculadas aos ciclos reais. Projéteis têm pulsação,
impactos desaparecem após pouco tempo e eclusas têm varredura lenta. As poses
geradas são aproximações e não sprites direcionais quadro a quadro. A preferência
do sistema por movimento reduzido desativa recuo, oscilação, pulsação e
varredura (mantendo os avisos de combate). Os inimigos sinalizam ataques sem depender de áudio; arcos e traços de
ressonância identificam Q, R e F sem efeitos estroboscópicos de tela cheia.
A estação inclui a projeção de Nulo no CRT e registros legendados; não há voz,
trilha ou efeitos sonoros novos.

Esta é uma primeira missão de escopo compacto, não uma reprodução de DOOM 1993:
não há verticalidade livre, suporte a controle/tela sensível ao toque,
animações de inimigos por direção ou mundo aberto. A cena final usa imagens
já existentes em vez de uma animação nova. A seleção de ferramenta não muda a geometria específica de cada Ultimate no FPS.
A tela é desenhada em Canvas e o teste headless não substitui testes visuais e
de desempenho em navegadores e dispositivos reais.

Execute `node --experimental-default-type=module tests/cidadela-fps.mjs`,
`tests/cidadela-polimento.mjs`, `tests/cidadela-animacao.mjs`, `tests/cidadela-final.mjs`,
`tests/cidadela-percurso.mjs` e `tests/cidadela-travessia.mjs` para verificar regras, rotas, pausa, registros,
desfecho, saves e retorno. O teste de percurso percorre o mapa a pé e usa
invulnerabilidade para isolar navegação e progressão do balanceamento. A suíte completa usa o comando documentado no README.
