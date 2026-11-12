# Bloco 404 — bíblia narrativa: Ponto 0 e Frequência 66.6 MHz

> Direção canônica para a abertura e a primeira grande missão. Este documento
> incorpora o manifesto expandido do criador e o conecta ao jogo existente.
> **Jogável agora:** abertura em quadros, NEXO, calibração, metrô, praia,
> enseada e registro do sinal. **Planejado, não implementado:** ruptura real
> para FPS, cidadela, inimigos, chefe, recompensas e retorno livre. As imagens
> da cidadela são conceitos/cutscenes, não mapas transitáveis.

## O coração da história

O Bloco 404 é uma estação de trânsito entre realidades que deixaram de
concordar sobre a própria origem. As rotas não são apenas caminhos: são
acordos temporários entre as regras dos dois lugares. Um **eco** é o vestígio
que um desses acordos deixa quando falha; pode ser uma lembrança, uma
assinatura, uma criatura ou uma frequência. Um **Fragmento de Sincronização**
não é uma chave universal: é uma referência que permite ao metrô comparar
os dois lados e manter aberta uma rota específica.

O operador chega ao Ponto 0 sem um índice de origem recuperável. Isso não
significa que ele seja uma cópia, um escolhido ou o Operador Nulo: são
perguntas em aberto, não revelações. NEXO-04 detecta a ausência, acolhe o
jogador e admite o que não sabe. Seu humor é seco e protetor, nunca uma piada
que anule o perigo. A mensagem do **Operador Nulo** é uma intrusão, não uma
prova de sua identidade. O **Arquivo 0**, visto três segundos antes do
jogador na linha do metrô, também não deve ser identificado automaticamente
com Nulo; a coincidência é uma pista, não uma resposta.

Motivo recorrente: **uma resposta chega antes da pergunta**. Primeiro, o
registro antecipado no metrô; depois, a resposta de 66.6 MHz na enseada. O
jogador tem motivo para investigar antes de saber quem está escutando. A
frequência é um endereço diegético estranho, não uma promessa de que um rádio
comum possa sintonizá-lo.

## Princípio das perspectivas universais

A perspectiva, a física e o gênero pertencem à **dimensão, fenda ou estado de
sincronia**, nunca a um arquétipo. Qualquer um dos quatro operadores pode
atravessar qualquer lente; seu módulo define uma maneira de responder, não
uma câmera ou um mundo exclusivo. Principais lentes previstas, não limitantes:

| Lente | Uso narrativo e mecânico previsto |
| --- | --- |
| Isométrico/top-down 2.5D | Hub, diálogos, inventário, exploração e enigmas ambientais. |
| Lateral profundo/pseudo-3D | Aeroportos, estações e corredores industriais com profundidade/paralaxe. |
| 3D livre | Céus, vazio orbital, oceano profundo; inércia, voo ou nado conforme a realidade. |
| 3D analógico low-poly/PSX | Mundo explorável leve de horror cósmico, investigação e tensão; iluminação cuidadosa. |
| Retro-FPS | Fendas de código corrompido, ação frenética e labirintos legíveis. |

Outras lentes são possíveis. A HUD é uma projeção do visor do operador, ou uma
interface de terminal; cartas e menus são representações acessíveis dessas
interfaces. Uma mudança de lente precisa explicar controles, limites e
capacidades na própria experiência. Nenhum arquétipo deve perder a história ou
ter vantagem narrativa obrigatória por sua câmera de origem.

## Percurso implementado: do Ponto 0 ao limiar

1. **Novo arquivo:** a abertura apresenta o boot, o erro, o Aeroporto Central
   e o portal, com a mensagem intrusa de Nulo. O jogador avança por quadro ou
   pula. É uma representação da chegada; o controle começa no saguão existente.
2. **NEXO-04:** identifica o índice ausente sem solucioná-lo. Propõe a avaliação
   de ressonância, mas o jogador escolhe o módulo. Perguntas, escolha e
   instalação são os sistemas já existentes; nenhuma nova habilidade é dada.
3. **Prólogo — Calibração de Eco:** no Aeroporto Central, [R] diagnostica o
   terminal. Cada área de carga tem seu obstáculo e sua linguagem próprios;
   o jogador recupera o mesmo tipo de fragmento. As salas de origem e o treino
   de campo são secundários: reforçam o módulo, mas não são pré-requisitos
   artificiais da missão principal.
