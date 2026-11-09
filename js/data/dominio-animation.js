// Apenas quadros efetivamente gerados por direção; as outras vistas mantêm
// as poses anteriores, sem inventar uma folha direcional inexistente.
const canUse = (progress, player) => progress?.archetype === 'lamina_dominio_anciao' &&
  player?.equippedSuit === 'dominio' && !player.ability?.dash &&
  !(player.ability?.scanning > 0) && !(player.ability?.effect?.timeLeft > 0);
export function getDominioWalk(progress, player, now) {
  if (!canUse(progress, player) || !player.moving || player.facing !== 'down' ||
      player.combat?.timeLeft > 0 || !Number.isFinite(now)) return null;
  return { col: [0, 1, 0, 1][Math.floor(Math.max(0, now) / 220) % 4] };
}
export function getDominioAttack(progress, player) {
  const a = player?.combat;
  if (!canUse(progress, player) || !a || a.style !== 'lamina_dominio_anciao' ||
      !(a.timeLeft > 0) || !(a.duration > 0) || !['right','left'].includes(player.facing)) return null;
  const phase = Math.max(0, Math.min(.9999, 1 - a.timeLeft / a.duration));
  return { col: Math.floor(phase * 4), flip: player.facing === 'left' };
}
