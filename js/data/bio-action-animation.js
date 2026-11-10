// =====================================================================
// AÇÕES DO MOTOR BIO-FORJA — ataque e propulsor
//
// O exo tinha ataque desenhado SÓ de frente: de costas e de lado o golpe
// acontecia (dano, sombra, alcance) mas o corpo seguia na pose de caminhada.
// O Q (PROPULSOR DE IMPULSO) tinha o mesmo buraco: reaproveitava a célula de
// andar porque não havia folha de avanço.
//
// Folhas (tools/preparar-bio-acoes.py), 4 quadros de 320 px cada:
//
//   player-bio-ataque-frontal  9 quadros de 355 px (arte já aprovada)
//   player-bio-ataque-costas   4 quadros  · vista por trás
//   player-bio-ataque-lateral  4 quadros  · perfil para a direita
//   player-bio-propulsor       4 quadros  · agachar → acender → avanço → pouso
//
// A lateral é espelhada para a esquerda; a de costas nunca é espelhada (é
// vista de trás, não um perfil). Apoio dos pés e escala saem do preparador:
// BASELINE 276 de 320 e corpo de ~130 px em jogo, como no resto do exo.
// =====================================================================
const BIO = 'motor_bio_forja';

const FOOT_Y = 276;
// A arte útil das células de 320 tem ~230 px: .57 devolve os ~130 px do corpo
// equipado. O ataque frontal usa célula própria de 355×800, escala .19 e
// apoio em 759 de 800 (base real dos nove quadros, medido no preparador).
const SCALE = .57;

export const BIO_ATTACK_SHEETS = Object.freeze({
  down: Object.freeze({ sprite: 'player_bio_ataque_frontal', frames: 9, cell: 355, height: 800, footY: 759, scale: .19, flip: false }),
  up: Object.freeze({ sprite: 'player_bio_ataque_costas', frames: 4, cell: 320, height: 320, footY: FOOT_Y, scale: SCALE, flip: false }),
  right: Object.freeze({ sprite: 'player_bio_ataque_lateral', frames: 4, cell: 320, height: 320, footY: FOOT_Y, scale: SCALE, flip: false }),
  left: Object.freeze({ sprite: 'player_bio_ataque_lateral', frames: 4, cell: 320, height: 320, footY: FOOT_Y, scale: SCALE, flip: true }),
});

export const BIO_PROPULSOR_SHEET = Object.freeze({
  sprite: 'player_bio_propulsor', frames: 4, cell: 320, height: 320, footY: FOOT_Y, scale: SCALE,
});

// Em que quadro o soco está. `null` quando não é um ataque do Bio.
// O relógio é o do combate (player.combat), que já governa dano e alcance.
export function getBioAttackFrame(progress, player) {
  if (progress?.archetype !== BIO) return null;
  if (player?.equippedSuit !== 'bio_forja') return null;
  if (player?.ability?.scanning > 0) return null;
  const attack = player?.combat;
  if (!attack || attack.style !== 'motor_bio_forja' || !(attack.timeLeft > 0) || !(attack.duration > 0)) return null;
  const sheet = BIO_ATTACK_SHEETS[player.facing] ?? BIO_ATTACK_SHEETS.down;
  const t = Math.max(0, Math.min(.9999, 1 - attack.timeLeft / attack.duration));
  const col = Math.min(sheet.frames - 1, Math.floor(t * sheet.frames));
  return { ...sheet, col, phase: t < .5 ? 'windup' : 'hit' };
}

// Em que quadro o propulsor (Q) está: o avanço inteiro em quatro fases, para
// o corpo acompanhar o deslocamento em vez de deslizar andando.
export function getBioPropulsorFrame(progress, player) {
  if (progress?.archetype !== BIO) return null;
  if (player?.equippedSuit !== 'bio_forja') return null;
  const ability = player?.ability;
  if (ability?.active !== 'bio_dash' || !ability.dash) return null;
  if (ability?.scanning > 0) return null;
  // `speed`/`distance` não dizem quanto já andou; o perfil fixa a duração,
  // então a fração sai do tempo restante sobre o tempo total do perfil.
  const total = ability.dash.duration ?? .18;
  const t = Math.max(0, Math.min(.9999, 1 - (ability.dash.timeLeft ?? total) / total));
  const col = t < .2 ? 0 : t < .45 ? 1 : t < .8 ? 2 : 3;
  return { ...BIO_PROPULSOR_SHEET, col, phase: t < .45 ? 'launch' : 'dash' };
}
