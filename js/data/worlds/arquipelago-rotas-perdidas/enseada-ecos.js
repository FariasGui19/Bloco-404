// Enseada dos Ecos 3.1 — reconstrução em escala de referência (72x64)
// Mantém os acessos antigos enquanto amplia a ilha e introduz áreas próprias
// para o acampamento, o santuário central e a extensa praia sul/leste.
import { buildGround } from '../../ground.js';
import { relevo } from '../../relevo-praia.js';
import { flora } from '../../flora-praia.js';
import { CHAO } from '../../enseada-chao.js';
import { VEGETACAO } from '../../enseada-vegetacao.js';

const COLS = 72;
const ROWS = 64;
// Deslocamento comum à arte da estação, sua porta, paredes e retorno.
const ESTACAO_DX = -2.4;
const ESTACAO_DY = 3.7;

function hash(x, y, seed = 0) {
  let h = Math.imul(x + seed * 131, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const ehTerra = c => c !== undefined && 'SMT'.includes(c);

// Silhueta da costa — traçada sobre a arte de referência, não desenhada a mão.
//
// `tools/tracar-enseada-costa.py` separa mar de terra em
// `assets/source-art/reparo-norte-10/referencia-mestre.png` e devolve o
// contorno em coordenadas de MUNDO (tiles). Arte e jogo usam a mesma projeção
// e a mesma escala de tile, então o contorno entra direto:
//
//     px = 737.5 + 16 * (x - y)      py = -152.75 + 8 * (x + y)
const REF = { cx: 737.5, cy: -152.75, sx: 16, sy: 8 };

const imagemDaGrade = (x, y) => ({
  px: REF.cx + REF.sx * (x - y),
  py: REF.cy + REF.sy * (x + y),
});



// ---------------------------------------------------------------------------
// CHÃO: vem inteiro de `js/data/enseada-chao.js`, traçado da arte de
// referência por `tools/tracar-enseada-chao.py`. Nenhuma célula de terra é
// acrescentada à mão aqui — era exatamente isso (preenchimentos manuais de
// grade, ilhas extras, línguas de areia) que inflava a ilha para fora da
// costa traçada e jogava todo prop para o lugar errado.
// ---------------------------------------------------------------------------
const chaoDaArte = (x, y) => CHAO[y]?.[x] ?? '.';
const ehChaoArte = (x, y) => chaoDaArte(x, y) !== '.';

const grid = Array.from({ length: ROWS }, () => Array(COLS).fill('W'));
for (let y = 0; y < ROWS; y++) {
  for (let x = 0; x < COLS; x++) {
    if (ehChaoArte(x, y)) grid[y][x] = 'S';
  }
}

// Praia larga e caminhável na orla: a célula de terra encostada no mar vira
// areia molhada. É só a franja de 1 célula da própria costa — não muda a
// forma da ilha.
const copia = grid.map(l => [...l]);
for (let y = 0; y < ROWS; y++) {
  for (let x = 0; x < COLS; x++) {
    if (copia[y][x] !== 'S') continue;
    const borda = [[-1, 0], [1, 0], [0, -1], [0, 1]].some(([dx, dy]) => !ehTerra(copia[y + dy]?.[x + dx]));
    if (borda) grid[y][x] = 'M';
  }
}

// Água: rasa junto da costa, funda depois. Só preenche células que o traçado
// deixou como mar.
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

for (let y = 0; y < ROWS; y++) {
  for (let x = 0; x < COLS; x++) {
    if (ehTerra(grid[y][x])) continue;
    const d = distanciaTerra(x, y);
    const flip = hash(x, y, 17) < 0.5;
    if (d <= TAM_RASO) grid[y][x] = flip ? 'Y' : 'y';
    else if (d <= TAM_FUNDO) grid[y][x] = flip ? 'D' : 'd';
    else grid[y][x] = 'X';
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

// Células de GRAMA lidas da referência: o campo verde do miolo, a mata e a
// encosta. A textura de areia pinta grama exatamente nesses tiles, então o
// chão do jogo passa a ter a mesma forma do chão da arte.
const celulasGrama = CHAO.map((linha, y) =>
  [...linha].map((c, x) => (c === 'g' && ehTerra(grid[y]?.[x]) ? 1 : 0)));

// A passagem de pedras das correntes é traçada da referência (as lajes estão
// desenhadas nela). A colisão de chão acompanha as lajes; a água continua
// visível entre elas.
const passarelaCorrentes = new Set();
for (let y = 0; y < ROWS; y++) {
  for (let x = 0; x < COLS; x++) {
    if (grid[y][x] === 'W' && chaoDaArte(x, y) === 's' && y <= 12 && x >= 28 && x <= 40) {
      passarelaCorrentes.add(`${x},${y}`);
    }
  }
}
// A chegada do mar fica sobre a água, no fim da passagem de pedras: o caminho
// caminhável tem de alcançá-la, senão o retorno de barco fica isolado.
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
    // Chão da Enseada é AREIA. A camada global de grama pintava um tapete
    // verde sobre a praia inteira (a "faixa" que aparecia em todos os setores).
    // Grama agora só nasce onde uma `zonasGrama` mandar.
    gramaInterior: false,
    useBackgroundWalls: true,
    sandSprite: 'beach_novas_artes',
    ambiente: { poeira: 18, cor: '#ffd98a' },
  },
  corChao: '#e6c280',
  layout,
  walkMask: ground.walkMask,
  pisos: ground.pisos,
  aguaPraia: rows,
  // Grama por célula, traçada da arte (ver `js/data/enseada-chao.js`).
  celulasGrama,
  passarelaSobreAgua: [...passarelaCorrentes],
  // A grama não vem de mancha elíptica: vem de `celulasGrama`, traçada da
  // referência. A elipse antiga era um retângulo verde por cima da arte.
  zonasGrama: [],
  // Relevo desenhado: a montanha da Estação 66.6 ocupa a célula e o seu
  // próprio chão é pedra. Sem esta máscara a grama do interior subia até a
  // base do penhasco e cortava a piscina da cachoeira em duas.
  // O relevo desenhado (montanha, platô, maciços) já tem o próprio chão na
  // arte; nenhuma máscara extra é aplicada por cima.
  zonasRocha: [],
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
    { id: 'enseada_caranguejo_2', species: 'caranguejo', x: 53.0, y: 33.0 },
    { id: 'enseada_gaivota', species: 'gaivota', x: 23.4, y: 37.0 },
    { id: 'enseada_trinta_reis', species: 'trinta_reis', x: 27.1, y: 35.7 },
    { id: 'enseada_peixes', species: 'peixes', x: 10.9, y: 53.2 },
    { id: 'enseada_tartaruga_1', species: 'tartaruga', x: 4.2, y: 42.5 },
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
    // ---------------------------------------------------------------------
    // VEGETAÇÃO TRAÇADA DA ARTE (`enseada-vegetacao.js`): uma planta por
    // célula de mata da referência. Substitui a mata antiga, que tinha sido
    // posicionada para a geometria anterior e por isso flutuava sobre a
    // praia e amontoava palmeiras em cima do acampamento.
    // ---------------------------------------------------------------------
    ...VEGETACAO.map(([x, y, largura, densidade], i) => ({
      id: `enseada_mata_arte_${i + 1}`, tipo: 'decoracao', x, y,
      sprite: densidade >= 0.55 ? 'enseada_ne_mata_densa' : 'enseada3_palmeiral',
      useCrop: true, larguraPx: largura,
      pivotX: 0.5, pivotY: 0.96, bloqueia: false,
    })),
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
      id: 'enseada_macico_leste', tipo: 'decoracao', x: 18.6 + ESTACAO_DX, y: 18.1 + ESTACAO_DY,
      sprite: 'enseada_estacao_integrada', useCrop: true, larguraPx: 860, cachoeiraViva: true,
      pivotX: 0.5, pivotY: 0.98, camada: 'fundo', ordem: -1,
      bloqueia: false,
    },

    // Vegetação da junção tem pé próprio para entrar no depth sorting.
    {
      id: 'enseada_mata_juncao_estacao', tipo: 'decoracao', x: 22.60, y: 22.60,
      sprite: 'enseada_estacao_mata_juncao', useCrop: true, larguraPx: 210,
      pivotX: 0.5, pivotY: 0.96, bloqueia: true,
      hitbox: { offsetX: -0.38, offsetY: -0.38, width: 0.76, height: 0.76 },
    },

    {
      // Fora do mapa: a mata abaixo do acampamento pertencia à geometria
      // antiga e caía em cima da barraca. Na referência ali é areia.
      id: 'enseada_mata_abaixo_acampamento', tipo: 'decoracao', x: 17.6, y: 29.2,
      sprite: 'enseada3_palmeiral', useCrop: true, larguraPx: 240,
      pivotX: 0.5, pivotY: 0.96, depthOffset: -6, bloqueia: false, oculto: true,
    },
    {
      id: 'enseada_planta_margem_cascata', tipo: 'decoracao', x: 19.8, y: 17.6,
      sprite: 'enseada_estacao_planta_piscina', useCrop: true, larguraPx: 54,
      pivotX: 0.5, pivotY: 0.95, bloqueia: false,
    },
    {
      id: 'enseada_pedras_perto_degraus', tipo: 'decoracao', x: 17.54, y: 30.88,
      sprite: 'enseada_estacao_pedras_degrau', useCrop: true, larguraPx: 48,
      pivotX: 0.5, pivotY: 0.95, bloqueia: false,
    },

    // Colisores discretos ao longo da face do penhasco. Mantêm uma abertura
    // livre na soleira: o portal fica no centro da porta desenhada.
    ...[
      [9.775, 13.754], [12.232, 13.6], [14.536, 13.139],
      [16.839, 13.293], [19.604, 13.6], [20.218, 10.529],
      [22.829, 7.841], [24.288, 7.457], [24.057, 5.076],
    ].map(([x, y], i) => ({
      id: `enseada_parede_estacao_${i + 1}`, tipo: 'decoracao', x: x + ESTACAO_DX, y: y + ESTACAO_DY,
      renderizar: false, bloqueia: true,
      hitbox: { offsetX: -0.487, offsetY: -0.487, width: 0.974, height: 0.974 },
    })),

    // ---- SETOR 2 (Nordeste): mata de transição e borda da falésia ----
    // A referência desenha a franja nordeste como um cordão de mata de
    // transição que separa o areal da Estação 66.6 do mar aberto, salpicado
    // de matacões na borda da falésia. No jogo a faixa era grama chapada: as
    // artes já estavam em `assets/sprites/enseada-norte/`, mas nunca foram
    // registradas nem posicionadas.
    //
    // O cordão fica ao SUL da clareira — subir a mata até a porta fecharia o
    // areal que a referência deixa aberto. Os pares se intercalam (árvore,
    // arbusto, árvore) para não virar parede de árvores.
    // MATA DE TRANSIÇÃO NORTE — o vão entre a biruta do acampamento, os
    // degraus e a piscina da cachoeira da Estação 66.6 fica fechado com
    // palmeiras médias e árvores arredondadas, como na referência.
    ...[
      // [x, y, sprite, larguraPx, espelhar]
      [26.4, 26.6, 'enseada_ne_palmeira', 145, false],
      [28.2, 24.8, 'enseada_camp_ref_arvore', 150, false],
      [27.4, 28.6, 'enseada_ne_palmeira', 132, true],
      [25.6, 24.6, 'enseada_camp_ref_arvore', 155, true],
      [27.0, 22.8, 'enseada_ne_palmeira', 138, false],
      [28.8, 25.2, 'enseada_camp_ref_arvore', 148, true],
      [29.2, 21.6, 'enseada_ne_palmeira', 130, true],
      [30.4, 24.0, 'enseada_ne_arbusto_florido', 92, false],
    ].map(([x, y, sprite, larguraPx, espelhar], i) => ({
      id: `enseada_mata_transicao_norte_${i + 1}`, tipo: 'decoracao', x, y,
      sprite, useCrop: true, larguraPx, espelhar,
      pivotX: 0.5, pivotY: 0.96, depthOffset: -4, bloqueia: false,
    })),
    ...[
      // [x, y, sprite, larguraPx, espelhar]
      [25.0, 24.6, 'enseada_ne_mata_densa', 250, false],
      [28.4, 23.6, 'enseada_ne_arbusto_florido', 96, true],
      [31.4, 24.2, 'enseada_ne_mata_densa', 215, true],
      [35.0, 24.0, 'enseada_ne_arbusto_florido', 88, false],
      [38.4, 25.0, 'enseada_ne_mata_densa', 195, false],
      [41.6, 26.6, 'enseada_ne_arbusto_florido', 80, true],
      [44.4, 28.6, 'enseada_ne_palmeira', 150, false],
      [46.6, 30.8, 'enseada_ne_palmeira', 120, true],
    ].map(([x, y, sprite, larguraPx, espelhar], i) => ({
      id: `enseada_ne_mata_${i + 1}`, tipo: 'decoracao', x, y,
      sprite, useCrop: true, larguraPx, espelhar,
      pivotX: 0.5, pivotY: 0.96, depthOffset: -4, bloqueia: false,
    })),
    ...[
      [30.0, 27.2, 96], [34.2, 27.6, 78], [38.2, 28.4, 88],
      [42.2, 29.8, 72],
    ].map(([x, y, larguraPx], i) => ({
      id: `enseada_ne_matacao_${i + 1}`, tipo: 'decoracao', x, y,
      sprite: 'enseada_ne_matacao', useCrop: true, larguraPx,
      pivotX: 0.5, pivotY: 0.92, bloqueia: false,
    })),

    // Falésia leste: a referência termina o planalto num paredão que cai
    // direto no mar. Sem isso a franja nordeste acaba em grama chapada e o
    // mar parece começar do nada.
    ...[
      // [x, y, sprite, larguraPx]
      [44.0, 24.2, 'enseada_ne_penhasco', 230],
      [46.6, 21.4, 'enseada_ne_penhasco', 190],
    ].map(([x, y, sprite, larguraPx], i) => ({
      id: `enseada_ne_falesia_${i + 1}`, tipo: 'decoracao', x, y,
      sprite, useCrop: true, larguraPx,
      pivotX: 0.5, pivotY: 0.94, camada: 'fundo', ordem: -1, bloqueia: false,
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
      // Mesa isométrica desenhada em `tools/desenhar-enseada-setor1.py` a
      // partir da silhueta medida na referência (grama, clareira de areia,
      // paredão e degraus). O ponto de encaixe é a base do paredão.
      id: 'enseada_terraco_acampamento', tipo: 'decoracao',
      x: 22.63, y: 44.59,
      sprite: 'enseada_setor1_plato', useCrop: true, larguraPx: 786,
      pivotX: 0.5, pivotY: 1,
      // Camada de fundo: a mesa é o chão do setor e entra antes dos
      // equipamentos, então nenhum prop é recoberto pela grama.
      camada: 'fundo', ordem: -2, bloqueia: false,
    },
    {
      id: 'relogio_mare_enseada', nome: 'RELÓGIO DE MARÉ SOLAR', tipo: 'dispositivo', x: 11.81, y: 38.53,
      sprite: 'enseada_camp_ref_relogio', animPeriodo: 0.6,
      useCrop: true, larguraPx: 64, pivotX: 0.5, pivotY: 0.98,
      bloqueia: true, hitbox: { offsetX: -0.22, offsetY: -0.22, width: 0.44, height: 0.44 },
      brilho: { cor: '#ffd980', raio: 1.15, forca: 0.25 },
      interacao: { label: 'SINTONIZAR CLIMA E MARÉ', distancia: 1.55 },
    },
    {
      id: 'torre_antena_enseada', nome: 'TORRE-ANTENA DE ESCUTA', tipo: 'dispositivo', x: 11.97, y: 29.62,
      sprite: 'enseada_camp_ref_torre_radio', animPeriodo: 0.5,
      useCrop: true, larguraPx: 100, pivotX: 0.5, pivotY: 0.98,
      bloqueia: true, hitbox: { offsetX: -0.30, offsetY: -0.28, width: 0.6, height: 0.56 },
      pulsoAntena: true, brilho: { cor: '#ff7e71', raio: 0.9, forca: 0.2 },
      interacao: { label: 'SINTONIZAR TORRE-ANTENA', distancia: 1.55 },
    },
    {
      id: 'bancada_campo_enseada', nome: 'BANCADA DE CAMPO', tipo: 'dispositivo', x: 14.31, y: 34.78,
      sprite: 'enseada_camp_ref_bancada', animPeriodo: 0.58,
      useCrop: true, larguraPx: 116, pivotX: 0.5, pivotY: 0.98,
      bloqueia: true, hitbox: { offsetX: -0.58, offsetY: -0.38, width: 1.16, height: 0.76 },
      brilho: { cor: '#74ff8a', raio: 1.2, forca: 0.26 },
      interacao: { label: 'CALIBRAR MÓDULO NA BANCADA', distancia: 1.7 },
    },
    {
      id: 'acampamento_vigilia_enseada', nome: 'ACAMPAMENTO DE VIGÍLIA', tipo: 'decoracao', x: 22.59, y: 32.75,
      sprite: 'enseada_camp_ref_fogueira', animPeriodo: 0.42,
      useCrop: true, larguraPx: 89, pivotX: 0.5, pivotY: 0.98,
      bloqueia: true, hitbox: { offsetX: -0.30, offsetY: -0.24, width: 0.60, height: 0.48 },
      fogueiraViva: true, brilho: { cor: '#ffae52', raio: 1.25, forca: 0.28 },
      interacao: { label: 'DESCANSAR NA FOGUEIRA', distancia: 1.6 },
    },
    {
      id: 'tenda_expedicao_enseada', nome: 'TENDA DA EXPEDIÇÃO', tipo: 'decoracao', x: 18.69, y: 29.78,
      sprite: 'enseada_camp_ref_tenda_referencia', useCrop: true, larguraPx: 213,
      pivotX: 0.5, pivotY: 0.98,
      bloqueia: true, hitbox: { offsetX: -0.48, offsetY: -0.34, width: 0.96, height: 0.68 },
      interacao: { label: 'INSPECIONAR TENDA DA EXPEDIÇÃO', distancia: 1.6, speaker: 'TENDA DA EXPEDIÇÃO',
        dialogue: ['A LONA GUARDA MAPAS, ROLOS DE CORDA E UM COBERTOR DOBRADO. A EXPEDIÇÃO ESTÁ EM PLENA ATIVIDADE.'] },
    },
    {
      id: 'maleta_expedicao_enseada', nome: 'MALETA DA EXPEDIÇÃO', tipo: 'dispositivo', x: 20.88, y: 31.34,
      sprite: 'enseada_camp_ref_pilha_caixas', animPeriodo: 0.56,
      useCrop: true, larguraPx: 132, pivotX: 0.5, pivotY: 0.98,
      bloqueia: true, hitbox: { offsetX: -0.38, offsetY: -0.32, width: 0.76, height: 0.64 },
      pulsoAntena: true, brilho: { cor: '#ff9a5c', raio: 1.0, forca: 0.22 },
      interacao: { label: 'ABRIR MALETA DA EXPEDIÇÃO', distancia: 1.55 },
    },
    {
      id: 'bandeirola_vento_enseada', nome: 'BIRUTA DA EXPEDIÇÃO', tipo: 'decoracao', x: 20.56, y: 28.53,
      sprite: 'enseada_biruta_camp',
      useCrop: true, larguraPx: 75, pivotX: 0.5, pivotY: 0.94,
      depthOffset: 3, bloqueia: false, oscilaBrisa: true,
    },

    // Vegetação de fundo e pequenos objetos independentes, sem recobrir
    // a entrada da tenda. As coordenadas são as dos pés dos sprites.
    {
      id: 'enseada_arvore_camp_esquerda', tipo: 'decoracao', x: 10.41, y: 22.44,
      sprite: 'enseada_camp_ref_arvore', useCrop: true, larguraPx: 159,
      pivotX: 0.5, pivotY: 0.98, bloqueia: false,
    },
    {
      id: 'enseada_arvore_camp_direita', tipo: 'decoracao', x: 13.53, y: 20.56,
      sprite: 'enseada_camp_ref_arvore', useCrop: true, espelhar: true, larguraPx: 136,
      pivotX: 0.5, pivotY: 0.98, bloqueia: false,
    },
    {
      id: 'enseada_cesto_ferramentas_camp', tipo: 'decoracao', x: 13.19, y: 38.66,
      sprite: 'enseada_camp_ref_cesto_ferramentas', useCrop: true, larguraPx: 77,
      pivotX: 0.5, pivotY: 0.98, bloqueia: false,
    },
    {
      id: 'enseada_caixa_atras_tenda', tipo: 'decoracao', x: 14.94, y: 29.78,
      sprite: 'enseada_camp_ref_caixa', useCrop: true, larguraPx: 62,
      pivotX: 0.5, pivotY: 0.98, bloqueia: true,
      hitbox: { offsetX: -0.20, offsetY: -0.20, width: 0.4, height: 0.4 },
    },
    {
      // O caixote solto fica entre a fogueira e a pilha, na referência.
      id: 'enseada_caixote_camp', tipo: 'decoracao', x: 16.34, y: 35.88,
      sprite: 'enseada_camp_ref_caixa', useCrop: true, larguraPx: 44,
      pivotX: 0.5, pivotY: 0.98, bloqueia: true,
      hitbox: { offsetX: -0.15, offsetY: -0.15, width: 0.3, height: 0.3 },
    },

    // Assento e palmeiras do acampamento: peças independentes da área jogável.
    {
      // Degraus de pedra logo abaixo da fogueira/tronco, como na referência:
      // a escada que vinha embutida no platô ficava na extrema direita, sob a
      // pilha de caixas.
      id: 'enseada_escada_camp', tipo: 'decoracao', x: 22.6, y: 38.1,
      sprite: 'enseada_camp_escada', useCrop: true, larguraPx: 210,
      pivotX: 0.5, pivotY: 0.94, bloqueia: false,
    },
    {
      // Movido para sudoeste: o terminal de manutencao senta em (18.5, 38.1)
      // e o banco, na posicao antiga, cobria o aparelho.
      id: 'enseada_banco_tronco_camp', tipo: 'decoracao', x: 19.16, y: 37.44,
      sprite: 'enseada_camp_ref_tronco', useCrop: true, larguraPx: 112,
      pivotX: 0.5, pivotY: 0.98, bloqueia: false,
    },
    {
      id: 'enseada_palmeira_camp_oeste', tipo: 'decoracao', x: 8.1, y: 30.1,
      sprite: 'enseada6_palmeira', useCrop: true, larguraPx: 95,
      pivotX: 0.5, pivotY: 0.98, ajusteY: -45, bloqueia: false,
    },
    {
      id: 'enseada_palmeira_camp_norte', tipo: 'decoracao', x: 10.1, y: 29.5,
      sprite: 'enseada6_palmeira', useCrop: true, larguraPx: 95,
      pivotX: 0.5, pivotY: 0.98, ajusteY: -80, depthOffset: -4, bloqueia: false,
    },

    // ---- SETOR 3 (Oeste): Pórtico + bosques ----
    {
      id: 'portico_trilha_praia', nome: 'PÓRTICO DA TRILHA', tipo: 'decoracao', x: 12.12, y: 50.72,
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

    // ---- SETOR 4 (Centro): Monólito + estela + cairn ----
    {
      id: 'totem_eco_enseada', nome: 'MONÓLITO DE ECO', tipo: 'decoracao', x: 31.72, y: 34.25,
      sprite: 'enseada3_monolito', spriteB: 'enseada3_monolito', animPeriodo: 0.52,
      useCrop: true, larguraPx: 220, pivotX: 0.5, pivotY: 0.98,
      bloqueia: false, pulsoTotem: true, brilho: { cor: '#52f6ff', raio: 1.4, forca: 0.32 },
      interacao: { label: 'EXAMINAR MONÓLITO DE ECO', distancia: 1.5 },
    },
    {
      id: 'estela_navegadores_enseada', nome: 'ESTELA DOS NAVEGADORES', tipo: 'decoracao', x: 29.62, y: 34.47,
      sprite: 'enseada8_estela', spriteB: 'enseada8_estela', animPeriodo: 0.62,
      useCrop: true, larguraPx: 70, pivotX: 0.5, pivotY: 0.92,
      bloqueia: false, pulsoBiolum: '#6cf7ff', brilho: { cor: '#6cf7ff', raio: 1.35, forca: 0.3 },
      interacao: { label: 'DECIFRAR A ESTELA DOS NAVEGADORES', distancia: 1.6 },
    },
    {
      id: 'jardim_pedras_enseada', nome: 'PEDRAS DO EQUILÍBRIO', tipo: 'decoracao', x: 33.38, y: 30.09,
      sprite: 'enseada4_cairn', spriteB: 'enseada4_cairn', animPeriodo: 0.64,
      useCrop: true, larguraPx: 80, pivotX: 0.5, pivotY: 0.98,
      bloqueia: true, hitbox: { offsetX: -0.30, offsetY: -0.24, width: 0.60, height: 0.48 },
      oscilaBrisa: true,
      interacao: { label: 'MEDITAR NAS PEDRAS DO EQUILÍBRIO', distancia: 1.55 },
    },
    {
      id: 'borboletas_fonte_enseada', nome: 'BORBOLETAS DO CENTRO', tipo: 'decoracao', x: 29.31, y: 32.28,
      sprite: 'enseada_borboletas_vivas', spriteB: 'enseada_borboletas_vivas_b', animPeriodo: 0.34,
      useCrop: true, larguraPx: 50, pivotX: 0.5, pivotY: 0.5,
      bloqueia: false, flutuacaoSuave: true, nadoCardume: true,
    },

    // ---- SETOR 5 (Sudoeste): Piscina + espelho + grutas + rede ----
    {
      id: 'piscina_mare_viva_enseada', nome: 'PISCINA TERMAL', tipo: 'decoracao', x: 30.56, y: 52.28,
      sprite: 'enseada3_piscina_termal', useCrop: true, larguraPx: 300,
      pivotX: 0.5, pivotY: 0.90, vaporTermal: true,
      bloqueia: false, pulsoBiolum: '#5cf7eb', brilho: { cor: '#5cf7eb', raio: 1.25, forca: 0.26 },
      interacao: { label: 'MERGULHAR AS MÃOS NA ÁGUA TERMAL', distancia: 1.65 },
    },
    {
      // A capivara da referência, sentada dentro da piscina termal.
      id: 'capivara_piscina_enseada', nome: 'CAPIVARA', tipo: 'fauna', x: 27.9, y: 49.9,
      sprite: 'enseada3_capivara', useCrop: true, larguraPx: 42,
      pivotX: 0.5, pivotY: 0.97, depthOffset: 1, bloqueia: false,
    },
    {
      // A pequena fonte de cristal azul da referência, abaixo da piscina.
      id: 'fonte_cristal_enseada', nome: 'FONTE DE CRISTAL', tipo: 'decoracao', x: 37.44, y: 55.41,
      sprite: 'enseada3_fonte_cristal', useCrop: true, larguraPx: 78,
      pivotX: 0.5, pivotY: 0.95, bloqueia: true,
      hitbox: { offsetX: -0.26, offsetY: -0.26, width: 0.52, height: 0.52 },
      pulsoBiolum: '#7fe3ff', brilho: { cor: '#7fe3ff', raio: 0.9, forca: 0.22 },
    },
    {
      id: 'enseada3_praca_espelho', tipo: 'decoracao', x: 35.72, y: 49.62,
      sprite: 'enseada3_calcada', useCrop: true, larguraPx: 340,
      pivotX: 0.5, pivotY: 0.92, depthOffset: -1, bloqueia: false,
    },
    {
      id: 'espelho_arquetipos_enseada', nome: 'ESPELHO DE RESSONÂNCIA', tipo: 'dispositivo', x: 35.72, y: 49.62,
      sprite: 'enseada_espelho_arquetipo', spriteB: 'enseada_espelho_arquetipo_b', animPeriodo: 0.56,
      useCrop: true, larguraPx: 190, pivotX: 0.5, pivotY: 0.95,
      bloqueia: false, brilho: { cor: '#6ff7ff', raio: 1.5, forca: 0.34 },
      interacao: { label: 'SINTONIZAR ARQUÉTIPO', distancia: 1.65 },
    },
    {
      // A referência desenha a Concha Gigante como monumento da praia oeste,
      // com a boca de cristais na altura de um personagem — não como toca.
      id: 'gruta_concha_enseada', nome: 'CONCHA GIGANTE', tipo: 'decoracao', x: 25.88, y: 50.09,
      sprite: 'enseada8_gruta', spriteB: 'enseada8_gruta', animPeriodo: 0.66,
      useCrop: true, larguraPx: 250, pivotX: 0.5, pivotY: 0.98,
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
      id: 'rede_treino_praia_enseada', nome: 'REDE DE TREINO DA PRAIA', tipo: 'decoracao', x: 42.75, y: 51.34,
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
      id: 'portal_submarino_sul', tipo: 'decoracao', x: 46.34, y: 19.62,
      sprite: 'enseada8_portal_ne', useCrop: true, larguraPx: 150,
      pivotX: 0.5, pivotY: 0.94, depthOffset: -6, bloqueia: true,
      hitbox: { offsetX: -0.30, offsetY: -0.30, width: 0.60, height: 0.60 },
      nome: 'PORTAL SUBMARINO DE CORAL',
    },
    {
      id: 'portal_submarino_fundo', tipo: 'decoracao', x: 34.0, y: 3.22,
      sprite: 'enseada4_portal_submarino', useCrop: true, larguraPx: 130,
      pivotX: 0.5, pivotY: 0.96, depthOffset: -6, bloqueia: false,
      nome: 'PORTA DE CORAL',
    },
    {
      id: 'orla_rochas_sul', tipo: 'decoracao', x: 43.0, y: 55.5,
      sprite: 'enseada4_orla_rochas', useCrop: true, larguraPx: 96,
      pivotX: 0.5, pivotY: 0.96, bloqueia: false,
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
      id: 'cais_madeira_pesca_enseada', nome: 'CAIS DA ENSEADA', tipo: 'decoracao', x: 50.2, y: 43.0,
      sprite: 'enseada8_cais_barco_ref', spriteB: 'enseada8_cais_barco_ref', animPeriodo: 0.68,
      useCrop: true, larguraPx: 280, pivotX: 0.5, pivotY: 0.97,
      bloqueia: false, renderizar: false, brilho: { cor: '#ffd980', raio: 1.0, forca: 0.16 },
      interacao: { label: 'OBSERVAR A BAÍA DO CAIS', distancia: 1.75 },
    },
    {
      id: 'barco_expedicao_enseada', nome: 'BARCO DE EXPEDIÇÃO', tipo: 'decoracao', x: 55.25, y: 41.34,
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
      id: 'enseada_jardim_cercado', tipo: 'decoracao', x: 39.0, y: 30.09,
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
      id: 'acesso_estacao_666', tipo: 'door', x: 18.259 + ESTACAO_DX, y: 13.370 + ESTACAO_DY, label: 'ENTRAR NA ESTAÇÃO 66.6',
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
