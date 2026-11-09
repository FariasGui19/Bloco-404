// Seleção puramente visual. O estado de combate e as habilidades não mudam.
const directions = ['down', 'up', 'left', 'right'];
const canUse = (progress, player) => progress?.archetype === 'mare_astral' &&
  player?.equippedSuit === 'mare' && !player.ability?.dash &&
  !(player.ability?.scanning > 0) && !(player.ability?.effect?.timeLeft > 0) &&
  directions.includes(player.facing);
export function getMareWalk(progress, player, now) {
  if (!canUse(progress, player) || !player.moving || player.combat?.timeLeft > 0 || !Number.isFinite(now)) return null;
  const phase = Math.floor(Math.max(0, now) / 220) % 4;
  return { col: player.facing === 'down' ? [0, 2, 0, 2][phase] : phase };
}
export function getMareAttack(progress, player) {
  const a = player?.combat;
  if (!canUse(progress, player) || !a || a.style !== 'mare_astral' || !(a.timeLeft > 0) || !(a.duration > 0)) return null;
  return { col: Math.floor(Math.max(0, Math.min(.9999, 1 - a.timeLeft / a.duration)) * 4) };
}
export function mareSheet(facing, kind) {
  if (!directions.includes(facing) || !['andar', 'ataque'].includes(kind)) return null;
  const direction = facing === 'down' ? 'frente' : facing === 'up' ? 'costas' : 'lateral';
  return { id: `mare_${kind}_${direction}_0318`, flip: facing === 'left' };
}
