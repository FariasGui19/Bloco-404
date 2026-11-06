// Execute: node --experimental-default-type=module tests/praia.mjs
import assert from 'node:assert/strict';
import { map } from '../js/data/worlds/arquipelago-rotas-perdidas/praia-inicial.js';
import { state } from '../js/game/state.js';
import { canStandAt } from '../js/game/collision.js';
import { checkGate, openGate, isGateOpen } from '../js/game/gates.js';
import { findNearestInteraction, getInteractionPrompt } from '../js/game/interactions.js';
import { loadMap } from '../js/game/map-manager.js';

state.save.activeSlot = null;
state.progress.flags = {};
state.progress.abilities = [];
assert.equal(await loadMap('ilha_praia_inicial'), true);
const gates = Object.fromEntries(state.objects.filter(o => o.gate).map(o => [o.id, o]));
assert.equal(Object.keys(gates).length, 4);

// Sample traversable positions at quarter-tile intervals with real collision radius.
function reachable() {
  const queue = [[32, 30]];
  const seen = new Set(['32,30']);
  for (let i = 0; i < queue.length; i++) {
    const [x, y] = queue[i];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = x + dx, b = y + dy, key = `${a},${b}`;
      if (a < 0 || b < 0 || a >= 192 || b >= 192 || seen.has(key)) continue;
      if (!canStandAt(map, a / 4, b / 4, 0.25, state.player)) continue;
      seen.add(key);
      queue.push([a, b]);
    }
  }
  return queue.map(([x, y]) => [x / 4, y / 4]);
}
function near(points, x, y, distance) {
  return points.some(([px, py]) => Math.hypot(px - x, py - y) <= distance);
}
let points = reachable();
for (const id of ['rocha_rachada', 'teleferico_quebrado']) {
  const gate = gates[id];
  assert(near(points, gate.x, gate.y, gate.interacao.distancia), `${id} deve ser alcançável para interação`);
  const pos = points.find(([x, y]) => Math.hypot(x - gate.x, y - gate.y) <= 1.5);
  [state.player.x, state.player.y] = pos;
  const interaction = findNearestInteraction();
  assert.equal(interaction?.data.id, id);
  state.progress.archetype = null;
  assert.equal(getInteractionPrompt(interaction), 'EXAMINAR');
}
assert(!near(points, 30, 9, 2));
assert(!near(points, 9, 31, 2));

state.progress.archetype = 'motor_bio_forja';
assert(checkGate(gates.teleferico_quebrado.gate));
assert(!checkGate(gates.rocha_rachada.gate));
openGate(gates.teleferico_quebrado);
assert(isGateOpen(gates.teleferico_quebrado));
assert.equal(gates.teleferico_quebrado.bloqueia, false);
points = reachable();
assert(near(points, 9, 31, 2), 'ilha C deve ser acessível após abrir teleférico');
assert(near(points, gates.fenda_estreita.x, gates.fenda_estreita.y, 2.6));

await loadMap('ilha_praia_inicial');
assert(isGateOpen(state.objects.find(o => o.id === 'teleferico_quebrado')));
assert.equal(state.objects.find(o => o.id === 'teleferico_quebrado').bloqueia, false);
for (const id of ['rocha_rachada', 'caverna_alagada', 'fenda_estreita']) state.progress.flags[`gate_${id}`] = true;
await loadMap('ilha_praia_inicial');
points = reachable();
for (const [x, y] of [[30, 9], [9, 31], [30, 31], [30, 44]]) {
  assert(near(points, x, y, 2), `ilha em ${x},${y} deve ser acessível com gates abertos`);
}
console.log('Praia: gates, prompts, persistência e conectividade OK.');
