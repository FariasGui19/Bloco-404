import assert from 'node:assert/strict';
import { createCoastalFauna, updateCoastalFauna, habitatAllows, faunaFootAnchor } from '../js/game/fauna-costeira.js';
import { map as praia } from '../js/data/worlds/arquipelago-rotas-perdidas/praia-inicial.js';
import { map as enseada } from '../js/data/worlds/arquipelago-rotas-perdidas/enseada-ecos.js';
import { state } from '../js/game/state.js';
import { loadMap } from '../js/game/map-manager.js';
import { canStandAt } from '../js/game/collision.js';

// As patas de cada frame pousam no mesmo ponto, apesar da altura variar.
for (const bottom of [153, 156, 151, 149, 137, 155, 155]) {
  const box = { y: 25, h: bottom - 25 };
  assert.equal(-80 * faunaFootAnchor(box, 256) + 80 * bottom / 256, 0);
}
assert.equal(faunaFootAnchor(null, 256), .78);
for (const map of [praia, enseada]) {
  const animals = createCoastalFauna(map);
  assert.equal(animals.length, map.fauna.length, 'todos os animais começam no habitat correto');
  const first = animals[0];
  updateCoastalFauna(map, animals, { x: first.x + 0.2, y: first.y }, 0.1);
  assert(first.fleeing, 'fauna reage à aproximação');
  for (let t = 0; t < 2000; t++) {
    const player = { x: 13 + Math.sin(t * .02) * 10, y: 14 + Math.cos(t * .02) * 8 };
    updateCoastalFauna(map, animals, player, 0.05);
    for (const animal of animals) {
      assert(habitatAllows(map, animal.species, animal.x, animal.y), `${animal.id} fora do habitat`);
      assert(Math.hypot(animal.x - animal.homeX, animal.y - animal.homeY) < 1.3);
    }
  }
}
state.save.loaded = false; state.save.activeSlot = null;
state.progress.flags = {};
assert(await loadMap(enseada.id, 'vindo_da_praia'));
const visited = new Set(), queue = [[6,15]];
while (queue.length) {
  const [x,y] = queue.shift(), key = `${x},${y}`;
  if (visited.has(key) || !canStandAt(enseada, x + .5, y + .5, .18, state.player)) continue;
  visited.add(key);
  queue.push([x+1,y], [x-1,y], [x,y+1], [x,y-1]);
}
for (const item of enseada.collectibles) assert(visited.has(`${item.x},${item.y}`), `${item.id} bloqueado por cenário`);
assert(visited.has('5,15'), 'retorno bloqueado por cenário');
assert(await loadMap('hub_saguao'));
assert.equal(state.fauna.length, 0, 'fauna não vaza para outro mapa');
console.log('Fauna: habitat, fuga, troca de mapa e caminhos da enseada OK.');
