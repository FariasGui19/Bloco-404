// node --experimental-default-type=module tests/carga-refino.mjs
import assert from 'node:assert/strict';
import { state } from '../js/game/state.js';
import { loadMap } from '../js/game/map-manager.js';
import { canStandAt, getObjectHitbox } from '../js/game/collision.js';
import { getArchetypeAbilities, updateAbilities } from '../js/game/abilities.js';
import { input } from '../js/engine/input.js';
import { getNearestCollectible } from '../js/game/collectibles.js';

const element = () => ({ dataset: {}, classList: { add() {}, remove() {} }, addEventListener() {}, textContent: '', innerHTML: '' });
globalThis.document = { getElementById: () => element() };
globalThis.window = { addEventListener() {} };
state.save.loaded = false;
state.save.activeSlot = null;

for (const [archetype, room] of [
  ['motor_bio_forja', 'hub_aeroporto_carga'],
  ['lamina_dominio_anciao', 'hub_camara_dominio'],
  ['mare_astral', 'hub_camara_mare'],
  ['nucleo_dez_forma', 'hub_camara_nucleo'],
]) {
  state.progress = { archetype, abilities: getArchetypeAbilities(archetype), flags: {}, inventory: [] };
  await loadMap(room, 'vindo_do_aeroporto');
  const map = state.world.currentMap;
  const gate = state.objects.find(o => o.gate || o.dashPassable);
  const box = getObjectHitbox(gate);
  // Arte, colisão e abertura da divisória compartilham o centro do tile.
  assert.equal(gate.x % 1, 0.5);
  assert.equal(gate.y % 1, 0.5);
  assert.equal(map.layout[Math.floor(gate.y)][Math.floor(gate.x)], 0);
  assert(Math.abs(box.x + box.width / 2 - gate.x) < 1e-9);
  assert(Math.abs(box.y + box.height / 2 - gate.y) < 1e-9);
  assert(box.height >= 1 && gate.larguraPx <= 54 && !gate.espelhar);
  // Pés dos sprites medidos no recorte alfa (12% e 88% da largura):
  // seus apoios devem seguir a inclinação do piso, não entrar nas paredes.
  const feet = {
    motor_bio_forja: [518, 373, 360, 152],
    lamina_dominio_anciao: [540, 311, 310, 203],
    mare_astral: [428, 323, 320, 156],
    nucleo_dez_forma: [268, 264, 244, 143],
  }[archetype];
  const [w, h, left, right] = feet;
  const footY = (y, x) => gate.escalaY * (y - h * gate.pivotY) * gate.larguraPx / w + gate.skewY * x;
  const halfSpan = gate.larguraPx * .38;
  assert(Math.abs(halfSpan - 16) < 1, 'postes encaixam no vão projetado');
  assert(Math.abs(footY(left, -halfSpan) - halfSpan / 2) < 1, 'pé esquerdo segue o piso');
  assert(Math.abs(footY(right, halfSpan) + halfSpan / 2) < 1, 'pé direito segue o piso');
  assert(!canStandAt(map, gate.x, gate.y, 0.25, state.player));
  assert(canStandAt(map, map.spawnPoints.inicio.x, map.spawnPoints.inicio.y, 0.25, state.player));
  const frag = state.collectibles.find(o => o.id === 'fragmento_sincronizacao');
  const cradle = state.objects.find(o => o.id.startsWith('berco_fragmento_'));
  assert.equal(cradle.x, frag.x);
  assert.equal(cradle.y, frag.y);
  assert.equal(cradle.showWhenFlag, frag.requiresFlag);
  assert.equal(cradle.hideWhenFlag, 'collected_fragmento_sincronizacao');

  if (archetype === 'motor_bio_forja') {
    state.progress.flags.cargoSecurityDiagnosed = true;
    const player = state.player;
    Object.assign(player, { x: 9.8, y: 5.5, facing: 'right', energy: 100, ability: { cooldowns: {}, dash: null } });
    assert.equal(getNearestCollectible(), null, 'fragmento não pode ser pego antes de atravessar');
    input.pressed.clear(); input.pressed.add('q'); updateAbilities(0); input.pressed.clear();
    for (let i = 0; i < 30 && player.ability.dash; i++) updateAbilities(0.03);
    assert(player.x > gate.x + 0.18, `propulsor atravessa o vão: x=${player.x}`);
    assert(canStandAt(map, player.x, player.y, 0.25, player), 'pouso seguro do outro lado');
    assert(getNearestCollectible(), 'fragmento alcançável após a travessia');
  }
}
console.log('Refino da carga: alinhamento das travas, berços, spawn e travessia Bio OK.');
