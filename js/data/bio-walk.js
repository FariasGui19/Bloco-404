// A folha aceita fornece apenas dois passos frontais distintos. As demais
// direções usam o idle íntegro até haver ciclos direcionais reais.
export function getBioWalkFrame(progress, player, now) {
  if (progress?.archetype !== 'motor_bio_forja' || player?.equippedSuit !== 'bio_forja' || !player.moving ||
      player.ability?.dash || player.ability?.active === 'bio_dash' || player.ability?.scanning > 0 ||
      player.ability?.effect?.timeLeft > 0 || player.combat?.timeLeft > 0 || !Number.isFinite(now) ||
      player.facing !== 'down') return null;
  // Quadros da geração: 0 e 1 são os passos opostos, 2 e 3 são
  // alternativas semelhantes ao segundo passo, não quatro fases distintas.
  return { row: 0, col: [0, 1, 0, 1][Math.floor(Math.max(0, now) / 220) % 4] };
}
