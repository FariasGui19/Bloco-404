// =====================================================================
// ZONAS DE ECO INSTÁVEL
//
// Fonte de dano ambiental enquanto inimigos não existem. São declaradas no
// mapa (`hazards`), desenhadas como anéis pulsantes e nunca ocupam spawn ou
// caminho obrigatório — o teste de mapas confere isso.
// =====================================================================
import { damagePlayer } from './health.js';

export function createHazards(map) {
  return (map?.hazards ?? []).map(hazard => ({
    ...hazard,
    x: hazard.x + .5,
    y: hazard.y + .5,
    radius: hazard.radius ?? .9,
    damage: hazard.damage ?? 9,
    interval: hazard.interval ?? 1.2,
    cooldown: 0,
    clock: Math.random() * Math.PI * 2,
    renderType: 'hazard',
  }));
}

export function isInsideHazard(player, hazard) {
  return Math.hypot(player.x - hazard.x, player.y - hazard.y) <= hazard.radius;
}

export function updateHazards(hazards, player, progress, dt) {
  let hit = null;
  for (const hazard of hazards ?? []) {
    hazard.clock += dt;
    hazard.cooldown = Math.max(0, hazard.cooldown - dt);
    if (hazard.cooldown > 0 || !isInsideHazard(player, hazard)) continue;
    if (player.ability?.dash && hazard.ignoredDuringDash !== false) continue;
    const result = damagePlayer(player, progress, hazard.damage, hazard.id ?? 'eco_instavel');
    if (result.dealt > 0) {
      hazard.cooldown = hazard.interval;
      hit = { hazard, ...result };
    }
  }
  return hit;
}
