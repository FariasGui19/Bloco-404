// =====================================================================
// ULTIMATE — o quinto slot do módulo (tecla F)
//
// A Ultimate é uma ação de peso: custa muita energia, tem recarga longa e
// resolve de uma vez o que Q/R fazem em vários gestos — dano radial, cura
// imediata e um bônus temporário do arquétipo. Não altera o save: recarga,
// bônus e efeito são de sessão, como a vida.
//
// Regras (iguais para os quatro arquétipos):
//   - precisa de arquétipo escolhido e vida > 0;
//   - bloqueada enquanto recarrega ou sem energia suficiente;
//   - dano radial em todos os alvos dentro de `radius`, sem exigir direção;
//   - cura proporcional à vida máxima, limitada ao máximo;
//   - bônus temporário aplicado ao jogador, visível na HUD e no Códex.
// =====================================================================
import { getUltimate, ULTIMATE_IDS } from '../data/ultimates.js';
import { applyRadialDamage } from './combat.js';
import { healPlayer } from './health.js';
import { recordMastery } from './mastery.js';
import { getDerivedStats } from './rpg.js';
import { pushCombatText } from './combat-feedback.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function ensureUltimate(player) {
  if (!player) return { cooldown: 0, buff: null, effect: null, casts: 0 };
  player.ultimate ??= {};
  const runtime = player.ultimate;
  runtime.cooldown = Number.isFinite(runtime.cooldown) ? Math.max(0, runtime.cooldown) : 0;
  runtime.casts = Number.isInteger(runtime.casts) && runtime.casts > 0 ? runtime.casts : 0;
  runtime.buff = runtime.buff && runtime.buff.timeLeft > 0
    ? { ...runtime.buff, timeLeft: Math.max(0, Number(runtime.buff.timeLeft) || 0) }
    : null;
  runtime.effect = runtime.effect && runtime.effect.timeLeft > 0
    ? { ...runtime.effect, timeLeft: Math.max(0, Number(runtime.effect.timeLeft) || 0) }
    : null;
  return runtime;
}

// Estado pronto para HUD/Códex. `charge` vai de 0 (recém-usada) a 1 (pronta).
export function getUltimateStatus(player, progress) {
  const definition = getUltimate(progress?.archetype);
  if (!definition || !player) return null;
  const runtime = ensureUltimate(player);
  const energy = Math.round(player?.energy ?? 0);
  const ratio = definition.cooldown > 0 ? clamp(1 - runtime.cooldown / definition.cooldown, 0, 1) : 1;
  return {
    definition,
    cooldown: runtime.cooldown,
    charge: ratio,
    ready: runtime.cooldown <= 0 && energy >= definition.cost,
    energy,
    energyOk: energy >= definition.cost,
    buff: runtime.buff?.timeLeft > 0 ? runtime.buff : null,
    casts: runtime.casts,
  };
}

export function getUltimateBuff(player) {
  const buff = player?.ultimate?.buff;
  return buff && buff.timeLeft > 0 ? buff : null;
}

export function canCastUltimate(player, progress) {
  const definition = getUltimate(progress?.archetype);
  if (!definition) return { ok: false, reason: 'SEM MÓDULO ATIVO' };
  const runtime = ensureUltimate(player);
  if ((player?.health ?? 1) <= 0) return { ok: false, reason: 'ECO DISPERSO' };
  if (runtime.cooldown > 0) return { ok: false, reason: `RECARREGANDO ${runtime.cooldown.toFixed(1)}s`, cooldown: runtime.cooldown };
  if ((player?.energy ?? 0) < definition.cost) return { ok: false, reason: 'ENERGIA INSUFICIENTE' };
  return { ok: true, definition };
}

// Executa a Ultimate. Devolve o resultado (ou null quando bloqueada).
export function tryUltimate({ player, progress, targets = [], showMessage, rng = Math.random }) {
  const check = canCastUltimate(player, progress);
  if (!check.ok) {
    showMessage?.(check.reason);
    return null;
  }
  const definition = check.definition;
  const runtime = ensureUltimate(player);

  player.energy = Math.max(0, player.energy - definition.cost);
  runtime.cooldown = definition.cooldown;
  runtime.casts += 1;
  runtime.effect = { id: definition.id, color: definition.color, timeLeft: .95, duration: .95 };
  runtime.buff = { ...definition.buff, timeLeft: definition.buff.duration, color: definition.color };

  // Cura antes do bônus: o bônus de vida/s começa a valer no próximo quadro.
  const stats = getDerivedStats(progress, player);
  // A vida máxima é a do arquétipo/nível (mesma fonte da HUD), não um valor antigo.
  const maxHealth = stats?.maxHealth ?? player.maxHealth ?? 100;
  const heal = Math.round(maxHealth * definition.healPct);
  const healed = healPlayer(player, progress, heal);
  if (healed > 0) {
    pushCombatText(player.x, player.y - .8, `+${healed}`, { color: '#9af9c8', kind: 'heal', duration: 1.1 });
  }

  const damage = applyRadialDamage({
    player, progress, targets,
    radius: definition.radius, damage: definition.damage, color: definition.color, rng,
  });

  const rankUps = recordMastery(progress, 'ability_use', 2);
  const mensagem = rankUps.length
    ? `${definition.name} • MAESTRIA ${rankUps.map(up => up.label).join(' + ')}`
    : definition.name;
  if (showMessage) showMessage(mensagem);
  else {
    player.ability ??= {};
    player.ability.lastMessage = mensagem;
    player.ability.messageTimer = 3;
  }

  return { definition, healed, damage, buff: runtime.buff };
}

// Recarga, bônus e efeito visual avançam com o tempo de jogo.
export function updateUltimate(player, progress, dt) {
  const runtime = ensureUltimate(player);
  const elapsed = Math.max(0, Number.isFinite(dt) ? dt : 0);
  runtime.cooldown = Math.max(0, runtime.cooldown - elapsed);
  if (runtime.effect) {
    runtime.effect.timeLeft = Math.max(0, runtime.effect.timeLeft - elapsed);
    if (runtime.effect.timeLeft === 0) runtime.effect = null;
  }
  if (!runtime.buff) return runtime;
  runtime.buff.timeLeft = Math.max(0, runtime.buff.timeLeft - elapsed);
  if (runtime.buff.timeLeft === 0) {
    runtime.buff = null;
  } else {
    if (runtime.buff.healPerSecond) healPlayer(player, progress, runtime.buff.healPerSecond * elapsed);
    if (runtime.buff.energyRegen) {
      player.energy = Math.min(player.maxEnergy ?? 100, (player.energy ?? 0) + runtime.buff.energyRegen * elapsed);
    }
    if (runtime.buff.moveSpeedPct && player.abilityLocksMovement) {
      // Sem penalidade: o bônus só perde efeito quando o jogador não pode andar.
    }
  }
  return runtime;
}

export function isUltimateId(id) {
  return ULTIMATE_IDS.includes(id);
}
