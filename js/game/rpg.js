// =====================================================================
// NÚCLEO DE RPG — nível, XP e estatísticas derivadas
//
// A progressão de poder é orgânica: sobe com o uso (ver mastery.js), não
// com pontos escolhidos. Aqui ficam só XP, nível e a soma dos bônus de
// maestria em cima do perfil de combate do arquétipo.
// =====================================================================
import { COMBAT_BALANCE, ARCHETYPE_VITALS, getCombatProfile } from '../data/combat-balance.js';
import { ensureArchetypeProgress } from './progression.js';
import { getMasteryBonuses } from './mastery.js';

export const MAX_LEVEL = 20;

// Curva suave: cada nível pede um pouco mais que o anterior.
export function xpToNext(level) {
  const safe = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level) || 1));
  if (safe >= MAX_LEVEL) return Infinity;
  return Math.round(40 * Math.pow(1.2, safe - 1));
}

export function getArchetypeLevel(progress, archetype = progress?.archetype) {
  const level = progress?.archetypeProgress?.[archetype]?.level;
  return Number.isInteger(level) && level >= 1 ? Math.min(MAX_LEVEL, level) : 1;
}

export function getArchetypeXp(progress, archetype = progress?.archetype) {
  const xp = progress?.archetypeProgress?.[archetype]?.xp;
  return Number.isFinite(xp) && xp > 0 ? xp : 0;
}

// ---------------------------------------------------------------------
// XP
// ---------------------------------------------------------------------
// Devolve o que mudou para a HUD/feedback poder comemorar sem recalcular.
export function grantArchetypeXp(progress, amount, archetype = progress?.archetype) {
  const result = { gained: 0, levels: 0, level: getArchetypeLevel(progress, archetype), xp: 0 };
  if (!archetype || !Object.hasOwn(COMBAT_BALANCE, archetype)) return result;
  if (!Number.isFinite(amount) || amount <= 0) return result;
  ensureArchetypeProgress(progress, archetype);
  const kit = progress.archetypeProgress[archetype];
  const bonus = 1 + getDerivedStats(progress, null, archetype).xpBonusPct;
  const gained = Math.max(1, Math.round(amount * bonus));
  kit.xp = (Number.isFinite(kit.xp) ? kit.xp : 0) + gained;
  result.gained = gained;

  while (kit.level < MAX_LEVEL && kit.xp >= xpToNext(kit.level)) {
    kit.xp -= xpToNext(kit.level);
    kit.level += 1;
    result.levels += 1;
  }
  if (kit.level >= MAX_LEVEL) kit.xp = Math.min(kit.xp, xpToNext(MAX_LEVEL - 1));
  result.level = kit.level;
  result.xp = kit.xp;
  return result;
}

// ---------------------------------------------------------------------
// ESTATÍSTICAS DERIVADAS
// ---------------------------------------------------------------------
export function getDerivedStats(progress, player = null, archetype = progress?.archetype) {
  const profile = getCombatProfile(archetype);
  if (!profile) return null;
  const level = getArchetypeLevel(progress, archetype);
  const mastery = getMasteryBonuses(progress, archetype);

  const formMult = profile.formMult && player?.nucleoForm === 'forma_veloz' ? profile.formMult : 1;
  const baseDamage = profile.damage * (1 + profile.perLevel * (level - 1));
  const vitals = ARCHETYPE_VITALS[archetype] ?? { health: 100 };
  return {
    archetype,
    level,
    label: profile.label,
    color: profile.color,
    hits: profile.hits,
    range: profile.range,
    basicDamage: baseDamage * (1 + mastery.basicDamagePct) * formMult,
    critChance: Math.min(.75, profile.crit + mastery.critChance),
    critMult: profile.critMult,
    cooldown: profile.cooldown * Math.max(.4, 1 - Math.min(.6, mastery.cooldownPct)),
    cooldownPct: Math.min(.6, mastery.cooldownPct),
    energyRegen: mastery.energyRegen,
    abilityDamagePct: mastery.abilityDamagePct,
    xpBonusPct: mastery.xpBonusPct,
    moveSpeedPct: mastery.moveSpeedPct,
    formSpeedPct: mastery.formSpeedPct,
    formDuration: mastery.formDuration,
    maxHealth: vitals.health + (level - 1) * 8,
    mastery,
  };
}

// Um ataque inteiro (com os múltiplos golpes do arquétipo). `rng` entra por
// parâmetro para os testes serem determinísticos.
export function rollBasicAttack(stats, rng = Math.random) {
  if (!stats || !Number.isFinite(stats.basicDamage)) return null;
  const variance = 0.94 + rng() * 0.12;
  const hits = [];
  let crit = false;
  for (let i = 0; i < Math.max(1, stats.hits); i++) {
    const isCrit = rng() < stats.critChance;
    crit ||= isCrit;
    const raw = stats.basicDamage * (isCrit ? stats.critMult : 1) * variance;
    hits.push(Math.max(1, Math.round(raw)));
  }
  return { hits, total: hits.reduce((sum, value) => sum + value, 0), crit };
}
