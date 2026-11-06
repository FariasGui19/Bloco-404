// js/data/worlds/arquipelago-rotas-perdidas/praia-inicial.js
// =====================================================================
// PRAIA INICIAL — ARQUIPÉLAGO (48x48)
//
// A ilha inicial (onde está o trem) mantém as MESMAS coordenadas de
// terra de antes (x 1..13, y 1..11), então linhaDoTrem(), o portal e os
// spawns não mudam. O arquipélago cresce para leste e sul.
//
// Topologia (cada ponte tem um gate de capacidade no meio):
//
//   [A inicial] --(rocha_rachada: Domínio)-----> [B leste]
//        |                                          |
//   (teleférico: Bio-Forja)              (caverna_alagada: Maré)
//        v                                          v
//   [C sul] ------(fenda_estreita: 10X)-------> [D centro] --(livre)--> [F farol]
//
// D exige (Domínio + Maré) OU (Bio-Forja + 10X).
//
// ÁGUA (nova lógica):
//   - perto da terra: mar RASO (turquesa)
//   - depois: mar FUNDO (azul escuro)
//   - mais longe: NADA é desenhado (aparece só a corFundo) -> bem mais leve
//
// Sheet beach-floor.png  [linha, coluna]:
//   [0,0] areia lisa     [0,1] pegadas       [0,2] conchas     [0,3] rachada
//   [1,0] areia molhada  [1,1] mar fundo     [1,2] costa diag. [1,3] deck
//   [2,0] raso c/ canto  [2,1] deck c/ areia [2,2] raso        [2,3] poça
// =====================================================================
import { buildGround } from '../../ground.js';
import { linhaDoTrem } from '../../shared/linha-trem.js';

const COLS = 48;
const ROWS = 48;

const TAM_RASO = 2;        // tiles de mar raso em volta da terra
const TAM_FUNDO = 3;       // até aqui desenha mar fundo; além disso, nada

const LEGENDA = {
  // terra
  S: { tiles: [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 1], [0, 2]], walk: true },
  M: { tiles: [[1, 0]], walk: true },          // areia molhada (costa)
  T: { tiles: [[2, 3]], walk: true },          // poça
  P: { tiles: [[2, 1]], walk: true },          // base do trem (andável)
  R: { tiles: [[2, 1]], walk: false },         // base do trem (atrás do trem)

  // pontes de deck. Tábuas correm no sentido da travessia.
  // Se o visual ficar trocado, inverta o flip de B e b.
  B: { tiles: [[1, 3]], walk: true, flip: true }, // ponte no eixo X
  b: { tiles: [[1, 3]], walk: true },             // ponte no eixo Y

  // água (flip só para variar o desenho das ondas)
  Y: { tiles: [[2, 2]], walk: false },
  y: { tiles: [[2, 2]], walk: false, flip: true },
  D: { tiles: [[1, 1]], walk: false },
  d: { tiles: [[1, 1]], walk: false, flip: true },

  // mar aberto: o tile é descartado depois (nada é desenhado)
  X: { tiles: [[1, 1]], walk: false },
};

const ehTerra = (c) => c !== undefined && 'SMTPRBb'.includes(c);

// ---------------------------------------------------------------------
// GRADE-BASE ('W' = água ainda sem tipo definido)
// ---------------------------------------------------------------------

const ILHA_INICIAL = [
  'WWWWWWWWWWWWWWWW',
  'WWRRRRRRRRRRRRWW',
  'WWRRRRRRRRRRRRWW',
  'WWRRRRRRRRRRRRWW',
  'WSPPPPPPPPPPPPWW',
  'WSSSSSSSSSSSSSWW',
  'WSSSSSSSSSSSSSWW',
  'WSSSSSSSSSSSSSWW',
  'WSSSSSSSSSSSSSWW',
  'WSSSSSSSSSSSSSWW',
  'WSSSSSSSSSSSSSWW',
  'WMSSSSSSSSSSSSWW',
  'WWWWWWWWWWWWWWWW',
  'WWWWWWWWWWWWWWWW',
];

const grid = Array.from({ length: ROWS }, () => Array(COLS).fill('W'));

ILHA_INICIAL.forEach((linha, y) => {
  for (let x = 0; x < linha.length; x++) {
    if ('SMPR'.includes(linha[x])) grid[y][x] = linha[x];
  }
});

function hash(x, y, seed = 0) {
  let h = Math.imul(x + seed * 131, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Ilha orgânica: elipse + ruído.
function pintarIlha(cx, cy, rx, ry, seed) {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      const v = d + (hash(x, y, seed) - 0.5) * 0.35;
      if (v < 1.0) grid[y][x] = 'S';
    }
  }
}

