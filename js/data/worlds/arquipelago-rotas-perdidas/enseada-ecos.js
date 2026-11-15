// Enseada dos Ecos 3.1 — reconstrução em escala de referência (72x64)
// Mantém os acessos antigos enquanto amplia a ilha e introduz áreas próprias
// para o acampamento, o santuário central e a extensa praia sul/leste.
import { buildGround } from '../../ground.js';
import { relevo } from '../../relevo-praia.js';
import { flora } from '../../flora-praia.js';

const COLS = 72;
const ROWS = 64;

function hash(x, y, seed = 0) {
  let h = Math.imul(x + seed * 131, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const ehTerra = c => c !== undefined && 'SMT'.includes(c);

// Silhueta da referência (imagem 1, 1490×809): projeção isométrica 2:1 da arte.
// Cada célula da grade é convertida de volta para a imagem; a costa é o polígono
// traçado sobre a referência (ilha principal e ilhota nordeste do portal de correntes).
const REF = { cx: 745, cy: 405, s: 2.0, ox: 35.094, oy: 34.625 };
const POLIGONO_ILHA = [[112, 395], [150, 300], [230, 250], [330, 195], [430, 150], [520, 110], [600, 70], [700, 30], [800, 20], [900, 35], [980, 80], [1040, 120], [1085, 165], [1050, 200], [1030, 240], [1090, 275], [1160, 320], [1230, 345], [1330, 420], [1320, 480], [1280, 520], [1230, 545], [1160, 560], [1090, 585], [1040, 620], [1000, 660], [930, 680], [860, 690], [790, 700], [720, 705], [650, 690], [560, 695], [470, 685], [390, 650], [300, 610], [220, 570], [160, 510], [118, 450]];
const POLIGONO_ILHOTA = [[1200, 215], [1240, 190], [1290, 195], [1320, 225], [1300, 255], [1250, 260], [1210, 245]];
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
  return dentroDoPoligono(px, py, POLIGONO_ILHA) || dentroDoPoligono(px, py, POLIGONO_ILHOTA);
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
  if (grid[y]?.[x] !== undefined) grid[y][x] = 'S';
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

const floraDecor = (folha, peca, id, x, y, escala = 0.9, extra = {}) =>
  flora(folha, peca, id, x, y, { escala, bloqueia: false, ...extra });

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
    useBackgroundWalls: true,
    sandSprite: 'beach_novas_artes',
    ambiente: { poeira: 18, cor: '#ffd98a' },
  },
  corChao: '#e6c280',
  layout,
  walkMask: ground.walkMask,
  pisos: ground.pisos,
  aguaPraia: rows,

  spawnPoints: {
    inicio: { x: 19.9, y: 51.7 },
    vindo_da_praia: { x: 19.9, y: 51.7 },
    vindo_da_estacao_666: { x: 30.1, y: 19.0 },
    vindo_do_mar: { x: 38.5, y: 7.4 },
    vindo_da_darsena_mare: { x: 49.5, y: 19.6 },
  },

  pocas: [
    {
      id: 'poca_cascata_enseada',
      nome: 'LAGOA DA ORLA SUDESTE',
      x: 34.8, y: 55.8, rx: 1.8, ry: 1.25,
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
    {
      id: 'enseada_capivara', species: 'capivara', x: 36.0, y: 55.8, calma: true,
      interacao: {
        distancia: 1.45, speaker: 'CAPIVARA DA FONTE TERMAL',
        dialogue: ['ELA DESCANSA JUNTO À ÁGUA MORNA, COMPLETAMENTE TRANQUILA COM SUA PRESENÇA.'],
        porArquetipo: {
          lamina_dominio_anciao: 'DOMÍNIO ANCIÃO: NEM MESMO A AURA DA LÂMINA A ASSUSTA NESTE REFÚGIO.',
          nucleo_dez_forma: 'NÚCLEO 10X: BATIMENTO CALMO E CONSTANTE; UM PONTO FIXO NO MEIO DA EXPEDIÇÃO.',
        },
      },
    },
  ],

  objects: [
    // ---- Núcleo da Estação 66.6 (coordenadas preservadas para compatibilidade integral) ----
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
    {
      id: 'porta_estacao_666_visual', tipo: 'decoracao', x: 26.0, y: 15.0, sprite: 'enseada3_estacao_666',
      // Entrada inspirada na referência: porta pequena dentro de um bloco de pedra
      // alto e gramado. A caixa de fundação antiga é mantida para preservar o acesso.
      useCrop: true, larguraPx: 380, pivotX: 0.5, pivotY: 0.96, depthOffset: -2, bloqueia: true,
      hitbox: { offsetX: -4.65, offsetY: -1.4, width: 3.8, height: 2.95 },
    },
    { id: 'baliza_666_receptor', tipo: 'decoracao', x: 25.9, y: 17.2, sprite: 'freq666_baliza', useCrop: true, larguraPx: 24, pivotX: 0.5, pivotY: 0.98, bloqueia: false },
    { id: 'baliza_666_entrada', tipo: 'decoracao', x: 28.3, y: 14.8, sprite: 'freq666_baliza', useCrop: true, larguraPx: 24, pivotX: 0.5, pivotY: 0.98, bloqueia: false },

    // ---- Calçadas contínuas segundo o desenho da referência ----
    // Eixo do pórtico oeste até a praça central; ramais curtos para o
    // acampamento e a Estação, depois a trilha sul segue à piscina, rede e cais.
    ...[[17.8, 52.0], [18.8, 51.4], [19.8, 50.8], [20.7, 50.2], [21.7, 49.7], [22.7, 49.1], [23.7, 48.5], [24.9, 48.2], [26.1, 47.8], [27.0, 47.7], [27.9, 47.6], [28.9, 47.5], [29.8, 47.4], [30.8, 47.3], [31.7, 47.2], [32.6, 47.4], [33.5, 47.6], [34.5, 47.8], [35.6, 48.2], [36.7, 48.7], [36.0, 47.8], [35.3, 47.0], [34.7, 46.2], [34.0, 45.3], [33.4, 44.5], [33.1, 43.5], [32.8, 42.6], [32.4, 41.7], [32.1, 40.7], [32.0, 39.6], [31.9, 38.4], [31.8, 37.3], [32.1, 36.0], [32.4, 34.8], [32.9, 33.1]].map(([tx, ty], i) => ({
      id: `trilha_pedras_${i + 1}`,
      tipo: 'decoracao',
      x: tx,
      y: ty,
      sprite: 'enseada_trilha_pedras',
      useCrop: true,
      larguraPx: 44,
      pivotX: 0.5,
      pivotY: 0.55,
      depthOffset: -3,
      bloqueia: false,
    })),

    // ---- NÚCLEO 1 (Oeste): Pórtico da Trilha & Acampamento dos Exploradores ----
    {
      id: 'portico_trilha_praia', nome: 'PÓRTICO DA TRILHA', tipo: 'decoracao', x: 16.5, y: 52.0,
      sprite: 'enseada3_portico_oeste', spriteB: 'enseada3_portico_oeste', animPeriodo: 0.54,
      useCrop: true, larguraPx: 190, pivotX: 0.5, pivotY: 0.98,
      bloqueia: false, oscilaBrisa: true, brilho: { cor: '#ffb86b', raio: 1.0, forca: 0.16 },
    },
    {
      id: 'bandeirola_vento_enseada', nome: 'BIRUTA DA EXPEDIÇÃO', tipo: 'decoracao', x: 17.9, y: 24.0,
      sprite: 'enseada_bandeirola_vento', spriteB: 'enseada_bandeirola_vento_b', animPeriodo: 0.48,
      useCrop: true, larguraPx: 62, pivotX: 0.5, pivotY: 0.94,
      bloqueia: false, oscilaBrisa: true,
    },
    {
      id: 'carrilhao_vento_enseada', nome: 'CARRILHÃO DE VENTO', tipo: 'decoracao', x: 16.2, y: 40.4,
      sprite: 'enseada_carrilhao_vento', spriteB: 'enseada_carrilhao_vento_b', animPeriodo: 0.58,
      useCrop: true, larguraPx: 78, pivotX: 0.5, pivotY: 0.96,
      bloqueia: false, oscilaBrisa: true,
      interacao: { label: 'OUVIR O CARRILHÃO', distancia: 1.55 },
    },
    {
      id: 'acampamento_vigilia_enseada', nome: 'ACAMPAMENTO DE VIGÍLIA', tipo: 'decoracao', x: 19.9, y: 34.8,
      sprite: 'enseada4_fogueira', spriteB: 'enseada4_fogueira', animPeriodo: 0.42,
      useCrop: true, larguraPx: 116, pivotX: 0.5, pivotY: 0.98,
      bloqueia: true, hitbox: { offsetX: -0.30, offsetY: -0.24, width: 0.60, height: 0.48 },
      fogueiraViva: true, brilho: { cor: '#ffae52', raio: 1.25, forca: 0.28 },
      interacao: { label: 'DESCANSAR NA FOGUEIRA', distancia: 1.6 },
    },
    {
      id: 'tenda_expedicao_enseada', nome: 'TENDA DA EXPEDIÇÃO', tipo: 'decoracao', x: 19.5, y: 29.6,
      sprite: 'enseada4_tenda', useCrop: true, larguraPx: 154,
      pivotX: 0.5, pivotY: 0.98, depthOffset: -0.2,
      bloqueia: true, hitbox: { offsetX: -0.48, offsetY: -0.34, width: 0.96, height: 0.68 },
      interacao: { label: 'INSPECIONAR TENDA DA EXPEDIÇÃO', distancia: 1.6, speaker: 'TENDA DA EXPEDIÇÃO',
        dialogue: ['A LONA GUARDA MAPAS, ROLOS DE CORDA E UM COBERTOR DOBRADO. A EXPEDIÇÃO ESTÁ EM PLENA ATIVIDADE.'] },
    },
    {
      id: 'maleta_expedicao_enseada', nome: 'MALETA DA EXPEDIÇÃO', tipo: 'dispositivo', x: 23.5, y: 31.2,
      sprite: 'enseada4_caixas', spriteB: 'enseada4_caixas', animPeriodo: 0.56,
      useCrop: true, larguraPx: 108, pivotX: 0.5, pivotY: 0.98,
      bloqueia: true, hitbox: { offsetX: -0.38, offsetY: -0.32, width: 0.76, height: 0.64 },
      pulsoAntena: true, brilho: { cor: '#ff9a5c', raio: 1.0, forca: 0.22 },
      interacao: { label: 'ABRIR MALETA DA EXPEDIÇÃO', distancia: 1.55 },
    },
    {
      id: 'algas_douradas_enseada', nome: 'BANCO DE ALGAS DOURADAS', tipo: 'decoracao', x: 38.7, y: 28.2,
      sprite: 'enseada_algas_douradas', spriteB: 'enseada_algas_douradas_b', animPeriodo: 0.62,
      useCrop: true, larguraPx: 78, pivotX: 0.5, pivotY: 0.92,
      bloqueia: false, oscilaBrisa: true, pulsoBiolum: '#ffd86b', brilho: { cor: '#ffd86b', raio: 1.0, forca: 0.24 },
      interacao: { label: 'COLHER ESSÊNCIA DE ALGAS DOURADAS', distancia: 1.55 },
    },
    {
      id: 'placa_trilha_enseada', nome: 'PLACA DAS TRILHAS', tipo: 'decoracao', x: 27.0, y: 44.6,
      sprite: 'enseada4_placa', useCrop: true, larguraPx: 74,
      pivotX: 0.5, pivotY: 0.98, depthOffset: 0.1,
      bloqueia: true, hitbox: { offsetX: -0.20, offsetY: -0.20, width: 0.40, height: 0.40 },
      interacao: { label: 'LER A PLACA DAS TRILHAS', distancia: 1.5, speaker: 'PLACA DAS TRILHAS',
        dialogue: ['O CAMINHO DO OESTE LEVA À PRAIA. AO NORTE FICA A ESTAÇÃO; AO SUL, A PISCINA E A GRUTA.'] },
    },

    // ---- NÚCLEO 2 (Norte): Complexo Científico da Estação 66.6 ----
    {
      id: 'relogio_mare_enseada', nome: 'RELÓGIO DE MARÉ SOLAR', tipo: 'dispositivo', x: 11.3, y: 35.9,
      sprite: 'enseada4_relogio', spriteB: 'enseada4_relogio', animPeriodo: 0.6,
      useCrop: true, larguraPx: 88, pivotX: 0.5, pivotY: 0.98,
      bloqueia: true, hitbox: { offsetX: -0.22, offsetY: -0.22, width: 0.44, height: 0.44 },
      brilho: { cor: '#ffd980', raio: 1.15, forca: 0.25 },
      interacao: { label: 'SINTONIZAR CLIMA E MARÉ', distancia: 1.55 },
    },
    {
      id: 'torre_antena_enseada', nome: 'TORRE-ANTENA DE ESCUTA', tipo: 'dispositivo', x: 13.7, y: 29.8,
      sprite: 'enseada4_torre_vigilia', spriteB: 'enseada4_torre_vigilia', animPeriodo: 0.5,
      useCrop: true, larguraPx: 116, pivotX: 0.5, pivotY: 0.98,
      bloqueia: true, hitbox: { offsetX: -0.30, offsetY: -0.28, width: 0.6, height: 0.56 },
      pulsoAntena: true, brilho: { cor: '#ff7e71', raio: 0.9, forca: 0.2 },
      interacao: { label: 'SINTONIZAR TORRE-ANTENA', distancia: 1.55 },
    },
    {
      id: 'bancada_campo_enseada', nome: 'BANCADA DE CAMPO', tipo: 'dispositivo', x: 16.0, y: 35.8,
      sprite: 'enseada_bancada_campo', spriteB: 'enseada_bancada_campo_b', animPeriodo: 0.58,
      useCrop: true, larguraPx: 134, pivotX: 0.5, pivotY: 0.98,
      bloqueia: true, hitbox: { offsetX: -0.58, offsetY: -0.38, width: 1.16, height: 0.76 },
      brilho: { cor: '#74ff8a', raio: 1.2, forca: 0.26 },
      interacao: { label: 'CALIBRAR MÓDULO NA BANCADA', distancia: 1.55 },
    },

    // ---- NÚCLEO 3 (Centro): Praça Livre de Treino & Marcos Antigos ----
    {
      id: 'totem_eco_enseada', nome: 'MONÓLITO DE ECO', tipo: 'decoracao', x: 32.8, y: 31.9,
      sprite: 'enseada3_monolito', spriteB: 'enseada3_monolito', animPeriodo: 0.52,
      useCrop: true, larguraPx: 180, pivotX: 0.5, pivotY: 0.98,
      bloqueia: false, pulsoTotem: true, brilho: { cor: '#52f6ff', raio: 1.4, forca: 0.32 },
      interacao: { label: 'EXAMINAR MONÓLITO DE ECO', distancia: 1.5 },
    },
    {
      id: 'estela_navegadores_enseada', nome: 'ESTELA DOS NAVEGADORES', tipo: 'decoracao', x: 32.8, y: 35.7,
      sprite: 'enseada_estela_navegadores', spriteB: 'enseada_estela_navegadores_b', animPeriodo: 0.62,
      useCrop: true, larguraPx: 92, pivotX: 0.5, pivotY: 0.92,
      bloqueia: false, pulsoBiolum: '#6cf7ff', brilho: { cor: '#6cf7ff', raio: 1.35, forca: 0.3 },
      interacao: { label: 'DECIFRAR A ESTELA DOS NAVEGADORES', distancia: 1.6 },
    },

    // ---- NÚCLEO 4 (Sudoeste / Sul): Santuário dos Arquétipos & Refúgio Termal ----
    {
      id: 'espelho_arquetipos_enseada', nome: 'ESPELHO DE RESSONÂNCIA', tipo: 'dispositivo', x: 38.0, y: 50.1,
      sprite: 'enseada_espelho_arquetipo', spriteB: 'enseada_espelho_arquetipo_b', animPeriodo: 0.56,
      useCrop: true, larguraPx: 90, pivotX: 0.5, pivotY: 0.95,
      bloqueia: false, brilho: { cor: '#6ff7ff', raio: 1.5, forca: 0.34 },
      interacao: { label: 'SINTONIZAR ARQUÉTIPO', distancia: 1.65 },
    },
    {
      id: 'jardim_pedras_enseada', nome: 'PEDRAS DO EQUILÍBRIO', tipo: 'decoracao', x: 37.0, y: 30.2,
      sprite: 'enseada4_cairn', spriteB: 'enseada4_cairn', animPeriodo: 0.64,
      useCrop: true, larguraPx: 98, pivotX: 0.5, pivotY: 0.98,
      bloqueia: true, hitbox: { offsetX: -0.30, offsetY: -0.24, width: 0.60, height: 0.48 },
      oscilaBrisa: true,
      interacao: { label: 'MEDITAR NAS PEDRAS DO EQUILÍBRIO', distancia: 1.55 },
    },
    {
      id: 'piscina_mare_viva_enseada', nome: 'PISCINA DE MARÉ VIVA', tipo: 'decoracao', x: 31.9, y: 53.5,
      sprite: 'enseada3_piscina', spriteB: 'enseada3_piscina', animPeriodo: 0.64,
      useCrop: true, larguraPx: 260, pivotX: 0.5, pivotY: 0.92,
      bloqueia: false, pulsoBiolum: '#5cf7eb', brilho: { cor: '#5cf7eb', raio: 1.25, forca: 0.26 },
      interacao: { label: 'MERGULHAR AS MÃOS NA MARÉ VIVA', distancia: 1.65 },
    },
    {
      id: 'fonte_termal_enseada', nome: 'FONTE TERMAL DA ENSEADA', tipo: 'decoracao', x: 36.1, y: 56.7,
      sprite: 'enseada_fonte_termal', spriteB: 'enseada_fonte_termal_b', animPeriodo: 0.58,
      useCrop: true, larguraPx: 112, pivotX: 0.5, pivotY: 0.9,
      bloqueia: false, vaporTermal: true, brilho: { cor: '#7efce0', raio: 1.4, forca: 0.28 },
      interacao: { label: 'DESCANSAR NA FONTE TERMAL', distancia: 1.7 },
    },
    {
      id: 'borboletas_fonte_enseada', nome: 'BORBOLETAS DA FONTE', tipo: 'decoracao', x: 34.6, y: 29.5,
      sprite: 'enseada_borboletas_vivas', spriteB: 'enseada_borboletas_vivas_b', animPeriodo: 0.34,
      useCrop: true, larguraPx: 54, pivotX: 0.5, pivotY: 0.5,
      bloqueia: false, flutuacaoSuave: true, nadoCardume: true,
    },
    {
      id: 'banco_conchas_enseada', nome: 'BANCO DE CONCHAS', tipo: 'decoracao', x: 40.3, y: 44.5,
      sprite: 'enseada_banco_conchas', spriteB: 'enseada_banco_conchas_b', animPeriodo: 0.68,
      useCrop: true, larguraPx: 78, pivotX: 0.5, pivotY: 0.88,
      bloqueia: false,
      interacao: { label: 'EXAMINAR CONCHAS & ESTRELAS', distancia: 1.5 },
    },
    {
      id: 'gruta_concha_enseada', nome: 'FENDA DA MARÉ', tipo: 'decoracao', x: 32.9, y: 47.7,
      sprite: 'enseada4_gruta', spriteB: 'enseada4_gruta', animPeriodo: 0.66,
      useCrop: true, larguraPx: 148, pivotX: 0.5, pivotY: 0.98,
      bloqueia: true, hitboxes: [
        { offsetX: -0.82, offsetY: -0.28, width: 0.62, height: 0.62 },
        { offsetX: 0.20, offsetY: -0.28, width: 0.62, height: 0.62 },
      ], pulsoBiolum: '#54ccff', brilho: { cor: '#54ccff', raio: 1.3, forca: 0.28 },
      interacao: { label: 'ABRIGAR-SE NA FENDA DA MARÉ', distancia: 1.7 },
    },
    {
      id: 'poleiro_aves_enseada', nome: 'POLEIRO DAS AVES', tipo: 'decoracao', x: 49.0, y: 27.6,
      sprite: 'enseada_poleiro_aves', spriteB: 'enseada_poleiro_aves_b', animPeriodo: 0.56,
      useCrop: true, larguraPx: 80, pivotX: 0.5, pivotY: 0.94,
      bloqueia: false,
      interacao: { label: 'OBSERVAR O POLEIRO', distancia: 1.5 },
    },
    {
      id: 'rede_treino_praia_enseada', nome: 'REDE DE TREINO DA PRAIA', tipo: 'decoracao', x: 47.1, y: 53.2,
      sprite: 'enseada4_rede', useCrop: true, larguraPx: 186,
      pivotX: 0.5, pivotY: 0.98, depthOffset: 0.2,
      bloqueia: true, hitboxes: [
        { offsetX: -1.28, offsetY: -0.24, width: 0.30, height: 0.48 },
        { offsetX: 0.98, offsetY: -0.24, width: 0.30, height: 0.48 },
      ],
      interacao: { label: 'PRATICAR NA REDE DA PRAIA', distancia: 1.8, speaker: 'REDE DE TREINO',
        dialogue: ['A REDE MARCA UM ESPAÇO LIVRE PARA TREINAR. A AREIA AO REDOR ESTÁ FIRME E SEM OBSTÁCULOS.'] },
    },

    // ---- NÚCLEO 5 (Península Sudeste): Lúmeo, Deriva, Ostras, Recife & Ninho ----
    {
      id: 'captador_ecos_enseada', nome: 'CAPTADOR DE ECOS', tipo: 'dispositivo', x: 53.5, y: 24.3,
      sprite: 'enseada_rede_cristal', spriteB: 'enseada_rede_cristal_b', animPeriodo: 0.6,
      useCrop: true, larguraPx: 96, pivotX: 0.5, pivotY: 0.92,
      bloqueia: false, pulsoAntena: true, brilho: { cor: '#5cf7eb', raio: 1.3, forca: 0.28 },
      interacao: { label: 'SINTONIZAR CAPTADOR DE ECOS', distancia: 1.65 },
    },
    {
      id: 'santuario_lumeo_enseada', nome: 'SANTUÁRIO DE LÚMEO', tipo: 'decoracao', x: 40.3, y: 16.3,
      sprite: 'enseada_santuario_lumeo', spriteB: 'enseada_santuario_lumeo_b', animPeriodo: 0.58,
      useCrop: true, larguraPx: 90, pivotX: 0.5, pivotY: 0.92,
      bloqueia: false, pulsoBiolum: '#70f3ff', brilho: { cor: '#70f3ff', raio: 1.35, forca: 0.32 },
      interacao: { label: 'EXAMINAR SANTUÁRIO DE LÚMEO', distancia: 1.55 },
    },
    {
      id: 'borboletas_jardim_enseada', nome: 'BORBOLETAS DO SANTUÁRIO', tipo: 'decoracao', x: 39.1, y: 16.5,
      sprite: 'enseada_borboletas_vivas', spriteB: 'enseada_borboletas_vivas_b', animPeriodo: 0.36,
      useCrop: true, larguraPx: 50, pivotX: 0.5, pivotY: 0.5,
      bloqueia: false, flutuacaoSuave: true, nadoCardume: true,
    },
    {
      id: 'bau_deriva_enseada', nome: 'ARCAZ À DERIVA', tipo: 'decoracao', x: 52.4, y: 36.0,
      sprite: 'enseada_bau_deriva', spriteB: 'enseada_bau_deriva_b', animPeriodo: 0.56,
      useCrop: true, larguraPx: 74, pivotX: 0.5, pivotY: 0.9,
      bloqueia: false, pulsoBiolum: '#5cf7eb', brilho: { cor: '#5cf7eb', raio: 1.15, forca: 0.26 },
      interacao: { label: 'ABRIR O ARCAZ À DERIVA', distancia: 1.55 },
    },
    {
      id: 'banco_ostras_enseada', nome: 'BANCO DE OSTRAS PÉROLA', tipo: 'decoracao', x: 50.7, y: 32.8,
      sprite: 'enseada_banco_ostras', spriteB: 'enseada_banco_ostras_b', animPeriodo: 0.64,
      useCrop: true, larguraPx: 78, pivotX: 0.5, pivotY: 0.9,
      bloqueia: false, brilho: { cor: '#70f3ff', raio: 1.0, forca: 0.24 },
      interacao: { label: 'COLHER PÉROLA DA ENSEADA', distancia: 1.65 },
    },
    {
      id: 'coral_luminescente_enseada', nome: 'RECIFE LUMINESCENTE', tipo: 'decoracao', x: 50.5, y: 25.0,
      sprite: 'enseada_coral_azul', spriteB: 'enseada_coral_azul_b', animPeriodo: 0.62,
      useCrop: true, larguraPx: 86, pivotX: 0.5, pivotY: 0.92,
      bloqueia: false, pulsoBiolum: '#44e8ff', brilho: { cor: '#44e8ff', raio: 1.35, forca: 0.34 },
      interacao: { label: 'COLHER AMOSTRA DE CORAL', distancia: 1.6 },
    },
    {
      id: 'ninho_tartarugas_enseada', nome: 'NINHO DE TARTARUGAS', tipo: 'decoracao', x: 55.9, y: 30.7,
      sprite: 'enseada_ninho_tartarugas', spriteB: 'enseada_ninho_tartarugas_b', animPeriodo: 0.68,
      useCrop: true, larguraPx: 86, pivotX: 0.5, pivotY: 0.9,
      bloqueia: false,
      interacao: { label: 'PROTEGER O NINHO', distancia: 1.6 },
    },

    // ---- NÚCLEO 6 (Baía Leste): Farolete, Embarcadouro, Cais Sul, Barco & Portais ----
    {
      id: 'farolete_baia_enseada', nome: 'FAROLETE DA BAÍA', tipo: 'decoracao', x: 54.2, y: 20.6,
      sprite: 'enseada_farolete_baia', spriteB: 'enseada_farolete_baia_b', animPeriodo: 0.65,
      useCrop: true, larguraPx: 86, pivotX: 0.5, pivotY: 0.96,
      bloqueia: false, feixeFarolete: true, brilho: { cor: '#5cf7eb', raio: 1.8, forca: 0.4 },
      interacao: { label: 'OBSERVAR DO FAROLETE', distancia: 1.65 },
    },
    {
      id: 'embarcadouro_mare_astral', nome: 'EMBARCADOURO DA MARÉ', tipo: 'decoracao', x: 54.4, y: 41.2,
      sprite: 'enseada_embarcadouro_mare', spriteB: 'enseada_embarcadouro_mare_b', animPeriodo: 0.62,
      useCrop: true, larguraPx: 124, pivotX: 0.5, pivotY: 0.88,
      bloqueia: false, brilho: { cor: '#5cf7eb', raio: 1.35, forca: 0.3 },
      interacao: { label: 'EXAMINAR O CAIS DA MARÉ', distancia: 1.75 },
    },
    {
      id: 'portal_caminho_correntes', nome: 'PORTAL DAS CORRENTES', tipo: 'decoracao', x: 35.1, y: 2.8,
      sprite: 'enseada_portal_correntes', spriteB: 'enseada_portal_correntes_b', animPeriodo: 0.48,
      useCrop: true, larguraPx: 112, pivotX: 0.5, pivotY: 0.94,
      bloqueia: false, brilho: { cor: '#5cf7eb', raio: 1.5, forca: 0.34 },
    },
    {
      id: 'cais_madeira_pesca_enseada', nome: 'CAIS DA ENSEADA', tipo: 'decoracao', x: 54.1, y: 46.3,
      sprite: 'enseada3_cais_barco', spriteB: 'enseada3_cais_barco', animPeriodo: 0.68,
      useCrop: true, larguraPx: 420, pivotX: 0.5, pivotY: 0.97,
      bloqueia: false, brilho: { cor: '#ffd980', raio: 1.0, forca: 0.16 },
      interacao: { label: 'OBSERVAR A BAÍA DO CAIS', distancia: 1.75 },
    },
    {
      id: 'barco_expedicao_enseada', nome: 'BARCO DE EXPEDIÇÃO', tipo: 'decoracao', x: 58.0, y: 41.3,
      sprite: 'enseada_barco_expedicao', spriteB: 'enseada_barco_expedicao_b', animPeriodo: 0.72,
      useCrop: true, larguraPx: 126, pivotX: 0.5, pivotY: 0.88,
      bloqueia: false, flutuacaoSuave: true, renderizar: false,
      interacao: { label: 'INSPECIONAR BARCO DE EXPEDIÇÃO', distancia: 2.15 },
    },

    // ---- Cardumes em Água Profunda & Sinalização Marítima do Conduto ----
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
      id: 'baliza_mare_boia_1', nome: 'BOIA DE MARÉ', tipo: 'decoracao', x: 29.9, y: 2.7,
      sprite: 'enseada_baliza_boia', spriteB: 'enseada_baliza_boia_b', animPeriodo: 0.6,
      useCrop: true, larguraPx: 50, pivotX: 0.5, pivotY: 0.9,
      bloqueia: false, flutuacaoSuave: true, brilho: { cor: '#5cf7eb', raio: 1.3, forca: 0.3 },
    },
    {
      id: 'baliza_mare_boia_2', nome: 'BOIA DE MARÉ', tipo: 'decoracao', x: 41.0, y: 1.8,
      sprite: 'enseada_baliza_boia', spriteB: 'enseada_baliza_boia_b', animPeriodo: 0.6,
      useCrop: true, larguraPx: 50, pivotX: 0.5, pivotY: 0.9,
      bloqueia: false, flutuacaoSuave: true, brilho: { cor: '#5cf7eb', raio: 1.3, forca: 0.3 },
    },
    {
      id: 'lanterna_marinha_norte', nome: 'LANTERNA MARÍTIMA', tipo: 'decoracao', x: 31.3, y: 6.5,
      sprite: 'enseada_lanterna_marinha', spriteB: 'enseada_lanterna_marinha_b', animPeriodo: 0.64,
      useCrop: true, larguraPx: 56, pivotX: 0.5, pivotY: 0.9,
      bloqueia: false, flutuacaoSuave: true, brilho: { cor: '#6ff7ff', raio: 1.5, forca: 0.38 },
    },
    {
      id: 'lanterna_marinha_sul', nome: 'LANTERNA MARÍTIMA', tipo: 'decoracao', x: 61.7, y: 22.4,
      sprite: 'enseada_lanterna_marinha', spriteB: 'enseada_lanterna_marinha_b', animPeriodo: 0.64,
      useCrop: true, larguraPx: 56, pivotX: 0.5, pivotY: 0.9,
      bloqueia: false, flutuacaoSuave: true, brilho: { cor: '#6ff7ff', raio: 1.5, forca: 0.38 },
    },

    // ---- Relevo Costeiro Encaixado na Borda Norte & Ancoragem do Conduto ----
    relevo('enseada_falesia_norte', 'falesia-selva', 15.1, 25.2, 260, { espelhar: true }),
    {
      id: 'enseada_macico_leste', tipo: 'decoracao', x: 21.8, y: 16.0,
      sprite: 'enseada3_platao_cascata', spriteB: 'enseada3_platao_cascata_b', animPeriodo: 0.7,
      useCrop: true, larguraPx: 760, pivotX: 0.5, pivotY: 0.98, depthOffset: -2,
      bloqueia: false, brilho: { cor: '#45f4f4', raio: 2.2, forca: 0.16 },
    },
    relevo('enseada_pilar_noroeste', 'pilar-palmeiras-a', 9.6, 35.7, 130),
    relevo('enseada_rochas_mar_1', 'rochas-mar', 57.1, 22.0, 54, { espuma: 26, espumaY: -3 }),
    relevo('enseada_rochas_mar_2', 'rochas-mar', 57.6, 29.6, 54, { espelhar: true, espuma: 26, espumaY: -3 }),
    relevo('enseada_rochas_mar_3', 'rochas-mar', 50.7, 55.9, 56, { espuma: 28, espumaY: -3 }),
    // Rochedos baixos ancoram o portal do recife no mar aberto do quadrante norte.
    floraDecor('costa', 'ilhota_musgo', 'enseada_recife_conduto_a', 45.7, 15.9, 1.05, { depthOffset: -2 }),
    floraDecor('costa', 'rochas_espuma', 'enseada_recife_conduto_b', 47.4, 12.9, 0.95, { depthOffset: -2 }),

    // ---- Bosquetes & Flora Ancorando Cada Núcleo (sem cobrir objetos nem caminhos) ----
    { id: 'enseada_pedra_leste', tipo: 'decoracao', x: 34.0, y: 11.0, sprite: 'costa_rochosa', frame: { col: 1, row: 0 }, useCrop: true, larguraPx: 98, pivotY: 1, bloqueia: false },
    { id: 'enseada_pedra_sul', tipo: 'decoracao', x: 44.0, y: 60.0, sprite: 'costa_rochosa', frame: { col: 2, row: 0 }, useCrop: true, larguraPx: 72, pivotY: 1, bloqueia: false },

    // Bosquete ocidental enquadra o pórtico e o acampamento sem tampar a passagem.
    tropical('enseada_vegetacao_1', 15.6, 47.3, 3, 94, true),
    tropical('enseada_palmeira_1', 20.3, 51.3, 2, 78),
    tropical('enseada_folhas_1', 18.7, 49.4, 0, 44),
    floraDecor('veg', 'samambaia_clara', 'enseada_flora_1', 17.0, 48.4, 0.85),

    // Bosquete norte e jardim dos arquétipos
    tropical('enseada_vegetacao_2', 12.8, 20.1, 2, 74, true),
    tropical('enseada_vegetacao_3', 18.5, 8.3, 5, 88, true),
    tropical('enseada_palmeira_2', 12.4, 18.5, 2, 74),
    tropical('enseada_folhas_2', 13.1, 21.7, 1, 44),
    tropical('enseada_folhas_3', 13.7, 12.3, 0, 44),
    floraDecor('veg', 'bromelia_grande', 'enseada_flora_3', 20.3, 41.3, 0.85, { depthOffset: -1 }),
    floraDecor('veg', 'flores_roxas', 'enseada_flora_2', 20.9, 41.3, 0.85, { depthOffset: -1 }),

    // Orla sul, lagoa sudeste e extremidade leste
    tropical('enseada_vegetacao_4', 27.1, 29.5, 4, 84, true),
    tropical('enseada_vegetacao_5', 28.4, 53.8, 2, 74, true),
    tropical('enseada_vegetacao_6', 34.6, 43.2, 3, 86, true),
    tropical('enseada_palmeira_3', 28.5, 28.7, 2, 78),
    tropical('enseada_folhas_4', 27.1, 52.0, 0, 42),
    tropical('enseada_folhas_5', 33.7, 41.0, 1, 42),
    floraDecor('veg', 'monstera', 'enseada_flora_4', 29.6, 29.8, 0.85),
    floraDecor('veg', 'flores_azuis', 'enseada_flora_5', 19.5, 49.0, 0.85),
    floraDecor('costa', 'bromelia_gigante', 'enseada_flora_6', 34.0, 15.1, 0.85),
    floraDecor('costa', 'ilhota_musgo', 'enseada_ilhota_1', 11.5, 48.8, 0.85),
    floraDecor('costa', 'rochas_espuma', 'enseada_ilhota_2', 35.7, 13.4, 0.85),

    // Elementos de escala e silhueta fiéis ao mapa master (lote de arte 3.0).
    {
      id: 'enseada3_praca_monolito', tipo: 'decoracao', x: 34.5, y: 33.6,
      sprite: 'enseada3_calcada', useCrop: true, larguraPx: 310,
      pivotX: 0.5, pivotY: 0.92, depthOffset: -1, bloqueia: false,
    },
    {
      id: 'enseada3_mata_oeste_a', tipo: 'decoracao', x: 16.5, y: 43.8,
      sprite: 'enseada3_palmeiral', useCrop: true, larguraPx: 430,
      pivotX: 0.5, pivotY: 0.96, depthOffset: -0.6, bloqueia: false,
    },
    {
      id: 'enseada3_mata_oeste_b', tipo: 'decoracao', x: 25.1, y: 55.2,
      sprite: 'enseada3_palmeiral', useCrop: true, larguraPx: 460,
      pivotX: 0.5, pivotY: 0.96, depthOffset: -0.4, bloqueia: false,
    },
    {
      id: 'enseada3_mata_sul', tipo: 'decoracao', x: 41.5, y: 42.6,
      sprite: 'enseada3_palmeiral', useCrop: true, larguraPx: 430,
      pivotX: 0.5, pivotY: 0.96, depthOffset: -0.4, bloqueia: false,
    },
    {
      id: 'enseada3_mata_leste', tipo: 'decoracao', x: 41.5, y: 18.8,
      sprite: 'enseada3_palmeiral', useCrop: true, larguraPx: 410,
      pivotX: 0.5, pivotY: 0.96, depthOffset: -0.4, bloqueia: false,
    },

    // Dossel tropical e afloramentos do lado leste: a referência tem uma
    // faixa verde contínua, que enquadra o santuário e termina no recife.
    ...[
      ['enseada3_mata_centro_oeste', 25.3, 31.3, 380],
      ['enseada3_mata_centro_leste', 39.2, 23.7, 410],
      ['enseada3_mata_sudoeste', 29.0, 56.3, 390],
      ['enseada3_mata_recife', 47.1, 23.2, 390],
    ].map(([id, x, y, larguraPx]) => ({
      id, tipo: 'decoracao', x, y, sprite: 'enseada3_palmeiral',
      useCrop: true, larguraPx, pivotX: 0.5, pivotY: 0.96,
      depthOffset: -0.35, bloqueia: false,
    })),
    floraDecor('costa', 'rochedo_grande', 'enseada_rochedo_recife_1', 51.5, 18.5, 1.0),
    floraDecor('costa', 'rochedo_palmeira', 'enseada_rochedo_recife_2', 56.8, 20.4, 0.95),
    floraDecor('costa', 'rochedo_bloco', 'enseada_rochedo_recife_3', 57.5, 26.5, 0.9),
    tropical('enseada_ruinas', 43.4, 24.5, 6, 58),
    tropical('enseada_rochas', 50.6, 22.3, 7, 52),
    prop('enseada_arbusto_1', 39.5, 57.1, 3, 0, 44),
    prop('enseada_concha', 42.4, 44.8, 1, 3, 36),

    {
      id: 'arco_conduto_retorno_mare', tipo: 'decoracao', x: 49.2, y: 17.4,
      sprite: 'enseada3_portal_recife', spriteB: 'enseada3_portal_recife', animPeriodo: 0.7,
      useCrop: true, larguraPx: 190, pivotX: 0.5, pivotY: 0.98,
      bloqueia: false, brilho: { cor: '#5cf7eb', raio: 2.2, forca: 0.44 },
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
      id: 'acesso_estacao_666', tipo: 'door', x: 27.0, y: 16.0, label: 'ENTRAR NA ESTAÇÃO 66.6',
      requiresFlag: 'frequencia666Registrada', lockedLabel: 'ESTAÇÃO DE ESCUTA // SEM SINAL',
      mensagemBloqueado: ['A PORTA AGUARDA UMA ASSINATURA. INVESTIGUE O TERMINAL DE MANUTENÇÃO COM [R].'],
      interactionDistance: 1.2, destino: { mapId: 'estacao_limiar_666', spawnId: 'vindo_da_enseada' }, transition: 'fade',
    },
    {
      id: 'rota_correntes', tipo: 'door', x: 36.0, y: 3.0, label: 'NAVEGAR: CAMINHO DAS CORRENTES',
      interactionDistance: 1.4, destino: { mapId: 'mar_caminho_das_correntes', spawnId: 'vindo_da_enseada' }, transition: 'fade',
    },
    {
      id: 'retorno_darsena_mare', tipo: 'door', x: 50.0, y: 18.0, automaticoNado: true, raioAutomatico: 0.8,
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
