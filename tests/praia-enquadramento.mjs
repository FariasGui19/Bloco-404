// =====================================================================
// PRAIA — CONTRATO DE ENQUADRAMENTO
//
// Bug real relatado pelo criador: "a parte de cima cortada, eu tô entrando
// na imagem". O trem da praia era desenhado com 622x359 px e o topo caía
// em y = -110 — fora da tela. Perto dele, o personagem ficava POR DENTRO
// do desenho do trem.
//
// Este teste trava a regra: nenhuma peça grande da estação pode
//   1. ser maior que o mapa em tiles (não cabe na cena);
//   2. começar acima de uma margem segura de tela;
//   3. cobrir a área onde o jogador anda.
//
// A matemática é a mesma do `drawCroppedObject` (âncora por pivotY).
// Roda sem canvas: é só projeção isométrica.
// =====================================================================
import assert from 'node:assert/strict';
import { map } from '../js/data/worlds/arquipelago-rotas-perdidas/praia-inicial.js';
import { state } from '../js/game/state.js';
import { canStandAt } from '../js/game/collision.js';
// Objetos recebem meia célula no carregamento real do mapa.
state.objects = map.objects.map(o => ({...o, x:o.x + .5, y:o.y + .5}));
state.actors = [];

const HW = 32, HH = 16;
const TILE_W = 64, TILE_H = 32;

// Crop real de cada quadro do kit (medido no PNG, não chutado).
const CROP_KIT = {
  '0,0': [370, 279], '1,0': [384, 325], '2,0': [352, 270], '3,0': [329, 323],
  '0,1': [174, 309], '1,1': [260, 347], '2,1': [161, 331], '3,1': [297, 267],
};
const CROP_TREM = [1480, 855];
const CROP_TRILHO = [1, 1];

// Margem da borda de cima: acima disso a peça some atrás do HUD do jogo
// (que ocupa o canto superior esquerdo) e parece "cortada".
const TOPO_SEGURO = -20;

function caixaDeTela(o) {
  let crop, escalaX, baseAncora, escalaY = 1;

  if (o.id === 'trem_dimensional') {
    crop = CROP_TREM;
    escalaX = (o.larguraPx ?? 375) / crop[0];
    baseAncora = .90;
    escalaY = o.escalaY ?? 1;
  } else if (o.sprite === 'praia_plataforma_kit') {
    crop = CROP_KIT[`${o.frame?.col ?? 0},${o.frame?.row ?? 0}`];
    escalaX = (o.larguraPx ?? crop[0]) / crop[0];
    baseAncora = o.pivotY ?? 1;
    escalaY = o.escalaY ?? 1;
  } else if (o.sprite === 'dimensional_rail_strip') {
    // Trilho longo: só interessa a largura.
    const w = o.larguraPx ?? 430;
    const ix = (o.x - o.y) * HW + (o.ajusteX ?? 0);
    const iy = (o.x + o.y) * HH + (o.ajusteY ?? 0);
    return { ix, iy, w, h: 24, topo: iy - 12, base: iy + 12 };
  } else {
    return null;
  }

  const w = crop[0] * escalaX;
  const h = crop[1] * escalaX * escalaY;
  const ix = (o.x - o.y) * HW + (o.ajusteX ?? 0);
  const iy = (o.x + o.y) * HH + (o.ajusteY ?? 0);
  return { ix, iy, w, h, topo: iy - h * baseAncora, base: iy + h * (1 - baseAncora) };
}

// --- Trem ------------------------------------------------------------
const trem = map.objects.find(o => o.id === 'trem_dimensional');
const caixaTrem = caixaDeTela(trem);
const tilesTrem = { w: caixaTrem.w / TILE_W, h: caixaTrem.h / TILE_H };

assert(tilesTrem.w < map.aguaPraia[0].length * .35,
  `trem com ${tilesTrem.w.toFixed(1)} tiles de largura: maior que 1/3 do mapa`);
