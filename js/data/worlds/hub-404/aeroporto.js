// js/data/worlds/hub-404/aeroporto.js
// =====================================================================
// PISO 0 - AEROPORTO CENTRAL (ZONA X10) — Perspectiva Side-View 2.5D
// =====================================================================
// Estação espacial panorâmica em visão frontal/lateral profunda
// (estilo sci-fi anos 90: Flashback / Another World):
//  - Movimento predominantemente horizontal (Esquerda / Direita)
//  - Janelões panorâmicos com espaço sideral, planeta anelado e naves
//  - Piso reflexivo espelhado na passarela principal
//  - Guia do Aeroporto com sprite próprio no Concourse Central
//  - 4 Portais verticais para as salas de missão por arquétipo
//  - Terminal de Manutenção (Link de Diagnóstico [R]) + Hangar de Carga
// =====================================================================

const ROW_WALL  = [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1];
const ROW_FLOOR = [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1];

export const map = {
  id: 'hub_aeroporto',

  meta: {
    nome: 'PISO 0 - AEROPORTO CENTRAL',
    tipo: 'interior',
    dimensao: 'hub_404',
    corFundo: '#060a10',
    sideView: true,
    minZoom: 0.85,
    backgroundCoversFloor: true,
    sideViewBackground: {
      space: 'aeroporto_background',
    },
    ambiente: {
      poeira: 14,
      cor: '#35E6D3',
    },
  },

  spawnPoints: {
    inicio: { x: 14.5, y: 4.4 },               // Concourse central (próximo à Guia)
    vindo_do_saguao: { x: 4.2, y: 4.2 },       // Ala Oeste (desembarque do Saguão)
    chegada_sala_bio: { x: 22.5, y: 3.8 },     // Em frente à Doca A1 (Bio-Forja)
    chegada_sala_dominio: { x: 26.5, y: 3.8 }, // Em frente à Doca B2 (Domínio)
    chegada_sala_mare: { x: 30.5, y: 3.8 },    // Em frente à Doca C3 (Maré Astral)
    chegada_sala_nucleo: { x: 34.5, y: 3.8 },  // Em frente à Doca D4 (Núcleo 10X)
    vindo_da_carga: { x: 40.5, y: 4.2 },       // Ala Leste (retorno da Área de Carga / Câmaras)
  },

  corChao: '#101b2b',

  // ------------------------------------------------------------------
  // LAYOUT 44 x 9 (Corredor Panorâmico Horizontal 2.5D)
  // y = 0..1 : Parede norte / Janelões panorâmicos / Pórticos verticais
  // y = 2..6 : Passarela reflexiva caminhável (x = 1..42)
  // y = 7..8 : Guarda-corpo frontal da passarela
  // ------------------------------------------------------------------
  layout: [
    [...ROW_WALL],  // 0
    [...ROW_WALL],  // 1
    [...ROW_FLOOR], // 2  faixa junto aos portais e terminais
    [...ROW_FLOOR], // 3  faixa superior da passarela
    [...ROW_FLOOR], // 4  eixo central da passarela
    [...ROW_FLOOR], // 5  faixa de bancos / mirante
    [...ROW_FLOOR], // 6  borda sul caminhável
    [...ROW_WALL],  // 7
    [...ROW_WALL],  // 8
  ],

  pisos: {},
  paredes: {},

  actors: [
    // Guia do Aeroporto — no Concourse Central, com vista para os janelões
    {
      id: 'guia_aeroporto',
      x: 14,
      y: 3,
      nome: 'Guia do Aeroporto',
      cor: '#35E6D3',
      sprite: 'guia_aeroporto',
      facing: 'down',
      pose: 'idle',
      interacao: {
        label: 'FALAR COM A GUIA',
        speaker: 'GUIA DO AEROPORTO',
        distancia: 1.85,
        dialogue: [
          'Bem-vindo à Galeria Panorâmica do Aeroporto Central — Zona X10.',
          'Caminhe para a direita ao longo da estação para acessar as Docas de Arquétipo.',
          'As Docas A1 a D4 conectam às salas do Motor Bio-Forja, Lâmina Domínio, Maré Astral e Núcleo 10X.',
          'Mais ao leste fica o Hangar da Área de Carga. Use o Link de Diagnóstico [R] no Terminal de Manutenção para liberar a comporta.',
        ],
      },
    },
  ],

  objects: [
    // ================================================================
    // SETOR A (OESTE, x = 2..10) — DESEMBARQUE & RECEPÇÃO
    // ================================================================
    {
      id: 'balcao_recepcao_01',
      tipo: 'balcao',
      x: 6,
      y: 2,
      sprite: 'hub_props',
      frame: { col: 0, row: 0 },
      scale: 0.46,
      anchorY: 0.94,
      bloqueia: true,
      hitbox: { offsetX: -0.35, offsetY: -0.25, width: 0.70, height: 0.50 },
      brilho: { cor: '#35E6D3', raio: 0.9, forca: 0.18 },
    },
    {
      id: 'malas_aero_01',
      tipo: 'malas',
      x: 7,
      y: 2,
      sprite: 'hub_props',
      frame: { col: 2, row: 1 },
      scale: 0.34,
      anchorY: 0.94,
      bloqueia: false,
    },
    {
      id: 'terminal_info',
      tipo: 'terminal',
      x: 9,
      y: 2,
      sprite: 'hub_props',
      frame: { col: 0, row: 1 },
      scale: 0.38,
      anchorY: 0.94,
      bloqueia: false,
      brilho: { cor: '#35E6D3', raio: 0.8, forca: 0.22 },
      interacao: {
        label: 'CONSULTAR MAPA DA ESTAÇÃO',
        speaker: 'TERMINAL DE INFORMAÇÕES',
        distancia: 1.65,
        dialogue: [
          'ESTAÇÃO ORBITAL · PISO 0 — AEROPORTO CENTRAL (ZONA X10)',
          '◄ OESTE (GATE 00): RETORNO AO SAGUÃO CENTRAL',
          '• CENTRO: CONCOURSE PANORÂMICO & GUIA DIMENSIONAL',
          '► LESTE (DOCAS A1–D4): SALAS DE MISSÃO POR ARQUÉTIPO',
          '► EXTREMO LESTE (HANGAR C-04): TERMINAL DE MANUTENÇÃO & ÁREA DE CARGA',
        ],
      },
    },
    {
      id: 'banco_aero_01',
      tipo: 'banco',
      x: 8,
      y: 5,
      sprite: 'hub_props',
      frame: { col: 1, row: 1 },
      scale: 0.42,
      anchorY: 0.94,
      bloqueia: true,
      hitbox: { offsetX: -0.35, offsetY: -0.20, width: 0.70, height: 0.40 },
    },

    // ================================================================
    // SETOR B (CENTRO, x = 11..20) — MIRANTE ORBITAL & PARTIDAS
    // ================================================================
    {
      id: 'banco_aero_02',
      tipo: 'banco',
      x: 12,
      y: 5,
      sprite: 'hub_props',
      frame: { col: 1, row: 1 },
      scale: 0.42,
      anchorY: 0.94,
      bloqueia: true,
      hitbox: { offsetX: -0.35, offsetY: -0.20, width: 0.70, height: 0.40 },
    },
    {
      id: 'painel_partidas',
      tipo: 'painel',
      x: 17,
      y: 2,
      sprite: 'hub_props',
      frame: { col: 1, row: 3 },
      scale: 0.44,
      anchorY: 0.94,
      bloqueia: false,
      brilho: { cor: '#ffd54f', raio: 1.1, forca: 0.24 },
      interacao: {
        label: 'PAINEL DE PARTIDAS',
        speaker: 'PAINEL DE DESTINOS',
        distancia: 1.65,
        dialogue: [
          'PAINEL DE PARTIDAS — AEROPORTO CENTRAL BLOCO 404',
          'DOCA A1 · MOTOR BIO-FORJA — [ONLINE]',
          'DOCA B2 · LÂMINA DOMÍNIO ANCIÃO — [ONLINE]',
          'DOCA C3 · MARÉ ASTRAL — [ONLINE]',
          'DOCA D4 · NÚCLEO 10X — [ONLINE]',
          'HANGAR C-04 · ÁREA DE CARGA — [REQUER DIAGNÓSTICO DE TERMINAL]',
        ],
      },
    },
    {
      id: 'banco_aero_03',
      tipo: 'banco',
      x: 19,
      y: 5,
      sprite: 'hub_props',
      frame: { col: 1, row: 1 },
      scale: 0.42,
      anchorY: 0.94,
      bloqueia: true,
      hitbox: { offsetX: -0.35, offsetY: -0.20, width: 0.70, height: 0.40 },
    },

    // ================================================================
    // SETOR C (LESTE-CENTRO, x = 21..35) — DOCAS DE ARQUÉTIPO
    // ================================================================
    {
      id: 'malas_aero_02',
      tipo: 'malas',
      x: 24,
      y: 5,
      sprite: 'hub_props',
      frame: { col: 2, row: 1 },
      scale: 0.34,
      anchorY: 0.94,
      bloqueia: false,
    },
    {
      id: 'banco_aero_04',
      tipo: 'banco',
      x: 28,
      y: 5,
      sprite: 'hub_props',
      frame: { col: 1, row: 1 },
      scale: 0.42,
      anchorY: 0.94,
      bloqueia: true,
      hitbox: { offsetX: -0.35, offsetY: -0.20, width: 0.70, height: 0.40 },
    },
    {
      id: 'malas_aero_03',
      tipo: 'malas',
      x: 32,
      y: 5,
      sprite: 'hub_props',
      frame: { col: 2, row: 1 },
      scale: 0.34,
      anchorY: 0.94,
      bloqueia: false,
    },

    // ================================================================
    // SETOR D (EXTREMO LESTE, x = 36..42) — TERMINAL DE MANUTENÇÃO & CARGA
    // ================================================================
    {
      id: 'terminal_manutencao',
      tipo: 'terminal',
      x: 37,
      y: 2,
      ajusteY: 8,
      sprite: 'hub_props',
      frame: { col: 1, row: 3 },
      scale: 0.48,
      anchorY: 0.94,
      bloqueia: true,
      hitbox: {
        offsetX: -0.28,
        offsetY: -0.22,
        width: 0.56,
        height: 0.44,
      },
      interacao: {
        label: 'CONSULTAR TERMINAL',
        speaker: 'TERMINAL DE MANUTENÇÃO',
        distancia: 1.65,
        dialogue: [
          'SISTEMA DO HANGAR C-04 EM MODO DE CONTENÇÃO.',
          'SINCRONIA DA COMPORTA DE CARGA PENDENTE.',
          'DICA: PRESSIONE [R] PARA EXECUTAR O LINK DE DIAGNÓSTICO DO SEU MÓDULO.',
        ],
      },
      moduleSystem: {
        id: 'airport_maintenance_terminal',
        allowedArchetypes: ['motor_bio_forja', 'lamina_dominio_anciao', 'mare_astral', 'nucleo_dez_forma'],
        label: 'DIAGNOSTICAR TERMINAL',
        distance: 1.85,
        speaker: 'TERMINAL DE MANUTENÇÃO',
      },
      brilho: {
        cor: '#ffd54f',
        raio: 1.2,
        forca: 0.26,
      },
    },
    {
      id: 'malas_aero_04',
      tipo: 'caixa',
      x: 38,
      y: 5,
      sprite: 'hub_props',
      frame: { col: 0, row: 3 },
      scale: 0.38,
      anchorY: 0.94,
      bloqueia: false,
    },
  ],

  portals: [
    // Oeste: Retorno ao Saguão Central
    {
      id: 'voltar_ao_saguao',
      tipo: 'door',
      x: 3,
      y: 2,
      label: 'VOLTAR AO SAGUÃO CENTRAL',
      interactionDistance: 1.75,
      destino: {
        mapId: 'hub_saguao',
        spawnId: 'vindo_do_aeroporto',
      },
      transition: 'fade',
    },

    // Docas de Arquétipo ao longo da galeria horizontal
    {
      id: 'portal_sala_bio_forja',
      tipo: 'door',
      x: 22,
      y: 2,
      label: 'ENTRAR NA SALA — MOTOR BIO-FORJA',
      interactionDistance: 1.75,
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
      y: 2,
      label: 'ENTRAR NA SALA — LÂMINA DOMÍNIO',
      interactionDistance: 1.75,
      destino: {
        mapId: 'sala_dominio',
        spawnId: 'vindo_do_aeroporto',
      },
      transition: 'fade',
    },
    {
      id: 'portal_sala_mare',
      tipo: 'door',
      x: 30,
      y: 2,
      label: 'ENTRAR NA SALA — MARÉ ASTRAL',
      interactionDistance: 1.75,
      destino: {
        mapId: 'sala_mare',
        spawnId: 'vindo_do_aeroporto',
      },
      transition: 'fade',
    },
    {
      id: 'portal_sala_nucleo',
      tipo: 'door',
      x: 34,
      y: 2,
      label: 'ENTRAR NA SALA — NÚCLEO 10X',
      interactionDistance: 1.75,
      destino: {
        mapId: 'sala_nucleo',
        spawnId: 'vindo_do_aeroporto',
      },
      transition: 'fade',
    },

    // Extremo Leste: Portão da Área de Carga / Câmaras de Eco
    {
      id: 'porta_area_carga',
      tipo: 'door',
      x: 40,
      y: 2,
      label: 'ACESSAR ÁREA DE CARGA',
      lockedLabel: 'ÁREA DE CARGA SEM SINCRONIA',
      interactionDistance: 1.80,
      requiresFlag: 'airportTerminalDiagnosed',
      mensagemBloqueado: [
        'ACESSO À ÁREA DE CARGA BLOQUEADO.',
        'RECOMENDAÇÃO: UTILIZE O LINK DE DIAGNÓSTICO [R] NO TERMINAL DE MANUTENÇÃO AO LADO.',
      ],
      destino: {
        mapId: 'hub_aeroporto_carga',
        spawnId: 'vindo_do_aeroporto',
      },
      transition: 'fade',
    },
  ],
};
