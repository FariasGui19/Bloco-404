// js/data/worlds/hub-404/saguao.js

export const map = {
  id: 'hub_saguao',

  meta: {
    nome: 'SAGUÃO CENTRAL — BLOCO 404',
    tipo: 'interior',
    alturaParede: 1.35,
    ambiente: { poeira: 35, cor: '#35E6D3' },
    dimensao: 'hub_404',
    corFundo: '#0f0f14',
  },

  spawnPoints: {
    inicio: { x: 9.5, y: 13.5 },
    vindo_do_aeroporto: { x: 2.5, y: 6.5 },
    vindo_do_anime: { x: 9.5, y: 2.5 },
    vindo_do_metro: { x: 14.5, y: 6.5 },
  },

  corChao: '#1a1d23',
  paredes: {
    '5,0': [1, 3],   // janela
    '13,0': [1, 3],   // janela
    '15,0': [2, 3],   // alarme vermelho (perto do metrô bloqueado)
    '0,9': [2, 1],   // quadro elétrico
  },

  layout: [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  ],

  actors: [
    // Viajante ambiental não bloqueia o jogador nem substitui NPCs existentes.
    { id: 'viajante_saguao', tipo: 'viajante_ambiental', sprite: 'hub_viajante',
      x: 6.3, y: 11.3, nome: 'Viajante', semNome: true, solido: false, facing: 'right',
      interacao: { label: 'CONVERSAR COM VIAJANTE', speaker: 'VIAJANTE', distancia: 1.25,
        dialogue: ['Primeira vez no Bloco 404? Eu também estou conhecendo as rotas.', 'Espero que a minha mala tenha chegado da mesma dimensão que eu!'] } },
    {
      id: 'recepcionista',

      x: 9,
      y: 5,

      nome: 'NEXO-04',
      cor: '#35E6D3',

      // Diz ao renderer para usar a spritesheet do NPC.
      sprite: 'nexo_04',

      // Direção inicial: olhando para baixo/frente.
      facing: 'down',

      // Pose inicial.
      pose: 'idle',
      behavior: {
        type: 'receptionist',

        // Direção para onde ele volta quando não está vendo ninguém.
        defaultFacing: 'down',

        // Distância para perceber o player.
        lookDistance: 3.2,

        // Quanto tempo continua olhando depois que o player sai.
        returnDelay: 2.5,

        // Patrulha curta atrás da recepção.
        patrol: true,

        // Velocidade baixa, parecendo funcionário andando.
        speed: 0.45,

        // Tempo parado em cada ponta da rota.
        waitDuration: 2.4,

        // Pontos da rota em coordenadas de MAPA.
        // Eles já estão no centro dos tiles porque usam .5.
        //
        // A rota fica atrás/ao lado da recepção.
        route: [
          { x: 8.4, y: 5.5 },
          { x: 10.6, y: 5.5 },
        ],
      },

      interacao: {
        label: 'FALAR COM NEXO-04',
        speaker: 'NEXO-04',
        distancia: 1.65,

        dialogue: [
          'Bem-vindo ao Saguão Central do Bloco 404.',
          'Este é o ponto de conexão entre setores, andares e dimensões.',
          'O Aeroporto Interdimensional fica à esquerda.',
          'Os elevadores ao norte levam aos setores atualmente disponíveis.',
          'A Linha Interdimensional está bloqueada. Por enquanto.',
        ],
      },
    },
    {
      id: 'robo_limpeza',
      tipo: 'robo',
      x: 12,
      y: 7,
      nome: 'L-7',
      sprite: 'robo_limpeza',
      semNome: true,
      raio: 0.22,
      raioPasseio: 4,
      velocidade: 0.9,
      moduleSystem: {
        id: 'cleaning_unit_l7',

        allowedArchetypes: ['motor_bio_forja'],

        label: 'SINCRONIZAR UNIDADE L-7',

        distance: 1.45,

        speaker: 'UNIDADE L-7',
      },
      interacao: {
        label: 'OBSERVAR ROBÔ',
        speaker: 'UNIDADE L-7',
        distancia: 1.3,
        dialogue: [
          '*BIP BIP*',
          'SUPERFÍCIE DO SAGUÃO: 97% LIMPA.',
          'OS 3% RESTANTES SÃO RESPONSABILIDADE SUA.',
        ],
      },
    },
  ],

  objects: [
    // Novos móveis ocupam bordas livres; hitboxes pequenas seguem as bases.
    { id: 'saguao_vaso_novo', tipo: 'planta', x: 15.6, y: 11.5, sprite: 'hub_vaso_novo', scale: .27, anchorY: 1, bloqueia: true, hitbox: { offsetX: -.19, offsetY: -.19, width: .38, height: .38 } },
    { id: 'saguao_reciclagem', tipo: 'reciclagem', x: 1.2, y: 8.4, sprite: 'hub_reciclagem', scale: .25, anchorY: 1, bloqueia: true, hitbox: { offsetX: -.18, offsetY: -.18, width: .36, height: .36 } },
    { id: 'saguao_carrinho', tipo: 'carrinho_limpeza', x: 2.0, y: 12.2, sprite: 'hub_carrinho', scale: .25, anchorY: 1, bloqueia: true, hitbox: { offsetX: -.20, offsetY: -.20, width: .40, height: .40 } },
    { id: 'saguao_bebedouro', tipo: 'bebedouro', x: 16.0, y: 10.0, sprite: 'hub_bebedouro', scale: .25, anchorY: 1, bloqueia: true, hitbox: { offsetX: -.18, offsetY: -.18, width: .36, height: .36 } },
    // Elementos ambientais sem gameplay, em posições de parede/fora das rotas.
    { id: 'hub_holograma', tipo: 'holograma_decorativo', x: 11.7, y: 2.4, bloqueia: false,
      brilho: { cor: '#35E6D3', raio: 1.2, forca: 0.18 } },
    { id: 'hub_luz_a', tipo: 'luminaria_decorativa', x: 5.5, y: 0.75, sprite: 'hub_props', frame: { col: 3, row: 2 }, scale: .36, anchorY: .94, bloqueia: false, brilho: { cor: '#35E6D3', raio: .8, forca: .16 } },
    { id: 'hub_luz_b', tipo: 'luminaria_decorativa', x: 13.2, y: 0.75, sprite: 'hub_props', frame: { col: 3, row: 2 }, scale: .36, anchorY: .94, bloqueia: false, brilho: { cor: '#35E6D3', raio: .8, forca: .16 } },
    { id: 'hub_painel_decor', tipo: 'painel_decorativo', x: 0.75, y: 7.2, sprite: 'hub_props', frame: { col: 0, row: 2 }, scale: .32, anchorY: .95, bloqueia: false, espelhar: true },
    {
      id: 'rec',
      tipo: 'recepcao',
      x: 8.9,
      y: 3.9,
      ajusteY: 12,
      sprite: 'hub_props',
      frame: { col: 0, row: 0 },
      scale: 0.55,
      anchorY: 0.93,
      bloqueia: true,
      hitbox: {
        offsetX: -0.68,
        offsetY: -0.40,
        width: 1.36,
        height: 0.80,
      },
    },
    {
      id: 'elev',
      tipo: 'porta_elevador',
      x: 9,
      y: 1,
      ajusteY: 12,
      porta: { modo: 'auto' },
      scale: 0.45,
      bloqueia: true,
      hitbox: { offsetX: -0.5, offsetY: -0.3, width: 1.0, height: 0.6 },
      brilho: { cor: '#35E6D3', raio: 1.4, forca: 0.3 },
    },
    {
      id: 'metro',
      tipo: 'metro_visual',
      brilho: { cor: '#35E6D3', raio: 1.8, forca: 0.4 },
      x: 15.35,
      y: 5.25,
      ajusteY: 15,
      sprite: 'hub_props',
      frame: { col: 2, row: 0 },
      scale: 0.55,
      anchorY: 0.93,
      moduleSystem: {
        id: 'metro_navigation_core',

        allowedArchetypes: ['motor_bio_forja', 'lamina_dominio_anciao', 'mare_astral', 'nucleo_dez_forma'],

        label: 'DIAGNOSTICAR LINHA INTERDIMENSIONAL',

        distance: 1.80,

        speaker: 'PAINEL DO METRÔ',
      },
      bloqueia: false,
    },
    {
      id: 'aero',
      tipo: 'porta_aeroporto_visual',
      brilho: { cor: '#FFB300', raio: 1.5, forca: 0.25 },
      x: 1,
      y: 5,
      sprite: 'hub_props',
      frame: { col: 3, row: 0 },
      scale: 0.55,
      anchorY: 0.93,
      bloqueia: false,
    },
    {
      id: 'totem',
      tipo: 'totem',
      brilho: { cor: '#35E6D3', raio: 0.9, forca: 0.2 },

      x: 6,
      y: 6,
      ajusteY: 12,

      sprite: 'hub_props',
      frame: { col: 0, row: 1 },

      scale: 0.40,
      anchorY: 0.94,

      bloqueia: true,

      hitbox: {
        offsetX: -0.22,
        offsetY: -0.22,
        width: 0.44,
        height: 0.44,
      },
      moduleSystem: {
        id: 'destination_panel',

        allowedArchetypes: ['motor_bio_forja'],

        label: 'DIAGNOSTICAR PAINEL',

        distance: 1.55,

        speaker: 'PAINEL DE DESTINOS',
      },
      interacao: {
        tipo: 'dialogue',
        label: 'CONSULTAR PAINEL',
        speaker: 'PAINEL DE DESTINOS',
        distancia: 1.45,

        dialogue: [
          'SISTEMA DE DESTINOS — BLOCO 404.',
          'DESTINOS DISPONÍVEIS:',
          '• AEROPORTO CENTRAL',
          '• SETOR ANIME',
          '• SAGUÃO CENTRAL',
          'LINHA INTERDIMENSIONAL: BLOQUEADA.',
        ],
      },
    },
        {
      id: 'banco1',
      tipo: 'banco',
      x: 4.95,
      // O y foi reduzido para simular o ajusteY antigo.
      // O ajusteY apenas desenhava o sprite em outro lugar, mas deixava a física errada.
      y: 9.1, 
      // ajusteY: 30, <-- REMOVIDO
      sprite: 'hub_props',
      frame: { col: 1, row: 1 },
      scale: 0.50,
      anchorY: 0.94,
      bloqueia: true,
      hitboxes: [
        { offsetX: -0.36, offsetY: 0.06, width: 2.32, height: 1.22 },
        { offsetX: -0.01, offsetY: 0.99, width: 1.86, height: 0.72 },
        { offsetX: -0.54, offsetY: 0.36, width: 0.62, height: 0.92 },
      ],
    },
    {
      id: 'banco2',
      tipo: 'banco',
      x: 12.65,
      y: 9.65,
      ajusteY: 30,
      sprite: 'hub_props',
      frame: { col: 1, row: 1 },
      scale: 0.50,
      anchorY: 0.94,
      bloqueia: true,
      hitbox: {
        offsetX: -0.98,
        offsetY: -0.88,
        width: 1.92,
        height: 1.72,
      },
    },
    {
      id: 'malas',
      tipo: 'malas',
      x: 1.15,
      y: 12.,
      ajusteY: 14,
      sprite: 'hub_props',
      frame: { col: 2, row: 1 },
      scale: 0.42,
      anchorY: 0.94,
      bloqueia: true,
      hitbox: {
        offsetX: -0.35,
        offsetY: -0.30,
        width: 0.70,
        height: 0.60,
      },
    },
    {
      id: 'planta1',
      tipo: 'planta',
      x: 4,
      y: 3,
      ajusteY: 16,
      sprite: 'hub_props',
      frame: { col: 3, row: 1 },
      scale: 0.45,
      anchorY: 0.95,
      bloqueia: true,
      hitbox: {
        offsetX: -0.30,
        offsetY: -0.30,
        width: 0.60,
        height: 0.60,
      },
    },
    {
      id: 'planta2',
      tipo: 'planta',
      x: 14,
      y: 3,
      ajusteY: 18,
      sprite: 'hub_props',
      frame: { col: 3, row: 1 },
      scale: 0.45,
      anchorY: 0.95,
      bloqueia: true,
      hitbox: {
        offsetX: -0.30,
        offsetY: -0.30,
        width: 0.60,
        height: 0.60,
      },
    },
    {
      id: 'maquina',
      tipo: 'maquina_bebidas',
      x: 1.9,
      y: 10.9,
      ajusteY: 17,
      sprite: 'hub_props',
      frame: { col: 2, row: 2 },
      scale: 0.45,
      anchorY: 0.94,
      bloqueia: true,
      hitbox: {
        offsetX: -0.32,
        offsetY: -0.32,
        width: 0.64,
        height: 0.64,
      },
      interacao: {
        tipo: 'message',
        label: 'USAR MÁQUINA',
        speaker: 'MÁQUINA DE BEBIDAS',
        distancia: 1.35,

        dialogue: [
          'ESTOQUE INDISPONÍVEL.',
          'A ÚLTIMA BEBIDA FOI CONSUMIDA EM UMA DIMENSÃO DESCONHECIDA.',
        ],
      },
    },
    {
      id: 'barreira',
      tipo: 'barreira',
      hideWhenFlag: 'metroCalibrado',
      espelhar: true,
      x: 14.45,
      y: 5.75,
      ajusteY: 27,
      sprite: 'hub_props',
      brilho: { cor: '#ff3b3b', raio: 1.0, forca: 0.25 },
      frame: { col: 3, row: 3 },
      scale: 0.45,
      anchorY: 0.95,
      bloqueia: true,
      hitbox: {
        offsetX: -0.68,
        offsetY: -0.18,
        width: 1.36,
        height: 0.36,
      },
      depthOffset: 0.18,
    },
  ],

  portals: [
    {
      id: 'para_aeroporto',
      tipo: 'door',
      x: 1,
      y: 5,
      label: 'IR PARA O AEROPORTO CENTRAL',
      destino: {
        mapId: 'hub_aeroporto',
        spawnId: 'vindo_do_saguao',
      },
      transition: 'fade',
    },
    {
      id: 'para_elevadores',
      tipo: 'elevator',
      x: 9,
      y: 2,
      label: 'IR PARA O HALL DOS ELEVADORES',
      destino: { mapId: 'hub_elevadores', spawnId: 'vindo_do_saguao' },
      transition: 'fade',

    },
        {
      id: 'metro_interdimensional',
      tipo: 'metro',
      x: 15.35,
      y: 5.25,
      label: 'ENTRAR NO METRÔ INTERDIMENSIONAL',
      lockedLabel: 'LINHA INTERDIMENSIONAL SEM CALIBRAÇÃO',
      
      // NOVO SISTEMA DE GATE:
      gate: {
        anyOf: [{ flag: 'metroCalibrado' }],
        falha: [
          'LINHA INTERDIMENSIONAL BLOQUEADA.',
          'UM FRAGMENTO DE SINCRONIZAÇÃO É NECESSÁRIO.',
          'RECOMENDAÇÃO: ANALISE O TERMINAL DE MANUTENÇÃO NO AEROPORTO.',
        ]
      },
      
      interactionDistance: 1.80,
      destino: {
        mapId: 'hub_metro',
        spawnId: 'vindo_do_saguao',
      },
      transition: 'fade',
    }, 
  ],
}; 