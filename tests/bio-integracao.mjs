// Consequência perceptível dos reparos: rede energizada → diagnóstico da válvula
// → fluxo parcial. Sem recompensa, sem conclusão de missão e sem apagar saves.
import assert from 'node:assert/strict';
import { map as dadosMap } from '../js/data/worlds/arquipelago-rotas-perdidas/estacao-bio.js';
import { state } from '../js/game/state.js';
import { loadMap } from '../js/game/map-manager.js';
import { canStandAt } from '../js/game/collision.js';
import { checkGate, isGateOpen } from '../js/game/gates.js';
import { tryModuleInteraction, getModuleInteractionPrompt } from '../js/game/module-interactions.js';
import { checkInteractions, findNearestInteraction, getInteractionPrompt } from '../js/game/interactions.js';
import { initDialogue, closeDialogue, isDialogueOpen } from '../js/ui/dialogue.js';
import { getSave } from '../js/game/save.js';
import { filtroObjeto } from '../js/engine/renderer.js';

const els = Object.fromEntries(
  ['dialogueBox', 'dialogueSpeaker', 'dialogueText', 'dialogueHint', 'dialogueChoices']
    .map(id => [id, { dataset: {}, classList: { add() {}, remove() {} }, addEventListener() {}, textContent: '', innerHTML: '' }])
);
globalThis.document = { getElementById: id => els[id] };
globalThis.window = { addEventListener() {} };
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
initDialogue();

// Save antigo: três coletáveis e nenhum reparo novo.
state.progress = {
  archetype: 'motor_bio_forja', abilities: ['bio_dash', 'bio_diagnostic'],
  flags: {
    collected_bio_estacao_condutor: true,
    collected_bio_estacao_regulador: true,
    collected_bio_estacao_estufa: true,
  },
  inventory: ['bio_estacao_condutor', 'bio_estacao_regulador', 'bio_estacao_estufa'],
  activeQuest: { id: 'embarque_dimensional', title: 'EMBARQUE DIMENSIONAL' },
};
const inventarioAntigo = state.progress.inventory.length;
state.save.loaded = true; state.save.activeSlot = 1;
await loadMap('ilha_estacao_bio');
const mapa = state.world.currentMap;

const achar = id => state.objects.find(o => o.id === id);
const irPerto = (obj, dx = -1.1) => {
  state.player.x = obj.x + dx; state.player.y = obj.y;
  assert(canStandAt(mapa, state.player.x, state.player.y, .28, state.player), `${obj.id}: aproximação válida`);
};

// Antes dos reparos a válvula está fria e não é diagnosticável.
const valvula = achar('bio_valvula_estufa');
assert(valvula);
assert.equal(valvula.moduleSystem.requiresFlag, 'gate_bio_reparo_regulador');
irPerto(valvula, -1.2);
assert(!checkGate(valvula.gate));
assert.equal(getInteractionPrompt(findNearestInteraction()), 'REPARE A LINHA PRIMEIRO');
assert(!getModuleInteractionPrompt(), 'R não lê a válvula com a linha fria');
await checkInteractions(true);
assert(isDialogueOpen());
closeDialogue();
assert(!state.progress.flags.bio_valvula_estufa_diagnostico);

// Diagnóstico R + reconstrução E nos dois sistemas já existentes.
const condutor = achar('bio_reparo_condutor'), regulador = achar('bio_reparo_regulador');
irPerto(condutor);
assert.equal(getModuleInteractionPrompt(), 'DIAGNOSTICAR CONDUTOR');
assert(tryModuleInteraction()); closeDialogue();
await checkInteractions(true); assert(isGateOpen(condutor)); closeDialogue();
irPerto(regulador);
assert.equal(getModuleInteractionPrompt(), 'DIAGNOSTICAR REGULADOR');
assert(tryModuleInteraction()); closeDialogue();
await checkInteractions(true); assert(isGateOpen(regulador)); closeDialogue();
assert(state.progress.flags.gate_bio_reparo_condutor);
assert(state.progress.flags.gate_bio_reparo_regulador);

// Um save que já tinha os reparos concluídos também libera o novo passo.
state.progress.flags = {
  ...state.progress.flags,
  collected_bio_estacao_condutor: true,
  collected_bio_estacao_regulador: true,
  collected_bio_estacao_estufa: true,
};
await loadMap('ilha_estacao_bio');
const valvula2 = achar('bio_valvula_estufa');
irPerto(valvula2, -1.2);
assert.equal(getModuleInteractionPrompt(), 'DIAGNOSTICAR VÁLVULA DA ESTUFA');
assert(!checkGate(valvula2.gate), 'E continua exigindo o diagnóstico R');
assert.equal(getInteractionPrompt(findNearestInteraction()), 'EXAMINAR • DIAGNÓSTICO: R');
await checkInteractions(true);
assert(isDialogueOpen()); closeDialogue();
assert(!state.progress.flags.gate_bio_valvula_estufa, 'E antes de R não abre o fluxo');

assert(tryModuleInteraction());
assert(state.progress.flags.bio_valvula_estufa_diagnostico);
assert(getSave(1).progress.flags.bio_valvula_estufa_diagnostico, 'diagnóstico persistido');
closeDialogue();
assert.equal(getInteractionPrompt(findNearestInteraction()), 'ABRIR FLUXO PARCIAL');
await checkInteractions(true);
assert(isGateOpen(valvula2));
closeDialogue();
assert(state.progress.flags.gate_bio_valvula_estufa);
assert(getSave(1).progress.flags.gate_bio_valvula_estufa, 'fluxo persistido');
assert(valvula2.bloqueia, 'válvula continua sólida');
assert.equal(valvula2.sprite, 'bio_distribuidor', 'não troca de sprite nem concede item');
assert.equal(filtroObjeto(valvula2), 'brightness(1.22) saturate(1.25)', 'estado acende a peça');
assert.equal(filtroObjeto(achar('bio_estufa_principal')), 'brightness(1.10) saturate(1.10)', 'estufa responde ao fluxo');

// Consequência é só estado/visual: nenhuma recompensa ou missão substituída.
assert.equal(state.progress.inventory.length, inventarioAntigo);
assert.equal(state.progress.activeQuest.id, 'embarque_dimensional');
assert(state.progress.flags.collected_bio_estacao_condutor);
assert(state.progress.flags.collected_bio_estacao_regulador);
assert(state.progress.flags.collected_bio_estacao_estufa);
assert(state.progress.flags.gate_bio_reparo_condutor && state.progress.flags.gate_bio_reparo_regulador);

// Reentrada: estados, colisões e filtros permanecem.
await loadMap('ilha_estacao_bio');
const reentrada = achar('bio_valvula_estufa');
assert(isGateOpen(reentrada));
assert(reentrada.bloqueia);
assert.equal(filtroObjeto(reentrada), 'brightness(1.22) saturate(1.25)');
assert.equal(achar('bio_reparo_condutor').sprite, 'bio_condutor_ativo');
assert.equal(achar('bio_reparo_regulador').sprite, 'bio_regulador_ativo');
assert(state.progress.flags.collected_bio_estacao_estufa);

// Arquétipo errado não abre a válvula, mesmo com a linha energizada.
const gateOriginal = dadosMap.objects.find(o => o.id === 'bio_valvula_estufa').gate;
state.progress.archetype = 'mare_astral';
assert(!checkGate(gateOriginal), 'outro arquétipo não abre a válvula');
state.progress.archetype = 'motor_bio_forja';

console.log('Bio: rede, R/E da válvula, persistência, saves antigos e ausência de recompensa OK.');
