// =====================================================================
// ANIMAÇÃO DA QUEBRA SISTEMAS (segunda forma do Núcleo 10X)
//
// Só arte de locomoção e de ataque básico da forma sustentada. Q, R e a
// transformação continuam com as próprias prioridades.
//
// Folhas (todas em assets/sprites/player/, geradas por
// tools/preparar-quebra-sistemas.py, 256 px por célula):
//   player_10x_bruta_parado        → 4 células direcionais (frente/direita/costas/esquerda)
//   player_10x_bruta_andar_frente  → 4 passos de frente
//   player_10x_bruta_andar_costas  → 4 passos de costas (2 fases alternadas)
//   player_10x_bruta_andar_lateral → 4 passos de perfil, olhando à direita
//   player_10x_bruta_ataque_lateral→ 4 fases de marreta (preparo → impacto)
//   player_10x_bruta_ataque_frente → 4 fases de marreta com as duas mãos
//
// Passo pesado anda devagar: 150 ms por quadro, contra 95 ms da Forma Veloz.
// =====================================================================
import { NUCLEO_BRUTA } from './nucleo-forms.js';

export const BRUTA_SPRITES = Object.freeze({
  parado: 'player_10x_bruta_parado',
  andarFrente: 'player_10x_bruta_andar_frente',
  andarCostas: 'player_10x_bruta_andar_costas',
  andarLateral: 'player_10x_bruta_andar_lateral',
  ataqueLateral: 'player_10x_bruta_ataque_lateral',
  ataqueFrente: 'player_10x_bruta_ataque_frente',
});

const FRAME_MS = 150;
const ATTACK_FRAMES = 4;
// Apoio dos pés dentro da célula de 256 px (ver BASELINE no script de arte).
const FOOT_Y = 220;
const SCALE = .55;

// Célula da pose parada por direção. A folha é um turnaround, não um ciclo.
const IDLE_COL = Object.freeze({ down: 0, right: 1, up: 2, left: 3 });

function pose(sprite, col, flip = false, extra = {}) {
  return {
    sprite,
    col,
    row: 0,
    cols: 4,
    rows: 1,
    flip,
    footY: FOOT_Y,
    scale: SCALE,
    ...extra,
  };
}

// A forma está ativa e livre de outras ações?
function brutaLivre(progress, player) {
  return progress?.archetype === 'nucleo_dez_forma' &&
    player?.nucleoForm === NUCLEO_BRUTA &&
    !player.ability?.dash &&
    !(player.ability?.scanning > 0) &&
    !(player.ability?.effect?.timeLeft > 0);
}

// Ataque básico: marreta desce. Lateral usa a folha de perfil; frente usa a
// de duas mãos. Costas ainda não têm folha própria — o corpo permanece na
// pose traseira e quem conta o golpe é a onda de choque procedural, sem
// fingir uma animação que não existe.
export function getBrutaAttack(progress, player) {
  if (!brutaLivre(progress, player)) return null;
  const attack = player.combat;
  if (!attack || attack.style !== 'nucleo_dez_forma' || !(attack.timeLeft > 0) || !(attack.duration > 0)) return null;
  const phase = Math.max(0, Math.min(.999, 1 - attack.timeLeft / attack.duration));
  const col = Math.floor(phase * ATTACK_FRAMES);
  if (player.facing === 'left' || player.facing === 'right')
    return pose(BRUTA_SPRITES.ataqueLateral, col, player.facing === 'left', { attack: true });
  if (player.facing === 'down')
    return pose(BRUTA_SPRITES.ataqueFrente, col, false, { attack: true });
  return pose(BRUTA_SPRITES.parado, IDLE_COL.up, false, { attack: true, backAttack: true });
}

// Locomoção e espera.
export function getBrutaAnimation(progress, player, now = 0) {
  if (!brutaLivre(progress, player)) return null;
  const attack = getBrutaAttack(progress, player);
  if (attack) return attack;
  if (!player.moving) return pose(BRUTA_SPRITES.parado, IDLE_COL[player.facing] ?? IDLE_COL.down);
  const col = Math.floor(now / FRAME_MS) % 4;
  if (player.facing === 'left' || player.facing === 'right')
    return pose(BRUTA_SPRITES.andarLateral, col, player.facing === 'left');
  if (player.facing === 'up') return pose(BRUTA_SPRITES.andarCostas, col);
  return pose(BRUTA_SPRITES.andarFrente, col);
}

// Célula da pose parada direcional (usada na roda do Núcleo e no Códex).
export function getBrutaIdleCol(facing = 'down') {
  return IDLE_COL[facing] ?? IDLE_COL.down;
}

export { FOOT_Y as BRUTA_FOOT_Y, SCALE as BRUTA_SCALE };
