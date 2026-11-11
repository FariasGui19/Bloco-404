// js/data/worlds/hub-404/aeroporto.js
// =====================================================================
// PISO 0 - AEROPORTO CENTRAL (Bloco 404) — Versão Grandiosa
// =====================================================================
// O Aeroporto Central é agora um hub de dimensões de verdade, com:
//  - Salão principal amplo e bem iluminado
//  - Guia do Aeroporto com identidade visual própria (não é o NEXO-04)
//  - 4 portais para salas de missão inicial por arquétipo
//  - Portal para Área de Carga (bloqueado até diagnóstico)
//  - Portal para Metrô, Setor Anime e Hall dos Elevadores
//  - Background hero em pixel art cobrindo todo o cenário
// =====================================================================

export const map = {
  id: 'hub_aeroporto',

  meta: {
    nome: 'PISO 0 - AEROPORTO CENTRAL',
    tipo: 'interior',
    dimensao: 'hub_404',
    corFundo: '#0b0d12',
    backgroundCoversFloor: true,
    ambiente: {
      poeira: 12,
      cor: '#35E6D3',
    },
    background: {
      sprite: 'aeroporto_background',
      scale: 0.6,
      anchor: { x: 0.5, y: 0.5 },
      offsetX: 0,
      offsetY: 0,
    },
  },

  spawnPoints: {
    inicio: { x: 15.0, y: 12.0 },          // centro do salão principal
    vindo_do_saguao: { x: 2.0, y: 11.0 },  // entrada oeste
    chegada_sala_bio: { x: 26.0, y: 6.0 }, // norte (sala bio-forja)
    chegada_sala_dominio: { x: 26.0, y: 10.0 }, // norte (sala domínio)
    chegada_sala_mare: { x: 26.0, y: 14.0 }, // sul (sala maré)
    chegada_sala_nucleo: { x: 26.0, y: 18.0 }, // sul (sala núcleo)
    vindo_da_carga: { x: 26.0, y: 12.0 },  // leste (área de carga)
  },

  corChao: '#1c2330',

  // ------------------------------------------------------------------
  // LAYOUT 30 x 22
  // 0 = chão   1 = parede   2 = coluna decorativa
  //
  // Oeste (x=0-4): entrada do saguão + recepção
  // Centro (x=5-24): salão principal amplo com balcões, colunas, bancos
  // Norte (x=25-28): portais para salas Bio-Forja e Domínio
  // Sul (x=25-28): portais para salas Maré e Núcleo
  // Leste (x=29): portão Área de Carga + Metrô
  // ------------------------------------------------------------------
  layout: [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], // 0
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 1
    [1,0,0,0,0,1,1,1,0,0,0,1,1,1,0,0,0,1,1,1,0,0,0,1,1,1,0,0,0,1], // 2  colunas
    [1,0,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,1], // 3
    [1,0,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,1], // 4
    [1,0,0,0,0,1,1,1,0,0,0,1,1,1,0,0,0,1,1,1,0,0,0,1,1,1,0,0,0,1], // 5  portal bio
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 6
    [1,0,0,0,0,1,1,1,0,0,0,1,1,1,0,0,0,1,1,1,0,0,0,1,1,1,0,0,0,1], // 7  portal domínio
    [1,0,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,1], // 8
    [1,0,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,1], // 9
    [1,0,0,0,0,1,1,1,0,0,0,1,1,1,0,0,0,1,1,1,0,0,0,1,1,1,0,0,0,1], // 10 portal maré
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 11
    [1,0,0,0,0,1,1,1,0,0,0,1,1,1,0,0,0,1,1,1,0,0,0,1,1,1,0,0,0,1], // 12 portal núcleo
    [1,0,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,1], // 13
    [1,0,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,1], // 14
    [1,0,0,0,0,1,1,1,0,0,0,1,1,1,0,0,0,1,1,1,0,0,0,1,1,1,0,0,0,1], // 15
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 16
    [1,0,0,0,0,1,1,1,0,0,0,1,1,1,0,0,0,1,1,1,0,0,0,1,1,1,0,0,0,1], // 17
    [1,0,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,1], // 18
    [1,0,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,1], // 19
    [1,0,0,0,0,1,1,1,0,0,0,1,1,1,0,0,0,1,1,1,0,0,0,1,1,1,0,0,0,1], // 20
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], // 21
  ],

  // Pisos especiais em pontos estratégicos
  pisos: {
    '15,12': [1, 2], // centro - ponto de partida brilhante
    '7,5': [2, 0],   // perto da recepção
    '22,5': [2, 0],  // perto do portal bio
  },

  // Paredes decorativas nas colunas
  paredes: {
    '5,2': [0, 1],
    '5,20': [0, 1],
    '24,2': [2, 1],
    '24,20': [2, 1],
  },

  actors: [
    // Guia do Aeroporto — identidade própria, sprite dedicado
    { id: 'guia_aeroporto', x: 15, y: 12, nome: 'Guia do Aeroporto', cor: '#35E6D3',
      sprite: 'guia_aeroporto', facing: 'down', pose: 'idle',
      interacao: { label: 'FALAR COM O GUIA', speaker: 'GUIA DO AEROPORTO', distancia: 1.8,
        dialogue: [
          'Bem-vindo ao Aeroporto Central do Bloco 404.',
          'Sou o seu guia dimensional. Cada portal ao redor leva a uma missão inicial.',
          'Escolha seu arquétipo e entre na sala correspondente para começar sua jornada.',
          'Bio-Forja (norte), Domínio (norte), Maré Astral (sul) e Núcleo 10X (sul).',
          'A Área de Carga requer liberação no Terminal de Manutenção.',
        ] } },
  ],

  objects: [
    // ================================================================
    // RECEPÇÃO E BALCÕES (oeste)
    // ================================================================
    { id: 'balcao_recepcao_01', tipo: 'balcao', x: 3, y: 3,
      sprite: 'hub_props', frame: { col: 0, row: 0 }, scale: 0.5, anchorY: 0.94,
      bloqueia: true, brilho: { cor: '#35E6D3', raio: 0.9, forca: 0.18 } },
    { id: 'balcao_recepcao_02', tipo: 'balcao', x: 3, y: 5,
      sprite: 'hub_props', frame: { col: 0, row: 0 }, scale: 0.5, anchorY: 0.94,
      bloqueia: true, brilho: { cor: '#35E6D3', raio: 0.9, forca: 0.18 } },
    { id: 'balcao_recepcao_03', tipo: 'balcao', x: 4, y: 3,
      sprite: 'hub_props', frame: { col: 0, row: 0 }, scale: 0.5, anchorY: 0.94,
      bloqueia: true, brilho: { cor: '#35E6D3', raio: 0.9, forca: 0.18 } },
    { id: 'balcao_recepcao_04', tipo: 'balcao', x: 4, y: 5,
      sprite: 'hub_props', frame: { col: 0, row: 0 }, scale: 0.5, anchorY: 0.94,
      bloqueia: true, brilho: { cor: '#35E6D3', raio: 0.9, forca: 0.18 } },

    // Terminal de informações
    { id: 'terminal_info', tipo: 'terminal', x: 6, y: 4,
      sprite: 'hub_props', frame: { col: 0, row: 1 }, scale: 0.35, anchorY: 0.94,
      bloqueia: false, brilho: { cor: '#35E6D3', raio: 0.8, forca: 0.20 },
      interacao: { label: 'CONSULTAR INFO', speaker: 'TERMINAL DE INFORMAÇÕES', distancia: 1.4,
        dialogue: [
          'AEROPORTO CENTRAL — BLoco 404',
          'SALAS DE MISSÃO INICIAL:',
          '• BIO-FORJA — NORTE (PORTAL A)',
          '• DOMÍNIO ANCIÃO — NORTE (PORTAL B)',
          '• MARÉ ASTRAL — SUL (PORTAL C)',
          '• NÚCLEO 10X — SUL (PORTAL D)',
          'ÁREA DE CARGA: BLOQUEADA (TERMINAL DE MANUTENÇÃO)',
          'METRÔ INTERDIMENSIONAL: LESTE',
        ] } },

    // Colunas estruturais decorativas
    { id: 'coluna_01', tipo: 'coluna', x: 6, y: 2, sprite: 'hub_props', frame: { col: 2, row: 0 }, scale: 0.45, anchorY: 0.94, bloqueia: true },
    { id: 'coluna_02', tipo: 'coluna', x: 23, y: 2, sprite: 'hub_props', frame: { col: 2, row: 0 }, scale: 0.45, anchorY: 0.94, bloqueia: true },
    { id: 'coluna_03', tipo: 'coluna', x: 6, y: 20, sprite: 'hub_props', frame: { col: 2, row: 0 }, scale: 0.45, anchorY: 0.94, bloqueia: true },
    { id: 'coluna_04', tipo: 'coluna', x: 23, y: 20, sprite: 'hub_props', frame: { col: 2, row: 0 }, scale: 0.45, anchorY: 0.94, bloqueia: true },

    // Bancos de espera
    { id: 'banco_aero_01', tipo: 'banco', x: 9, y: 8, sprite: 'hub_props', frame: { col: 1, row: 1 }, scale: 0.45, anchorY: 0.94, bloqueia: true },
    { id: 'banco_aero_02', tipo: 'banco', x: 20, y: 8, sprite: 'hub_props', frame: { col: 1, row: 1 }, scale: 0.45, anchorY: 0.94, bloqueia: true },
    { id: 'banco_aero_03', tipo: 'banco', x: 9, y: 15, sprite: 'hub_props', frame: { col: 1, row: 1 }, scale: 0.45, anchorY: 0.94, bloqueia: true },
    { id: 'banco_aero_04', tipo: 'banco', x: 20, y: 15, sprite: 'hub_props', frame: { col: 1, row: 1 }, scale: 0.45, anchorY: 0.94, bloqueia: true },

    // Malas de viajantes espalhadas
    { id: 'malas_aero_01', tipo: 'malas', x: 7, y: 10, sprite: 'hub_props', frame: { col: 2, row: 1 }, scale: 0.35, anchorY: 0.94, bloqueia: true },
    { id: 'malas_aero_02', tipo: 'malas', x: 22, y: 10, sprite: 'hub_props', frame: { col: 2, row: 1 }, scale: 0.35, anchorY: 0.94, bloqueia: true },
    { id: 'malas_aero_03', tipo: 'malas', x: 11, y: 17, sprite: 'hub_props', frame: { col: 2, row: 1 }, scale: 0.35, anchorY: 0.94, bloqueia: true },
    { id: 'malas_aero_04', tipo: 'malas', x: 19, y: 17, sprite: 'hub_props', frame: { col: 2, row: 1 }, scale: 0.35, anchorY: 0.94, bloqueia: true },

    // Painel de partidas no centro
    { id: 'painel_partidas', tipo: 'painel', x: 15, y: 11,
      sprite: 'hub_props', frame: { col: 1, row: 3 }, scale: 0.45, anchorY: 0.94,
      bloqueia: false, brilho: { cor: '#ffd54f', raio: 1.2, forca: 0.25 },
      interacao: { label: 'PAINEL DE PARTIDAS', speaker: 'PAINEL DE DESTINOS', distancia: 1.5,
        dialogue: [
          'PARTIDAS DO AEROPORTO CENTRAL — Bloco 404',
          'SALAS DE MISSÃO: LIBERADAS',
          'BIO-FORJA: PORTAL NORTE A',
          'DOMÍNIO: PORTAL NORTE B',
          'MARÉ ASTRAL: PORTAL SUL C',
          'NÚCLEO 10X: PORTAL SUL D',
          'ÁREA DE CARGA: BLOQUEADA',
          'METRÔ INTERDIMENSIONAL: LESTE',
        ] } },

    // Luminárias pelo salão
    { id: 'luz_aero_01', tipo: 'luminaria', x: 1, y: 1, sprite: 'hub_props', frame: { col: 3, row: 2 }, scale: 0.3, anchorY: 0.94, bloqueia: false, brilho: { cor: '#35E6D3', raio: 0.7, forca: 0.14 } },
    { id: 'luz_aero_02', tipo: 'luminaria', x: 28, y: 1, sprite: 'hub_props', frame: { col: 3, row: 2 }, scale: 0.3, anchorY: 0.94, bloqueia: false, brilho: { cor: '#35E6D3', raio: 0.7, forca: 0.14 } },
    { id: 'luz_aero_03', tipo: 'luminaria', x: 1, y: 20, sprite: 'hub_props', frame: { col: 3, row: 2 }, scale: 0.3, anchorY: 0.94, bloqueia: false, brilho: { cor: '#35E6D3', raio: 0.7, forca: 0.14 } },
    { id: 'luz_aero_04', tipo: 'luminaria', x: 28, y: 20, sprite: 'hub_props', frame: { col: 3, row: 2 }, scale: 0.3, anchorY: 0.94, bloqueia: false, brilho: { cor: '#35E6D3', raio: 0.7, forca: 0.14 } },

    // ================================================================
    // PORTAIS PARA SALAS DE ARQUÉTIPO (norte e sul)
    // ================================================================
    // Portal: Sala Bio-Forja (norte A)
    { id: 'portao_sala_bio', tipo: 'portao_visual', x: 26, y: 5,
      sprite: 'hub_props', frame: { col: 2, row: 0 }, scale: 0.5, anchorY: 0.94,
      bloqueia: false, brilho: { cor: '#35E6D3', raio: 1.2, forca: 0.28 } },
    // Portal: Sala Domínio (norte B)
    { id: 'portao_sala_dominio', tipo: 'portao_visual', x: 26, y: 7,
      sprite: 'hub_props', frame: { col: 2, row: 0 }, scale: 0.5, anchorY: 0.94,
      bloqueia: false, brilho: { cor: '#ffd54f', raio: 1.2, forca: 0.28 } },
    // Portal: Sala Maré Astral (sul C)
    { id: 'portao_sala_mare', tipo: 'portao_visual', x: 26, y: 10,
      sprite: 'hub_props', frame: { col: 2, row: 0 }, scale: 0.5, anchorY: 0.94,
      bloqueia: false, brilho: { cor: '#4caeff', raio: 1.2, forca: 0.28 } },
    // Portal: Sala Núcleo 10X (sul D)
    { id: 'portao_sala_nucleo', tipo: 'portao_visual', x: 26, y: 12,
      sprite: 'hub_props', frame: { col: 2, row: 0 }, scale: 0.5, anchorY: 0.94,
      bloqueia: false, brilho: { cor: '#74ff8a', raio: 1.2, forca: 0.28 } },

    // ================================================================
    // TERMINAL DE MANUTENÇÃO — missão do Fragmento de Sincronização
    // ================================================================
    {
      id: 'terminal_manutencao',
      tipo: 'terminal',
      x: 20,
      y: 3,
      ajusteY: 12,
      sprite: 'hub_props',
      frame: { col: 1, row: 3 },
      scale: 0.48,
      anchorY: 0.94,
      bloqueia: true,
      hitbox: {
        offsetX: -0.30,
        offsetY: -0.30,
        width: 0.60,
        height: 0.60,
      },
      interacao: {
        label: 'CONSULTAR TERMINAL',
        speaker: 'TERMINAL DE MANUTENÇÃO',
        distancia: 1.45,
        dialogue: [
          'SISTEMA OFFLINE.',
          'ACESSO BÁSICO DISPONÍVEL.',
          'UM OPERADOR COM FERRAMENTAS DE RECONFIGURAÇÃO PODERIA EXTRAIR MAIS DADOS.',
        ],
      },
      moduleSystem: {
        id: 'airport_maintenance_terminal',
        allowedArchetypes: ['motor_bio_forja', 'lamina_dominio_anciao', 'mare_astral', 'nucleo_dez_forma'],
        label: 'DIAGNOSTICAR TERMINAL',
        distance: 1.65,
        speaker: 'TERMINAL DE MANUTENÇÃO',
      },
      brilho: {
        cor: '#35E6D3',
        raio: 1.1,
        forca: 0.22,
      },
    },
  ],

  portals: [
    // Volta para o Saguão Central (oeste)
    {
      id: 'voltar_ao_saguao',
      tipo: 'door',
      x: 1,
      y: 11,
      label: 'VOLTAR AO SAGUÃO CENTRAL',
      interactionDistance: 1.10,
      destino: {
        mapId: 'hub_saguao',
        spawnId: 'vindo_do_aeroporto',
      },
      transition: 'fade',
    },
    // Portais para salas de missão por arquétipo
    {
      id: 'portal_sala_bio_forja',
      tipo: 'door',
      x: 26,
      y: 5,
      label: 'ENTRAR NA SALA — MOTOR BIO-FORJA',
      destino: {
        mapId: 'sala_bio_forja',
        spawnId: 'vindo_do_aeroporto',
      },
      transition: 'fade',
    },
    {
      id: 'portal_sala_dominio',
      tipo: 'door',
      x: 26,
      y: 7,
      label: 'ENTRAR NA SALA — LÂMINA DOMÍNIO',
      destino: {
        mapId: 'sala_dominio',
        spawnId: 'vindo_do_aeroporto',
      },
      transition: 'fade',
    },
    {
      id: 'portal_sala_mare',
      tipo: 'door',
      x: 26,
      y: 10,
      label: 'ENTRAR NA SALA — MARÉ ASTRAL',
      destino: {
        mapId: 'sala_mare',
        spawnId: 'vindo_do_aeroporto',
      },
      transition: 'fade',
    },
    {
      id: 'portal_sala_nucleo',
      tipo: 'door',
      x: 26,
      y: 12,
      label: 'ENTRAR NA SALA — NÚCLEO 10X',
      destino: {
        mapId: 'sala_nucleo',
        spawnId: 'vindo_do_aeroporto',
      },
      transition: 'fade',
    },
    // Portão: Área de Carga (bloqueado até diagnóstico)
    {
      id: 'porta_area_carga',
      tipo: 'door',
      x: 28,
      y: 12,
      label: 'ACESSAR ÁREA DE CARGA',
      lockedLabel: 'ÁREA DE CARGA SEM SINCRONIA',
      requiresFlag: 'airportTerminalDiagnosed',
      mensagemBloqueado: [
        'ACESSO À ÁREA DE CARGA BLOQUEADO.',
        'RECOMENDAÇÃO: UTILIZE O LINK DE DIAGNÓSTICO NO TERMINAL DE MANUTENÇÃO.',
      ],
      destino: {
        mapId: 'hub_aeroporto_carga',
        spawnId: 'vindo_do_aeroporto',
      },
      transition: 'fade',
    },
  ],
};
