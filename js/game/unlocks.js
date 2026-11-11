// =====================================================================
// LIBERAÇÕES DO ARQUÉTIPO
//
// Traduz o nível do arquétipo em poderes disponíveis. É o único lugar que
// decide "pode usar F?", "pode instalar ferramenta?" e "o que vem depois?".
//
// Nada aqui inventa poder: os degraus planejados aparecem como próximo
// objetivo, mas `features` vazio não libera nada.
// =====================================================================
import {
  FEATURE_LABELS, UNLOCK_FEATURES, UNLOCK_STEPS, getFeatureLevel, getNextStep, getStepById, getStepForLevel,
  isFeatureUnlocked,
} from '../data/archetype-unlocks.js';
import { getArchetypeLevel } from './rpg.js';

// Estado de liberação do arquétipo ativo (ou do informado).
export function getUnlockState(progress, archetype = progress?.archetype) {
  const level = getArchetypeLevel(progress, archetype);
  const step = getStepForLevel(level);
  const next = getNextStep(level);
  const features = {};
  for (const feature of UNLOCK_FEATURES) features[feature] = isFeatureUnlocked(level, feature);
  return { level, step, next, features };
}

export function isUnlocked(progress, feature, archetype = progress?.archetype) {
  return isFeatureUnlocked(getArchetypeLevel(progress, archetype), feature);
}

// Nível que falta para uma função. 0 = já liberada.
export function levelsUntil(progress, feature, archetype = progress?.archetype) {
  const level = getArchetypeLevel(progress, archetype);
  const required = getFeatureLevel(feature);
  return Math.max(0, required - level);
}

// Texto curto para HUD: "PRÓXIMO: ULTIMATE · NÍVEL 3 (faltam 1)".
export function describeNextUnlock(progress, archetype = progress?.archetype) {
  const { level } = getUnlockState(progress, archetype);
  const next = getNextStep(level);
  if (!next) return 'CAMINHO COMPLETO';
  const tags = next.features.length ? next.features.map(f => FEATURE_LABELS[f]).join(' + ') : next.label;
  return `PRÓXIMO: ${tags} · NÍVEL ${next.level} (FALTAM ${next.level - level})`;
}

// Sincroniza `progress.abilities` com o nível atual. Devolve o que acabou de
// ser liberado, para a HUD comemorar sem recalcular.
// Q e R nascem no nível 1, então saves antigos não perdem nada.
export function applyUnlocks(progress, kit = null) {
  if (!progress?.archetype) return [];
  const liberado = [];
  const level = getArchetypeLevel(progress);
  progress.abilities ??= [];
  // Acumulado: um degrau posterior não apaga Q/R de degraus anteriores.
  const podeQ = isFeatureUnlocked(level, 'q');
  const podeR = isFeatureUnlocked(level, 'r');
  if (podeQ && kit?.q && !progress.abilities.includes(kit.q)) liberado.push({ feature: 'q', label: FEATURE_LABELS.q, id: kit.q });
  if (podeR && kit?.r && !progress.abilities.includes(kit.r)) liberado.push({ feature: 'r', label: FEATURE_LABELS.r, id: kit.r });
  for (const entry of liberado) progress.abilities.push(entry.id);
  return liberado;
}

// Degrau de liberação correspondente a um nível do caminho (0..5).
export function getUnlockStepFor(pathLevel) {
  return UNLOCK_STEPS.find(step => step.step === pathLevel) ?? null;
}

// Rótulo do degrau para o Códex ("DISPONÍVEL", "AGORA", "FALTAM 2 NÍVEIS").
export function describeStep(progress, step, archetype = progress?.archetype) {
  const level = getArchetypeLevel(progress, archetype);
  if (level >= step.level) return 'DISPONÍVEL';
  if (step.planned) return `PLANEJADO · NÍVEL ${step.level}`;
  return `NÍVEL ${step.level} · FALTAM ${step.level - level}`;
}

export { UNLOCK_FEATURES, FEATURE_LABELS, getStepById, getStepForLevel };
