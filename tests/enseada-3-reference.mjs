import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { map as enseada } from '../js/data/worlds/arquipelago-rotas-perdidas/enseada-ecos.js';

const sprites = [
  'estacao-666-cliff-gate',
  'plateau-waterfall-wide',
  'reef-portal-arch',
  'western-grove-arch',
  'western-palm-grove',
  'echo-monolith-dais',
  'rock-pool-oasis',
  'wooden-pier-sailboat',
  'stone-path-cobble',
  'plateau-waterfall-wide-b',
];
const main = readFileSync('js/main.js', 'utf8');
for (const name of sprites) {
  assert(existsSync(`assets/source-art/enseada-3/${name}.png`), `arte fonte ausente: ${name}`);
  assert(existsSync(`assets/sprites/enseada-3/${name}.png`), `sprite processado ausente: ${name}`);
}
for (const id of [
  'enseada3_estacao_666', 'enseada3_platao_cascata', 'enseada3_platao_cascata_b',
  'enseada3_portal_recife', 'enseada3_portico_oeste', 'enseada3_palmeiral',
  'enseada3_monolito', 'enseada3_piscina', 'enseada3_cais_barco', 'enseada3_calcada',
]) assert(main.includes(`id: '${id}'`), `registro de sprite ausente: ${id}`);

assert.equal(enseada.layout.length, 64);
assert.equal(enseada.layout[0].length, 72);
let terra = 0, terraLeste = 0, terraSul = 0;
for (let y = 0; y < enseada.walkMask.length; y++) {
  for (let x = 0; x < enseada.walkMask[y].length; x++) {
    if (enseada.walkMask[y][x] !== '.') continue;
    terra++;
    if (x >= 45 && x <= 60 && y >= 17 && y <= 34) terraLeste++;
    if (y >= 44 && y <= 52 && x >= 10 && x <= 52) terraSul++;
  }
}
assert(terra >= 2000, `ilha deveria ter 2.000+ tiles caminháveis (veio ${terra})`);
assert(terraLeste >= 180, `ponta leste da referência não foi construída (${terraLeste} tiles)`);
assert(terraSul >= 180, `praia sul ampliada não foi construída (${terraSul} tiles)`);
assert.equal(enseada.meta.initialZoom, 0.50);

const object = id => {
  const found = enseada.objects.find(item => item.id === id);
  assert(found, `marco visual ausente: ${id}`);
  return found;
};
assert.equal(object('porta_estacao_666_visual').sprite, 'enseada3_estacao_666');
assert(object('porta_estacao_666_visual').larguraPx >= 350);
assert.equal(object('enseada_macico_leste').sprite, 'enseada3_platao_cascata');
assert(object('enseada_macico_leste').larguraPx >= 700);
assert.equal(object('portico_trilha_praia').sprite, 'enseada3_portico_oeste');
assert.equal(object('totem_eco_enseada').sprite, 'enseada3_monolito');
assert.equal(object('piscina_mare_viva_enseada').sprite, 'enseada3_piscina');
assert.equal(object('cais_madeira_pesca_enseada').sprite, 'enseada8_cais_barco_ref');
assert.equal(object('arco_conduto_retorno_mare').sprite, 'enseada3_portal_recife');
assert(['enseada3_mata_oeste_a', 'enseada3_mata_oeste_b', 'enseada3_mata_sul', 'enseada3_mata_leste']
  .every(id => object(id).sprite === 'enseada3_palmeiral'));

console.log(`Enseada 3.1: ${sprites.length} artes, ilha 72x64, platô/cascata, estação 66.6 e cabos leste/sul OK.`);
