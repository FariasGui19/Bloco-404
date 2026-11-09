import assert from 'node:assert/strict';
import { state } from '../js/game/state.js';
import { loadMap } from '../js/game/map-manager.js';
import { canStandAt } from '../js/game/collision.js';
import { updateAbilities, activateBioDashSensors } from '../js/game/abilities.js';
import { tryModuleInteraction } from '../js/game/module-interactions.js';
import { checkInteractions } from '../js/game/interactions.js';
import { initDialogue, closeDialogue } from '../js/ui/dialogue.js';
import { input } from '../js/engine/input.js';
import { getSave } from '../js/game/save.js';
const els = Object.fromEntries(['dialogueBox', 'dialogueSpeaker', 'dialogueText', 'dialogueHint', 'dialogueChoices'].map(id => [id, { dataset: {}, classList: { add() {}, remove() {} }, addEventListener() {}, textContent: '', innerHTML: '' }]));
globalThis.document = { getElementById: id => els[id] };
globalThis.window = { addEventListener() {} };
const store = new Map(); globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
initDialogue();
state.save.loaded = true; state.save.activeSlot = 1;
state.progress = { archetype: 'motor_bio_forja', abilities: ['bio_dash', 'bio_diagnostic'], flags: {}, inventory: ['antigo'], activeQuest: { id: 'embarque_dimensional' } };
assert(await loadMap('bio_sala_controle'));
assert(canStandAt(state.world.currentMap, state.player.x, state.player.y, .25, state.player));
// A sala tem rota transitável da entrada à placa e ao painel sem atravessar paredes.
function reachable(map, start) {
  const seen = new Set(), queue = [start];
  for (let i = 0; i < queue.length; i++) {
    const [x, y] = queue[i], key = `${x},${y}`;
    if (seen.has(key) || !canStandAt(map, x + .5, y + .5, .25, state.player)) continue;
    seen.add(key); queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return seen;
}
const salaVista = reachable(state.world.currentMap, [2, 8]);
assert(salaVista.has('7,5') && salaVista.has('9,3') && salaVista.has('2,8'));
const sensor = state.objects.find(o => o.id === 'bio_pulso_interior');
state.player.x = 9.4; state.player.y = 3.5;
await checkInteractions(true); closeDialogue();
assert(!state.progress.flags.gate_bio_controle_central, 'painel não abre antes do impulso');
state.player.x = 6.5; state.player.y = 4.5;
assert(!tryModuleInteraction(), 'sem fluxo não diagnostica');
assert(!activateBioDashSensors({ x: 6.5, y: 4.5 }, { x: 8.5, y: 6.5 }), 'sem fluxo não ativa');
state.progress.flags.gate_bio_valvula_estufa = true;
assert(tryModuleInteraction()); closeDialogue();
assert(state.progress.flags.bio_pulso_diagnostico);
assert(!activateBioDashSensors({ x: 3, y: 3 }, { x: 4, y: 3 }), 'impulso longe não ativa');
state.progress.archetype = 'mare_astral';
assert(!activateBioDashSensors({ x: 6.5, y: 4.5 }, { x: 8.5, y: 6.5 }));
state.progress.archetype = 'motor_bio_forja';
// Q real, em modo rápido, passa pela placa com colisão normal.
state.player.facing = 'down'; state.player.equippedSuit = null; state.player.energy = 100; state.player.maxEnergy = 100;
state.player.ability = { cooldowns: {}, dash: null, scanning: 0 };
input.pressed.add('q'); assert(updateAbilities(.016)); input.pressed.clear();
for (let i = 0; i < 20 && state.player.ability.dash; i++) updateAbilities(.016);
assert(state.progress.flags.gate_bio_pulso_interior, 'Q atravessa placa');
assert(getSave(1).progress.flags.gate_bio_pulso_interior);
await loadMap('bio_sala_controle');
assert(state.objects.find(o => o.id === sensor.id).aberto, 'sensor persistido');
state.player.x = 9.4; state.player.y = 3.5;
assert(canStandAt(state.world.currentMap, state.player.x, state.player.y, .25, state.player));
await checkInteractions(true); closeDialogue();
assert(state.progress.flags.gate_bio_controle_central);
assert(getSave(1).progress.flags.gate_bio_controle_central);
assert.deepEqual(state.progress.inventory, ['antigo']);
// Um save com a válvula antiga concluída pode fazer o puzzle no modo equipado também.
state.progress.flags = { gate_bio_valvula_estufa: true, bio_pulso_diagnostico: true };
await loadMap('bio_sala_controle');
state.player.x = 6.5; state.player.y = 4.5; state.player.facing = 'down'; state.player.equippedSuit = 'bio_forja';
state.player.energy = 100; state.player.ability = { cooldowns: {}, dash: null, scanning: 0 };
input.pressed.add('q'); assert(updateAbilities(.016)); input.pressed.clear();
for (let i = 0; i < 20 && state.player.ability.dash; i++) updateAbilities(.016);
assert(state.progress.flags.gate_bio_pulso_interior, 'Q equipado atravessa placa');
assert.equal(state.progress.activeQuest.id, 'embarque_dimensional');
await loadMap('ilha_estacao_bio', 'vindo_controle');
assert(canStandAt(state.world.currentMap, state.player.x, state.player.y, .25, state.player));
const exterior = reachable(state.world.currentMap, [9, 10]);
assert(exterior.has('14,9'), 'porta do controle alcançável a partir da chegada');
assert(exterior.has('8,10'), 'embarque de volta permanece alcançável');
console.log('Bio interior: R, Q real, painel, persistência e retorno OK.');
