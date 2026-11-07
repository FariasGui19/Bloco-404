// Protótipos iniciais de Q/R para os três módulos sem sprites animados finais.
// Efeitos visuais são temporários; o progresso de gates continua no save.
import { state } from './state.js';
import { checkGate, isGateOpen, openGate } from './gates.js';
import { saveGame } from './save.js';
import { ARCHETYPE_KITS } from '../data/archetype-kits.js';

export const POWER_PROFILES = {
  golpe_ruptura: { cost: 24, cooldown: 1.4, color: '#ffd264', duration: 0.55 },
  postura_dominio: { cost: 8, cooldown: 2, color: '#ffd264', duration: 0.8 },
  passo_corrente: { cost: 24, cooldown: 1.3, color: '#53d9f4', duration: 0.22, distance: 2.3 },
  senso_corrente: { cost: 8, cooldown: 2, color: '#53d9f4', duration: 0.8 },
  forma_veloz: { cost: 26, cooldown: 1.4, color: '#6bff92', duration: 0.2, distance: 2.7 },
  eco_scan: { cost: 8, cooldown: 2, color: '#6bff92', duration: 0.8 },
};

const SCAN_LABELS = {
  postura_dominio: 'FREQUÊNCIA', senso_corrente: 'CORRENTE', eco_scan: 'ECO',
};

function facingDirection(facing) {
  const vectors = { down: [1, 1], up: [-1, -1], right: [1, -1], left: [-1, 1] };
  const [x, y] = vectors[facing] ?? vectors.down;
  return { x: x / Math.SQRT2, y: y / Math.SQRT2 };
}

function nearestGate(radius, predicate = () => true) {
  const p = state.player;
  return (state.objects ?? [])
    .filter(o => o.gate && !isGateOpen(o) && predicate(o))
    .map(o => ({ object: o, distance: Math.hypot(o.x - p.x, o.y - p.y) }))
    .filter(o => o.distance <= radius)
    .sort((a, b) => a.distance - b.distance)[0]?.object ?? null;
}

function canStart(id, showMessage) {
  const player = state.player;
  const profile = POWER_PROFILES[id];
  const kit = ARCHETYPE_KITS[state.progress.archetype];
  if (!profile || !kit || (id !== kit.q && id !== kit.r) || !state.progress.abilities?.includes(id)) return false;
  if ((player.ability.cooldowns[id] ?? 0) > 0) {
    showMessage('HABILIDADE RECARREGANDO');
    return false;
  }
  if (player.energy < profile.cost) {
    showMessage('ENERGIA INSUFICIENTE');
    return false;
  }
  player.energy -= profile.cost;
  player.ability.cooldowns[id] = profile.cooldown;
  // Apenas a duração visual aumenta com o traje; deslocamento, custo e recarga não mudam.
  const visualDuration = player.equippedSuit === 'dominio' && id === 'golpe_ruptura' ? 0.8
    : player.equippedSuit === 'mare' && id === 'passo_corrente' ? 0.55
    : id === 'forma_veloz' ? 0.45 : profile.duration;
  player.ability.effect = { id, color: profile.color, timeLeft: visualDuration, duration: visualDuration };
  return true;
}

export function tryArchetypePower(id, showMessage) {
  if (!canStart(id, showMessage)) return false;
  const player = state.player;
  const profile = POWER_PROFILES[id];
  if (SCAN_LABELS[id]) {
    const target = nearestGate(5);
    if (target?.gate?.scanFlag && target.gate.diagnosisArchetype === state.progress.archetype) {
      state.progress.flags ??= {};
      state.progress.flags[target.gate.scanFlag] = true;
      saveGame();
    }
    player.ability.reveal = target ? { targetId: target.id, timeLeft: 4, color: profile.color } : null;
    showMessage(target?.gate?.scanMessage ?? (target ? `${SCAN_LABELS[id]}: ${target.nome}` : `${SCAN_LABELS[id]}: NENHUM RASTRO PRÓXIMO`));
    return false;
  }

  if (id === 'golpe_ruptura') {
    const direction = facingDirection(player.facing);
    const target = nearestGate(2.6, o => {
      const dx = o.x - player.x, dy = o.y - player.y;
      return (o.id === 'rocha_rachada' || o.gate.requiredAction === id) && dx * direction.x + dy * direction.y > 0 && checkGate(o.gate);
    });
    if (target) {
      openGate(target);
      saveGame();
      showMessage('RUPTURA: ROCHA DESTRUÍDA');
    } else showMessage('GOLPE DE RUPTURA');
    return false;
  }

  const direction = facingDirection(player.facing);
  // Na câmara, alinhar a travessia com o corredor de um tile; não apagar o
  // obstáculo nem conceder o fragmento até que o jogador saia do outro lado.
  const phaseGate = (state.objects ?? []).find(o => {
    const allowed = o.phaseActions ?? (o.phaseAction ? [o.phaseAction] : []);
    if (!allowed.includes(id) || !checkGate(o.gate)) return false;
    const axis = o.phaseAxis ?? 'x', cross = axis === 'x' ? 'y' : 'x';
    const delta = o[axis] - player[axis];
    return Math.abs(player[cross] - o[cross]) < (o.phaseLane ?? 0.38) &&
      Math.abs(delta) < 2.05 && Math.abs(delta) >= 0.65 && delta * direction[axis] > 0;
  });
  if (id === 'passo_corrente' || id === 'forma_veloz') {
    const target = nearestGate(2.6, o => {
      const dx = o.x - player.x, dy = o.y - player.y;
      return (o.id === 'caverna_alagada' && id === 'passo_corrente' || (!o.phaseAction && !o.phaseActions && o.gate.requiredAction === id)) && dx * direction.x + dy * direction.y > 0 && checkGate(o.gate);
    });
    if (target) {
      openGate(target);
      saveGame();
    }
  }
  const phaseAxis = phaseGate?.phaseAxis ?? 'x';
  const phaseDirection = phaseGate ? Math.sign(phaseGate[phaseAxis] - player[phaseAxis]) : 0;
  const phaseDistance = phaseGate ? Math.abs(phaseGate[phaseAxis] - player[phaseAxis]) + 1 : profile.distance;
  player.ability.active = id;
  player.ability.dash = {
    directionX: phaseGate ? (phaseAxis === 'x' ? phaseDirection : 0) : direction.x, directionY: phaseGate ? (phaseAxis === 'y' ? phaseDirection : 0) : direction.y,
    timeLeft: profile.duration, speed: phaseDistance / profile.duration,
    phaseGateId: phaseGate?.id ?? null, phaseDirection, phaseAxis,
    mode: 'quick',
  };
  showMessage(id === 'forma_veloz' ? 'PULSO VELOZ' : 'PASSO DE CORRENTE');
  return true;
}
