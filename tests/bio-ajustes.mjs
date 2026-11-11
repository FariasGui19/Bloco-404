import assert from 'node:assert/strict';
import { map as bio } from '../js/data/worlds/arquipelago-rotas-perdidas/estacao-bio.js';
import { map as praia } from '../js/data/worlds/arquipelago-rotas-perdidas/praia-inicial.js';
import { loadMap } from '../js/game/map-manager.js';
import { state } from '../js/game/state.js';
import { canStandAt } from '../js/game/collision.js';
import { findNearestInteraction, getInteractionPrompt } from '../js/game/interactions.js';

for (const bridge of bio.bioBridges) {
  for (const rail of bio.bioBridgeRails.filter(r => r.bridgeId === bridge.id)) {
    const side = bridge.axis === 'x' ? rail.y : rail.x;
    assert.equal(side, rail.side === 'longe' ? (bridge.axis === 'x' ? bridge.y0 : bridge.x0) : (bridge.axis === 'x' ? bridge.y1 + 1 : bridge.x1 + 1));
  }
}
for (const plant of bio.objects.filter(o => o.id.startsWith('estacao_planta_'))) {
  assert.equal(bio.walkMask[Math.floor(plant.y + .5)]?.[Math.floor(plant.x + .5)], '.');
}
// Todos os pontos intermediários da rede também estão em terra ou no deck.
for (const path of bio.bioNetwork.paths) for (let i = 1; i < path.length; i++) {
  const [ax, ay] = path[i - 1], [bx, by] = path[i];
  const steps = Math.max(Math.abs(ax - bx), Math.abs(ay - by)) * 4;
  for (let j = 0; j <= steps; j++) {
    const x = Math.floor(ax + .5 + (bx - ax) * j / steps);
    const y = Math.floor(ay + .5 + (by - ay) * j / steps);
    assert.equal(bio.walkMask[y]?.[x], '.', `rede em ${x},${y}`);
  }
}
for (const [map, portalId, stationId] of [[praia, 'trilha_estacao_bio', 'estacao_cabo_praia'], [bio, 'estacao_voltar', 'estacao_cabo_chegada']]) {
  const portal = map.portals.find(p => p.id === portalId);
  const station = map.objects.find(o => o.id === stationId);
  assert.equal(station.x, portal.x); assert.equal(station.y, portal.y);
  assert(!station.bloqueia);
  assert(map.spawnPoints[map === praia ? 'vindo_da_estacao' : 'inicio']);
}
state.save.loaded = false;
state.progress = { archetype: 'motor_bio_forja', flags: {}, inventory: [] };
await loadMap(praia.id, 'vindo_da_estacao');
assert(canStandAt(praia, state.player.x, state.player.y, .28, state.player));
assert.equal(getInteractionPrompt(findNearestInteraction()), 'TELEFÉRICO SEM ENERGIA');
state.progress.flags.gate_teleferico_quebrado = true;
assert.equal(getInteractionPrompt(findNearestInteraction()), 'EMBARCAR PARA ESTAÇÃO BIO');
await loadMap(bio.id);
assert(canStandAt(bio, state.player.x, state.player.y, .28, state.player));
assert.equal(getInteractionPrompt(findNearestInteraction()), 'VOLTAR À PRAIA');
console.log('Bio: alinhamento das pontes, rede e estações de embarque OK.');
