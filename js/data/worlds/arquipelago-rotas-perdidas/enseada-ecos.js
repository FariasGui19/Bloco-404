// Enseada dos Ecos 3.1 — reconstrução em escala de referência (72x64)
// Mantém os acessos antigos enquanto amplia a ilha e introduz áreas próprias
// para o acampamento, o santuário central e a extensa praia sul/leste.
import { buildGround } from '../../ground.js';
import { relevo } from '../../relevo-praia.js';
import { flora } from '../../flora-praia.js';
import { CHAO } from '../../enseada-chao.js';
import { VEGETACAO, SPRITES_VEGETACAO } from '../../enseada-vegetacao.js';

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
    ocultarCordaoBoias: true,
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
  // Desenho local lido na referência: apenas a cor do chão do quadrante oeste.
  ajusteSolo: {
    ...REF,
    area: [[0, 140], [155, 140], [210, 270], [275, 312], [540, 320], [575, 380], [655, 480], [665, 555], [600, 605], [500, 605], [20, 605]],
    grama: [
      // Corredor abaixo da calçada, dos bambus aos coqueiros da gruta.
      [[156, 378], [222, 372], [300, 376], [370, 378], [435, 365], [500, 363],
       [530, 388], [535, 434], [515, 449], [490, 455], [466, 456], [438, 450], [414, 440],
       [390, 452], [365, 448], [337, 445], [307, 448], [267, 465], [219, 467], [171, 453]],
      // Grama apenas ao redor do piso do espelho, não sobre a praia.
      [[455, 518], [472, 501], [510, 496], [542, 507], [560, 524], [555, 548], [538, 564], [485, 562], [455, 546]],
      // Pequeno canteiro junto à ostra, sem avançar sobre o píer.
      [[615, 520], [632, 515], [651, 526], [654, 545], [643, 558], [623, 558], [612, 544]],
      // Vegetação encostada à face ocidental do paredão e junto ao sino.
      [[174, 348], [181, 336], [197, 329], [230, 323], [305, 331], [390, 343], [400, 372], [353, 386],
       [270, 385], [211, 390], [178, 380], [166, 368]],
    ],
  },
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
      x: 28.3, y: 51.65, rx: 1.45, ry: 1.15,
      profundidade: 0.45,
      treino: true, renderizar: false, ocultarMarcador: true,
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

  trainingTargets: [],

  hazards: [
    { id: 'eco_instavel_oeste', x: 10.7, y: 41.2, radius: 0.9, damage: 9, interval: 1.3 },
    { id: 'eco_instavel_leste', x: 37.4, y: 40.4, radius: 1.0, damage: 12, interval: 1.5 },
  ],

  fauna: [
    // Os DOIS caranguejos-vermelhos da arte: os únicos bichos da espécie no
    // mapa, na areia da praia leste, perto do veleiro e do píer
    // (pôster 1042,535 e 1072,523). O que estava na areia do sudeste e o da
    // escada do acampamento não existem na referência.
    { id: 'enseada_caranguejo_areia_1', species: 'caranguejo', x: 53.0, y: 33.06 },
    { id: 'enseada_caranguejo_areia_2', species: 'caranguejo', x: 53.19, y: 31.16 },
    { id: 'enseada_gaivota', species: 'gaivota', x: 23.4, y: 37 },
    { id: 'enseada_trinta_reis', species: 'trinta_reis', x: 27.1, y: 35.7 },
    { id: 'enseada_peixes', species: 'peixes', x: 10.9, y: 53.2 },
    { id: 'enseada_tartaruga_1', species: 'tartaruga', x: 4.2, y: 42.5 },
    { id: 'enseada_golfinho_1', species: 'golfinho', x: 50.4, y: 12.4 },
    { id: 'enseada_golfinho_oeste', species: 'golfinho', x: 2.5, y: 30.5 },
    { id: 'enseada_golfinho_leste', species: 'golfinho', x: 60.5, y: 38.5 },
    // Golfinhos saltando junto ao píer e à laje das pedras rúnicas, como a
    // arte desenha no canto sudeste.
    { id: 'enseada_golfinho_cais', species: 'golfinho', x: 52, y: 57 },
    { id: 'enseada_golfinho_ponta', species: 'golfinho', x: 55, y: 54 },
    // Tartaruga cruzando a água rasa do embarcadouro.
    { id: 'enseada_tartaruga_cais', species: 'tartaruga', x: 53, y: 55 },
    // Cardume no canto sudeste, girando perto das boias do conduto.
    { id: 'enseada_cardume_sudeste', species: 'peixes', x: 55, y: 50 },
    { id: 'enseada_capivara', species: 'capivara', x: 28.0, y: 51.05, calma: true, submersa: true, raioPasseio: 0.16, depthOffset: 2,
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
    // VEGETAÇÃO LIDA À MÃO NA ARTE (`enseada-vegetacao.js`): cada entrada é um
    // grupo com palmeira alta, palmeira de copa cheia, palmeira baixa, jovem,
    // árvore frondosa, moita ou arbusto florido, na posição em que ele aparece
    // no pôster. O gerador automático foi desligado — ele repetia o mesmo
    // sprite em blocos quadrados e plantava palmeiras em cima da cachoeira e
    // da placa "ESTAÇÃO 66.6".
    // ---------------------------------------------------------------------
    ...VEGETACAO.map(([tipo, x, y, largura], i) => ({
      id: `enseada_vegetacao_${i + 1}`, tipo: 'decoracao', x, y,
      sprite: SPRITES_VEGETACAO[tipo], useCrop: true, larguraPx: largura,
      pivotX: 0.5, pivotY: 0.96, bloqueia: false,
      // Palmeira e árvore de tronco: ordena pelo pé (a copa pode passar na
      // frente de quem anda atrás dela, como na arte).
      depthOffset: ['P', 'M', 'B', 'J', 'C', 'T', 'G'].includes(tipo) ? -0.35 : -0.2,
    })),
    // ---- Terminal (função preservada) ----
    {
      id: 'terminal_frequencia_666', nome: 'TERMINAL DE MANUTENÇÃO', tipo: 'painel', x: 15.2, y: 36.8,
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

    // Fragmentos baixos quebram a borda reta do maciço, sem tocar a porta.
    ...[[8.9, 26.8, 65], [10.0, 25.8, 48], [11.2, 24.9, 55]].map(([x, y, larguraPx], i) => ({
      id: `enseada_base_estacao_rochas_${i + 1}`, tipo: 'decoracao', x, y,
      sprite: 'enseada_estacao_pedras_degrau', useCrop: true, larguraPx,
      pivotX: 0.5, pivotY: 0.95, camada: 'fundo', ordem: 0, bloqueia: false,
    })),

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
      [27.4, 28.6, 'enseada_ne_palmeira', 132, true],
      [30.4, 24.0, 'enseada_ne_arbusto_florido', 92, false],
    ].map(([x, y, sprite, larguraPx, espelhar], i) => ({
      id: `enseada_mata_transicao_norte_${i + 1}`, tipo: 'decoracao', x, y,
      sprite, useCrop: true, larguraPx, espelhar,
      pivotX: 0.5, pivotY: 0.96, depthOffset: -4, bloqueia: false,
    })),
    ...[
      // [x, y, sprite, larguraPx, espelhar]
      [28.4, 23.6, 'enseada_ne_arbusto_florido', 96, true],
      [35.0, 24.0, 'enseada_ne_arbusto_florido', 88, false],
      [38.4, 25.0, 'enseada_ne_mata_densa', 195, false],
      [41.6, 26.6, 'enseada_ne_arbusto_florido', 80, true],
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
      // As duas falesias que ficavam ATRÁS do portal sudeste saíram: a arte
      // tem uma só massa rochosa ali (o promontório recortado da referência),
      // e as peças antigas apareciam como uma rocha cinza encavalada.
    ].map(([x, y, sprite, larguraPx], i) => ({
      id: `enseada_ne_falesia_${i + 1}`, tipo: 'decoracao', x, y,
      sprite, useCrop: true, larguraPx,
      pivotX: 0.5, pivotY: 0.94, camada: 'fundo', ordem: -1, bloqueia: false,
    })),

    // ---- Trilha de pedras: pórtico → espelho → cais (uma linha, sem ramal duplo) ----
    // Traçado da calçada contínua da arte (pórtico → clareira central): a peça
    // `calcada_central_enseada` já é a faixa inteira, então NÃO se espalham
    // pedrinhas soltas por cima da piscina, da laje do espelho nem do gramado.


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
      // Platô elevado do acampamento, medido no pôster: a borda de grama corre
      // de (250,285) até (720,320) e o paredão de rocha desce ~50 px até o
      // chão. A peça usada antes era uma laje de pedrinhas miúdas sem altura
      // nenhuma — por isso o acampamento lia como adesivo plano colado na
      // grama. `plato-sem-escada` é o mesmo terraço com grama, clareira de
      // areia e o paredão de blocos na frente (a escada sai como objeto
      // próprio, embutida no paredão, logo abaixo da fogueira).
      // `escalaY` comprime só a altura: a arte do platô é mais redonda que a
      // do pôster, que é um terraço achatado.
      x: 14.74, y: 44.80,
      sprite: 'enseada_setor1_plato_v3', useCrop: true, larguraPx: 826, escalaY: 0.45,
      pivotX: 0.04, pivotY: 0.90, skewY: 0.05,
      camada: 'fundo', ordem: -1, bloqueia: false,
    },
    {
      id: 'relogio_mare_enseada', nome: 'RELÓGIO DE MARÉ SOLAR', tipo: 'dispositivo', x: 12.19, y: 38.16,
      sprite: 'enseada_camp_ref_relogio', animPeriodo: 0.6,
      useCrop: true, larguraPx: 64, pivotX: 0.5, pivotY: 0.98,
      bloqueia: true, hitbox: { offsetX: -0.22, offsetY: -0.22, width: 0.44, height: 0.44 },
      brilho: { cor: '#ffd980', raio: 1.15, forca: 0.25 },
      interacao: { label: 'SINTONIZAR CLIMA E MARÉ', distancia: 1.55 },
    },
    {
      id: 'torre_antena_enseada', nome: 'TORRE-ANTENA DE ESCUTA', tipo: 'dispositivo', x: 15.09, y: 33.13,
      sprite: 'enseada_camp_ref_torre_radio', animPeriodo: 0.5,
      useCrop: true, larguraPx: 100, pivotX: 0.5, pivotY: 0.98,
      bloqueia: true, hitbox: { offsetX: -0.30, offsetY: -0.28, width: 0.6, height: 0.56 },
      pulsoAntena: true, brilho: { cor: '#ff7e71', raio: 0.9, forca: 0.2 },
      interacao: { label: 'SINTONIZAR TORRE-ANTENA', distancia: 1.55 },
    },
    {
      id: 'bancada_campo_enseada', nome: 'BANCADA DE CAMPO', tipo: 'dispositivo', x: 15.13, y: 36.22,
      sprite: 'enseada_camp_ref_bancada', animPeriodo: 0.58,
      useCrop: true, larguraPx: 116, pivotX: 0.5, pivotY: 0.98,
      bloqueia: true, hitbox: { offsetX: -0.58, offsetY: -0.38, width: 1.16, height: 0.76 },
      brilho: { cor: '#74ff8a', raio: 1.2, forca: 0.26 },
      interacao: { label: 'CALIBRAR MÓDULO NA BANCADA', distancia: 1.7 },
    },
    {
      id: 'acampamento_vigilia_enseada', nome: 'ACAMPAMENTO DE VIGÍLIA', tipo: 'decoracao', x: 18.31, y: 34.78,
      sprite: 'enseada_camp_ref_fogueira', animPeriodo: 0.42,
      useCrop: true, larguraPx: 89, pivotX: 0.5, pivotY: 0.98,
      bloqueia: true, hitbox: { offsetX: -0.30, offsetY: -0.24, width: 0.60, height: 0.48 },
      fogueiraViva: true, brilho: { cor: '#ffae52', raio: 1.25, forca: 0.28 },
      interacao: { label: 'DESCANSAR NA FOGUEIRA', distancia: 1.6 },
    },
    {
      id: 'tenda_expedicao_enseada', nome: 'TENDA DA EXPEDIÇÃO', tipo: 'decoracao', x: 18.31, y: 31.41,
      sprite: 'enseada_camp_ref_tenda_referencia', useCrop: true, larguraPx: 213,
      pivotX: 0.5, pivotY: 0.98,
      bloqueia: true, hitbox: { offsetX: -0.48, offsetY: -0.34, width: 0.96, height: 0.68 },
      interacao: { label: 'INSPECIONAR TENDA DA EXPEDIÇÃO', distancia: 1.6, speaker: 'TENDA DA EXPEDIÇÃO',
        dialogue: ['A LONA GUARDA MAPAS, ROLOS DE CORDA E UM COBERTOR DOBRADO. A EXPEDIÇÃO ESTÁ EM PLENA ATIVIDADE.'] },
    },
    {
      id: 'maleta_expedicao_enseada', nome: 'MALETA DA EXPEDIÇÃO', tipo: 'dispositivo', x: 21.38, y: 31.34,
      sprite: 'enseada_camp_ref_pilha_caixas', animPeriodo: 0.56,
      useCrop: true, larguraPx: 132, pivotX: 0.5, pivotY: 0.98,
      bloqueia: true, hitbox: { offsetX: -0.38, offsetY: -0.32, width: 0.76, height: 0.64 },
      pulsoAntena: true, brilho: { cor: '#ff9a5c', raio: 1.0, forca: 0.22 },
      interacao: { label: 'ABRIR MALETA DA EXPEDIÇÃO', distancia: 1.55 },
    },
    {
      id: 'bandeirola_vento_enseada', nome: 'BIRUTA DA EXPEDIÇÃO', tipo: 'decoracao', x: 22.13, y: 28.22,
      sprite: 'enseada_biruta_camp',
      useCrop: true, larguraPx: 75, pivotX: 0.5, pivotY: 0.94,
      depthOffset: 3, bloqueia: false, oscilaBrisa: true,
    },

    // Vegetação de fundo e pequenos objetos independentes, sem recobrir
    // a entrada da tenda. As coordenadas são as dos pés dos sprites.
    {
      id: 'enseada_arvore_camp_esquerda', tipo: 'decoracao', x: 11.94, y: 28.03,
      sprite: 'enseada_camp_ref_arvore', useCrop: true, larguraPx: 159,
      pivotX: 0.5, pivotY: 0.98, bloqueia: false,
    },
    {
      id: 'enseada_arvore_camp_direita', tipo: 'decoracao', x: 12.88, y: 27.72,
      sprite: 'enseada_camp_ref_arvore', useCrop: true, espelhar: true, larguraPx: 136,
      pivotX: 0.5, pivotY: 0.98, bloqueia: false,
    },
    {
      id: 'enseada_cesto_ferramentas_camp', tipo: 'decoracao', x: 13.97, y: 36.00,
      sprite: 'enseada_camp_ref_cesto_ferramentas', useCrop: true, larguraPx: 77,
      pivotX: 0.5, pivotY: 0.98, bloqueia: false,
    },
    {
      id: 'enseada_caixa_atras_tenda', tipo: 'decoracao', x: 20.16, y: 29.56,
      sprite: 'enseada_camp_ref_caixa', useCrop: true, larguraPx: 62,
      pivotX: 0.5, pivotY: 0.98, bloqueia: true,
      hitbox: { offsetX: -0.20, offsetY: -0.20, width: 0.4, height: 0.4 },
    },
    {
      // O caixote solto fica entre a fogueira e a tenda, logo atrás da
      // fogueira na arte medida (500, 258) — não entre bancada e fogueira.
      id: 'enseada_caixote_camp', tipo: 'decoracao', x: 20.16, y: 32.94,
      sprite: 'enseada_camp_ref_caixa', useCrop: true, larguraPx: 44,
      pivotX: 0.5, pivotY: 0.98, bloqueia: true,
      hitbox: { offsetX: -0.15, offsetY: -0.15, width: 0.3, height: 0.3 },
    },

    // Assento e palmeiras do acampamento: peças independentes da área jogável.
    {
      // Degraus de pedra EMBUTIDOS no paredão do platô, logo abaixo da
      // fogueira e do tronco, sobre a borda frontal do terraço.
      id: 'enseada_escada_camp', tipo: 'decoracao', x: 11.24, y: 41.30,
      sprite: 'enseada_parede_escada', useCrop: true, larguraPx: 826, escalaY: 0.62,
      pivotX: 0.04, pivotY: 0.04, camada: 'fundo', ordem: 0, bloqueia: false,
    },
    {
      // Movido para sudoeste: o terminal de manutencao senta em (18.5, 38.1)
      // e o banco, na posicao antiga, cobria o aparelho.
      id: 'enseada_banco_tronco_camp', tipo: 'decoracao', x: 18.19, y: 37.53,
      sprite: 'enseada_camp_ref_tronco', useCrop: true, larguraPx: 112,
      pivotX: 0.5, pivotY: 0.98, bloqueia: false,
    },
    {
      id: 'enseada_palmeira_camp_oeste', tipo: 'decoracao', x: 12.4, y: 33.4, renderizar: false,
      sprite: 'enseada_ne_palmeira_media', useCrop: true, larguraPx: 92,
      pivotX: 0.5, pivotY: 0.98, bloqueia: false,
    },
    {
      id: 'enseada_palmeira_camp_norte', tipo: 'decoracao', x: 14.4, y: 30.8, renderizar: false,
      sprite: 'enseada_ne_palmeira', useCrop: true, larguraPx: 84,
      pivotX: 0.5, pivotY: 0.98, bloqueia: false,
    },

    // ---- SETOR 3 (Oeste): Pórtico + bosques ----
    {
      id: 'portico_trilha_praia', nome: 'PÓRTICO DA TRILHA', tipo: 'decoracao', x: 16.94, y: 53.96,
      sprite: 'enseada_portico_lateral',
      useCrop: true, larguraPx: 144, escalaY: 0.52, pivotX: 0.5, pivotY: 0.98,
      bloqueia: false, oscilaBrisa: true, brilho: { cor: '#ffb86b', raio: 1.0, forca: 0.16 },
    },
    {
      // Movido para a borda oeste do platô. Em (16.0, 40.0) os dois tubos
      // cruzados do carrilhão caíam exatamente sobre o tronco e liam como
      // "duas toras em X".
      id: 'carrilhao_vento_enseada', nome: 'CARRILHÃO DE VENTO', tipo: 'decoracao', x: 16.2, y: 50.4,
      sprite: 'enseada_sino_oeste_frontal', spriteB: 'enseada_sino_oeste_frontal', animPeriodo: 0.58,
      useCrop: true, larguraPx: 90, pivotX: 0.5, pivotY: 0.96,
      bloqueia: false, oscilaBrisa: true,
      interacao: { label: 'OUVIR O CARRILHÃO', distancia: 1.55 },
    },

    // Calçada do pórtico até a escada; depois continua em areia.
    {
      // Variante recortada com escala e âncora compensadas para preservar
      // o encaixe original no pórtico e terminar ao pé da escada.
      id: 'calcada_central_enseada', tipo: 'decoracao', x: 20.44, y: 48.19,
      sprite: 'enseada_calcada_oeste_escada', useCrop: true,
      larguraPx: 618, pivotX: 0.5, pivotY: 0.5,
      depthOffset: -6, bloqueia: false,
    },

    // ---- SETOR 4 (Centro): Monólito + estela + cairn ----
    {
      // A referência desenha o monólito como laje alta plantada na clareira,
      // não sobre a base/pedestal largo do sprite antigo. O recorte vem da
      // própria arte (`monolito-eco-vertical.png`).
      id: 'totem_eco_enseada', nome: 'MONÓLITO DE ECO', tipo: 'decoracao', x: 32.59, y: 35.75,
      sprite: 'enseada_monolito_vertical', spriteB: 'enseada_monolito_vertical', animPeriodo: 0.52,
      useCrop: true, larguraPx: 62, pivotX: 0.5, pivotY: 0.98,
      bloqueia: true, hitbox: { offsetX: -0.26, offsetY: -0.22, width: 0.52, height: 0.44 },
      pulsoTotem: true, brilho: { cor: '#52f6ff', raio: 1.4, forca: 0.32 },
      interacao: { label: 'EXAMINAR MONÓLITO DE ECO', distancia: 1.5 },
    },
    {
      id: 'estela_navegadores_enseada', nome: 'ESTELA DOS NAVEGADORES', tipo: 'decoracao', x: 30.22, y: 37.25,
      sprite: 'enseada8_estela', spriteB: 'enseada8_estela', animPeriodo: 0.62,
      useCrop: true, larguraPx: 62, pivotX: 0.5, pivotY: 0.94,
      bloqueia: false, pulsoBiolum: '#6cf7ff', brilho: { cor: '#6cf7ff', raio: 1.35, forca: 0.3 },
      interacao: { label: 'DECIFRAR A ESTELA DOS NAVEGADORES', distancia: 1.6 },
    },
    {
      id: 'jardim_pedras_enseada', nome: 'PEDRAS DO EQUILÍBRIO', tipo: 'decoracao', x: 34.13, y: 30.34,
      sprite: 'enseada4_cairn', spriteB: 'enseada4_cairn', animPeriodo: 0.64,
      useCrop: true, larguraPx: 80, pivotX: 0.5, pivotY: 0.98,
      bloqueia: true, hitbox: { offsetX: -0.30, offsetY: -0.24, width: 0.60, height: 0.48 },
      oscilaBrisa: true,
      interacao: { label: 'MEDITAR NAS PEDRAS DO EQUILÍBRIO', distancia: 1.55 },
    },
    {
      id: 'borboletas_fonte_enseada', nome: 'BORBOLETAS DO CENTRO', tipo: 'decoracao', x: 36.28, y: 33.55,
      sprite: 'enseada_borboletas_vivas', spriteB: 'enseada_borboletas_vivas_b', animPeriodo: 0.34,
      useCrop: true, larguraPx: 50, pivotX: 0.5, pivotY: 0.5,
      bloqueia: false, flutuacaoSuave: true, nadoCardume: true,
    },

    // ---- SETOR 5 (Sudoeste): Piscina + espelho + grutas + rede ----
    {
      // A piscina da capivara da arte é a bacia de pedras redonda com
      // cascatinha e juncos no canto — não a tina termal retangular cinza.
      id: 'piscina_mare_viva_enseada', nome: 'PISCINA TERMAL', tipo: 'decoracao', x: 28.3, y: 51.65,
      sprite: 'enseada3_piscina', useCrop: true, larguraPx: 220,
      pivotX: 0.5, pivotY: 0.92, depthOffset: -4,
      bloqueia: false,
      interacao: { label: 'MERGULHAR AS MÃOS NA ÁGUA TERMAL', distancia: 1.65 },
    },
    {
      // A capivara da referência, sentada dentro da piscina termal.
      // Dentro da bacia da piscina, virada para leste como na arte.
      id: 'capivara_piscina_enseada', nome: 'CAPIVARA', tipo: 'fauna', x: 26.5, y: 51.3, renderizar: false,
      sprite: 'enseada3_capivara', useCrop: true, larguraPx: 42, espelhar: true,
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
      // Rochas discretas à esquerda da fonte de cristal.
      id: 'pedras_fonte_cristal_enseada', tipo: 'decoracao', x: 36.2, y: 56.65,
      sprite: 'enseada_estacao_pedras_degrau', useCrop: true, larguraPx: 65,
      pivotX: 0.5, pivotY: 0.95, bloqueia: false,
    },
    {
      // A laje `enseada3_calcada` era a praça antiga do espelho. O sprite novo
      // (recortado da própria referência) já traz a praça de losangos e o
      // medalhão — manter as duas duplicava o piso e desalinhava a borda.
      id: 'enseada3_praca_espelho', tipo: 'decoracao', x: 33.85, y: 48.62,
      sprite: 'enseada3_calcada', useCrop: true, larguraPx: 300,
      pivotX: 0.5, pivotY: 0.92, depthOffset: -1, bloqueia: false,
      renderizar: false,
    },
    {
      // A referência desenha um espelho oval de moldura dourada com pedrarias,
      // sobre praça de losangos com medalhão. O sprite antigo era um portal
      // tecnológico de pedra escura com vórtice roxo — outra coisa.
      // Pé do espelho no pôster: (515, 552). O sprite inclui a praça, então a
      // âncora é o centro da praça e o espelho fica acima.
      id: 'espelho_arquetipos_enseada', nome: 'ESPELHO DE RESSONÂNCIA', tipo: 'dispositivo', x: 36.35, y: 50.25,
      sprite: 'enseada2_espelho_referencia',
      useCrop: true, larguraPx: 296, pivotX: 0.5, pivotY: 0.70,
      bloqueia: false, brilho: { cor: '#6ff7ff', raio: 1.5, forca: 0.34 },
      interacao: { label: 'SINTONIZAR ARQUÉTIPO', distancia: 1.65 },
    },
    {
      // Gruta nítida, proporcional ao espelho e junto à borda da calçada.
      id: 'gruta_concha_enseada', nome: 'CONCHA GIGANTE', tipo: 'decoracao', x: 29.0, y: 45.8,
      sprite: 'enseada_gruta_oeste', useCrop: true, larguraPx: 111, pivotX: 0.5, pivotY: 0.97,
      bloqueia: true, hitbox: { offsetX: -0.45, offsetY: -0.28, width: 0.9, height: 0.56 },
      interacao: { label: 'ABRIGAR-SE NA GRUTA-CONCHA', distancia: 1.7 },
    },
    {
      id: 'cristais_corais_gruta_oeste', tipo: 'decoracao', x: 30.9, y: 44.5,
      sprite: 'enseada_cristais_oeste', useCrop: true, larguraPx: 67,
      pivotX: 0.5, pivotY: 0.97, bloqueia: false,
    },
    {
      id: 'bambus_portico_oeste', tipo: 'decoracao', x: 17.9, y: 52.1,
      sprite: 'enseada_bambus_oeste', useCrop: true, larguraPx: 65,
      pivotX: 0.5, pivotY: 0.97, bloqueia: false,
    },
    // Touceiras feitas à mão: balanço contínuo da brisa, sem colisão.
    ...[
      [19.2, 52.0, 26], [21.6, 51.1, 23], [23.6, 49.8, 27],
      [25.9, 48.2, 24], [27.4, 46.2, 25], [30.2, 44.1, 25],
      [25.0, 49.3, 24], [35.2, 48.9, 22], [35.1, 46.9, 24],
    ].map(([x, y, larguraPx], i) => ({
      id: `grama_alta_oeste_${i + 1}`, tipo: 'decoracao', x, y,
      sprite: 'enseada_grama_alta_vento', useCrop: true, larguraPx,
      pivotX: 0.5, pivotY: 0.98, bloqueia: false, oscilaBrisa: true,
      espelhar: i % 2 === 1,
    })),
    // Vegetação baixa quebra a silhueta da base, sem fechar a escada.
    ...[[17.4, 44.3, 48], [19.3, 43.2, 38], [20.3, 42.4, 48], [24.8, 38.3, 38]].map(([x, y, larguraPx], i) => ({
      id: `tufos_encosta_oeste_${i + 1}`, tipo: 'decoracao', x, y,
      sprite: 'enseada_ne_arbustos', useCrop: true, larguraPx,
      pivotX: 0.5, pivotY: 0.97, bloqueia: false,
    })),
    {
      // A arte não tem caverna de pedra na praia oeste: o que existe ali é a
      // Concha Gigante acima do Espelho. O objeto fica na lista (interação e
      // testes) mas não é desenhado.
      id: 'enseada_gruta_pedra', nome: 'GRUTA DE PEDRA', tipo: 'decoracao', x: 32.0, y: 52.5,
      sprite: 'enseada4_gruta', useCrop: true, larguraPx: 110,
      pivotX: 0.5, pivotY: 0.98, bloqueia: false, renderizar: false,
      interacao: { label: 'EXAMINAR A GRUTA DE PEDRA', distancia: 1.6 },
    },
    {
      // A referência desenha esta rede em branco-azulado, pendurada entre dois
      // Rede de descanso entre os coqueiros, sem postes nem colisão adicional.
      id: 'rede_treino_praia_enseada', nome: 'REDE DE DESCANSO DA PRAIA', tipo: 'decoracao', x: 42.75, y: 51.34,
      sprite: 'enseada_rede_descanso', useCrop: true, larguraPx: 220,
      pivotX: 0.5, pivotY: 0.98, depthOffset: 0.2,
      bloqueia: false,
      interacao: { label: 'DESCANSAR NA REDE DA PRAIA', distancia: 1.8, speaker: 'REDE DE DESCANSO',
        dialogue: ['A REDE BALANÇA ENTRE OS COQUEIROS, CONVIDANDO A UM MOMENTO DE DESCANSO.'] },
    },
    {
      // Portal da costa leste: a arte da referência é um arco de pedra com
      // vórtice azul e corais na base rochosa. O sprite anterior era uma
      // plataforma de pedra cinza com cristais, que a arte não tem.
      // O pôster põe este arco em cima do rochedo da praia sudeste, ligado à
      // areia por pedras de travessia — não ilhado no meio do mar.
      // DESLIGADO: era o arco antigo de pedra cinza, que ficava encavalado
      // atrás do promontório novo. A peça `arco_conduto_retorno_mare` já traz
      // o arco de coral da arte. O objeto permanece na lista (colisão e
      // testes de interação).
      id: 'portal_submarino_sul', tipo: 'decoracao', x: 48.97, y: 17.88, renderizar: false,
      sprite: 'enseada3_portal_recife', useCrop: true, larguraPx: 236,
      pivotX: 0.5, pivotY: 0.96, depthOffset: -6, bloqueia: false,
      nome: 'PORTAL SUBMARINO DE CORAL',
    },
    {
      id: 'portal_submarino_fundo', tipo: 'decoracao', x: 34.0, y: 3.22, renderizar: false,
      sprite: 'enseada4_portal_submarino', useCrop: true, larguraPx: 130,
      pivotX: 0.5, pivotY: 0.96, depthOffset: -6, bloqueia: false,
      nome: 'PORTA DE CORAL',
    },
    {
      id: 'orla_rochas_sul', tipo: 'decoracao', x: 43.0, y: 55.5,
      sprite: 'enseada4_orla_rochas', useCrop: true, larguraPx: 96,
      pivotX: 0.5, pivotY: 0.96, bloqueia: false,
    },
    // Pedras de travessia do portal sudeste até a praia (a referência liga o
    // arco à areia por uma linha de pedras na água rasa).
    // A linha desce do arco (sudeste) até a ponta de areia, como na arte.
    ...[[51.06, 23.53], [51.13, 25.22], [51.19, 26.91], [51.25, 28.59], [51.38, 30.22]]
      .map(([x, y], i) => ({
        id: `pedra_travessia_sudeste_${i + 1}`, tipo: 'decoracao', x, y,
        sprite: `enseada_correntes_pedra_${i % 3 + 1}`, useCrop: true,
        larguraPx: 44 + (i % 2) * 6, pivotX: 0.5, pivotY: 0.62,
        espuma: true, camada: 'fundo', bloqueia: false,
      })),
    // Boias cônicas flutuando ao redor do arco, como na arte.
    ...[[51.78, 20.06], [51.56, 18.41], [50.4, 15.2]].map(([x, y], i) => ({
      id: `boia_sudeste_${i + 1}`, tipo: 'decoracao', x, y,
      sprite: i === 1 ? 'enseada_correntes_boia_vermelha' : 'enseada_correntes_boia_laranja',
      useCrop: true, larguraPx: 22, pivotX: 0.5, pivotY: 0.9,
      bloqueia: false, flutuacaoSuave: true, sombra: [8, 3],
    })),
    {
      // As quatro lajes com runas submersas à esquerda do píer, como no
      // pôster (x 705–790, y 560–645). A peça de arte já é a fileira inteira.
      id: 'travessia_pedras_agua', nome: 'PEDRAS RÚNICAS DO EMBARCADOURO', tipo: 'decoracao', x: 47.6, y: 47.5,
      sprite: 'enseada4_travessia_pedras', useCrop: true, larguraPx: 150,
      pivotX: 0.5, pivotY: 0.55, depthOffset: -0.2, bloqueia: false,
      interacao: { label: 'LER AS PEDRAS RÚNICAS', distancia: 1.7 },
    },

    // ---- SETOR 6 (Sul): Cais + embarcadouro ----
    // Arte do cais separada do ponto de interação em terra: a ponta fica no mar.
    {
      // Medido no pôster: a cabeceira do píer encosta na areia em (712,570) e
      // a ponta, com o veleiro, termina em (900,675). A âncora é o centro do
      // tabuleiro; `skewY` acompanha a inclinação da arte.
      id: 'cais_enseada_visual', tipo: 'decoracao', x: 50.0, y: 48.3,
      sprite: 'enseada8_cais_barco_ref', useCrop: true, larguraPx: 410, skewY: -0.10,
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
      // Removido a pedido: era o farolete cinza solto na borda da praia, logo
      // à esquerda do portal sudeste, que a referência não tem.
      id: 'farolete_baia_enseada', nome: 'FAROLETE DA BAÍA', tipo: 'decoracao', x: 51.5, y: 22.5,
      sprite: 'enseada_farolete_baia', spriteB: 'enseada_farolete_baia_b', animPeriodo: 0.65,
      useCrop: true, larguraPx: 80, pivotX: 0.5, pivotY: 0.96,
      bloqueia: false, feixeFarolete: true, brilho: { cor: '#5cf7eb', raio: 1.8, forca: 0.4 },
      interacao: { label: 'OBSERVAR DO FAROLETE', distancia: 1.65 },
      renderizar: false,
    },

    // ---- SETOR 7 (Leste): Portal + jardim + baú + recife ----
    {
      // Base rochosa do promontório do conduto.
      // A arte de referência é um rochedo orgânico de pedra e musgo; a peça
      // antiga (`03-rochedo.png`) desenhava uma laje chanfrada com uma rampa
      // reta que lia como bloco de pedra artificial sob o arco.
      id: 'enseada_base_rochosa_portal_leste', tipo: 'decoracao', x: 53.84, y: 27.46,
      sprite: 'enseada_rochedo_organico', useCrop: true, larguraPx: 340, espelhar: true,
      pivotX: 0.5, pivotY: 0.90, ajusteX: 0, ajusteY: 0,
      camada: 'fundo', ordem: -1, bloqueia: false,
      // O arco e o rochedo são hoje um sprite único (ver
      // `arco_conduto_retorno_mare`): desenhar a pedra solta duplicaria o
      // maciço. O objeto fica na lista por causa das interações e dos testes.
      renderizar: false,
    },
    {
      // Arco do conduto no promontório leste: mesma arte de coral da
      // referência. O sprite antigo (pedra cinza + cristais azuis) não existe
      // na arte e destoava da paleta do resto da costa.
      // Peça ÚNICA: o promontório recortado da arte já traz o arco do conduto,
      // o lajeado, a grama do topo e os corais da base rochosa. Antes havia
      // duas peças sobrepostas aqui (o arco antigo de pedra cinza aparecia
      // encavalado atrás do novo) e a base parecia pilha solta de pedras.
      // Pé no pôster: a ponta leste do lajeado, em (1233,497). O recorte tem
      // 140 px de largura na arte, então 140 é a largura em tela (antes estava
      // em 410 e o promontório saía três vezes maior que o da referência).
      id: 'arco_conduto_retorno_mare', tipo: 'decoracao', x: 51.6, y: 28.2,
      sprite: 'enseada_promontorio_sudeste', useCrop: true,
      larguraPx: 152, pivotX: 0.5, pivotY: 0.985,
      vorticidadeCorrentes: { x: 0, y: -300, rx: 16, ry: 40 },
      bloqueia: false, brilho: { cor: '#5cf7eb', raio: 2.2, forca: 0.44 },
    },
    {
      id: 'enseada_jardim_cercado', tipo: 'decoracao', x: 42.47, y: 35.63,
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
      id: 'ninho_tartarugas_enseada', nome: 'NINHO DE TARTARUGAS', tipo: 'decoracao', x: 49.0, y: 34.0,
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
      id: 'santuario_lumeo_enseada', nome: 'SANTUÁRIO DE LÚMEO', tipo: 'decoracao', x: 39.0, y: 26.0, renderizar: false,
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
      id: 'fonte_termal_enseada', nome: 'FONTE TERMAL DA ENSEADA', tipo: 'decoracao', x: 29.0, y: 53.0, renderizar: false,
      sprite: 'enseada_fonte_termal', spriteB: 'enseada_fonte_termal_b', animPeriodo: 0.58,
      useCrop: true, larguraPx: 90, pivotX: 0.5, pivotY: 0.9,
      bloqueia: false,
      interacao: { label: 'DESCANSAR NA FONTE TERMAL', distancia: 1.7 },
    },
    {
      // O segundo concha da faixa de areia, à direita do Espelho e abaixo dos
      // coqueiros centrais (630,490 no pôster). A referência tem DOIS conchas
      // grandes na praia; antes só a da piscina existia.
      id: 'concha_praia_central_enseada', nome: 'CONCHA DA PRAIA CENTRAL', tipo: 'decoracao',
      x: 39.25, y: 47.65,
      sprite: 'enseada_concha_perola_oeste',
      espelhar: true, useCrop: true, larguraPx: 80, pivotX: 0.5, pivotY: 0.98,
      bloqueia: false,
      interacao: { label: 'EXAMINAR A CONCHA DA PRAIA', distancia: 1.4 },
    },
    {
      id: 'arbusto_concha_perola_oeste', tipo: 'decoracao', x: 37.7, y: 45.55,
      sprite: 'enseada_ne_arbusto_florido', useCrop: true, larguraPx: 55,
      pivotX: 0.5, pivotY: 0.97, bloqueia: false,
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
    // A plataforma nordeste é isolada; não há pedras de apoio na água.
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
      id: 'estrela_do_mar', tipo: 'decoracao', x: 34.0, y: 55.0,
      sprite: 'enseada6_estrela', useCrop: true, larguraPx: 60,
      pivotX: 0.5, pivotY: 0.96, depthOffset: -0.3, bloqueia: false,
    },
    {
      // Lanterna na areia à esquerda da entrada, sem cruzar o tabuleiro.
      id: 'poste_lanterna_madeira', tipo: 'decoracao', x: 40.1, y: 46.9,
      sprite: 'enseada6_poste', useCrop: true, larguraPx: 30,
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
      id: 'retorno_darsena_mare', tipo: 'door', x: 53.0, y: 27.5, automaticoNado: true, raioAutomatico: 0.8,
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