4. **Metrô:** instala o fragmento no painel, reativa a linha e recebe o aviso do
   Arquivo 0. A rota atual leva à Praia Inicial; a pista aponta à Enseada dos
   Ecos, acessível pela trilha existente. O ID legado da missão permanece
   `embarque_dimensional` para não quebrar saves ou sistemas antigos.
5. **Enseada:** o terminal de manutenção investiga-se com [R] por qualquer
   arquétipo. Antes da calibração do metrô, ele é uma pista, não uma passagem.
   Depois, registra 66.6 MHz e mostra uma visão da cidadela. O NEXO explica que
   a imagem não é uma travessia segura. A porta de manutenção próxima ao
   terminal abre para a **Estação 66.6** somente após o sinal ser registrado.
6. **Estação:** examinar as três âncoras ambientais [E] em qualquer ordem:
   Origem (o reator), Retorno (a linha para casa) e Memória (a resposta três
   segundos antecipada). Elas não são as chaves mnemônicas da futura cidadela.
   Um caderno opcional conta a história da equipe de escuta. Os cabos acendem
   conforme as âncoras respondem; o anel permanece inativo.
7. **Limiar:** depois das três âncoras, usar [R] no console central. NEXO
   estabiliza a janela e o anel se ilumina. Em [E], o jogador pode esperar ou
   preparar a passagem: a cena mostra o primeiro passo, e termina no corte
   imediatamente anterior ao futuro gameplay. A estação continua acessível
   como ponto seguro; não há mapa FPS nem teleporte fingido. A cena pode ser
   revista e o jogador pode sair para explorar. A missão não é concluída.

### Contrato de continuidade e saves

- Mapa: `estacao_limiar_666`, entrada na Enseada `acesso_estacao_666`,
  retorno `voltar_enseada_666`. O sinal legado `frequencia666Registrada`
  abre a porta; saves que já o registraram podem seguir diretamente.
- Âncoras `freq666_ancora_origem`, `freq666_ancora_retorno`,
  `freq666_ancora_memoria`; console `freq666_limiar_estavel`; escolha final
  `freq666_limiar_preparado`. São independentes do arquétipo e persistidas.
- A missão legada `embarque_dimensional` permanece ativa, com etapas
  `sinal_registrado` → `ancoras_em_andamento` → `calibrar_limiar` →
  `limiar_estavel` → `limiar_preparado`. Outros IDs, missões concluídas e
  etapas futuras desconhecidas não são reescritos. Não há recompensa antecipada.
- Handoff: a futura implementação deve conectar a escolha de travessia ao
  carregamento real da dimensão, tratar saves já preparados (inclusive ao
  retomar a cena) e permitir voltar à estação. Só entregar controle em primeira
  pessoa depois de mapa, controles e retorno existirem. Não criar as três chaves
  da cidadela usando as flags das âncoras da estação.

### Secundárias e tom

- **Calibração de Campo:** exercício voluntário de combate, não trabalho
  obrigatório para provar valor ao NEXO. Ecos de treino não são pessoas.
- **Forja do Propulsor / Prova da Ruptura / Calibragem de Corrente / Sincronia
  dos Vetores:** histórias das bases, com lógica R → Q → fragmento → máquina;
  são formas diferentes de lidar com instabilidade, não facções exclusivas.
- **Vestígios da Enseada e Lúmeo:** pequenas consequências locais e cuidado.
  As marcas podem ecoar o sinal sem obrigar sua coleta para a missão principal;
  Lúmeo escolhe acompanhar o jogador, não é capturado como prêmio.
- **Maré Profunda, Salva-Vidas e Aprender a Nadar:** vida e agência na costa;
  resgatar animais não é custo de entrada para a campanha.

## Storyboard de abertura implementado

