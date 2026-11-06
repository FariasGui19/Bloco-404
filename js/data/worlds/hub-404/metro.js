// js/data/worlds/hub-404/metro.js
// =====================================================================
// METRÔ INTERDIMENSIONAL — PLATAFORMA MODULAR LIMPA
//
// Layout visual:
// Trilhos/Trem ao norte
// Plataforma central
// Gerador esquerdo
// Rotas à direita
// Catracas e espera ao sul
// =====================================================================
import { linhaDoTrem } from '../../shared/linha-trem.js';

export const map = {
  id: 'hub_metro',

  meta: {
    nome: 'METRÔ INTERDIMENSIONAL',
    tipo: 'interior',
    dimensao: 'hub_404',

    corFundo: '#071016',

    // Não sorteia pisos aleatórios.
    // O piso base fica limpo, os elementos especiais ficam em metroTiles.
    estiloPiso: 'metro',

    alturaParede: 0.9,
    // A sheet de trilhos veio orientada no eixo contrário ao trem.
    // 90° gira apenas o conteúdo visual dos tiles.
    metroRailRotation: -90,

    // O background hero será usado em cutscenes/tela de embarque.
    disableBackground: true,

    ambiente: {
      poeira: 10,
      cor: '#35E6D3',
    },
  },

  spawnPoints: {
    inicio: { x: 8.0, y: 10.5 },
    vindo_do_saguao: { x: 8.0, y: 10.5 },
    vindo_da_ilha: { x: 8.0, y: 5.5 },
  },

  corChao: '#151d25',

  // -------------------------------------------------------------------
  // MAPA 14 x 12
  //
  // Os trilhos são visuais e bloqueados pela walkMask.
  // As paredes externas continuam físicas.
  // -------------------------------------------------------------------
  layout: [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  ],

  // -------------------------------------------------------------------
  // ÁREA CAMINHÁVEL
  //
  // Trilhos e faixa de segurança são bloqueados.
  // A plataforma começa no y:4.
  // -------------------------------------------------------------------
  walkMask: [
    '##############',
    '##############',
    '##############',
    '##############',
    '#............#', // <--- Corrigido aqui (era #........#####)
    '#............#',
    '#............#',
    '#............#',
    '#............#',
    '#............#',
    '#............#',
    '##############',
  ],

  // -------------------------------------------------------------------
  // TILES VISUAIS
  //
  // metro-platform-tiles.png:
  // [0,0] piso básico
  // [0,1] faixa amarela
  // [0,2] trilho energético
  // [0,3] trilho escuro
  // [1,0] marcação plataforma
  // [1,1] seta
  // [1,2] grade
  // [1,3] luz embutida
  // [2,0] controle acesso
  // [2,1] setor gerador
  // [2,2] energia
  // [2,3] perigo vermelho
  // -------------------------------------------------------------------
  metroTiles: {
    // Plataforma de embarque.
    '6,4': [1, 0], '7,4': [1, 0], '8,4': [1, 1], '9,4': [1, 0], '10,4': [1, 0],

    // Corredor principal (2 tiles: x=7 e x=8).
    '7,5': [1, 3], '8,5': [1, 3],
    '7,6': [1, 1], '8,6': [1, 1],
    '7,7': [1, 1], '8,7': [1, 1],

    // Acesso / catracas.
    '7,8': [2, 0], '8,8': [2, 0],
    '7,9': [1, 2], '8,9': [1, 2],

    // Entrada.
    '7,10': [1, 1], '8,10': [1, 1],

    // Setor do gerador e do painel de rotas.
    '2,6': [2, 1], '3,6': [2, 1],
    '12,6': [1, 3],
  },
  // -------------------------------------------------------------------
  // TRILHOS + FAIXA DE SEGURANÇA
  //
  // Sheet metro-rail-kit.png
  //
  // Linha 0:
  // col 0 = piso plataforma limpo
  // col 1 = faixa de segurança amarela
  // col 2 = trilho ativo ciano
  // col 3 = trilho apagado
  //
  // Linha 1:
  // col 0 = curva
  // col 1 = batente/plataforma
  // col 2 = zona de embarque ciano
  // col 3 = área restrita vermelha
  // -------------------------------------------------------------------
  metroRailTiles: {},

  pisos: {},
  paredes: {},
  actors: [],

  // -------------------------------------------------------------------
  // OBJETOS
  // -------------------------------------------------------------------
  objects: [
    
    ...linhaDoTrem(),
    // ===============================================================
    // SOMBRA DO RIVAL (Só aparece após calibrar o metrô)
    // ===============================================================
    // ===============================================================
    // SOMBRA DO RIVAL
    // ===============================================================
    {
      id: 'sombra_rival',
      tipo: 'rival',
      x: 7.1,
      y: 2.0,            // mesmo ponto do trem: o ajuste é relativo a ele
      sprite: 'player',
      frame: { col: 0, row: 0 },   // parado, de frente
      useCrop: true,
      camada: 'fundo',
      ordem: 1.5,
      larguraPx: 40,     // altura final ~75px: cabe na porta
      pivotX: 0.5,
      pivotY: 1.0,       // pés ancorados: ajusteY passa a ser o chão do vagão
      ajusteX: -18,      // centro da porta
      ajusteY: 8,        // um pouco para dentro do vagão
      bloqueia: false,
      filter: 'hue-rotate(270deg) saturate(3) brightness(1.2) opacity(0.5)',
      showWhenFlag: 'metroCalibrado',
    },

    // Gerador técnico, canto esquerdo.
    {
      id: 'gerador_metro',
      tipo: 'gerador',

      x: 2,
      y: 6,

      sprite: 'metro_props',
      frame: { col: 2, row: 1 },

      scale: 0.40,
      anchorY: 0.94,

      bloqueia: true,

      hitbox: {
        offsetX: -0.36,
        offsetY: -0.36,
        width: 0.72,
        height: 0.72,
      },

      brilho: {
        cor: '#35E6D3',
        raio: 1.12,
        forca: 0.30,
      },

      interacao: {
        label: 'CONSULTAR GERADOR',
        speaker: 'GERADOR DIMENSIONAL',

        distancia: 1.45,

        dialogue: [
          'GERADOR DE ROTA: OPERACIONAL.',
          'ENERGIA SUFICIENTE PARA UMA LINHA DE BAIXA COMPLEXIDADE.',
          'ROTAS ADICIONAIS EXIGEM FRAGMENTOS DE ECO.',
        ],
      },
    },

    // Painel de rotas, canto direito.
    {
      id: 'painel_rotas_metro',
      tipo: 'painel_rotas',
      x: 12, y: 6,
      sprite: 'metro_props',
      frame: { col: 1, row: 3 },
      useCrop: true,
      larguraPx: 52,
      pivotX: 0.5, pivotY: 1.0,
      ajusteY: 8,
      bloqueia: true,
      hitbox: { offsetX: -0.3, offsetY: -0.3, width: 0.6, height: 0.6 },
      brilho: { cor: '#35E6D3', raio: 1.0, forca: 0.25 },
      interacao: {
        label: 'CONSULTAR ROTAS',
        speaker: 'PAINEL DE ROTAS',
        distancia: 1.55,
        dialogue: [
          'LINHA PRIMÁRIA: ARQUIPÉLAGO DAS ROTAS PERDIDAS.',
          'STATUS: CALIBRAÇÃO EM ANDAMENTO.',
          'OUTRAS LINHAS: BLOQUEADAS POR INSTABILIDADE DIMENSIONAL.',
        ],
      },
    },
    // PILARES: emolduram o vão de embarque (simétricos em x=8.0)
    ...[4, 11].map((px, i) => ({
      id: `pilar_metro_${i + 1}`,
      tipo: 'pilar',
      x: px, y: 5,
      sprite: 'metro_structure',
      frame: { col: 1, row: 0 },
      useCrop: true,
      larguraPx: 40,
      pivotX: 0.5, pivotY: 1.0,
      ajusteY: 8,
      bloqueia: true,
      hitbox: { offsetX: -0.22, offsetY: -0.22, width: 0.44, height: 0.44 },
    })),

    // Área de espera esquerda.
    {
      id: 'banco_metro_esquerdo',
      tipo: 'banco',
      x: 5, y: 7,
      sprite: 'metro_props',
      frame: { col: 0, row: 1 },
      scale: 0.38, anchorY: 0.94,
      bloqueia: true,
      hitbox: { offsetX: -0.34, offsetY: -0.62, width: 0.68, height: 1.24 },
    },

    // Área de espera direita.
    {
      id: 'banco_metro_direito',
      tipo: 'banco',
      x: 10, y: 7,
      sprite: 'metro_props',
      frame: { col: 0, row: 1 },
      scale: 0.38, anchorY: 0.94,
      espelhar: true,
      bloqueia: true,
      hitbox: { offsetX: -0.34, offsetY: -0.62, width: 0.68, height: 1.24 },
    },
    // Lixeira, caixote (esquerda) e carrinho técnico (direita)
    {
      id: 'lixeira_metro',
      tipo: 'lixeira',
      x: 6, y: 6,
      sprite: 'metro_structure',
      frame: { col: 1, row: 2 },
      useCrop: true, larguraPx: 40,
      pivotX: 0.5, pivotY: 1.0, ajusteY: 8,
      bloqueia: true,
      hitbox: { offsetX: -0.2, offsetY: -0.2, width: 0.4, height: 0.4 },
    },
    {
      id: 'caixote_metro',
      tipo: 'caixote',
      x: 2, y: 8,
      sprite: 'metro_props',
      frame: { col: 0, row: 2 },
      useCrop: true, larguraPx: 70,
      pivotX: 0.5, pivotY: 1.0, ajusteY: 8,
      bloqueia: true,
      hitbox: { offsetX: -0.45, offsetY: -0.45, width: 0.9, height: 0.9 },
    },
    // BILHETERIA: catracas (vão de 1,5 tile centrado em x=8.0)
    ...[6.5, 8.5].map((cx, i) => ({
      id: `catraca_metro_0${i + 1}`,
      tipo: 'catraca',
      x: cx, y: 9,
      sprite: 'metro_props',
      frame: { col: 1, row: 1 },
      scale: 0.32, anchorY: 0.94,
      bloqueia: true,
      hitbox: { offsetX: -0.24, offsetY: -0.24, width: 0.48, height: 0.48 },
    })),

    // Cancelas de energia: fecham a linha de bilheteria até as paredes.
    // Espelhadas para correr ao longo do eixo X.
    ...[1.45, 3.35, 5.25, 9.65, 11.5].map((fx, i) => ({
      id: `cancela_energia_${i + 1}`,
      tipo: 'cancela_energia',
      x: fx, y: 9,
      sprite: 'metro_props',
      frame: { col: 3, row: 2 },
      useCrop: true, larguraPx: 80,
      pivotX: 0.5, pivotY: 1.0, ajusteY: 8,
      espelhar: true,
      bloqueia: true,
      hitbox: { offsetX: -0.2, offsetY: -0.9, width: 0.4, height: 1.8 },
    })),

    // Máquina de bilhete (espelha o terminal_rota_metro em x=10)
    {
      id: 'bilheteria_metro',
      tipo: 'bilheteria',
      x: 5, y: 10,
      sprite: 'metro_props',
      frame: { col: 2, row: 0 },
      useCrop: true, larguraPx: 48,
      pivotX: 0.5, pivotY: 1.0, ajusteY: 8,
      bloqueia: true,
      hitbox: { offsetX: -0.25, offsetY: -0.25, width: 0.5, height: 0.5 },
    },
    {
      id: 'carrinho_tecnico_metro',
      tipo: 'carrinho',
      x: 12, y: 8,
      sprite: 'metro_props',
      frame: { col: 1, row: 2 },
      useCrop: true, larguraPx: 62,
      pivotX: 0.5, pivotY: 1.0, ajusteY: 8,
      bloqueia: true,
      hitbox: { offsetX: -0.4, offsetY: -0.4, width: 0.8, height: 0.8 },
    },

    // Catracas na entrada central.
    {
      id: 'catraca_metro_01',
      tipo: 'catraca',

      x: 6,
      y: 9,

      sprite: 'metro_props',
      frame: { col: 1, row: 1 },

      scale: 0.32,
      anchorY: 0.94,

      bloqueia: true,

      hitbox: {
        offsetX: -0.24,
        offsetY: -0.24,
        width: 0.48,
        height: 0.48,
      },
    },

    {
      id: 'catraca_metro_02',
      tipo: 'catraca',

      x: 8,
      y: 9,

      sprite: 'metro_props',
      frame: { col: 1, row: 1 },

      scale: 0.32,
      anchorY: 0.94,

      bloqueia: true,

      hitbox: {
        offsetX: -0.24,
        offsetY: -0.24,
        width: 0.48,
        height: 0.48,
      },
    },
    // BARREIRAS — espaçamento 1,85 (sem sobreposição) e vão centrado no totem (x=7.45).
    // Pares simétricos ao totem: 5.25 / 9.65 e 3.4 / 11.5.
    // A 5ª (1.55) só fecha o canto esquerdo, porque o totem não está no centro da sala.
    // Se quiser simetria estrita, apague o 1.55.
    ...[2.05, 3.65, 5.25, 9.65, 11.5].map((bx, i) => ({
      id: `barreira_metro_${i + 1}`,
      tipo: 'barreira_perigo',
      x: bx, y: 3.5,
      sprite: 'hub_props',
      frame: { col: 3, row: 3 },
      scale: 0.31,       // era 0.34
      anchorY: 0.94,
      ajusteY: 24,       // mantido: altura que você aprovou
      bloqueia: true,
      hitbox: { offsetX: -0.75, offsetY: -0.2, width: 1.5, height: 0.4 },
    })),
    // Terminal de rota ao lado da entrada.
    {
      id: 'terminal_rota_metro',
      tipo: 'terminal',

      x: 10,
      y: 10,

      sprite: 'metro_structure',
      frame: { col: 0, row: 2 },

      scale: 0.34,
      anchorY: 0.94,

      bloqueia: true,

      hitbox: {
        offsetX: -0.23,
        offsetY: -0.23,
        width: 0.46,
        height: 0.46,
      },

      interacao: {
        label: 'CONSULTAR TERMINAL DE ROTA',
        speaker: 'TERMINAL DE EMBARQUE',

        distancia: 1.45,

        dialogue: [
          'DESTINO DISPONÍVEL: ARQUIPÉLAGO DAS ROTAS PERDIDAS.',
          'STATUS: ACESSO BLOQUEADO ATÉ FINALIZAR CALIBRAÇÃO LOCAL.',
          'RECOMENDAÇÃO: INVESTIGAR A PLATAFORMA PRINCIPAL.',
        ],
      },
    },
  ],

  portals: [
    {
      id: 'voltar_saguao',
      tipo: 'door',

      x: 7,
      y: 10,

      label: 'VOLTAR AO SAGUÃO CENTRAL',

      destino: {
        mapId: 'hub_saguao',
        spawnId: 'vindo_do_metro',
      },

      transition: 'fade',
    },

    {
      id: 'embarcar_trem',
      tipo: 'train',
      x: 8,
      y: 4,
      label: 'EMBARCAR NO TREM DIMENSIONAL',
      interactionDistance: 1.85,

      // Agora ele usa o Gate para saber se a linha está calibrada
      gate: {
        anyOf: [{ flag: 'metroCalibrado' }],
        falha: [
          'LINHA PRIMÁRIA AINDA NÃO FOI VALIDADA.',
          'DESTINO DETECTADO: ARQUIPÉLAGO DAS ROTAS PERDIDAS.',
          'A ROTA EXTERNA SERÁ LIBERADA APÓS A CALIBRAÇÃO DA ESTAÇÃO.',
        ]
      },

      destino: {
        mapId: 'ilha_praia_inicial', // Vai para a nova praia!
        spawnId: 'vindo_do_trem',
      },
      transition: 'fade',
    },
  ],
};