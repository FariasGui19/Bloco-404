// Progressão persistente por arquétipo escolhido.
// Guarda slots de habilidade, nível, XP e os contadores de maestria.
// A migração é aditiva: saves antigos ganham os campos com valores neutros;
// `points`/`nodes` de versões anteriores ficam apenas como dado morto.
import { ARCHETYPE_KITS, KIT_SLOTS } from '../data/archetype-kits.js';

export function ensureArchetypeProgress(progress, archetype = progress?.archetype) {
  if (!Object.hasOwn(ARCHETYPE_KITS, archetype)) return progress;

  progress.archetypeProgress ??= {};
  const kit = progress.archetypeProgress[archetype] ??= {};
  kit.slots ??= {};
  for (const slot of KIT_SLOTS) {
    kit.slots[slot] ??= { level: 1 };
    if (!Number.isInteger(kit.slots[slot].level) || kit.slots[slot].level < 1) {
      kit.slots[slot].level = 1;
    }
  }
  if (!Number.isInteger(kit.level) || kit.level < 1) kit.level = 1;
  if (!Number.isFinite(kit.xp) || kit.xp < 0) kit.xp = 0;
  if (!kit.mastery || typeof kit.mastery !== 'object' || Array.isArray(kit.mastery)) kit.mastery = {};
  return progress;
}

export function getSlotLevel(progress, archetype, slot) {
  if (!Object.hasOwn(ARCHETYPE_KITS, archetype) || !KIT_SLOTS.includes(slot)) return null;
  if (progress?.archetype !== archetype && !progress?.archetypeProgress?.[archetype]) return null;
  const level = progress?.archetypeProgress?.[archetype]?.slots?.[slot]?.level;
  return Number.isInteger(level) && level > 0 ? level : 1;
}
