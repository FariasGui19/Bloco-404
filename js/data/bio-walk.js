// A frente aprovada mantém os dois passos; costas e lateral usam folhas próprias.
export function getBioWalkFrame(progress, player, now) {
  if (progress?.archetype !== 'motor_bio_forja' || player?.equippedSuit !== 'bio_forja' || !player.moving ||
      player.ability?.dash || player.ability?.active === 'bio_dash' || player.ability?.scanning > 0 ||
      player.ability?.effect?.timeLeft > 0 || player.combat?.timeLeft > 0 || !Number.isFinite(now) ||
      !['down', 'up', 'left', 'right'].includes(player.facing)) return null;
  // Quadros da geração: 0 e 1 são os passos opostos, 2 e 3 são
  // alternativas semelhantes ao segundo passo, não quatro fases distintas.
  const phase = Math.floor(Math.max(0, now) / 220) % 4;
  return { row: 0, col: player.facing === 'down' ? [0, 1, 0, 1][phase] : phase };
}

export function bioWalkSheet(facing) {
  return {
    down: { id: 'bio_frente_andar_0314', height: 128.65, footOffset: 5, flip: false },
    up: { id: 'bio_costas_andar_0315', height: 126.79, footOffset: 2, flip: false },
    right: { id: 'bio_lateral_andar_0315', height: 132.68, footOffset: 8, flip: false },
    left: { id: 'bio_lateral_andar_0315', height: 132.68, footOffset: 8, flip: true },
  }[facing] ?? null;
}
