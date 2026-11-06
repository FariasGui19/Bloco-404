// Progressão persistente por slot do módulo escolhido.
// Ainda não concede poderes nem implementa upgrades: todos começam no nível 1.
import { ARCHETYPE_KITS, KIT_SLOTS } from '../data/archetype-kits.js';

export function ensureArchetypeProgress(progress) {
  const archetype = progress?.archetype;
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
  return progress;
}

export function getSlotLevel(progress, archetype, slot) {
  if (!Object.hasOwn(ARCHETYPE_KITS, archetype) || !KIT_SLOTS.includes(slot)) return null;
  if (progress?.archetype !== archetype && !progress?.archetypeProgress?.[archetype]) return null;
  const level = progress?.archetypeProgress?.[archetype]?.slots?.[slot]?.level;
  return Number.isInteger(level) && level > 0 ? level : 1;
}
