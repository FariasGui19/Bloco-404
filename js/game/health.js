// =====================================================================
// VIDA DO OPERADOR
//
// Regras curtas e previsíveis: dano reduz vida, invulnerabilidade evita
// stun-lock, fora de combate a vida regenera e a morte devolve o jogador ao
// ponto seguro do mapa — sem perder XP, itens ou progresso.
// =====================================================================
import { VITALS_RULES } from '../data/combat-balance.js';
import { getDerivedStats } from './rpg.js';
import { pushCombatText } from './combat-feedback.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// Sincroniza o máximo com o arquétipo/nível/maestria sem curar de graça.
export function ensureHealth(player, progress) {
  const stats = getDerivedStats(progress, player);
  if (!stats) return null;
  const max = Math.round(stats.maxHealth);
  const grew = max !== player.maxHealth;
  player.maxHealth = max;
  if (!Number.isFinite(player.health)) player.health = max;
  player.health = clamp(player.health, 0, max);
  player.invulnerable = Math.max(0, player.invulnerable ?? 0);
  player.hurtTimer = Math.max(0, player.hurtTimer ?? 0);
  player.sinceDamage = player.sinceDamage ?? VITALS_RULES.regenDelay;
  if (grew && player.health > 0) player.health = clamp(player.health, 1, max);
  return { health: player.health, maxHealth: player.maxHealth, percent: player.health / max };
}

export function damagePlayer(player, progress, amount, source = 'eco') {
  const vitals = ensureHealth(player, progress);
  if (!vitals || !Number.isFinite(amount) || amount <= 0) return { dealt: 0, dead: false };
  if (player.invulnerable > 0 || player.health <= 0) return { dealt: 0, dead: false, blocked: true };
  const dealt = Math.max(1, Math.round(amount));
  player.health = clamp(player.health - dealt, 0, player.maxHealth);
  player.hurtTimer = .5;
  player.invulnerable = VITALS_RULES.invulnerability;
  player.sinceDamage = 0;
  player.lastDamageSource = source;
  pushCombatText(player.x, player.y, `-${dealt}`, { color: '#ff9b8a', kind: 'damage', duration: .9 });
  if (player.health <= 0) {
    player.deathTimer = VITALS_RULES.deathDelay;
    player.ability ??= {};
    player.ability.lastMessage = 'ECO INSTÁVEL • RETORNO AO PONTO SEGURO';
    player.ability.messageTimer = 2.5;
    return { dealt, dead: true };
  }
  return { dealt, dead: false };
}

export function healPlayer(player, progress, amount) {
  ensureHealth(player, progress);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const before = player.health;
  player.health = clamp(player.health + amount, 0, player.maxHealth);
  return player.health - before;
}

export function respawnPlayer(player, spawn) {
  player.health = Math.round(player.maxHealth * VITALS_RULES.respawnRatio);
  player.invulnerable = VITALS_RULES.respawnInvulnerability;
  player.hurtTimer = 0;
  player.deathTimer = 0;
  player.sinceDamage = 0;
  player.moving = false;
  player.target = null;
  player.combat = null;
  if (spawn) { player.x = spawn.x; player.y = spawn.y; }
  player.ability ??= {};
  player.ability.lastMessage = 'RETORNO SEGURO • VIDA PARCIAL';
  player.ability.messageTimer = 2.5;
}

// `onRespawn` recebe o jogador e devolve o ponto seguro (ou teleporta).
export function updateHealth(player, progress, dt, { onRespawn } = {}) {
  const vitals = ensureHealth(player, progress);
  if (!vitals) return vitals;
  const elapsed = Math.max(0, Number.isFinite(dt) ? dt : 0);
  player.invulnerable = Math.max(0, player.invulnerable - elapsed);
  player.hurtTimer = Math.max(0, player.hurtTimer - elapsed);

  if (player.health <= 0) {
    player.deathTimer = Math.max(0, (player.deathTimer ?? VITALS_RULES.deathDelay) - elapsed);
    if (player.deathTimer === 0) {
      const spawn = onRespawn?.(player) ?? null;
      respawnPlayer(player, spawn);
      return { health: player.health, maxHealth: player.maxHealth, percent: player.health / player.maxHealth, dead: false, respawned: true };
    }
    return { health: player.health, maxHealth: player.maxHealth, percent: player.health / player.maxHealth, dead: true };
  }

  player.sinceDamage = Math.max(0, (player.sinceDamage ?? 0) + elapsed);
  if (player.sinceDamage >= VITALS_RULES.regenDelay && player.health < player.maxHealth) {
    player.health = Math.min(player.maxHealth, player.health + VITALS_RULES.regenRate * elapsed);
  }
  return { health: player.health, maxHealth: player.maxHealth, percent: player.health / player.maxHealth, dead: false };
}
