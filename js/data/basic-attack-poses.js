// Seleção de poses existentes, não folhas sequenciais de ataque.
// Jamais troca o traje por outro nível nem transforma o operador ao atacar.
export function getBasicAttackPose(progress, player) {
  const a = player?.combat;
  if (!a || a.timeLeft <= 0 || !a.duration || a.style !== progress?.archetype || player.ability?.effect?.timeLeft > 0 || player.ability?.scanning > 0 || player.ability?.dash) return null;
  if (!['left', 'right'].includes(player.facing)) return null;
  const t = Math.max(0, Math.min(.999, 1 - a.timeLeft / a.duration));
  if (a.style === 'motor_bio_forja' && player.equippedSuit === 'bio_forja') {
    // Pose lateral da Bio de nível 1 olha para a esquerda.
    return { sprite: 'player_bio_forja', col: 3, row: 1, flip: player.facing === 'right', scale: .31, anchor: .88 };
  }
  if (a.style === 'lamina_dominio_anciao' && player.equippedSuit === 'dominio') {
    // Duas poses laterais com espada do traje nível 1; orientação original é direita.
    const col = t < .32 || t >= .8 ? 1 : 3;
    return { sprite: 'player_dominio_lvl1', col, row: 1, flip: player.facing === 'left', scale: .37, anchor: col === 1 ? .84 : .89 };
  }
  return null;
}
