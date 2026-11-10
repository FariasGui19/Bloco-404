import assert from 'node:assert/strict';
import { QUESTS, getQuest } from '../js/data/quests.js';
import {
  getQuestState, isQuestComplete, listTrackedQuests, recordQuestEvent, startQuest,
} from '../js/game/quests.js';
import { ensureArchetypeProgress } from '../js/game/progression.js';

const progress = { archetype: 'lamina_dominio_anciao', archetypeProgress: {}, inventory: [], flags: {}, completedQuests: [] };
ensureArchetypeProgress(progress);

// Antes de começar, a missão é "available" e não suja o save.
assert.equal(getQuestState(progress, 'calibracao_de_campo').status, 'available');
assert.equal(progress.questLog, undefined, 'consultar não cria registro');
assert.deepEqual(getQuestState(progress, 'missao_inexistente'), null);

const started = startQuest(progress, 'calibracao_de_campo');
assert.equal(started.status, 'active');
assert.equal(progress.questLog.calibracao_de_campo.counters[0], 0);
assert.deepEqual(startQuest(JSON.parse(JSON.stringify(progress)), 'calibracao_de_campo').objectives[0].current, 0);

// Evento de outro tipo ou alvo não conta.
recordQuestEvent(progress, { type: 'collect', target: 'training' });
recordQuestEvent(progress, { type: 'defeat', target: 'fauna' });
assert.equal(getQuestState(progress, 'calibracao_de_campo').objectives[0].current, 0);

recordQuestEvent(progress, { type: 'defeat', target: 'training', amount: 2 });
assert.equal(getQuestState(progress, 'calibracao_de_campo').objectives[0].current, 2);
assert.equal(isQuestComplete(progress, 'calibracao_de_campo'), false);

const xpBefore = progress.archetypeProgress.lamina_dominio_anciao.xp;
const completed = recordQuestEvent(progress, { type: 'defeat', target: 'training' });
assert.equal(completed.length, 1);
assert.equal(completed[0].id, 'calibracao_de_campo');
assert.equal(getQuestState(progress, 'calibracao_de_campo').status, 'completed');
assert(progress.completedQuests.includes('calibracao_de_campo'));
assert(progress.inventory.includes('registro_de_calibracao'), 'recompensa de item entregue');
assert.equal(progress.flags.calibracao_de_campo_concluida, true);
const kit = progress.archetypeProgress.lamina_dominio_anciao;
assert(kit.xp + (kit.level > 1 ? 40 : 0) > xpBefore, 'recompensa de XP somada');
assert.equal(kit.mastery.eco, 2, 'concluir missão alimenta a maestria de eco');

// Recompensa não é entregue duas vezes.
const ecoAfter = kit.mastery.eco;
const inventoryLength = progress.inventory.length;
recordQuestEvent(progress, { type: 'defeat', target: 'training', amount: 5 });
assert.equal(kit.mastery.eco, ecoAfter);
assert.equal(progress.inventory.length, inventoryLength);
assert.equal(progress.completedQuests.filter(id => id === 'calibracao_de_campo').length, 1);

// O Códex lista só o que foi iniciado e mantém orientação de leitura.
assert.equal(listTrackedQuests(progress).length, 1);
assert.deepEqual(listTrackedQuests({ archetype: 'mare_astral' }), []);

// Toda missão declarada precisa de objetivos e recompensa coerentes.
for (const quest of Object.values(QUESTS)) {
  assert.equal(quest.id, getQuest(quest.id).id);
  assert(quest.objectives.length > 0);
  assert(quest.objectives.every(objective => objective.count > 0 && objective.label));
  assert(quest.rewards.xp > 0);
}

console.log('Missões: início, objetivos contados, conclusão única, recompensas e leitura segura OK.');
