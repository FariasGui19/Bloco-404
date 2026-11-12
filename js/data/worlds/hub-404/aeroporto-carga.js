// js/data/worlds/hub-404/aeroporto-carga.js
// =====================================================================
// ÁREA DE CARGA DESATIVADA
//
// Primeira área de missão da Calibração de Eco.
// =====================================================================

export const map = {
  id: 'hub_aeroporto_carga',

  meta: {
    nome: 'ÁREA DE CARGA DESATIVADA',
    tipo: 'interior',
    dimensao: 'hub_404',

    corFundo: '#0d1118',
    estiloPiso: 'placas',
    estiloSala: 'carga_eco',
    cargoKey: 'bio',
    corTema: '#35E6D3',

    alturaParede: 1.20,

    ambiente: {
      poeira: 22,
      cor: '#35E6D3',
    },
  },

  spawnPoints: {
    // Área livre no canto inferior esquerdo.
    // Distante da porta de retorno em x:2, y:9.
    inicio: { x: 4.5, y: 9.5 },
    vindo_do_aeroporto: { x: 4.5, y: 9.5 },
  },

  corChao: '#1a2028',

  layout: [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
    [1, 0, 0, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 1],
    [1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
    [1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1],
    [1, 0, 0, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  ],

  pisos: {
    '2,9': [2, 0],
    '4,7': [1, 2],
    '7,5': [2, 1],
    '10,4': [2, 2],
    '11,4': [2, 2],
    '10,5': [2, 2],
  },

  paredes: {
    '0,6': [0, 2],
    '6,0': [0, 3],
    '13,5': [2, 3],
  },

  actors: [],

  objects: [
    { id: 'registro_bio_carga', nome: 'REGISTRO DE MANUTENÇÃO', tipo: 'painel', x: 2, y: 2,
      sprite: 'hub_props', frame: { col: 0, row: 1 }, scale: 0.28, anchorY: 0.94,
      bloqueia: false, brilho: { cor: '#35E6D3', raio: 0.8, forca: 0.20 },
      interacao: { label: 'LER REGISTRO', distancia: 1.3, speaker: 'ARQUIVO DE CARGA',
        dialogue: ['A GRADE PROTEGE O FRAGMENTO APÓS UMA FALHA NO SETOR.', 'RECONFIGURE O PAINEL COM R E USE Q PARA ATRAVESSAR O CAMPO.'] } },
    {
      id: 'caixa_carga_01',
      tipo: 'caixa',

      x: 4,
      y: 6,

      ajusteY: 14,

      sprite: 'hub_props',
      frame: { col: 0, row: 3 },

      scale: 0.42,
      anchorY: 0.94,

      bloqueia: true,

      hitbox: {
        offsetX: -0.35,
        offsetY: -0.35,
        width: 0.70,
        height: 0.70,
      },
    },

    {
      id: 'caixa_carga_02',
      tipo: 'caixa',

      x: 5,
      y: 6,

      ajusteY: 14,

      sprite: 'hub_props',
      frame: { col: 0, row: 3 },

      scale: 0.42,
      anchorY: 0.94,

      bloqueia: true,

      hitbox: {
        offsetX: -0.35,
        offsetY: -0.35,
        width: 0.70,
        height: 0.70,
      },
    },

    {
      id: 'malas_carga',

      tipo: 'malas',

      x: 3,
      y: 3,

      ajusteY: 13,

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
      id: 'painel_seguranca_carga',

      tipo: 'painel',

      x: 8,
      y: 5,

      ajusteY: 10,

      sprite: 'bio_sala_pilar_sensor',
      useCrop: true,
      larguraPx: 66,
      pivotX: 0.5,
      pivotY: 0.94,
      sombra: [24, 10],

      bloqueia: true,

      hitbox: {
        offsetX: -0.28,
        offsetY: -0.28,
        width: 0.56,
        height: 0.56,
      },

      interacao: {
        label: 'CONSULTAR PAINEL DE SEGURANÇA',
        speaker: 'PAINEL DE SEGURANÇA',

        distancia: 1.45,

        dialogue: [
          'CAMPO DE CONTENÇÃO ATIVO.',
          'ACESSO AO ARQUIVO DE CARGA NEGADO.',
          'UMA INTERFACE DE RECONFIGURAÇÃO PODERIA ALTERAR ESTE ESTADO.',
        ],
      },

      moduleSystem: {
        id: 'cargo_security_panel',

        allowedArchetypes: ['motor_bio_forja'],

        label: 'RECONFIGURAR CAMPO DE SEGURANÇA',

        distance: 1.60,

        speaker: 'PAINEL DE SEGURANÇA',
      },

      brilho: {
        cor: '#ffb24c',
        raio: 0.95,
        forca: 0.25,
      },
    },

    {
      id: 'grade_impulso_fragmento',

      tipo: 'grade_impulso',

      // Abertura entre a área principal e a zona do Fragmento.
      x: 10,
      y: 5,
      espelhar: true,

      ajusteY: 18,

      sprite: 'bio_sala_grade_contencao',
      useCrop: true,
      larguraPx: 124,
      pivotX: 0.5,
      pivotY: 0.92,
      sombra: [48, 19],

      bloqueia: true,

      // Andando normalmente bloqueia.
      // Durante Bio-Dash, permite passagem.
      dashPassable: true,

      // Só libera o dash após usar R no painel.
      dashPassableRequiresFlag: 'cargoSecurityDiagnosed',

      hitbox: {
        offsetX: -0.70,
        offsetY: -0.18,
        width: 1.40,
        height: 0.38,
      },

      depthOffset: 0.12,

      brilho: {
        cor: '#35E6D3',
        raio: 1.25,
        forca: 0.38,
      },

      interacao: {
        label: 'ANALISAR GRADE DE IMPULSO',
        speaker: 'GRADE DE IMPULSO CINÉTICO',

        distancia: 1.35,

        dialogue: [
          'CAMPO CINÉTICO ATIVO.',
          'TRAVESSIA A PÉ: NEGADA.',
          'JANELA DE ACELERAÇÃO: DETECTADA.',
          'PROPULSOR DE IMPULSO RECOMENDADO.',
        ],
      },
    },
  ],

  // ===============================================================
  // FRAGMENTO DE SINCRONIZAÇÃO
  //
  // Só aparece depois que o player usa R no Painel de Segurança.
  // Fica atrás da Grade de Impulso, exigindo Dash com Q.
  // ===============================================================
  collectibles: [
    {
      id: 'fragmento_sincronizacao',

      tipo: 'fragmento',

      // Do outro lado da Grade de Impulso.
      x: 11,
      y: 4,

      label: 'COLETAR FRAGMENTO DE SINCRONIZAÇÃO',

      interactionDistance: 1.25,

      // Só aparece quando R reconfigura o painel.
      requiresFlag: 'cargoSecurityDiagnosed',

      speaker: 'FRAGMENTO DE SINCRONIZAÇÃO',

      nome: 'FRAGMENTO DE SINCRONIZAÇÃO',

      dialogue: [
        'FRAGMENTO DE SINCRONIZAÇÃO COLETADO.',
        'ASSINATURA DIMENSIONAL ESTÁVEL DETECTADA.',
        'GRADE DE IMPULSO ATRAVESSADA COM ÊXITO.',
        'A LINHA INTERDIMENSIONAL PODE ACEITAR CALIBRAÇÃO.',
        'MISSÃO ATUALIZADA: RETORNE AO PAINEL DO METRÔ NO SAGUÃO CENTRAL.',
      ],
    },
  ],


  portals: [
    {
      id: 'voltar_ao_aeroporto',

      tipo: 'door',

      x: 2,
      y: 9,

      label: 'VOLTAR AO AEROPORTO CENTRAL',

      destino: {
        mapId: 'hub_aeroporto',
        spawnId: 'vindo_da_carga',
      },

      transition: 'fade',
    },
  ],
};