// Enseada dos Ecos 2.0 — ilha costeira viva (36x34)
// Preserva todas as conexões principais (Praia Inicial, Estação 66.6,
// Caminho das Correntes e Conduto da Maré Astral) com fauna interativa,
// clima sintonizável, espelho de arquétipos, relevo costeiro e oceano vivo.
import { buildGround } from '../../ground.js';
import { relevo } from '../../relevo-praia.js';
import { flora } from '../../flora-praia.js';

const COLS = 36;
const ROWS = 34;

function hash(x, y, seed = 0) {
  let h = Math.imul(x + seed * 131, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const ehTerra = c => c !== undefined && 'SMT'.includes(c);

const landShape = (x, y) => {
  // Corpo orgânico principal + suavização costeira
  const dMain = ((x - 15.2) / 10.8) ** 2 + ((y - 16.0) / 9.4) ** 2;
  const dSul = ((x - 16.5) / 8.5) ** 2 + ((y - 21.5) / 4.2) ** 2;
  const noise = (hash(x, y, 7) - 0.5) * 0.22;
  let inside = Math.min(dMain, dSul) + noise < 1.0;

  // Baía aberta a leste para o Conduto Abissal e Lanternas Marítimas
  if (x >= 26 && y >= 10 && y <= 19) {
    if (!(x === 25 && y === 15)) inside = false;
  }
  // Língua oeste da chegada da Praia Inicial (5..7, 14..16)
  if (x >= 5 && x <= 7 && y >= 14 && y <= 16) inside = true;
  // Ponta de embarque para Caminho das Correntes (24..25, 15)
  if (x >= 23 && x <= 25 && y === 15) inside = true;
  // Acesso firme à Estação 66.6 e Terminal
  if (x >= 11 && x <= 20 && y >= 10 && y <= 15) inside = true;
  // Garantir terra firme para Ninho, Fonte Termal, Poleiro, Relógio e Espelho
  if (x >= 10 && x <= 13 && y >= 19 && y <= 22) inside = true;
  if (x >= 14 && x <= 17 && y >= 22 && y <= 24) inside = true;
  if (x >= 21 && x <= 24 && y >= 20 && y <= 23) inside = true;
  if (x >= 20 && x <= 22 && y >= 18 && y <= 21) inside = true;
  // Manter águas livres nas laterais oeste e sudeste para fauna aquática
  if (x <= 3 && y >= 12 && y <= 17) inside = false;
  if (x >= 28 && y >= 11 && y <= 23) inside = false;

  return inside;
};

const grid = Array.from({ length: ROWS }, () => Array(COLS).fill('W'));
for (let y = 0; y < ROWS; y++) {
  for (let x = 0; x < COLS; x++) {
    if (x >= 1 && x <= COLS - 2 && y >= 1 && y <= ROWS - 2 && landShape(x, y)) {
      grid[y][x] = 'S';
    }
  }
}

// Limpar células isoladas preservando áreas garantidas
for (let y = 1; y < ROWS - 1; y++) {
  for (let x = 1; x < COLS - 1; x++) {
    if (grid[y][x] !== 'S') continue;
    const viz = ehTerra(grid[y - 1]?.[x]) + ehTerra(grid[y + 1]?.[x]) +
      ehTerra(grid[y]?.[x - 1]) + ehTerra(grid[y]?.[x + 1]);
    if (viz < 2) grid[y][x] = 'W';
  }
}

// Reafirmar pontos obrigatórios após limpeza
for (const [x, y] of [
  [5, 15], [6, 15], [24, 15], [25, 15],
  [10, 14], [10, 15], [12, 14], [16, 13], [18, 10], [18, 13], [19, 12], [20, 19], [21, 20],
]) grid[y][x] = 'S';

// Garantir baía leste navegável até o conduto (28, 12)
for (let y = 11; y <= 14; y++) {
  for (let x = 26; x <= 30; x++) grid[y][x] = 'W';
}

const TAM_RASO = 2;
const TAM_FUNDO = 4;

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
      else if (hash(x, y, 29) < 0.03 && y > 15) grid[y][x] = 'T';
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

// Flora complementar usando os atlas costeiros oficiais, sem criar bloqueio extra.
const floraDecor = (folha, peca, id, x, y, escala = 0.9) =>
  flora(folha, peca, id, x, y, { escala, bloqueia: false });

export const map = {
  id: 'ilha_enseada_ecos',
  meta: {
    nome: 'ENSEADA DOS ECOS',
    tipo: 'exterior',
    dimensao: 'arquipelago',
    corFundo: '#025074',
    estiloPiso: 'livre',
    useBackgroundWalls: true,
    sandSprite: 'beach_novas_artes',
    ambiente: { poeira: 16, cor: '#ffd98a' },
  },
  corChao: '#e6c280',
  layout,
  walkMask: ground.walkMask,
  pisos: ground.pisos,
  aguaPraia: rows,

  spawnPoints: {
    inicio: { x: 6.5, y: 15.5 },
    vindo_da_praia: { x: 6.5, y: 15.5 },
    vindo_da_estacao_666: { x: 16.5, y: 13.5 },
    vindo_do_mar: { x: 24.5, y: 15.5 },
    vindo_da_darsena_mare: { x: 28.2, y: 12.6 },
  },

  pocas: [
    {
      id: 'poca_cascata_enseada',
      nome: 'LAGOA DA ORLA SUDESTE',
      x: 22.4, y: 20.4, rx: 1.15, ry: 0.85,
      profundidade: 0.45,
      treino: true,
    },
  ],

  ondasMar: [
    [3, 10, 1], [6, 7, 0], [11, 5, 1], [21, 5, 0], [27, 7, 1],
    [31, 13, 0], [31, 19, 1], [26, 25, 0], [17, 27, 1], [7, 24, 0], [2, 19, 1],
  ].map(([x, y, tipo]) => ({ x, y, tipo })),

  detalhesOceano: [
    [4, 9, 1], [9, 6, 2], [15, 5, 3], [24, 6, 4], [29, 10, 5],
    [31, 15, 6], [29, 22, 7], [22, 26, 8], [12, 27, 9], [5, 22, 10], [2, 15, 11],
  ].map(([x, y, fase]) => ({ x, y, fase })),

  fundoMar: [
    { x: 2.2, y: 13.4, tipo: 'coral-profundo', origem: 'oceano-vivo', tamanho: 1.0 },
    { x: 29.8, y: 11.4, tipo: 'alga-longa', origem: 'oceano-vivo', tamanho: 1.0 },
    { x: 30.6, y: 15.8, tipo: 'coral-leque', origem: 'mar-vivo', tamanho: 1.0 },
    { x: 28.6, y: 21.8, tipo: 'alga-vermelha', origem: 'oceano-vivo', tamanho: 1.0 },
    { x: 4.5, y: 21.0, tipo: 'ruina-submersa', origem: 'mar-vivo', tamanho: 1.1 },
  ],

  trainingTargets: [{ id: 'eco_treino_enseada', x: 15.0, y: 16.0, maxHealth: 60 }],

  hazards: [
    { id: 'eco_instavel_oeste', x: 9.2, y: 9.6, radius: 0.9, damage: 9, interval: 1.3 },
    { id: 'eco_instavel_leste', x: 20.6, y: 22.0, radius: 1.0, damage: 12, interval: 1.5 },
  ],

  fauna: [
    {
      id: 'enseada_caranguejo_1', species: 'caranguejo', x: 7.4, y: 16.0, calma: true,
      interacao: {
        distancia: 1.35, speaker: 'CARANGUEJO DA ORLA',
        dialogue: ['ELE MOVE AS PINÇAS NO RITMO DAS ONDAS, COMO SE MEDISSE A MARÉ.'],
        porArquetipo: {
          mare_astral: 'MARÉ ASTRAL: VOCÊ PERCEBE QUE ELE SE ENTERRA MAIS FUNDO ANTES DE VIRADAS DE RESSACA.',
          motor_bio_forja: 'BIO-FORJA: CARAPAÇA LIMPA, SEM PLÁSTICO NEM ÓLEO — SINAL DE ÁGUA SAUDÁVEL.',
        },
      },
    },
    { id: 'enseada_caranguejo_2', species: 'caranguejo', x: 23.8, y: 18.2 },
    { id: 'enseada_gaivota', species: 'gaivota', x: 15.6, y: 23.2 },
    { id: 'enseada_trinta_reis', species: 'trinta_reis', x: 22.6, y: 21.8 },
    { id: 'enseada_peixes', species: 'peixes', x: 2.2, y: 14.5 },
    { id: 'enseada_tartaruga_1', species: 'tartaruga', x: 29.4, y: 21.2 },
    { id: 'enseada_golfinho_1', species: 'golfinho', x: 31.2, y: 14.5 },
    {
      id: 'enseada_capivara', species: 'capivara', x: 13.2, y: 21.6, calma: true,
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
    // ---- Núcleo da Estação 66.6 (preservado exatamente) ----
    {
      id: 'terminal_frequencia_666', nome: 'TERMINAL DE MANUTENÇÃO', tipo: 'painel', x: 12, y: 14,
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
      id: 'porta_estacao_666_visual', tipo: 'decoracao', x: 18, y: 10, sprite: 'freq666_entrada',
      useCrop: true, larguraPx: 350, pivotX: 0.76, pivotY: 0.93, depthOffset: -2, bloqueia: true,
      hitbox: { offsetX: -4.65, offsetY: -1.4, width: 3.8, height: 2.95 },
    },
    { id: 'baliza_666_receptor', tipo: 'decoracao', x: 12, y: 13, sprite: 'freq666_baliza', useCrop: true, larguraPx: 24, pivotX: 0.5, pivotY: 0.98, bloqueia: false },
    { id: 'baliza_666_entrada', tipo: 'decoracao', x: 19, y: 11, sprite: 'freq666_baliza', useCrop: true, larguraPx: 24, pivotX: 0.5, pivotY: 0.98, bloqueia: false },

    // ---- Trilhas de Pedras Costeiras (conectam Chegada -> Praça Central -> Estação -> Refúgio -> Baía Leste) ----
    ...[
      [6.4, 15.0], [8.0, 15.0], [9.6, 15.0], [11.2, 15.0], [13.0, 15.0],
      [16.8, 15.0], [18.8, 15.0], [21.0, 15.0], [23.2, 15.0],
      [15.0, 12.8], [17.2, 12.0], [13.2, 17.2], [16.8, 18.0],
    ].map(([tx, ty], i) => ({
      id: `trilha_pedras_${i + 1}`,
      tipo: 'decoracao',
      x: tx,
      y: ty,
      sprite: 'enseada_trilha_pedras',
      useCrop: true,
      larguraPx: 74,
      pivotX: 0.5,
      pivotY: 0.55,
      depthOffset: -3,
      bloqueia: false,
    })),

    // ---- ZONA 1: Chegada Oeste & Acampamento ----
    {
      id: 'portico_trilha_praia', nome: 'PÓRTICO DA TRILHA', tipo: 'decoracao', x: 5.0, y: 15.0,
      sprite: 'enseada_portico_praia', useCrop: true, larguraPx: 118, pivotX: 0.5, pivotY: 0.94,
      bloqueia: false, brilho: { cor: '#ffb86b', raio: 1.0, forca: 0.22 },
    },
    {
      id: 'bandeirola_vento_enseada', nome: 'BIRUTA DA EXPEDIÇÃO', tipo: 'decoracao', x: 7.2, y: 13.4,
      sprite: 'enseada_bandeirola_vento', useCrop: true, larguraPx: 66, pivotX: 0.5, pivotY: 0.94,
      bloqueia: false, oscilaBrisa: true,
    },
    {
      id: 'carrilhao_vento_enseada', nome: 'CARRILHÃO DE VENTO', tipo: 'decoracao', x: 7.2, y: 11.4,
      sprite: 'enseada_carrilhao_vento', spriteB: 'enseada_carrilhao_vento_b', animPeriodo: 0.58,
      useCrop: true, larguraPx: 86, pivotX: 0.5, pivotY: 0.96,
      bloqueia: false, oscilaBrisa: true,
      interacao: { label: 'OUVIR O CARRILHÃO', distancia: 1.55 },
    },
    {
      id: 'algas_douradas_enseada', nome: 'BANCO DE ALGAS DOURADAS', tipo: 'decoracao', x: 6.4, y: 17.6,
      sprite: 'enseada_algas_douradas', spriteB: 'enseada_algas_douradas_b', animPeriodo: 0.62,
      useCrop: true, larguraPx: 86, pivotX: 0.5, pivotY: 0.92,
      bloqueia: false, oscilaBrisa: true, pulsoBiolum: '#ffd86b', brilho: { cor: '#ffd86b', raio: 1.0, forca: 0.24 },
      interacao: { label: 'COLHER ESSÊNCIA DE ALGAS DOURADAS', distancia: 1.55 },
    },
    {
      id: 'acampamento_vigilia_enseada', nome: 'ACAMPAMENTO DE VIGÍLIA', tipo: 'decoracao', x: 8.6, y: 17.8,
      sprite: 'enseada_acampamento_vigilia', spriteB: 'enseada_acampamento_vigilia_b', animPeriodo: 0.42,
      useCrop: true, larguraPx: 122, pivotX: 0.5, pivotY: 0.88,
      bloqueia: false, fogueiraViva: true, brilho: { cor: '#ffae52', raio: 1.25, forca: 0.28 },
      interacao: { label: 'DESCANSAR NA FOGUEIRA', distancia: 1.6 },
    },
    {
      id: 'banco_conchas_enseada', nome: 'BANCO DE CONCHAS', tipo: 'decoracao', x: 8.8, y: 20.6,
      sprite: 'enseada_banco_conchas', useCrop: true, larguraPx: 94, pivotX: 0.5, pivotY: 0.88,
      bloqueia: false,
      interacao: { label: 'EXAMINAR CONCHAS & ESTRELAS', distancia: 1.5 },
    },

    // ---- ZONA 2: Complexo de Pesquisa Norte (alinhado ao redor da Estação 66.6) ----
    {
      id: 'relogio_mare_enseada', nome: 'RELÓGIO DE MARÉ SOLAR', tipo: 'dispositivo', x: 9.8, y: 10.6,
      sprite: 'enseada_relogio_mare', useCrop: true, larguraPx: 86, pivotX: 0.5, pivotY: 0.94,
      bloqueia: false, brilho: { cor: '#ffd980', raio: 1.15, forca: 0.25 },
      interacao: { label: 'SINTONIZAR CLIMA E MARÉ', distancia: 1.55 },
    },
    {
      id: 'torre_antena_enseada', nome: 'TORRE-ANTENA DE ESCUTA', tipo: 'dispositivo', x: 11.8, y: 11.2,
      sprite: 'enseada_torre_antena', useCrop: true, larguraPx: 86, pivotX: 0.5, pivotY: 0.96,
      bloqueia: false, pulsoAntena: true, brilho: { cor: '#ff7e71', raio: 0.9, forca: 0.2 },
      interacao: { label: 'SINTONIZAR TORRE-ANTENA', distancia: 1.55 },
    },
    {
      id: 'bancada_campo_enseada', nome: 'BANCADA DE CAMPO', tipo: 'dispositivo', x: 13.4, y: 12.4,
      sprite: 'enseada_bancada_campo', useCrop: true, larguraPx: 102, pivotX: 0.5, pivotY: 0.92,
      bloqueia: false, brilho: { cor: '#74ff8a', raio: 1.2, forca: 0.26 },
      interacao: { label: 'CALIBRAR MÓDULO NA BANCADA', distancia: 1.55 },
    },
    {
      id: 'espelho_arquetipos_enseada', nome: 'ESPELHO DE RESSONÂNCIA', tipo: 'dispositivo', x: 21.0, y: 11.8,
      sprite: 'enseada_espelho_arquetipo', useCrop: true, larguraPx: 100, pivotX: 0.5, pivotY: 0.95,
      bloqueia: false, brilho: { cor: '#6ff7ff', raio: 1.5, forca: 0.34 },
      interacao: { label: 'SINTONIZAR ARQUÉTIPO', distancia: 1.65 },
    },

    // ---- ZONA 3: Praça Central de Eco & Treino (espaçada ao redor de eco_treino_enseada) ----
    {
      id: 'totem_eco_enseada', nome: 'MONÓLITO DE ECO', tipo: 'decoracao', x: 15.2, y: 14.0,
      sprite: 'enseada_totem_eco', spriteB: 'enseada_totem_eco_b', animPeriodo: 0.52,
      useCrop: true, larguraPx: 76, pivotX: 0.5, pivotY: 0.94,
      bloqueia: false, pulsoTotem: true, brilho: { cor: '#ffd980', raio: 1.15, forca: 0.25 },
      interacao: { label: 'EXAMINAR MONÓLITO DE ECO', distancia: 1.5 },
    },
    {
      id: 'estela_navegadores_enseada', nome: 'ESTELA DOS NAVEGADORES', tipo: 'decoracao', x: 17.8, y: 16.4,
      sprite: 'enseada_estela_navegadores', useCrop: true, larguraPx: 108, pivotX: 0.5, pivotY: 0.92,
      bloqueia: false, pulsoBiolum: '#6cf7ff', brilho: { cor: '#6cf7ff', raio: 1.35, forca: 0.3 },
      interacao: { label: 'DECIFRAR A ESTELA DOS NAVEGADORES', distancia: 1.6 },
    },
    {
      id: 'maleta_expedicao_enseada', nome: 'MALETA DA EXPEDIÇÃO', tipo: 'dispositivo', x: 18.6, y: 13.8,
      sprite: 'enseada_caixa_suprimentos', useCrop: true, larguraPx: 80, pivotX: 0.5, pivotY: 0.9,
      bloqueia: false, pulsoAntena: true, brilho: { cor: '#ff9a5c', raio: 1.0, forca: 0.22 },
      interacao: { label: 'ABRIR MALETA DA EXPEDIÇÃO', distancia: 1.55 },
    },
    {
      id: 'captador_ecos_enseada', nome: 'CAPTADOR DE ECOS', tipo: 'dispositivo', x: 20.6, y: 14.6,
      sprite: 'enseada_rede_cristal', useCrop: true, larguraPx: 114, pivotX: 0.5, pivotY: 0.92,
      bloqueia: false, pulsoAntena: true, brilho: { cor: '#5cf7eb', raio: 1.3, forca: 0.28 },
      interacao: { label: 'SINTONIZAR CAPTADOR DE ECOS', distancia: 1.65 },
    },

    // ---- ZONA 4: Refúgio Termal, Gruta & Jardim Sul ----
    {
      id: 'piscina_mare_viva_enseada', nome: 'PISCINA DE MARÉ VIVA', tipo: 'decoracao', x: 11.0, y: 17.2,
      sprite: 'enseada_piscina_mare', useCrop: true, larguraPx: 118, pivotX: 0.5, pivotY: 0.88,
      bloqueia: false, pulsoBiolum: '#5cf7eb', brilho: { cor: '#5cf7eb', raio: 1.25, forca: 0.26 },
      interacao: { label: 'MERGULHAR AS MÃOS NA MARÉ VIVA', distancia: 1.65 },
    },
    {
      id: 'fonte_termal_enseada', nome: 'FONTE TERMAL DA ENSEADA', tipo: 'decoracao', x: 11.6, y: 21.4,
      sprite: 'enseada_fonte_termal', useCrop: true, larguraPx: 124, pivotX: 0.5, pivotY: 0.9,
      bloqueia: false, vaporTermal: true, brilho: { cor: '#7efce0', raio: 1.4, forca: 0.28 },
      interacao: { label: 'DESCANSAR NA FONTE TERMAL', distancia: 1.7 },
    },
    {
      id: 'gruta_concha_enseada', nome: 'FENDA DA MARÉ', tipo: 'decoracao', x: 14.8, y: 19.2,
      sprite: 'enseada_gruta_concha', useCrop: true, larguraPx: 128, pivotX: 0.5, pivotY: 0.88,
      bloqueia: false, pulsoBiolum: '#54ccff', brilho: { cor: '#54ccff', raio: 1.3, forca: 0.28 },
      interacao: { label: 'ABRIGAR-SE NA FENDA DA MARÉ', distancia: 1.7 },
    },
    {
      id: 'jardim_pedras_enseada', nome: 'PEDRAS DO EQUILÍBRIO', tipo: 'decoracao', x: 17.2, y: 21.2,
      sprite: 'enseada_jardim_pedras', useCrop: true, larguraPx: 80, pivotX: 0.5, pivotY: 0.94,
      bloqueia: false, oscilaBrisa: true,
      interacao: { label: 'MEDITAR NAS PEDRAS DO EQUILÍBRIO', distancia: 1.55 },
    },
    {
      id: 'poleiro_aves_enseada', nome: 'POLEIRO DAS AVES', tipo: 'decoracao', x: 14.6, y: 23.2,
      sprite: 'enseada_poleiro_aves', useCrop: true, larguraPx: 88, pivotX: 0.5, pivotY: 0.94,
      bloqueia: false,
      interacao: { label: 'OBSERVAR O POLEIRO', distancia: 1.5 },
    },
    {
      id: 'santuario_lumeo_enseada', nome: 'SANTUÁRIO DE LÚMEO', tipo: 'decoracao', x: 19.6, y: 18.8,
      sprite: 'enseada_santuario_lumeo', useCrop: true, larguraPx: 100, pivotX: 0.5, pivotY: 0.92,
      bloqueia: false, pulsoBiolum: '#70f3ff', brilho: { cor: '#70f3ff', raio: 1.35, forca: 0.32 },
      interacao: { label: 'EXAMINAR SANTUÁRIO DE LÚMEO', distancia: 1.55 },
    },
    {
      id: 'ninho_tartarugas_enseada', nome: 'NINHO DE TARTARUGAS', tipo: 'decoracao', x: 21.8, y: 22.2,
      sprite: 'enseada_ninho_tartarugas', useCrop: true, larguraPx: 98, pivotX: 0.5, pivotY: 0.9,
      bloqueia: false,
      interacao: { label: 'PROTEGER O NINHO', distancia: 1.6 },
    },

    // ---- ZONA 5: Baía Leste, Cais, Farolete, Barco & Portais ----
    {
      id: 'farolete_baia_enseada', nome: 'FAROLETE DA BAÍA', tipo: 'decoracao', x: 22.4, y: 9.6,
      sprite: 'enseada_farolete_baia', spriteB: 'enseada_farolete_baia_b', animPeriodo: 0.65,
      useCrop: true, larguraPx: 92, pivotX: 0.5, pivotY: 0.96,
      bloqueia: false, feixeFarolete: true, brilho: { cor: '#5cf7eb', raio: 1.8, forca: 0.4 },
      interacao: { label: 'OBSERVAR DO FAROLETE', distancia: 1.65 },
    },
    {
      id: 'embarcadouro_mare_astral', nome: 'EMBARCADOURO DA MARÉ', tipo: 'decoracao', x: 24.2, y: 11.8,
      sprite: 'enseada_embarcadouro_mare', useCrop: true, larguraPx: 138, pivotX: 0.5, pivotY: 0.88,
      bloqueia: false, brilho: { cor: '#5cf7eb', raio: 1.35, forca: 0.3 },
      interacao: { label: 'EXAMINAR O CAIS DA MARÉ', distancia: 1.75 },
    },
    {
      id: 'cais_madeira_pesca_enseada', nome: 'CAIS DA ENSEADA', tipo: 'decoracao', x: 23.0, y: 13.8,
      sprite: 'enseada_cais_pesca', useCrop: true, larguraPx: 126, pivotX: 0.5, pivotY: 0.88,
      bloqueia: false, brilho: { cor: '#ffd980', raio: 1.0, forca: 0.22 },
      interacao: { label: 'OBSERVAR A BAÍA DO CAIS', distancia: 1.75 },
    },
    {
      id: 'portal_caminho_correntes', nome: 'PORTAL DAS CORRENTES', tipo: 'decoracao', x: 25.0, y: 15.0,
      sprite: 'enseada_portal_correntes', spriteB: 'enseada_portal_correntes_b', animPeriodo: 0.48,
      useCrop: true, larguraPx: 126, pivotX: 0.5, pivotY: 0.94,
      bloqueia: false, brilho: { cor: '#5cf7eb', raio: 1.5, forca: 0.34 },
    },
    {
      id: 'banco_ostras_enseada', nome: 'BANCO DE OSTRAS PÉROLA', tipo: 'decoracao', x: 23.4, y: 16.8,
      sprite: 'enseada_banco_ostras', useCrop: true, larguraPx: 86, pivotX: 0.5, pivotY: 0.9,
      bloqueia: false, brilho: { cor: '#70f3ff', raio: 1.0, forca: 0.24 },
      interacao: { label: 'COLHER PÉROLA DA ENSEADA', distancia: 1.65 },
    },
    {
      id: 'bau_deriva_enseada', nome: 'ARCAZ À DERIVA', tipo: 'decoracao', x: 21.6, y: 17.6,
      sprite: 'enseada_bau_deriva', useCrop: true, larguraPx: 84, pivotX: 0.5, pivotY: 0.9,
      bloqueia: false, pulsoBiolum: '#5cf7eb', brilho: { cor: '#5cf7eb', raio: 1.15, forca: 0.26 },
      interacao: { label: 'ABRIR O ARCAZ À DERIVA', distancia: 1.55 },
    },
    {
      id: 'coral_luminescente_enseada', nome: 'RECIFE LUMINESCENTE', tipo: 'decoracao', x: 23.8, y: 19.4,
      sprite: 'enseada_coral_azul', useCrop: true, larguraPx: 92, pivotX: 0.5, pivotY: 0.92,
      bloqueia: false, pulsoBiolum: '#44e8ff', brilho: { cor: '#44e8ff', raio: 1.35, forca: 0.34 },
      interacao: { label: 'COLHER AMOSTRA DE CORAL', distancia: 1.6 },
    },
    {
      id: 'barco_expedicao_enseada', nome: 'BARCO DE EXPEDIÇÃO', tipo: 'decoracao', x: 26.8, y: 17.8,
      sprite: 'enseada_barco_expedicao', spriteB: 'enseada_barco_expedicao_b', animPeriodo: 0.72,
      useCrop: true, larguraPx: 144, pivotX: 0.5, pivotY: 0.88,
      bloqueia: false, flutuacaoSuave: true, brilho: { cor: '#6ff7ff', raio: 1.1, forca: 0.2 },
      interacao: { label: 'INSPECIONAR BARCO DE EXPEDIÇÃO', distancia: 2.15 },
    },
    {
      id: 'cardume_orla_norte', nome: 'CARDUME DA BAÍA', tipo: 'decoracao', x: 24.6, y: 13.8,
      sprite: 'enseada_cardume_vivo', useCrop: true, larguraPx: 68, pivotX: 0.5, pivotY: 0.65,
      depthOffset: -1, bloqueia: false, flutuacaoSuave: true, nadoCardume: true,
    },
    {
      id: 'cardume_orla_sul', nome: 'CARDUME DA ENSEADA', tipo: 'decoracao', x: 27.8, y: 19.2,
      sprite: 'enseada_cardume_vivo', useCrop: true, larguraPx: 72, pivotX: 0.5, pivotY: 0.65,
      depthOffset: -1, bloqueia: false, flutuacaoSuave: true, nadoCardume: true,
    },
    {
      id: 'baliza_mare_boia_1', nome: 'BOIA DE MARÉ', tipo: 'decoracao', x: 30.2, y: 10.6,
      sprite: 'enseada_baliza_boia', useCrop: true, larguraPx: 54, pivotX: 0.5, pivotY: 0.9,
      bloqueia: false, flutuacaoSuave: true, brilho: { cor: '#5cf7eb', raio: 1.3, forca: 0.3 },
    },
    {
      id: 'baliza_mare_boia_2', nome: 'BOIA DE MARÉ', tipo: 'decoracao', x: 30.0, y: 14.6,
      sprite: 'enseada_baliza_boia', useCrop: true, larguraPx: 54, pivotX: 0.5, pivotY: 0.9,
      bloqueia: false, flutuacaoSuave: true, brilho: { cor: '#5cf7eb', raio: 1.3, forca: 0.3 },
    },
    {
      id: 'lanterna_marinha_norte', nome: 'LANTERNA MARÍTIMA', tipo: 'decoracao', x: 26.8, y: 9.8,
      sprite: 'enseada_lanterna_marinha', useCrop: true, larguraPx: 62, pivotX: 0.5, pivotY: 0.9,
      bloqueia: false, flutuacaoSuave: true, brilho: { cor: '#6ff7ff', raio: 1.5, forca: 0.38 },
    },
    {
      id: 'lanterna_marinha_sul', nome: 'LANTERNA MARÍTIMA', tipo: 'decoracao', x: 27.8, y: 21.0,
      sprite: 'enseada_lanterna_marinha', useCrop: true, larguraPx: 62, pivotX: 0.5, pivotY: 0.9,
      bloqueia: false, flutuacaoSuave: true, brilho: { cor: '#6ff7ff', raio: 1.5, forca: 0.38 },
    },

    // ---- Relevo Costeiro & Mar (bordas sem obstruir caminho) ----
    relevo('enseada_falesia_norte', 'falesia-alta', 11.2, 5.8, 220, { espelhar: true }),
    relevo('enseada_macico_leste', 'macico-cascata', 24.5, 6.2, 235),
    relevo('enseada_pilar_noroeste', 'pilar-palmeiras-a', 7.2, 8.2, 112),
    relevo('enseada_rochas_mar_1', 'rochas-mar', 3.4, 17.5, 56, { espuma: 26, espumaY: -3 }),
    relevo('enseada_rochas_mar_2', 'rochas-mar', 28.8, 17.8, 56, { espelhar: true, espuma: 26, espumaY: -3 }),
    relevo('enseada_rochas_mar_3', 'rochas-mar', 20.2, 26.5, 58, { espuma: 28, espumaY: -3 }),

    // ---- Cenário & Vegetação Emoldurando as Bordas (sem tampar marcos nem trilhas) ----
    { id: 'enseada_pedra_leste', tipo: 'decoracao', x: 25, y: 7, sprite: 'costa_rochosa', frame: { col: 1, row: 0 }, useCrop: true, larguraPx: 105, pivotY: 1, bloqueia: false },
    { id: 'enseada_pedra_sul', tipo: 'decoracao', x: 5, y: 8, sprite: 'costa_rochosa', frame: { col: 2, row: 0 }, useCrop: true, larguraPx: 74, pivotY: 1, bloqueia: false },

    tropical('enseada_vegetacao_1', 8, 8, 3, 106, true),
    tropical('enseada_vegetacao_2', 15, 7, 2, 78, true),
    tropical('enseada_vegetacao_3', 22, 8, 5, 102, true),
    tropical('enseada_vegetacao_4', 23, 23, 4, 86, true),
    tropical('enseada_vegetacao_5', 10, 23, 2, 74, true),
    tropical('enseada_vegetacao_6', 19, 24, 3, 92, true),

    floraDecor('veg', 'samambaia_clara', 'enseada_flora_1', 8.4, 9.2, 0.9),
    floraDecor('veg', 'flores_roxas', 'enseada_flora_2', 13.4, 22.8, 0.9),
    floraDecor('veg', 'bromelia_grande', 'enseada_flora_3', 21.6, 9.6, 0.9),
    floraDecor('veg', 'monstera', 'enseada_flora_4', 20.2, 23.2, 0.9),
    floraDecor('veg', 'flores_azuis', 'enseada_flora_5', 6.4, 19.6, 0.85),
    floraDecor('costa', 'bromelia_gigante', 'enseada_flora_6', 17.6, 22.8, 0.9),
    floraDecor('costa', 'ilhota_musgo', 'enseada_ilhota_1', 3.4, 12.2, 0.9),
    floraDecor('costa', 'rochas_espuma', 'enseada_ilhota_2', 29.4, 8.8, 0.85),

    tropical('enseada_folhas_1', 8, 9, 0, 50),
    tropical('enseada_folhas_2', 16, 8, 1, 46),
    tropical('enseada_folhas_3', 23, 9, 0, 48),
    tropical('enseada_folhas_4', 10, 22, 0, 44),
    tropical('enseada_folhas_5', 19, 23, 1, 44),
    tropical('enseada_ruinas', 20, 13, 6, 68),
    tropical('enseada_rochas', 13, 22, 7, 56),
    tropical('enseada_palmeira_1', 9, 9, 2, 80),
    tropical('enseada_palmeira_2', 21, 8, 2, 80),
    tropical('enseada_palmeira_3', 22, 23, 2, 82),

    prop('enseada_arbusto_1', 11, 23, 3, 0, 46),
    prop('enseada_concha', 13, 9, 1, 3, 38),

    {
      id: 'arco_conduto_retorno_mare', tipo: 'decoracao', x: 28.9, y: 12.1,
      sprite: 'mare_sala_arco_enseada', useCrop: true, larguraPx: 142, anchorY: 0.92,
      bloqueia: false, brilho: { cor: '#5cf7eb', raio: 2.2, forca: 0.44 },
    },
  ],

  collectibles: [
    {
      id: 'lumeo_encontro', nome: 'SINAL DE LÚMEO', tipo: 'eco', x: 10, y: 15,
      requiresFlag: 'enseada_ecos_mapeada', label: 'OUVIR O ECO DISTANTE', speaker: 'ECO DISTANTE',
      dialogue: [
        'TRÊS SINAIS RESPONDEM ÀS SUAS DESCOBERTAS. UM PEQUENO ECO SE ESCONDE NA ENSEADA.',
        'UMA VIBRAÇÃO INSTÁVEL VEM DAS RUÍNAS A LESTE. INVESTIGUE SEM ASSUSTÁ-LO.',
      ],
    },
    {
      id: 'lumeo_ressonancia', nome: 'RESSONÂNCIA', tipo: 'eco', x: 18, y: 13,
      requiresFlag: 'collected_lumeo_encontro', label: 'ACALMAR A RESSONÂNCIA', speaker: 'RESSONÂNCIA',
      dialogue: [
        'O PULSO AGITADO DIMINUI QUANDO VOCÊ SE APROXIMA SEM AGREDIR.',
        'UMA LUZ PEQUENA SEGUE EM DIREÇÃO À MATA. VÁ ATÉ ELA.',
      ],
    },
    {
      id: 'lumeo_vinculo', nome: 'LÚMEO', tipo: 'eco', x: 20, y: 19,
      requiresFlag: 'collected_lumeo_ressonancia', label: 'OFERECER COMPANHIA A LÚMEO', speaker: 'LÚMEO',
      dialogue: [
        'VOCÊ ESPERA. O PEQUENO ECO SE APROXIMA POR VONTADE PRÓPRIA.',
        'UMA LUZ ENTRELAÇA SEU CAMINHO AO DELE. LÚMEO ESCOLHE ACOMPANHAR VOCÊ.',
      ],
    },
    {
      id: 'enseada_rastro_mar', nome: 'RASTRO DA MARÉ', tipo: 'fragmento', x: 10, y: 14,
      label: 'INVESTIGAR RASTRO DA MARÉ',
      dialogue: [
        'UM ECO SE MOVE CONTRA A MARÉ. O PULSO COINCIDE COM O RUÍDO DO TERMINAL.',
        'ALGUÉM MARCOU UMA ROTA ANTES DE VOCÊ.',
      ],
    },
    {
      id: 'enseada_rastro_pedra', nome: 'MARCA NO BASALTO', tipo: 'fragmento', x: 19, y: 12,
      label: 'EXAMINAR MARCA NO BASALTO',
      dialogue: [
        'UM SÍMBOLO FOI GRAVADO NO BASALTO: UM CÍRCULO INTERROMPIDO POR TRÊS RISCOS.',
        'A PEDRA ESTÁ QUENTE, MAS NÃO HÁ FOGO POR PERTO.',
      ],
    },
    {
      id: 'enseada_rastro_mata', nome: 'VESTÍGIO DA MATA', tipo: 'fragmento', x: 21, y: 20,
      label: 'EXAMINAR VESTÍGIO DA MATA',
      dialogue: [
        'FOLHAS E PEGADAS INDICAM UMA TRILHA PARA O INTERIOR.',
        'O CAMINHO PARA A BAÍA LESTE AGORA SE ABRE DIANTE DE VOCÊ.',
      ],
    },
  ],

  portals: [
    {
      id: 'acesso_estacao_666', tipo: 'door', x: 18, y: 10, label: 'ENTRAR NA ESTAÇÃO 66.6',
      requiresFlag: 'frequencia666Registrada', lockedLabel: 'ESTAÇÃO DE ESCUTA // SEM SINAL',
      mensagemBloqueado: ['A PORTA AGUARDA UMA ASSINATURA. INVESTIGUE O TERMINAL DE MANUTENÇÃO COM [R].'],
      interactionDistance: 1.2, destino: { mapId: 'estacao_limiar_666', spawnId: 'vindo_da_enseada' }, transition: 'fade',
    },
    {
      id: 'rota_correntes', tipo: 'door', x: 25, y: 15, label: 'NAVEGAR: CAMINHO DAS CORRENTES',
      interactionDistance: 1.4, destino: { mapId: 'mar_caminho_das_correntes', spawnId: 'vindo_da_enseada' }, transition: 'fade',
    },
    {
      id: 'retorno_darsena_mare', tipo: 'door', x: 28, y: 12, automaticoNado: true, raioAutomatico: 0.8,
      requiresFlag: 'rota_livre_enseada_aberta', lockedLabel: 'CONDUTO ABISSAL INATIVO',
      mensagemBloqueado: ['UM VÓRTICE PROFUNDO RESSOA COM A DÁRSENA DA MARÉ ASTRAL, MAS PERMANECE SELADO DO OUTRO LADO.'],
      label: 'NADAR: ROTA DAS MARÉS ATÉ A DÁRSENA', requiresArchetype: 'mare_astral',
      interactionDistance: 1.95, destino: { mapId: 'mar_rota_mare_astral', spawnId: 'vindo_da_enseada' }, transition: 'fade',
    },
    {
      id: 'enseada_retorno', tipo: 'door', x: 5, y: 15, label: 'VOLTAR À PRAIA INICIAL',
      interactionDistance: 1.4, destino: { mapId: 'ilha_praia_inicial', spawnId: 'vindo_da_enseada' }, transition: 'fade',
    },
  ],
};
