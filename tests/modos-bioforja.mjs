// Execute: node --experimental-default-type=module tests/modos-bioforja.mjs
import assert from 'node:assert/strict';
import { state } from '../js/game/state.js';
import { input } from '../js/engine/input.js';
import { updateAbilities } from '../js/game/abilities.js';
import { getAbilityContext, getBioDashProfile, toggleBioSuit } from '../js/game/ability-context.js';

state.world.currentMap = { layout: Array.from({ length: 16 }, () => Array(16).fill(0)) };
state.objects = [];
state.actors = [];
state.progress.archetype = 'motor_bio_forja';
state.progress.abilities = ['bio_dash', 'bio_diagnostic'];

function startDash(suit, energy = 100) {
  Object.assign(state.player, { x: 6.5, y: 6.5, facing: 'right', energy, maxEnergy: 100, equippedSuit: suit });
  state.player.ability = { active: null, cooldowns: {}, dash: null, messageTimer: 0, lastMessage: null };
  input.pressed.clear();
  input.pressed.add('q');
  updateAbilities(0);
  input.pressed.clear();
}
function finishDash() {
  for (let i = 0; i < 20 && state.player.ability.dash; i++) updateAbilities(0.02);
  assert.equal(state.player.ability.dash, null);
  return Math.hypot(state.player.x - 6.5, state.player.y - 6.5);
}

startDash(null);
assert.equal(state.player.energy, 72);
assert.equal(state.player.ability.dash.mode, 'quick');
assert.equal(toggleBioSuit(state.progress, state.player), false, 'não trocar durante dash');
const quickDistance = finishDash();
assert(Math.abs(quickDistance - 2.15) < 1e-8);
const energyAfterDash = state.player.energy;
input.pressed.add('q');
updateAbilities(0);
input.pressed.clear();
assert.equal(state.player.energy, energyAfterDash, 'recarga impede gasto adicional');
assert.equal(state.player.ability.dash, null);
assert(toggleBioSuit(state.progress, state.player));
assert.equal(getAbilityContext(state.progress, state.player).mode, 'equipped');
startDash('bio_forja');
assert.equal(state.player.energy, 78);
assert.equal(state.player.ability.dash.mode, 'equipped');
const equippedDistance = finishDash();
assert(Math.abs(equippedDistance - 2.35) < 1e-8);
assert(equippedDistance > quickDistance);

startDash('bio_forja', 21);
assert.equal(state.player.energy, 21);
assert.equal(state.player.ability.dash, null);
assert.equal(state.player.ability.lastMessage, 'ENERGIA INSUFICIENTE');

startDash(null, 27);
assert.equal(state.player.energy, 27);
assert.equal(state.player.ability.dash, null);

state.progress.archetype = 'mare_astral';
assert.equal(getBioDashProfile(state.progress, state.player), null);
assert.equal(toggleBioSuit(state.progress, state.player), false);

// O dash equipado continua sujeito a colisões e não atravessa paredes.
state.progress.archetype = 'motor_bio_forja';
for (const row of state.world.currentMap.layout) row[7] = 1;
startDash('bio_forja');
finishDash();
assert(state.player.x < 7, 'não atravessa uma parede');
console.log('Modos Bio-Forja: custos, alcance, energia e colisão OK.');