assert(tilesTrem.h < map.aguaPraia.length * .35,
  `trem com ${tilesTrem.h.toFixed(1)} tiles de altura: maior que 1/3 do mapa`);
assert(caixaTrem.topo > TOPO_SEGURO,
  `trem começa em y=${caixaTrem.topo.toFixed(0)}, acima da margem segura (${TOPO_SEGURO})`);
console.log(`Trem: ${caixaTrem.w.toFixed(0)}x${caixaTrem.h.toFixed(0)} px (${tilesTrem.w.toFixed(1)}x${tilesTrem.h.toFixed(1)} tiles), topo em y=${caixaTrem.topo.toFixed(0)}.`);

// --- Peças da estação ------------------------------------------------
const estacao = map.objects.filter(o =>
  o.id.startsWith('estacao_') || o.id.startsWith('plataforma_pilar') ||
  o.id === 'praia_placa_estacao'
);

for (const o of estacao) {
  const caixa = caixaDeTela(o);
  if (!caixa) continue;
  assert(caixa.w / TILE_W < 8, `${o.id}: ${(caixa.w / TILE_W).toFixed(1)} tiles de largura`);
  assert(caixa.h / TILE_H < 8, `${o.id}: ${(caixa.h / TILE_H).toFixed(1)} tiles de altura`);
}
console.log(`Estação: ${estacao.length} peças, todas dentro de 8x8 tiles.`);

// --- Nada da estação pode subir acima do trem (senão "corta") --------
// A plataforma e o dossel ficam atrás/ao redor do trem, então podem subir
// um pouco; o limite é a margem segura de tela.
for (const o of estacao) {
  const caixa = caixaDeTela(o);
  if (!caixa) continue;
  assert(caixa.topo > TOPO_SEGURO,
    `${o.id} começa em y=${caixa.topo.toFixed(0)}, acima da margem segura`);
}
console.log('Nenhuma peça da estação sai pelo topo da tela.');

// --- O jogador não pode ficar DENTRO do trem -------------------------
// O jogador anda em tiles de 'SMT'. Nenhuma célula de chão pode estar
// coberta pela metade de baixo do desenho do trem (onde ficam as rodas e a
// cabine), senão ele "entra na imagem" — que é o bug relatado.
const cobrePonto = (caixa, wx, wy) => {
  const sx = (wx - wy) * HW;
  const sy = (wx + wy) * HH;
  return sx >= caixa.ix - caixa.w / 2 && sx <= caixa.ix + caixa.w / 2
    && sy >= caixa.topo && sy <= caixa.base
    && sy >= caixa.iy - caixa.h * .35; // só a faixa baixa (corpo do trem)
};

let invadidas = [];
for (let y = 0; y < map.aguaPraia.length; y++) {
  for (let x = 0; x < map.aguaPraia[y].length; x++) {
    if (!'SMT'.includes(map.aguaPraia[y][x])) continue;
    if (cobrePonto(caixaTrem, x + .5, y + .5) && canStandAt(map, x + .5, y + .5, .25)) invadidas.push(`${x},${y}`);
  }
}
assert(invadidas.length === 0,
  `jogador andaria dentro do trem em: ${invadidas.slice(0, 8).join(' ')}`);
console.log('Nenhuma célula caminhável cai dentro do desenho do trem.');

// --- O caminho à estação continua livre ------------------------------
// O totem de embarque é o ponto de embarque: precisa ter chão em volta.
const totem = map.objects.find(o => o.id === 'terminal_embarque_trem');
assert(totem, 'totem de embarque deveria existir');
const tx = Math.floor(totem.x), ty = Math.floor(totem.y);
const vizinhos = [[1, 0], [-1, 0], [0, 1], [0, -1]]
  .map(([dx, dy]) => map.aguaPraia[ty + dy]?.[tx + dx])
  .filter(c => c != null);
assert(vizinhos.some(c => 'SMT'.includes(c)), 'totem sem chão em volta');
console.log('Embarque alcançável a pé.');

console.log('\nPraia: estação enquadrada, trem proporcional e jogador fora da imagem.');
