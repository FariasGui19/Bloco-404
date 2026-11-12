// node --experimental-default-type=module tests/limiar-frequencia.mjs
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { state } from '../js/game/state.js';
import { loadMap } from '../js/game/map-manager.js';
import { canStandAt } from '../js/game/collision.js';
import { checkInteractions, findNearestInteraction } from '../js/game/interactions.js';
import { tryModuleInteraction } from '../js/game/module-interactions.js';
import { getArchetypeAbilities } from '../js/game/abilities.js';
import { advanceDialogue, closeDialogue, hasDialogueChoices } from '../js/ui/dialogue.js';
import { isCutsceneOpen, BOOT_SCENES, SIGNAL_SCENES, THRESHOLD_SCENES } from '../js/ui/cutscene.js';
import { syncFrequencyQuest } from '../js/game/frequencia-quest.js';
import { saveGame, loadSaveIntoState } from '../js/game/save.js';

const el = () => ({ dataset: {}, style: {}, classList: { add() {}, remove() {} }, textContent: '', innerHTML: '', children: [],
  addEventListener(type, fn) { this[type] = fn; }, appendChild(n) { this.children.push(n); }, setAttribute() {}, focus() {}, remove() {} });
const elements = Object.fromEntries(['dialogueBox', 'dialogueSpeaker', 'dialogueText', 'dialogueHint', 'dialogueChoices'].map(id => [id, el()]));
let modal;
globalThis.document = { activeElement: el(), getElementById: id => elements[id], body: { appendChild(n) { modal = n; } },
  createElement(tag) { const n = el(); if (tag === 'section') { const parts = Object.fromEntries(['art', 'eyebrow', 'title', 'text', 'note', 'count', 'next', 'skip'].map(k => [`.cutscene-${k}`, el()])); n.querySelector = k => parts[k]; n.parts = parts; } return n; } };
globalThis.window = { addEventListener() {}, removeEventListener() {} };
state.save.loaded = false; state.save.activeSlot = null;
assert(BOOT_SCENES[0].image && BOOT_SCENES[1].image);
for (const s of [...BOOT_SCENES, ...SIGNAL_SCENES, ...THRESHOLD_SCENES]) {
  assert(s.image, `${s.title} precisa ter arte`);
  assert(existsSync(s.image), s.image);
}
for (const file of ['abrigo-costeiro','receptor-costeiro','limiar-industrial','mesa-controle','ancora-origem','ancora-retorno','ancora-memoria','mesa-cartografia','poste-baliza','painel-escuta','rack-estacao','mesa-arquivo','reator-estacao']) {
  const png = readFileSync(`assets/sprites/frequencia-666/${file}.png`);
  assert.equal(png[25], 6, `${file} deve ter canal alfa RGBA real`);
}

