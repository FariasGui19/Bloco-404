// =====================================================================
// LIBERAÇÕES — nível abre ferramenta e Ultimate, e a Ultimate tem carga
// =====================================================================
import assert from 'node:assert/strict';

import {
  UNLOCK_STEPS, getFeatureLevel, getNextStep, getStepForLevel, isFeatureUnlocked,
} from '../js/data/archetype-unlocks.js';
import {
  applyUnlocks, describeNextUnlock, getUnlockState, getUnlockStepFor, isUnlocked, levelsUntil,
} from '../js/game/unlocks.js';
import { getToolAccess, listTools, selectTool } from '../js/game/tools.js';
import {
  ULTIMATE_WINDUP, beginUltimate, canCastUltimate, getUltimateStatus, tryUltimate, updateUltimate,
} from '../js/game/ultimate.js';
import { ensureArchetypeProgress } from '../js/game/progression.js';
import { ARCHETYPE_KITS } from '../js/data/archetype-kits.js';

const ARQ = 'motor_bio_forja';
const KIT = ARCHETYPE_KITS[ARQ];

function novoProgress(nivel = 1) {
  const progress = { archetype: ARQ, archetypeProgress: {}, abilities: [], tools: {} };
  ensureArchetypeProgress(progress, ARQ);
  progress.archetypeProgress[ARQ].level = nivel;
  return progress;
}

function novoPlayer(extra = {}) {
  return {
    x: 10, y: 10, facing: 'down',
    health: 100, maxHealth: 130,
    energy: 100, maxEnergy: 100,
    ability: { cooldowns: {} },
    ultimate: undefined,
    ...extra,
  };
}

// ---------------------------------------------------------------
// Degraus
// ---------------------------------------------------------------
assert.equal(UNLOCK_STEPS.length, 5);
assert.deepEqual(UNLOCK_STEPS.map(step => step.level), [1, 2, 3, 5, 8], 'degraus em ordem crescente');
assert.deepEqual(UNLOCK_STEPS.map(step => step.step), [1, 2, 3, 4, 5]);
for (const step of UNLOCK_STEPS) {
  assert(step.label.length > 3 && typeof step.note === 'string');
  if (step.planned) assert.equal(step.features.length, 0, `${step.id}: planejado não entrega poder`);
}

assert.equal(getStepForLevel(1).id, 'kit');
assert.equal(getStepForLevel(2).id, 'ferramenta');
assert.equal(getStepForLevel(3).id, 'ultimate');
assert.equal(getStepForLevel(4).id, 'ultimate', 'nível 4 continua no degrau 3');
assert.equal(getStepForLevel(7).id, 'modo_avancado');
assert.equal(getStepForLevel(20).id, 'ultimate_arquetipo');
assert.equal(getStepForLevel(0).id, 'kit', 'nível inválido cai no kit');
assert.equal(getStepForLevel(undefined).id, 'kit');

assert.equal(getNextStep(1).id, 'ferramenta');
assert.equal(getNextStep(2).id, 'ultimate');
assert.equal(getNextStep(4).id, 'modo_avancado');
assert.equal(getNextStep(20), null, 'topo do caminho');

assert.equal(isFeatureUnlocked(1, 'q'), true);
assert.equal(isFeatureUnlocked(1, 'r'), true);
assert.equal(isFeatureUnlocked(1, 'tool'), false);
assert.equal(isFeatureUnlocked(2, 'tool'), true);
assert.equal(isFeatureUnlocked(2, 'ultimate'), false);
assert.equal(isFeatureUnlocked(3, 'ultimate'), true);
assert.equal(getFeatureLevel('tool'), 2);
assert.equal(getFeatureLevel('ultimate'), 3);

// ---------------------------------------------------------------
// Estado por progresso
// ---------------------------------------------------------------
const noInicio = novoProgress(1);
const estado1 = getUnlockState(noInicio);
assert.equal(estado1.level, 1);
assert.deepEqual(estado1.features, { q: true, r: true, tool: false, ultimate: false });
assert.equal(estado1.next.id, 'ferramenta');
assert.match(describeNextUnlock(noInicio), /FERRAMENTA · NÍVEL 2/);
assert.equal(levelsUntil(noInicio, 'ultimate'), 2);
assert.equal(isUnlocked(noInicio, 'tool'), false);
assert.equal(getUnlockStepFor(2).level, 2);
assert.equal(getUnlockStepFor(0), null, 'degrau 0 não tem liberação');

// applyUnlocks registra Q e R uma vez só.
assert.deepEqual(noInicio.abilities, []);
const liberado = applyUnlocks(noInicio, KIT);
assert.deepEqual(liberado.map(entry => entry.id).sort(), [KIT.q, KIT.r].sort());
assert(noInicio.abilities.includes(KIT.q) && noInicio.abilities.includes(KIT.r));
assert.deepEqual(applyUnlocks(noInicio, KIT), [], 'segunda chamada não duplica');
assert.equal(noInicio.abilities.filter(id => id === KIT.q).length, 1);

// Nível 5 (degrau planejado) não entrega habilidade nova.
const nivel5 = novoProgress(5);
applyUnlocks(nivel5, KIT);
assert.equal(nivel5.abilities.length, 2, 'degrau planejado não adiciona poder');
assert.equal(getUnlockState(nivel5).step.id, 'modo_avancado');
assert.equal(getUnlockState(nivel5).next.id, 'ultimate_arquetipo');

