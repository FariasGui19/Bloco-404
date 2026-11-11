// js/data/worlds/hub-404/aeroporto.js
// =====================================================================
// PISO 0 - AEROPORTO CENTRAL (Bloco 404)
// =====================================================================
export const map = {
  id: 'hub_aeroporto',

  meta: {
    nome: 'PISO 0 - AEROPORTO CENTRAL',
    tipo: 'interior',
    dimensao: 'hub_404',
    corFundo: '#0b0d12',
    // O background hero cobre o chão: cenário grandioso do aeroporto.
    backgroundCoversFloor: true,
    ambiente: {
      poeira: 14,
      cor: '#35E6D3',
    },
    background: {
      sprite: 'aeroporto_background',
      scale: 0.55,
      anchor: { x: 0.5, y: 0.5 },
      offsetX: 0,
      offsetY: 0,
    },
  },

  spawnPoints: {
    inicio: { x: 12.5, y: 10.0 },          // centro do saguão de embarque
    vindo_do_saguao: { x: 2.5, y: 9.0 },   // entrada oeste (vindo do Saguão)
    chegada_elevador: { x: 22.5, y: 4.0 }, // norte-leste (vindo dos Elevadores)
    vindo_da_carga: { x: 22.5, y: 10.0 },  // leste (vindo da Área de Carga)
    vindo_do_metro: { x: 22.5, y: 14.0 },  // sudeste (vindo do Metrô)
  },

  corChao: '#1c2330',

  // ------------------------------------------------------------------
  // LAYOUT 24 x 18
  // 0 = chão   1 = parede
  //
  // Norte (linhas 2-8): salão de check-in com balcões estruturais.
  // Centro (linhas 9-11): saguão aberto, balcão de informações e holofote.
  // Sul (linhas 12-16): setor de portões com arcos de pilares e portais.
  // Oeste (x=0): entrada do Saguão Central.   Leste (x=23): elevadores/metro/carga.
  // ------------------------------------------------------------------
  layout: [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], // 0
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 1
    [1,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 2  pilar check-in L
    [1,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 3
    [1,0,0,1,0,1,0,0,0,1,1,1,0,0,0,1,1,1,0,0,0,0,0,1], // 4  pilares centrais
    [1,0,0,1,0,1,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,0,0,1], // 5
    [1,0,0,1,0,1,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,0,0,1], // 6
    [1,0,0,1,0,1,0,0,0,1,1,1,0,0,0,1,1,1,0,0,0,0,0,1], // 7
    [1,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 8
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 9  saguão aberto
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 10 saguão aberto
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 11 saguão aberto
    [1,0,0,0,0,0,1,1,1,0,0,0,0,0,0,1,1,1,0,0,0,0,0,1], // 12 pilares portão L
    [1,0,0,0,0,0,1,0,1,0,0,0,0,0,0,1,0,1,0,0,0,0,0,1], // 13
    [1,0,0,0,0,0,1,0,1,0,0,0,0,0,0,1,0,1,0,0,0,0,0,1], // 14 vãos de portão
    [1,0,0,0,0,0,1,0,1,0,0,0,0,0,0,1,0,1,0,0,0,0,0,1], // 15 vãos de portão
    [1,0,0,0,0,0,1,1,1,0,0,0,0,0,0,1,1,1,0,0,0,0,0,1], // 16 pilares portão R
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], // 17
  ],

  actors: [
    // Guia do Aeroporto — recepciona o jogador no centro do saguão.
    { id: 'guia_aeroporto', x: 6, y: 10, nome: 'Guia do Aeroporto', cor: '#ff6b6b',
      sprite: 'nexo_04', facing: 'down', pose: 'idle',
      interacao: { label: 'FALAR COM O GUIA', speaker: 'GUIA DO AEROPORTO', distancia: 1.7,
        dialogue: [
          'Bem-vindo ao Aeroporto Central do Bloco 404.',
          'Todos os portões ao sul levam a um destino diferente.',
          'Saguão Central, Setor Anime, Hall dos Elevadores e Metrô Interdimensional estão liberados.',
          'A Área de Carga precisa de liberação no Terminal de Manutenção antes de ser acessada.',
        ] } },
    // Viajante ambiental (não bloqueia, apenas vida no cenário).
    { id: 'viajante_aeroporto', x: 17, y: 10, nome: 'Viajante', cor: '#4ecdc4',
      sprite: 'hub_viajante', semNome: true, solido: false, facing: 'right',
      interacao: { label: 'CONVERSAR COM VIAJANTE', speaker: 'VIAJANTE', distancia: 1.3,
        dialogue: [
          'Estou esperando minha conexão para o Setor Anime.',
          'Já passou pela Área de Carga? Dizem que tem um fragmento de sincronia lá.',
        ] } },
    // Recepcionista NEXO-04 atrás do balcão de check-in (norte).
    {
      id: 'recepcionista_aeroporto',
      x: 3,
      y: 5,
      nome: 'NEXO-04',
      cor: '#35e6d3',
      sprite: 'nexo_04',
      facing: 'down',
      pose: 'idle',
      behavior: {
        type: 'receptionist',
        defaultFacing: 'down',
        lookDistance: 3.0,
        returnDelay: 2.0,
        patrol: true,
        speed: 0.4,
        waitDuration: 2.0,
        route: [
          { x: 2.5, y: 5.5 },
          { x: 4.5, y: 5.5 },
        ],
      },
      interacao: {
        label: 'FALAR COM NEXO-04',
        speaker: 'NEXO-04',
        distancia: 1.65,
        dialogue: [
          'Bem-vindo ao Aeroporto Central.',
          'Balcões de check-in ao norte, portões de embarque ao sul.',
          'Os elevadores ao leste levam às Câmaras de Arquétipo.',
          'A Linha Interdimensional está no Metrô, ao sudeste.',
        ],
      },
    },
    // Robô de limpeza L-7 (leste, perto dos elevadores).
    {
      id: 'robo_limpeza_aeroporto',
      tipo: 'robo',
      x: 20,
      y: 5,
      nome: 'L-7',
      sprite: 'robo_limpeza',
      semNome: true,
      raio: 0.22,
      raioPasseio: 3,
      velocidade: 0.8,
      interacao: {
        label: 'OBSERVAR ROBÔ',
        speaker: 'UNIDADE L-7',
        distancia: 1.3,
        dialogue: [
          '*BIP BIP*',
          'SALÃO DE CHECK-IN: 98% LIMPO.',
          'OS 2% RESTANTES SÃO BAGUNÇA DE VIAJANTE DISTRAÍDO.',
        ],
      },
    },
  ],

  objects: [
    // ================================================================
    // SALÃO DE CHECK-IN (norte) — balcões, terminais, plantas, bancos
    // ================================================================
    { id: 'balcao_checkin_01', tipo: 'balcao', x: 3, y: 4,
      sprite: 'hub_props', frame: { col: 0, row: 0 }, scale: 0.5, anchorY: 0.94,
      bloqueia: true, brilho: { cor: '#35E6D3', raio: 0.9, forca: 0.18 } },
    { id: 'balcao_checkin_02', tipo: 'balcao', x: 3, y: 6,
      sprite: 'hub_props', frame: { col: 0, row: 0 }, scale: 0.5, anchorY: 0.94,
      bloqueia: true, brilho: { cor: '#35E6D3', raio: 0.9, forca: 0.18 } },
    { id: 'balcao_checkin_03', tipo: 'balcao', x: 15, y: 4,
      sprite: 'hub_props', frame: { col: 0, row: 0 }, scale: 0.5, anchorY: 0.94,
      bloqueia: true, brilho: { cor: '#35E6D3', raio: 0.9, forca: 0.18 } },
    { id: 'balcao_checkin_04', tipo: 'balcao', x: 15, y: 6,
      sprite: 'hub_props', frame: { col: 0, row: 0 }, scale: 0.5, anchorY: 0.94,
      bloqueia: true, brilho: { cor: '#35E6D3', raio: 0.9, forca: 0.18 } },

    { id: 'terminal_info_norte', tipo: 'terminal', x: 8, y: 4,
      sprite: 'hub_props', frame: { col: 0, row: 1 }, scale: 0.35, anchorY: 0.94,
      bloqueia: false, brilho: { cor: '#35E6D3', raio: 0.8, forca: 0.20 },
      interacao: { label: 'CONSULTAR INFO', speaker: 'TERMINAL DE INFORMAÇÕES', distancia: 1.4,
        dialogue: ['DESTINOS DO AEROPORTO CENTRAL:', '• SAGUÃO CENTRAL — OESTE', '• SETOR ANIME — PORTÃO SUL', '• HALL DOS ELEVADORES — LESTE', '• METRÔ INTERDIMENSIONAL — SUDESTE', '• ÁREA DE CARGA — BLOQUEADA (NECESSITA LIBERAÇÃO)'] } },

    { id: 'planta_aero_01', tipo: 'planta', x: 6, y: 3,
      sprite: 'hub_props', frame: { col: 3, row: 1 }, scale: 0.4, anchorY: 0.95,
      bloqueia: true, brilho: { cor: '#35E6D3', raio: 0.6, forca: 0.12 } },
    { id: 'planta_aero_02', tipo: 'planta', x: 17, y: 3,
      sprite: 'hub_props', frame: { col: 3, row: 1 }, scale: 0.4, anchorY: 0.95,
      bloqueia: true, brilho: { cor: '#35E6D3', raio: 0.6, forca: 0.12 } },

    { id: 'banco_aero_01', tipo: 'banco', x: 7, y: 8,
      sprite: 'hub_props', frame: { col: 1, row: 1 }, scale: 0.45, anchorY: 0.94,
      bloqueia: true },
    { id: 'banco_aero_02', tipo: 'banco', x: 16, y: 8,
      sprite: 'hub_props', frame: { col: 1, row: 1 }, scale: 0.45, anchorY: 0.94,
      bloqueia: true },

    { id: 'malas_aero_01', tipo: 'malas', x: 5, y: 9,
      sprite: 'hub_props', frame: { col: 2, row: 1 }, scale: 0.35, anchorY: 0.94,
      bloqueia: true },
    { id: 'malas_aero_02', tipo: 'malas', x: 18, y: 9,
      sprite: 'hub_props', frame: { col: 2, row: 1 }, scale: 0.35, anchorY: 0.94,
      bloqueia: true },

    // Holofote / painel de partidas no centro do saguão.
    { id: 'painel_partidas', tipo: 'painel', x: 12, y: 10,
      sprite: 'hub_props', frame: { col: 1, row: 3 }, scale: 0.45, anchorY: 0.94,
      bloqueia: false, brilho: { cor: '#ffd54f', raio: 1.2, forca: 0.25 },
      interacao: { label: 'PAINEL DE PARTIDAS', speaker: 'PAINEL DE DESTINOS', distancia: 1.5,
        dialogue: [
          'PARTIDAS DO AEROPORTO CENTRAL — Bloco 404',
          'SAGUÃO CENTRAL: EM OPERAÇÃO',
          'SETOR ANIME: EM OPERAÇÃO',
          'HALL DOS ELEVADORES: EM OPERAÇÃO',
          'METRÔ INTERDIMENSIONAL: BLOQUEADO (PRECISA DE CALIBRAÇÃO)',
          'ÁREA DE CARGA: BLOQUEADA (TERMINAL DE MANUTENÇÃO)',
        ] } },

    // Luminárias pelo salão.
    { id: 'luz_aero_n', tipo: 'luminaria', x: 1, y: 1, sprite: 'hub_props', frame: { col: 3, row: 2 }, scale: 0.3, anchorY: 0.94, bloqueia: false, brilho: { cor: '#35E6D3', raio: 0.7, forca: 0.14 } },
    { id: 'luz_aero_s', tipo: 'luminaria', x: 22, y: 16, sprite: 'hub_props', frame: { col: 3, row: 2 }, scale: 0.3, anchorY: 0.94, bloqueia: false, brilho: { cor: '#35E6D3', raio: 0.7, forca: 0.14 } },

    // ================================================================
    // SETOR DE PORTÕES (sul) — arcos de pilares com portais visuais
    // ================================================================
    // Portão: Saguão Central (oeste)
    { id: 'portao_saguao_visual', tipo: 'portao_visual', x: 1, y: 9,
      sprite: 'hub_props', frame: { col: 2, row: 0 }, scale: 0.5, anchorY: 0.94,
      bloqueia: false, brilho: { cor: '#35E6D3', raio: 1.1, forca: 0.22 } },
    // Portão: Setor Anime
    { id: 'portao_anime_visual', tipo: 'portao_visual', x: 7, y: 14,
      sprite: 'hub_props', frame: { col: 2, row: 0 }, scale: 0.5, anchorY: 0.94,
      bloqueia: false, brilho: { cor: '#ff9f1c', raio: 1.1, forca: 0.22 } },
    // Portão: Hall dos Elevadores
    { id: 'portao_elevadores_visual', tipo: 'portao_visual', x: 10, y: 14,
      sprite: 'hub_props', frame: { col: 1, row: 0 }, scale: 0.5, anchorY: 0.94,
      bloqueia: false, brilho: { cor: '#74ff8a', raio: 1.1, forca: 0.22 } },
    // Portão: Metrô Interdimensional
    { id: 'portao_metro_visual', tipo: 'portao_visual', x: 13, y: 14,
      sprite: 'hub_props', frame: { col: 2, row: 0 }, scale: 0.5, anchorY: 0.94,
      bloqueia: false, brilho: { cor: '#4caeff', raio: 1.1, forca: 0.22 } },
    // Portão: Área de Carga (bloqueado até diagnóstico)
    { id: 'portao_carga_visual', tipo: 'portao_visual', x: 16, y: 14,
      sprite: 'hub_props', frame: { col: 3, row: 0 }, scale: 0.5, anchorY: 0.94,
      bloqueia: false, brilho: { cor: '#ff6b6b', raio: 1.1, forca: 0.22 } },

    // ================================================================
    // TERMINAL DE MANUTENÇÃO — missão do Fragmento de Sincronização
    // ================================================================
    {
      id: 'terminal_manutencao',
      tipo: 'terminal',
      x: 11,
      y: 5,
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
    // Volta para o Saguão Central (oeste).
    {
      id: 'voltar_ao_saguao',
      tipo: 'door',
      x: 1,
      y: 9,
      label: 'VOLTAR AO SAGUÃO CENTRAL',
      interactionDistance: 1.10,
      destino: {
        mapId: 'hub_saguao',
        spawnId: 'vindo_do_aeroporto',
      },
      transition: 'fade',
    },
    // Portão: Setor Anime.
    {
      id: 'portao_setor_anime',
      tipo: 'door',
      x: 7,
      y: 14,
      label: 'IR PARA O SETOR ANIME',
      destino: {
        mapId: 'hub_setor_anime',
        spawnId: 'chegada_elevador',
      },
      transition: 'fade',
    },
    // Portão: Hall dos Elevadores.
    {
      id: 'portao_hall_elevadores',
      tipo: 'elevator',
      x: 10,
      y: 14,
      label: 'IR PARA O HALL DOS ELEVADORES',
      destino: {
        mapId: 'hub_elevadores',
        spawnId: 'vindo_do_aeroporto',
      },
      transition: 'fade',
    },
    // Portão: Metrô Interdimensional.
    {
      id: 'portao_metro',
      tipo: 'door',
      x: 13,
      y: 14,
      label: 'IR PARA O METRÔ INTERDIMENSIONAL',
      destino: {
        mapId: 'hub_metro',
        spawnId: 'vindo_do_saguao',
      },
      transition: 'fade',
    },
    // Portão: Área de Carga (bloqueado até diagnosticar o terminal).
    {
      id: 'porta_area_carga',
      tipo: 'door',
      x: 16,
      y: 14,
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
