// Pequena rotina ambiental, sem missão, persistência ou colisão com o jogador.
// A viajante espera em vez de atravessar player, paredes, móveis ou NPCs.
import { canStandAt } from './collision.js';
const ROUTE = [{ x: 6.8, y: 11.8 }, { x: 10.3, y: 11.8 }];
export function updateLobbyVisitor(actor, player, map, dt) {
  if (!actor || !map || !Number.isFinite(dt) || dt <= 0) return;
  const r = actor.visitorRuntime ??= { index: 1, wait: 1, blocked: 0, clock: 0 };
  actor.moving = false;
  if (r.wait > 0) { r.wait = Math.max(0, r.wait - dt); return; }
  const goal = ROUTE[r.index];
  const dx = goal.x - actor.x, dy = goal.y - actor.y, dist = Math.hypot(dx, dy);
  if (dist < .04) { r.index = (r.index + 1) % ROUTE.length; r.wait = 2; r.blocked = 0; return; }
  const step = Math.min(dist, .55 * dt, .06);
  const x = actor.x + dx / dist * step, y = actor.y + dy / dist * step;
  const playerClear = Math.hypot(x - player.x, y - player.y) > .75;
  if (!playerClear || !canStandAt(map, x, y, .2, actor)) {
    // Se um objeto móvel impedir a rota por muito tempo, volte pelo caminho.
    r.blocked += dt;
    if (r.blocked > 4) { r.index = (r.index + 1) % ROUTE.length; r.wait = 1; r.blocked = 0; }
    return;
  }
  r.blocked = 0; r.clock += dt; actor.x = x; actor.y = y; actor.moving = true;
  const sx = dx - dy, sy = dx + dy;
  actor.facing = Math.abs(sx) > Math.abs(sy) ? (sx > 0 ? 'right' : 'left') : (sy > 0 ? 'down' : 'up');
}
