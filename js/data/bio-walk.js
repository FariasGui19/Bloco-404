// A folha atual tem dois passos em cada lateral; frente e costas são poses
// isoladas e não devem ser apresentadas como ciclos completos.
export function getBioWalkFrame(progress, player, now) {
  if (progress?.archetype !== 'motor_bio_forja' || player?.equippedSuit !== 'bio_forja' || !player.moving ||
      player.ability?.dash || player.ability?.scanning > 0 || player.ability?.effect?.timeLeft > 0 ||
      player.combat?.timeLeft > 0 || !Number.isFinite(now)) return null;
  if (player.facing !== 'left' && player.facing !== 'right') return null;
  const phase = Math.floor(Math.max(0, now) / 180) % 2;
  return { row: 0, col: (player.facing === 'right' ? 0 : 2) + phase };
}
