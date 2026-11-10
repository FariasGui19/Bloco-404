// Combate básico: dano por arquétipo, crítico, XP e alvos de treino.
// Inimigos agressivos e dano ao jogador continuam pendentes; aqui o
// jogador só ataca alvos explícitos de treino.
import { canStandAt } from './collision.js';
import { CONFIG } from '../config.js';
import { ABILITY_DAMAGE, COMBAT_BALANCE, TRAINING_TARGET_XP, TRAINING_XP_LEVEL_CAP } from '../data/combat-balance.js';
import { getArchetypeLevel, getDerivedStats, grantArchetypeXp, rollBasicAttack } from './rpg.js';
import { recordQuestEvent } from './quests.js';
import { pushCombatText, updateCombatFeedback } from './combat-feedback.js';

// Compatibilidade: HUD e testes antigos leem rótulo e strain daqui.
export const BASIC_ATTACKS = COMBAT_BALANCE;

export function createTrainingTargets(map) {
  return (map.trainingTargets ?? []).map(item => ({
    ...item,
    x: item.x + .5,
    y: item.y + .5,
    maxHealth: item.maxHealth ?? 60,
    health: item.maxHealth ?? 60,
    downTimer: 0,
    hitTimer: 0,
    renderType: 'trainingTarget',
  }));
}

export function updateBasicCombat(player, targets, dt) {
  if (player.combat) {
    player.combat.cooldown = Math.max(0, player.combat.cooldown - dt);
    player.combat.timeLeft = Math.max(0, player.combat.timeLeft - dt);
    player.combat.chainWindow = Math.max(0, (player.combat.chainWindow ?? 0) - dt);
    if (!player.combat.chainWindow) player.combat.chain = 0;
  }
  for (const target of targets) {
    target.hitTimer = Math.max(0, target.hitTimer - dt);
    if (target.downTimer > 0) {
      target.downTimer = Math.max(0, target.downTimer - dt);
      if (target.downTimer === 0) target.health = target.maxHealth;
    }
  }
  updateCombatFeedback(dt);
}

function clearLine(map, player, target) {
  const dx = target.x - player.x, dy = target.y - player.y;
  const steps = Math.ceil(Math.hypot(dx, dy) / .12);
  for (let i = 1; i < steps; i++) {
    if (!canStandAt(map, player.x + dx * i / steps, player.y + dy * i / steps, .06, player)) return false;
  }
  return true;
}

// Aplica o dano de um ataque inteiro (pode ter mais de um golpe) e devolve
// o que aconteceu. Alvo derrotado fica fora de combate por alguns segundos.
export function applyAttackDamage(target, roll) {
  if (!target || !roll) return null;
  const before = target.health;
  target.health = Math.max(0, target.health - roll.total);
  target.hitTimer = .2;
  const defeated = before > 0 && target.health === 0;
  if (defeated) target.downTimer = 4;
  return { dealt: before - target.health, defeated };
}

// Vitória sobre um alvo de treino: XP até o teto, missão contada, mensagem.
// Usado pelo ataque básico e pelas habilidades de impacto.
function registerDefeat(player, progress, target) {
  let xp = 0;
  if (getDerivedStats(progress) && getArchetypeLevel(progress) < TRAINING_XP_LEVEL_CAP) {
    const gained = grantArchetypeXp(progress, TRAINING_TARGET_XP);
    xp = gained.gained;
    pushCombatText(target.x, target.y - .55, `+${xp} XP`, { color: '#9af9c8', kind: 'xp', duration: 1.2 });
    if (gained.levels > 0) {
      player.ability ??= {};
      player.ability.lastMessage = `NÍVEL ${gained.level} • ${gained.points} PONTO DE ÁRVORE`;
      player.ability.messageTimer = 2.4;
    }
  }
  const completed = recordQuestEvent(progress, { type: 'defeat', target: 'training' });
  for (const quest of completed) {
    player.ability ??= {};
    player.ability.lastMessage = `MISSÃO CONCLUÍDA • ${quest.title}`;
    player.ability.messageTimer = 3;
    if (quest.rewards?.xp) pushCombatText(player.x, player.y - 1, `+${quest.rewards.xp} XP`, { color: '#ffe98a', kind: 'xp', duration: 1.4 });
  }
  return xp;
}

