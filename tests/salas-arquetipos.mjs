// node --experimental-default-type=module tests/salas-arquetipos.mjs
// Salas de Missão iniciais por arquétipo: spawn válido, protocolo R → Q
// funcional, portão persistente e Fragmento de Eco coletável.
import assert from 'node:assert/strict';
import { state } from '../js/game/state.js';
import { input } from '../js/engine/input.js';
import { loadMap } from '../js/game/map-manager.js';
import { updateAbilities, getArchetypeAbilities } from '../js/game/abilities.js';
import { canStandAt } from '../js/game/collision.js';
import { isGateOpen } from '../js/game/gates.js';
import { getNearestCollectible, collectItem } from '../js/game/collectibles.js';
import { checkInteractions } from '../js/game/interactions.js';
import { closeDialogue } from '../js/ui/dialogue.js';

const element = () => ({ dataset: {}, classList: { add() {}, remove() {} }, addEventListener() {}, textContent: '', innerHTML: '' });
const elements = Object.fromEntries(['dialogueBox', 'dialogueSpeaker', 'dialogueText', 'dialogueHint', 'dialogueChoices'].map(id => [id, element()]));
globalThis.document = { getElementById: id => elements[id] };
globalThis.window = { addEventListener() {} };
state.save.loaded = false;
state.save.activeSlot = null;
const press = key => { input.pressed.clear(); input.pressed.add(key); updateAbilities(0); input.pressed.clear(); };

const rooms = [
  { archetype: 'motor_bio_forja', map: 'sala_bio_forja', obstacle: 'grade_impeto_vivo',
    diagnosisFlag: 'bio_placa_diagnostico', fragment: 'fragmento_eco_bio', phase: false },
  { archetype: 'lamina_dominio_anciao', map: 'sala_dominio', obstacle: 'lacre_frequencia_sala',
    scanFlag: 'scan_lacre_sala', fragment: 'fragmento_eco_dominio', phase: false },
  { archetype: 'mare_astral', map: 'sala_mare', obstacle: 'fluxo_contido_sala',
    scanFlag: 'scan_fluxo_sala', fragment: 'fragmento_eco_mare', phase: true },
  { archetype: 'nucleo_dez_forma', map: 'sala_nucleo', obstacle: 'malha_cinetica_sala',
    scanFlag: 'scan_malha_sala', fragment: 'fragmento_eco_nucleo', phase: true },
];

for (const room of rooms) {
  state.progress = {
    archetype: room.archetype,
    abilities: getArchetypeAbilities(room.archetype),
    flags: {},
    inventory: [],
  };

  const ok = await loadMap(room.map, 'vindo_do_aeroporto');
  assert(ok, `${room.map} deve carregar`);

  // 1) Spawn seguro: nasce em chão livre, nunca dentro de parede/obstáculo
  const map = state.world.currentMap;
  assert(canStandAt(map, state.player.x, state.player.y, 0.25, state.player),
    `${room.map}: spawn (${state.player.x}, ${state.player.y}) inválido`);

  // 2) Chegada alinhada ao portal de saída
  assert(Math.hypot(state.player.x - 2.5, state.player.y - 5.5) < 0.6,
    `${room.map}: chegada deveria nascer na borda oeste`);

  // 3) O portão bloqueia a passagem leste antes de qualquer diagnóstico
  const obstacle = state.objects.find(o => o.id === room.obstacle);
  assert(obstacle, `${room.map}: obstáculo ${room.obstacle} presente`);
  assert(obstacle.bloqueia, `${room.map}: portão deve bloquear`);
  assert(!canStandAt(map, obstacle.x, obstacle.y, 0.2, state.player),
    `${room.map}: portão deve colidir`);

  // 4) Fragmento indisponível antes de abrir o portão
  assert.equal(getNearestCollectible(), null,
    `${room.map}: fragmento não pode ser alcançado com o portão fechado`);

  // 5) Q sozinho não abre nada (abordagem real: diagonal sul-oeste da grade)
  const approachY = room.map === 'sala_bio_forja' ? 6.8 : 5.5;
  const approachX = room.map === 'sala_bio_forja' ? 9.2 : (room.phase ? 8.7 : 8);
  Object.assign(state.player, { x: approachX, y: approachY, facing: 'right', energy: 100, maxEnergy: 100,
    ability: { cooldowns: {}, dash: null, scanning: 0 } });
  press('q');
  for (let i = 0; i < 24 && state.player.ability?.dash; i++) updateAbilities(0.03);
  assert(!isGateOpen(obstacle), `${room.map}: Q sem diagnóstico não abre o portão`);

  // 6) R diagnostica/lê o portão
  state.player.ability = { cooldowns: {}, dash: null, scanning: 0 };
  press('r');
  closeDialogue();
  const diagnosis = room.diagnosisFlag ?? room.scanFlag;
  assert(state.progress.flags[diagnosis], `${room.map}: R deveria gravar ${diagnosis}`);
  assert(!isGateOpen(obstacle), `${room.map}: leitura sozinha não abre o portão`);

  // 7) Q (e a travessia real, quando aplicável) abre o portão
  Object.assign(state.player, { x: approachX, y: approachY, facing: 'right', energy: 100, maxEnergy: 100,
    ability: { cooldowns: {}, dash: null, scanning: 0 } });
  press('q');
  for (let i = 0; i < 30 && state.player.ability?.dash; i++) updateAbilities(0.03);
  assert(isGateOpen(obstacle), `${room.map}: portão deveria abrir após R + Q`);

  // 8) Persistência entre visitas
  await loadMap(room.map, 'vindo_do_aeroporto');
  const reloaded = state.objects.find(o => o.id === room.obstacle);
  assert(isGateOpen(reloaded), `${room.map}: portão deve continuar aberto ao recarregar`);

  // 9) Fragmento disponível, coletável e inventariado
  const fragment = state.collectibles.find(c => c.id === room.fragment);
  assert(fragment, `${room.map}: fragmento ${room.fragment} registrado`);
  Object.assign(state.player, { x: fragment.x, y: fragment.y });
  const nearest = getNearestCollectible();
  assert(nearest && nearest.item.id === room.fragment, `${room.map}: fragmento ao alcance após abrir`);
  assert(collectItem(nearest.item), `${room.map}: fragmento deve ser coletável`);
  assert(state.progress.inventory.includes(room.fragment), `${room.map}: fragmento no inventário`);

  // 10) Portal de retorno ao aeroporto presente
  assert(state.portals.some(p => p.destino?.mapId === 'hub_aeroporto'),
    `${room.map}: portal de volta ao aeroporto presente`);

  console.log(`${room.map}: protocolo R → Q, portão, fragmento e retorno OK`);
}

console.log('Salas de Missão: spawn, protocolo, persistência e fragmentos OK.');
