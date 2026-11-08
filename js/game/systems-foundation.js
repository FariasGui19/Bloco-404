// Fundação consultável sem migrar o save nem conceder poderes/dano prematuros.
import { ARCHETYPE_KITS, KIT_SLOTS } from '../data/archetype-kits.js';
import { getSlotLevel } from './progression.js';

export function listInventory(progress) {
  // O formato atual é uma lista de IDs únicos. Sem inventar quantidades.
  return [...new Set((Array.isArray(progress?.inventory) ? progress.inventory : []).filter(x => typeof x === 'string' && x))];
}

export function getSkillTree(progress) {
  const archetype = progress?.archetype;
  if (!Object.hasOwn(ARCHETYPE_KITS, archetype)) return [];
  return KIT_SLOTS.map(slot => ({ slot, abilityId: ARCHETYPE_KITS[archetype][slot], level: getSlotLevel(progress, archetype, slot) }));
}

// Modelo puro, ainda não conectado ao jogador, ao save ou ao loop de combate.
export function createHealth(max) {
  if (!Number.isFinite(max) || max <= 0) return null;
  return { current: max, max };
}
export function applyHealthDamage(health, damage) {
  if (!health || !Number.isFinite(health.max) || health.max <= 0 || !Number.isFinite(health.current) || !Number.isFinite(damage) || damage < 0) return null;
  return { ...health, current: Math.max(0, Math.min(health.max, health.current - damage)) };
}