| Quadro | Imagem / mensagem | Intenção sonora para produção futura |
| --- | --- | --- |
| 01 — escuro | Sistema em escuta; `assets/cutscenes/boot-sistema.png`. | Ligada suave de tubo, ruído baixo, modem 56k irregular. |
| 02 — erro | `assets/cutscenes/boot-falha.png`; `CRITICAL_ERROR` / `REALITY_INDEX_404_NOT_FOUND`. | Discagem interrompida, clique seco, silêncio curto. |
| 03 — estação | `assets/cutscenes/boot-aeroporto.png`; BLOCO 404 como texto real da interface. | Drone subgrave, nota ciano distante, ruído do casco; não uma fanfarra heroica. |
| 04 — chegada | `assets/cutscenes/boot-operador.png`; voz intrusa. | Voz de Nulo filtrada e sintética: “Toda linha de código tem um fim... menos a sua exclusão.” O portal responde com um pulso grave. |
| 05 — controle | Abertura fecha no saguão existente; fale com NEXO. | Cortar para ambiência de saguão e zumbido de luzes, sem fala automática sobreposta. |

Os quadros têm legenda/texto e podem ser pulados com Esc. Não há áudio
embutido neste trabalho. As imagens recebem uma aproximação lenta, respeitando redução de movimento; evitar flashes
rápidos, manter redução de movimento e nunca fazer a fala depender de som.
A arte do portal é uma evocação cinematográfica, não uma mudança do spawn.

## Missão canônica 01 — Frequência 66.6 MHz (handoff)

**Premissa:** um receptor costeiro capta a resposta a um pedido de socorro que
ainda não foi enviado. A imagem mostra uma cidadela industrial e um reator
superaquecendo. NEXO pode estabilizar a entrada, mas não entende se a entidade
que responde é vítima, sentinela ou isca. O objetivo humano não é apagar um
mundo anômalo: é impedir que a falha o destrua e descobrir quem pediu ajuda.

### Sequência futura proposta

1. **Travessia:** conectar o limiar já preparado ao destino real quando a
   dimensão estiver pronta. O corte atual já mostra o primeiro passo, mas
   não carrega a dimensão. Dar aviso, opção de acessibilidade e controles
   claros antes da movimentação; preservar o caminho de volta e o save.
2. **Infiltração na Cidadela do Código Queimado:** corredores de tijolo escuro,
   metal e luz vermelha, mapas mentais claros e pontos de referência visuais.
   Chuva de dados e ruído de rádio nunca devem encobrir portas ou ameaças.
3. **Três chaves mnemônicas:** azul, amarela e vermelha, cada uma com forma,
   símbolo e nome próprios, não apenas cor. Servidores corrompidos guardam as
   chaves; cada chave revela uma parte do pedido de socorro. Preservar ordem e
   flags em saves e impedir repetição de recompensa. A ordem final do labirinto
   deve ser definida junto da equipe que implementar o mapa.
4. **Combate adaptativo:** Imps de Glitch lançam esferas de dados sinalizadas;
   Cyber-Cacodemons são ameaças aéreas originais, sem copiar designs existentes.
   Canhão Modular de Polímeros e lâminas simbióticas são equipamentos nativos
   da dimensão propostos; definir como cada módulo os adapta sem excluir
   arquétipos nem sobrescrever seus kits no retorno. Ajustar dano, mobilidade,
   regeneração, telegraph e acessibilidade ao protótipo real.
5. **Chefe — Vigilante de Bits:** guardião colossal flutuante sobre o reator.
   Ele parece bloquear o resgate, mas protege um núcleo de refrigeração em
   colapso. Desviar de rajadas telegrafadas, usar strafe e atingir o núcleo
   exposto em janelas claras. Vitória estabiliza o sistema; não presume matar
   uma pessoa nem revela Nulo. Conceito de corte:
   `assets/cutscenes/vigilante-reator.png`.
6. **Desfecho:** o mundo não some depois da vitória. O reator volta a respirar,
   um sinal de resposta permanece e a cidadela passa a ser o primeiro mundo
   Retro-FPS estável e revisitable. Conceito de corte:
   `assets/cutscenes/cidadela-estavel.png`. Só liberar retorno, segredos,
   hordas e itens lendários quando esses sistemas realmente existirem.

### Falas-guia futuras (a adaptar ao gameplay)

- NEXO, antes da entrada: “Se a imagem tremer, procure uma saída, não uma
  resposta. Eu mantenho a linha aberta deste lado.”
