// node --experimental-default-type=module tests/aeroporto-sideview.mjs
import assert from 'node:assert/strict';
import { state } from '../js/game/state.js';
import { input } from '../js/engine/input.js';
import { loadMap } from '../js/game/map-manager.js';
import { canStandAt } from '../js/game/collision.js';
import { updatePlayer } from '../js/game/player.js';
import { camera, view, worldToScreen, screenToWorld, isSideViewCamera } from '../js/engine/camera.js';
import { renderSideViewMap } from '../js/engine/side-view.js';
import { findNearestInteraction, getInteractionPrompt } from '../js/game/interactions.js';
import { getModuleInteractionPrompt, tryModuleInteraction } from '../js/game/module-interactions.js';
import { getArchetypeAbilities } from '../js/game/abilities.js';

const element = () => ({ dataset: {}, classList: { add() {}, remove() {} }, addEventListener() {}, textContent: '', innerHTML: '' });
const elements = Object.fromEntries(['dialogueBox', 'dialogueSpeaker', 'dialogueText', 'dialogueHint', 'dialogueChoices'].map(id => [id, element()]));
globalThis.document = { getElementById: id => elements[id] };
globalThis.window = { addEventListener() {} };

view.w = 1280;
view.h = 720;
view.dpr = 1;

state.progress = {
  archetype: 'motor_bio_forja',
  abilities: getArchetypeAbilities('motor_bio_forja'),
  flags: {},
  inventory: [],
};

const requiredSpawns = [
  'inicio',
  'vindo_do_saguao',
  'chegada_sala_bio',
  'chegada_sala_dominio',
  'chegada_sala_mare',
  'chegada_sala_nucleo',
  'vindo_da_carga',
];

for (const spawnId of requiredSpawns) {
  const ok = await loadMap('hub_aeroporto', spawnId);
  assert(ok, `Falha ao carregar spawn ${spawnId}`);
  const map = state.world.currentMap;
  assert.equal(map.meta?.sideView, true, 'hub_aeroporto deve estar em modo sideView');
  assert.equal(isSideViewCamera(), true, 'Câmera deve ativar modo sideView no aeroporto');
  assert(canStandAt(map, state.player.x, state.player.y, 0.25, state.player), `Spawn ${spawnId} inválido`);
}

// Verifica conversões inversas worldToScreen <-> screenToWorld no side-view
await loadMap('hub_aeroporto', 'inicio');
const screenPos = worldToScreen(state.player.x, state.player.y);
const worldPos = screenToWorld(screenPos.x, screenPos.y);
assert(Math.abs(worldPos.x - state.player.x) < 1e-6, 'screenToWorld X deve inverter worldToScreen');
assert(Math.abs(worldPos.y - state.player.y) < 1e-6, 'screenToWorld Y deve inverter worldToScreen');

// Verifica movimentação puramente horizontal (Esquerda / Direita) no side-view
const x0 = state.player.x;
const y0 = state.player.y;
input.keys['d'] = true;
updatePlayer(0.1);
input.keys['d'] = false;
assert(state.player.x > x0, 'Tecla D deve mover horizontalmente para a direita');
assert(Math.abs(state.player.y - y0) < 1e-5, 'Tecla D não deve deslocar em diagonal no side-view');
assert.equal(state.player.facing, 'right');

// Verifica Guia do Aeroporto
state.player.x = 14.5;
state.player.y = 4.0;
const guiaInteraction = findNearestInteraction();
assert.equal(guiaInteraction?.kind, 'actor');
assert.equal(guiaInteraction?.data?.id, 'guia_aeroporto');

// Verifica diagnóstico do Terminal de Manutenção e desbloqueio da Área de Carga
state.player.x = 40.5;
state.player.y = 3.2;
const lockedPortal = findNearestInteraction();
assert.equal(lockedPortal?.kind, 'portal');
assert.equal(getInteractionPrompt(lockedPortal), 'ÁREA DE CARGA SEM SINCRONIA');

state.player.x = 37.5;
state.player.y = 3.2;
assert.equal(getModuleInteractionPrompt(), 'DIAGNOSTICAR TERMINAL');
assert.equal(tryModuleInteraction(), true);
assert.equal(state.progress.flags.airportTerminalDiagnosed, true);

state.player.x = 40.5;
state.player.y = 3.2;
const unlockedPortal = findNearestInteraction();
assert.equal(getInteractionPrompt(unlockedPortal), 'ACESSAR ÁREA DE CARGA');

// Verifica que ao voltar para o Saguão a câmera retorna ao modo isométrico
await loadMap('hub_saguao', 'vindo_do_aeroporto');
assert.equal(isSideViewCamera(), false, 'Câmera deve voltar para isométrico no Saguão');

console.log('Aeroporto Central Side-View 2.5D: spawns, câmera, controles horizontais, Guia, diagnóstico e portais OK.');