for (const archetype of ['motor_bio_forja', 'lamina_dominio_anciao', 'mare_astral', 'nucleo_dez_forma']) {
  // Save antigo com sinal já registrado: nenhuma migração precisa ser manual.
  state.progress = { archetype, abilities: getArchetypeAbilities(archetype), inventory: [],
    flags: { metroCalibrado: true, frequencia666Registrada: true },
    activeQuest: { id: 'embarque_dimensional', stage: 'sinal_registrado', status: 'active' } };
  await loadMap('ilha_enseada_ecos', 'vindo_da_estacao_666');
  const entrance = state.portals.find(p => p.id === 'acesso_estacao_666');
  assert.equal(entrance.requiresFlag, 'frequencia666Registrada');
  assert(canStandAt(state.world.currentMap, entrance.x + .5, entrance.y + .5, .25, state.player), 'entrada acessível');
  const exitSpawn = state.world.currentMap.spawnPoints.vindo_da_estacao_666;
  assert(canStandAt(state.world.currentMap, exitSpawn.x, exitSpawn.y, .25, state.player), 'retorno seguro');
  assert(Math.hypot(exitSpawn.x-(entrance.x+.5),exitSpawn.y-(entrance.y+.5)) > entrance.interactionDistance, 'não retorna automaticamente à estação');
  await loadMap(entrance.destino.mapId, entrance.destino.spawnId);
  assert.match(state.progress.activeQuest.description, /0\/3/, 'objetivo da estação ao chegar');
  const map = state.world.currentMap;
  const spawn = map.spawnPoints.vindo_da_enseada;
  assert(canStandAt(map, spawn.x, spawn.y, .25, state.player));
  const reachable = new Set(), queue = [[Math.floor(spawn.x), Math.floor(spawn.y)]];
  for (let i = 0; i < queue.length; i++) {
    const [x,y] = queue[i], key = `${x},${y}`; if (reachable.has(key)) continue;
    if (!canStandAt(map, x+.5, y+.5, .25, state.player)) continue;
    reachable.add(key);
    for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) queue.push([x+dx,y+dy]);
  }
  for (const obj of state.objects.filter(o => o.interacao)) assert(reachable.has(`${Math.floor(obj.x)},${Math.floor(obj.y)}`), `${obj.id} deve ser alcançável`);
  for (const id of ['arquivo_estacao_666', 'cartografia_estacao_666', 'rack_estacao_666_c', 'reator_estacao_666', 'registro_estacao_666']) {
    const obj = state.objects.find(o => o.id === id);
    Object.assign(state.player, { x: obj.x, y: obj.y });
    assert.equal(findNearestInteraction()?.data.id, id, `${id} deve ser interativo`);
    await checkInteractions(true);
    assert(elements.dialogueText.textContent.length > 10, `${id} tem registro legível`);
    closeDialogue();
  }
  const consoleObj = state.objects.find(o => o.id === 'console_limiar_666');
  const ring = state.objects.find(o => o.id === 'anel_limiar_666');
  const approach = obj => Object.assign(state.player, { x: obj.x, y: obj.y, energy: 100, ability: { cooldowns: {}, dash: null } });
  approach(ring); await checkInteractions(true); assert(!state.progress.flags.freq666_limiar_preparado); closeDialogue();
  approach(consoleObj); assert(tryModuleInteraction()); assert(!state.progress.flags.freq666_limiar_estavel); closeDialogue();
  for (const id of ['memoria', 'origem', 'retorno']) {
    const obj = state.objects.find(o => o.id === `ancora_666_${id}`); approach(obj);
    assert.equal(findNearestInteraction()?.data.id, obj.id); await checkInteractions(true);
    assert(state.progress.flags[`freq666_ancora_${id}`]); closeDialogue();
  }
  assert.equal(state.progress.activeQuest.stage, 'calibrar_limiar');
  approach(consoleObj); assert(tryModuleInteraction()); assert(state.progress.flags.freq666_limiar_estavel); closeDialogue();
  approach(ring); await checkInteractions(true); assert(!hasDialogueChoices()); advanceDialogue(); assert(hasDialogueChoices());
  // Simula clique real na primeira escolha, após todas as falas.
  const button = elements.dialogueChoices.children.at(-2);
  button.click({ preventDefault() {}, stopPropagation() {} });
  assert(isCutsceneOpen()); assert(state.progress.flags.freq666_limiar_preparado);
  assert.equal(state.progress.activeQuest.stage, 'limiar_preparado');
  modal.parts['.cutscene-skip'].click();
  assert(!isCutsceneOpen());
  await loadMap('ilha_enseada_ecos', 'vindo_da_estacao_666');
  await loadMap('estacao_limiar_666', 'vindo_da_enseada');
  assert.equal(state.progress.activeQuest.stage, 'limiar_preparado');
  approach(state.objects.find(o => o.id === 'anel_limiar_666')); await checkInteractions(true); advanceDialogue(); assert(hasDialogueChoices()); closeDialogue();
}
// Round trip real do save, incluindo retorno ao mapa e flags do limiar.
const store = new Map();
globalThis.localStorage = { setItem: (k,v) => store.set(k,v), getItem: k => store.get(k) ?? null, removeItem: k => store.delete(k) };
state.save.loaded = true; state.save.activeSlot = 1; state.save.profileName = 'Teste';
assert(saveGame());
state.progress = {}; state.world.currentMapId = 'hub_saguao';
assert(loadSaveIntoState(1));
assert(state.progress.flags.freq666_limiar_preparado);
assert.equal(state.progress.activeQuest.stage, 'limiar_preparado');
assert.equal(state.world.currentMapId, 'estacao_limiar_666');

for (const q of [{ id:'outra', stage:'x', status:'active' }, { id:'embarque_dimensional', stage:'cidadela', status:'active' }, { id:'embarque_dimensional', stage:'sinal_registrado', status:'completed' }]) {
  const p = { flags: { frequencia666Registrada:true, freq666_limiar_preparado:true }, activeQuest: { ...q } };
  syncFrequencyQuest(p); assert.deepEqual(p.activeQuest, q, 'não reescreve missões alheias/futuras/concluídas');
}
console.log('Limiar: acesso, âncoras, console, escolha e reprise para quatro arquétipos OK.');
