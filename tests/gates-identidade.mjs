import assert from 'node:assert/strict';
import { bridgeGateGeometry, BRIDGE_GATE_PROFILES } from '../js/engine/bridge-geometry.js';
import { map } from '../js/data/worlds/arquipelago-rotas-perdidas/praia-inicial.js';
import { loadMap } from '../js/game/map-manager.js';
import { state } from '../js/game/state.js';
import { input } from '../js/engine/input.js';
import { updateAbilities, getArchetypeAbilities } from '../js/game/abilities.js';
const expected = { rocha_rachada: 'dominio', teleferico_quebrado: 'bio', caverna_alagada: 'mare', fenda_estreita: 'nucleo', travessia_mare_eco: 'mare_nucleo', passagem_mare_eco: 'mare_nucleo' };
for (const [id, kind] of Object.entries(expected)) {
  const object = map.objects.find(o => o.id === id);
  const runtime = { ...object, x: object.x + .5, y: object.y + .5 };
  const g = bridgeGateGeometry(map.aguaPraia, runtime);
  assert(g, `${id}: deck reconhecido`);
  assert.equal(g.kind, kind);
  assert.equal(g.axis, BRIDGE_GATE_PROFILES[id].axis);
  assert.equal(g.x, runtime.x, `${id}: centro visual igual ao lógico x`);
  assert.equal(g.y, runtime.y, `${id}: centro visual igual ao lógico y`);
  assert(Math.abs(g.halfWidth - .92) < 1e-9);
}
assert.equal(bridgeGateGeometry(map.aguaPraia, { id: 'inexistente', x: 1, y: 1 }), null);
assert.equal(bridgeGateGeometry(['SS','SS'], { id: 'fenda_estreita', x: .5, y: .5 }), null);
// Ambas as metades do deck compartilhado devem ser atravessáveis com Q.
state.save.loaded = false; state.save.activeSlot = null;
for (const archetype of ['mare_astral', 'nucleo_dez_forma']) for (const lane of [11.5, 12.5]) {
  state.progress = { archetype, abilities: getArchetypeAbilities(archetype), flags: {}, inventory: [] };
  await loadMap(map.id);
  Object.assign(state.player, { x: 17.25, y: lane, facing: 'right', energy: 100, ability: { cooldowns: {}, dash: null } });
  input.pressed.add('q'); updateAbilities(0); input.pressed.clear();
  for (let i = 0; i < 20 && state.player.ability.dash; i++) updateAbilities(.03);
  assert(state.player.x > 19.35, `${archetype} atravessa faixa ${lane}`);
  assert(state.progress.flags.gate_travessia_mare_eco);
}
console.log('Gates: identidade, centro lógico/visual e as duas faixas de travessia OK.');
