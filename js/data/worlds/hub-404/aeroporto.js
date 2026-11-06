export const map = {
  id: 'hub_aeroporto',
  meta: {
    nome: 'PISO 0 - AEROPORTO CENTRAL',
    tipo: 'interior',
    dimensao: 'hub_404',
    corFundo: '#0f0f14',
  },
  spawnPoints: {
    inicio: { x: 4.5, y: 6.5 },
    chegada_elevador: { x: 10.5, y: 2.5 }, // Ponto onde o player aparece ao voltar do Setor Anime
    // Spawn longe o suficiente da porta de retorno.
    // O portal está no tile 1,5 → centro 1.5, 5.5.
    vindo_do_saguao: { x: 3.5, y: 6.5 },   // Ponto onde surge vindo do Saguão Central
    vindo_da_carga: { x: 10.5, y: 10.5 },
  },
  corChao: '#2a2f3a',
  layout: [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 1],
    [1, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1],
    [1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
    [1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // Tile 2 na esquerda para voltar ao saguão
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
    [1, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  ],
  actors: [
    { id: 'guia_aeroporto', x: 5, y: 5, cor: '#ff6b6b', nome: 'Guia do Aeroporto', fala: 'Bem-vindo ao Hub! Use o elevador ao norte ou volte à esquerda para o Saguão.' },
    { id: 'viajante', x: 8, y: 8, cor: '#4ecdc4', nome: 'Viajante', fala: 'Dizem que o Setor Anime fica no próximo piso...' },
  ],
  objects: [
    {
      id: 'terminal_manutencao',

      tipo: 'terminal',

      // Posição em uma área livre do Aeroporto.
      x: 6,
      y: 6,

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

        allowedArchetypes: ['motor_bio_forja'],

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
    {
      id: 'porta_carga_visual',

      tipo: 'porta_carga',

      x: 12,
      y: 10,

      ajusteY: 10,

      sprite: 'hub_props',
      frame: { col: 3, row: 0 },

      scale: 0.52,
      anchorY: 0.93,

      bloqueia: false,

      brilho: {
        cor: '#ffd54f',
        raio: 1.15,
        forca: 0.20,
      },
    },
    {
      id: 'porta_carga_visual',

      tipo: 'porta_carga',

      x: 12,
      y: 10,

      ajusteY: 10,

      sprite: 'hub_props',
      frame: { col: 3, row: 0 },

      scale: 0.52,
      anchorY: 0.93,

      bloqueia: false,

      brilho: {
        cor: '#ffd54f',
        raio: 1.15,
        forca: 0.20,
      },
    },
  ],
  portals: [
    {
      id: 'porta_area_carga',
      tipo: 'door',

      x: 12,
      y: 10,

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
    {
      id: 'porta_area_carga',
      tipo: 'door',

      x: 12,
      y: 10,

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
    {
      id: 'elevador_para_anime',
      tipo: 'elevator',
      x: 10,
      y: 2,
      label: 'IR PARA O SETOR ANIME',
      destino: {
        mapId: 'hub_setor_anime',
        spawnId: 'chegada_elevador',
      },
      transition: 'fade',
    },
    {
      id: 'voltar_ao_saguao',
      tipo: 'door',
      x: 1,
      y: 5,
      label: 'VOLTAR AO SAGUÃO CENTRAL',
      interactionDistance: 1.10,
      destino: {
        mapId: 'hub_saguao',
        spawnId: 'vindo_do_aeroporto',
      },
      transition: 'fade',
    }

  ],
};