// ---------------------------------------------------------------
// Ferramenta travada até o nível 2
// ---------------------------------------------------------------
assert.equal(getToolAccess(noInicio).unlocked, false);
assert.equal(selectTool(noInicio, 'lamina_de_forja'), null, 'não instala ferramenta no nível 1');
assert.deepEqual(noInicio.tools, {});
assert(listTools(noInicio).every(tool => tool.locked), 'todas travadas na HUD/Códex');

const nivel2 = novoProgress(2);
assert.equal(getToolAccess(nivel2).unlocked, true);
assert.equal(selectTool(nivel2, 'lamina_de_forja')?.id, 'lamina_de_forja');
assert(listTools(nivel2).some(tool => tool.selected && !tool.locked));

// ---------------------------------------------------------------
// Ultimate travada até o nível 3
// ---------------------------------------------------------------
const player = novoPlayer();
const bloqueado = canCastUltimate(player, noInicio);
assert.equal(bloqueado.ok, false);
assert.match(bloqueado.reason, /ULTIMATE BLOQUEADA · NÍVEL 3/);
assert.equal(tryUltimate({ player, progress: noInicio, targets: [] }), null, 'F não dispara travada');
assert.equal(player.energy, 100, 'travada não cobra energia');

const statusTravado = getUltimateStatus(novoPlayer(), noInicio);
assert.equal(statusTravado.locked, true);
assert.equal(statusTravado.requiredLevel, 3);
assert.equal(statusTravado.ready, false);

const nivel3 = novoProgress(3);
selectTool(nivel3, 'lamina_de_forja');
const statusLivre = getUltimateStatus(novoPlayer(), nivel3);
assert.equal(statusLivre.locked, false);
assert.equal(statusLivre.ready, true);
assert.equal(canCastUltimate(novoPlayer(), nivel3).ok, true);

// ---------------------------------------------------------------
// Carga: energia e recarga agora, dano só na soltura
// ---------------------------------------------------------------
const alvo = { id: 'alvo', x: 12, y: 12, health: 200, maxHealth: 200 };
const carregando = novoPlayer();
const inicio = beginUltimate({ player: carregando, progress: nivel3, targets: [alvo] });
assert.equal(inicio.started, true);
assert.equal(carregando.ultimate.charge, ULTIMATE_WINDUP, 'carga aberta');
assert.equal(carregando.energy, 100 - inicio.definition.cost, 'energia cobrada na hora');
assert.equal(carregando.ultimate.cooldown, inicio.definition.cooldown, 'recarga começou');
assert.equal(alvo.health, 200, 'nada de dano antes da soltura');
assert.equal(carregando.ultimate.effect, null, 'efeito só depois');
assert.equal(getUltimateStatus(carregando, nivel3).charging, true);

// Metade da carga: ainda nada.
updateUltimate(carregando, nivel3, ULTIMATE_WINDUP / 2, { targets: [alvo] });
assert.equal(alvo.health, 200, 'meia carga não fere');
assert(carregando.ultimate.charge > 0);

// Fim da carga: resolve com os alvos do quadro atual.
updateUltimate(carregando, nivel3, ULTIMATE_WINDUP, { targets: [alvo] });
assert.equal(carregando.ultimate.charge, 0, 'carga fechada');
assert(alvo.health < 200, 'corte da lâmina acertou na soltura');
assert(carregando.ultimate.effect?.kind === 'line', 'efeito de corte disparado');
assert(carregando.ultimate.shake?.timeLeft > 0, 'tremor de câmera ligado');
assert(carregando.ultimate.flash?.timeLeft > 0, 'clarão ligado');
assert(carregando.ability.lastMessage?.length > 0, 'mensagem da soltura');

// Tremor e clarão expiram sozinhos.
updateUltimate(carregando, nivel3, 2, { targets: [] });
assert.equal(carregando.ultimate.shake, null);
assert.equal(carregando.ultimate.flash, null);

// Durante a carga a recarga não permite um segundo disparo.
const outroPlayer = novoPlayer();
beginUltimate({ player: outroPlayer, progress: nivel3, targets: [] });
assert.equal(beginUltimate({ player: outroPlayer, progress: nivel3, targets: [] }), null, 'não empilha cargas');

// Modo instantâneo continua existindo (testes e chamadas fora do loop).
const instantaneo = novoPlayer();
const resultado = tryUltimate({ player: instantaneo, progress: nivel3, targets: [], rng: () => .5 });
assert(resultado && resultado.damage && resultado.definition.id === 'corte_de_reconfiguracao');
assert.equal(instantaneo.ultimate.charge, 0);

// Sem energia a carga nem abre.
const semEnergia = novoPlayer({ energy: 3 });
assert.equal(beginUltimate({ player: semEnergia, progress: nivel3, targets: [] }), null);
assert.equal(semEnergia.ultimate.charge, 0, 'carga não abre');
assert.equal(semEnergia.energy, 3, 'sem energia não cobra nada');

console.log('Liberações: degraus por nível, ferramenta/Ultimate travadas e carga com soltura OK.');
