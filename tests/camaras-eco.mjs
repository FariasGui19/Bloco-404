// node --experimental-default-type=module tests/camaras-eco.mjs
import assert from 'node:assert/strict';
import { state } from '../js/game/state.js';
import { input } from '../js/engine/input.js';
import { loadMap } from '../js/game/map-manager.js';
import { updateAbilities, getArchetypeAbilities } from '../js/game/abilities.js';
import { canStandAt } from '../js/game/collision.js';
import { isGateOpen } from '../js/game/gates.js';
import { getNearestCollectible, collectItem } from '../js/game/collectibles.js';
import { installMetroFragment, recordAirportDiagnosis } from '../js/game/metro-quest.js';
import { checkInteractions } from '../js/game/interactions.js';
import { closeDialogue } from '../js/ui/dialogue.js';
import { toggleArchetypeSuit } from '../js/game/ability-context.js';

const element = () => ({ dataset: {}, classList: { add() {}, remove() {} }, addEventListener() {}, textContent: '', innerHTML: '' });
const elements = Object.fromEntries(['dialogueBox', 'dialogueSpeaker', 'dialogueText', 'dialogueHint', 'dialogueChoices'].map(id => [id, element()]));
globalThis.document = { getElementById: id => elements[id] };
globalThis.window = { addEventListener() {} };
state.save.loaded = false;
state.save.activeSlot = null;
const press = key => { input.pressed.clear(); input.pressed.add(key); updateAbilities(0); input.pressed.clear(); };
for (const [archetype, room, action] of [
  ['lamina_dominio_anciao', 'hub_camara_dominio', 'golpe_ruptura'],
  ['mare_astral', 'hub_camara_mare', 'passo_corrente'],
  ['nucleo_dez_forma', 'hub_camara_nucleo', 'forma_veloz'],
]) {
  state.progress = { archetype, abilities: getArchetypeAbilities(archetype), flags: {}, inventory: [], activeQuest: { id: 'calibracao_de_eco' } };
  recordAirportDiagnosis(state.progress);
  assert(state.progress.flags.airportTerminalDiagnosed);
  await loadMap(room, 'vindo_do_aeroporto');
  const obstacle = state.objects[0];
  const player = state.player;
  Object.assign(player, { x: 4, y: 4.5, facing: 'right', energy: 100, ability: { cooldowns: {}, dash: null } });
  assert(canStandAt(state.world.currentMap, 4, 4.5, 0.2, player));
  assert(!canStandAt(state.world.currentMap, 5.5, 4.5, 0.2, player));
  assert(!canStandAt(state.world.currentMap, 5.5, 4.95, 0.2, player));
  assert(!canStandAt(state.world.currentMap, 5.5, 4.05, 0.2, player));
  assert.equal(getNearestCollectible(), null);
  press('q');
  assert(!isGateOpen(obstacle), 'Q sozinho não abre a câmara');
  player.ability = { cooldowns: {}, dash: null };
  press('r');
  assert(state.progress.flags[obstacle.gate.scanFlag]);
  await checkInteractions(true);
  assert(!isGateOpen(obstacle), 'E não substitui Q depois do diagnóstico');
  closeDialogue();
  if (obstacle.phaseAction) {
    Object.assign(player, { x: 4.9, y: 4.8, facing: 'left', energy: 100, ability: { cooldowns: {}, dash: null } });
    press('q');
    for (let i = 0; i < 20 && player.ability.dash; i++) updateAbilities(0.03);
    assert(!isGateOpen(obstacle), 'sair pelo mesmo lado não conta travessia');
    Object.assign(player, { x: 4, y: 4.5, facing: 'right', energy: 100, ability: { cooldowns: {}, dash: null } });
  }
  press('q');
  if (obstacle.phaseAction) {
    assert(!isGateOpen(obstacle), 'travessia não é concluída ao iniciar Q');
    assert(obstacle.bloqueia);
    updateAbilities(0.03);
    assert(!isGateOpen(obstacle), 'movimento parcial não concede a conclusão');
    for (let i = 0; i < 20 && player.ability.dash; i++) updateAbilities(0.03);
    assert(player.x > obstacle.x + 0.72, 'o jogador realmente atravessou');
    assert(obstacle.bloqueia && !obstacle.oculto, 'a barreira continua presente');
  }
  assert(isGateOpen(obstacle), `${action} completa após leitura`);
  await loadMap(room, 'vindo_do_aeroporto');
  assert(isGateOpen(state.objects[0]), 'progresso persiste após retornar');
  if (state.objects[0].phaseAction) {
    const reloaded = state.objects[0];
    assert(reloaded.bloqueia && !reloaded.oculto, 'travessia mantém obstáculo sólido após recarregar');
    assert(!canStandAt(state.world.currentMap, reloaded.x, reloaded.y, 0.2, player), 'caminhada ainda colide');
    Object.assign(player, { x: 6.8, y: 4.5, facing: 'left', energy: 100, ability: { cooldowns: {}, dash: null } });
    press('q');
    for (let i = 0; i < 20 && player.ability.dash; i++) updateAbilities(0.03);
    assert(player.x < reloaded.x - 0.72, 'possível voltar sem remover a barreira');
    // Posições relatadas pelo jogador junto ao limiar e fora do centro.
    Object.assign(player, { x: 6.2, y: 4.2, facing: 'left', energy: 100, ability: { cooldowns: {}, dash: null } });
    press('q');
    for (let i = 0; i < 20 && player.ability.dash; i++) updateAbilities(0.03);
    assert(player.x < reloaded.x - 0.85, `retorno do limiar desalinhado: ${player.x}, ${player.y}`);
    Object.assign(player, { x: 4.9, y: 4.8, facing: 'right', energy: 100, ability: { cooldowns: {}, dash: null } });
    press('q');
    for (let i = 0; i < 20 && player.ability.dash; i++) updateAbilities(0.03);
    assert(player.x > reloaded.x + 0.85, `ida do limiar desalinhado: ${player.x}, ${player.y}`);

  }
  player.x = 8; player.y = 4;
  const collectible = getNearestCollectible();
  assert(collectible && collectItem(collectible.item));
  closeDialogue();
  assert(state.progress.flags.fragmentoSincronizacaoColetado);
  installMetroFragment(state.progress);
  assert(state.progress.flags.metroCalibrado);
  assert(!state.progress.inventory.includes('fragmento_sincronizacao'));
  assert.deepEqual(state.progress.abilities, getArchetypeAbilities(archetype));
}
const p = { ability: {} };
assert(toggleArchetypeSuit({ archetype: 'mare_astral' }, p));
assert.equal(p.equippedSuit, 'mare');
assert(toggleArchetypeSuit({ archetype: 'mare_astral' }, p));
assert.equal(p.equippedSuit, null);
assert(!toggleArchetypeSuit({ archetype: 'nucleo_dez_forma' }, p));
console.log('Câmaras: R → Q → fragmento → metrô, persistência e trajes provisórios OK.');
