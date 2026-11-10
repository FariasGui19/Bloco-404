// =====================================================================
// NÚCLEO DE RPG — nível, XP, pontos e efeitos da árvore
//
// Funções puras sobre `progress`: nada aqui desenha, salva ou mexe no
// loop. O save guarda apenas números pequenos em archetypeProgress[arch].
// =====================================================================
import { COMBAT_BALANCE, ARCHETYPE_VITALS, getCombatProfile } from '../data/combat-balance.js';
import { getProgressionTree, getTreeNode } from '../data/progression-tree.js';
import { ensureArchetypeProgress } from './progression.js';

export const MAX_LEVEL = 20;

// Curva suave: cada nível pede um pouco mais que o anterior.
export function xpToNext(level) {
  const safe = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level) || 1));
  if (safe >= MAX_LEVEL) return Infinity;
  return Math.round(40 * Math.pow(1.2, safe - 1));
}

export function getArchetypeKit(progress, archetype = progress?.archetype) {
  if (!archetype || !Object.hasOwn(COMBAT_BALANCE, archetype)) return null;
  ensureArchetypeProgress(progress, archetype);
  return progress.archetypeProgress?.[archetype] ?? null;
}

export function getArchetypeLevel(progress, archetype = progress?.archetype) {
  const level = progress?.archetypeProgress?.[archetype]?.level;
  return Number.isInteger(level) && level >= 1 ? Math.min(MAX_LEVEL, level) : 1;
}

export function getTreePoints(progress, archetype = progress?.archetype) {
  const points = progress?.archetypeProgress?.[archetype]?.points;
  return Number.isInteger(points) && points > 0 ? points : 0;
}

export function getNodeRank(progress, archetype, nodeId) {
  const rank = progress?.archetypeProgress?.[archetype]?.nodes?.[nodeId];
  return Number.isInteger(rank) && rank > 0 ? rank : 0;
}

// ---------------------------------------------------------------------
// XP
// ---------------------------------------------------------------------
// Devolve o que mudou para a HUD/feedback poder comemorar sem recalcular.
export function grantArchetypeXp(progress, amount, archetype = progress?.archetype) {
  const result = { gained: 0, levels: 0, points: 0, level: getArchetypeLevel(progress, archetype), xp: 0 };
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
    kit.points = (kit.points ?? 0) + 1;
    result.levels += 1;
    result.points += 1;
  }
  if (kit.level >= MAX_LEVEL) kit.xp = Math.min(kit.xp, xpToNext(MAX_LEVEL - 1));
  result.level = kit.level;
  result.xp = kit.xp;
  return result;
}

// ---------------------------------------------------------------------
// ÁRVORE
// ---------------------------------------------------------------------
export function canRankNode(progress, nodeId, archetype = progress?.archetype) {
  const node = getTreeNode(archetype, nodeId);
  if (!node) return { ok: false, reason: 'nó inexistente' };
  const rank = getNodeRank(progress, archetype, nodeId);
  if (rank >= node.maxRank) return { ok: false, reason: 'rank máximo' };
  if (node.requires && getNodeRank(progress, archetype, node.requires.node) < node.requires.rank) {
    return { ok: false, reason: 'requisito não cumprido' };
  }
  const cost = node.cost[rank] ?? node.cost[node.cost.length - 1];
  if (getTreePoints(progress, archetype) < cost) return { ok: false, reason: 'pontos insuficientes' };
  return { ok: true, cost, rank };
}

export function rankNode(progress, nodeId, archetype = progress?.archetype) {
  const check = canRankNode(progress, nodeId, archetype);
  if (!check.ok) return { ...check, ranked: false };
  ensureArchetypeProgress(progress);
  const kit = progress.archetypeProgress[archetype];
  kit.points -= check.cost;
  kit.nodes ??= {};
  kit.nodes[nodeId] = check.rank + 1;
  return { ok: true, ranked: true, rank: check.rank + 1, cost: check.cost };
}

// ---------------------------------------------------------------------
// ESTATÍSTICAS DERIVADAS
// ---------------------------------------------------------------------
export function getDerivedStats(progress, player = null, archetype = progress?.archetype) {
  const profile = getCombatProfile(archetype);
  if (!profile) return null;
  const level = getArchetypeLevel(progress, archetype);
  const nodes = progress?.archetypeProgress?.[archetype]?.nodes ?? {};

  let basicDamagePct = 0, critChance = 0, cooldownPct = 0;
  let energyRegen = 0, abilityDamagePct = 0, xpBonusPct = 0;
  for (const node of getProgressionTree(archetype)) {
    const rank = nodes[node.id] ?? 0;
    if (rank <= 0) continue;
    const effects = node.effects;
    basicDamagePct += (effects.basicDamagePct ?? 0) * rank;
    critChance += (effects.critChance ?? 0) * rank;
    cooldownPct += (effects.cooldownPct ?? 0) * rank;
    energyRegen += (effects.energyRegen ?? 0) * rank;
    abilityDamagePct += (effects.abilityDamagePct ?? 0) * rank;
    xpBonusPct += (effects.xpBonusPct ?? 0) * rank;
  }

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
    basicDamage: baseDamage * (1 + basicDamagePct) * formMult,
    critChance: Math.min(.75, profile.crit + critChance),
    critMult: profile.critMult,
    cooldown: profile.cooldown * Math.max(.4, 1 - Math.min(.6, cooldownPct)),
    cooldownPct: Math.min(.6, cooldownPct),
    energyRegen,
    abilityDamagePct,
    xpBonusPct,
    maxHealth: vitals.health + (level - 1) * 8,
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
