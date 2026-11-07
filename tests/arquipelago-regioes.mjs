import assert from 'node:assert/strict';
import { ARQUIPELAGO_REGIONS } from '../js/data/arquipelago-regioes.js';
import { WORLD_REGISTRY } from '../js/data/world-registry.js';
const byId = new Map(ARQUIPELAGO_REGIONS.map(r => [r.id, r]));
assert.equal(byId.size, ARQUIPELAGO_REGIONS.length);
for (const region of ARQUIPELAGO_REGIONS) {
  for (const id of region.neighbours) {
    assert(byId.has(id), `conexão ausente: ${id}`);
    assert(byId.get(id).neighbours.includes(region.id), `conexão sem volta: ${id}`);
  }
  if (region.status === 'jogavel') assert(WORLD_REGISTRY[region.mapId]);
  else assert.equal(region.mapId, null, 'regiões planejadas não criam destinos inexistentes');
}
console.log('Arquipélago: planejamento conectado sem portais prematuros OK.');
