import assert from 'node:assert/strict';
import { map } from '../js/data/worlds/arquipelago-rotas-perdidas/enseada-ecos.js';
import { createBeachSurface } from '../js/engine/beach-surface.js';
import { state } from '../js/game/state.js';
import { canStandAt } from '../js/game/collision.js';

const obj = id => { const o = map.objects.find(o => o.id === id); assert(o, id); return o; };
const screen = o => ({ x:(o.x-o.y)*32, y:(o.x+o.y)*16 });
const totem = obj('totem_eco_enseada'), estela = obj('estela_navegadores_enseada'), cairn = obj('jardim_pedras_enseada');
assert(screen(estela).x < screen(totem).x && screen(totem).x < screen(cairn).x);
assert.equal(cairn.sprite, 'enseada_cairn_central');
// Alturas obtidas das dimensões dos recortes das artes usadas.
const alturaMonolito = totem.larguraPx * 103 / 56;
const alturaEstela = estela.larguraPx * 993 / 504;
const alturaPedras = cairn.larguraPx * 625 / 559;
assert(Math.abs(alturaMonolito - 62 * 993 / 504) < 3, 'monólito tem a antiga altura da estela');
assert(Math.abs(alturaEstela - alturaPedras) < 8, 'estela e pedras têm alturas semelhantes');
assert(screen(estela).y > (30.97 + 36.5) * 16, 'estela deslocada para baixo');
assert(cairn.interacao && cairn.bloqueia && cairn.hitbox);
assert(totem.pulsoTotem && totem.pulsoBiolum && totem.brilho);
assert(estela.pulsoBiolum && estela.interacao);
const borboletas = map.objects.filter(o => o.id === 'borboletas_fonte_enseada' || o.id.startsWith('borboleta_centro_'));
assert.equal(borboletas.length, 3);
assert(borboletas.every(o => o.bateAsas && o.nadoCardume && o.flutuacaoSuave && !o.bloqueia));
assert(borboletas.some(o => o.sprite === 'enseada_borboleta_dourada'));
const opts = {celulasGrama: map.celulasGrama, ajusteSolo: map.ajusteSolo};
const before = createBeachSurface(map.aguaPraia, 8, opts);
const after = createBeachSurface(map.aguaPraia, 8, {...opts, ajusteSoloCentral: map.ajusteSoloCentral});
const pixel = (img,x,y) => { const i = (Math.floor(y*8)*img.width + Math.floor(x*8))*4; return Array.from(img.pixels.slice(i,i+4)); };
for (const o of [totem, estela, cairn]) {
  const [r,g,,a] = pixel(after,o.x+.5,o.y+.5);
  assert(g > r && a > 0, `${o.id} deve estar sobre grama`);
}
for (const [x,y] of [[29,35], [33,39], [36,34]]) {
  const [r,g] = pixel(after,x,y); assert(r > g, 'areia deve contornar a ilha');
}
for (const [x,y] of [[20,50], [15,35], [48,27]]) assert.deepEqual(pixel(after,x,y), pixel(before,x,y), 'fora do centro não muda');
const withTexture = createBeachSurface(map.aguaPraia, 8, {...opts, ajusteSoloCentral: map.ajusteSoloCentral,
  texturaGramaCentral: {width:1,height:1,pixels:new Uint8ClampedArray([110,150,60,255])}});
assert.notDeepEqual(pixel(withTexture,33.1,36.2),pixel(after,33.1,36.2), 'textura afeta a grama central');
assert.deepEqual(pixel(withTexture,20,50),pixel(after,20,50), 'textura não afeta outros setores');
for (let i=3;i<after.pixels.length;i+=4) assert.equal(after.pixels[i],before.pixels[i], 'ajuste não altera a máscara de terra');
state.objects = map.objects.map(o => ({...o,x:o.x+.5,y:o.y+.5}));
assert(!canStandAt(map,cairn.x+.5,cairn.y+.5,.15,state.player));
console.log('Centro: ilha, marcos, borboletas e máscara de colisão OK.');
const spawn = map.spawnPoints.vindo_da_praia;
const queue = [[Math.round(spawn.x*2), Math.round(spawn.y*2)]], seen = new Set(), reached = [];
for (let i=0; i<queue.length; i++) {
  const [ix,iy] = queue[i], key = `${ix},${iy}`;
  if (seen.has(key)) continue;
  seen.add(key);
  const x=ix/2, y=iy/2;
  if (!canStandAt(map,x,y,.2,state.player)) continue;
  reached.push([x,y]);
  queue.push([ix+1,iy],[ix-1,iy],[ix,iy+1],[ix,iy-1]);
}
for (const o of [totem, estela, cairn]) {
  assert(reached.some(([x,y]) => Math.hypot(x-o.x-.5,y-o.y-.5) <= o.interacao.distancia), `${o.id}: interação alcançável`);
}