// Remove "farelos" de terra (1 tile solto ou pendurado por 1 lado).
function limparFarelos() {
  for (let passo = 0; passo < 2; passo++) {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (x < 16 && y < 14) continue;              // ilha inicial é intocável
        if (grid[y][x] !== 'S') continue;
        const viz =
          ehTerra(grid[y - 1]?.[x]) + ehTerra(grid[y + 1]?.[x]) +
          ehTerra(grid[y]?.[x - 1]) + ehTerra(grid[y]?.[x + 1]);
        if (viz < 2) grid[y][x] = 'W';
      }
    }
  }
}

// Ponte: só cobre água (liga as margens sem apagar terra).
function ponte(x0, y0, x1, y1, ch) {
  for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
      if (!ehTerra(grid[y][x])) grid[y][x] = ch;
    }
  }
}

// Distância (em tiles, estilo xadrez) até a terra mais próxima.
function distanciaTerra(x, y) {
  let melhor = Infinity;
  for (let dy = -TAM_FUNDO; dy <= TAM_FUNDO; dy++) {
    for (let dx = -TAM_FUNDO; dx <= TAM_FUNDO; dx++) {
      if (ehTerra(grid[y + dy]?.[x + dx])) {
        melhor = Math.min(melhor, Math.max(Math.abs(dx), Math.abs(dy)));
      }
    }
  }
  return melhor;
}

// ---------------------------------------------------------------------
// ILHAS, PONTES E ÁGUA
// ---------------------------------------------------------------------

pintarIlha(30, 9, 9.5, 7.5, 1);   // B — leste
pintarIlha(9, 31, 8, 9.5, 2);     // C — sul
pintarIlha(30, 31, 10, 9, 3);     // D — centro
pintarIlha(30, 44, 6, 3, 4);      // F — farol (final, por enquanto vazia)
limparFarelos();

ponte(14, 7, 23, 8, 'B');         // A -> B
ponte(7, 12, 8, 23, 'b');         // A -> C
ponte(30, 15, 31, 24, 'b');       // B -> D
ponte(15, 31, 23, 32, 'B');       // C -> D
ponte(30, 37, 31, 42, 'b');       // D -> F

// Água em camadas.
for (let y = 0; y < ROWS; y++) {
  for (let x = 0; x < COLS; x++) {
    if (grid[y][x] !== 'W') continue;
    const d = distanciaTerra(x, y);
    const r = hash(x, y, 11) < 0.5;
    if (d <= TAM_RASO) grid[y][x] = r ? 'Y' : 'y';
    else if (d <= TAM_FUNDO) grid[y][x] = r ? 'D' : 'd';
    else grid[y][x] = 'X';
  }
}

// Costa: areia molhada onde a areia encosta na água. Poças raras no interior.
const copia = grid.map(l => [...l]);
for (let y = 0; y < ROWS; y++) {
  for (let x = 0; x < COLS; x++) {
    if (copia[y][x] !== 'S') continue;

    let encostaNaAgua = false;
    for (let dy = -1; dy <= 1 && !encostaNaAgua; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const c = copia[y + dy]?.[x + dx];
        if (c !== undefined && !ehTerra(c)) { encostaNaAgua = true; break; }
      }
    }

    if (encostaNaAgua) {
      if (hash(x, y, 21) < 0.85) grid[y][x] = 'M';
    } else if (!(x < 16 && y < 14) && hash(x, y, 31) < 0.02) {
      grid[y][x] = 'T';
    }
  }
}

const ground = buildGround({
  sheet: 'BEACH_FLOOR_SPRITE',
  legend: LEGENDA,
  rows: grid.map(linha => linha.join('')),
});

// Mar aberto: remove o tile (nada desenhado) e marca como parede no layout.
const layout = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
for (let y = 0; y < ROWS; y++) {
  for (let x = 0; x < COLS; x++) {
    if (grid[y][x] === 'X') {
      delete ground.pisos[`${x},${y}`];
      layout[y][x] = 1;
    }
  }
}

// ---------------------------------------------------------------------
// PROPS
// ---------------------------------------------------------------------

const prop = (id, x, y, col, row, larguraPx, extra = {}) => ({
  id,
  tipo: 'decoracao',
  x, y,
  sprite: 'beach_props',
  frame: { col, row },
  useCrop: true,
  larguraPx,
  pivotX: 0.5,
  pivotY: 1.0,
  ajusteY: 4,
  ...extra,
});

const TRONCO = { offsetX: -0.15, offsetY: -0.15, width: 0.3, height: 0.3 };

// Hitboxes largas de propósito: cobrem a ponte inteira (2 tiles), então
// não dá para contornar o gate.
const HIT_PONTE_H = { offsetX: -0.6, offsetY: -1.5, width: 1.2, height: 3.0 }; // ponte no eixo X
const HIT_PONTE_V = { offsetX: -1.5, offsetY: -0.6, width: 3.0, height: 1.2 }; // ponte no eixo Y

