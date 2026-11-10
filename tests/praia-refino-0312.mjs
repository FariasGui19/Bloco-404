import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { map } from '../js/data/worlds/arquipelago-rotas-perdidas/praia-inicial.js';
import { habitatAllows } from '../js/game/fauna-costeira.js';

// A expansão só acrescenta areia caminhável nas margens da chegada.
for (const [x, y] of [[3,12],[5,13],[11,13],[12,14]]) {
  assert('SMT'.includes(map.aguaPraia[y][x]));
  assert.equal(map.walkMask[y][x], '.');
}
for (const [x, y] of [[7,12],[8,12]]) assert.equal(map.aguaPraia[y][x], 'b', 'cabeceira da ponte preservada');
for (const id of ['cascata_costeira_chegada','rocha_costeira_chegada']) {
  const object = map.objects.find(o => o.id === id);
  assert(object && !object.bloqueia);
  assert('YyDdX'.includes(map.aguaPraia[object.y][object.x]));
}
for (const animal of map.fauna) assert(habitatAllows(map, animal.species, animal.x, animal.y));
const png = readFileSync(new URL('../assets/sprites/player/bio-caminhada-0312.png', import.meta.url));
assert.equal(png.readUInt32BE(16), 172 * 4);
assert.equal(png.readUInt32BE(20), 256 * 4);
assert.equal(png[25], 6, 'folha deve ser RGBA');
console.log('Praia: expansão, pontes, habitats e folha RGBA OK.');
