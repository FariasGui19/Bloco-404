// Enseada dos Ecos 3.1 — reconstrução em escala de referência (72x64)
// Mantém os acessos antigos enquanto amplia a ilha e introduz áreas próprias
// para o acampamento, o santuário central e a extensa praia sul/leste.
import { buildGround } from '../../ground.js';
import { relevo } from '../../relevo-praia.js';
import { flora } from '../../flora-praia.js';

const COLS = 72;
const ROWS = 64;
// Deslocamento comum à arte da estação, sua porta, paredes e retorno.
const ESTACAO_DX = -3;
const ESTACAO_DY = 4.5;

function hash(x, y, seed = 0) {
  let h = Math.imul(x + seed * 131, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const ehTerra = c => c !== undefined && 'SMT'.includes(c);

// Silhueta da referência (imagem 1, 1490×809): projeção isométrica 2:1 da arte.
// Cada célula da grade é convertida de volta para a imagem; a costa é o polígono
// traçado sobre a referência (ilha principal; o portal não forma uma ilhota de areia).
const REF = { cx: 745, cy: 405, s: 2.0, ox: 35.094, oy: 34.625 };
const POLIGONO_ILHA = [[118,420],[150,300],[200,255],[260,205],[330,165],[400,125],[470,100],[520,85],[600,80],[650,55],[700,40],[760,30],[820,20],[880,25],[940,30],[980,70],[1020,100],[1060,130],[1080,165],[1040,195],[1000,225],[1030,250],[1070,300],[1120,330],[1180,350],[1220,365],[1275,365],[1320,395],[1335,440],[1320,480],[1280,515],[1240,540],[1190,548],[1150,565],[1100,580],[1050,585],[1000,570],[940,555],[880,560],[830,575],[790,600],[760,640],[730,680],[690,705],[640,715],[580,705],[520,700],[460,690],[420,680],[380,650],[330,640],[280,610],[230,570],[180,520],[140,470]];
// Células obrigatórias: missões, portais, spawns e a lagoa de treino.
const CELULAS_OBRIGATORIAS = [[15, 51], [15, 52], [15, 53], [16, 51], [16, 52], [16, 53], [17, 37], [17, 38], [17, 39], [17, 51], [17, 52], [17, 53], [18, 37], [18, 38], [18, 39], [18, 50], [18, 51], [18, 52], [19, 37], [19, 38], [19, 39], [19, 50], [19, 51], [19, 52], [20, 50], [20, 51], [20, 52], [21, 45], [21, 46], [21, 47], [22, 45], [22, 46], [22, 47], [23, 45], [23, 46], [23, 47], [24, 52], [24, 53], [24, 54], [25, 14], [25, 15], [25, 16], [25, 39], [25, 40], [25, 41], [25, 52], [25, 53], [25, 54], [26, 14], [26, 15], [26, 16], [26, 17], [26, 39], [26, 40], [26, 41], [26, 42], [26, 43], [26, 44], [26, 52], [26, 53], [26, 54], [27, 14], [27, 15], [27, 16], [27, 17], [27, 39], [27, 40], [27, 41], [27, 42], [27, 43], [27, 44], [28, 15], [28, 16], [28, 17], [28, 39], [28, 40], [28, 41], [28, 42], [28, 43], [28, 44], [29, 18], [29, 19], [29, 20], [29, 39], [29, 40], [29, 41], [30, 18], [30, 19], [30, 20], [30, 39], [30, 40], [30, 41], [31, 18], [31, 19], [31, 20], [31, 38], [31, 39], [31, 40], [32, 38], [32, 39], [32, 40], [33, 36], [33, 37], [33, 38], [33, 39], [33, 40], [33, 54], [33, 55], [33, 56], [34, 1], [34, 2], [34, 3], [34, 36], [34, 37], [34, 38], [34, 54], [34, 55], [34, 56], [35, 1], [35, 2], [35, 3], [35, 4], [35, 36], [35, 37], [35, 38], [35, 54], [35, 55], [35, 56], [36, 1], [36, 2], [36, 3], [36, 4], [37, 2], [37, 3], [37, 4], [37, 6], [37, 7], [37, 8], [38, 6], [38, 7], [38, 8], [39, 6], [39, 7], [39, 8], [48, 18], [48, 19], [48, 20], [49, 17], [49, 18], [49, 19], [49, 20], [50, 17], [50, 18], [50, 19], [50, 20], [51, 17], [51, 18], [51, 19]];

const imagemDaGrade = (x, y) => {
  const wx = x - REF.ox, wy = y - REF.oy;
  return { px: REF.cx + ((wx - wy) * 32) / REF.s, py: REF.cy + ((wx + wy) * 16) / REF.s };
};

function dentroDoPoligono(px, py, pts) {
  let dentro = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}

const landShape = (x, y) => {
  const { px, py } = imagemDaGrade(x + 0.5, y + 0.5);
  return dentroDoPoligono(px, py, POLIGONO_ILHA);
};

const grid = Array.from({ length: ROWS }, () => Array(COLS).fill('W'));
for (let y = 0; y < ROWS; y++) {
  for (let x = 0; x < COLS; x++) {
    if (x >= 1 && x <= COLS - 2 && y >= 1 && y <= ROWS - 2 && landShape(x, y)) {
      grid[y][x] = 'S';
    }
  }
}

// Limpar células isoladas
for (let y = 1; y < ROWS - 1; y++) {
  for (let x = 1; x < COLS - 1; x++) {
    if (grid[y][x] !== 'S') continue;
    const viz = ehTerra(grid[y - 1]?.[x]) + ehTerra(grid[y + 1]?.[x]) +
      ehTerra(grid[y]?.[x - 1]) + ehTerra(grid[y]?.[x + 1]);
    if (viz < 2) grid[y][x] = 'W';
  }
}

// Garantir terra sob os pontos de missão, portais e spawns
for (const [x, y] of CELULAS_OBRIGATORIAS) {
  if (grid[y]?.[x] !== undefined && !(x >= 33 && x <= 39 && y <= 8)) grid[y][x] = 'S';
}

// Preencher a enseada estreita que separava os dois maciços. A costa é
// recalculada a partir deste solo, não apenas coberta por decoração.
for (let y = 10; y <= 23; y++) {
  const minX = y < 12 ? 10 : y < 15 ? 9 : y < 20 ? 8 : y < 21 ? 7 : 6;
  for (let x = minX; x <= 15; x++) grid[y][x] = 'S';
}

const TAM_RASO = 2;
const TAM_FUNDO = 5;

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

const copia = grid.map(l => [...l]);
for (let y = 0; y < ROWS; y++) {
  for (let x = 0; x < COLS; x++) {
    if (copia[y][x] === 'S') {
      const borda = [[-1, 0], [1, 0], [0, -1], [0, 1]].some(([dx, dy]) => !ehTerra(copia[y + dy]?.[x + dx]));
      if (borda) grid[y][x] = 'M';
      else if (hash(x, y, 29) < 0.025 && y > 18) grid[y][x] = 'T';
    } else {
      const d = distanciaTerra(x, y);
      const flip = hash(x, y, 17) < 0.5;
      if (d <= TAM_RASO) grid[y][x] = flip ? 'Y' : 'y';
      else if (d <= TAM_FUNDO) grid[y][x] = flip ? 'D' : 'd';
      else grid[y][x] = 'X';
    }
  }
}

// Trecho de areia na margem da ponta do cais: o barco de expedição fica na praia,
// acessível a pé, como na referência (a costa original deixava só água ali).
for (const [cx, cy] of [[54, 35], [55, 35], [54, 36], [55, 36], [56, 36], [55, 37], [56, 37]]) {
  if (grid[cy]?.[cx] !== undefined && grid[cy][cx] !== 'S') grid[cy][cx] = 'S';
}
// Píer de madeira da referência: a margem é estendida em areia para o cais sair da praia.
for (let cy = 40; cy <= 42; cy++) for (let cx = 49; cx <= 53; cx++) {
  if (grid[cy]?.[cx] !== undefined && grid[cy][cx] !== 'S') grid[cy][cx] = 'S';
}
const rows = grid.map(l => l.join(''));
const ground = buildGround({
  sheet: 'BEACH_FLOOR_SPRITE',
  rows,
  legend: {
    S: { tiles: [[0, 0], [0, 0], [0, 0], [0, 1], [0, 2]], walk: true },
    M: { tiles: [[1, 0]], walk: true },
    T: { tiles: [[2, 3]], walk: true },
    Y: { tiles: [[2, 2]], walk: false },
    y: { tiles: [[2, 2]], walk: false, flip: true },
    D: { tiles: [[1, 1]], walk: false },
    d: { tiles: [[1, 1]], walk: false, flip: true },
    X: { tiles: [[1, 1]], walk: false },
  },
});

// A passagem tem colisão de chão, mas conserva água na grade visual e de costa.
// Dois tiles de largura permitem a passagem do círculo de colisão do jogador.
const passarelaCorrentes = new Set();
for (let y = 7; y <= 8; y++) for (let x = 30; x <= 36; x++) passarelaCorrentes.add(`${x},${y}`);
for (let y = 3; y <= 8; y++) for (let x = 35; x <= 37; x++) passarelaCorrentes.add(`${x},${y}`);
for (let y = 3; y <= 6; y++) for (let x = 34; x <= 38; x++) passarelaCorrentes.add(`${x},${y}`);
for (const key of passarelaCorrentes) {
  const [x, y] = key.split(',').map(Number);
  const row = ground.walkMask[y];
  ground.walkMask[y] = row.slice(0, x) + '.' + row.slice(x + 1);
}

const layout = rows.map(row => [...row].map(c => ('SMT'.includes(c) ? 0 : 1)));
for (let y = 0; y < ROWS; y++) {
  for (let x = 0; x < COLS; x++) {
    if (grid[y][x] === 'X') delete ground.pisos[`${x},${y}`];
  }
}

const prop = (id, x, y, col, row, larguraPx) => ({
  id, tipo: 'decoracao', x, y, sprite: 'beach_props', frame: { col, row },
  useCrop: true, larguraPx, pivotX: 0.5, pivotY: 1, bloqueia: false,
});

const tropical = (id, x, y, col, larguraPx, tree = false) => ({
  id, tipo: 'decoracao', x, y, sprite: 'vegetacao_tropical', frame: { col, row: 0 },
  useCrop: true, larguraPx, pivotX: 0.5, pivotY: 1,
  bloqueia: tree,
  ...(tree ? { hitbox: { offsetX: -0.18, offsetY: -0.18, width: 0.36, height: 0.36 } } : {}),
});
export const map = {
  id: 'ilha_enseada_ecos',
  meta: {
    nome: 'ENSEADA DOS ECOS',
    tipo: 'exterior',
    dimensao: 'arquipelago',
    corFundo: '#025074',
    minZoom: 0.32,
    initialZoom: 0.50,
    estiloPiso: 'livre',
    gramaInterior: true,
    useBackgroundWalls: true,
    sandSprite: 'beach_novas_artes',
    ambiente: { poeira: 18, cor: '#ffd98a' },
  },
  corChao: '#e6c280',
  layout,
  walkMask: ground.walkMask,
  pisos: ground.pisos,
  aguaPraia: rows,
  passarelaSobreAgua: [...passarelaCorrentes],
  zonasGrama: [{ x: 8.8, y: 19, rx: 3.2, ry: 5.0 }],
  // Corredores de areia entre os setores: arte do chão, sem alterar colisões.
  caminhosAreia: [
    [14, 42, 23, 41], [23, 41, 30, 35], [30, 35, 33, 32],
    [33, 32, 39, 30], [39, 30, 48, 29], [48, 29, 56, 24],
    [30, 35, 24, 31], [24, 31, 19, 29],
    [23, 41, 28, 48], [28, 48, 33, 48],
    [33, 32, 35, 39], [35, 39, 40, 44], [40, 44, 48, 48],
  ],

  spawnPoints: {
    inicio: { x: 19.9, y: 51.7 },
    vindo_da_praia: { x: 19.9, y: 51.7 },
    vindo_da_estacao_666: { x: 23.805 + ESTACAO_DX, y: 12.505 + ESTACAO_DY },
    vindo_do_mar: { x: 36.5, y: 5.5 },
    vindo_da_darsena_mare: { x: 57.0, y: 24.0 },
  },

  pocas: [
    {
      id: 'poca_cascata_enseada',
      nome: 'PISCINA DE MARÉ VIVA',
      x: 28.0, y: 50.0, rx: 1.8, ry: 1.25,
      profundidade: 0.45,
      treino: true,
    },
  ],

  ondasMar: [
    [2, 11, 1], [7, 5, 0], [68, 5, 1], [68, 10, 0], [33, 10, 1],
    [68, 17, 0], [68, 24, 1], [68, 33, 0], [68, 39, 1], [2, 41, 0], [0, 27, 1], [2, 19, 0],
  ].map(([x, y, tipo]) => ({ x, y, tipo })),

  detalhesOceano: [
    [0, 10, 1], [0, 5, 2], [68, 5, 3], [68, 7, 4], [68, 12, 5],
    [68, 18, 6], [68, 26, 7], [68, 42, 8], [4, 43, 9], [0, 34, 10], [0, 22, 11],
  ].map(([x, y, fase]) => ({ x, y, fase })),

  fundoMar: [
    { x: 1.8, y: 13.4, tipo: 'coral-profundo', origem: 'oceano-vivo', tamanho: 1.0 },
    { x: 32.0, y: 11.0, tipo: 'alga-longa', origem: 'oceano-vivo', tamanho: 1.0 },
    { x: 68.0, y: 16.5, tipo: 'coral-leque', origem: 'mar-vivo', tamanho: 1.0 },
    { x: 68.0, y: 27.2, tipo: 'alga-vermelha', origem: 'oceano-vivo', tamanho: 1.0 },
    { x: 2.5, y: 24.5, tipo: 'ruina-submersa', origem: 'mar-vivo', tamanho: 1.1 },
  ],

  trainingTargets: [{ id: 'eco_treino_enseada', x: 25.9, y: 53.2, maxHealth: 60 }],

  hazards: [
    { id: 'eco_instavel_oeste', x: 10.7, y: 41.2, radius: 0.9, damage: 9, interval: 1.3 },
    { id: 'eco_instavel_leste', x: 37.4, y: 40.4, radius: 1.0, damage: 12, interval: 1.5 },
  ],

  fauna: [
    {
      id: 'enseada_caranguejo_1', species: 'caranguejo', x: 21.5, y: 55.1, calma: true,
      interacao: {
        distancia: 1.35, speaker: 'CARANGUEJO DA ORLA',
        dialogue: ['ELE MOVE AS PINÇAS NO RITMO DAS ONDAS, COMO SE MEDISSE A MARÉ.'],
        porArquetipo: {
          mare_astral: 'MARÉ ASTRAL: VOCÊ PERCEBE QUE ELE SE ENTERRA MAIS FUNDO ANTES DE VIRADAS DE RESSACA.',
          motor_bio_forja: 'BIO-FORJA: CARAPAÇA LIMPA, SEM PLÁSTICO NEM ÓLEO — SINAL DE ÁGUA SAUDVEL.',
        },
      },
    },
    { id: 'enseada_caranguejo_2', species: 'caranguejo', x: 56.2, y: 32.9 },
    { id: 'enseada_gaivota', species: 'gaivota', x: 23.4, y: 37.0 },
    { id: 'enseada_trinta_reis', species: 'trinta_reis', x: 27.1, y: 35.7 },
    { id: 'enseada_peixes', species: 'peixes', x: 10.9, y: 53.2 },
    { id: 'enseada_tartaruga_1', species: 'tartaruga', x: 6.5, y: 42.5 },
    { id: 'enseada_golfinho_1', species: 'golfinho', x: 50.4, y: 12.4 },
    { id: 'enseada_golfinho_oeste', species: 'golfinho', x: 2.5, y: 30.5 },
    { id: 'enseada_golfinho_leste', species: 'golfinho', x: 60.5, y: 38.5 },
    {
      id: 'enseada_capivara', species: 'capivara', x: 28.0, y: 50.0, calma: true,
      interacao: {
        distancia: 1.45, speaker: 'CAPIVARA DA PISCINA',
        dialogue: ['ELA DESCANSA NA ÁGUA MORNA DA PISCINA, COMPLETAMENTE TRANQUILA COM SUA PRESENÇA.'],
        porArquetipo: {
          lamina_dominio_anciao: 'DOMÍNIO ANCIÃO: NEM MESMO A AURA DA LÂMINA A ASSUSTA NESTE REFÚGIO.',
          nucleo_dez_forma: 'NÚCLEO 10X: BATIMENTO CALMO E CONSTANTE; UM PONTO FIXO NO MEIO DA EXPEDIÇÃO.',
        },
      },
    },
  ],

  objects: [
    // ---- Terminal (função preservada) ----
    {
      id: 'terminal_frequencia_666', nome: 'TERMINAL DE MANUTENÇÃO', tipo: 'painel', x: 18.5, y: 38.1,
      sprite: 'freq666_receptor', useCrop: true, larguraPx: 58, pivotX: 0.5, pivotY: 0.88,
      sombra: [16, 7], bloqueia: true, hitbox: { offsetX: -0.28, offsetY: -0.28, width: 0.56, height: 0.56 },
      brilho: { cor: '#ff7e71', raio: 0.7, forca: 0.2 },
      interacao: {
        label: 'EXAMINAR TERMINAL', distancia: 1.4, speaker: 'TERMINAL DA ENSEADA',
        dialogue: [
          'O RECEPTOR ESTÁ RISCADO DE SAL. ENTRE A ESTÁTICA, UM PULSO REPETE UMA FREQUÊNCIA IMPOSSÍVEL.',
          'USE [R] PARA DIAGNOSTICAR O SINAL.',
        ],
      },
      moduleSystem: { id: 'frequencia_666_terminal', label: 'RASTREAR SINAL ANALÓGICO', distance: 1.6, speaker: 'TERMINAL DA ENSEADA' },
    },
    // ---- SETOR 1: penhasco contínuo, nascente, cascata e entrada embutida ----
    // A arte vem da referência, com a placa corrigida. É desenhada no fundo;
    // colisões e portal são independentes para não bloquear a entrada.
    {
      id: 'enseada_macico_leste', tipo: 'decoracao', x: 21.6 + ESTACAO_DX, y: 13.6 + ESTACAO_DY,
      sprite: 'enseada_estacao_integrada', useCrop: true, larguraPx: 620, cachoeiraViva: true,
      pivotX: 0.5, pivotY: 0.98, camada: 'fundo', ordem: -1,
      bloqueia: false,
    },

    // Vegetação da junção tem pé próprio para entrar no depth sorting.
    {
      id: 'enseada_mata_juncao_estacao', tipo: 'decoracao', x: 18.0, y: 22.5,
      sprite: 'enseada_estacao_mata_juncao', useCrop: true, larguraPx: 210,
      pivotX: 0.5, pivotY: 0.96, bloqueia: true,
      hitbox: { offsetX: -0.38, offsetY: -0.38, width: 0.76, height: 0.76 },
    },

    // Colisores discretos ao longo da face do penhasco. Mantêm uma abertura
    // livre na soleira: o portal fica no centro da porta desenhada.
    ...[
      [13.075, 13.711], [14.846, 13.6], [16.507, 13.268],
      [18.168, 13.379], [20.161, 13.6], [20.604, 11.386],
      [22.486, 9.448], [23.538, 9.171], [23.371, 7.455],
    ].map(([x, y], i) => ({
      id: `enseada_parede_estacao_${i + 1}`, tipo: 'decoracao', x: x + ESTACAO_DX, y: y + ESTACAO_DY,
      renderizar: false, bloqueia: true,
      hitbox: { offsetX: -0.487, offsetY: -0.487, width: 0.974, height: 0.974 },
    })),

    // ---- Trilha de pedras: pórtico → espelho → cais (uma linha, sem ramal duplo) ----
    ...[[14.5, 42.5], [15.8, 43.2], [17.2, 43.9], [18.6, 44.6], [20.0, 45.3], [21.4, 46.0], [22.8, 46.6], [24.2, 47.1], [25.6, 47.5], [27.0, 47.8], [28.4, 48.0], [29.8, 48.1], [31.2, 48.1], [32.6, 48.0], [34.0, 47.9], [35.4, 47.9], [36.8, 47.9], [38.2, 47.9], [39.6, 47.9], [41.0, 47.9], [42.4, 47.9], [43.8, 47.9]].map(([tx, ty], i) => ({
      id: `trilha_pedras_${i + 1}`,
      tipo: 'decoracao',
      x: tx,
      y: ty,
      sprite: 'enseada_trilha_pedras',
      useCrop: true,
      larguraPx: 36,
      pivotX: 0.5,
      pivotY: 0.55,
      depthOffset: -3,
      bloqueia: false,
    })),

    // ---- SETOR 2 (Noroeste): Acampamento ----
    // Composição conforme a referência: relógio e palmeiras à esquerda,
    // bancada à frente, torre ao fundo, fogueira no centro, tenda e caixas
    // à direita e banco à frente da fogueira.
    // Terraço cenográfico atrás dos equipamentos. A subida ainda usa a
    // malha plana existente; a arte não adiciona colisões nem altura física.
    {
      id: 'enseada_terraco_acampamento', tipo: 'decoracao', x: 19.0, y: 34.5,
      sprite: 'enseada_terraco_acampamento', useCrop: true, larguraPx: 820,
      pivotX: 0.5, pivotY: 1, ajusteY: 36,
      camada: 'fundo', ordem: -2, bloqueia: false,
    },
    {
      id: 'relogio_mare_enseada', nome: 'RELÓGIO DE MARÉ SOLAR', tipo: 'dispositivo', x: 9.5, y: 31.5,
      sprite: 'enseada_camp_ref_relogio', spriteB: 'enseada_camp_ref_relogio', animPeriodo: 0.6,
      useCrop: true, larguraPx: 70, pivotX: 0.5, pivotY: 0.98,
      bloqueia: true, hitbox: { offsetX: -0.22, offsetY: -0.22, width: 0.44, height: 0.44 },
      brilho: { cor: '#ffd980', raio: 1.15, forca: 0.25 },
      interacao: { label: 'SINTONIZAR CLIMA E MARÉ', distancia: 1.55 },
    },
    {
      id: 'torre_antena_enseada', nome: 'TORRE-ANTENA DE ESCUTA', tipo: 'dispositivo', x: 10.75, y: 28.05,
      sprite: 'enseada_camp_ref_torre_radio', spriteB: 'enseada_camp_ref_torre_radio', animPeriodo: 0.5,
      useCrop: true, larguraPx: 75, pivotX: 0.5, pivotY: 0.98,
      bloqueia: true, hitbox: { offsetX: -0.30, offsetY: -0.28, width: 0.6, height: 0.56 },
      pulsoAntena: true, brilho: { cor: '#ff7e71', raio: 0.9, forca: 0.2 },
      interacao: { label: 'SINTONIZAR TORRE-ANTENA', distancia: 1.55 },
    },
    {
      id: 'bancada_campo_enseada', nome: 'BANCADA DE CAMPO', tipo: 'dispositivo', x: 11.27, y: 30.72,
      sprite: 'enseada_camp_ref_bancada', spriteB: 'enseada_camp_ref_bancada', animPeriodo: 0.58,
      useCrop: true, larguraPx: 85, pivotX: 0.5, pivotY: 0.98,
      bloqueia: true, hitbox: { offsetX: -0.58, offsetY: -0.38, width: 1.16, height: 0.76 },
      brilho: { cor: '#74ff8a', raio: 1.2, forca: 0.26 },
      interacao: { label: 'CALIBRAR MÓDULO NA BANCADA', distancia: 1.7 },
    },
    {
      id: 'acampamento_vigilia_enseada', nome: 'ACAMPAMENTO DE VIGÍLIA', tipo: 'decoracao', x: 13.03, y: 29.43,
      sprite: 'enseada_camp_ref_fogueira', spriteB: 'enseada_camp_ref_fogueira', animPeriodo: 0.42,
      useCrop: true, larguraPx: 65, pivotX: 0.5, pivotY: 0.98,
      bloqueia: true, hitbox: { offsetX: -0.30, offsetY: -0.24, width: 0.60, height: 0.48 },
      fogueiraViva: true, brilho: { cor: '#ffae52', raio: 1.25, forca: 0.28 },
      interacao: { label: 'DESCANSAR NA FOGUEIRA', distancia: 1.6 },
    },
    {
      id: 'tenda_expedicao_enseada', nome: 'TENDA DA EXPEDIÇÃO', tipo: 'decoracao', x: 13.2325, y: 26.8525,
      sprite: 'enseada_camp_ref_tenda_referencia', useCrop: true, larguraPx: 120,
      pivotX: 0.5, pivotY: 0.98,
      bloqueia: true, hitbox: { offsetX: -0.48, offsetY: -0.34, width: 0.96, height: 0.68 },
      interacao: { label: 'INSPECIONAR TENDA DA EXPEDIÇÃO', distancia: 1.6, speaker: 'TENDA DA EXPEDIÇÃO',
        dialogue: ['A LONA GUARDA MAPAS, ROLOS DE CORDA E UM COBERTOR DOBRADO. A EXPEDIÇÃO ESTÁ EM PLENA ATIVIDADE.'] },
    },
    {
      id: 'maleta_expedicao_enseada', nome: 'MALETA DA EXPEDIÇÃO', tipo: 'dispositivo', x: 14.83875, y: 26.31875,
      sprite: 'enseada_camp_ref_pilha_caixas', spriteB: 'enseada_camp_ref_pilha_caixas', animPeriodo: 0.56,
      useCrop: true, larguraPx: 75, pivotX: 0.5, pivotY: 0.98,
      bloqueia: true, hitbox: { offsetX: -0.38, offsetY: -0.32, width: 0.76, height: 0.64 },
      pulsoAntena: true, brilho: { cor: '#ff9a5c', raio: 1.0, forca: 0.22 },
      interacao: { label: 'ABRIR MALETA DA EXPEDIÇÃO', distancia: 1.55 },
    },
    {
      id: 'bandeirola_vento_enseada', nome: 'BIRUTA DA EXPEDIÇÃO', tipo: 'decoracao', x: 12.69, y: 23.67,
      sprite: 'enseada_biruta_camp',
      useCrop: true, larguraPx: 75, pivotX: 0.5, pivotY: 0.94,
      depthOffset: 3, bloqueia: false, oscilaBrisa: true,
    },

    // Vegetação de fundo e pequenos objetos independentes, sem recobrir
    // a entrada da tenda. As coordenadas são as dos pés dos sprites.
    {
      id: 'enseada_arvore_camp_esquerda', tipo: 'decoracao', x: 11.29, y: 25.70,
      sprite: 'enseada_camp_ref_arvore', useCrop: true, larguraPx: 130,
      pivotX: 0.5, pivotY: 0.98, bloqueia: false,
    },
    {
      id: 'enseada_arvore_camp_direita', tipo: 'decoracao', x: 12.25, y: 24.74,
      sprite: 'enseada_camp_ref_arvore', useCrop: true, espelhar: true, larguraPx: 115,
      pivotX: 0.5, pivotY: 0.98, bloqueia: false,
    },
    {
      id: 'enseada_cesto_ferramentas_camp', tipo: 'decoracao', x: 10.67, y: 31.32,
      sprite: 'enseada_camp_ref_cesto_ferramentas', useCrop: true, larguraPx: 20,
      pivotX: 0.5, pivotY: 0.98, bloqueia: false,
    },
    {
      id: 'enseada_caixa_atras_tenda', tipo: 'decoracao', x: 11.34, y: 26.66,
      sprite: 'enseada_camp_ref_caixa', useCrop: true, larguraPx: 38,
      pivotX: 0.5, pivotY: 0.98, bloqueia: true,
      hitbox: { offsetX: -0.20, offsetY: -0.20, width: 0.4, height: 0.4 },
    },
    {
      id: 'enseada_caixote_camp', tipo: 'decoracao', x: 13.99, y: 28.52,
      sprite: 'enseada_camp_ref_caixa', useCrop: true, larguraPx: 27,
      pivotX: 0.5, pivotY: 0.98, bloqueia: true,
      hitbox: { offsetX: -0.15, offsetY: -0.15, width: 0.3, height: 0.3 },
    },

    // Assento e palmeiras do acampamento: peças independentes da área jogável.
    {
      id: 'enseada_banco_tronco_camp', tipo: 'decoracao', x: 13.16125, y: 31.52125,
      sprite: 'enseada_camp_ref_banco', useCrop: true, larguraPx: 70,
      pivotX: 0.5, pivotY: 0.98, bloqueia: false,
    },
    {
      id: 'enseada_palmeira_camp_oeste', tipo: 'decoracao', x: 9.65, y: 30.35,
      sprite: 'enseada6_palmeira', useCrop: true, larguraPx: 95,
      pivotX: 0.5, pivotY: 0.98, ajusteY: -45, bloqueia: false,
    },
    {
      id: 'enseada_palmeira_camp_norte', tipo: 'decoracao', x: 11.9, y: 31.1,
      sprite: 'enseada6_palmeira', useCrop: true, larguraPx: 95,
      pivotX: 0.5, pivotY: 0.98, ajusteY: -80, depthOffset: -4, bloqueia: false,
    },

    // ---- SETOR 3 (Oeste): Pórtico + bosques ----
    {
      id: 'portico_trilha_praia', nome: 'PÓRTICO DA TRILHA', tipo: 'decoracao', x: 13.5, y: 42.0,
      sprite: 'enseada3_portico_oeste', spriteB: 'enseada3_portico_oeste', animPeriodo: 0.54,
      useCrop: true, larguraPx: 150, pivotX: 0.5, pivotY: 0.98,
      bloqueia: false, oscilaBrisa: true, brilho: { cor: '#ffb86b', raio: 1.0, forca: 0.16 },
    },
    {
      id: 'carrilhao_vento_enseada', nome: 'CARRILHÃO DE VENTO', tipo: 'decoracao', x: 16.0, y: 40.0,
      sprite: 'enseada_carrilhao_vento', spriteB: 'enseada_carrilhao_vento_b', animPeriodo: 0.58,
      useCrop: true, larguraPx: 60, pivotX: 0.5, pivotY: 0.96,
      bloqueia: false, oscilaBrisa: true,
      interacao: { label: 'OUVIR O CARRILHÃO', distancia: 1.55 },
    },
    {
      id: 'enseada3_mata_oeste_a', tipo: 'decoracao', x: 18.0, y: 44.0,
      sprite: 'enseada3_palmeiral', useCrop: true, larguraPx: 320,
      pivotX: 0.5, pivotY: 0.96, depthOffset: -0.6, bloqueia: false,
    },
    {
      id: 'enseada3_mata_oeste_b', tipo: 'decoracao', x: 21.5, y: 53.5,
      sprite: 'enseada3_palmeiral', useCrop: true, larguraPx: 300,
      pivotX: 0.5, pivotY: 0.96, depthOffset: -0.4, bloqueia: false,
    },

    // ---- SETOR 4 (Centro): Monólito + estela + cairn ----
    {
      id: 'totem_eco_enseada', nome: 'MONÓLITO DE ECO', tipo: 'decoracao', x: 33.0, y: 32.0,
      sprite: 'enseada3_monolito', spriteB: 'enseada3_monolito', animPeriodo: 0.52,
      useCrop: true, larguraPx: 220, pivotX: 0.5, pivotY: 0.98,
      bloqueia: false, pulsoTotem: true, brilho: { cor: '#52f6ff', raio: 1.4, forca: 0.32 },
      interacao: { label: 'EXAMINAR MONÓLITO DE ECO', distancia: 1.5 },
    },
    {
      id: 'estela_navegadores_enseada', nome: 'ESTELA DOS NAVEGADORES', tipo: 'decoracao', x: 30.0, y: 33.5,
      sprite: 'enseada8_estela', spriteB: 'enseada8_estela', animPeriodo: 0.62,
      useCrop: true, larguraPx: 70, pivotX: 0.5, pivotY: 0.92,
      bloqueia: false, pulsoBiolum: '#6cf7ff', brilho: { cor: '#6cf7ff', raio: 1.35, forca: 0.3 },
      interacao: { label: 'DECIFRAR A ESTELA DOS NAVEGADORES', distancia: 1.6 },
    },
    {
      id: 'jardim_pedras_enseada', nome: 'PEDRAS DO EQUILÍBRIO', tipo: 'decoracao', x: 36.5, y: 31.0,
      sprite: 'enseada4_cairn', spriteB: 'enseada4_cairn', animPeriodo: 0.64,
      useCrop: true, larguraPx: 80, pivotX: 0.5, pivotY: 0.98,
      bloqueia: true, hitbox: { offsetX: -0.30, offsetY: -0.24, width: 0.60, height: 0.48 },
      oscilaBrisa: true,
      interacao: { label: 'MEDITAR NAS PEDRAS DO EQUILÍBRIO', distancia: 1.55 },
    },
    {
      id: 'borboletas_fonte_enseada', nome: 'BORBOLETAS DO CENTRO', tipo: 'decoracao', x: 34.5, y: 30.0,
      sprite: 'enseada_borboletas_vivas', spriteB: 'enseada_borboletas_vivas_b', animPeriodo: 0.34,
      useCrop: true, larguraPx: 50, pivotX: 0.5, pivotY: 0.5,
      bloqueia: false, flutuacaoSuave: true, nadoCardume: true,
    },
    {
      id: 'enseada3_mata_centro_oeste', tipo: 'decoracao', x: 28.0, y: 28.0,
      sprite: 'enseada3_palmeiral', useCrop: true, larguraPx: 300,
      pivotX: 0.5, pivotY: 0.96, depthOffset: -0.35, bloqueia: false,
    },
    {
      id: 'enseada3_mata_leste', tipo: 'decoracao', x: 40.0, y: 24.0,
      sprite: 'enseada3_palmeiral', useCrop: true, larguraPx: 320,
      pivotX: 0.5, pivotY: 0.96, depthOffset: -0.4, bloqueia: false,
    },

    // ---- SETOR 5 (Sudoeste): Piscina + espelho + grutas + rede ----
    {
      id: 'piscina_mare_viva_enseada', nome: 'PISCINA DE MARÉ VIVA', tipo: 'decoracao', x: 28.0, y: 50.0,
      sprite: 'enseada3_piscina', spriteB: 'enseada3_piscina', animPeriodo: 0.64,
      useCrop: true, larguraPx: 240, pivotX: 0.5, pivotY: 0.92,
      bloqueia: false, pulsoBiolum: '#5cf7eb', brilho: { cor: '#5cf7eb', raio: 1.25, forca: 0.26 },
      interacao: { label: 'MERGULHAR AS MÃOS NA MARÉ VIVA', distancia: 1.65 },
    },
    {
      id: 'enseada3_praca_espelho', tipo: 'decoracao', x: 33.0, y: 48.0,
      sprite: 'enseada3_calcada', useCrop: true, larguraPx: 200,
      pivotX: 0.5, pivotY: 0.92, depthOffset: -1, bloqueia: false,
    },
    {
      id: 'espelho_arquetipos_enseada', nome: 'ESPELHO DE RESSONÂNCIA', tipo: 'dispositivo', x: 33.0, y: 48.0,
      sprite: 'enseada_espelho_arquetipo', spriteB: 'enseada_espelho_arquetipo_b', animPeriodo: 0.56,
      useCrop: true, larguraPx: 80, pivotX: 0.5, pivotY: 0.95,
      bloqueia: false, brilho: { cor: '#6ff7ff', raio: 1.5, forca: 0.34 },
      interacao: { label: 'SINTONIZAR ARQUÉTIPO', distancia: 1.65 },
    },
    {
      id: 'gruta_concha_enseada', nome: 'GRUTA-CONCHA', tipo: 'decoracao', x: 24.0, y: 47.0,
      sprite: 'enseada8_gruta', spriteB: 'enseada8_gruta', animPeriodo: 0.66,
      useCrop: true, larguraPx: 120, pivotX: 0.5, pivotY: 0.98,
      bloqueia: true, hitbox: { offsetX: -0.45, offsetY: -0.28, width: 0.9, height: 0.56 },
      pulsoBiolum: '#54ccff', brilho: { cor: '#54ccff', raio: 1.3, forca: 0.28 },
      interacao: { label: 'ABRIGAR-SE NA GRUTA-CONCHA', distancia: 1.7 },
    },
    {
      id: 'enseada_gruta_pedra', nome: 'GRUTA DE PEDRA', tipo: 'decoracao', x: 32.0, y: 52.5,
      sprite: 'enseada4_gruta', useCrop: true, larguraPx: 110,
      pivotX: 0.5, pivotY: 0.98, bloqueia: false,
      interacao: { label: 'EXAMINAR A GRUTA DE PEDRA', distancia: 1.6 },
    },
    {
      id: 'rede_treino_praia_enseada', nome: 'REDE DE TREINO DA PRAIA', tipo: 'decoracao', x: 36.0, y: 54.0,
      sprite: 'enseada4_rede', useCrop: true, larguraPx: 150,
      pivotX: 0.5, pivotY: 0.98, depthOffset: 0.2,
      bloqueia: true, hitboxes: [
        { offsetX: -1.28, offsetY: -0.24, width: 0.30, height: 0.48 },
        { offsetX: 0.98, offsetY: -0.24, width: 0.30, height: 0.48 },
      ],
      interacao: { label: 'PRATICAR NA REDE DA PRAIA', distancia: 1.8, speaker: 'REDE DE TREINO',
        dialogue: ['A REDE MARCA UM ESPAÇO LIVRE PARA TREINAR. A AREIA AO REDOR ESTÁ FIRME E SEM OBSTÁCULOS.'] },
    },
    {
      id: 'travessia_pedras_agua', tipo: 'decoracao', x: 52.0, y: 56.0,
      sprite: 'enseada4_travessia_pedras', useCrop: true, larguraPx: 110,
      pivotX: 0.5, pivotY: 0.8, depthOffset: -0.2, bloqueia: false,
    },

    // ---- SETOR 6 (Sul): Cais + embarcadouro ----
    // Arte do cais separada do ponto de interação em terra: a ponta fica no mar.
    {
      id: 'cais_enseada_visual', tipo: 'decoracao', x: 56.5, y: 51.0,
      sprite: 'enseada8_cais_barco_ref', useCrop: true, larguraPx: 280, skewY: -0.10,
      pivotX: 0.5, pivotY: 0.97, camada: 'fundo', ordem: -1, bloqueia: false,
    },
    {
      id: 'cais_madeira_pesca_enseada', nome: 'CAIS DA ENSEADA', tipo: 'decoracao', x: 49.5, y: 48.5,
      sprite: 'enseada8_cais_barco_ref', spriteB: 'enseada8_cais_barco_ref', animPeriodo: 0.68,
      useCrop: true, larguraPx: 280, pivotX: 0.5, pivotY: 0.97,
      bloqueia: false, renderizar: false, brilho: { cor: '#ffd980', raio: 1.0, forca: 0.16 },
      interacao: { label: 'OBSERVAR A BAÍA DO CAIS', distancia: 1.75 },
    },
    {
      id: 'barco_expedicao_enseada', nome: 'BARCO DE EXPEDIÇÃO', tipo: 'decoracao', x: 48.0, y: 49.0,
      sprite: 'enseada_barco_expedicao', spriteB: 'enseada_barco_expedicao_b', animPeriodo: 0.72,
      useCrop: true, larguraPx: 126, pivotX: 0.5, pivotY: 0.88,
      bloqueia: false, flutuacaoSuave: true, renderizar: false,
      interacao: { label: 'INSPECIONAR BARCO DE EXPEDIÇÃO', distancia: 2.15 },
    },
    {
      id: 'embarcadouro_mare_astral', nome: 'EMBARCADOURO DA MARÉ', tipo: 'decoracao', x: 44.0, y: 46.0,
      sprite: 'enseada_embarcadouro_mare', spriteB: 'enseada_embarcadouro_mare_b', animPeriodo: 0.62,
      useCrop: true, larguraPx: 110, pivotX: 0.5, pivotY: 0.88,
      bloqueia: false, renderizar: false, brilho: { cor: '#5cf7eb', raio: 1.35, forca: 0.3 },
      interacao: { label: 'EXAMINAR O CAIS DA MARÉ', distancia: 1.75 },
    },
    {
      id: 'farolete_baia_enseada', nome: 'FAROLETE DA BAÍA', tipo: 'decoracao', x: 51.5, y: 22.5,
      sprite: 'enseada_farolete_baia', spriteB: 'enseada_farolete_baia_b', animPeriodo: 0.65,
      useCrop: true, larguraPx: 80, pivotX: 0.5, pivotY: 0.96,
      bloqueia: false, feixeFarolete: true, brilho: { cor: '#5cf7eb', raio: 1.8, forca: 0.4 },
      interacao: { label: 'OBSERVAR DO FAROLETE', distancia: 1.65 },
    },

    // ---- SETOR 7 (Leste): Portal + jardim + baú + recife ----
    {
      id: 'enseada_base_rochosa_portal_leste', tipo: 'decoracao', x: 57.5, y: 24.0,
      sprite: 'enseada_rochedo_portal', useCrop: true, larguraPx: 380, espelhar: true,
      pivotX: 0.5, pivotY: 1, ajusteX: 70, ajusteY: 100,
      camada: 'fundo', ordem: -1, bloqueia: false,
    },
    {
      id: 'arco_conduto_retorno_mare', tipo: 'decoracao', x: 57.5, y: 24.0,
      sprite: 'enseada8_portal_leste', spriteB: 'enseada8_portal_leste', animPeriodo: 0.7,
      useCrop: true, espelhar: true, larguraPx: 170, pivotX: 0.5, pivotY: 0.98, ajusteY: -55,
      vorticidadeCorrentes: { y: -116, rx: 16, ry: 38 },
      bloqueia: false, brilho: { cor: '#5cf7eb', raio: 2.2, forca: 0.44 },
    },
    {
      id: 'enseada_jardim_cercado', tipo: 'decoracao', x: 44.0, y: 30.0,
      sprite: 'enseada7_jardim', useCrop: true, larguraPx: 110,
      pivotX: 0.5, pivotY: 0.96, bloqueia: false,
      interacao: { label: 'EXAMINAR O JARDIM', distancia: 1.6 },
    },
    {
      id: 'bau_deriva_enseada', nome: 'BAÚ À DERIVA', tipo: 'decoracao', x: 46.0, y: 33.0,
      sprite: 'enseada_bau_deriva', spriteB: 'enseada_bau_deriva_b', animPeriodo: 0.56,
      useCrop: true, larguraPx: 60, pivotX: 0.5, pivotY: 0.9,
      bloqueia: false, pulsoBiolum: '#5cf7eb', brilho: { cor: '#5cf7eb', raio: 1.15, forca: 0.26 },
      interacao: { label: 'ABRIR O BAÚ À DERIVA', distancia: 1.55 },
    },
    {
      id: 'banco_ostras_enseada', nome: 'BANCO DE OSTRAS PÉROLA', tipo: 'decoracao', x: 48.5, y: 29.0,
      sprite: 'enseada_banco_ostras', spriteB: 'enseada_banco_ostras_b', animPeriodo: 0.64,
      useCrop: true, larguraPx: 70, pivotX: 0.5, pivotY: 0.9,
      bloqueia: false, brilho: { cor: '#70f3ff', raio: 1.0, forca: 0.24 },
      interacao: { label: 'COLHER PÉROLA DA ENSEADA', distancia: 1.65 },
    },
    {
      id: 'coral_luminescente_enseada', nome: 'RECIFE LUMINESCENTE', tipo: 'decoracao', x: 50.0, y: 26.0,
      sprite: 'enseada_coral_azul', spriteB: 'enseada_coral_azul_b', animPeriodo: 0.62,
      useCrop: true, larguraPx: 70, pivotX: 0.5, pivotY: 0.92,
      bloqueia: false, pulsoBiolum: '#44e8ff', brilho: { cor: '#44e8ff', raio: 1.35, forca: 0.34 },
      interacao: { label: 'COLHER AMOSTRA DE CORAL', distancia: 1.6 },
    },
    {
      id: 'ninho_tartarugas_enseada', nome: 'NINHO DE TARTARUGAS', tipo: 'decoracao', x: 52.0, y: 30.0,
      sprite: 'enseada_ninho_tartarugas', spriteB: 'enseada_ninho_tartarugas_b', animPeriodo: 0.68,
      useCrop: true, larguraPx: 70, pivotX: 0.5, pivotY: 0.9,
      bloqueia: false,
      interacao: { label: 'PROTEGER O NINHO', distancia: 1.6 },
    },
    {
      id: 'captador_ecos_enseada', nome: 'CAPTADOR DE ECOS', tipo: 'dispositivo', x: 46.0, y: 25.0,
      sprite: 'enseada_rede_cristal', spriteB: 'enseada_rede_cristal_b', animPeriodo: 0.6,
      useCrop: true, larguraPx: 80, pivotX: 0.5, pivotY: 0.92,
      bloqueia: false, pulsoAntena: true, brilho: { cor: '#5cf7eb', raio: 1.3, forca: 0.28 },
      interacao: { label: 'SINTONIZAR CAPTADOR DE ECOS', distancia: 1.65 },
    },
    {
      id: 'santuario_lumeo_enseada', nome: 'SANTUÁRIO DE LÚMEO', tipo: 'decoracao', x: 42.6, y: 19.6,
      sprite: 'enseada_santuario_lumeo', spriteB: 'enseada_santuario_lumeo_b', animPeriodo: 0.58,
      useCrop: true, larguraPx: 80, pivotX: 0.5, pivotY: 0.92,
      bloqueia: false, pulsoBiolum: '#70f3ff', brilho: { cor: '#70f3ff', raio: 1.35, forca: 0.32 },
      interacao: { label: 'EXAMINAR SANTUÁRIO DE LÚMEO', distancia: 1.55 },
    },
    {
      id: 'borboletas_jardim_enseada', nome: 'BORBOLETAS DO SANTUÁRIO', tipo: 'decoracao', x: 40.5, y: 21.0,
      sprite: 'enseada_borboletas_vivas', spriteB: 'enseada_borboletas_vivas_b', animPeriodo: 0.36,
      useCrop: true, larguraPx: 50, pivotX: 0.5, pivotY: 0.5,
      bloqueia: false, flutuacaoSuave: true, nadoCardume: true,
    },
    {
      id: 'algas_douradas_enseada', nome: 'BANCO DE ALGAS DOURADAS', tipo: 'decoracao', x: 38.7, y: 28.2,
      sprite: 'enseada_algas_douradas', spriteB: 'enseada_algas_douradas_b', animPeriodo: 0.62,
      useCrop: true, larguraPx: 70, pivotX: 0.5, pivotY: 0.92,
      bloqueia: false, oscilaBrisa: true, pulsoBiolum: '#ffd86b', brilho: { cor: '#ffd86b', raio: 1.0, forca: 0.24 },
      interacao: { label: 'COLHER ESSÊNCIA DE ALGAS DOURADAS', distancia: 1.55 },
    },
    {
      id: 'poleiro_aves_enseada', nome: 'POLEIRO DAS AVES', tipo: 'decoracao', x: 50.5, y: 27.0,
      sprite: 'enseada_poleiro_aves', spriteB: 'enseada_poleiro_aves_b', animPeriodo: 0.56,
      useCrop: true, larguraPx: 70, pivotX: 0.5, pivotY: 0.94,
      bloqueia: false,
      interacao: { label: 'OBSERVAR O POLEIRO', distancia: 1.5 },
    },
    {
      id: 'fonte_termal_enseada', nome: 'FONTE TERMAL DA ENSEADA', tipo: 'decoracao', x: 29.0, y: 53.0,
      sprite: 'enseada_fonte_termal', spriteB: 'enseada_fonte_termal_b', animPeriodo: 0.58,
      useCrop: true, larguraPx: 90, pivotX: 0.5, pivotY: 0.9,
      bloqueia: false, vaporTermal: true, brilho: { cor: '#7efce0', raio: 1.4, forca: 0.28 },
      interacao: { label: 'DESCANSAR NA FONTE TERMAL', distancia: 1.7 },
    },
    {
      id: 'banco_conchas_enseada', nome: 'BANCO DE CONCHAS', tipo: 'decoracao', x: 38.5, y: 45.5,
      sprite: 'enseada_banco_conchas', spriteB: 'enseada_banco_conchas_b', animPeriodo: 0.68,
      useCrop: true, larguraPx: 70, pivotX: 0.5, pivotY: 0.88,
      bloqueia: false,
      interacao: { label: 'EXAMINAR CONCHAS & ESTRELAS', distancia: 1.5 },
    },
    {
      id: 'placa_trilha_enseada', nome: 'PLACA DAS TRILHAS', tipo: 'decoracao', x: 27.0, y: 44.6,
      sprite: 'enseada4_placa', useCrop: true, larguraPx: 60,
      pivotX: 0.5, pivotY: 0.98, depthOffset: 0.1,
      bloqueia: true, hitbox: { offsetX: -0.20, offsetY: -0.20, width: 0.40, height: 0.40 },
      interacao: { label: 'LER A PLACA DAS TRILHAS', distancia: 1.5, speaker: 'PLACA DAS TRILHAS',
        dialogue: ['O CAMINHO DO OESTE LEVA À PRAIA. AO NORTE FICA A ESTAÇÃO; AO SUL, A PISCINA E A GRUTA.'] },
    },

    // ---- SETOR 8 (Mar): Portal NE + boias + fauna marinha ----
    {
      id: 'portal_caminho_correntes', nome: 'PORTAL DAS CORRENTES', tipo: 'decoracao', x: 36.0, y: 4.0,
      sprite: 'enseada_correntes_portal_ref', vorticidadeCorrentes: true,
      useCrop: true, larguraPx: 190, pivotX: 0.5, pivotY: 0.94,
      bloqueia: false, brilho: { cor: '#5cf7eb', raio: 1.5, forca: 0.34 },
    },
    ...[[29.5, 2.0], [30.8, 5.3], [39.5, 1.0], [41.0, 4.0], [42.0, 6.5]].map(([bx, by], i) => ({
      id: `boia_ne_${i + 1}`, tipo: 'decoracao', x: bx, y: by,
      sprite: i === 0 || i === 3 ? 'enseada_correntes_boia_vermelha' : 'enseada_correntes_boia_laranja',
      useCrop: true, larguraPx: 20, pivotX: 0.5, pivotY: 0.9, bloqueia: false, flutuacaoSuave: true, sombra: [8, 3],
    })),
    // Pedras de apoio separadas, sobre o mar e sem alterar a costa visual.
    ...[[30.8,7.9],[31.7,7.7],[32.6,7.9],[33.5,7.7],[34.3,7.8],[35.2,7.4],[36.0,6.9],[36.2,6.1],[36.2,5.4]].map(([x,y], i) => ({
      id: `pedra_correntes_${i}`, tipo: 'decoracao', x, y,
      sprite: `enseada_correntes_pedra_${i % 3 + 1}`, useCrop: true, larguraPx: 38 + (i % 3) * 5,
      pivotX: 0.5, pivotY: 0.8, camada: 'fundo', bloqueia: false,
    })),
    {
      id: 'cardume_correntes', tipo: 'decoracao', x: 43, y: 5.5,
      sprite: 'enseada_correntes_cardume',
      useCrop: true, larguraPx: 68, pivotX: 0.5, pivotY: 0.65,
      bloqueia: false, flutuacaoSuave: true, nadoCardume: true,
    },
    {
      id: 'golfinho_saltando', tipo: 'decoracao', x: 2.0, y: 30.0, renderizar: false,
      sprite: 'enseada5_golfinho_saltando', spriteB: 'enseada5_golfinho_saltando_b', animPeriodo: 0.6, useCrop: true, larguraPx: 90,
      pivotX: 0.5, pivotY: 0.96, depthOffset: -0.3, bloqueia: false,
    },
    {
      id: 'golfinho_nadando', tipo: 'decoracao', x: 60.0, y: 38.0, renderizar: false,
      sprite: 'enseada5_golfinho_nadando', spriteB: 'enseada5_golfinho_nadando_b', animPeriodo: 0.6, useCrop: true, larguraPx: 100,
      pivotX: 0.5, pivotY: 0.96, depthOffset: -0.3, bloqueia: false,
    },
    {
      id: 'tartaruga_marinha', tipo: 'decoracao', x: 60.0, y: 42.0,
      sprite: 'enseada5_tartaruga', spriteB: 'enseada5_tartaruga_b', animPeriodo: 0.6, useCrop: true, larguraPx: 90,
      pivotX: 0.5, pivotY: 0.96, depthOffset: -0.3, bloqueia: false,
    },
    {
      id: 'corais_amarelos', tipo: 'decoracao', x: 56.0, y: 44.0,
      sprite: 'enseada5_corais', spriteB: 'enseada5_corais_b', animPeriodo: 0.6, useCrop: true, larguraPx: 80,
      pivotX: 0.5, pivotY: 0.96, depthOffset: -0.3, bloqueia: false,
    },
    {
      id: 'coral_rosa', tipo: 'decoracao', x: 58.0, y: 36.0,
      sprite: 'enseada6_coral_rosa', useCrop: true, larguraPx: 70,
      pivotX: 0.5, pivotY: 0.96, depthOffset: -0.3, bloqueia: false,
    },
    {
      id: 'cristais_azuis_mar', tipo: 'decoracao', x: 59.0, y: 34.0,
      sprite: 'enseada5_cristais', spriteB: 'enseada5_cristais_b', animPeriodo: 0.6, useCrop: true, larguraPx: 70,
      pivotX: 0.5, pivotY: 0.96, depthOffset: -0.3, bloqueia: false,
    },
    {
      id: 'cardume_orla_norte', nome: 'CARDUME OESTE', tipo: 'decoracao', x: 50.3, y: 10.1,
      sprite: 'enseada_cardume_vivo', spriteB: 'enseada_cardume_vivo_b', animPeriodo: 0.46,
      useCrop: true, larguraPx: 58, pivotX: 0.5, pivotY: 0.65,
      depthOffset: -1, bloqueia: false, flutuacaoSuave: true, nadoCardume: true,
    },
    {
      id: 'cardume_orla_sul', nome: 'CARDUME LESTE', tipo: 'decoracao', x: 23.5, y: 62.0,
      sprite: 'enseada_cardume_vivo', spriteB: 'enseada_cardume_vivo_b', animPeriodo: 0.48,
      useCrop: true, larguraPx: 60, pivotX: 0.5, pivotY: 0.65,
      depthOffset: -1, bloqueia: false, flutuacaoSuave: true, nadoCardume: true,
    },
    {
      id: 'lanterna_marinha_norte', nome: 'LANTERNA MARÍTIMA', tipo: 'decoracao', x: 30.0, y: 5.0,
      sprite: 'enseada_lanterna_marinha', spriteB: 'enseada_lanterna_marinha_b', animPeriodo: 0.64,
      useCrop: true, larguraPx: 50, pivotX: 0.5, pivotY: 0.9,
      bloqueia: false, flutuacaoSuave: true, brilho: { cor: '#6ff7ff', raio: 1.5, forca: 0.38 },
    },
    {
      id: 'lanterna_marinha_sul', nome: 'LANTERNA MARÍTIMA', tipo: 'decoracao', x: 61.7, y: 22.4,
      sprite: 'enseada_lanterna_marinha', spriteB: 'enseada_lanterna_marinha_b', animPeriodo: 0.64,
      useCrop: true, larguraPx: 50, pivotX: 0.5, pivotY: 0.9,
      bloqueia: false, flutuacaoSuave: true, brilho: { cor: '#6ff7ff', raio: 1.5, forca: 0.38 },
    },

    // ---- SETOR 9 (Praia): detalhes pequenos na areia ----
    {
      id: 'caranguejos_areia', tipo: 'decoracao', x: 38.0, y: 56.0,
      sprite: 'enseada5_caranguejos', spriteB: 'enseada5_caranguejos_b', animPeriodo: 0.6, useCrop: true, larguraPx: 60,
      pivotX: 0.5, pivotY: 0.96, depthOffset: -0.3, bloqueia: false,
    },
    {
      id: 'estrela_do_mar', tipo: 'decoracao', x: 34.0, y: 55.0,
      sprite: 'enseada6_estrela', useCrop: true, larguraPx: 60,
      pivotX: 0.5, pivotY: 0.96, depthOffset: -0.3, bloqueia: false,
    },
    {
      id: 'poste_lanterna_madeira', tipo: 'decoracao', x: 30.0, y: 46.0,
      sprite: 'enseada6_poste', useCrop: true, larguraPx: 50,
      pivotX: 0.5, pivotY: 0.96, depthOffset: -0.3, bloqueia: false,
    },
    {
      id: 'enseada_arbusto_1', tipo: 'decoracao', x: 40.5, y: 57.5, sprite: 'beach_props', frame: { col: 3, row: 0 },
      useCrop: true, larguraPx: 44, pivotX: 0.5, pivotY: 1, bloqueia: false,
    },
    {
      id: 'enseada_concha', tipo: 'decoracao', x: 38.0, y: 43.0, sprite: 'beach_props', frame: { col: 1, row: 3 },
      useCrop: true, larguraPx: 36, pivotX: 0.5, pivotY: 1, bloqueia: false,
    },

    // ---- Bosque sul (fecha o setor 5 sem cobrir a rede) ----
    {
      id: 'enseada3_mata_sul', tipo: 'decoracao', x: 41.5, y: 42.6,
      sprite: 'enseada3_palmeiral', useCrop: true, larguraPx: 300,
      pivotX: 0.5, pivotY: 0.96, depthOffset: -0.4, bloqueia: false,
    },
  ],

  collectibles: [
    {
      id: 'lumeo_encontro', nome: 'SINAL DE LÚMEO', tipo: 'eco', x: 27.0, y: 43.0,
      requiresFlag: 'enseada_ecos_mapeada', label: 'OUVIR O ECO DISTANTE', speaker: 'ECO DISTANTE',
      dialogue: [
        'TRÊS SINAIS RESPONDEM ÀS SUAS DESCOBERTAS. UM PEQUENO ECO SE ESCONDE NA ENSEADA.',
        'UMA VIBRAÇÃO INSTÁVEL VEM DAS RUÍNAS A LESTE. INVESTIGUE SEM ASSUSTÁ-LO.',
      ],
    },
    {
      id: 'lumeo_ressonancia', nome: 'RESSONÂNCIA', tipo: 'eco', x: 29.0, y: 40.0,
      requiresFlag: 'collected_lumeo_encontro', label: 'ACALMAR A RESSONÂNCIA', speaker: 'RESSONÂNCIA',
      dialogue: [
        'O PULSO AGITADO DIMINUI QUANDO VOCÊ SE APROXIMA SEM AGREDIR.',
        'UMA LUZ PEQUENA SEGUE EM DIREÇÃO À MATA. VÁ ATÉ ELA.',
      ],
    },
    {
      id: 'lumeo_vinculo', nome: 'LÚMEO', tipo: 'eco', x: 32.0, y: 39.0,
      requiresFlag: 'collected_lumeo_ressonancia', label: 'OFERECER COMPANHIA A LÚMEO', speaker: 'LÚMEO',
      dialogue: [
        'VOCÊ ESPERA. O PEQUENO ECO SE APROXIMA POR VONTADE PRÓPRIA.',
        'UMA LUZ ENTRELAÇA SEU CAMINHO AO DELE. LÚMEO ESCOLHE ACOMPANHAR VOCÊ.',
      ],
    },
    {
      id: 'enseada_rastro_mar', nome: 'RASTRO DA MARÉ', tipo: 'fragmento', x: 22.0, y: 46.0,
      label: 'INVESTIGAR RASTRO DA MARÉ',
      dialogue: [
        'UM ECO SE MOVE CONTRA A MARÉ. O PULSO COINCIDE COM O RUÍDO DO TERMINAL.',
        'ALGUÉM MARCOU UMA ROTA ANTES DE VOCÊ.',
      ],
    },
    {
      id: 'enseada_rastro_pedra', nome: 'MARCA NO BASALTO', tipo: 'fragmento', x: 34.0, y: 37.0,
      label: 'EXAMINAR MARCA NO BASALTO',
      dialogue: [
        'UM SÍMBOLO FOI GRAVADO NO BASALTO: UM CÍRCULO INTERROMPIDO POR TRÊS RISCOS.',
        'A PEDRA ESTÁ QUENTE, MAS NÃO HÁ FOGO POR PERTO.',
      ],
    },
    {
      id: 'enseada_rastro_mata', nome: 'VESTÍGIO DA MATA', tipo: 'fragmento', x: 26.0, y: 40.0,
      label: 'EXAMINAR VESTÍGIO DA MATA',
      dialogue: [
        'FOLHAS E PEGADAS INDICAM UMA TRILHA PARA O INTERIOR.',
        'O CAMINHO PARA A BAÍA LESTE AGORA SE ABRE DIANTE DE VOCÊ.',
      ],
    },
  ],

  portals: [
    {
      id: 'acesso_estacao_666', tipo: 'door', x: 21.655 + ESTACAO_DX, y: 10.555 + ESTACAO_DY, label: 'ENTRAR NA ESTAÇÃO 66.6',
      requiresFlag: 'frequencia666Registrada', lockedLabel: 'ESTAÇÃO DE ESCUTA // SEM SINAL',
      mensagemBloqueado: ['A PORTA AGUARDA UMA ASSINATURA. INVESTIGUE O TERMINAL DE MANUTENÇÃO COM [R].'],
      interactionDistance: 1.2, destino: { mapId: 'estacao_limiar_666', spawnId: 'vindo_da_enseada' }, transition: 'fade',
    },
    {
      id: 'rota_correntes', tipo: 'door', x: 36.0, y: 3.0, label: 'NAVEGAR: CAMINHO DAS CORRENTES',
      interactionDistance: 1.4, destino: { mapId: 'mar_caminho_das_correntes', spawnId: 'vindo_da_enseada' }, transition: 'fade',
    },
    {
      id: 'retorno_darsena_mare', tipo: 'door', x: 59.0, y: 24.0, automaticoNado: true, raioAutomatico: 0.8,
      requiresFlag: 'rota_livre_enseada_aberta', lockedLabel: 'CONDUTO ABISSAL INATIVO',
      mensagemBloqueado: ['UM VÓRTICE PROFUNDO RESSOA COM A DÁRSENA DA MARÉ ASTRAL, MAS PERMANECE SELADO DO OUTRO LADO.'],
      label: 'NADAR: ROTA DAS MARÉS ATÉ A DÁRSENA', requiresArchetype: 'mare_astral',
      interactionDistance: 1.95, destino: { mapId: 'mar_rota_mare_astral', spawnId: 'vindo_da_enseada' }, transition: 'fade',
    },
    {
      id: 'enseada_retorno', tipo: 'door', x: 16.0, y: 52.0, label: 'VOLTAR À PRAIA INICIAL',
      interactionDistance: 1.4, destino: { mapId: 'ilha_praia_inicial', spawnId: 'vindo_da_enseada' }, transition: 'fade',
    },
  ],
};