// Habilidade de impacto: atinge alvos de treino à frente, no raio do gesto.
// Devolve o total causado para a HUD/testes; não altera a mobilidade do Q.
export function tryAbilityDamage({ player, progress, targets, abilityId, rng = Math.random }) {
  const multiplier = ABILITY_DAMAGE[abilityId];
  const stats = getDerivedStats(progress, player);
  if (!multiplier || !stats || !targets?.length) return null;
  const vectors = { down: [1, 1], up: [-1, -1], left: [-1, 1], right: [1, -1] };
  const [fx, fy] = vectors[player.facing] ?? vectors.down;
  const length = Math.hypot(fx, fy);
  const distance = Math.max(stats.range, 1.8) + .6;
  const damage = Math.max(1, Math.round(stats.basicDamage * multiplier * (1 + stats.abilityDamagePct) * (.94 + rng() * .12)));
  const hit = [];
  for (const target of targets) {
    if (target.health <= 0) continue;
    const dx = target.x - player.x, dy = target.y - player.y;
    const range = Math.hypot(dx, dy);
    if (range > distance || range < .001 || (dx * fx + dy * fy) / (range * length) < .25) continue;
    const outcome = applyAttackDamage(target, { hits: [damage], total: damage });
    pushCombatText(target.x, target.y, String(damage), { color: stats.color, duration: 1 });
    if (outcome?.defeated) registerDefeat(player, progress, target);
    hit.push({ target, damage });
  }
  return { damage, hits: hit, total: hit.reduce((sum, item) => sum + item.damage, 0) };
}

export function tryBasicAttack({ player, progress, map, targets, point, rng = Math.random }) {
  const profile = BASIC_ATTACKS[progress?.archetype];
  if (!profile || !map || !point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return false;
  if (player.ability?.dash || player.ability?.scanning > 0 || player.ability?.effect?.timeLeft > 0 || (player.combat?.cooldown ?? 0) > 0) return false;

  // Um clique na parte alta do holograma deve mirar na base do alvo.
  const iso = p => ({ x: (p.x - p.y) * CONFIG.TILE_W / 2, y: (p.x + p.y) * CONFIG.TILE_H / 2 });
  const click = iso(point);
  const selected = (targets ?? []).find(target => {
    if (target.health <= 0) return false;
    const at = iso(target), dx = click.x - at.x, dy = click.y - at.y;
    return Math.abs(dx) <= 20 && dy >= -55 && dy <= 10;
  });
  if (selected) point = selected;

  let dx = point.x - player.x, dy = point.y - player.y;
  let length = Math.hypot(dx, dy);
  if (length < .05) {
    const vectors = { down: [1, 1], up: [-1, -1], left: [-1, 1], right: [1, -1] };
    [dx, dy] = vectors[player.facing] ?? vectors.down;
    length = Math.SQRT2;
  }
  dx /= length; dy /= length;
  const sx = dx - dy, sy = dx + dy;
  player.facing = Math.abs(sx) > Math.abs(sy) ? (sx > 0 ? 'right' : 'left') : (sy > 0 ? 'down' : 'up');
  player.target = null;

  const stats = getDerivedStats(progress, player);
  const previous = player.combat;
  const chain = previous?.style === progress.archetype && previous.chainWindow > 0 ? (previous.chain ?? 0) + 1 : 1;
  const strained = chain >= profile.strain.hits;
  player.combat = {
    cooldown: stats.cooldown + (strained ? profile.strain.extra : 0),
    duration: .32,
    timeLeft: .32,
    dx,
    dy,
    color: profile.color,
    chain: strained ? 0 : chain,
    chainWindow: strained ? 0 : 1.3,
    strained,
    style: progress.archetype,
    transformed: player.nucleoForm === 'forma_veloz',
    equipped: !!player.equippedSuit,
  };
  if (strained) {
    player.ability ??= {};
    player.ability.lastMessage = `${profile.strain.label} • RECUPERAÇÃO DO ATAQUE`;
    player.ability.messageTimer = 1.8;
  }

  let best = null, nearest = Infinity;
  for (const target of targets ?? []) {
    if (target.health <= 0) continue;
    const tx = target.x - player.x, ty = target.y - player.y, distance = Math.hypot(tx, ty);
    if (distance > stats.range || distance < .001 || (tx * dx + ty * dy) / distance < .55) continue;
    if (distance >= nearest || !clearLine(map, player, target)) continue;
    best = target; nearest = distance;
  }

  const roll = rollBasicAttack(stats, rng);
  if (best) {
    player.combat.damage = roll.total;
    player.combat.crit = roll.crit;
    const outcome = applyAttackDamage(best, roll);
    // Um número por golpe dá leitura de ritmo a ataques múltiplos como a Maré.
    roll.hits.forEach((value, index) => {
      pushCombatText(best.x, best.y - index * .12, String(value), {
        color: roll.crit ? '#ffe98a' : profile.color,
        crit: roll.crit,
        duration: .9 + index * .12,
      });
    });
    if (outcome?.defeated) registerDefeat(player, progress, best);
  }
  return true;
}