- Registro azul: “Pedido de socorro iniciado.”
- Registro amarelo: “Resposta recebida: três segundos antes do envio.”
- Registro vermelho: “O guardião manteve o reator funcionando. Alguém mandou
  que ele deixasse de fazê-lo.”
- NEXO após a estabilização: “A rota sobreviveu. Isso significa que podemos
  voltar — e que alguém, ou alguma coisa, ainda pode nos responder.”

Estas falas são propostas, não eventos já conectados. Não confirmar a origem
ou o autor da mensagem até a história posterior estabelecer evidências.

## Direção sonora para outra IA/equipe (a produzir)

| Momento | Paleta / função | Evitar |
| --- | --- | --- |
| Aeroporto e saguão | Ventilação larga, passos metálicos, pulsos cianos discretos; motivo de três notas incompleto. | Loop alto que fatigue, buzinas de aeroporto realistas em excesso. |
| NEXO | Voz acolhedora, levemente sintética, ritmo humano; humor seco. | Robô incompreensível, filtros que prejudiquem legendas. |
| Terminal e 66.6 | Sal, vento e ondas cedem espaço a estática direcional; três bips retornam antes de serem emitidos; pausa antes da visão. | Sustos de volume sem aviso, frequência aguda contínua. |
| Estação e âncoras | Relés lentos, água em tubulações, cada âncora acrescenta uma nota ao motivo; anel estável com drone discreto. | Tons agudos contínuos e confirmação apenas por áudio. |
| Ruptura | Modem, buffer quebrado, rotação sonora e queda para um pulso grave; versão suave para acessibilidade. | Flash estroboscópico obrigatório ou dependência de som espacial. |
| Cidadela | Percussão industrial em camadas, baixos pulsantes, motivo do sinal em rádio degradado; exploração menos intensa que combate. | Cópia de trilhas identificáveis; música cobrindo o feedback de ameaça. |
| Vigilante | Camadas rítmicas reativas e intervalo audível antes de cada rajada; núcleo aberto ganha harmônico limpo. | Picos agressivos ou telegraph apenas sonoro. |
| Estabilização | Resolver as três notas em acorde incompleto, ventiladores baixando e vento distante. | Silêncio total que pareça fim do mundo ou vitória triunfal genérica. |

Especificar loops sem emenda, mixagem dinâmica, volumes independentes para
música/efeitos/voz e legendas para falas, inclusive Nulo. Áudio e dublagem
continuam pendentes; nenhuma gravação é fornecida agora.

## Depois da missão / longo prazo

O Metrô Interdimensional é o hub de viagem entre destinos desbloqueados: oceano
abissal, ruínas mitológicas, fenda retrô e colmeias orgânicas, entre outros.
O acesso livre surge após a história de cada mundo, não antes. Caçadas ao
Nemetrix: variantes de chefes geradas por Nulo podem invadir zonas sob regras
de tempo e aviso ainda a definir; não transformar exploração tranquila em
punição inevitável. Nada disso é implementado por este prólogo.

Arquitetura desejada: limites explícitos entre adaptadores de câmera, input,
física, UI e regras de dimensão; nomes de arquivos específicos são direção,
não módulos já existentes. CRT/vinheta como efeito leve e opcional, com
preferência de movimento respeitada; metas de desempenho a medir no hardware
real. Ver `manifesto-multiverso.md` para a arquitetura e outros gêneros.

## Contrato de implementação para a próxima IA

- Entrada atual: `frequencia666Registrada` e missão legada
  `embarque_dimensional`, etapa `sinal_registrado`. Não trocar IDs existentes
  sem migração aditiva; não dar a recompensa em dobro.
- Criar e testar uma rota concreta, câmera FPS, input/colisão, retorno ao mapa
  e checkpoint seguro como uma unidade. Preservar os quatro arquétipos, itens,
  vida e flags e testar saves antigos e interrupção durante a transição.
- Cutscenes previstas devem usar as artes como quadros, não colisão; legenda,
  pular e ausência de flashes são requisitos. Som é uma tarefa de produção.
- O prólogo não comprova que Arquivo 0 e Operador Nulo sejam a mesma pessoa.
- Testar legibilidade das chaves sem cor, telegraphs do chefe, saída segura,
  reentrada no mundo estabilizado e desempenho antes de chamar a missão pronta.
