// Apenas arte de locomoção/autoataque da forma sustentada. O Q, o R e a
// transformação conservam suas próprias prioridades e não sofrem mudanças.
export function getVelozAnimation(progress, player, now) {
  if (progress?.archetype !== 'nucleo_dez_forma' || player?.nucleoForm !== 'forma_veloz' ||
      player.ability?.dash || player.ability?.scanning > 0 || player.ability?.effect?.timeLeft > 0) return null;
  const attack = player.combat;
  if (attack?.style === 'nucleo_dez_forma' && attack.timeLeft > 0 && attack.duration > 0) {
    const phase = Math.max(0, Math.min(.999, 1 - attack.timeLeft / attack.duration));
    const col = Math.floor(phase * 6);
    // A folha lateral de corrida também tem um golpe completo, sem a mão
    // cortada que aparece em um dos quadros laterais da folha direcional.
    if (player.facing === 'left' || player.facing === 'right')
      return { sprite: 'veloz_corrida_lateral', row: 2, col, flip: player.facing === 'left', footY: 215 };
    return { sprite: 'veloz_ataque_direcional', row: player.facing === 'up' ? 2 : 0, col, flip: false, footY: 230 };
  }
  if (player.moving && (player.facing === 'left' || player.facing === 'right'))
    return { sprite: 'veloz_corrida_lateral', row: 0, col: Math.floor(now / 95) % 6, flip: player.facing === 'left', footY: 210 };
  return null;
}
