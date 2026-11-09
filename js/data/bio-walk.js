// Folha 6×4: frente, direita, costas e esquerda, nessa ordem.
const ROWS = { down: 0, right: 1, up: 2, left: 3 };
export function getBioWalkFrame(progress, player, now) {
  if (progress?.archetype !== 'motor_bio_forja' || player?.equippedSuit !== 'bio_forja' || !player.moving ||
      player.ability?.dash || player.ability?.scanning > 0 || player.ability?.effect?.timeLeft > 0 ||
      player.combat?.timeLeft > 0 || !Number.isFinite(now)) return null;
  const row = ROWS[player.facing];
  if (row === undefined) return null;
  return { row, col: Math.floor(Math.max(0, now) / 150) % 6 };
}

// Alturas e pontos de apoio medidos nos quatro quadros da folha parada.
const IDLE_HEIGHT = { down: 128.65, right: 132.68, up: 126.79, left: 132.68 };
const IDLE_FOOT_OFFSET = { down: 5, right: 8, up: 2, left: 8 };
export function bioWalkMetrics(facing, frameHeight) {
  if (!IDLE_HEIGHT[facing] || !Number.isFinite(frameHeight) || frameHeight <= 0) return null;
  return { scale: IDLE_HEIGHT[facing] / frameHeight, footOffset: IDLE_FOOT_OFFSET[facing] };
}

// Deformação de caminhada provisória da própria arte parada. Não é uma
// folha de passos: a silhueta e a roupa são as mesmas do idle.
export function bioWalkRig(progress, player, now) {
  if (!getBioWalkFrame(progress, player, now)) return null;
  const phase = Math.sin(now * Math.PI * 2 / 720);
  return { leftShear: phase * .065, rightShear: -phase * .065,
    bob: Math.abs(phase) * .7 };
}
