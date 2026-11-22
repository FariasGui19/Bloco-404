// Execute: node --experimental-default-type=module tests/praia.mjs
import assert from 'node:assert/strict';
import { map } from '../js/data/worlds/arquipelago-rotas-perdidas/praia-inicial.js';
import { linhaDoTrem } from '../js/data/shared/linha-trem.js';
import { state } from '../js/game/state.js';
import { canStandAt } from '../js/game/collision.js';
import { checkGate, openGate, isGateOpen } from '../js/game/gates.js';
import { findNearestInteraction, getInteractionPrompt, checkInteractions } from '../js/game/interactions.js';
import { closeDialogue, isDialogueOpen } from '../js/ui/dialogue.js';
import { loadMap } from '../js/game/map-manager.js';
import { getModuleInteractionPrompt, tryModuleInteraction } from '../js/game/module-interactions.js';
import { getSave } from '../js/game/save.js';

const elements = Object.fromEntries(['dialogueBox', 'dialogueSpeaker', 'dialogueText', 'dialogueHint', 'dialogueChoices'].map(id => [id, {
  dataset: {}, classList: { add() {}, remove() {} }, addEventListener() {}, textContent: '', innerHTML: ''
}]));
globalThis.document = { getElementById: id => elements[id] };
globalThis.window = { addEventListener() {} };
const storage = new Map();
globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };

state.save.activeSlot = null;
state.progress.flags = {};
state.progress.abilities = [];
assert.equal(await loadMap('ilha_praia_inicial'), true);
const gates = Object.fromEntries(state.objects.filter(o => o.gate).map(o => [o.id, o]));
assert.equal(Object.keys(gates).length, 6);
// O ajuste LOCAL da praia (assentar as rodas no trilho). Não é um número
// sagrado: mudou quando o trem foi reescalado para não sair da tela. O que
// NÃO pode mudar é o trem compartilhado de `linha-trem.js` (verificado
// logo abaixo).
const tremPraia = map.objects.find(o => o.id === 'trem_dimensional');
// O `global.y` do mapa desloca o conjunto em PIXELS de tela (não em
// tiles), então o ajuste final que chega ao renderer é 68.9. O que importa
// é o trem assentar na orla — o número exato é consequência disso.
assert.equal(tremPraia.ajusteY, 68.9);
assert.equal(tremPraia.larguraPx, 350, 'trem da praia redimensionado');
assert.equal(tremPraia.escalaY, .78);
assert.equal(linhaDoTrem().find(o => o.id === 'trem_dimensional').ajusteY, 58, 'ajuste da praia não altera o trem compartilhado');

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
state.progress.abilities = ['bio_dash', 'bio_diagnostic'];
const cableCar = gates.teleferico_quebrado;
state.player.x = cableCar.x;
state.player.y = cableCar.y - 1.5;
assert.equal(getModuleInteractionPrompt(), 'DIAGNOSTICAR CONDUTOR');
assert(!checkGate(cableCar.gate), 'E deve exigir diagnóstico');
assert.equal(getInteractionPrompt(findNearestInteraction()), 'EXAMINAR • R: DIAGNOSTICAR');
await checkInteractions(true);
assert(isDialogueOpen());
assert(!isGateOpen(cableCar));
assert.match(elements.dialogueText.textContent, /CONDUTOR ROMPIDO/);
closeDialogue();

state.save.loaded = true;
state.save.activeSlot = 1;
assert(tryModuleInteraction());
assert(state.progress.flags.teleferico_diagnosticado);
assert(getSave(1).progress.flags.teleferico_diagnosticado, 'diagnóstico deve ser salvo');
assert(!isGateOpen(cableCar), 'R não deve abrir o gate');
closeDialogue();
assert(checkGate(cableCar.gate));
assert(!checkGate(gates.rocha_rachada.gate));
await checkInteractions(true);
assert(isDialogueOpen());
closeDialogue();
assert(getSave(1).progress.flags.gate_teleferico_quebrado, 'abertura deve ser salva');
assert(isGateOpen(gates.teleferico_quebrado));
assert.equal(gates.teleferico_quebrado.bloqueia, false);
assert.equal(getModuleInteractionPrompt(), null, 'não deve diagnosticar o gate já aberto');
points = reachable();
assert(near(points, 9, 31, 2), 'ilha C deve ser acessível após abrir teleférico');
assert(near(points, gates.fenda_estreita.x, gates.fenda_estreita.y, 2.6));

// Saves antigos com o gate aberto não precisam refazer o diagnóstico.
delete state.progress.flags.teleferico_diagnosticado;
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
