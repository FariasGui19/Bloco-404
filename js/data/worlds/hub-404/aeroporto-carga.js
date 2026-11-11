// js/data/worlds/hub-404/aeroporto-carga.js
// =====================================================================
// ÁREA DE CARGA DESATIVADA — Bloco 404 (versão imersiva)
// =====================================================================
export const map = {
  id: 'hub_aeroporto_carga',

  meta: {
    nome: 'ÁREA DE CARGA DESATIVADA',
    tipo: 'interior',
    dimensao: 'hub_404',

    corFundo: '#0a0c12',
    estiloPiso: 'placas',

    alturaParede: 1.30,

    ambiente: {
      poeira: 40,
      cor: '#35E6D3',
    },
  },

  spawnPoints: {
    inicio: { x: 5.5, y: 11.0 },
    vindo_do_aeroporto: { x: 5.5, y: 11.0 },
  },

  corChao: '#141a24',

  // ------------------------------------------------------------------
  // LAYOUT 22 x 16
  // 0 = chão   1 = parede
  //
  // Norte: parede do contêiner de carga com dois vãos de serviço.
  // Oeste: parede lateral + porta de retorno ao aeroporto.
  // Leste: parede com zona de inspeção e grade de impulso ao fundo.
  // Sul: aberta, área de manobra com caixas e paletes.
  // ------------------------------------------------------------------
  layout: [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], // 0
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 1
    [1,0,0,0,1,1,1,0,0,0,1,1,1,0,0,0,0,0,0,0,0,1], // 2  contêiner norte
    [1,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,0,0,0,0,0,1], // 3
    [1,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,0,0,0,0,0,1], // 4
    [1,0,0,0,1,1,1,0,0,0,1,1,1,0,0,0,0,0,0,0,0,1], // 5
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 6
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 7
    [1,0,0,0,0,0,0,1,1,1,0,0,0,0,1,1,1,0,0,0,0,1], // 8  pilares centro
    [1,0,0,0,0,0,0,1,0,1,0,0,0,0,1,0,1,0,0,0,0,1], // 9
    [1,0,0,0,0,0,0,1,0,1,0,0,0,0,1,0,1,0,0,0,0,1], // 10
    [1,0,0,0,0,0,0,1,1,1,0,0,0,0,1,1,1,0,0,0,0,1], // 11
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 12
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 13
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 14
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], // 15
  ],

  pisos: {
    '2,9': [2, 0],
    '5,7': [1, 2],
    '8,5': [2, 1],
    '12,3': [2, 2],
    '13,3': [2, 2],
    '16,7': [2, 2],
  },

  paredes: {
    '0,6': [0, 2],
    '21,5': [2, 3],
  },

  actors: [
    // Viajante preso na área de carga (ambiental, dá dica da missão).
    { id: 'viajante_carga', tipo: 'viajante_ambiental', sprite: 'hub_viajante',
      x: 17.5, y: 12.5, nome: 'Viajante', semNome: true, solido: false, facing: 'left',
      interacao: { label: 'CONVERSAR COM VIAJANTE', speaker: 'VIAJANTE', distancia: 1.25,
        dialogue: ['Fiquei trancado aqui quando o campo de contenção fechou.', 'O Fragmento de Sincronização está do outro lado da grade. Você precisa do Propulsor de Impulso para atravessar.'] } },
  ],

  objects: [
    // ================================================================
    // ZONA DE ENTRADA / RETORNO (oeste)
    // ================================================================
    {
      id: 'registro_bio_carga',
      nome: 'REGISTRO DE MANUTENÇÃO',
      tipo: 'painel',
      x: 2,
      y: 2,
      sprite: 'hub_props',
      frame: { col: 0, row: 1 },
      scale: 0.28,
      anchorY: 0.94,
      bloqueia: false,
      brilho: { cor: '#35E6D3', raio: 0.8, forca: 0.20 },
      interacao: { label: 'LER REGISTRO', distancia: 1.3, speaker: 'ARQUIVO DE CARGA',
        dialogue: ['A GRADE PROTEGE O FRAGMENTO APÓS UMA FALHA NO SETOR.', 'RECONFIGURE O PAINEL COM R E USE Q PARA ATRAVESSAR O CAMPO.'] } },

    // ================================================================
    // CONTÊINERES DE CARGA (norte) — obstáculos visuais e de cobertura
    // ================================================================
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
      id: 'caixa_carga_03',
      tipo: 'caixa',
      x: 15,
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
      id: 'caixa_carga_04',
      tipo: 'caixa',
      x: 16,
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

    // ================================================================
    // PAINEL DE SEGURANÇA — diagnóstico (R) que libera a grade
    // ================================================================
    {
      id: 'painel_seguranca_carga',
      tipo: 'painel',
      x: 12,
      y: 5,
      ajusteY: 10,
      sprite: 'hub_props',
      frame: { col: 1, row: 3 },
      scale: 0.43,
      anchorY: 0.94,
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

    // ================================================================
    // GRADE DE IMPULSO CINÉTICO — barreira que só cede ao dash (Q)
    // Fica entre a área principal e a zona do Fragmento (leste).
    // ================================================================
    {
      id: 'grade_impulso_fragmento',
      tipo: 'grade_impulso',
      x: 18,
      y: 7,
      espelhar: true,
      ajusteY: 18,
      sprite: 'hub_props',
      frame: { col: 3, row: 3 },
      scale: 0.44,
      anchorY: 0.95,
      bloqueia: true,
      dashPassable: true,
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

    // ================================================================
    // PALLETES E CAIXAS AO REDOR DA GRADE (criam labirinto leve)
    // ================================================================
    {
      id: 'palete_carga_01',
      tipo: 'caixa',
      x: 17,
      y: 9,
      ajusteY: 14,
      sprite: 'hub_props',
      frame: { col: 0, row: 3 },
      scale: 0.38,
      anchorY: 0.94,
      bloqueia: true,
      hitbox: { offsetX: -0.3, offsetY: -0.3, width: 0.6, height: 0.6 },
    },
    {
      id: 'palete_carga_02',
      tipo: 'caixa',
      x: 19,
      y: 9,
      ajusteY: 14,
      sprite: 'hub_props',
      frame: { col: 0, row: 3 },
      scale: 0.38,
      anchorY: 0.94,
      bloqueia: true,
      hitbox: { offsetX: -0.3, offsetY: -0.3, width: 0.6, height: 0.6 },
    },
    {
      id: 'carga_pesada_01',
      tipo: 'caixa',
      x: 18,
      y: 11,
      ajusteY: 14,
      sprite: 'hub_props',
      frame: { col: 0, row: 3 },
      scale: 0.45,
      anchorY: 0.94,
      bloqueia: true,
      hitbox: { offsetX: -0.38, offsetY: -0.38, width: 0.76, height: 0.76 },
    },

    // Luminária industrial no canto.
    { id: 'luz_carga', tipo: 'luminaria', x: 20, y: 2, sprite: 'hub_props', frame: { col: 3, row: 2 }, scale: 0.32, anchorY: 0.94, bloqueia: false, brilho: { cor: '#35E6D3', raio: 0.9, forca: 0.16 } },
  ],

  // ==================================================================
  // FRAGMENTO DE SINCRONIZAÇÃO
  // Só aparece depois que o player usa R no Painel de Segurança.
  // Fica atrás da Grade de Impulso, exigindo Dash com Q.
  // ==================================================================
  collectibles: [
    {
      id: 'fragmento_sincronizacao',
      tipo: 'fragmento',
      x: 19,
      y: 4,
      label: 'COLETAR FRAGMENTO DE SINCRONIZAÇÃO',
      interactionDistance: 1.25,
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
      y: 13,
      label: 'VOLTAR AO AEROPORTO CENTRAL',
      destino: {
        mapId: 'hub_aeroporto',
        spawnId: 'vindo_da_carga',
      },
      transition: 'fade',
    },
  ],
};
