// Combate básico provisório: apenas alvos explícitos de treino recebem dano.
// Estado temporal não entra no save; inimigos e dano ao jogador ainda não existem.
import { canStandAt } from './collision.js';
import { CONFIG } from '../config.js';

export const BASIC_ATTACKS = Object.freeze({
  motor_bio_forja: { color: '#ffb45c', label: 'IMPULSO', range: 1.8, cooldown: .48 },
  lamina_dominio_anciao: { color: '#ffd465', label: 'LÂMINA', range: 1.8, cooldown: .48 },
  mare_astral: { color: '#73e9fa', label: 'MARÉ', range: 1.8, cooldown: .48 },
  nucleo_dez_forma: { color: '#8cff9e', label: 'PULSO', range: 1.8, cooldown: .48 },
});
export function createTrainingTargets(map) {
  return (map.trainingTargets ?? []).map(item => ({ ...item, x: item.x + .5, y: item.y + .5,
    health: item.maxHealth, downTimer: 0, hitTimer: 0, renderType: 'trainingTarget' }));
}
export function updateBasicCombat(player, targets, dt) {
  if (player.combat) {
    player.combat.cooldown = Math.max(0, player.combat.cooldown - dt);
    player.combat.timeLeft = Math.max(0, player.combat.timeLeft - dt);
  }
  for (const target of targets) {
    target.hitTimer = Math.max(0, target.hitTimer - dt);
    if (target.downTimer > 0) {
      target.downTimer = Math.max(0, target.downTimer - dt);
      if (target.downTimer === 0) target.health = target.maxHealth;
    }
  }
}
function clearLine(map, player, target) {
  const dx = target.x - player.x, dy = target.y - player.y;
  const steps = Math.ceil(Math.hypot(dx, dy) / .12);
  for (let i = 1; i < steps; i++) {
    if (!canStandAt(map, player.x + dx * i / steps, player.y + dy * i / steps, .06, player)) return false;
  }
  return true;
}
export function tryBasicAttack({ player, progress, map, targets, point }) {
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
    const vectors = { down: [1,1], up: [-1,-1], left: [-1,1], right: [1,-1] };
    [dx, dy] = vectors[player.facing] ?? vectors.down; length = Math.SQRT2;
  }
  dx /= length; dy /= length;
  const sx = dx - dy, sy = dx + dy;
  player.facing = Math.abs(sx) > Math.abs(sy) ? (sx > 0 ? 'right' : 'left') : (sy > 0 ? 'down' : 'up');
  player.target = null;
  player.combat = { cooldown: profile.cooldown, duration: .24, timeLeft: .24, dx, dy, color: profile.color,
    style: progress.archetype, transformed: player.nucleoForm === 'forma_veloz', equipped: !!player.equippedSuit };
  let best = null, nearest = Infinity;
  for (const target of targets ?? []) {
    if (target.health <= 0) continue;
    const tx = target.x - player.x, ty = target.y - player.y, distance = Math.hypot(tx, ty);
    if (distance > profile.range || distance < .001 || (tx * dx + ty * dy) / distance < .55) continue;
    if (distance >= nearest || !clearLine(map, player, target)) continue;
    best = target; nearest = distance;
  }
  if (best) {
    best.health = Math.max(0, best.health - 1); best.hitTimer = .2;
    if (!best.health) best.downTimer = 4;
  }
  return true;
}