// Gate = obstáculo bloqueante + `interacao` (necessária para o [E] enxergá-lo).
const gate = (id, x, y, col, row, larguraPx, cfg) =>
  prop(id, x, y, col, row, larguraPx, {
    tipo: 'obstaculo',
    nome: cfg.nome,
    bloqueia: true,
    hitbox: cfg.hitbox,
    // renderer.js e collision.js já respeitam hideWhenFlag.
    hideWhenFlag: `gate_${id}`,
    interacao: { label: cfg.label, distancia: 2.6 },
    ...(cfg.moduleSystem ? { moduleSystem: cfg.moduleSystem } : {}),
    gate: {
      anyOf: cfg.anyOf,
      requiresFlag: cfg.requiresFlag,
      diagnosisArchetype: cfg.diagnosisArchetype,
      falhaDiagnostico: cfg.falhaDiagnostico,
      falha: cfg.falha,
      sucesso: cfg.sucesso,
      promptFalha: 'EXAMINAR',
    },
  });

// Props espalhados (a ilha inicial mantém os props manuais).
function espalharProps() {
  const lista = [];
  const palmeiras = [[0, 82], [1, 82], [2, 100]];

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (x < 16 && y < 14) continue;

      const c = grid[y][x];
      const terra = c === 'S' || c === 'M';
      const raso = c === 'Y' || c === 'y';
      if (!terra && !raso) continue;

      // Não obstrui cabeceiras de ponte.
      let perto = false;
      for (let dy = -2; dy <= 2 && !perto; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const v = grid[y + dy]?.[x + dx];
          if (v === 'B' || v === 'b') { perto = true; break; }
        }
      }
      if (perto) continue;

      const r = hash(x, y, 99);
      const id = (nome) => `${nome}_${x}_${y}`;

      if (raso) {
        if (r < 0.04) lista.push(prop(id('coral'), x, y, 0, 3, 54));
        continue;
      }

      if (r < 0.035) {
        const [col, larg] = palmeiras[Math.floor(hash(x, y, 5) * palmeiras.length)];
        lista.push(prop(id('palmeira'), x, y, col, 0, larg, { bloqueia: true, hitbox: TRONCO }));
      } else if (r < 0.055) {
        lista.push(prop(id('arbusto'), x, y, 3, 0, 50));
      } else if (r < 0.068) {
        lista.push(prop(id('pedras'), x, y, 2, 1, 60));
      } else if (r < 0.078) {
        lista.push(prop(id('concha'), x, y, 1, 3, 40));
      } else if (r < 0.084) {
        lista.push(prop(id('tronco'), x, y, 3, 1, 70));
      } else if (r < 0.092 && c === 'S') {
        lista.push(prop(id('rocha'), x, y, 1, 1, 56, {
          bloqueia: true,
          hitbox: { offsetX: -0.3, offsetY: -0.3, width: 0.6, height: 0.6 },
        }));
      }
    }
  }
  return lista;
}

