import assert from 'node:assert/strict';
import { state } from '../js/game/state.js';
import { loadMap } from '../js/game/map-manager.js';
import { BASIC_ATTACKS, tryBasicAttack, updateBasicCombat } from '../js/game/combat.js';

state.save.loaded = false; state.save.activeSlot = null;
state.progress = { flags: {}, inventory: [], activeQuest: { id: 'embarque_dimensional', status: 'active' } };
await loadMap('ilha_enseada_ecos', 'inicio');
const map = state.world.currentMap, player = state.player, target = state.trainingTargets[0];
Object.assign(player, { x: 13, y: 15.5, facing: 'down', ability: {} });
const aim = { x: target.x, y: target.y };
for (const archetype of Object.keys(BASIC_ATTACKS)) {
  state.progress.archetype = archetype; player.combat = null; target.health = target.maxHealth;
  assert(tryBasicAttack({ player, progress: state.progress, map, targets: state.trainingTargets, point: aim }));
  assert.equal(target.health, 2, `${archetype} deve atingir o alvo`);
  assert.equal(tryBasicAttack({ player, progress: state.progress, map, targets: state.trainingTargets, point: aim }), false, 'respeita cooldown');
  assert.equal(target.health, 2);
  updateBasicCombat(player, state.trainingTargets, .5);
  assert(tryBasicAttack({ player, progress: state.progress, map, targets: state.trainingTargets, point: aim }));
  updateBasicCombat(player, state.trainingTargets, .5);
  assert(tryBasicAttack({ player, progress: state.progress, map, targets: state.trainingTargets, point: aim }));
  assert.equal(target.health, 0);
  updateBasicCombat(player, state.trainingTargets, 4.1);
  assert.equal(target.health, 3, 'alvo se recompõe sem criar progresso');
}
player.combat = null;
// Clique na parte alta da arte do alvo (não apenas em sua base) também mira no centro.
const topOfTarget = { x: target.x - .75, y: target.y - .75 };
assert(tryBasicAttack({ player, progress: state.progress, map, targets: state.trainingTargets, point: topOfTarget }));
assert.equal(target.health, 2);
target.health = 3;
player.combat = null; player.ability = { dash: {} };
assert.equal(tryBasicAttack({ player, progress: state.progress, map, targets: state.trainingTargets, point: aim }), false, 'não interrompe dash');
player.ability = { effect: { id: 'senso_corrente', timeLeft: .3 } };
assert.equal(tryBasicAttack({ player, progress: state.progress, map, targets: state.trainingTargets, point: aim }), false, 'não interrompe ação visual Q/R');
player.ability = {}; player.combat = null;
assert(tryBasicAttack({ player, progress: state.progress, map, targets: state.trainingTargets, point: { x: 10, y: 15.5 } }));
assert.equal(target.health, 3, 'não atinge atrás do operador');
player.combat = null;
const wallMap = { layout: [[0, 1, 0]], walkMask: ['.#.'] };
player.x = .5; player.y = .5; const blocked = [{ x: 2.5, y: .5, health: 3, maxHealth: 3 }];
// Coloca alvo na distância de teste, mas ainda do outro lado da parede.
blocked[0].x = 1.9;
assert(tryBasicAttack({ player, progress: state.progress, map: wallMap, targets: blocked, point: { x: 2, y: .5 } }));
assert.equal(blocked[0].health, 3, 'golpe não atravessa parede');
assert.deepEqual(state.progress.flags, {});
assert.equal(state.progress.activeQuest.id, 'embarque_dimensional');
await loadMap('hub_saguao');
assert.equal(state.trainingTargets.length, 0);
assert.equal(player.combat, null);
console.log('Ataques básicos: mira, dano, distância, linha de visão, travas e treino temporário OK.');
