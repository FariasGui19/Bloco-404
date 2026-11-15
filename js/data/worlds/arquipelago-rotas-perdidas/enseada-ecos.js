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

const landShape = (x, y) => {
  // Silhueta em ferradura, distribuída por quase toda a tela: platô norte,
  // ombro oeste, praia central, cabo leste e faixa de areia sul.
  const dNorteOeste = ((x - 17.0) / 15.0) ** 2 + ((y - 13.0) / 11.0) ** 2;
  const dSudoeste = ((x - 15.5) / 14.0) ** 2 + ((y - 27.0) / 14.0) ** 2;
  const dCentro = ((x - 31.0) / 17.0) ** 2 + ((y - 25.0) / 13.0) ** 2;
  const dPontaLeste = ((x - 48.0) / 13.0) ** 2 + ((y - 25.0) / 11.0) ** 2;
  const dPraiaSul = ((x - 30.0) / 23.0) ** 2 + ((y - 41.0) / 12.0) ** 2;
  const noise = (hash(x, y, 7) - 0.5) * 0.08;
  let inside = Math.min(dNorteOeste, dSudoeste, dCentro, dPontaLeste, dPraiaSul) + noise < 1.0;

  // Baía leste côncava para o porto; corredor oeste e ponta de embarque
  // preservam os acessos narrativos existentes sem retângulos de terra artificiais.
  if (x >= 26 && x <= 33 && y >= 9 && y <= 19) inside = false;
  if (x >= 4 && x <= 7 && y >= 13 && y <= 17) inside = true;
  if (x >= 23 && x <= 25 && y === 15) inside = true;

  // Oceano aberto além da enseada; os cardumes existentes permanecem livres.
  if (x <= 2 && y >= 10 && y <= 26) inside = false;
  // A raia/cardume leste segue em água profunda diante da ponta ampliada.
  if (x >= 38 && x <= 43 && y <= 18) inside = false;
  if (x >= 68) inside = false;

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

// Reafirmar pontos obrigatórios das missões, portais e spawns após limpeza
for (const [x, y] of [
  [5, 15], [6, 15], [24, 15], [25, 15],
  [10, 14], [10, 15], [12, 14], [16, 13], [18, 10], [18, 13], [19, 12], [20, 19], [21, 20],
]) grid[y][x] = 'S';

// Garantir baía leste navegável até o conduto (28, 12) e barco (27, 18)
for (let y = 10; y <= 18; y++) {
  for (let x = 26; x <= 32; x++) {
    if (y <= 17 || x <= 30) grid[y][x] = 'W';
  }
}
grid[15][25] = 'S';

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
    initialZoom: 0.34,
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
      x: 33.0, y: 35.0, rx: 1.15, ry: 0.85,
      profundidade: 0.45,
      treino: true,
    },
  ],

  ondasMar: [
    [2, 11, 1], [7, 5, 0], [68, 5, 1], [68, 10, 0], [34, 10, 1],
    [68, 17, 0], [68, 24, 1], [68, 33, 0], [68, 39, 1], [4, 39, 0], [0, 27, 1], [2, 19, 0],
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

  trainingTargets: [{ id: 'eco_treino_enseada', x: 15.0, y: 16.2, maxHealth: 60 }],

  hazards: [
    { id: 'eco_instavel_oeste', x: 8.6, y: 8.0, radius: 0.9, damage: 9, interval: 1.3 },
    { id: 'eco_instavel_leste', x: 22.8, y: 27.4, radius: 1.0, damage: 12, interval: 1.5 },
  ],

  fauna: [
    {
      id: 'enseada_caranguejo_1', species: 'caranguejo', x: 7.4, y: 16.4, calma: true,
      interacao: {
        distancia: 1.35, speaker: 'CARANGUEJO DA ORLA',
        dialogue: ['ELE MOVE AS PINÇAS NO RITMO DAS ONDAS, COMO SE MEDISSE A MARÉ.'],
        porArquetipo: {
          mare_astral: 'MARÉ ASTRAL: VOCÊ PERCEBE QUE ELE SE ENTERRA MAIS FUNDO ANTES DE VIRADAS DE RESSACA.',
          motor_bio_forja: 'BIO-FORJA: CARAPAÇA LIMPA, SEM PLÁSTICO NEM ÓLEO — SINAL DE ÁGUA SAUDVEL.',
        },
      },
    },
    { id: 'enseada_caranguejo_2', species: 'caranguejo', x: 28.4, y: 25.4 },
    { id: 'enseada_gaivota', species: 'gaivota', x: 19.4, y: 32.0 },
    { id: 'enseada_trinta_reis', species: 'trinta_reis', x: 28.8, y: 28.4 },
    { id: 'enseada_peixes', species: 'peixes', x: 1.8, y: 14.5 },
    { id: 'enseada_tartaruga_1', species: 'tartaruga', x: 4.5, y: 38.0 },
    { id: 'enseada_golfinho_1', species: 'golfinho', x: 40.5, y: 16.0 },
    {
      id: 'enseada_capivara', species: 'capivara', x: 16.8, y: 27.2, calma: true,
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
      id: 'porta_estacao_666_visual', tipo: 'decoracao', x: 18, y: 10, sprite: 'enseada3_estacao_666',
      // Entrada inspirada na referência: porta pequena dentro de um bloco de pedra
      // alto e gramado. A caixa de fundação antiga é mantida para preservar o acesso.
      useCrop: true, larguraPx: 380, pivotX: 0.5, pivotY: 0.96, depthOffset: -2, bloqueia: true,
      hitbox: { offsetX: -4.65, offsetY: -1.4, width: 3.8, height: 2.95 },
    },
    { id: 'baliza_666_receptor', tipo: 'decoracao', x: 12, y: 13, sprite: 'freq666_baliza', useCrop: true, larguraPx: 24, pivotX: 0.5, pivotY: 0.98, bloqueia: false },
    { id: 'baliza_666_entrada', tipo: 'decoracao', x: 19, y: 11, sprite: 'freq666_baliza', useCrop: true, larguraPx: 24, pivotX: 0.5, pivotY: 0.98, bloqueia: false },

    // ---- Calçadas contínuas segundo o desenho da referência ----
    // Eixo do pórtico oeste até a praça central; ramais curtos para o
    // acampamento e a Estação, depois a trilha sul segue à piscina, rede e cais.
    ...[
      ...Array.from({ length: 21 }, (_, i) => [10.5 + i, 44.5 - i]),
      [15.2, 40.0], [15.0, 38.0], [15.0, 36.0], [15.0, 34.0],
      [28.5, 22.5], [26.5, 20.5], [24.5, 18.5], [22.5, 16.5], [20.5, 14.5], [18.5, 12.5],
      [30.0, 28.0], [30.0, 32.0], [30.0, 36.0], [30.0, 40.0], [30.0, 44.0], [30.0, 48.0],
      [32.0, 50.0], [34.0, 48.0], [36.0, 46.0],
      [39.0, 45.0], [42.0, 44.0], [45.0, 43.0], [48.0, 43.0],
    ].map(([tx, ty], i) => ({
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
      id: 'portico_trilha_praia', nome: 'PÓRTICO DA TRILHA', tipo: 'decoracao', x: 10.0, y: 45.0,
      sprite: 'enseada3_portico_oeste', spriteB: 'enseada3_portico_oeste', animPeriodo: 0.54,
      useCrop: true, larguraPx: 190, pivotX: 0.5, pivotY: 0.98,
      bloqueia: false, oscilaBrisa: true, brilho: { cor: '#ffb86b', raio: 1.0, forca: 0.16 },
    },
    {
      id: 'bandeirola_vento_enseada', nome: 'BIRUTA DA EXPEDIÇÃO', tipo: 'decoracao', x: 14.0, y: 21.0,
      sprite: 'enseada_bandeirola_vento', spriteB: 'enseada_bandeirola_vento_b', animPeriodo: 0.48,
      useCrop: true, larguraPx: 62, pivotX: 0.5, pivotY: 0.94,
      bloqueia: false, oscilaBrisa: true,
    },
    {
      id: 'carrilhao_vento_enseada', nome: 'CARRILHÃO DE VENTO', tipo: 'decoracao', x: 9.0, y: 38.0,
      sprite: 'enseada_carrilhao_vento', spriteB: 'enseada_carrilhao_vento_b', animPeriodo: 0.58,
      useCrop: true, larguraPx: 78, pivotX: 0.5, pivotY: 0.96,
      bloqueia: false, oscilaBrisa: true,
      interacao: { label: 'OUVIR O CARRILHÃO', distancia: 1.55 },
    },
    {
      id: 'acampamento_vigilia_enseada', nome: 'ACAMPAMENTO DE VIGÍLIA', tipo: 'decoracao', x: 15.0, y: 34.0,
      sprite: 'enseada4_fogueira', spriteB: 'enseada4_fogueira', animPeriodo: 0.42,
      useCrop: true, larguraPx: 116, pivotX: 0.5, pivotY: 0.98,
      bloqueia: true, hitbox: { offsetX: -0.30, offsetY: -0.24, width: 0.60, height: 0.48 },
      fogueiraViva: true, brilho: { cor: '#ffae52', raio: 1.25, forca: 0.28 },
      interacao: { label: 'DESCANSAR NA FOGUEIRA', distancia: 1.6 },
    },
    {
      id: 'tenda_expedicao_enseada', nome: 'TENDA DA EXPEDIÇÃO', tipo: 'decoracao', x: 15.0, y: 26.0,
      sprite: 'enseada4_tenda', useCrop: true, larguraPx: 154,
      pivotX: 0.5, pivotY: 0.98, depthOffset: -0.2,
      bloqueia: true, hitbox: { offsetX: -0.48, offsetY: -0.34, width: 0.96, height: 0.68 },
      interacao: { label: 'INSPECIONAR TENDA DA EXPEDIÇÃO', distancia: 1.6, speaker: 'TENDA DA EXPEDIÇÃO',
        dialogue: ['A LONA GUARDA MAPAS, ROLOS DE CORDA E UM COBERTOR DOBRADO. A EXPEDIÇÃO ESTÁ EM PLENA ATIVIDADE.'] },
    },
    {
      id: 'maleta_expedicao_enseada', nome: 'MALETA DA EXPEDIÇÃO', tipo: 'dispositivo', x: 18.0, y: 34.0,
      sprite: 'enseada4_caixas', spriteB: 'enseada4_caixas', animPeriodo: 0.56,
      useCrop: true, larguraPx: 108, pivotX: 0.5, pivotY: 0.98,
      bloqueia: true, hitbox: { offsetX: -0.38, offsetY: -0.32, width: 0.76, height: 0.64 },
      pulsoAntena: true, brilho: { cor: '#ff9a5c', raio: 1.0, forca: 0.22 },
      interacao: { label: 'ABRIR MALETA DA EXPEDIÇÃO', distancia: 1.55 },
    },
    {
      id: 'algas_douradas_enseada', nome: 'BANCO DE ALGAS DOURADAS', tipo: 'decoracao', x: 11.0, y: 42.0,
      sprite: 'enseada_algas_douradas', spriteB: 'enseada_algas_douradas_b', animPeriodo: 0.62,
      useCrop: true, larguraPx: 78, pivotX: 0.5, pivotY: 0.92,
      bloqueia: false, oscilaBrisa: true, pulsoBiolum: '#ffd86b', brilho: { cor: '#ffd86b', raio: 1.0, forca: 0.24 },
      interacao: { label: 'COLHER ESSÊNCIA DE ALGAS DOURADAS', distancia: 1.55 },
    },
    {
      id: 'placa_trilha_enseada', nome: 'PLACA DAS TRILHAS', tipo: 'decoracao', x: 13.0, y: 32.0,
      sprite: 'enseada4_placa', useCrop: true, larguraPx: 74,
      pivotX: 0.5, pivotY: 0.98, depthOffset: 0.1,
      bloqueia: true, hitbox: { offsetX: -0.20, offsetY: -0.20, width: 0.40, height: 0.40 },
      interacao: { label: 'LER A PLACA DAS TRILHAS', distancia: 1.5, speaker: 'PLACA DAS TRILHAS',
        dialogue: ['O CAMINHO DO OESTE LEVA À PRAIA. AO NORTE FICA A ESTAÇÃO; AO SUL, A PISCINA E A GRUTA.'] },
    },

    // ---- NÚCLEO 2 (Norte): Complexo Científico da Estação 66.6 ----
    {
      id: 'relogio_mare_enseada', nome: 'RELÓGIO DE MARÉ SOLAR', tipo: 'dispositivo', x: 6.0, y: 36.0,
      sprite: 'enseada4_relogio', spriteB: 'enseada4_relogio', animPeriodo: 0.6,
      useCrop: true, larguraPx: 88, pivotX: 0.5, pivotY: 0.98,
      bloqueia: true, hitbox: { offsetX: -0.22, offsetY: -0.22, width: 0.44, height: 0.44 },
      brilho: { cor: '#ffd980', raio: 1.15, forca: 0.25 },
      interacao: { label: 'SINTONIZAR CLIMA E MARÉ', distancia: 1.55 },
    },
    {
      id: 'torre_antena_enseada', nome: 'TORRE-ANTENA DE ESCUTA', tipo: 'dispositivo', x: 7.0, y: 26.0,
      sprite: 'enseada4_torre_vigilia', spriteB: 'enseada4_torre_vigilia', animPeriodo: 0.5,
      useCrop: true, larguraPx: 116, pivotX: 0.5, pivotY: 0.98,
      bloqueia: true, hitbox: { offsetX: -0.30, offsetY: -0.28, width: 0.6, height: 0.56 },
      pulsoAntena: true, brilho: { cor: '#ff7e71', raio: 0.9, forca: 0.2 },
      interacao: { label: 'SINTONIZAR TORRE-ANTENA', distancia: 1.55 },
    },
    {
      id: 'bancada_campo_enseada', nome: 'BANCADA DE CAMPO', tipo: 'dispositivo', x: 11.0, y: 35.0,
      sprite: 'enseada4_mesa_campo', spriteB: 'enseada4_mesa_campo', animPeriodo: 0.58,
      useCrop: true, larguraPx: 134, pivotX: 0.5, pivotY: 0.98,
      bloqueia: true, hitbox: { offsetX: -0.58, offsetY: -0.38, width: 1.16, height: 0.76 },
      brilho: { cor: '#74ff8a', raio: 1.2, forca: 0.26 },
      interacao: { label: 'CALIBRAR MÓDULO NA BANCADA', distancia: 1.55 },
    },

    // ---- NÚCLEO 3 (Centro): Praça Livre de Treino & Marcos Antigos ----
    {
      id: 'totem_eco_enseada', nome: 'MONÓLITO DE ECO', tipo: 'decoracao', x: 31.0, y: 24.5,
      sprite: 'enseada3_monolito', spriteB: 'enseada3_monolito', animPeriodo: 0.52,
      useCrop: true, larguraPx: 180, pivotX: 0.5, pivotY: 0.98,
      bloqueia: false, pulsoTotem: true, brilho: { cor: '#52f6ff', raio: 1.4, forca: 0.32 },
      interacao: { label: 'EXAMINAR MONÓLITO DE ECO', distancia: 1.5 },
    },
    {
      id: 'estela_navegadores_enseada', nome: 'ESTELA DOS NAVEGADORES', tipo: 'decoracao', x: 28.0, y: 29.0,
      sprite: 'enseada_estela_navegadores', spriteB: 'enseada_estela_navegadores_b', animPeriodo: 0.62,
      useCrop: true, larguraPx: 92, pivotX: 0.5, pivotY: 0.92,
      bloqueia: false, pulsoBiolum: '#6cf7ff', brilho: { cor: '#6cf7ff', raio: 1.35, forca: 0.3 },
      interacao: { label: 'DECIFRAR A ESTELA DOS NAVEGADORES', distancia: 1.6 },
    },

    // ---- NÚCLEO 4 (Sudoeste / Sul): Santuário dos Arquétipos & Refúgio Termal ----
    {
      id: 'espelho_arquetipos_enseada', nome: 'ESPELHO DE RESSONÂNCIA', tipo: 'dispositivo', x: 23.0, y: 32.0,
      sprite: 'enseada_espelho_arquetipo', spriteB: 'enseada_espelho_arquetipo_b', animPeriodo: 0.56,
      useCrop: true, larguraPx: 90, pivotX: 0.5, pivotY: 0.95,
      bloqueia: false, brilho: { cor: '#6ff7ff', raio: 1.5, forca: 0.34 },
      interacao: { label: 'SINTONIZAR ARQUÉTIPO', distancia: 1.65 },
    },
    {
      id: 'jardim_pedras_enseada', nome: 'PEDRAS DO EQUILÍBRIO', tipo: 'decoracao', x: 36.0, y: 19.0,
      sprite: 'enseada4_cairn', spriteB: 'enseada4_cairn', animPeriodo: 0.64,
      useCrop: true, larguraPx: 98, pivotX: 0.5, pivotY: 0.98,
      bloqueia: true, hitbox: { offsetX: -0.30, offsetY: -0.24, width: 0.60, height: 0.48 },
      oscilaBrisa: true,
      interacao: { label: 'MEDITAR NAS PEDRAS DO EQUILÍBRIO', distancia: 1.55 },
    },
    {
      id: 'piscina_mare_viva_enseada', nome: 'PISCINA DE MARÉ VIVA', tipo: 'decoracao', x: 30.0, y: 52.0,
      sprite: 'enseada3_piscina', spriteB: 'enseada3_piscina', animPeriodo: 0.64,
      useCrop: true, larguraPx: 260, pivotX: 0.5, pivotY: 0.92,
      bloqueia: false, pulsoBiolum: '#5cf7eb', brilho: { cor: '#5cf7eb', raio: 1.25, forca: 0.26 },
      interacao: { label: 'MERGULHAR AS MÃOS NA MARÉ VIVA', distancia: 1.65 },
    },
    {
      id: 'fonte_termal_enseada', nome: 'FONTE TERMAL DA ENSEADA', tipo: 'decoracao', x: 20.0, y: 38.5,
      sprite: 'enseada_fonte_termal', spriteB: 'enseada_fonte_termal_b', animPeriodo: 0.58,
      useCrop: true, larguraPx: 112, pivotX: 0.5, pivotY: 0.9,
      bloqueia: false, vaporTermal: true, brilho: { cor: '#7efce0', raio: 1.4, forca: 0.28 },
      interacao: { label: 'DESCANSAR NA FONTE TERMAL', distancia: 1.7 },
    },
    {
      id: 'borboletas_fonte_enseada', nome: 'BORBOLETAS DA FONTE', tipo: 'decoracao', x: 20.0, y: 37.4,
      sprite: 'enseada_borboletas_vivas', spriteB: 'enseada_borboletas_vivas_b', animPeriodo: 0.34,
      useCrop: true, larguraPx: 54, pivotX: 0.5, pivotY: 0.5,
      bloqueia: false, flutuacaoSuave: true, nadoCardume: true,
    },
    {
      id: 'banco_conchas_enseada', nome: 'BANCO DE CONCHAS', tipo: 'decoracao', x: 17.0, y: 50.0,
      sprite: 'enseada_banco_conchas', spriteB: 'enseada_banco_conchas_b', animPeriodo: 0.68,
      useCrop: true, larguraPx: 78, pivotX: 0.5, pivotY: 0.88,
      bloqueia: false,
      interacao: { label: 'EXAMINAR CONCHAS & ESTRELAS', distancia: 1.5 },
    },
    {
      id: 'gruta_concha_enseada', nome: 'FENDA DA MARÉ', tipo: 'decoracao', x: 28.0, y: 35.0,
      sprite: 'enseada4_gruta', spriteB: 'enseada4_gruta', animPeriodo: 0.66,
      useCrop: true, larguraPx: 148, pivotX: 0.5, pivotY: 0.98,
      bloqueia: true, hitboxes: [
        { offsetX: -0.82, offsetY: -0.28, width: 0.62, height: 0.62 },
        { offsetX: 0.20, offsetY: -0.28, width: 0.62, height: 0.62 },
      ], pulsoBiolum: '#54ccff', brilho: { cor: '#54ccff', raio: 1.3, forca: 0.28 },
      interacao: { label: 'ABRIGAR-SE NA FENDA DA MARÉ', distancia: 1.7 },
    },
    {
      id: 'poleiro_aves_enseada', nome: 'POLEIRO DAS AVES', tipo: 'decoracao', x: 29.0, y: 42.0,
      sprite: 'enseada_poleiro_aves', spriteB: 'enseada_poleiro_aves_b', animPeriodo: 0.56,
      useCrop: true, larguraPx: 80, pivotX: 0.5, pivotY: 0.94,
      bloqueia: false,
      interacao: { label: 'OBSERVAR O POLEIRO', distancia: 1.5 },
    },
    {
      id: 'rede_treino_praia_enseada', nome: 'REDE DE TREINO DA PRAIA', tipo: 'decoracao', x: 37.0, y: 45.0,
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
      id: 'captador_ecos_enseada', nome: 'CAPTADOR DE ECOS', tipo: 'dispositivo', x: 42.0, y: 24.0,
      sprite: 'enseada_rede_cristal', spriteB: 'enseada_rede_cristal_b', animPeriodo: 0.6,
      useCrop: true, larguraPx: 96, pivotX: 0.5, pivotY: 0.92,
      bloqueia: false, pulsoAntena: true, brilho: { cor: '#5cf7eb', raio: 1.3, forca: 0.28 },
      interacao: { label: 'SINTONIZAR CAPTADOR DE ECOS', distancia: 1.65 },
    },
    {
      id: 'santuario_lumeo_enseada', nome: 'SANTUÁRIO DE LÚMEO', tipo: 'decoracao', x: 53.0, y: 22.0,
      sprite: 'enseada_santuario_lumeo', spriteB: 'enseada_santuario_lumeo_b', animPeriodo: 0.58,
      useCrop: true, larguraPx: 90, pivotX: 0.5, pivotY: 0.92,
      bloqueia: false, pulsoBiolum: '#70f3ff', brilho: { cor: '#70f3ff', raio: 1.35, forca: 0.32 },
      interacao: { label: 'EXAMINAR SANTUÁRIO DE LÚMEO', distancia: 1.55 },
    },
    {
      id: 'borboletas_jardim_enseada', nome: 'BORBOLETAS DO SANTUÁRIO', tipo: 'decoracao', x: 53.0, y: 21.0,
      sprite: 'enseada_borboletas_vivas', spriteB: 'enseada_borboletas_vivas_b', animPeriodo: 0.36,
      useCrop: true, larguraPx: 50, pivotX: 0.5, pivotY: 0.5,
      bloqueia: false, flutuacaoSuave: true, nadoCardume: true,
    },
    {
      id: 'bau_deriva_enseada', nome: 'ARCAZ À DERIVA', tipo: 'decoracao', x: 48.0, y: 33.0,
      sprite: 'enseada_bau_deriva', spriteB: 'enseada_bau_deriva_b', animPeriodo: 0.56,
      useCrop: true, larguraPx: 74, pivotX: 0.5, pivotY: 0.9,
      bloqueia: false, pulsoBiolum: '#5cf7eb', brilho: { cor: '#5cf7eb', raio: 1.15, forca: 0.26 },
      interacao: { label: 'ABRIR O ARCAZ À DERIVA', distancia: 1.55 },
    },
    {
      id: 'banco_ostras_enseada', nome: 'BANCO DE OSTRAS PÉROLA', tipo: 'decoracao', x: 56.0, y: 24.0,
      sprite: 'enseada_banco_ostras', spriteB: 'enseada_banco_ostras_b', animPeriodo: 0.64,
      useCrop: true, larguraPx: 78, pivotX: 0.5, pivotY: 0.9,
      bloqueia: false, brilho: { cor: '#70f3ff', raio: 1.0, forca: 0.24 },
      interacao: { label: 'COLHER PÉROLA DA ENSEADA', distancia: 1.65 },
    },
    {
      id: 'coral_luminescente_enseada', nome: 'RECIFE LUMINESCENTE', tipo: 'decoracao', x: 49.0, y: 36.0,
      sprite: 'enseada_coral_azul', spriteB: 'enseada_coral_azul_b', animPeriodo: 0.62,
      useCrop: true, larguraPx: 86, pivotX: 0.5, pivotY: 0.92,
      bloqueia: false, pulsoBiolum: '#44e8ff', brilho: { cor: '#44e8ff', raio: 1.35, forca: 0.34 },
      interacao: { label: 'COLHER AMOSTRA DE CORAL', distancia: 1.6 },
    },
    {
      id: 'ninho_tartarugas_enseada', nome: 'NINHO DE TARTARUGAS', tipo: 'decoracao', x: 52.0, y: 39.0,
      sprite: 'enseada_ninho_tartarugas', spriteB: 'enseada_ninho_tartarugas_b', animPeriodo: 0.68,
      useCrop: true, larguraPx: 86, pivotX: 0.5, pivotY: 0.9,
      bloqueia: false,
      interacao: { label: 'PROTEGER O NINHO', distancia: 1.6 },
    },

    // ---- NÚCLEO 6 (Baía Leste): Farolete, Embarcadouro, Cais Sul, Barco & Portais ----
    {
      id: 'farolete_baia_enseada', nome: 'FAROLETE DA BAÍA', tipo: 'decoracao', x: 54.0, y: 33.0,
      sprite: 'enseada_farolete_baia', spriteB: 'enseada_farolete_baia_b', animPeriodo: 0.65,
      useCrop: true, larguraPx: 86, pivotX: 0.5, pivotY: 0.96,
      bloqueia: false, feixeFarolete: true, brilho: { cor: '#5cf7eb', raio: 1.8, forca: 0.4 },
      interacao: { label: 'OBSERVAR DO FAROLETE', distancia: 1.65 },
    },
    {
      id: 'embarcadouro_mare_astral', nome: 'EMBARCADOURO DA MARÉ', tipo: 'decoracao', x: 24.4, y: 11.8,
      sprite: 'enseada_embarcadouro_mare', spriteB: 'enseada_embarcadouro_mare_b', animPeriodo: 0.62,
      useCrop: true, larguraPx: 124, pivotX: 0.5, pivotY: 0.88,
      bloqueia: false, brilho: { cor: '#5cf7eb', raio: 1.35, forca: 0.3 },
      interacao: { label: 'EXAMINAR O CAIS DA MARÉ', distancia: 1.75 },
    },
    {
      id: 'portal_caminho_correntes', nome: 'PORTAL DAS CORRENTES', tipo: 'decoracao', x: 58.0, y: 31.0,
      sprite: 'enseada_portal_correntes', spriteB: 'enseada_portal_correntes_b', animPeriodo: 0.48,
      useCrop: true, larguraPx: 112, pivotX: 0.5, pivotY: 0.94,
      bloqueia: false, brilho: { cor: '#5cf7eb', raio: 1.5, forca: 0.34 },
    },
    {
      id: 'cais_madeira_pesca_enseada', nome: 'CAIS DA ENSEADA', tipo: 'decoracao', x: 50.0, y: 43.0,
      sprite: 'enseada3_cais_barco', spriteB: 'enseada3_cais_barco', animPeriodo: 0.68,
      useCrop: true, larguraPx: 420, pivotX: 0.5, pivotY: 0.97,
      bloqueia: false, brilho: { cor: '#ffd980', raio: 1.0, forca: 0.16 },
      interacao: { label: 'OBSERVAR A BAÍA DO CAIS', distancia: 1.75 },
    },
    {
      id: 'barco_expedicao_enseada', nome: 'BARCO DE EXPEDIÇÃO', tipo: 'decoracao', x: 52.0, y: 43.0,
      sprite: 'enseada_barco_expedicao', spriteB: 'enseada_barco_expedicao_b', animPeriodo: 0.72,
      useCrop: true, larguraPx: 126, pivotX: 0.5, pivotY: 0.88,
      bloqueia: false, flutuacaoSuave: true, renderizar: false,
      interacao: { label: 'INSPECIONAR BARCO DE EXPEDIÇÃO', distancia: 2.15 },
    },

    // ---- Cardumes em Água Profunda & Sinalização Marítima do Conduto ----
    {
      id: 'cardume_orla_norte', nome: 'CARDUME OESTE', tipo: 'decoracao', x: 0.8, y: 20.5,
      sprite: 'enseada_cardume_vivo', spriteB: 'enseada_cardume_vivo_b', animPeriodo: 0.46,
      useCrop: true, larguraPx: 58, pivotX: 0.5, pivotY: 0.65,
      depthOffset: -1, bloqueia: false, flutuacaoSuave: true, nadoCardume: true,
    },
    {
      id: 'cardume_orla_sul', nome: 'CARDUME LESTE', tipo: 'decoracao', x: 63.5, y: 17.0,
      sprite: 'enseada_cardume_vivo', spriteB: 'enseada_cardume_vivo_b', animPeriodo: 0.48,
      useCrop: true, larguraPx: 60, pivotX: 0.5, pivotY: 0.65,
      depthOffset: -1, bloqueia: false, flutuacaoSuave: true, nadoCardume: true,
    },
    {
      id: 'baliza_mare_boia_1', nome: 'BOIA DE MARÉ', tipo: 'decoracao', x: 30.8, y: 10.6,
      sprite: 'enseada_baliza_boia', spriteB: 'enseada_baliza_boia_b', animPeriodo: 0.6,
      useCrop: true, larguraPx: 50, pivotX: 0.5, pivotY: 0.9,
      bloqueia: false, flutuacaoSuave: true, brilho: { cor: '#5cf7eb', raio: 1.3, forca: 0.3 },
    },
    {
      id: 'baliza_mare_boia_2', nome: 'BOIA DE MARÉ', tipo: 'decoracao', x: 31.0, y: 14.8,
      sprite: 'enseada_baliza_boia', spriteB: 'enseada_baliza_boia_b', animPeriodo: 0.6,
      useCrop: true, larguraPx: 50, pivotX: 0.5, pivotY: 0.9,
      bloqueia: false, flutuacaoSuave: true, brilho: { cor: '#5cf7eb', raio: 1.3, forca: 0.3 },
    },
    {
      id: 'lanterna_marinha_norte', nome: 'LANTERNA MARÍTIMA', tipo: 'decoracao', x: 26.8, y: 9.2,
      sprite: 'enseada_lanterna_marinha', spriteB: 'enseada_lanterna_marinha_b', animPeriodo: 0.64,
      useCrop: true, larguraPx: 56, pivotX: 0.5, pivotY: 0.9,
      bloqueia: false, flutuacaoSuave: true, brilho: { cor: '#6ff7ff', raio: 1.5, forca: 0.38 },
    },
    {
      id: 'lanterna_marinha_sul', nome: 'LANTERNA MARÍTIMA', tipo: 'decoracao', x: 30.6, y: 19.6,
      sprite: 'enseada_lanterna_marinha', spriteB: 'enseada_lanterna_marinha_b', animPeriodo: 0.64,
      useCrop: true, larguraPx: 56, pivotX: 0.5, pivotY: 0.9,
      bloqueia: false, flutuacaoSuave: true, brilho: { cor: '#6ff7ff', raio: 1.5, forca: 0.38 },
    },

    // ---- Relevo Costeiro Encaixado na Borda Norte & Ancoragem do Conduto ----
    relevo('enseada_falesia_norte', 'falesia-selva', 11.4, 7.6, 260, { espelhar: true }),
    {
      id: 'enseada_macico_leste', tipo: 'decoracao', x: 18.2, y: 7.4,
      sprite: 'enseada3_platao_cascata', spriteB: 'enseada3_platao_cascata_b', animPeriodo: 0.7,
      useCrop: true, larguraPx: 760, pivotX: 0.5, pivotY: 0.98, depthOffset: -2,
      bloqueia: false, brilho: { cor: '#45f4f4', raio: 2.2, forca: 0.16 },
    },
    relevo('enseada_pilar_noroeste', 'pilar-palmeiras-a', 6.4, 10.6, 130),
    relevo('enseada_rochas_mar_1', 'rochas-mar', 2.6, 18.2, 54, { espuma: 26, espumaY: -3 }),
    relevo('enseada_rochas_mar_2', 'rochas-mar', 34.4, 19.8, 54, { espelhar: true, espuma: 26, espumaY: -3 }),
    relevo('enseada_rochas_mar_3', 'rochas-mar', 21.8, 35.0, 56, { espuma: 28, espumaY: -3 }),
    // Ilhota rochosa ancorando a base do Conduto da Maré Astral (28.9, 12.1)
    floraDecor('costa', 'ilhota_musgo', 'enseada_recife_conduto_a', 29.2, 11.4, 1.05, { depthOffset: -2 }),
    floraDecor('costa', 'rochas_espuma', 'enseada_recife_conduto_b', 28.4, 12.6, 0.95, { depthOffset: -2 }),

    // ---- Bosquetes & Flora Ancorando Cada Núcleo (sem cobrir objetos nem caminhos) ----
    { id: 'enseada_pedra_leste', tipo: 'decoracao', x: 30, y: 7, sprite: 'costa_rochosa', frame: { col: 1, row: 0 }, useCrop: true, larguraPx: 98, pivotY: 1, bloqueia: false },
    { id: 'enseada_pedra_sul', tipo: 'decoracao', x: 2, y: 10, sprite: 'costa_rochosa', frame: { col: 2, row: 0 }, useCrop: true, larguraPx: 72, pivotY: 1, bloqueia: false },

    // Bosquete apoiando o Pórtico da Praia (atrás/ao lado de 5.0, 15.0)
    tropical('enseada_vegetacao_1', 4.6, 13.4, 3, 94, true),
    tropical('enseada_palmeira_1', 4.4, 16.4, 2, 78),
    tropical('enseada_folhas_1', 5.2, 13.8, 0, 44),
    floraDecor('veg', 'samambaia_clara', 'enseada_flora_1', 5.8, 16.4, 0.85),

    // Bosquete norte e jardim dos arquétipos
    tropical('enseada_vegetacao_2', 14.5, 7.6, 2, 74, true),
    tropical('enseada_vegetacao_3', 20.6, 8.2, 5, 88, true),
    tropical('enseada_palmeira_2', 20.0, 7.8, 2, 74),
    tropical('enseada_folhas_2', 15.2, 8.2, 1, 44),
    tropical('enseada_folhas_3', 21.2, 8.6, 0, 44),
    floraDecor('veg', 'bromelia_grande', 'enseada_flora_3', 11.4, 21.8, 0.85, { depthOffset: -1 }),
    floraDecor('veg', 'flores_roxas', 'enseada_flora_2', 12.8, 21.8, 0.85, { depthOffset: -1 }),

    // Orla sul, lagoa sudeste e extremidade leste
    tropical('enseada_vegetacao_4', 32.0, 29.2, 4, 84, true),
    tropical('enseada_vegetacao_5', 9.2, 31.8, 2, 74, true),
    tropical('enseada_vegetacao_6', 21.2, 32.6, 3, 86, true),
    tropical('enseada_palmeira_3', 25.4, 30.8, 2, 78),
    tropical('enseada_folhas_4', 10.0, 31.2, 0, 42),
    tropical('enseada_folhas_5', 22.0, 31.8, 1, 42),
    floraDecor('veg', 'monstera', 'enseada_flora_4', 25.6, 29.6, 0.85),
    floraDecor('veg', 'flores_azuis', 'enseada_flora_5', 7.0, 24.4, 0.85),
    floraDecor('costa', 'bromelia_gigante', 'enseada_flora_6', 31.6, 28.4, 0.85),
    floraDecor('costa', 'ilhota_musgo', 'enseada_ilhota_1', 2.8, 11.8, 0.85),
    floraDecor('costa', 'rochas_espuma', 'enseada_ilhota_2', 33.4, 8.4, 0.85),

    // Elementos de escala e silhueta fiéis ao mapa master (lote de arte 3.0).
    {
      id: 'enseada3_praca_monolito', tipo: 'decoracao', x: 30.0, y: 27.0,
      sprite: 'enseada3_calcada', useCrop: true, larguraPx: 310,
      pivotX: 0.5, pivotY: 0.92, depthOffset: -1, bloqueia: false,
    },
    {
      id: 'enseada3_mata_oeste_a', tipo: 'decoracao', x: 8.0, y: 32.0,
      sprite: 'enseada3_palmeiral', useCrop: true, larguraPx: 330,
      pivotX: 0.5, pivotY: 0.96, depthOffset: -0.6, bloqueia: false,
    },
    {
      id: 'enseada3_mata_oeste_b', tipo: 'decoracao', x: 9.0, y: 42.0,
      sprite: 'enseada3_palmeiral', useCrop: true, larguraPx: 350,
      pivotX: 0.5, pivotY: 0.96, depthOffset: -0.4, bloqueia: false,
    },
    {
      id: 'enseada3_mata_sul', tipo: 'decoracao', x: 17.0, y: 48.0,
      sprite: 'enseada3_palmeiral', useCrop: true, larguraPx: 330,
      pivotX: 0.5, pivotY: 0.96, depthOffset: -0.4, bloqueia: false,
    },
    {
      id: 'enseada3_mata_leste', tipo: 'decoracao', x: 40.5, y: 25.0,
      sprite: 'enseada3_palmeiral', useCrop: true, larguraPx: 300,
      pivotX: 0.5, pivotY: 0.96, depthOffset: -0.4, bloqueia: false,
    },

    // Dossel tropical e afloramentos do lado leste: a referência tem uma
    // faixa verde contínua, que enquadra o santuário e termina no recife.
    ...[
      ['enseada3_mata_centro_oeste', 18.0, 29.0, 252],
      ['enseada3_mata_centro_leste', 38.0, 30.0, 276],
      ['enseada3_mata_sudoeste', 16.0, 40.0, 258],
      ['enseada3_mata_recife', 49.0, 30.0, 238],
    ].map(([id, x, y, larguraPx]) => ({
      id, tipo: 'decoracao', x, y, sprite: 'enseada3_palmeiral',
      useCrop: true, larguraPx, pivotX: 0.5, pivotY: 0.96,
      depthOffset: -0.35, bloqueia: false,
    })),
    floraDecor('costa', 'rochedo_grande', 'enseada_rochedo_recife_1', 52.0, 25.0, 1.0),
    floraDecor('costa', 'rochedo_palmeira', 'enseada_rochedo_recife_2', 55.0, 27.0, 0.95),
    floraDecor('costa', 'rochedo_bloco', 'enseada_rochedo_recife_3', 58.0, 20.0, 0.9),
    tropical('enseada_ruinas', 19.6, 12.0, 6, 58),
    tropical('enseada_rochas', 12.4, 31.6, 7, 52),
    prop('enseada_arbusto_1', 11.4, 31.8, 3, 0, 44),
    prop('enseada_concha', 13.0, 8.6, 1, 3, 36),

    {
      id: 'arco_conduto_retorno_mare', tipo: 'decoracao', x: 56.0, y: 17.0,
      sprite: 'enseada3_portal_recife', spriteB: 'enseada3_portal_recife', animPeriodo: 0.7,
      useCrop: true, larguraPx: 190, pivotX: 0.5, pivotY: 0.98,
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
