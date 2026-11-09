// js/config.js
export const CONFIG = {
  GAME_NAME: 'BLOCO 404',
  VERSION: '0.3.16-dominio',

  TILE_W: 64,
  TILE_H: 32,
  WALL_H: 48,
  FRONT_WALL_H: 12,   // paredes da frente (sul/leste) baixinhas

  PLAYER_SPEED: 4.0,
  PLAYER_RADIUS: 0.25,
  SCREEN_RELATIVE_CONTROLS: true,
  // -----------------------------------------------------------------
  // HABILIDADES / ENERGIA
  // -----------------------------------------------------------------
  ABILITIES: {
    MAX_ENERGY: 100,

    // Energia recuperada por segundo.
    ENERGY_REGEN: 18,
  },

  PLAYER_SPRITE: {
    ID: 'player',

    SHEET_COLS: 4,
    SHEET_ROWS: 2,
    REMOVE_SHADOW: false,   // true = tenta tirar a sombra cinza embutida na folha

    // Reduzimos de 0.52 para 0.38 para ele ficar proporcional ao NEXO e aos móveis
    SCALE: 0.31,
    FEET_ANCHOR_Y: 0.91,

    // Adicionamos um respiro interno (inset) para sumir com qualquer bordinha indesejada
    SOURCE_INSET_X: 10,
    SOURCE_INSET_Y: 10,

    IDLE_ROW: 0,
    WALK_ROW: 1,

    DIRECTION_COLUMNS: {
      down: 0,
      right: 1,
      up: 2,
      left: 3,
    },

    // Ajustes finos opcionais por estado.
    // Valores positivos em Y fazem o personagem descer.
    POSE_OFFSETS: {
      idle: {
        down: { x: 0, y: 0 },
        right: { x: 0, y: 0 },
        up: { x: 0, y: 0 },
        left: { x: 0, y: 0 },
      },

      walk: {
        down: { x: 0, y: 0 },
        right: { x: 0, y: 0 },
        up: { x: 0, y: 0 },
        left: { x: 0, y: 0 },
      },
    },
  },
         PLAYER_BIO_FORJA_SPRITE: {
    ID: 'player_bio_forja',
    SHEET_COLS: 4,
    SHEET_ROWS: 2,
    SCALE: 0.31,          
    FEET_ANCHOR_Y: 0.91,  
    SOURCE_INSET_X: 10,
    SOURCE_INSET_Y: 10,
    IDLE_ROW: 0, 
    WALK_ROW: 0, 
    DIRECTION_COLUMNS: { down: 0, right: 1, up: 2, left: 3 },
    POSE_OFFSETS: {
      idle: { down: { x: 0, y: 0 }, right: { x: 0, y: 0 }, up: { x: 0, y: 0 }, left: { x: 0, y: 0 } },
      walk: { down: { x: 0, y: 0 }, right: { x: 0, y: 0 }, up: { x: 0, y: 0 }, left: { x: 0, y: 0 } },
    },
  },

  PLAYER_BIO_FORJA_WALK_SPRITE: {
    ID: 'player_bio_forja_walk',
    SHEET_COLS: 6,
    SHEET_ROWS: 4,
    // A folha tem células de 256px de altura, contra 512px da pose parada.
    // Altura visível: ~228*.57 = 130px, frente ao idle ~420*.31 = 130px.
    SCALE: 0.57,
  },

  PLAYER_BIO_FORJA_SCAN_SPRITE: {
    ID: 'player_bio_forja_scan',
    SHEET_COLS: 4,        
    SHEET_ROWS: 2,        
    SCALE: 0.38,          
    FEET_ANCHOR_Y: 0.76,  
    DIRECTION_COLUMNS: { down: 0, right: 1, up: 2, left: 3 }
  },

  NEXO_04_SPRITE: {
    ID: 'nexo_04',

    SHEET_COLS: 4,
    PE_AJUSTE_Y: 7,
    SHEET_ROWS: 2,

    IDLE_ROW: 0,
    TALK_ROW: 1,

    DIRECTION_COLUMNS: {
      down: 0,
      right: 1,
      up: 2,
      left: 3,
    },

    SCALE: 0.35,

    FEET_ANCHOR_Y: 0.92,
    TALK_FEET_ANCHOR_Y: 0.84,


    // Ajuste fino por pose e direção.
    //
    // Y positivo = desce o sprite.
    // Isso corrige a flutuação causada por poses com pés em alturas
    // diferentes dentro da spritesheet.
    POSE_OFFSETS: {
      idle: {
        down: { x: 0, y: 0 },
        right: { x: 0, y: 0 },
        up: { x: 0, y: 0 },
        left: { x: 0, y: 0 },
      },

      talk: {
        // Começamos descendo a pose talk.
        // Ajuste depois visualmente usando valores entre 4 e 16.
        down: { x: 0, y: 10 },
        right: { x: 0, y: 12 },
        up: { x: 0, y: 8 },
        left: { x: 0, y: 10 },
      },
    },
  },
  ELEVATOR_DOOR_SPRITE: {
    ID: 'elevator_door',
    SHEET_COLS: 4,
    SHEET_ROWS: 2,
    ESCALA: 0.45,
  },
  ROBO_SPRITE: {
    ID: 'robo_limpeza',
    SHEET_COLS: 4,
    SHEET_ROWS: 2,
    SCALE: 0.16,
    DIRECOES: { sw: [0, 0], se: [0, 1], nw: [0, 2], ne: [0, 3] },
    ESTADOS: { limpando: [1, 0], feliz: [1, 1], bravo: [1, 2], dormindo: [1, 3] },
  },
  TALK_DIST: 1.8,

  ZOOM_MIN: 0.3,
  ZOOM_MAX: 3,
  ZOOM_KEY_FACTOR: 1.15,
  ZOOM_WHEEL_SPEED: 0.0012,
  ZOOM_SMOOTH: 10,
  FOLLOW_SMOOTH: 5,
  CLICK_DRAG_THRESHOLD: 8,

  COLORS: {
    BG: '#0f0f14',
    GRID: 'rgba(255,255,255,0.06)',
    WALL_TOP: '#2c323d',
    WALL_LEFT: '#1e222b',
    WALL_RIGHT: '#252a33',
    ELEVATOR_FILL: '#5a4a1f',
    ELEVATOR_LINE: '#ffd54f',
  },

  HUB_PROPS_SPRITE: {
    ID: 'hub_props',
    SHEET_COLS: 4,
    SHEET_ROWS: 4,
    DEFAULT_SCALE: 0.50,
    FEET_ANCHOR_Y: 0.93,
  },
  // -----------------------------------------------------------------
  // PROPS DO METRÔ INTERDIMENSIONAL
  // Sheet 4x4:
  // plataforma, scanner, painel, banco, gerador, catraca etc.
  // -----------------------------------------------------------------
  METRO_PROPS_SPRITE: {
    ID: 'metro_props',
    SHEET_COLS: 4,
    SHEET_ROWS: 4,
    DEFAULT_SCALE: 0.50,
    FEET_ANCHOR_Y: 0.93,
  },

  // Pilares, sinais, luzes, máquinas de acesso e dutos. Sheet 4x4.
  METRO_STRUCTURE_SPRITE: {
    ID: 'metro_structure',
    SHEET_COLS: 4,
    SHEET_ROWS: 4,
    DEFAULT_SCALE: 0.48,
    FEET_ANCHOR_Y: 0.94,
  },

  // Tiles de plataforma e trilho. Sheet 4x3.
  METRO_PLATFORM_TILES: {
    ID: 'metro_platform_tiles',
    SHEET_COLS: 4,
    SHEET_ROWS: 3,
  },
  // -----------------------------------------------------------------
  // KIT DE TRILHOS DO METRÔ
  // Sheet 4x2: plataforma, faixa de segurança, trilho ativo,
  // trilho apagado, curva, batente, embarque e área restrita.
  // -----------------------------------------------------------------
  METRO_RAIL_KIT: {
    ID: 'metro_rail_kit',
    SHEET_COLS: 4,
    SHEET_ROWS: 2,
  },

  // Background arquitetônico (imagem única grande).
  METRO_BACKGROUND: {
    ID: 'metro_background',
    DEFAULT_SCALE: 0.58,
  },

  // Trem dimensional. Imagem única, sem grid.
  DIMENSIONAL_TRAIN_SPRITE: {
    ID: 'dimensional_train',
    SHEET_COLS: 1,
    SHEET_ROWS: 1,
    DEFAULT_SCALE: 0.42,
    FEET_ANCHOR_Y: 0.90,
  },
  // -----------------------------------------------------------------
  // TRILHO DIMENSIONAL GRANDE
  //
  // Imagem única longa, alinhada ao trem.
  // -----------------------------------------------------------------
  DIMENSIONAL_RAIL_STRIP_SPRITE: {
    ID: 'dimensional_rail_strip',
    SHEET_COLS: 1,
    SHEET_ROWS: 1,

    DEFAULT_SCALE: 0.24,
    FEET_ANCHOR_Y: 0.94,
  },

  // -----------------------------------------------------------------
  // TERMINAL HOLOGRÁFICO DE EMBARQUE
  //
  // Prop grande que aponta/guia o player para a porta do trem.
  // -----------------------------------------------------------------
  TRAIN_BOARDING_TERMINAL_SPRITE: {
    ID: 'train_boarding_terminal',
    SHEET_COLS: 1,
    SHEET_ROWS: 1,

    DEFAULT_SCALE: 0.16,
    FEET_ANCHOR_Y: 0.93,
  },
  // ---------- CHÃO EM PLACAS (usado nos mapas com estiloPiso: 'placas') ----------
  // Posições = [linha, coluna] da folha hub-floor.png
  FLOOR_SPRITE: {
    ID: 'hub_floor',
    SHEET_COLS: 4,
    SHEET_ROWS: 3,
    VARIANTES: [[0, 0], [0, 1], [2, 3], [0, 0]],   // placas comuns
    RAROS: [[1, 2], [1, 0], [0, 3]],               // gasta, grade, cruz cyan
    CHANCE_RARO: 0.06,
    AJUSTE_LARGURA: 1.02,                          // > 1 fecha frestinhas
    AJUSTE_Y: 0,
  },

  // ---------- PAREDES DO FUNDO (norte e oeste) ----------
  // Posições = [linha, coluna] da folha hub-walls.png
  WALL_SPRITE: {
    ID: 'hub_walls',
    SHEET_COLS: 4,
    SHEET_ROWS: 3,
    VARIANTES: [[0, 0], [0, 0], [0, 1], [0, 2]],   // liso, liso, ventilação, faixa cyan
    RAROS: [[0, 3], [2, 1], [2, 2]],               // listras, quadro elétrico, rachada
    CHANCE_RARO: 0.12,
    CANTO: [2, 0],                                 // pilar no canto do fundo
    LARGURA: 1.25,                                 // largura do painel (em meio-tile)
    AJUSTE_X: 0,
    AJUSTE_Y: 0,
  },
  BEACH_FLOOR_SPRITE: {
    ID: 'beach_floor',
    SHEET_COLS: 4,
    SHEET_ROWS: 3,
    AJUSTE_LARGURA: 1.01,
    AJUSTE_Y: 0,
  },

  BEACH_PROPS_SPRITE: {
    ID: 'beach_props',
    SHEET_COLS: 4,
    SHEET_ROWS: 4,
    DEFAULT_SCALE: 0.3,
    FEET_ANCHOR_Y: 1,
  },
};


export const TILE = {
  FLOOR: 0,
  WALL: 1,
  ELEVATOR: 2,
}; 