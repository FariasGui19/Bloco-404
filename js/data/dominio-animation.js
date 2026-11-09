// Folhas direcionais do Domínio. As vistas já aprovadas permanecem intactas.
const canUse = (progress, player) => progress?.archetype === 'lamina_dominio_anciao' &&
  player?.equippedSuit === 'dominio' && !player.ability?.dash &&
  !(player.ability?.scanning > 0) && !(player.ability?.effect?.timeLeft > 0);
export function getDominioWalk(progress, player, now) {
  if (!canUse(progress, player) || !player.moving || !['down','up','left','right'].includes(player.facing) ||
      player.combat?.timeLeft > 0 || !Number.isFinite(now)) return null;
  const phase = Math.floor(Math.max(0, now) / 220) % 4;
  return { col: player.facing === 'down' ? [0, 1, 0, 1][phase] : phase };
}
export function getDominioAttack(progress, player) {
  const a = player?.combat;
  if (!canUse(progress, player) || !a || a.style !== 'lamina_dominio_anciao' ||
      !(a.timeLeft > 0) || !(a.duration > 0) || !['right','left','up','down'].includes(player.facing)) return null;
  const phase = Math.max(0, Math.min(.9999, 1 - a.timeLeft / a.duration));
  return { col: Math.floor(phase * 4), flip: player.facing === 'left' };
}
