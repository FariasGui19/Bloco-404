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
  player.ability.effect = { id, color: profile.color, timeLeft: profile.duration, duration: profile.duration };
  return true;
}

export function tryArchetypePower(id, showMessage) {
  if (!canStart(id, showMessage)) return false;
  const player = state.player;
  const profile = POWER_PROFILES[id];
  if (SCAN_LABELS[id]) {
    const target = nearestGate(5);
    player.ability.reveal = target ? { targetId: target.id, timeLeft: 4, color: profile.color } : null;
    showMessage(target ? `${SCAN_LABELS[id]}: ${target.nome}` : `${SCAN_LABELS[id]}: NENHUM RASTRO PRÓXIMO`);
    return false;
  }

  if (id === 'golpe_ruptura') {
    const direction = facingDirection(player.facing);
    const target = nearestGate(2.6, o => {
      const dx = o.x - player.x, dy = o.y - player.y;
      return o.id === 'rocha_rachada' && dx * direction.x + dy * direction.y > 0 && checkGate(o.gate);
    });
    if (target) {
      openGate(target);
      saveGame();
      showMessage('RUPTURA: ROCHA DESTRUÍDA');
    } else showMessage('GOLPE DE RUPTURA');
    return false;
  }

  const direction = facingDirection(player.facing);
  if (id === 'passo_corrente') {
    const target = nearestGate(2.6, o => {
      const dx = o.x - player.x, dy = o.y - player.y;
      return o.id === 'caverna_alagada' && dx * direction.x + dy * direction.y > 0 && checkGate(o.gate);
    });
    if (target) {
      openGate(target);
      saveGame();
    }
  }
  player.ability.active = id;
  player.ability.dash = {
    directionX: direction.x, directionY: direction.y,
    timeLeft: profile.duration, speed: profile.distance / profile.duration,
    mode: 'quick',
  };
  showMessage(id === 'forma_veloz' ? 'PULSO VELOZ' : 'PASSO DE CORRENTE');
  return true;
}