export const map = {
  id: 'ilha_praia_inicial',

  meta: {
    nome: 'PRAIA INICIAL — ARQUIPÉLAGO',
    tipo: 'exterior',
    dimensao: 'arquipelago',
    // Aproximação da cor do tile de mar fundo. Ajuste se aparecer emenda.
    corFundo: '#1e6384',
    ambiente: { poeira: 15, cor: '#FFD54F' },
    estiloPiso: 'livre',
    // Células 'X' (mar aberto) são parede no layout mas NÃO devem desenhar parede.
    useBackgroundWalls: true,
  },

  spawnPoints: {
    inicio: { x: 8.0, y: 7.5 },
    vindo_do_trem: { x: 8.0, y: 5.5 },
  },

  corChao: '#e6c280',

  layout,
  walkMask: ground.walkMask,
  pisos: ground.pisos,
  // Dados visuais separados da máscara de colisão.
  aguaPraia: grid.map(linha => linha.join('')),

  objects: [
    ...linhaDoTrem({
      trilho: { larguraPx: 390, ajusteX: 9, ajusteY: 31.5 },
      trem: { ajusteY: 63 }, // ajuste local: aproxima as rodas do trilho
    }),

    // ---- Ilha A (props originais, inalterados) ----
    prop('palmeira_1', 2, 7, 0, 0, 82, { bloqueia: true, hitbox: TRONCO }),
    prop('palmeira_2', 13, 8, 1, 0, 82, { bloqueia: true, hitbox: TRONCO }),
    prop('palmeira_3', 5, 11, 2, 0, 100, { bloqueia: true, hitbox: TRONCO }),
    prop('arbusto_1', 5, 6, 3, 0, 50),
    prop('arbusto_2', 4, 8, 3, 0, 50),
    prop('pedras', 9, 6, 2, 1, 60),
    prop('tronco', 10, 9, 3, 1, 70),
    prop('concha', 7, 7, 1, 3, 40),
    prop('naufragio', 8, 11, 3, 2, 90, {
      bloqueia: true,
      hitbox: { offsetX: -0.6, offsetY: -0.4, width: 1.2, height: 0.8 },
    }),

    // ---- Landmarks nas ilhas novas ----
    prop('naufragio_c', 6, 34, 3, 2, 90, {
      bloqueia: true,
      hitbox: { offsetX: -0.6, offsetY: -0.4, width: 1.2, height: 0.8 },
    }),
    prop('ancora_c', 8, 35, 2, 3, 46),
    prop('naufragio_d', 28, 29, 3, 2, 90, {
      bloqueia: true,
      hitbox: { offsetX: -0.6, offsetY: -0.4, width: 1.2, height: 0.8 },
    }),
    prop('ancora_d', 30, 30, 2, 3, 46),

    ...espalharProps(),

    // ---- GATES (um por ponte) ----
    // A -> B (ponte no eixo X, linhas 7-8)
    gate('rocha_rachada', 18, 8, 0, 1, 78, {
      nome: 'ROCHA RACHADA',
      label: 'QUEBRAR ROCHA',
      hitbox: HIT_PONTE_H,
      anyOf: [{ habilidade: 'golpe_ruptura' }, { arquetipo: 'lamina_dominio_anciao' }],
      falha: ['A ROCHA É MUITO DENSA.', 'FALTA FORÇA BRUTA PARA QUEBRÁ-LA.'],
      sucesso: ['A ROCHA SE PARTE EM PEDAÇOS.', 'CAMINHO LIBERADO.'],
    }),

    // A -> C (ponte no eixo Y, colunas 7-8)
    gate('teleferico_quebrado', 8, 18, 1, 2, 130, {
      nome: 'TELEFÉRICO QUEBRADO',
      moduleSystem: {
        id: 'beach_cable_car',
        diagnosisFlag: 'teleferico_diagnosticado',
        allowedArchetypes: ['motor_bio_forja'],
        distance: 2.6,
        label: 'DIAGNOSTICAR CONDUTOR',
        speaker: 'LINK BIO-FORJA',
        dialogue: ['CONDUTOR DO TELEFÉRICO ROMPIDO.', 'RECONSTRUÇÃO DISPONÍVEL: APROXIME-SE E PRESSIONE E.'],
      },
      label: 'RECONSTRUIR CONDUTOR',
      hitbox: HIT_PONTE_V,
      anyOf: [{ arquetipo: 'motor_bio_forja' }],
      requiresFlag: 'teleferico_diagnosticado',
      diagnosisArchetype: 'motor_bio_forja',
      falhaDiagnostico: ['CONDUTOR ROMPIDO.', 'USE [R] PARA DIAGNOSTICAR ANTES DE RECONSTRUIR.'],
      falha: ['O CONDUTOR ESTÁ ROMPIDO.', 'UM OPERADOR DE RECONSTRUÇÃO PODERIA REPARAR.'],
      sucesso: ['CONDUTOR RECONSTRUÍDO.', 'O CAMINHO ESTÁ LIVRE.'],
    }),

    // B -> D (ponte no eixo Y, colunas 30-31)
    gate('caverna_alagada', 31, 19, 0, 2, 92, {
      nome: 'CAVERNA ALAGADA',
      label: 'DOMAR CORRENTEZA',
      hitbox: HIT_PONTE_V,
      anyOf: [{ habilidade: 'passo_corrente' }, { arquetipo: 'mare_astral' }],
      falha: ['A ÁGUA PARECE MUITO FUNDA.', 'FALTA CONTROLE DE CORRENTEZA.'],
      sucesso: ['A CORRENTE SE ABRE.', 'PASSAGEM LIBERADA.'],
    }),

    // C -> D (ponte no eixo X, linhas 31-32)
    gate('fenda_estreita', 19, 32, 2, 2, 80, {
      nome: 'FENDA ESTREITA',
      label: 'ATRAVESSAR FENDA',
      hitbox: HIT_PONTE_H,
      anyOf: [{ arquetipo: 'nucleo_dez_forma' }],
      falha: ['A FENDA É ESTREITA DEMAIS PARA UM OPERADOR.', 'OUTRA FORMA PODERIA PASSAR.'],
      sucesso: ['A FORMA SE ADAPTA À FENDA.', 'PASSAGEM LIBERADA.'],
    }),
  ],

  portals: [
    {
      id: 'voltar_trem',
      tipo: 'train',
      x: 8, y: 4,
      label: 'VOLTAR PARA O METRÔ',
      destino: { mapId: 'hub_metro', spawnId: 'vindo_da_ilha' },
      transition: 'fade',
    },
  ],
}; 