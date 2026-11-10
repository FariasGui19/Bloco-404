// =====================================================================
// MISSÕES — MOTOR
//
// Guarda o andamento em progress.questLog[id] e entrega recompensas uma
// única vez. Nenhuma missão antiga é reescrita: activeQuest continua
// sendo a missão principal do fluxo do metrô.
// =====================================================================
import { getQuest } from '../data/quests.js';
import { grantArchetypeXp } from './rpg.js';
import { recordMastery } from './mastery.js';

// `create` separa leitura (diário) de escrita (início/evento): abrir o
// diário não pode alterar o save.
export function ensureQuestLog(progress, create = false) {
  if (!progress) return null;
  const valid = progress.questLog && typeof progress.questLog === 'object' && !Array.isArray(progress.questLog);
  if (valid) return progress.questLog;
  if (!create) return null;
  progress.questLog = {};
  return progress.questLog;
}

function emptyState(quest) {
  return {
    status: 'active',
    counters: quest.objectives.map(() => 0),
    claimed: false,
  };
}

export function getQuestState(progress, id) {
  const quest = getQuest(id);
  if (!quest) return null;
  const log = ensureQuestLog(progress) ?? {};
  const state = log[id];
  if (!state) return { id, status: 'available', objectives: quest.objectives.map(o => ({ ...o, current: 0, done: false })), claimed: false };
  const counters = quest.objectives.map((_, i) => (Number.isInteger(state.counters?.[i]) ? state.counters[i] : 0));
  return {
    id,
    status: state.status === 'completed' ? 'completed' : 'active',
    claimed: Boolean(state.claimed),
    objectives: quest.objectives.map((objective, i) => ({
      ...objective,
      current: Math.min(objective.count, counters[i]),
      done: counters[i] >= objective.count,
    })),
  };
}

export function startQuest(progress, id) {
  const quest = getQuest(id);
  if (!quest) return null;
  const log = ensureQuestLog(progress, true);
  if (log[id]) return getQuestState(progress, id);
  log[id] = emptyState(quest);
  return getQuestState(progress, id);
}

export function isQuestComplete(progress, id) {
  const state = getQuestState(progress, id);
  return Boolean(state && state.objectives.every(objective => objective.done));
}

function grantRewards(progress, quest) {
  const rewards = quest.rewards ?? {};
  const granted = { xp: 0, levels: 0, items: [], flags: [], mastery: [] };
  if (rewards.xp) {
    const xp = grantArchetypeXp(progress, rewards.xp);
    granted.xp = xp.gained;
    granted.levels = xp.levels;
  }
  progress.inventory ??= [];
  for (const item of rewards.items ?? []) {
    if (!progress.inventory.includes(item)) {
      progress.inventory.push(item);
      granted.items.push(item);
    }
  }
  progress.flags ??= {};
  for (const [flag, value] of Object.entries(rewards.flags ?? {})) {
    progress.flags[flag] = value;
    granted.flags.push(flag);
  }
  return granted;
}

// Chamado por sistemas do jogo. `event`: { type, target, amount = 1 }
// Devolve as missões concluídas nesta chamada (com recompensas entregues).
export function recordQuestEvent(progress, event) {
  const completed = [];
  if (!event || typeof event.type !== 'string') return completed;
  const log = ensureQuestLog(progress, true);

  for (const [id, entry] of Object.entries(log)) {
    if (entry.status === 'completed') continue;
    const quest = getQuest(id);
    if (!quest) continue;
    let touched = false;
    quest.objectives.forEach((objective, index) => {
      if (objective.type !== event.type) return;
      if (objective.target && objective.target !== event.target) return;
      const current = entry.counters[index] ?? 0;
      const next = Math.min(objective.count, current + Math.max(1, event.amount ?? 1));
      if (next !== current) {
        entry.counters[index] = next;
        touched = true;
      }
    });
    if (!touched) continue;
    if (quest.objectives.every((objective, index) => (entry.counters[index] ?? 0) >= objective.count)) {
      entry.status = 'completed';
      const rewards = entry.claimed ? null : grantRewards(progress, quest);
      if (!entry.claimed) {
        // Concluir missão alimenta a trilha de eco do arquétipo.
        const rankUps = recordMastery(progress, 'resonance', 2);
        if (rewards) rewards.mastery = rankUps;
      }
      entry.claimed = true;
      progress.completedQuests ??= [];
      if (!progress.completedQuests.includes(id)) progress.completedQuests.push(id);
      completed.push({ id, title: quest.title, rewards });
    }
  }
  return completed;
}

export function listTrackedQuests(progress) {
  const log = ensureQuestLog(progress);
  if (!log) return [];
  return Object.keys(log).map(id => getQuestState(progress, id)).filter(Boolean);
}
